# Developer Quick Start Guide

## Overview

Get up and running with the Cartrita AI Agents platform in under 10 minutes. This guide covers environment setup, first agent creation, and basic API usage.

## Prerequisites

- **Node.js 22+** (LTS recommended)
- **pnpm** package manager
- **Docker** and Docker Compose
- **Git** for version control
- API keys for:
  - OpenAI (required)
  - Anthropic Claude (recommended)
  - Other services (optional)

## 1. Environment Setup

### Install Dependencies

```bash
# Install Node.js 22+ via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# Install pnpm
npm install -g pnpm

# Verify installation
node --version  # Should be v22.x.x
pnpm --version  # Should be 8.x.x or higher
```

### Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/your-org/cartrita-mcdaniels-suarez.git
cd cartrita-mcdaniels-suarez

# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env
```

### Configure Environment Variables

Edit the `.env` file with your API keys:

```bash
# Core Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database (PostgreSQL with pgvector)
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/cartrita_ai_agents"

# Required: OpenAI API Key
OPENAI_API_KEY=sk-proj-your-openai-key-here

# Recommended: Claude API Key
ANTHROPIC_API_KEY=sk-ant-api03-your-claude-key-here

# Optional: Additional Services
DEEPGRAM_API_KEY=your-deepgram-key
GITHUB_TOKEN=ghp_your-github-token
TAVILY_API_KEY=tvly-your-tavily-key

# Security
JWT_SECRET=your-super-secure-jwt-secret-256-bits
ENCRYPTION_KEY=your-32-character-encryption-key
```

### Start Database

```bash
# Start PostgreSQL with pgvector extension
pnpm run docker:up

# Wait for database to be ready (check logs)
docker-compose logs -f database

# Run database migrations
pnpm run db:migrate
```

### Launch Development Server

```bash
# Start the development server
pnpm run dev

# Server will start on http://localhost:3000
# API documentation: http://localhost:3000/docs
```

## 2. Verify Installation

### Health Check

```bash
# Check system health
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "checks": {
    "database": true,
    "openai": true
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

### Access API Documentation

Open your browser to [http://localhost:3000/docs](http://localhost:3000/docs) to explore the interactive API documentation.

## 3. Create Your First Agent

### Option A: Using the API

```bash
# First, you need an authentication token
# In development, you can use the bypass token or implement auth

# Create a research agent
curl -X POST http://localhost:3000/api/v1/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My Research Agent",
    "description": "Agent specialized in web research and data analysis",
    "type": "research",
    "capabilities": ["web_search", "data_analysis", "citation"],
    "mcpServers": ["tavily"],
    "config": {
      "model": "gpt-4o",
      "temperature": 0.3,
      "maxTokens": 2000
    }
  }'
```

### Option B: Using the CLI

```bash
# Use the built-in AI CLI
pnpm run ai:cli

# Follow interactive prompts to create an agent
# Or use direct commands:
pnpm run ai:generate:agent --name "Research Agent" --type research
```

### Option C: Using the Orchestrator

```typescript
// Create agents programmatically
import { Orchestrator } from './src/agents/core/Orchestrator.js';

const orchestrator = new Orchestrator();

// The orchestrator comes with pre-registered agents:
// - frontend-agent: React/TypeScript development
// - api-agent: Fastify API development
// - docs-agent: Technical documentation

// Use built-in agents
const result = await orchestrator.delegate('docs-agent', {
  query: 'Create API documentation for the agents endpoint'
});

console.log(result);
```

## 4. Execute Your First Agent

### Simple Execution

```bash
# Execute an agent with a query
curl -X POST http://localhost:3000/api/v1/agents/{AGENT_ID}/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "Research the latest trends in AI agent orchestration",
    "context": {
      "maxResults": 5,
      "includeImages": false
    },
    "streaming": false
  }'
```

### Using the Orchestrator

```typescript
// Execute a multi-step workflow
const result = await orchestrator.executeWorkflow('research-implement', {
  query: 'Build a user authentication system with JWT tokens'
});

// Smart execution (auto-routing)
const smartResult = await orchestrator.smartExecute(
  'Analyze this codebase and suggest improvements'
);
```

## 5. Multi-Agent Workflows

### Pre-built Workflows

The platform includes several ready-to-use workflows:

```bash
# List available workflows
pnpm run ai:workflows

# Execute a workflow
pnpm run ai:workflow code-review ./src/agents/core/Orchestrator.ts
pnpm run ai:workflow research-implement "JWT authentication system"
pnpm run ai:workflow full-feature-dev "User profile management"
```

### Available Workflows

- **code-review**: Comprehensive code analysis and security review
- **research-implement**: Research topic and generate implementation
- **full-feature-dev**: End-to-end feature development
- **bug-hunt-fix**: Intelligent bug detection and fixing
- **intelligent-refactor**: AI-powered code refactoring
- **api-modernization**: API optimization and best practices
- **deployment-pipeline**: Complete CI/CD setup
- **data-pipeline**: Robust data processing pipelines

### Custom Workflow Example

```typescript
import { Orchestrator, type Workflow } from './src/agents/core/Orchestrator.js';

const orchestrator = new Orchestrator();

// Define a custom workflow
const customWorkflow: Workflow = {
  id: 'feature-analysis',
  name: 'Feature Analysis Workflow',
  description: 'Analyze requirements and create implementation plan',
  steps: [
    {
      id: 'requirements',
      taskType: 'research',
      prompt: 'Analyze and document detailed requirements:'
    },
    {
      id: 'architecture',
      taskType: 'planning',
      prompt: 'Design system architecture:'
    },
    {
      id: 'implementation',
      taskType: 'code-generation',
      prompt: 'Generate implementation code:'
    }
  ]
};

// Register and execute
orchestrator.registerWorkflow(customWorkflow);
const result = await orchestrator.executeWorkflow('feature-analysis',
  'User notification system with email and SMS'
);
```

## 6. Development Commands

### Essential Commands

```bash
# Development
pnpm run dev                    # Start development server
pnpm run dev:watch              # Start with file watching
pnpm run type-check             # TypeScript type checking

# Database
pnpm run db:migrate             # Run migrations
pnpm run db:studio              # Open database GUI
pnpm run db:seed                # Seed test data

# Code Quality
pnpm run check                  # Biome linting and formatting
pnpm run test                   # Run tests
pnpm run test:coverage          # Run tests with coverage

# AI CLI Tools
pnpm run ai:cli                 # Interactive AI CLI
pnpm run ai:analyze             # Code analysis
pnpm run ai:generate:schema     # Generate database schemas
pnpm run ai:generate:route      # Generate API routes
pnpm run ai:automate            # Feature automation
```

### Docker Commands

```bash
# Database management
pnpm run docker:up              # Start all services
pnpm run docker:down            # Stop all services
pnpm run docker:logs            # View logs
pnpm run docker:clean           # Clean volumes

# Production build
docker build -t cartrita-ai:latest .
docker run -p 3000:3000 cartrita-ai:latest
```

## 7. Testing Your Setup

### Unit Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test agents
pnpm test database
pnpm test api

# Watch mode for development
pnpm test:watch
```

### Integration Tests

```bash
# Test agent execution
pnpm run ai:cli test-agent "research-agent" "What is TypeScript?"

# Test workflows
pnpm run ai:workflow code-review ./src/main.ts

# Test API endpoints
curl -X GET http://localhost:3000/api/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Load Testing

```bash
# Install k6 for load testing
brew install k6  # macOS
# or
sudo apt install k6  # Ubuntu

# Run load tests
k6 run tests/load/agents-api.js
```

## 8. Next Steps

### Explore Advanced Features

1. **Vector Search**: Implement semantic search with pgvector
2. **Real-time Updates**: WebSocket integration for live agent responses
3. **Custom Tools**: Create custom agent tools and capabilities
4. **Monitoring**: Set up observability with Prometheus and Grafana
5. **Deployment**: Deploy to production with Docker Compose

### Read Documentation

- [Engineering Playbook](../operations/ENGINEERING_PLAYBOOK.md) - Comprehensive technical guide
- [Agent Architecture](../architecture/agent-architecture.md) - System design patterns
- [API Reference](../api/README.md) - Complete API documentation
- [MCP Server Setup](../operations/MCP_SERVER_SETUP.md) - External integrations

### Join the Community

- **GitHub**: [Issues and Discussions](https://github.com/your-org/cartrita-agents)
- **Discord**: [Developer Community](https://discord.gg/cartrita)
- **Documentation**: [Wiki and Guides](https://docs.cartrita.com)

## 9. Troubleshooting

### Common Issues

#### "Failed to connect to database"
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
pnpm run docker:down && pnpm run docker:up

# Check connection
pnpm run db:migrate
```

#### "Missing API key errors"
```bash
# Verify environment variables
env | grep API_KEY

# Check .env file
cat .env | grep OPENAI_API_KEY
```

#### "Port 3000 already in use"
```bash
# Find process using port
lsof -i :3000

# Kill process or change port
export PORT=3001
pnpm run dev
```

#### "Agent execution timeout"
```bash
# Check agent health
curl http://localhost:3000/api/v1/agents/health

# View detailed logs
pnpm run dev  # Check console output

# Enable debug logging
export DEBUG=cartrita:*
export LOG_LEVEL=debug
pnpm run dev
```

### Getting Help

1. **Check Logs**: Always review console output and error messages
2. **API Documentation**: Use `/docs` endpoint for API exploration
3. **Health Checks**: Monitor `/health` endpoint for system status
4. **GitHub Issues**: Report bugs and request features
5. **Discord Community**: Get help from other developers

## 10. Production Considerations

### Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Use environment variables for all secrets
- [ ] Enable request logging and monitoring

### Performance Optimization

- [ ] Configure database connection pooling
- [ ] Set up Redis for caching
- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
- [ ] Monitor memory usage and optimize
- [ ] Set up database indices for queries

### Deployment Checklist

- [ ] Set NODE_ENV=production
- [ ] Configure production database
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategies
- [ ] Test disaster recovery procedures
- [ ] Document operational procedures

---

**Congratulations!** You now have a fully functional AI agents platform. Start building amazing AI-powered applications!

For advanced topics and production deployment, see the [Engineering Playbook](../operations/ENGINEERING_PLAYBOOK.md).