#!/bin/bash
# Claude Code Analysis Script
# Usage: ./scripts/claude-analyze.sh <file_or_directory> [additional_prompt]

# Load environment variables
if [ -f ".env" ]; then
    source .env
else
    echo "Warning: .env file not found. Please ensure ANTHROPIC_API_KEY is set in environment."
fi

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY not set in environment"
    echo "Please add your Anthropic API key to .env file:"
    echo "ANTHROPIC_API_KEY=sk-ant-api03-your-key-here"
    exit 1
fi

# Check if Claude CLI is installed
if ! command -v claude &> /dev/null; then
    echo "Error: Claude CLI not found"
    echo "Install it with: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <file_or_directory> [additional_prompt]"
    echo ""
    echo "Examples:"
    echo "  $0 src/main.ts"
    echo "  $0 src/ 'Focus on TypeScript best practices'"
    echo "  $0 package.json 'Explain dependencies and suggest improvements'"
    exit 1
fi

target=$1
prompt=${2:-"Analyze this code and provide improvement suggestions, focusing on code quality, performance, security, and best practices."}

echo "🔍 Analyzing: $target"
echo "📝 Prompt: $prompt"
echo "🤖 Using Claude AI..."
echo ""

# Check if target exists
if [ ! -e "$target" ]; then
    echo "Error: $target does not exist"
    exit 1
fi

# Use Claude to analyze
if [ -f "$target" ]; then
    # Single file analysis
    claude -p --model sonnet "$prompt" < "$target"
elif [ -d "$target" ]; then
    # Directory analysis
    claude --add-dir "$target" --model sonnet "$prompt for the directory: $target"
else
    echo "Error: $target is neither a file nor a directory"
    exit 1
fi

echo ""
echo "✅ Analysis complete!"