# MCP Server Setup Documentation (Non-Python)

## Overview

This document provides setup, configuration, and usage instructions for all Model Context Protocol (MCP) servers integrated in the Cartrita AI Agents Monorepo, **excluding Python-based servers**. MCP servers enable advanced orchestration, agent communication, and API integrations for AI workflows.

---

## Supported MCP Servers

### 1. Node.js MCP Server
- **Location:** `apps/backend/`
- **Stack:** Node.js 22+, Fastify, TypeScript
- **Purpose:** Orchestrates agent workflows, exposes REST and WebSocket APIs, manages agent lifecycle
- **Setup:**
  ```bash
  cd apps/backend
  pnpm install
  pnpm run dev
  # Production
  pnpm run build && pnpm run start
  ```
- **Endpoints:** `/api/agents`, `/api/conversations`, `/api/search`, `/api/health`
- **Docs:** Auto-generated OpenAPI at `/docs`

### 2. PostgreSQL MCP Server (pgvector)
- **Location:** `docker-compose.yml` (service: `database`)
- **Stack:** PostgreSQL 17 + pgvector extension
- **Purpose:** Stores agent data, vector embeddings, supports similarity search
- **Setup:**
  ```bash
  pnpm run docker:up
  # Or manually:
  docker compose up database
  ```
- **Configuration:**
  - Environment variables: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - Vector extension auto-enabled via `init-db.sql`
- **Docs:** [pgvector Documentation](https://github.com/pgvector/pgvector)

### 3. Redis MCP Server
- **Location:** `docker-compose.yml` (service: `redis`)
- **Stack:** Redis 7.4+ (Alpine)
- **Purpose:** Caching, session management, rate limiting
- **Setup:**
  ```bash
  pnpm run docker:up
  # Or manually:
  docker compose up redis
  ```
- **Configuration:**
  - Environment variable: `REDIS_URL`
- **Docs:** [Redis Documentation](https://redis.io/docs/)

### 4. OpenAI Agents MCP Server
- **Location:** `packages/ai-agents/`
- **Stack:** @openai/agents SDK, Node.js 22+, TypeScript
- **Purpose:** Multi-agent orchestration, tool use, agent handoff
- **Setup:**
  ```bash
  cd packages/ai-agents
  pnpm install
  # API key required: OPENAI_API_KEY
  ```
- **Configuration:**
  - `.env` file: `OPENAI_API_KEY=sk-...`
- **Docs:** [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)

### 5. Anthropic Claude MCP Server
- **Location:** `packages/ai-agents/`
- **Stack:** @anthropic-ai/sdk, Node.js 22+, TypeScript
- **Purpose:** Claude agent orchestration, streaming, tool helpers
- **Setup:**
  ```bash
  cd packages/ai-agents
  pnpm install
  # API key required: ANTHROPIC_API_KEY
  ```
- **Configuration:**
  - `.env` file: `ANTHROPIC_API_KEY=sk-ant-api03-...`
- **Docs:** [Claude API Docs](https://docs.claude.com/)

### 6. HuggingFace Transformers.js MCP Server
- **Location:** `packages/ai-agents/`
- **Stack:** @huggingface/transformers, Node.js 22+, TypeScript
- **Purpose:** Browser/Node.js ML models, embeddings, sentiment analysis
- **Setup:**
  ```bash
  cd packages/ai-agents
  pnpm install
  # API key optional: HUGGINGFACE_TOKEN
  ```
- **Configuration:**
  - `.env` file: `HUGGINGFACE_TOKEN=hf_...`
- **Docs:** [Transformers.js Docs](https://huggingface.co/docs/hub/en/transformers-js)

### 7. Deepgram MCP Server
- **Location:** `packages/ai-agents/`
- **Stack:** @deepgram/sdk, Node.js 22+, TypeScript
- **Purpose:** Speech-to-text, text-to-speech, voice agent orchestration
- **Setup:**
  ```bash
  cd packages/ai-agents
  pnpm install
  # API key required: DEEPGRAM_API_KEY
  ```
- **Configuration:**
  - `.env` file: `DEEPGRAM_API_KEY=...`
- **Docs:** [Deepgram SDK Docs](https://developers.deepgram.com/docs/js-sdk)

### 8. GitHub Octokit MCP Server
- **Location:** `packages/ai-agents/`
- **Stack:** @octokit/rest, @octokit/graphql.js, Node.js 22+, TypeScript
- **Purpose:** GitHub API integration, repo analysis, code search
- **Setup:**
  ```bash
  cd packages/ai-agents
  pnpm install
  # API key required: GITHUB_TOKEN
  ```
- **Configuration:**
  - `.env` file: `GITHUB_TOKEN=ghp_...`
- **Docs:** [Octokit Docs](https://octokit.github.io/rest.js/)

### 9. Web Search MCP Servers (Tavily, SerpAPI, Brave)
- **Location:** `packages/ai-agents/`
- **Stack:** Tavily API, SerpAPI, Brave Search API, Node.js 22+, TypeScript
- **Purpose:** Real-time web search, data enrichment for agents
- **Setup:**
  ```bash
  cd packages/ai-agents
  pnpm install
  # API keys required: TAVILY_API_KEY, SERPAPI_API_KEY, BRAVE_API_KEY
  ```
- **Configuration:**
  - `.env` file: `TAVILY_API_KEY=tvly-...`, `SERPAPI_API_KEY=...`, `BRAVE_API_KEY=...`
- **Docs:** [Tavily API Docs](https://docs.tavily.com/), [SerpAPI Docs](https://serpapi.com/), [Brave Search API](https://brave.com/search/api/)

### 10. Browser Automation MCP Servers (Playwright, Puppeteer)
- **Location:** `mcp_config.json`
- **Stack:** Playwright, Puppeteer, Node.js 22+, TypeScript
- **Purpose:** Web scraping, browser automation, E2E testing for agents
- **Setup:**
  ```bash
  # Playwright
  npx -y @modelcontextprotocol/server-playwright
  # Puppeteer
  npx -y @modelcontextprotocol/server-puppeteer
  ```
- **Configuration:**
  - Automatically downloads browser binaries
- **Docs:** [Playwright Docs](https://playwright.dev/), [Puppeteer Docs](https://pptr.dev/)

### 11. Cloud Integration MCP Servers
- **Location:** `mcp_config.json`
- **Stack:** Docker API, Kubernetes API, Google Drive API
- **Purpose:** Container orchestration, file storage, cloud resource management
- **Setup:**
  ```bash
  # Docker MCP Server
  npx -y @modelcontextprotocol/server-docker
  # Kubernetes MCP Server
  npx -y @modelcontextprotocol/server-kubernetes
  # Google Drive MCP Server
  npx -y @modelcontextprotocol/server-gdrive
  ```
- **Configuration:**
  - Docker: `DOCKER_HOST=unix:///var/run/docker.sock`
  - Kubernetes: `KUBECONFIG=~/.kube/config`
  - Google Drive: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`
- **Docs:** [Docker API](https://docs.docker.com/engine/api/), [Kubernetes API](https://kubernetes.io/docs/reference/), [Google Drive API](https://developers.google.com/drive)

### 12. Productivity & Communication MCP Servers
- **Location:** `mcp_config.json`
- **Stack:** Slack API, Notion API, Todoist API
- **Purpose:** Team communication, knowledge management, task tracking
- **Setup:**
  ```bash
  # Slack MCP Server
  npx -y @modelcontextprotocol/server-slack
  # Notion MCP Server
  npx -y @modelcontextprotocol/server-notion
  # Todoist MCP Server
  npx -y @modelcontextprotocol/server-todoist
  ```
- **Configuration:**
  - Slack: `SLACK_BOT_TOKEN`, `SLACK_USER_TOKEN`
  - Notion: `NOTION_API_KEY`, `NOTION_DATABASE_ID`
  - Todoist: `TODOIST_API_TOKEN`
- **Docs:** [Slack API](https://api.slack.com/), [Notion API](https://developers.notion.com/), [Todoist API](https://developer.todoist.com/)

### 13. Utility MCP Servers
- **Location:** `mcp_config.json`
- **Stack:** SQLite, HTTP Fetch, Time utilities, Everything Search
- **Purpose:** Local storage, HTTP requests, time operations, file search
- **Setup:**
  ```bash
  # SQLite MCP Server
  npx -y @modelcontextprotocol/server-sqlite
  # Fetch MCP Server
  npx -y @modelcontextprotocol/server-fetch
  # Time MCP Server
  npx -y @modelcontextprotocol/server-time
  # Everything Search MCP Server (Windows)
  npx -y @modelcontextprotocol/server-everything
  ```
- **Configuration:**
  - SQLite: `SQLITE_DB_PATH=./data/local.db`
  - Fetch: `USER_AGENT=Cartrita AI Agent/1.0`
  - Everything: `EVERYTHING_API_URL=http://localhost:8080`
- **Docs:** [SQLite Docs](https://sqlite.org/), [Everything Search](https://www.voidtools.com/)

---

## Environment Variables Reference

```bash
# Core Database & Infrastructure
DATABASE_URL=postgresql://robbie:robbie123@localhost:5432/cartrita_db
REDIS_URL=redis://localhost:6379
SQLITE_DB_PATH=./data/local.db

# AI/ML Services
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-api03-your-anthropic-api-key-here
HUGGINGFACE_TOKEN=hf_your-huggingface-token-here
DEEPGRAM_API_KEY=your-deepgram-api-key-here
EVERART_API_KEY=your-everart-api-key-here

# Search APIs
TAVILY_API_KEY=tvly-your-tavily-api-key-here
SERPAPI_API_KEY=your-serpapi-api-key-here
BRAVE_API_KEY=your-brave-search-api-key-here

# Version Control
GITHUB_TOKEN=ghp_your-github-personal-access-token-here
GITLAB_TOKEN=glpat-your-gitlab-personal-access-token-here

# Cloud & Infrastructure
DOCKER_HOST=unix:///var/run/docker.sock
KUBECONFIG=~/.kube/config
GOOGLE_DRIVE_CLIENT_ID=your-google-drive-client-id-here
GOOGLE_DRIVE_CLIENT_SECRET=your-google-drive-client-secret-here
GOOGLE_DRIVE_REFRESH_TOKEN=your-google-drive-refresh-token-here

# Communication & Productivity
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token-here
SLACK_USER_TOKEN=xoxp-your-slack-user-token-here
NOTION_API_KEY=secret_your-notion-integration-key-here
NOTION_DATABASE_ID=your-notion-database-id-here
TODOIST_API_TOKEN=your-todoist-api-token-here

# Utilities
USER_AGENT=Cartrita AI Agent/1.0
EVERYTHING_API_URL=http://localhost:8080
```

---

## Usage Notes
- All MCP servers are orchestrated via Node.js/TypeScript except Python-based ones (see separate Python docs)
- Ensure all required API keys are set in `.env` before starting services
- Use `pnpm run dev` for development, `pnpm run build && pnpm run start` for production
- Docker Compose manages database and Redis containers
- See [Engineering Playbook](ENGINEERING_PLAYBOOK.md) for full integration and troubleshooting

---

---

## Related Documentation

- **[Main README](../../README.md)** - Quick start and project overview
- **[Agent Architecture](../architecture/agent-architecture.md)** - System design and multi-agent patterns
- **[Engineering Playbook](ENGINEERING_PLAYBOOK.md)** - Complete technical implementation guide
- **[Installation Guide](INSTALLATION_AND_INTEGRATION_GUIDE.md)** - Step-by-step setup instructions

---

*For Python MCP server setup, refer to the Python-specific documentation.*
