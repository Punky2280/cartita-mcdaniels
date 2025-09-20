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

### 9. Web Search MCP Servers (Tavily, SerpAPI)
- **Location:** `packages/ai-agents/`
- **Stack:** Tavily API, SerpAPI, Node.js 22+, TypeScript
- **Purpose:** Real-time web search, data enrichment for agents
- **Setup:**
  ```bash
  cd packages/ai-agents
  pnpm install
  # API keys required: TAVILY_API_KEY, SERPAPI_API_KEY
  ```
- **Configuration:**
  - `.env` file: `TAVILY_API_KEY=tvly-...`, `SERPAPI_API_KEY=...`
- **Docs:** [Tavily API Docs](https://docs.tavily.com/), [SerpAPI Docs](https://serpapi.com/)

---

## Environment Variables Reference

```bash
# Example .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-api03-...
DEEPGRAM_API_KEY=...
GITHUB_TOKEN=ghp_...
HUGGINGFACE_TOKEN=hf_...
TAVILY_API_KEY=tvly-...
SERPAPI_API_KEY=...
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=cartrita_ai_agents
REDIS_URL=redis://localhost:6379
```

---

## Usage Notes
- All MCP servers are orchestrated via Node.js/TypeScript except Python-based ones (see separate Python docs)
- Ensure all required API keys are set in `.env` before starting services
- Use `pnpm run dev` for development, `pnpm run build && pnpm run start` for production
- Docker Compose manages database and Redis containers
- See [Engineering Playbook](ENGINEERING_PLAYBOOK.md) for full integration and troubleshooting

---

*For Python MCP server setup, refer to the Python-specific documentation.*
