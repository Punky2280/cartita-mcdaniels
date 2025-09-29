# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build for production (includes type checking)
- `pnpm test` - Run tests with Vitest
- `pnpm run type-check` - TypeScript type checking only
- `pnpm run check` - Run Biome linting and formatting
- `pnpm run format` - Format code with Biome

### Database Operations
- `pnpm run db:migrate` - Run database migrations
- `pnpm run db:generate` - Generate new migration files
- `pnpm run db:studio` - Open Drizzle Studio for database management
- `pnpm run docker:up` - Start PostgreSQL database with Docker

### AI CLI Tools
- `pnpm run ai:cli` - Access Cartrita AI CLI
- `pnpm run ai:analyze` - Code analysis
- `pnpm run ai:generate:schema` - Generate database schemas
- `pnpm run ai:generate:route` - Generate API routes
- `pnpm run ai:generate:tests` - Generate test files

### Codebase Inspection Tools
- `pnpm tsx scripts/test-codebase-agents.ts` - Test codebase inspection agents
- `pnpm tsx scripts/demo-context7-agents.ts` - Demo Context7 agent capabilities

### MCP Health Checks
- `pnpm run mcp:health` - Check MCP server connectivity
- `pnpm run mcp:test` - Run MCP integration tests

## Architecture Overview

### Multi-Agent System
This is a sophisticated AI agents orchestration platform built around a **multi-agent architecture pattern**:

- **BaseAgent**: Abstract base class (`src/agents/base/BaseAgent.ts`) - all agents implement this interface
- **Orchestrator**: Central coordinator (`src/agents/core/Orchestrator.ts`) that manages agent execution and workflows
- **ModelRouter**: Intelligent model selection (`src/core/ModelRouter.ts`) for optimal AI provider routing
- **Agent Registry**: Agents are registered with the orchestrator and can be invoked by name

#### Available Agents

**Context7-Enhanced Agents:**
- **frontend-agent**: React, TypeScript, Tailwind CSS, Aurora UI, Accessibility
- **api-agent**: Fastify, REST APIs, Database, Security, OpenAPI docs
- **docs-agent**: Technical writing, API docs, User guides, Tutorials

**Codebase Inspection Agents:**
- **codebase-inspector**: Security analysis, Performance auditing, Architecture review, Dependency scanning
- **mcp-integration**: GitHub analysis, Memory operations, Web search, Filesystem monitoring, Context7 enhancement

### Core Components

**Fastify Web Framework**: High-performance HTTP server with:
- OpenAPI/Swagger documentation at `/docs`
- Plugin-based architecture for modular functionality
- Database, CORS, and auth plugins in `src/plugins/`

**Database Layer**: PostgreSQL with Drizzle ORM:
- Database connection and migration utilities in `src/database/`
- Schema definitions in `src/schemas/`
- Uses pgvector extension for vector similarity search

**AI Integration**: Multi-provider AI support:
- OpenAI and Anthropic SDK integration
- ModelRouter automatically selects optimal models based on task type
- Task types: `research`, `code-analysis`, `code-generation`, `planning`, `optimization`, `documentation`

### Workflow System

The orchestrator supports complex multi-step workflows with built-in templates:
- `code-review`: Multi-stage code analysis and security review
- `research-implement`: Research topic and generate implementation
- `full-feature-dev`: End-to-end feature development
- `bug-hunt-fix`: Intelligent bug detection and automated fixing
- `intelligent-refactor`: AI-powered refactoring with safety validation
- `api-modernization`: API optimization and best practices
- `deployment-pipeline`: Complete CI/CD setup
- `data-pipeline`: Robust data processing pipelines

### Project Structure

```
src/
├── agents/           # AI agent implementations
│   ├── base/        # BaseAgent interface
│   ├── core/        # Orchestrator and core agents
│   └── advanced/    # Specialized agent implementations
├── core/            # Core services (ModelRouter, AIDevTools, etc.)
├── cli/             # Command-line interface tools
├── database/        # Database connection and migrations
├── plugins/         # Fastify plugins (auth, cors, database)
├── routes/          # API route handlers
└── schemas/         # TypeBox schema definitions
```

## Key Implementation Notes

### Agent Development
- Extend `BaseAgent` class and implement `execute()` method
- Register agents with orchestrator using `registerAgent()`
- Use standardized `AgentInput`/`AgentResult` interfaces

### Using Codebase Inspection Agents

**CodebaseInspectorAgent** - Comprehensive codebase analysis:
```typescript
import { CodebaseInspectorAgent } from './src/agents/advanced/CodebaseInspectorAgent.js';

const inspector = new CodebaseInspectorAgent();

// Security inspection
const security = await inspector.inspectSecurity('./src');

// Performance analysis
const performance = await inspector.inspectPerformance('./src');

// Architecture review
const architecture = await inspector.inspectArchitecture('./src');

// Comprehensive analysis
const full = await inspector.comprehensiveInspection('./src');
```

**McpIntegrationAgent** - MCP server integration with Context7:
```typescript
import { McpIntegrationAgent } from './src/agents/advanced/McpIntegrationAgent.js';

const mcpAgent = new McpIntegrationAgent();

// Repository analysis using GitHub MCP
const repo = await mcpAgent.analyzeRepository();

// Search codebase using multiple MCP servers
const search = await mcpAgent.searchCodebase('authentication logic');

// Research best practices with Brave Search + Context7
const research = await mcpAgent.researchBestPractices('TypeScript');

// Monitor activity across all MCP servers
const activity = await mcpAgent.monitorCodebaseActivity();
```

**Orchestrator Integration** - Smart agent routing:
```typescript
import { Orchestrator } from './src/agents/core/Orchestrator.js';

const orchestrator = new Orchestrator();

// Smart execution - automatically chooses best agent
const result = await orchestrator.smartExecute(
  'Find security vulnerabilities in the authentication system'
);

// Direct delegation to specific agent
const inspection = await orchestrator.delegate('codebase-inspector', {
  inspectionType: 'security',
  depth: 'deep',
  useMcpServers: true,
  useContext7: true
});
```

### Model Router Usage
```typescript
const response = await modelRouter.execute(
  'code-analysis',  // Task type
  prompt,           // Input prompt
  { systemPrompt, context }
);
```

### Database Schema
- Use Drizzle ORM with TypeScript-first approach
- Schemas defined in `src/schemas/` using TypeBox
- Run migrations with `pnpm run db:migrate`

### Code Quality
- **Biome** (not ESLint) for ultra-fast linting and formatting
- TypeScript with strict type checking required for builds
- Comprehensive test coverage with Vitest

### Environment Setup
- Copy `.env.example` to `.env` and configure API keys
- PostgreSQL database required (use Docker: `pnpm run docker:up`)
- Minimum Node.js 22+ with pnpm package manager

## Development Workflow

1. Start database: `pnpm run docker:up`
2. Run migrations: `pnpm run db:migrate`
3. Start dev server: `pnpm run dev`
4. Before commits: `pnpm run check` and `pnpm test`
5. Build verification: `pnpm run build`