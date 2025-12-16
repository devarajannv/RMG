#!/bin/bash
# =============================================================================
# RMGaaS Production Deployment Script
# =============================================================================
# Usage: ./scripts/deploy.sh [command]
# Commands: setup, deploy, rollback, backup, restore, logs, status
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check env file
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found"
        log_info "Copy docker/env.production.example to $ENV_FILE and configure it"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# =============================================================================
# Commands
# =============================================================================

cmd_setup() {
    log_info "Setting up production environment..."
    
    # Create directories
    mkdir -p "$BACKUP_DIR" "$LOG_DIR" docker/ssl docker/nginx-logs
    
    # Check if SSL certificates exist
    if [ ! -f "docker/ssl/fullchain.pem" ] || [ ! -f "docker/ssl/privkey.pem" ]; then
        log_warn "SSL certificates not found in docker/ssl/"
        log_info "For development/testing, generating self-signed certificates..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout docker/ssl/privkey.pem \
            -out docker/ssl/fullchain.pem \
            -subj "/C=IN/ST=TN/L=Chennai/O=NewVision/CN=rmgaas.newvision.in"
        
        log_warn "Self-signed certificates created. For production, use Let's Encrypt."
    fi
    
    # Pull images
    log_info "Pulling Docker images..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull postgres redis
    
    log_info "Setup complete!"
}

cmd_deploy() {
    log_info "Deploying RMGaaS..."
    
    check_prerequisites
    
    # Build images
    log_info "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans
    
    # Start containers
    log_info "Starting containers..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    # Wait for services
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Run migrations
    log_info "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api \
        npx prisma migrate deploy --schema=./apps/api/prisma/schema.prisma || true
    
    # Health check
    cmd_health
    
    log_info "Deployment complete!"
}

cmd_rollback() {
    log_info "Rolling back to previous version..."
    
    # Get current version
    CURRENT_VERSION=$(docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format json | jq -r '.[0].Image' | cut -d':' -f2)
    log_info "Current version: $CURRENT_VERSION"
    
    # List available images
    log_info "Available versions:"
    docker images rmgaas/api --format "{{.Tag}}"
    
    log_warn "Please manually set VERSION in $ENV_FILE and run: ./scripts/deploy.sh deploy"
}

cmd_backup() {
    log_info "Creating database backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/rmgaas_backup_$TIMESTAMP.sql"
    
    # Create backup
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        pg_dump -U rmgaas rmgaas_prod > "$BACKUP_FILE"
    
    # Compress
    gzip "$BACKUP_FILE"
    
    log_info "Backup created: ${BACKUP_FILE}.gz"
    
    # Cleanup old backups (keep last 7)
    ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
    
    log_info "Backup complete!"
}

cmd_restore() {
    if [ -z "$1" ]; then
        log_error "Please specify backup file: ./scripts/deploy.sh restore <backup_file>"
        log_info "Available backups:"
        ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"
        exit 1
    fi
    
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    log_warn "This will overwrite the current database. Are you sure? (yes/no)"
    read -r CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    log_info "Restoring from $BACKUP_FILE..."
    
    # Decompress if needed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
            psql -U rmgaas rmgaas_prod
    else
        cat "$BACKUP_FILE" | docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
            psql -U rmgaas rmgaas_prod
    fi
    
    log_info "Restore complete!"
}

cmd_logs() {
    SERVICE="${1:-}"
    
    if [ -z "$SERVICE" ]; then
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f --tail=100
    else
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f --tail=100 "$SERVICE"
    fi
}

cmd_status() {
    log_info "Container Status:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo ""
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

cmd_health() {
    log_info "Checking service health..."
    
    # Check API
    if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
        log_info "API: ${GREEN}HEALTHY${NC}"
    else
        log_error "API: ${RED}UNHEALTHY${NC}"
    fi
    
    # Check Frontend
    if curl -sf http://localhost:80/ > /dev/null 2>&1; then
        log_info "Frontend: ${GREEN}HEALTHY${NC}"
    else
        log_error "Frontend: ${RED}UNHEALTHY${NC}"
    fi
    
    # Check Database
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_isready -U rmgaas > /dev/null 2>&1; then
        log_info "Database: ${GREEN}HEALTHY${NC}"
    else
        log_error "Database: ${RED}UNHEALTHY${NC}"
    fi
    
    # Check Redis
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_info "Redis: ${GREEN}HEALTHY${NC}"
    else
        log_error "Redis: ${RED}UNHEALTHY${NC}"
    fi
}

cmd_stop() {
    log_info "Stopping all services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    log_info "Services stopped"
}

cmd_restart() {
    log_info "Restarting services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
    log_info "Services restarted"
}

cmd_shell() {
    SERVICE="${1:-api}"
    log_info "Opening shell in $SERVICE..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec "$SERVICE" sh
}

cmd_help() {
    echo "RMGaaS Deployment Script"
    echo ""
    echo "Usage: ./scripts/deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup       - Initial setup (create directories, SSL certs)"
    echo "  deploy      - Build and deploy the application"
    echo "  rollback    - Rollback to previous version"
    echo "  backup      - Create database backup"
    echo "  restore     - Restore from backup"
    echo "  logs [svc]  - View logs (optionally for specific service)"
    echo "  status      - Show container status"
    echo "  health      - Check service health"
    echo "  stop        - Stop all services"
    echo "  restart     - Restart all services"
    echo "  shell [svc] - Open shell in container (default: api)"
    echo "  help        - Show this help message"
}

# =============================================================================
# Main
# =============================================================================

COMMAND="${1:-help}"

case "$COMMAND" in
    setup)
        cmd_setup
        ;;
    deploy)
        cmd_deploy
        ;;
    rollback)
        cmd_rollback
        ;;
    backup)
        cmd_backup
        ;;
    restore)
        cmd_restore "$2"
        ;;
    logs)
        cmd_logs "$2"
        ;;
    status)
        cmd_status
        ;;
    health)
        cmd_health
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    shell)
        cmd_shell "$2"
        ;;
    help|*)
        cmd_help
        ;;
esac

