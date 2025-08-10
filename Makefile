# Pokemon API Service Makefile

.PHONY: help build run stop restart logs status clean deploy health

# Auto-detect Docker Compose (v2 plugin vs legacy v1)
# Sets COMPOSE to either 'docker compose' or 'docker-compose'
COMPOSE := $(shell sh -c 'if docker compose version >/dev/null 2>&1; then echo "docker compose"; elif command -v docker-compose >/dev/null 2>&1; then echo "docker-compose"; else echo ""; fi')

ifeq ($(COMPOSE),)
$(error Neither 'docker compose' (v2) nor 'docker-compose' (v1) is available. Please install Docker Compose.)
endif

# Default target
help:
	@echo "Pokemon API Service Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make build    - Build Docker image (via Compose)"
	@echo "  make run      - Run with Docker Compose (development)"
	@echo "  make dev      - Run in development mode"
	@echo ""
	@echo "Production:"
	@echo "  make deploy   - Deploy to production"
	@echo "  make prod     - Run with production Docker Compose"
	@echo "  make compose  - Show which Compose command is used"
	@echo ""
	@echo "Management:"
	@echo "  make status   - Show service status"
	@echo "  make logs     - Show service logs"
	@echo "  make restart  - Restart service"
	@echo "  make stop     - Stop service"
	@echo "  make health   - Check service health"
	@echo "  make clean    - Clean up Docker resources"

# Development commands
build:
	$(COMPOSE) build

run:
	$(COMPOSE) up -d

dev:
	npm run dev

# Production commands
deploy:
	./deploy.sh deploy

prod:
	$(COMPOSE) -f docker-compose.prod.yml up -d

# Management commands
status:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

restart:
	$(COMPOSE) restart

stop:
	$(COMPOSE) down

health:
	curl -f http://localhost:20275/health || echo "Health check failed"

clean:
	$(COMPOSE) down --volumes --remove-orphans
	docker image prune -f

# Show which compose command is used
compose:
	@echo Using Compose: $(COMPOSE)
