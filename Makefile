# Pokemon API Service Makefile

.PHONY: help build run stop restart logs status clean deploy health

# Default target
help:
	@echo "Pokemon API Service Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make build    - Build Docker image"
	@echo "  make run      - Run with Docker Compose (development)"
	@echo "  make dev      - Run in development mode"
	@echo ""
	@echo "Production:"
	@echo "  make deploy   - Deploy to production"
	@echo "  make prod     - Run with production Docker Compose"
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
	docker-compose build

run:
	docker-compose up -d

dev:
	npm run dev

# Production commands
deploy:
	./deploy.sh deploy

prod:
	docker-compose -f docker-compose.prod.yml up -d

# Management commands
status:
	docker-compose ps

logs:
	docker-compose logs -f

restart:
	docker-compose restart

stop:
	docker-compose down

health:
	curl -f http://localhost:20275/health || echo "Health check failed"

clean:
	docker-compose down --volumes --remove-orphans
	docker image prune -f
