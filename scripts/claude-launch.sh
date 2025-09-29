#!/bin/bash
# Claude Launcher Script for Cartrita AI Project
# Usage: ./scripts/claude-launch.sh [claude-options]

# Set script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Launching Claude AI for Cartrita AI Development Tools"
echo "📁 Project Root: $PROJECT_ROOT"

# Change to project root
cd "$PROJECT_ROOT"

# Load environment variables
if [ -f ".env" ]; then
    source .env
    echo "✅ Environment variables loaded from .env"
else
    echo "⚠️  Warning: .env file not found"
    echo "   Please copy .env.example to .env and configure your API keys"
fi

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ Error: ANTHROPIC_API_KEY not set"
    echo ""
    echo "To fix this:"
    echo "1. Copy .env.example to .env:"
    echo "   cp .env.example .env"
    echo ""
    echo "2. Edit .env and add your Anthropic API key:"
    echo "   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here"
    echo ""
    echo "3. Get an API key from: https://console.anthropic.com/"
    exit 1
fi

# Check if Claude CLI is installed
if ! command -v claude &> /dev/null; then
    echo "❌ Error: Claude CLI not found"
    echo ""
    echo "To install Claude CLI:"
    echo "   npm install -g @anthropic-ai/claude-code"
    echo ""
    echo "Then try running this script again."
    exit 1
fi

# Show API key status (first 10 chars + ***)
echo "🔑 API Key: ${ANTHROPIC_API_KEY:0:10}***"

# Check if project settings exist
if [ -f ".claude-settings.json" ]; then
    echo "⚙️  Using project settings from .claude-settings.json"
    SETTINGS_ARG="--settings .claude-settings.json"
else
    echo "ℹ️  No .claude-settings.json found, using default settings"
    SETTINGS_ARG=""
fi

# Show helpful information
echo ""
echo "📋 Available Helper Scripts:"
echo "   ./scripts/claude-analyze.sh <file>     - Analyze code files"
echo "   ./scripts/claude-docs.sh <file>        - Generate documentation"  
echo "   ./scripts/claude-review.sh [--diff]    - Code review"
echo ""
echo "🔧 Useful Claude Commands:"
echo "   claude -c                              - Continue last conversation"
echo "   claude --model opus 'complex task'     - Use highest quality model"
echo "   claude --model haiku 'quick question'  - Use fastest model"
echo "   claude config list                     - View configuration"
echo ""
echo "📚 Type 'help' in Claude for more commands, or see:"
echo "   ./instructions/claude-terminal-setup.md"
echo ""
echo "🎯 Starting Claude with project context..."
echo "----------------------------------------"

# Launch Claude with project settings and any additional arguments
exec claude $SETTINGS_ARG "$@"