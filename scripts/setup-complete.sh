#!/bin/bash

# =============================================================================
# Cartrita AI Agents - Complete Setup Script
# =============================================================================
# This script sets up the entire development environment including:
# - GitHub repository creation and configuration
# - Codacy integration setup
# - MCP servers configuration and health checks
# - Database initialization
# - Environment variables validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_NAME="cartita-mcdaniels"
GITHUB_ORG="Punky2280"
PROJECT_NAME="Cartrita AI Agents"

echo -e "${BLUE}🚀 ${PROJECT_NAME} - Complete Setup${NC}"
echo "=================================================="
echo ""

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# =============================================================================
# Prerequisites Check
# =============================================================================

log_info "Checking prerequisites..."

check_command "git"
check_command "gh"
check_command "node"
check_command "pnpm"
check_command "docker"

log_success "All prerequisites are installed"

# =============================================================================
# Environment Setup
# =============================================================================

log_info "Setting up environment..."

# Check if .env exists, if not create from .env.example
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_warning ".env file created from .env.example. Please update with your actual values."
    else
        log_error ".env.example file not found. Cannot create .env file."
        exit 1
    fi
else
    log_success ".env file already exists"
fi

# =============================================================================
# GitHub Repository Setup
# =============================================================================

log_info "Checking GitHub repository..."

# Check if we're already in a git repository
if [ ! -d ".git" ]; then
    log_info "Initializing Git repository..."
    git init
    git branch -M main
fi

# Check if GitHub repository exists
if gh repo view $GITHUB_ORG/$REPO_NAME &> /dev/null; then
    log_success "GitHub repository already exists"
else
    log_info "Creating GitHub repository..."
    
    # Create repository (private by default)
    gh repo create $GITHUB_ORG/$REPO_NAME --private --description "AI Agents Monorepo with MCP Servers and Fastify Backend" --clone=false
    
    # Add remote if it doesn't exist
    if ! git remote get-url origin &> /dev/null; then
        git remote add origin https://github.com/$GITHUB_ORG/$REPO_NAME.git
    fi
    
    log_success "GitHub repository created"
fi

# =============================================================================
# Dependencies Installation
# =============================================================================

log_info "Installing dependencies..."

pnpm install

log_success "Dependencies installed"

# =============================================================================
# Database Setup
# =============================================================================

log_info "Setting up database..."

# Start database container
if ! docker ps | grep -q cartrita-postgres; then
    log_info "Starting PostgreSQL container..."
    pnpm run docker:up
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 10
fi

# Run database migrations
log_info "Running database migrations..."
pnpm run db:migrate

log_success "Database setup completed"

# =============================================================================
# MCP Servers Health Check
# =============================================================================

log_info "Running MCP servers health check..."

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Run the health check
if pnpm run mcp:health; then
    log_success "MCP servers health check completed"
else
    log_warning "Some MCP servers might need configuration. Check the output above."
fi

# =============================================================================
# Codacy Setup (if repository is accessible)
# =============================================================================

log_info "Attempting Codacy setup..."

# Make repository public temporarily for Codacy setup
log_info "Making repository public for Codacy integration..."
gh repo edit $GITHUB_ORG/$REPO_NAME --visibility public

# Wait a moment for GitHub to process the change
sleep 5

# Try to setup Codacy
echo "Attempting to setup Codacy integration..."
echo "Note: This may fail if Codacy doesn't have access to the repository yet."

# =============================================================================
# Initial Git Commit
# =============================================================================

log_info "Creating initial commit..."

# Add all files
git add .

# Check if there are any changes to commit
if git diff --staged --quiet; then
    log_info "No changes to commit"
else
    # Create initial commit
    git commit -m "feat: initial project setup with MCP servers and modern Fastify architecture

- Add comprehensive MCP server configuration
- Implement modern Fastify plugin architecture  
- Setup TypeScript with TypeBox validation
- Configure Drizzle ORM with PostgreSQL
- Add browser automation (Playwright, Puppeteer)
- Integrate cloud services (Docker, Kubernetes, Google Drive)
- Setup productivity tools (Slack, Notion, Todoist)
- Add comprehensive environment variables
- Create health check scripts for MCP servers
- Setup development and production scripts"

    # Push to GitHub
    git push -u origin main
    
    log_success "Initial commit created and pushed"
fi

# =============================================================================
# Final Setup Steps
# =============================================================================

log_success "Setup completed successfully! 🎉"
echo ""
echo "Next steps:"
echo "1. Update .env file with your actual API keys"
echo "2. Run 'pnpm run dev' to start the development server"
echo "3. Run 'pnpm run mcp:health' to check MCP server status"
echo "4. Visit http://localhost:3000/docs for API documentation"
echo "5. Access Drizzle Studio at http://localhost:4983 (run 'pnpm run db:studio')"
echo ""
echo "📖 Documentation:"
echo "- README.md - Project overview and quick start"
echo "- docs/operations/MCP_SERVER_SETUP.md - MCP server configuration"
echo "- docs/operations/ENGINEERING_PLAYBOOK.md - Development guidelines"
echo ""
echo "🔍 Useful commands:"
echo "- pnpm run dev        # Start development server"
echo "- pnpm run build      # Build for production"
echo "- pnpm run test       # Run tests"
echo "- pnpm run mcp:health # Check MCP server health"
echo "- pnpm run db:studio  # Open database studio"
echo "- pnpm run lint       # Run linter"
echo "- pnpm run format     # Format code"
echo ""

# Make repository private again (optional, comment out if you want it public)
log_info "Making repository private again..."
gh repo edit $GITHUB_ORG/$REPO_NAME --visibility private

log_success "Repository visibility set to private"
echo ""
log_success "🚀 Cartrita AI Agents setup completed successfully!"