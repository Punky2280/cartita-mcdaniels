#!/bin/bash
# Claude Code Review Script
# Usage: ./scripts/claude-review.sh [--diff|--staged|--files <file1> <file2> ...]

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [--diff|--staged|--files <file1> <file2> ...]"
    echo ""
    echo "Options:"
    echo "  --diff     Review git diff (unstaged changes)"
    echo "  --staged   Review git diff --staged (staged changes)"
    echo "  --files    Review specific files"
    echo "  (no args)  Review entire current directory"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Review entire project"
    echo "  $0 --diff                           # Review unstaged changes"
    echo "  $0 --staged                         # Review staged changes"
    echo "  $0 --files src/main.ts src/cli/     # Review specific files"
    echo ""
}

# Review prompt template
get_review_prompt() {
    echo "Perform a thorough code review focusing on:

1. **Code Quality**: Clean code principles, readability, maintainability
2. **Security Issues**: Potential vulnerabilities, input validation, authentication
3. **Performance**: Efficiency, scalability, resource usage
4. **Best Practices**: Language-specific conventions, design patterns
5. **Type Safety**: TypeScript type usage, error handling
6. **Testing**: Test coverage, testability, edge cases
7. **Documentation**: Code comments, API documentation
8. **Dependencies**: Security vulnerabilities, outdated packages

Provide specific, actionable feedback with:
- 🔴 Critical issues that must be fixed
- 🟡 Suggestions for improvement
- 🟢 Good practices worth highlighting

For each issue, include:
- File and line number (if applicable)
- Clear explanation of the problem
- Recommended solution or improvement
- Code examples when helpful"
}

# Main logic
case "$1" in
    --help|-h)
        show_usage
        exit 0
        ;;
    --diff)
        echo "🔍 Reviewing unstaged changes (git diff)..."
        if ! git rev-parse --git-dir > /dev/null 2>&1; then
            echo "Error: Not in a git repository"
            exit 1
        fi
        
        diff_output=$(git diff)
        if [ -z "$diff_output" ]; then
            echo "No unstaged changes found."
            exit 0
        fi
        
        echo "📊 Changes found. Sending to Claude for review..."
        echo ""
        echo "$diff_output" | claude -p --model opus "$(get_review_prompt)"
        ;;
    --staged)
        echo "🔍 Reviewing staged changes (git diff --staged)..."
        if ! git rev-parse --git-dir > /dev/null 2>&1; then
            echo "Error: Not in a git repository"
            exit 1
        fi
        
        staged_output=$(git diff --staged)
        if [ -z "$staged_output" ]; then
            echo "No staged changes found."
            exit 0
        fi
        
        echo "📊 Staged changes found. Sending to Claude for review..."
        echo ""
        echo "$staged_output" | claude -p --model opus "$(get_review_prompt)"
        ;;
    --files)
        shift  # Remove --files argument
        if [ $# -eq 0 ]; then
            echo "Error: No files specified"
            show_usage
            exit 1
        fi
        
        echo "🔍 Reviewing specified files: $@"
        echo ""
        
        # Combine all files for review
        temp_file=$(mktemp)
        for file in "$@"; do
            if [ -f "$file" ]; then
                echo "=== File: $file ===" >> "$temp_file"
                cat "$file" >> "$temp_file"
                echo "" >> "$temp_file"
            elif [ -d "$file" ]; then
                echo "=== Directory: $file ===" >> "$temp_file"
                find "$file" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) -exec sh -c 'echo "--- {}" && cat "{}" && echo ""' \; >> "$temp_file"
            else
                echo "Warning: $file does not exist, skipping..."
            fi
        done
        
        claude -p --model opus "$(get_review_prompt)" < "$temp_file"
        rm "$temp_file"
        ;;
    "")
        echo "🔍 Reviewing entire current directory..."
        echo "📁 Working directory: $(pwd)"
        echo "🤖 Using Claude AI for comprehensive code review..."
        echo ""
        
        claude --add-dir "$(pwd)" --allowed-tools "FileSearch" --model opus \
            "$(get_review_prompt) 

Please review the codebase in the current directory. Focus on the main source files, configuration, and documentation. Ignore node_modules, build artifacts, and temporary files."
        ;;
    *)
        echo "Error: Unknown option '$1'"
        echo ""
        show_usage
        exit 1
        ;;
esac

echo ""
echo "✅ Code review complete!"

# Suggest next steps based on what was reviewed
case "$1" in
    --diff|--staged)
        echo ""
        echo "💡 Next steps:"
        echo "  - Address critical issues before committing"
        echo "  - Run tests to ensure changes work correctly"
        echo "  - Update documentation if needed"
        ;;
    *)
        echo ""
        echo "💡 Next steps:"
        echo "  - Prioritize critical security and performance issues"
        echo "  - Create issues/tickets for improvement suggestions"
        echo "  - Update coding standards based on feedback"
        echo "  - Consider running automated linting: pnpm run lint"
        ;;
esac