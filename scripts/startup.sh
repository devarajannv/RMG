#!/bin/bash
# =============================================================================
# RMGaaS Startup Script
# =============================================================================
# This script checks for required services and starts them if needed
# Usage: ./scripts/startup.sh [dev|staging|prod]
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Service check timeouts
POSTGRES_TIMEOUT=30
REDIS_TIMEOUT=15
API_TIMEOUT=60
FRONTEND_TIMEOUT=30

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  RMGaaS - $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        return 1
    fi
    return 0
}

# =============================================================================
# Service Check Functions
# =============================================================================

check_docker() {
    log_info "Checking Docker..."
    if ! check_command docker; then
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        return 1
    fi
    
    log_success "Docker is running"
    return 0
}

check_docker_compose() {
    log_info "Checking Docker Compose..."
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
        log_success "Docker Compose (plugin) is available"
    elif check_command docker-compose; then
        DOCKER_COMPOSE="docker-compose"
        log_success "Docker Compose (standalone) is available"
    else
        log_error "Docker Compose is not installed"
        return 1
    fi
    return 0
}

is_container_running() {
    local container_name="$1"
    docker ps --filter "name=$container_name" --filter "status=running" --format "{{.Names}}" | grep -q "^${container_name}$"
}

is_container_healthy() {
    local container_name="$1"
    local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
    [[ "$health" == "healthy" ]]
}

wait_for_healthy() {
    local container_name="$1"
    local timeout="$2"
    local elapsed=0
    
    log_info "Waiting for $container_name to be healthy (timeout: ${timeout}s)..."
    
    while [ $elapsed -lt $timeout ]; do
        if is_container_healthy "$container_name"; then
            log_success "$container_name is healthy"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    
    echo ""
    log_warning "$container_name did not become healthy within ${timeout}s"
    return 1
}

wait_for_port() {
    local host="$1"
    local port="$2"
    local timeout="$3"
    local service_name="${4:-Service}"
    local elapsed=0
    
    log_info "Waiting for $service_name on $host:$port (timeout: ${timeout}s)..."
    
    while [ $elapsed -lt $timeout ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            log_success "$service_name is responding on port $port"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    
    echo ""
    log_warning "$service_name did not respond on port $port within ${timeout}s"
    return 1
}

# =============================================================================
# Service Start Functions
# =============================================================================

start_postgres() {
    local container="rmgaas-postgres"
    
    log_info "Checking PostgreSQL..."
    
    if is_container_running "$container"; then
        if is_container_healthy "$container"; then
            log_success "PostgreSQL is already running and healthy"
            return 0
        else
            log_warning "PostgreSQL container is running but not healthy, restarting..."
            docker restart "$container"
        fi
    else
        log_info "Starting PostgreSQL..."
        $DOCKER_COMPOSE up -d postgres
    fi
    
    wait_for_healthy "$container" "$POSTGRES_TIMEOUT"
}

start_redis() {
    local container="rmgaas-redis"
    
    log_info "Checking Redis..."
    
    if is_container_running "$container"; then
        if is_container_healthy "$container"; then
            log_success "Redis is already running and healthy"
            return 0
        else
            log_warning "Redis container is running but not healthy, restarting..."
            docker restart "$container"
        fi
    else
        log_info "Starting Redis..."
        $DOCKER_COMPOSE up -d redis
    fi
    
    wait_for_healthy "$container" "$REDIS_TIMEOUT"
}

start_api() {
    local container="rmgaas-api"
    
    log_info "Checking API server..."
    
    if is_container_running "$container"; then
        log_success "API server is already running"
    else
        log_info "Starting API server..."
        $DOCKER_COMPOSE up -d api
    fi
    
    wait_for_port "localhost" "4000" "$API_TIMEOUT" "API server"
}

start_frontend() {
    local container="rmgaas-frontend"
    
    log_info "Checking Frontend..."
    
    if is_container_running "$container"; then
        log_success "Frontend is already running"
    else
        log_info "Starting Frontend..."
        $DOCKER_COMPOSE up -d frontend
    fi
    
    wait_for_port "localhost" "3000" "$FRONTEND_TIMEOUT" "Frontend"
}

run_migrations() {
    log_info "Checking database migrations..."
    
    # Check if there are pending migrations
    if docker exec rmgaas-api npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
        log_success "Database schema is up to date"
    else
        log_info "Running database migrations..."
        docker exec rmgaas-api npx prisma migrate deploy
        log_success "Migrations completed"
    fi
}

# =============================================================================
# Main Startup Sequence
# =============================================================================

startup_dev() {
    print_header "Development Environment"
    
    cd "$PROJECT_ROOT"
    
    # Pre-flight checks
    check_docker || exit 1
    check_docker_compose || exit 1
    
    # Start services in order
    echo ""
    log_info "Starting services..."
    echo ""
    
    start_postgres || exit 1
    start_redis || exit 1
    start_api || exit 1
    start_frontend || exit 1
    
    # Run migrations if needed
    echo ""
    run_migrations
    
    # Print summary
    echo ""
    print_header "Startup Complete!"
    echo -e "  ${GREEN}Frontend:${NC}  http://localhost:3000"
    echo -e "  ${GREEN}API:${NC}       http://localhost:4000"
    echo -e "  ${GREEN}API Docs:${NC}  http://localhost:4000/api-docs"
    echo -e "  ${GREEN}Health:${NC}    http://localhost:4000/health"
    echo ""
    echo -e "  ${BLUE}Credentials:${NC}"
    echo -e "    Email:    admin@newvision.in"
    echo -e "    Password: Password123!@#"
    echo ""
    echo -e "  ${YELLOW}Commands:${NC}"
    echo -e "    View logs:     make dev-logs"
    echo -e "    Stop:          make dev-down"
    echo -e "    Restart:       make dev-rebuild"
    echo ""
}

startup_staging() {
    print_header "Staging Environment"
    
    cd "$PROJECT_ROOT"
    DOCKER_COMPOSE="docker-compose -f docker-compose.staging.yml"
    
    check_docker || exit 1
    check_docker_compose || exit 1
    
    log_info "Starting staging environment..."
    $DOCKER_COMPOSE up -d
    
    print_header "Staging Started!"
    echo -e "  ${GREEN}Frontend:${NC}  http://localhost:3001"
    echo -e "  ${GREEN}API:${NC}       http://localhost:4001"
    echo ""
}

startup_prod() {
    print_header "Production Environment"
    
    cd "$PROJECT_ROOT"
    DOCKER_COMPOSE="docker-compose -f docker-compose.prod.yml"
    
    check_docker || exit 1
    check_docker_compose || exit 1
    
    log_info "Starting production environment..."
    $DOCKER_COMPOSE up -d
    
    print_header "Production Started!"
}

# =============================================================================
# Status Command
# =============================================================================

show_status() {
    print_header "Service Status"
    
    echo "Container Status:"
    echo ""
    docker ps --filter "name=rmgaas" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    echo "Health Checks:"
    for container in rmgaas-postgres rmgaas-redis rmgaas-api rmgaas-frontend; do
        if is_container_running "$container"; then
            health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no healthcheck")
            if [[ "$health" == "healthy" ]]; then
                echo -e "  ${GREEN}✓${NC} $container: running (healthy)"
            elif [[ "$health" == "no healthcheck" ]]; then
                echo -e "  ${YELLOW}○${NC} $container: running"
            else
                echo -e "  ${YELLOW}!${NC} $container: running ($health)"
            fi
        else
            echo -e "  ${RED}✗${NC} $container: not running"
        fi
    done
    echo ""
}

# =============================================================================
# Entry Point
# =============================================================================

case "$ENVIRONMENT" in
    dev|development)
        startup_dev
        ;;
    staging)
        startup_staging
        ;;
    prod|production)
        startup_prod
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 [dev|staging|prod|status]"
        echo ""
        echo "  dev      Start development environment (default)"
        echo "  staging  Start staging environment"
        echo "  prod     Start production environment"
        echo "  status   Show current service status"
        exit 1
        ;;
esac
