# Claude Terminal Scripts

This directory contains helper scripts for using Claude AI directly from the terminal, independent of VS Code extensions.

## Quick Start

```bash
# Launch Claude with project context
pnpm claude

# Or use the script directly
./scripts/claude-launch.sh
```

## Available Scripts

### 🚀 `claude-launch.sh`

Main launcher script that sets up the environment and starts Claude with project-specific settings.

```bash
./scripts/claude-launch.sh                    # Interactive mode
./scripts/claude-launch.sh -p "Quick query"  # Single query mode
pnpm claude                                   # via pnpm alias
```

### 🔍 `claude-analyze.sh`

Analyzes code files and provides improvement suggestions.

```bash
./scripts/claude-analyze.sh src/main.ts
./scripts/claude-analyze.sh src/ "Focus on TypeScript best practices"
pnpm claude:analyze package.json
```

### 📚 `claude-docs.sh`

Generates comprehensive documentation for code files.

```bash
./scripts/claude-docs.sh src/core/AIDevTools.ts
./scripts/claude-docs.sh src/main.ts docs/main-api.md
pnpm claude:docs src/agents/base/BaseAgent.ts
```

### 🔎 `claude-review.sh`

Performs thorough code reviews with multiple modes.

```bash
./scripts/claude-review.sh                    # Review entire project
./scripts/claude-review.sh --diff            # Review unstaged changes
./scripts/claude-review.sh --staged          # Review staged changes
./scripts/claude-review.sh --files src/*.ts  # Review specific files

# pnpm aliases
pnpm claude:review
pnpm claude:diff
pnpm claude:staged
```

## Configuration

- **Environment**: API keys loaded from `.env` file
- **Project Settings**: Configuration in `.claude-settings.json`
- **Security**: API keys managed via environment variables only

## Prerequisites

1. **Install Claude CLI**: `npm install -g @anthropic-ai/claude-code`
2. **Set API Key**: Add `ANTHROPIC_API_KEY` to `.env` file
3. **Make Executable**: Scripts are automatically made executable

## Documentation

For complete setup instructions and advanced usage, see:

- [`instructions/claude-terminal-setup.md`](../instructions/claude-terminal-setup.md)

## Security Notes

- All scripts check for API key presence before execution
- Scripts use environment variables only - no hardcoded keys
- File access is controlled through Claude's permission system
- Use `--dangerously-skip-permissions` only in trusted environments

---

## Project Info

Created for Cartrita AI Development Tools
