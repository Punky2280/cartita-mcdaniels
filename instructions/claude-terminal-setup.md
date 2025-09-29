# Claude Terminal Setup Guide

This guide provides comprehensive instructions for setting up and using Claude AI directly from the terminal, without relying on VS Code extensions.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [API Key Configuration](#api-key-configuration)
5. [Basic Usage](#basic-usage)
6. [Advanced Features](#advanced-features)
7. [Terminal Integration Scripts](#terminal-integration-scripts)
8. [Configuration Options](#configuration-options)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)
11. [Security Considerations](#security-considerations)

## Overview

Claude Terminal Setup enables direct interaction with Anthropic's Claude AI through command-line interface, providing:

- **Direct API Access**: Use your Anthropic API key for terminal-only Claude interactions
- **No Extension Dependencies**: Complete independence from VS Code extensions
- **Scriptable Interface**: Integrate Claude into shell scripts and automation workflows
- **Secure Configuration**: Environment-based API key management
- **Full Feature Access**: Access all Claude capabilities through terminal commands

## Prerequisites

### System Requirements
- **Operating System**: Linux, macOS, or Windows (WSL recommended)
- **Node.js**: Version 18.x or higher
- **npm/pnpm**: Package manager (pnpm preferred for this project)
- **Terminal**: Bash, Zsh, or compatible shell

### Required Accounts & Keys
- **Anthropic API Key**: Active Claude API subscription
  - Sign up at: https://console.anthropic.com/
  - Generate API key in Console → API Keys
  - Ensure sufficient usage credits

### Project Dependencies
- This project already includes `@anthropic-ai/sdk` in dependencies
- Environment configuration is pre-configured in `.env.example`

## Installation

### 1. Install Claude CLI Globally

```bash
# Install the official Anthropic Claude CLI
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

### 2. Verify CLI Availability

```bash
# Check Claude CLI is accessible
claude --help

# Expected output: Command usage and options
```

### 3. Project-Specific Setup

```bash
# Navigate to project root
cd /home/robbie/cartrita-mcdaniels-suarez

# Ensure environment is configured
cp .env.example .env

# Edit .env file with your API key
nano .env
```

## API Key Configuration

### 1. Environment Variable Setup

Edit your `.env` file and configure the Anthropic API key:

```bash
# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-anthropic-api-key-here
```

### 2. Load Environment Variables

```bash
# Method 1: Source environment for current session
source .env

# Method 2: Export for persistent session
export ANTHROPIC_API_KEY="sk-ant-api03-your-actual-api-key"

# Method 3: Add to shell profile for permanent setup
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-your-actual-api-key"' >> ~/.bashrc
source ~/.bashrc
```

### 3. Verify API Key Configuration

```bash
# Check API key is loaded (shows first 10 characters + ***)
echo "API Key: ${ANTHROPIC_API_KEY:0:10}***"
```

## Basic Usage

### 1. Interactive Mode (Default)

```bash
# Start interactive Claude session
claude

# Interactive features:
# - Multi-turn conversations
# - File editing capabilities
# - Code analysis and generation
# - Terminal command execution
# - Project understanding
```

### 2. Single Command Mode

```bash
# Get immediate response and exit
claude -p "Explain the purpose of package.json"

# Pipe output to files
claude -p "Generate a README for this project" > README-generated.md

# Use in scripts
response=$(claude -p "What is the main function of this TypeScript file?" < src/main.ts)
echo "$response"
```

### 3. JSON Output Mode

```bash
# Get structured JSON response
claude -p --output-format json "Analyze this code structure"

# Streaming JSON for real-time processing
claude -p --output-format stream-json "Generate test cases for this function"
```

## Advanced Features

### 1. Model Selection

```bash
# Use specific Claude model
claude --model sonnet "Help me optimize this algorithm"
claude --model opus "Write comprehensive documentation"

# With fallback model for reliability
claude --model sonnet --fallback-model haiku -p "Quick code review"
```

### 2. Session Management

```bash
# Continue previous conversation
claude -c

# Resume specific session
claude --resume [session-id]

# Fork session (create new branch from existing)
claude --resume [session-id] --fork-session
```

### 3. File and Directory Access

```bash
# Grant access to additional directories
claude --add-dir ./src --add-dir ./docs

# Work within specific project context
cd /path/to/your/project
claude "Analyze the entire codebase and suggest improvements"
```

### 4. Tool and Permission Management

```bash
# Allow specific tools
claude --allowed-tools "Bash,Edit,FileSearch" "Help me refactor this module"

# Disable specific tools
claude --disallowed-tools "Bash" "Review this code without running it"

# Bypass permissions (use with caution in trusted environments)
claude --dangerously-skip-permissions "Perform bulk file operations"
```

### 5. Custom System Prompts

```bash
# Append custom instructions
claude --append-system-prompt "Always provide TypeScript examples" "Help with React components"

# Use custom agents
claude --agents '{"reviewer":{"description":"Code reviewer","prompt":"You are an expert code reviewer"}}' "Review this pull request"
```

## Terminal Integration Scripts

### 1. Claude Analysis Script

Create `scripts/claude-analyze.sh`:

```bash
#!/bin/bash
# Claude Code Analysis Script

# Load environment
source .env

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY not set in environment"
    exit 1
fi

# Analyze file or directory
if [ $# -eq 0 ]; then
    echo "Usage: $0 <file_or_directory> [additional_prompt]"
    exit 1
fi

target=$1
prompt=${2:-"Analyze this code and provide improvement suggestions"}

# Use Claude to analyze
claude -p --model sonnet "$prompt" < "$target"
```

### 2. Claude Documentation Generator

Create `scripts/claude-docs.sh`:

```bash
#!/bin/bash
# Claude Documentation Generator

source .env

if [ -z "$1" ]; then
    echo "Usage: $0 <source_file> [output_file]"
    exit 1
fi

input_file=$1
output_file=${2:-"${input_file%.*}-docs.md"}

claude -p --output-format text \
    "Generate comprehensive documentation for this code file. Include purpose, usage examples, API reference, and implementation notes." \
    < "$input_file" > "$output_file"

echo "Documentation generated: $output_file"
```

### 3. Claude Code Review Script

Create `scripts/claude-review.sh`:

```bash
#!/bin/bash
# Claude Code Review Script

source .env

# Review git diff or specific files
if [ "$1" = "--diff" ]; then
    git diff | claude -p --model opus "Perform a thorough code review of this diff. Check for bugs, security issues, performance problems, and style consistency."
elif [ "$1" = "--staged" ]; then
    git diff --staged | claude -p --model opus "Review these staged changes before commit."
else
    claude --allowed-tools "FileSearch,Edit" "Please review the codebase in the current directory. Focus on code quality, security, and best practices."
fi
```

## Configuration Options

### 1. Global Configuration

```bash
# Set default model
claude config set -g model sonnet

# Set default theme
claude config set -g theme dark

# Configure verbose mode
claude config set -g verbose true

# View all configurations
claude config list
```

### 2. Project-Specific Settings

Create `.claude-settings.json` in project root:

```json
{
  "model": "sonnet",
  "allowedTools": ["Bash", "Edit", "FileSearch"],
  "addDir": ["./src", "./docs", "./scripts"],
  "appendSystemPrompt": "You are working on a TypeScript/Node.js project with AI development tools. Always consider type safety and modern JavaScript/TypeScript best practices.",
  "permissionMode": "default"
}
```

### 3. Environment-Specific Configuration

```bash
# Development environment
export CLAUDE_MODEL="haiku"
export CLAUDE_VERBOSE="true"

# Production environment
export CLAUDE_MODEL="sonnet"
export CLAUDE_PERMISSION_MODE="plan"
```

## Troubleshooting

### Common Issues

#### 1. API Key Not Recognized

**Problem**: Claude reports authentication errors

**Solutions**:
```bash
# Check if API key is loaded
echo $ANTHROPIC_API_KEY

# Reload environment
source .env

# Verify API key format (should start with sk-ant-api03-)
echo "Key format: ${ANTHROPIC_API_KEY:0:15}..."
```

#### 2. Command Not Found

**Problem**: `claude: command not found`

**Solutions**:
```bash
# Reinstall Claude CLI
npm install -g @anthropic-ai/claude-code

# Check npm global path
npm list -g --depth=0 | grep claude

# Verify PATH includes npm global bin
echo $PATH | grep npm
```

#### 3. Permission Denied

**Problem**: Claude cannot access files or directories

**Solutions**:
```bash
# Grant explicit directory access
claude --add-dir $(pwd) "Analyze current directory"

# Use trusted mode (caution: only in safe environments)
claude --dangerously-skip-permissions "Perform file operations"

# Check file permissions
ls -la <problematic_file>
```

#### 4. Rate Limiting

**Problem**: API rate limit exceeded

**Solutions**:
```bash
# Use different model (haiku is faster/cheaper)
claude --model haiku -p "Simple query"

# Check API usage at console.anthropic.com
# Wait for rate limit reset
# Consider upgrading API plan
```

### Debug Mode

```bash
# Enable debug mode
claude --debug "Troubleshoot this issue"

# Debug specific categories
claude --debug "api,hooks" "Debug API and hook issues"

# Verbose output
claude --verbose -p "Get detailed processing information"
```

## Best Practices

### 1. Security Best Practices

- **Never commit API keys**: Always use environment variables
- **Limit tool access**: Use `--allowed-tools` for restricted operations
- **Review permissions**: Don't use `--dangerously-skip-permissions` in production
- **Secure environments**: Only use bypass options in isolated/sandboxed environments

### 2. Performance Optimization

```bash
# Use appropriate models for tasks
claude --model haiku "Quick questions"        # Fast, cost-effective
claude --model sonnet "Code generation"       # Balanced performance
claude --model opus "Complex analysis"        # High-quality reasoning

# Batch operations efficiently
find . -name "*.ts" -exec claude -p "Quick lint check" < {} \;
```

### 3. Workflow Integration

```bash
# Git hooks integration
echo 'claude --model haiku -p "Check this commit for issues" < <(git diff --cached)' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# CI/CD integration
- name: Claude Code Review
  run: |
    source .env
    git diff origin/main...HEAD | claude -p --output-format json "Perform code review" > review-results.json
```

### 4. Session Management

```bash
# Start focused sessions with context
claude --session-id "$(uuidgen)" --append-system-prompt "Focus on TypeScript and Node.js best practices" "Begin code review session"

# Continue conversations efficiently
claude -c "Follow up on previous recommendations"

# Fork sessions for experimentation
claude --resume last-session --fork-session "Try alternative approach"
```

## Security Considerations

### 1. API Key Protection

```bash
# Use environment variables
export ANTHROPIC_API_KEY="your-key-here"

# Avoid inline keys
claude -p "query"  # ✓ Good: Uses env var
claude -p --api-key "sk-ant..." "query"  # ✗ Bad: Exposed in history
```

### 2. File Access Control

```bash
# Explicit directory allowlisting
claude --add-dir ./src --add-dir ./docs "Work on documentation"

# Avoid overly permissive access
claude --add-dir / "analyze system"  # ✗ Dangerous: Full system access
```

### 3. Network Security

```bash
# In restricted environments, limit network access
claude --disallowed-tools "WebSearch,FileDownload" "Work offline only"

# For air-gapped systems, use print mode only
claude -p "Generate code without external dependencies"
```

### 4. Audit and Monitoring

```bash
# Log Claude usage
claude --verbose "task description" 2>&1 | tee claude-audit.log

# Monitor API usage
# Check console.anthropic.com regularly for usage patterns
```

---

## Quick Reference

### Essential Commands

```bash
# Interactive mode
claude

# Single query
claude -p "question"

# JSON output
claude -p --output-format json "question"

# Continue conversation
claude -c

# Resume session
claude --resume

# With specific model
claude --model sonnet "question"

# With file access
claude --add-dir ./src "analyze code"

# Configuration
claude config set -g model sonnet
claude config list
```

### Environment Setup

```bash
# Load environment
source .env

# Check API key
echo $ANTHROPIC_API_KEY

# Install Claude CLI
npm install -g @anthropic-ai/claude-code
```

### Project Integration

```bash
# Project analysis
claude --add-dir $(pwd) "analyze entire project"

# Code review
git diff | claude -p "review these changes"

# Documentation generation
claude -p "generate docs" < src/main.ts > docs/main.md
```

---

## Support and Resources

- **Official Documentation**: https://docs.anthropic.com/claude/reference/claude-cli
- **API Documentation**: https://docs.anthropic.com/claude/reference/getting-started-with-the-api
- **Community Support**: https://anthropic.com/support
- **GitHub Issues**: https://github.com/anthropics/claude-code

For project-specific issues, check:
- `./docs/troubleshooting/` directory
- Project README.md
- Local configuration files

---

*Last updated: September 27, 2025*
*Project: Cartrita AI Development Tools*
*Author: Robbie (with Claude assistance)*