# CLI Commands Reference

Complete reference for all CLI commands available in the Cartrita McDaniels AI Development System.

## Installation and Setup

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys and database configuration

# Run database migrations
pnpm run migrate

# Build the system
pnpm run build

# Start the development server
pnpm run dev
```

## Core CLI Commands

The main CLI entry point is through the `cartrita-ai` command:

```bash
npx cartrita-ai <command> [options]
```

### Available Commands

#### 1. Workflow Commands

**List all available workflows**:
```bash
npx cartrita-ai workflow --list
npx cartrita-ai workflow -l
```

**Execute a specific workflow**:
```bash
npx cartrita-ai workflow --workflow=<name>
npx cartrita-ai workflow -w <name>

# Examples
npx cartrita-ai workflow --workflow=code-review
npx cartrita-ai workflow -w research-implement
```

**Execute workflow with context**:
```bash
npx cartrita-ai workflow --workflow=<name> --context="specific requirements"

# Example
npx cartrita-ai workflow --workflow=bug-hunt-fix --context="Focus on authentication module"
```

**Execute workflow with priority**:
```bash
npx cartrita-ai workflow --workflow=<name> --priority=<level>

# Priority levels: low, medium, high, critical
npx cartrita-ai workflow --workflow=code-review --priority=high
```

#### 2. Generation Commands

**Generate code components**:
```bash
npx cartrita-ai generate --type=<type> --name=<name> [options]

# Types: component, service, model, route, test, schema, migration
npx cartrita-ai generate --type=component --name=UserDashboard
npx cartrita-ai generate --type=service --name=AuthService --features=jwt,validation
npx cartrita-ai generate --type=route --name=users --methods=GET,POST,PUT,DELETE
```

**Generate with specific technologies**:
```bash
npx cartrita-ai generate --type=feature --name="Real-time Chat" --tech=fastify,socket.io,redis
```

**Generate with research**:
```bash
npx cartrita-ai generate --type=feature --name="Payment System" --research=true
```

#### 3. Analysis Commands

**Analyze codebase**:
```bash
npx cartrita-ai analyze --type=<type> [options]

# Analysis types: full, security, performance, quality, dependencies
npx cartrita-ai analyze --type=full
npx cartrita-ai analyze --type=security --severity=high
npx cartrita-ai analyze --type=performance --target=src/api/
```

**Analyze specific files or directories**:
```bash
npx cartrita-ai analyze --type=quality --path=src/services/
npx cartrita-ai analyze --type=security --file=src/auth/AuthService.ts
```

**Analyze with auto-fix**:
```bash
npx cartrita-ai analyze --type=bugs --fix=auto
npx cartrita-ai analyze --type=quality --fix=suggest
```

#### 4. Refactoring Commands

**Refactor code**:
```bash
npx cartrita-ai refactor --target=<path> --strategy=<strategy>

# Strategies: incremental, comprehensive, safe, aggressive
npx cartrita-ai refactor --target=src/legacy/ --strategy=incremental
npx cartrita-ai refactor --target=UserService.ts --strategy=comprehensive
```

**Refactor with specific goals**:
```bash
npx cartrita-ai refactor --target=<path> --goals=<goals>

# Goals: performance, maintainability, testability, security
npx cartrita-ai refactor --target=src/api/ --goals=performance,security
```

#### 5. API Commands

**Modernize API**:
```bash
npx cartrita-ai api --modernize [options]

npx cartrita-ai api --modernize --version=v2 --docs=openapi
npx cartrita-ai api --modernize --endpoints=users,auth --features=pagination,filtering
```

**Generate API documentation**:
```bash
npx cartrita-ai api --docs --format=<format>

# Formats: openapi, markdown, json, yaml
npx cartrita-ai api --docs --format=openapi --output=docs/api.yaml
```

#### 6. Deployment Commands

**Setup deployment pipeline**:
```bash
npx cartrita-ai deploy --setup --platform=<platform>

# Platforms: aws, gcp, azure, docker, kubernetes
npx cartrita-ai deploy --setup --platform=aws --services=ecs,rds,elasticache
npx cartrita-ai deploy --setup --platform=docker --features=multi-stage,optimization
```

**Create deployment configuration**:
```bash
npx cartrita-ai deploy --config --environment=<env>

# Environments: development, staging, production
npx cartrita-ai deploy --config --environment=production --monitoring=true
```

#### 7. Data Pipeline Commands

**Setup data pipeline**:
```bash
npx cartrita-ai data --pipeline --source=<source> --target=<target>

npx cartrita-ai data --pipeline --source=postgresql --target=warehouse
npx cartrita-ai data --pipeline --source=api,csv --target=analytics --transform=clean,normalize
```

#### 8. Health and Status Commands

**Check system health**:
```bash
npx cartrita-ai health
npx cartrita-ai health --detailed
npx cartrita-ai health --component=<component>

# Components: models, database, monitoring, orchestrator
npx cartrita-ai health --component=models
```

**Check workflow status**:
```bash
npx cartrita-ai status
npx cartrita-ai status --workflow=<workflow-id>
npx cartrita-ai status --active
```

#### 9. Configuration Commands

**View configuration**:
```bash
npx cartrita-ai config --show
npx cartrita-ai config --show --section=<section>

# Sections: models, workflows, monitoring, api
npx cartrita-ai config --show --section=models
```

**Update configuration**:
```bash
npx cartrita-ai config --set <key>=<value>

npx cartrita-ai config --set models.fallback=true
npx cartrita-ai config --set monitoring.enabled=true
```

#### 10. Logging and Debugging

**View logs**:
```bash
npx cartrita-ai logs
npx cartrita-ai logs --level=<level>
npx cartrita-ai logs --component=<component>
npx cartrita-ai logs --follow

# Levels: debug, info, warn, error
# Components: workflow, model, api, system
npx cartrita-ai logs --level=error --component=workflow
```

**Debug mode**:
```bash
npx cartrita-ai <command> --debug
npx cartrita-ai workflow --workflow=code-review --debug
```

## Advanced Usage

### Chaining Commands

```bash
# Generate and analyze in sequence
npx cartrita-ai generate --type=service --name=PaymentService && \
npx cartrita-ai analyze --type=security --file=src/services/PaymentService.ts

# Refactor and test
npx cartrita-ai refactor --target=src/legacy/ --strategy=incremental && \
npx cartrita-ai analyze --type=quality --path=src/legacy/
```

### Batch Operations

```bash
# Process multiple files
npx cartrita-ai analyze --type=quality --batch --input=file-list.txt

# Generate multiple components
npx cartrita-ai generate --batch --config=components.json
```

### Custom Scripts

Create custom scripts in `scripts/` directory:

```bash
# scripts/full-review.sh
#!/bin/bash
npx cartrita-ai analyze --type=full
npx cartrita-ai workflow --workflow=code-review --priority=high
npx cartrita-ai generate --type=test --coverage=90
```

### Environment-Specific Commands

```bash
# Development environment
NODE_ENV=development npx cartrita-ai workflow --workflow=code-review

# Production environment (read-only analysis)
NODE_ENV=production npx cartrita-ai analyze --type=security --readonly
```

## Command Options Reference

### Global Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--help` | `-h` | Show help information | `npx cartrita-ai --help` |
| `--version` | `-v` | Show version information | `npx cartrita-ai --version` |
| `--config` | `-c` | Specify config file | `npx cartrita-ai -c custom.json` |
| `--debug` | `-d` | Enable debug mode | `npx cartrita-ai --debug` |
| `--verbose` | | Enable verbose output | `npx cartrita-ai --verbose` |
| `--quiet` | `-q` | Suppress output | `npx cartrita-ai --quiet` |
| `--output` | `-o` | Specify output file | `npx cartrita-ai -o results.json` |

### Workflow Options

| Option | Description | Values | Example |
|--------|-------------|--------|---------|
| `--workflow` | Specify workflow name | See workflows.md | `--workflow=code-review` |
| `--context` | Provide context | Any string | `--context="Review auth module"` |
| `--priority` | Set execution priority | low, medium, high, critical | `--priority=high` |
| `--timeout` | Set timeout in seconds | Number | `--timeout=300` |
| `--retry` | Set retry count | Number | `--retry=3` |

### Generation Options

| Option | Description | Values | Example |
|--------|-------------|--------|---------|
| `--type` | Component type | component, service, route, etc. | `--type=service` |
| `--name` | Component name | String | `--name=UserService` |
| `--tech` | Technologies | Comma-separated | `--tech=fastify,jwt,postgresql` |
| `--features` | Features to include | Comma-separated | `--features=validation,logging` |
| `--research` | Enable research mode | true/false | `--research=true` |

### Analysis Options

| Option | Description | Values | Example |
|--------|-------------|--------|---------|
| `--type` | Analysis type | full, security, performance, quality | `--type=security` |
| `--path` | Target path | File or directory path | `--path=src/api/` |
| `--severity` | Minimum severity | low, medium, high, critical | `--severity=high` |
| `--fix` | Auto-fix mode | auto, suggest, none | `--fix=suggest` |
| `--format` | Output format | json, yaml, markdown, text | `--format=json` |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Configuration error |
| 4 | API connection error |
| 5 | Workflow execution error |
| 6 | File system error |

## Examples

### Common Workflows

**Daily code review**:
```bash
#!/bin/bash
# daily-review.sh
echo "Starting daily code review..."
npx cartrita-ai analyze --type=full --format=json --output=daily-report.json
npx cartrita-ai workflow --workflow=code-review --priority=medium
echo "Review complete. Check daily-report.json for details."
```

**Feature development**:
```bash
#!/bin/bash
# new-feature.sh
FEATURE_NAME=$1
echo "Developing feature: $FEATURE_NAME"
npx cartrita-ai workflow --workflow=research-implement --context="Feature: $FEATURE_NAME"
npx cartrita-ai generate --type=test --name="${FEATURE_NAME}Test" --coverage=90
npx cartrita-ai analyze --type=quality --path="src/features/$FEATURE_NAME"
```

**Deployment preparation**:
```bash
#!/bin/bash
# deploy-prep.sh
echo "Preparing for deployment..."
npx cartrita-ai analyze --type=security --severity=medium --fix=suggest
npx cartrita-ai workflow --workflow=deployment-pipeline --priority=high
npx cartrita-ai deploy --config --environment=production
echo "Deployment preparation complete."
```

---

*Last updated: September 27, 2025*