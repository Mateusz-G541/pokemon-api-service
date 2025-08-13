#!/bin/bash

# Pokemon API Service Deployment Script
# This script handles deployment of the Pokemon API service using Docker Compose

set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/Mateusz-G541/pokemon-api-service.git"
PROJECT_DIR="/opt/pokemon-api-service"
COMPOSE_FILE="docker-compose.prod.yml"
SERVICE_NAME="pokemon-api"
HEALTH_URL="http://localhost:20275/health"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Detect Docker Compose command (v2 plugin vs legacy)
set_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        COMPOSE="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE="docker-compose"
    else
        error "Neither 'docker compose' (v2) nor 'docker-compose' (v1) is installed. Please install Docker Compose."
        exit 1
    fi
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    # Set COMPOSE variable to appropriate command
    set_compose_cmd
    
    success "Dependencies check passed"
}

# Clone or update repository
update_code() {
    log "Updating code from repository..."
    
    if [ -d "$PROJECT_DIR" ]; then
        log "Project directory exists, pulling latest changes..."
        cd "$PROJECT_DIR"
        git fetch origin
        # Determine default remote branch (prefer main, else master)
        if git show-ref --verify --quiet refs/remotes/origin/main; then
            TARGET_REF="origin/main"
        elif git show-ref --verify --quiet refs/remotes/origin/master; then
            TARGET_REF="origin/master"
        else
            # Fallback to remote HEAD if available
            TARGET_REF="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^refs/remotes/##')"
        fi
        if [ -z "$TARGET_REF" ]; then
            error "Unable to determine default remote branch (main/master)."
            exit 1
        fi
        git reset --hard "$TARGET_REF"
        git clean -fd
    else
        log "Cloning repository..."
        git clone "$REPO_URL" "$PROJECT_DIR"
        cd "$PROJECT_DIR"
    fi
    
    success "Code updated successfully"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    if [ ! -f ".env.production" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.production
            warning "Created .env.production from .env.example. Please update with production values."
        else
            error ".env.example not found. Please create environment configuration."
            exit 1
        fi
    fi
    
    success "Environment setup complete"
}

# Ensure permissions on important files
ensure_permissions() {
    log "Ensuring file permissions..."
    # Make deploy script executable
    chmod +x deploy.sh 2>/dev/null || true
    # Make any shell scripts in scripts/ executable
    if [ -d "scripts" ]; then
        chmod +x scripts/*.sh 2>/dev/null || true
    fi
    # Makefile does not need executable bit; set readable by all
    if [ -f "Makefile" ]; then
        chmod 775 Makefile 2>/dev/null || true
    fi
    success "Permissions ensured"
}

# Build and deploy
deploy() {
    log "Starting deployment..."
    
    # Stop existing services
    log "Stopping existing services..."
    $COMPOSE -f "$COMPOSE_FILE" down --remove-orphans || true
    
    # Pull latest image from registry
    log "Pulling latest image(s) from registry..."
    $COMPOSE -f "$COMPOSE_FILE" pull
    
    # Start services
    log "Starting services..."
    $COMPOSE -f "$COMPOSE_FILE" up -d
    
    success "Services started"
}

# Health check
health_check() {
    log "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$HEALTH_URL" > /dev/null; then
            success "Health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Cleanup old images
cleanup() {
    log "Cleaning up old Docker images..."
    docker image prune -f
    success "Cleanup complete"
}

# Show status
status() {
    log "Service Status:"
    $COMPOSE -f "$COMPOSE_FILE" ps
    
    log "Service Logs (last 20 lines):"
    $COMPOSE -f "$COMPOSE_FILE" logs --tail=20
}

# Show logs
logs() {
    $COMPOSE -f "$COMPOSE_FILE" logs -f
}

# Restart service
restart() {
    log "Restarting service..."
    $COMPOSE -f "$COMPOSE_FILE" restart
    health_check
}

# Stop service
stop() {
    log "Stopping service..."
    $COMPOSE -f "$COMPOSE_FILE" down
    success "Service stopped"
}

# Main deployment function
main_deploy() {
    log "Starting Pokemon API Service deployment..."
    
    check_dependencies
    update_code
    setup_environment
    ensure_permissions
    deploy
    
    if health_check; then
        cleanup
        success "Deployment completed successfully!"
        status
    else
        error "Deployment failed - health check unsuccessful"
        log "Checking logs for errors..."
        $COMPOSE -f "$COMPOSE_FILE" logs --tail=50
        exit 1
    fi
}

# Script usage
usage() {
    echo "Usage: $0 {deploy|status|logs|restart|stop|health}"
    echo ""
    echo "Commands:"
    echo "  deploy  - Full deployment (default)"
    echo "  status  - Show service status"
    echo "  logs    - Show service logs"
    echo "  restart - Restart service"
    echo "  stop    - Stop service"
    echo "  health  - Check service health"
    exit 1
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        main_deploy
        ;;
    status)
        cd "$PROJECT_DIR"
        status
        ;;
    logs)
        cd "$PROJECT_DIR"
        logs
        ;;
    restart)
        cd "$PROJECT_DIR"
        restart
        ;;
    stop)
        cd "$PROJECT_DIR"
        stop
        ;;
    health)
        health_check
        ;;
    *)
        usage
        ;;
esac
