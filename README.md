# Cartrita AI Agents

> A sophisticated multi-agent AI system built with Node.js, TypeScript, and modern AI APIs

**Latest Stack (Node.js 22+ | TypeScript | Biome | 2025 APIs)**

This system implements a comprehensive AI agents orchestration platform built with:

- **Node.js 22+** with TypeScript and modern ES modules
- **Biome** for lightning-fast linting/formatting (15x faster than ESLint)
- **Multi-agent architecture** with specialized agents for different tasks
- **TypeScript** with strict type safety
- **PostgreSQL 17 + pgvector** for vector similarity search
- **Fastify** high-performance web framework

## 🚀 Quick Start

Get up and running in 5 minutes:

```bash
# 1. Clone and install
git clone https://github.com/Punky2280/cartrita-mcdaniels.git
cd cartrita-mcdaniels
pnpm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your API keys (see Configuration below)

# 3. Start database
pnpm run docker:up

# 4. Run migrations
pnpm run db:migrate

# 5. Start development server
pnpm run dev
```

## 📋 Prerequisites

- **Node.js 22+** (LTS recommended)
- **pnpm** (package manager)
- **Docker** (for PostgreSQL database)
- **API Keys** (OpenAI, optional: Anthropic, Tavily, etc.)

## 🏗️ Architecture

The system uses a **multi-agent orchestration pattern** with specialized agents:

- **Research Agent**: Web search and information gathering
- **Code Agent**: Code generation and analysis  
- **Knowledge Agent**: Document retrieval and RAG
- **Task Agent**: Project planning and management

Each agent extends a common `BaseAgent` interface and communicates through a central orchestrator.

## ⚙️ Configuration

Required environment variables in `.env`:

```bash
# Database (PostgreSQL with pgvector)
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/cartrita_ai_agents"

# Core AI API (required)
OPENAI_API_KEY=sk-proj-...

# Optional AI APIs
ANTHROPIC_API_KEY=sk-ant-api03-...

# External Services (optional)
TAVILY_API_KEY=tvly-...           # Web search
DEEPGRAM_API_KEY=...              # Speech services
GITHUB_TOKEN=ghp_...              # GitHub integration

# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

## �️ Development

```bash
# Start development server with hot reload
pnpm run dev

# Run tests
pnpm test

# Build for production
pnpm run build

# Check code quality
pnpm run check

# Database operations
pnpm run db:migrate    # Run migrations
pnpm run db:studio     # Open Drizzle Studio
```

## 🤖 Claude Terminal Integration

This project includes comprehensive Claude AI terminal integration, independent of VS Code extensions:

```bash
# Quick Claude access
pnpm claude                                    # Interactive Claude session
pnpm claude -p "Analyze this TypeScript code" # Single query mode

# Code analysis and review
pnpm claude:analyze src/main.ts              # Analyze specific file
pnpm claude:review --diff                    # Review git changes
pnpm claude:docs src/agents/BaseAgent.ts    # Generate documentation

# Advanced usage
./scripts/claude-launch.sh --model opus "Complex architectural question"
./scripts/claude-review.sh --staged         # Review staged changes
```

**Features:**
- **Terminal-Only Operation**: No VS Code extension dependencies
- **Project Context**: Automatic project understanding and TypeScript awareness
- **Secure API Key Management**: Environment-based configuration
- **Multiple Models**: Choose between Claude Sonnet, Opus, and Haiku
- **Scriptable Interface**: Perfect for automation and CI/CD integration

**Quick Setup:**
1. Install Claude CLI: `npm install -g @anthropic-ai/claude-code`
2. Add your API key to `.env`: `ANTHROPIC_API_KEY=sk-ant-api03-...`
3. Start using: `pnpm claude`

For complete setup instructions, see: [`instructions/claude-terminal-setup.md`](instructions/claude-terminal-setup.md)

## 📚 Documentation

- **[Architecture Overview](docs/architecture/agent-architecture.md)** - System design and agent patterns
- **[Engineering Playbook](docs/operations/ENGINEERING_PLAYBOOK.md)** - Complete technical guide
- **[MCP Server Setup](docs/operations/MCP_SERVER_SETUP.md)** - External service integrations
- **[Installation Guide](docs/operations/INSTALLATION_AND_INTEGRATION_GUIDE.md)** - Detailed setup instructions

## 🚢 Deployment

```bash
# Using Docker Compose
docker compose up -d

# Manual production build
pnpm run build
NODE_ENV=production pnpm start
```

## 🧪 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Node.js 22+ | JavaScript runtime |
| **Language** | TypeScript | Type safety |
| **Framework** | Fastify | High-performance web server |
| **Database** | PostgreSQL + pgvector | Data storage with vector search |
| **AI Integration** | OpenAI, Anthropic | Agent intelligence |
| **Code Quality** | Biome | Linting and formatting |

## 🔧 Troubleshooting

### Common Issues

#### "Failed to connect to database"

```bash
# Ensure PostgreSQL is running
pnpm run docker:up
```

#### "Missing API key errors"

```bash
# Check your .env file has required keys
cat .env | grep OPENAI_API_KEY
```

#### "Port 3000 already in use"

```bash
# Change port in .env
echo "PORT=3001" >> .env
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs/](docs/) folder
- **Issues**: Open a [GitHub issue](https://github.com/Punky2280/cartrita-mcdaniels/issues)
- **Discussions**: Join our [GitHub discussions](https://github.com/Punky2280/cartrita-mcdaniels/discussions)

---

*Built with ❤️ using TypeScript and modern AI APIs*

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