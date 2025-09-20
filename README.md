# Cartrita AI Agents Monorepo 🤖

## Comprehensive AI Agents Orchestration System

**Latest Stack (Node.js 22+ | TypeScript | Biome | 2025 APIs)**

This monorepo contains a complete AI agents orchestration system built with:

- **Node.js 22+** with ES modules
- **Biome** for super-fast linting/formatting (15x faster than ESLint)
- **OpenAI Agents SDK** for multi-agent workflows
- **TypeScript** with strict configuration
- **PostgreSQL 17 + pgvector** unified container
- **Fastify** backend with **React/Vite** frontend

### 🏗️ Project Structure

```
cartrita-ai-agents-monorepo/
├── apps/
│   ├── backend/          # Fastify API server with OpenAI Agents
│   └── frontend/         # React/Vite dashboard
├── packages/
│   ├── shared/           # Common types, utilities
│   ├── ai-agents/        # Agent implementations
│   └── database/         # Database schemas & migrations
├── docs/
│   └── ENGINEERING_PLAYBOOK.md  # Complete A-Z cookbook
├── docker-compose.yml    # Unified PostgreSQL+pgvector setup
├── biome.json           # Modern linting (not ESLint)
└── package.json         # Node.js 22+ monorepo config
```

### 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start database
pnpm run docker:up

# Run migrations
pnpm run db:migrate

# Start development
pnpm run dev
```

### 📚 Documentation

- **[Engineering Playbook](docs/ENGINEERING_PLAYBOOK.md)** - Complete A-Z cookbook with all integrations
- **API Documentation** - Auto-generated Swagger/OpenAPI docs
- **Agent Examples** - Multi-agent workflow examples

### 🔧 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 22+ | Modern JS runtime with latest features |
| Language | TypeScript | 5.6+ | Type safety and developer experience |
| Linting | Biome | 1.9+ | Super-fast linting (15x faster than ESLint) |
| Backend | Fastify | 5+ | High-performance HTTP server |
| Frontend | React + Vite | Latest | Modern frontend with fast builds |
| Database | PostgreSQL + pgvector | 17 + 0.8+ | Vector database for embeddings |
| AI Agents | OpenAI Agents SDK | Latest | Official multi-agent framework |
| AI Models | OpenAI, Anthropic, HF | 2025 APIs | Latest AI model integrations |

### 🤖 Supported AI Services

- **OpenAI**: GPT-4, embeddings, assistants, agents
- **Anthropic**: Claude 3.7, tool helpers, streaming  
- **HuggingFace**: Transformers.js, models, datasets
- **Deepgram**: Speech-to-text, text-to-speech, voice agents
- **GitHub**: Octokit SDK for code integration
- **Web Search**: Tavily, SerpAPI for real-time data

### 🐳 Docker Support

Unified container setup with:
- PostgreSQL 17 + pgvector extension
- Redis for caching
- Backend and frontend services
- Health checks and auto-restart

### 📖 Next Steps

1. Read the [Engineering Playbook](docs/ENGINEERING_PLAYBOOK.md) for comprehensive setup
2. Explore agent examples in `packages/ai-agents/`
3. Check API documentation at `http://localhost:3000/docs`
4. Join our development workflow with Biome + TypeScript

---

*Built with 💚 using the latest 2025 AI and Node.js technologies*