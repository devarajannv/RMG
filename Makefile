# =============================================================================
# RMGaaS Makefile
# =============================================================================
# Common commands for development, testing, and deployment
# Usage: make <target>
# =============================================================================

.PHONY: help dev dev-up dev-down dev-logs dev-clean \
        staging staging-up staging-down staging-logs \
        prod prod-up prod-down prod-logs \
        build build-api build-frontend \
        test test-unit test-e2e test-perf \
        db-migrate db-seed db-reset db-studio \
        clean clean-all logs ps

# Default target
.DEFAULT_GOAL := help

# Variables
COMPOSE_DEV := docker-compose
COMPOSE_STAGING := docker-compose -f docker-compose.staging.yml
COMPOSE_PROD := docker-compose -f docker-compose.prod.yml

# =============================================================================
# Help
# =============================================================================
help: ## Show this help message
	@echo "RMGaaS - Resource Management as a Service"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# =============================================================================
# Quick Start
# =============================================================================
start: ## Start development with service checks (recommended)
	@./scripts/startup.sh dev

status: ## Show service status
	@./scripts/startup.sh status

# =============================================================================
# Development
# =============================================================================
dev: dev-up ## Start development environment

dev-up: ## Start development containers
	$(COMPOSE_DEV) up -d
	@echo "Development environment started!"
	@echo "  Frontend: http://localhost:3000"
	@echo "  API:      http://localhost:4000"
	@echo "  API Docs: http://localhost:4000/api-docs"

dev-down: ## Stop development containers
	$(COMPOSE_DEV) down

dev-logs: ## View development logs
	$(COMPOSE_DEV) logs -f

dev-clean: ## Clean development environment (removes volumes)
	$(COMPOSE_DEV) down -v --remove-orphans
	docker system prune -f

dev-rebuild: ## Rebuild and restart development containers
	$(COMPOSE_DEV) down
	$(COMPOSE_DEV) build --no-cache
	$(COMPOSE_DEV) up -d

# =============================================================================
# Staging
# =============================================================================
staging: staging-up ## Start staging environment

staging-up: ## Start staging containers
	$(COMPOSE_STAGING) up -d
	@echo "Staging environment started!"
	@echo "  Frontend:        http://localhost:3001"
	@echo "  API:             http://localhost:4001"
	@echo "  Mail Dev:        http://localhost:1080"
	@echo "  Adminer:         http://localhost:8080"
	@echo "  Redis Commander: http://localhost:8081"

staging-down: ## Stop staging containers
	$(COMPOSE_STAGING) down

staging-logs: ## View staging logs
	$(COMPOSE_STAGING) logs -f

staging-clean: ## Clean staging environment
	$(COMPOSE_STAGING) down -v --remove-orphans

# =============================================================================
# Production
# =============================================================================
prod: prod-up ## Start production environment

prod-up: ## Start production containers
	$(COMPOSE_PROD) up -d

prod-down: ## Stop production containers
	$(COMPOSE_PROD) down

prod-logs: ## View production logs
	$(COMPOSE_PROD) logs -f

prod-restart: ## Restart production containers
	$(COMPOSE_PROD) restart

prod-scale: ## Scale API containers (usage: make prod-scale n=3)
	$(COMPOSE_PROD) up -d --scale api=$(n)

# =============================================================================
# Build
# =============================================================================
build: build-api build-frontend ## Build all Docker images

build-api: ## Build API Docker image
	docker build -t rmgaas/api:latest -f docker/api.Dockerfile --target production .

build-frontend: ## Build Frontend Docker image
	docker build -t rmgaas/frontend:latest -f docker/frontend.Dockerfile --target production .

build-dev: ## Build development Docker images
	$(COMPOSE_DEV) build

build-no-cache: ## Build all images without cache
	docker build -t rmgaas/api:latest -f docker/api.Dockerfile --target production --no-cache .
	docker build -t rmgaas/frontend:latest -f docker/frontend.Dockerfile --target production --no-cache .

# =============================================================================
# Testing
# =============================================================================
test: test-unit ## Run all tests

test-unit: ## Run unit tests
	npm run test:unit --workspaces

test-e2e: ## Run E2E tests
	npm run e2e

test-e2e-ui: ## Run E2E tests with UI
	npm run e2e:ui

test-perf: ## Run performance tests
	npm run test:perf --workspace=@rmgaas/api

test-coverage: ## Run tests with coverage
	npm run test:coverage --workspaces

# =============================================================================
# Database
# =============================================================================
db-migrate: ## Run database migrations
	npm run db:migrate --workspace=@rmgaas/api

db-migrate-prod: ## Run migrations in production
	$(COMPOSE_PROD) exec api npm run db:migrate

db-seed: ## Seed the database
	npm run db:seed --workspace=@rmgaas/api

db-reset: ## Reset database (drop & recreate)
	npm run db:reset --workspace=@rmgaas/api

db-studio: ## Open Prisma Studio
	npm run db:studio --workspace=@rmgaas/api

db-backup: ## Backup production database
	$(COMPOSE_PROD) exec postgres pg_dump -U rmgaas rmgaas_prod > backups/backup_$$(date +%Y%m%d_%H%M%S).sql

db-restore: ## Restore database from backup (usage: make db-restore file=backup.sql)
	cat $(file) | $(COMPOSE_PROD) exec -T postgres psql -U rmgaas rmgaas_prod

# =============================================================================
# Logs & Monitoring
# =============================================================================
logs: ## View all container logs
	docker-compose logs -f

logs-api: ## View API logs only
	docker-compose logs -f api

logs-frontend: ## View Frontend logs only
	docker-compose logs -f frontend

logs-db: ## View database logs
	docker-compose logs -f postgres

ps: ## List running containers
	docker-compose ps

stats: ## View container resource usage
	docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# =============================================================================
# Cleanup
# =============================================================================
clean: ## Clean development artifacts
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf apps/*/dist
	rm -rf packages/*/node_modules
	rm -rf packages/*/dist
	rm -rf .turbo
	rm -rf coverage

clean-docker: ## Clean Docker resources
	docker system prune -f
	docker volume prune -f
	docker network prune -f

clean-all: clean clean-docker ## Clean everything

# =============================================================================
# Installation & Setup
# =============================================================================
install: ## Install all dependencies
	npm ci

setup: install db-migrate db-seed ## Full project setup
	@echo "Setup complete! Run 'make dev' to start development."

# =============================================================================
# Utility
# =============================================================================
shell-api: ## Open shell in API container
	docker-compose exec api sh

shell-db: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U rmgaas rmgaas

shell-redis: ## Open Redis CLI
	docker-compose exec redis redis-cli

version: ## Show version info
	@echo "Node: $$(node --version)"
	@echo "npm: $$(npm --version)"
	@echo "Docker: $$(docker --version)"
	@echo "Docker Compose: $$(docker-compose --version)"

lint: ## Run linting
	npm run lint

lint-fix: ## Fix linting issues
	npm run lint:fix

format: ## Format code
	npm run format

typecheck: ## Run TypeScript type checking
	npm run typecheck --workspaces
