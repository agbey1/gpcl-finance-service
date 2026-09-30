#!/bin/bash

# ============================================================================
# GPCL Finance Service - Docker Deployment Script for VPS
# ============================================================================
# This script handles complete deployment to VPS including:
# - Pull latest code from GitHub
# - Read and follow all deployment instructions
# - Setup environment configuration
# - Build Docker image
# - Apply database migrations
# - Start Docker container
# - Verify deployment
#
# Usage: ./scripts/docker-deploy-vps.sh [init|deploy|migrate|restart|logs|health]
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/gpcl-finance"
REPO_URL="https://github.com/agbey1/gpcl-finance-service.git"
CONTAINER_NAME="gpcl_finance_app"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.docker"

# Logging functions
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"

    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker first."
        exit 1
    fi
    log_info "Docker installed: $(docker --version)"

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose not found. Please install Docker Compose first."
        exit 1
    fi
    log_info "Docker Compose installed: $(docker-compose --version)"

    if ! command -v git &> /dev/null; then
        log_error "Git not found. Please install Git first."
        exit 1
    fi
    log_info "Git installed: $(git --version | head -1)"
}

# Initialize deployment directory
init_deployment() {
    log_section "Initializing Deployment Directory"

    # Create app directory if it doesn't exist
    if [ ! -d "$APP_DIR" ]; then
        log_info "Creating directory: $APP_DIR"
        mkdir -p "$APP_DIR"
    else
        log_warn "Directory already exists: $APP_DIR"
    fi

    cd "$APP_DIR"

    # Clone or update repository
    if [ ! -d ".git" ]; then
        log_info "Cloning repository from GitHub..."
        git clone "$REPO_URL" .
    else
        log_warn "Repository already exists, pulling latest changes..."
        git fetch origin
        git reset --hard origin/main
    fi

    log_info "Repository synchronized with GitHub"

    # Display latest commit
    log_info "Latest commit: $(git log -1 --oneline)"
}

# Read and display deployment instructions
read_deployment_instructions() {
    log_section "Reading Deployment Instructions"

    # Check for various documentation files
    local doc_files=(
        "DOCKER_DEPLOYMENT_GUIDE.md"
        "VPS_DEPLOYMENT_GUIDE.md"
        "PRODUCTION_DEPLOYMENT_CHECKLIST.md"
        "IMPLEMENTATION_COMPLETE.md"
    )

    for doc in "${doc_files[@]}"; do
        if [ -f "$APP_DIR/$doc" ]; then
            log_info "Found: $doc"
            echo -e "${YELLOW}Content (first 50 lines):${NC}"
            head -50 "$APP_DIR/$doc" | sed 's/^/  /'
            echo ""
        fi
    done

    # Check for environment template
    if [ -f "$APP_DIR/.env.docker.example" ]; then
        log_info "Found environment template: .env.docker.example"
    fi

    # Check for migration scripts
    if [ -f "$APP_DIR/scripts/deploy-migrations.js" ]; then
        log_info "Found migration script: scripts/deploy-migrations.js"
    fi
}

# Setup environment configuration
setup_environment() {
    log_section "Setting Up Environment Configuration"

    if [ -f "$APP_DIR/$ENV_FILE" ]; then
        log_warn "Environment file already exists: $ENV_FILE"
        read -p "Do you want to reconfigure? (y/n): " reconfigure
        if [ "$reconfigure" != "y" ]; then
            log_info "Using existing configuration"
            return
        fi
    fi

    # Copy template if exists
    if [ -f "$APP_DIR/.env.docker.example" ]; then
        cp "$APP_DIR/.env.docker.example" "$APP_DIR/$ENV_FILE"
        log_info "Created environment file from template"
    else
        log_warn "Template file not found, creating minimal configuration"
        cat > "$APP_DIR/$ENV_FILE" << 'EOF'
NODE_ENV=production
PORT=3006
NEXT_TELEMETRY_DISABLED=1
JWT_SECRET=change-me-to-random-32-char-string
DB_SERVER=10.100.0.20
DB_PORT=1433
DB_NAME=GPCLFinanceResource
DB_USER=sa
DB_PASSWORD=change-me
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api/v1
EOF
    fi

    # Prompt for critical values
    log_warn "Please update the following in $ENV_FILE:"
    echo "  - JWT_SECRET (generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    echo "  - DB_PASSWORD (your SQL Server password)"
    echo "  - NEXT_PUBLIC_API_BASE_URL (your domain)"

    echo ""
    read -p "Have you updated the environment file? (y/n): " env_ready
    if [ "$env_ready" != "y" ]; then
        log_error "Please update the environment file and try again"
        exit 1
    fi

    log_info "Environment configuration complete"
}

# Build Docker image
build_image() {
    log_section "Building Docker Image"

    cd "$APP_DIR"

    log_info "Building image (this may take 2-3 minutes)..."
    docker-compose build --no-cache

    log_info "Docker image built successfully"
    docker images | grep gpcl-finance
}

# Apply database migrations
apply_migrations() {
    log_section "Applying Database Migrations"

    cd "$APP_DIR"

    if [ ! -f "scripts/deploy-migrations.js" ]; then
        log_error "Migration script not found: scripts/deploy-migrations.js"
        log_warn "Skipping migrations. Please apply them manually."
        return 1
    fi

    log_warn "Creating temporary container to run migrations..."
    log_info "This will connect to your SQL Server and apply all pending migrations"

    docker-compose run --rm \
        --env-file="$ENV_FILE" \
        "$CONTAINER_NAME" \
        node scripts/deploy-migrations.js

    local migration_status=$?

    if [ $migration_status -eq 0 ]; then
        log_info "Database migrations completed successfully!"
    else
        log_error "Migration failed with status: $migration_status"
        log_warn "Check the error above and resolve any database issues"
        return 1
    fi
}

# Start Docker container
start_container() {
    log_section "Starting Docker Container"

    cd "$APP_DIR"

    # Check if already running
    if docker-compose ps | grep -q "$CONTAINER_NAME.*Up"; then
        log_warn "Container is already running"
        read -p "Do you want to restart it? (y/n): " restart_choice
        if [ "$restart_choice" = "y" ]; then
            log_info "Restarting container..."
            docker-compose restart "$CONTAINER_NAME"
        fi
    else
        log_info "Starting container..."
        docker-compose up -d
    fi

    log_info "Waiting for container to be ready..."
    sleep 5

    # Check status
    if docker-compose ps | grep -q "$CONTAINER_NAME.*Up"; then
        log_info "Container is running!"
        docker-compose ps
    else
        log_error "Container failed to start"
        docker-compose logs "$CONTAINER_NAME"
        return 1
    fi
}

# Verify deployment
verify_deployment() {
    log_section "Verifying Deployment"

    log_info "Testing API endpoint..."

    # Get API response (should be 401 without token)
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/api/v1/auth/me)

    if [ "$http_code" = "401" ]; then
        log_info "API endpoint responding correctly (HTTP 401 without token)"
    elif [ "$http_code" = "200" ]; then
        log_info "API endpoint responding (HTTP 200)"
    else
        log_error "API endpoint not responding properly (HTTP $http_code)"
        return 1
    fi

    # Test login
    log_info "Testing login endpoint..."
    login_response=$(curl -s -X POST http://localhost:3006/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@gpcl.com",
            "password": "Password123!"
        }')

    if echo "$login_response" | grep -q "SUCCESS"; then
        log_info "Login endpoint working!"
        # Extract token
        token=$(echo "$login_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        if [ -n "$token" ]; then
            log_info "JWT Token obtained successfully"
        fi
    else
        log_warn "Login endpoint response: $login_response"
    fi

    log_info "Deployment verification complete!"
}

# Show logs
show_logs() {
    log_section "Application Logs"
    cd "$APP_DIR"
    docker-compose logs -f "$CONTAINER_NAME" --tail 100
}

# Health check
health_check() {
    log_section "Health Check"

    log_info "Checking container status..."
    docker-compose ps

    log_info "Checking API health..."
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/api/v1/auth/me)

    if [ "$http_code" = "401" ] || [ "$http_code" = "200" ]; then
        log_info "API is healthy (HTTP $http_code)"
    else
        log_error "API is unhealthy (HTTP $http_code)"
        return 1
    fi

    log_info "System resource usage:"
    docker stats --no-stream "$CONTAINER_NAME"
}

# Restart container
restart_container() {
    log_section "Restarting Container"
    cd "$APP_DIR"

    log_info "Restarting application..."
    docker-compose restart "$CONTAINER_NAME"

    sleep 3

    log_info "Container restarted"
    docker-compose ps
}

# Main function
main() {
    local action="${1:-init}"

    case "$action" in
        init)
            check_prerequisites
            init_deployment
            read_deployment_instructions
            setup_environment
            ;;
        build)
            check_prerequisites
            cd "$APP_DIR" 2>/dev/null || init_deployment
            build_image
            ;;
        migrate)
            cd "$APP_DIR" 2>/dev/null || {
                log_error "App directory not found. Run 'init' first"
                exit 1
            }
            apply_migrations
            ;;
        start)
            cd "$APP_DIR" 2>/dev/null || {
                log_error "App directory not found. Run 'init' first"
                exit 1
            }
            start_container
            ;;
        deploy)
            check_prerequisites
            init_deployment
            read_deployment_instructions
            setup_environment
            build_image
            apply_migrations
            start_container
            verify_deployment
            log_section "Deployment Complete!"
            log_info "Application is running on port 3006"
            log_info "Access via: http://localhost:3006 or https://yourdomain.com"
            ;;
        verify)
            cd "$APP_DIR" 2>/dev/null || {
                log_error "App directory not found"
                exit 1
            }
            verify_deployment
            ;;
        restart)
            cd "$APP_DIR" 2>/dev/null || {
                log_error "App directory not found"
                exit 1
            }
            restart_container
            ;;
        logs)
            cd "$APP_DIR" 2>/dev/null || {
                log_error "App directory not found"
                exit 1
            }
            show_logs
            ;;
        health)
            cd "$APP_DIR" 2>/dev/null || {
                log_error "App directory not found"
                exit 1
            }
            health_check
            ;;
        *)
            log_error "Unknown action: $action"
            echo ""
            echo "Usage: $0 [action]"
            echo ""
            echo "Available actions:"
            echo "  init       - Initialize deployment directory and clone repo"
            echo "  build      - Build Docker image"
            echo "  migrate    - Apply database migrations"
            echo "  start      - Start Docker container"
            echo "  deploy     - Full deployment (init + build + migrate + start + verify)"
            echo "  verify     - Verify deployment is working"
            echo "  restart    - Restart the container"
            echo "  logs       - Show application logs"
            echo "  health     - Check application health"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
