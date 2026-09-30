#!/bin/bash

# GPCL Finance Service - VPS Deployment Script
# Usage: ./scripts/deploy.sh [action]
# Actions: setup, build, migrate, start, stop, restart, logs, status

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="gpcl-finance"
APP_PORT="3006"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="/var/log/gpcl-finance/app.log"

# Functions
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

check_env() {
    if [ ! -f "$APP_DIR/.env" ]; then
        log_error ".env file not found. Please create it first."
        exit 1
    fi
    log_info ".env file found"
}

check_requirements() {
    log_info "Checking requirements..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 18+ first."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm not found. Please install npm first."
        exit 1
    fi

    if ! command -v pm2 &> /dev/null; then
        log_warn "PM2 not found. Installing globally..."
        sudo npm install -g pm2
    fi

    log_info "Node.js version: $(node --version)"
    log_info "npm version: $(npm --version)"
}

setup() {
    log_info "Setting up GPCL Finance Service..."

    check_requirements
    check_env

    log_info "Installing dependencies..."
    cd "$APP_DIR"
    npm ci

    log_info "Building application..."
    npm run build

    log_info "Setup complete!"
    log_info "Next steps:"
    log_info "  1. Update .env with your database credentials"
    log_info "  2. Run: ./scripts/deploy.sh migrate"
    log_info "  3. Run: ./scripts/deploy.sh start"
}

migrate() {
    log_info "Running database migrations..."

    check_env

    if [ ! -f "$APP_DIR/scripts/deploy-migrations.js" ]; then
        log_error "Migration script not found"
        exit 1
    fi

    cd "$APP_DIR"
    node scripts/deploy-migrations.js

    log_info "Migrations completed!"
}

build() {
    log_info "Building application..."

    check_env

    cd "$APP_DIR"
    npm run build

    log_info "Build completed!"
}

start() {
    log_info "Starting GPCL Finance Service..."

    check_env

    cd "$APP_DIR"

    # Check if already running
    if pm2 list | grep -q "$APP_NAME"; then
        log_warn "Application is already running. Restarting..."
        pm2 restart "$APP_NAME"
    else
        # Create log directory if it doesn't exist
        mkdir -p "$(dirname "$LOG_FILE")"

        pm2 start npm --name "$APP_NAME" -- start
        pm2 save
    fi

    log_info "Application started on port $APP_PORT"
    log_info "View logs: pm2 logs $APP_NAME"

    # Wait for startup
    sleep 5

    # Health check
    if curl -s http://localhost:$APP_PORT/api/v1/auth/me > /dev/null 2>&1; then
        log_info "Health check passed!"
    else
        log_warn "Could not verify application startup"
    fi
}

stop() {
    log_info "Stopping GPCL Finance Service..."

    pm2 stop "$APP_NAME"
    log_info "Application stopped"
}

restart() {
    log_info "Restarting GPCL Finance Service..."

    check_env

    pm2 restart "$APP_NAME"
    log_info "Application restarted"
}

status() {
    log_info "Application status:"
    pm2 status
}

logs() {
    log_info "Displaying application logs..."
    pm2 logs "$APP_NAME"
}

test_health() {
    log_info "Running health checks..."

    # Test API endpoint
    response=$(curl -s -w "\n%{http_code}" http://localhost:$APP_PORT/api/v1/auth/me)
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "401" ]; then
        log_info "API endpoint responding (401 without token - expected)"
    elif [ "$http_code" = "200" ]; then
        log_info "API endpoint responding (200)"
    else
        log_error "API endpoint not responding properly (HTTP $http_code)"
        return 1
    fi

    # Test login
    login_response=$(curl -s -X POST http://localhost:$APP_PORT/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@gpcl.com",
            "password": "Password123!"
        }')

    if echo "$login_response" | grep -q "SUCCESS"; then
        log_info "Login endpoint working"
    else
        log_warn "Login endpoint may need verification"
    fi

    log_info "Health checks completed!"
}

# Main script
case "${1:-status}" in
    setup)
        setup
        ;;
    migrate)
        migrate
        ;;
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    health)
        test_health
        ;;
    *)
        log_error "Unknown action: $1"
        echo ""
        echo "Usage: $0 [action]"
        echo ""
        echo "Available actions:"
        echo "  setup      - Install dependencies and build"
        echo "  build      - Build application"
        echo "  migrate    - Run database migrations"
        echo "  start      - Start application with PM2"
        echo "  stop       - Stop application"
        echo "  restart    - Restart application"
        echo "  status     - Show application status"
        echo "  logs       - Show application logs"
        echo "  health     - Run health checks"
        exit 1
        ;;
esac
