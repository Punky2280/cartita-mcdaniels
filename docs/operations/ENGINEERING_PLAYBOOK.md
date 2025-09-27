# Engineering Playbook 🛠️

## Complete A-Z Cookbook for AI Agents Development (2025)

**Last Updated:** September 19, 2025  
**Stack:** Node.js 22+ | TypeScript | Biome | OpenAI Agents SDK | PostgreSQL+pgvector

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Technology Stack](#2-technology-stack)
3. [Database Configuration](#3-database-configuration)
4. [API Integrations](#4-api-integrations)
5. [Agent Development](#5-agent-development)
6. [Frontend Development](#6-frontend-development)
7. [Security & Authentication](#7-security--authentication)
8. [Testing Strategy](#8-testing-strategy)
9. [Docker & Containerization](#9-docker--containerization)
10. [Deployment](#10-deployment)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Performance Optimization](#12-performance-optimization)
13. [Troubleshooting](#13-troubleshooting)
14. [Best Practices](#14-best-practices)
15. [Reference](#15-reference)

---

## 1. Environment Setup

### Prerequisites

```bash
# Install Node.js 22+ (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 22.0.0+
npm --version

# Install pnpm (recommended for monorepos)
npm install -g pnpm@latest

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Project Initialization

```bash
# Clone or create new project
git clone <your-repo> cartrita-ai-agents-monorepo
cd cartrita-ai-agents-monorepo

# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env
# Edit .env with your API keys (see API Integrations section)

# Start database
pnpm run docker:up

# Run database migrations
pnpm run db:migrate

# Start development servers
pnpm run dev
```

---

## 2. Technology Stack

### Core Technologies (2025)

| Component | Technology | Version | Reason |
|-----------|------------|---------|---------|
| **Runtime** | Node.js | 22+ | Latest LTS with modern features |
| **Language** | TypeScript | 5.6+ | Type safety, IntelliSense |
| **Linting** | Biome | 1.9+ | 15x faster than ESLint for monorepos |
| **Package Manager** | pnpm | 9+ | Efficient monorepo management |
| **Backend** | Fastify | 5+ | High performance, plugin ecosystem |
| **Frontend** | React + Vite | Latest | Modern build tools, fast HMR |
| **Database** | PostgreSQL + pgvector | 17 + 0.8+ | Vector similarity search |

### AI & ML Stack

```bash
# Core AI dependencies
npm install @openai/agents zod@3           # OpenAI Agents SDK
npm install @anthropic-ai/sdk              # Claude integration  
npm install @huggingface/transformers      # Browser ML models
npm install @deepgram/sdk                  # Speech processing
npm install @octokit/rest @octokit/graphql # GitHub integration
```

### Development Tools

```bash
# Biome configuration (replaces ESLint + Prettier)
npm install -D @biomejs/biome

# TypeScript configuration
npm install -D typescript @types/node

# Testing framework
npm install -D vitest @vitest/coverage-v8
```

---

## 3. Database Configuration

### PostgreSQL + pgvector Setup

#### Docker Configuration

```yaml
# docker-compose.yml - Unified PostgreSQL+pgvector
services:
  database:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: cartrita_ai_agents
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
```

#### Database Schema

```sql
-- scripts/init-db.sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table with vector embeddings
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI embeddings dimension
    token_count INTEGER,
    agent_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector similarity index (HNSW)
CREATE INDEX idx_messages_embedding ON messages 
USING hnsw (embedding vector_cosine_ops);

-- Agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    instructions TEXT NOT NULL,
    model VARCHAR(50) DEFAULT 'gpt-4o',
    tools JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Database Connection (TypeScript)

```typescript
// packages/database/src/connection.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const sql = postgres({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB || 'cartrita_ai_agents',
  max: 20, // Connection pool size
});

export const db = drizzle(sql, { schema });

// Vector similarity search example
export async function findSimilarMessages(
  queryVector: number[],
  conversationId: string,
  limit = 5
) {
  return db.execute(sql`
    SELECT id, content, 1 - (embedding <=> ${queryVector}::vector) as similarity
    FROM messages 
    WHERE conversation_id = ${conversationId}
    ORDER BY embedding <=> ${queryVector}::vector
    LIMIT ${limit}
  `);
}
```

---

## 4. API Integrations

### 4.1 OpenAI Agents SDK

**Installation & Setup:**

```bash
npm install @openai/agents zod@3
```

**Basic Agent Implementation:**

```typescript
// packages/ai-agents/src/research-agent.ts
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

const webSearchTool = tool({
  name: 'web_search',
  description: 'Search the web for current information',
  parameters: z.object({
    query: z.string(),
    maxResults: z.number().optional().default(5),
  }),
  execute: async (input) => {
    const response = await fetch(`https://api.tavily.com/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: input.query,
        max_results: input.maxResults,
      }),
    });
    return response.json();
  },
});

export const researchAgent = new Agent({
  name: 'Research Agent',
  instructions: `You are a research agent specialized in finding and analyzing information.
  Always cite your sources and provide accurate, up-to-date information.`,
  tools: [webSearchTool],
  model: 'gpt-4o',
});

// Multi-agent handoff example
export const analysisAgent = new Agent({
  name: 'Analysis Agent',
  instructions: 'You analyze research data and provide insights.',
  handoffDescription: 'Handles data analysis and insight generation',
});

export async function runResearchWorkflow(query: string) {
  const result = await run(researchAgent, query);
  
  // Hand off to analysis agent if needed
  if (result.needsAnalysis) {
    return await run(analysisAgent, `Analyze this research: ${result.finalOutput}`);
  }
  
  return result;
}
```

### 4.2 Anthropic Claude Integration

```typescript
// packages/ai-agents/src/claude-agent.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeAgent {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async chat(messages: any[], stream = false) {
    if (stream) {
      return this.client.messages.create({
        max_tokens: 4096,
        messages,
        model: 'claude-sonnet-4-20250514',
        stream: true,
      });
    }

    return this.client.messages.create({
      max_tokens: 4096,
      messages,
      model: 'claude-sonnet-4-20250514',
    });
  }

  // Tool use example
  async useTools(messages: any[], tools: any[]) {
    return this.client.messages.create({
      max_tokens: 4096,
      messages,
      model: 'claude-sonnet-4-20250514',
      tools,
    });
  }
}
```

### 4.3 HuggingFace Transformers.js

```typescript
// packages/ai-agents/src/huggingface-agent.ts
import { pipeline } from '@huggingface/transformers';

export class HuggingFaceAgent {
  private sentimentPipeline: any;
  private embeddingPipeline: any;

  async initialize() {
    // Initialize pipelines (runs in browser or Node.js)
    this.sentimentPipeline = await pipeline('sentiment-analysis');
    this.embeddingPipeline = await pipeline('feature-extraction', 
      'sentence-transformers/all-MiniLM-L6-v2'
    );
  }

  async analyzeSentiment(text: string) {
    return await this.sentimentPipeline(text);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.embeddingPipeline(text, {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(result.data);
  }
}
```

### 4.4 Deepgram Speech Services

```typescript
// packages/ai-agents/src/speech-agent.ts
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export class SpeechAgent {
  private deepgram: any;

  constructor() {
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  }

  // Live transcription
  async startLiveTranscription() {
    const connection = this.deepgram.listen.live({
      model: 'nova-3',
      punctuate: true,
      smart_format: true,
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('Live transcription started');
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      console.log('Transcript:', data.channel.alternatives[0].transcript);
    });

    return connection;
  }

  // Text to speech
  async textToSpeech(text: string): Promise<Buffer> {
    const response = await this.deepgram.speak.request(
      { text },
      { model: 'aura-asteria-en' }
    );
    
    return response.getStream();
  }

  // Voice Agent
  async createVoiceAgent() {
    const connection = this.deepgram.agent();
    
    connection.on('open', () => {
      connection.configure({
        agent: {
          listen: { model: 'nova-3' },
          speak: { model: 'aura-asteria-en' },
          think: { 
            provider: { type: 'open_ai' },
            model: 'gpt-4o',
            instructions: 'You are a helpful voice assistant.',
          },
        },
      });
    });

    return connection;
  }
}
```

### 4.5 GitHub Integration

```typescript
// packages/ai-agents/src/github-agent.ts
import { Octokit } from '@octokit/rest';

export class GitHubAgent {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  async searchRepositories(query: string) {
    const response = await this.octokit.search.repos({
      q: query,
      sort: 'stars',
      order: 'desc',
    });
    return response.data;
  }

  async analyzeRepository(owner: string, repo: string) {
    const [repoData, languages, contributors] = await Promise.all([
      this.octokit.repos.get({ owner, repo }),
      this.octokit.repos.listLanguages({ owner, repo }),
      this.octokit.repos.listContributors({ owner, repo }),
    ]);

    return {
      repository: repoData.data,
      languages: languages.data,
      contributors: contributors.data,
    };
  }
}
```

### 4.6 Web Search APIs

```typescript
// packages/ai-agents/src/search-agent.ts

export class WebSearchAgent {
  async tavilySearch(query: string) {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
    });
    return response.json();
  }

  async serpApiSearch(query: string) {
    const params = new URLSearchParams({
      engine: 'google',
      q: query,
      api_key: process.env.SERPAPI_API_KEY!,
    });

    const response = await fetch(`https://serpapi.com/search?${params}`);
    return response.json();
  }
}
```

---

## 5. Agent Development

### Agent Architecture Patterns

```typescript
// packages/ai-agents/src/base-agent.ts
export abstract class BaseAgent {
  protected name: string;
  protected instructions: string;
  protected tools: any[] = [];

  constructor(name: string, instructions: string) {
    this.name = name;
    this.instructions = instructions;
  }

  abstract execute(input: string): Promise<AgentResponse>;

  protected async logExecution(input: string, output: any) {
    // Log to database or monitoring service
    await db.insert(agentExecutions).values({
      agentName: this.name,
      input,
      output: JSON.stringify(output),
      timestamp: new Date(),
    });
  }
}

// Specialized agent implementations
export class CodeAnalysisAgent extends BaseAgent {
  constructor() {
    super('Code Analysis Agent', 'You analyze code for quality, security, and best practices');
  }

  async execute(code: string): Promise<AgentResponse> {
    // Implementation with OpenAI Agents SDK
    const result = await run(this.openAiAgent, code);
    await this.logExecution(code, result);
    return result;
  }
}
```

### Agent Orchestration

```typescript
// packages/ai-agents/src/orchestrator.ts
export class AgentOrchestrator {
  private agents = new Map<string, BaseAgent>();

  registerAgent(name: string, agent: BaseAgent) {
    this.agents.set(name, agent);
  }

  async executeWorkflow(workflowName: string, input: any) {
    const workflow = this.getWorkflow(workflowName);
    let result = input;

    for (const step of workflow.steps) {
      const agent = this.agents.get(step.agentName);
      if (!agent) throw new Error(`Agent ${step.agentName} not found`);

      result = await agent.execute(result);
      
      // Check if we should continue based on conditions
      if (step.condition && !step.condition(result)) {
        break;
      }
    }

    return result;
  }

  private getWorkflow(name: string) {
    // Load workflow definitions from config
    return this.workflows.get(name);
  }
}
```

---

## 6. Frontend Development

### React + Vite Setup

```bash
# Create frontend app
cd apps/frontend
pnpm create vite . --template react-ts

# Install additional dependencies
pnpm add @tanstack/react-query axios
pnpm add -D @types/react @types/react-dom
```

### Agent Chat Interface

```tsx
// apps/frontend/src/components/AgentChat.tsx
import React, { useState, useEffect } from 'react';
import { useAgentChat } from '../hooks/useAgentChat';

export function AgentChat() {
  const [message, setMessage] = useState('');
  const { messages, sendMessage, isLoading } = useAgentChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    await sendMessage(message);
    setMessage('');
  };

  return (
    <div className="agent-chat">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="content">{msg.content}</div>
            {msg.role === 'assistant' && msg.agentType && (
              <div className="agent-badge">{msg.agentType}</div>
            )}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask the AI agents..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !message.trim()}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
```

### Real-time Updates with WebSocket

```tsx
// apps/frontend/src/hooks/useAgentChat.ts
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export function useAgentChat() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('agent_thinking', () => {
      setIsLoading(true);
    });

    newSocket.on('agent_response', () => {
      setIsLoading(false);
    });

    return () => newSocket.close();
  }, []);

  const sendMessage = async (content: string) => {
    if (!socket) return;

    const message: Message = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    socket.emit('user_message', message);
  };

  return { messages, sendMessage, isLoading };
}
```

---

## 7. Security & Authentication

### JWT Authentication

```typescript
// apps/backend/src/auth/jwt.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export class AuthService {
  private jwtSecret = process.env.JWT_SECRET!;

  async generateToken(userId: string): Promise<string> {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: '24h' });
  }

  async verifyToken(token: string): Promise<{ userId: string } | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
      return decoded;
    } catch {
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

### Fastify Security Setup

```typescript
// apps/backend/src/plugins/security.ts
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

export default fp(async function (fastify) {
  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        connectSrc: ["'self'", 'https://api.openai.com'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  // CORS configuration
  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (req, context) => ({
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.ttl} ms`,
    }),
  });
});
```

### API Key Validation

```typescript
// apps/backend/src/middleware/validateApiKeys.ts
export async function validateApiKeys() {
  const requiredKeys = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'DEEPGRAM_API_KEY',
    'GITHUB_TOKEN',
  ];

  const missingKeys = requiredKeys.filter(key => {
    const value = process.env[key];
    return !value || value.startsWith('your-') || value.length < 10;
  });

  if (missingKeys.length > 0) {
    throw new Error(`Missing or invalid API keys: ${missingKeys.join(', ')}`);
  }

  // Validate OpenAI key format
  if (!process.env.OPENAI_API_KEY?.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format');
  }

  console.log('✅ All API keys validated successfully');
}
```

---

## 8. Testing Strategy

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Agent Testing

```typescript
// tests/agents/research-agent.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { researchAgent } from '../src/agents/research-agent';

describe('ResearchAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should perform web search and return results', async () => {
    // Mock external API calls
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        results: [{ title: 'Test Result', url: 'https://example.com' }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await researchAgent.execute('What is Node.js?');
    
    expect(result).toBeDefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.tavily.com')
    );
  });

  it('should handle API errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('API Error'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await researchAgent.execute('test query');
    
    expect(result.error).toBeDefined();
  });
});
```

### Database Testing

```typescript
// tests/database/vector-search.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, findSimilarMessages } from '../src/database/connection';

describe('Vector Search', () => {
  beforeAll(async () => {
    // Setup test database
    await db.execute(sql`
      INSERT INTO messages (content, embedding, conversation_id) VALUES 
      ('Hello world', '[0.1, 0.2, 0.3]', uuid_generate_v4()),
      ('Goodbye world', '[0.4, 0.5, 0.6]', uuid_generate_v4())
    `);
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE messages`);
  });

  it('should find similar messages', async () => {
    const queryVector = [0.1, 0.2, 0.3];
    const results = await findSimilarMessages(queryVector, 'test-conversation-id');
    
    expect(results).toHaveLength(2);
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
  });
});
```

---

## 9. Docker & Containerization

### Multi-stage Backend Dockerfile

```dockerfile
# apps/backend/Dockerfile
FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build stage
FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Production stage
FROM base AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package.json ./package.json

USER nodejs
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]
```

### Frontend Dockerfile

```dockerfile
# apps/frontend/Dockerfile
FROM node:22-alpine AS base
WORKDIR /app

RUN npm install -g pnpm

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Nginx for serving
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose Production

```yaml
# docker-compose.prod.yml
services:
  database:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7.4-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
      target: production
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}
    depends_on:
      - database
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
      target: production
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 10. Deployment

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@db-host:5432/dbname

# API Keys (use secrets management)
OPENAI_API_KEY=sk-prod-...
ANTHROPIC_API_KEY=sk-ant-api03-...
DEEPGRAM_API_KEY=...
GITHUB_TOKEN=ghp_...

# Security
JWT_SECRET=your-super-secure-jwt-secret
ENCRYPTION_KEY=32-character-encryption-key

# Monitoring
LOG_LEVEL=info
ENABLE_TRACING=true
SENTRY_DSN=https://...
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run type-check
      - run: pnpm run test
      - run: pnpm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          docker build -t cartrita-ai:latest .
          docker push your-registry/cartrita-ai:latest
          # Deploy via your preferred method (k8s, docker-swarm, etc.)
```

### Health Checks

```typescript
// apps/backend/src/health.ts
export async function healthCheck() {
  const checks = {
    database: false,
    redis: false,
    openai: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Database check
    await db.execute(sql`SELECT 1`);
    checks.database = true;
  } catch (e) {
    console.error('Database health check failed:', e);
  }

  try {
    // Redis check
    await redis.ping();
    checks.redis = true;
  } catch (e) {
    console.error('Redis health check failed:', e);
  }

  try {
    // OpenAI API check
    await openai.models.list();
    checks.openai = true;
  } catch (e) {
    console.error('OpenAI health check failed:', e);
  }

  const isHealthy = Object.values(checks).every(Boolean);
  return { healthy: isHealthy, checks };
}
```

---

## 11. Monitoring & Observability

### Structured Logging

```typescript
// packages/shared/src/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cartrita-ai' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// Agent execution logging
export function logAgentExecution(
  agentName: string,
  input: string,
  output: any,
  duration: number
) {
  logger.info('Agent execution', {
    agent: agentName,
    inputLength: input.length,
    outputLength: JSON.stringify(output).length,
    duration,
    timestamp: new Date().toISOString(),
  });
}
```

### Performance Metrics

```typescript
// packages/shared/src/metrics.ts
import { createPrometheusMetrics } from '@prometheus/client';

export const metrics = {
  agentExecutions: new Counter({
    name: 'agent_executions_total',
    help: 'Total number of agent executions',
    labelNames: ['agent_name', 'status'],
  }),

  agentDuration: new Histogram({
    name: 'agent_execution_duration_seconds',
    help: 'Duration of agent executions',
    labelNames: ['agent_name'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),

  vectorSearchLatency: new Histogram({
    name: 'vector_search_duration_seconds',
    help: 'Vector similarity search latency',
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  }),
};

export function recordAgentMetrics(
  agentName: string,
  duration: number,
  status: 'success' | 'error'
) {
  metrics.agentExecutions.inc({ agent_name: agentName, status });
  metrics.agentDuration.observe({ agent_name: agentName }, duration);
}
```

### Error Tracking with Sentry

```typescript
// apps/backend/src/monitoring/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

export function captureAgentError(
  error: Error,
  context: {
    agentName: string;
    input: string;
    userId?: string;
  }
) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'ai_agent');
    scope.setContext('agent_execution', context);
    scope.setLevel('error');
    Sentry.captureException(error);
  });
}
```

---

## 12. Performance Optimization

### Database Optimization

```sql
-- PostgreSQL performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- pgvector specific optimizations
SET hnsw.ef_construction = 64;
SET hnsw.m = 16;

-- Monitoring slow queries
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_statement = 'all';
```

### Connection Pooling

```typescript
// packages/database/src/pool.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  min: 5,  // Minimum connections
  idle_timeout: 30000,
  connection_timeout: 60000,
});

// Monitor pool health
setInterval(() => {
  console.log('Pool status:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  });
}, 60000);
```

### Caching Strategy

```typescript
// packages/shared/src/cache.ts
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async cacheAgentResponse(
    key: string,
    response: any,
    ttl = 3600
  ) {
    await this.redis.setex(
      `agent:${key}`,
      ttl,
      JSON.stringify(response)
    );
  }

  async getCachedResponse(key: string) {
    const cached = await this.redis.get(`agent:${key}`);
    return cached ? JSON.parse(cached) : null;
  }

  // Cache embeddings to reduce API calls
  async cacheEmbedding(text: string, embedding: number[]) {
    const key = `embedding:${Buffer.from(text).toString('base64')}`;
    await this.redis.setex(key, 7200, JSON.stringify(embedding));
  }
}
```

### API Rate Limiting

```typescript
// apps/backend/src/middleware/rateLimiting.ts
import { FastifyInstance } from 'fastify';

export async function setupRateLimiting(fastify: FastifyInstance) {
  // Per-user rate limiting
  await fastify.register(require('@fastify/rate-limit'), {
    keyGenerator: (req: any) => req.user?.id || req.ip,
    max: (req: any) => {
      if (req.user?.tier === 'premium') return 1000;
      return 100;
    },
    timeWindow: '1 minute',
  });

  // Per-agent rate limiting
  fastify.addHook('preHandler', async (request: any) => {
    if (request.url.startsWith('/api/agents/')) {
      const agentLimiter = fastify.rateLimit({
        max: 10,
        timeWindow: '1 minute',
        keyGenerator: (req: any) => `agent:${req.user?.id}:${req.params.agentId}`,
      });
      
      await agentLimiter(request);
    }
  });
}
```

---

## 13. Troubleshooting

### Common Issues & Solutions

#### Database Connection Issues

```bash
# Check PostgreSQL status
docker compose ps database

# View database logs
docker compose logs database

# Connect to database directly
docker compose exec database psql -U postgres -d cartrita_ai_agents

# Test vector extension
SELECT version();
SELECT * FROM pg_extension WHERE extname = 'vector';
```

#### Vector Search Performance

```sql
-- Check index usage
EXPLAIN ANALYZE 
SELECT id, content, 1 - (embedding <=> '[0.1,0.2,0.3]'::vector) as similarity
FROM messages 
ORDER BY embedding <=> '[0.1,0.2,0.3]'::vector 
LIMIT 10;

-- Rebuild HNSW index if needed
REINDEX INDEX idx_messages_embedding;

-- Monitor index size
SELECT pg_size_pretty(pg_relation_size('idx_messages_embedding'));
```

#### Agent Execution Issues

```typescript
// Debug agent responses
export async function debugAgent(agentName: string, input: string) {
  const startTime = Date.now();
  
  try {
    const result = await executeAgent(agentName, input);
    const duration = Date.now() - startTime;
    
    logger.info('Agent debug', {
      agent: agentName,
      input,
      result,
      duration,
      success: true,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Agent execution failed', {
      agent: agentName,
      input,
      error: error.message,
      stack: error.stack,
      duration,
    });
    
    throw error;
  }
}
```

#### Memory Issues

```bash
# Monitor Node.js memory usage
node --max-old-space-size=4096 dist/index.js

# Docker memory limits
docker compose exec backend cat /sys/fs/cgroup/memory/memory.usage_in_bytes
docker compose exec backend cat /sys/fs/cgroup/memory/memory.limit_in_bytes
```

### Debugging Tools

```bash
# Enable debug logging
export DEBUG=cartrita:*
export LOG_LEVEL=debug

# Database query profiling
export PGDEBUG=1

# OpenAI API debugging
export OPENAI_LOG_LEVEL=debug

# Vector search debugging
export VECTOR_DEBUG=true
```

---

## 14. Best Practices

### Code Organization

```typescript
// Use consistent file structure
src/
├── agents/           # Agent implementations
├── api/             # API routes and handlers
├── database/        # Database schemas and migrations
├── middleware/      # Request middleware
├── services/        # Business logic services
├── utils/           # Utility functions
└── types/          # TypeScript type definitions

// Consistent naming conventions
export interface AgentConfig {
  name: string;
  instructions: string;
  model: string;
  tools: Tool[];
}

export type AgentResponse = {
  content: string;
  metadata: {
    agentName: string;
    executionTime: number;
    tokensUsed: number;
  };
};
```

### Security Best Practices

```typescript
// Input validation with Zod
const messageSchema = z.object({
  content: z.string().min(1).max(10000),
  role: z.enum(['user', 'assistant', 'system']),
  agentType: z.string().optional(),
});

// Sanitize user input
import DOMPurify from 'dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

// Rate limiting per user
const userRateLimiter = new Map();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userHistory = userRateLimiter.get(userId) || [];
  const recentRequests = userHistory.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 60) return false;
  
  recentRequests.push(now);
  userRateLimiter.set(userId, recentRequests);
  return true;
}
```

### Error Handling

```typescript
// Consistent error handling
export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public agentName: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

// Error recovery strategies
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Testing Guidelines

```typescript
// Mock external services consistently
export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Mock response' } }]
      })
    }
  }
};

// Test data factories
export function createTestUser(): User {
  return {
    id: uuid(),
    email: 'test@example.com',
    createdAt: new Date(),
  };
}

export function createTestMessage(overrides?: Partial<Message>): Message {
  return {
    id: uuid(),
    content: 'Test message',
    role: 'user',
    createdAt: new Date(),
    ...overrides,
  };
}
```

### Production Launch Automation Playbook

The "Production Launch Enforcement" automation run is now our baseline for multi-agent handoffs that must reach deployment readiness. Reuse these guardrails whenever we dispatch orchestrated workstreams:

**Global Validation Rules**
- Every agent output must include headings named exactly `Sequential Thinking (7 steps)` and `MCP/Web Research Findings`.
- Agents perform an internal self-check (up to two retries) and only emit the deliverable when both sections are populated.
- If a section cannot be completed after retries, the agent records a bold `WARNING` inside `Risks & Mitigations` with remediation steps.
- Deliverables must also cover production readiness (deployments, environment config, security/compliance, observability, rollback/DR) and a release timeline with accountable owners.
- Collaboration is mandatory: reference sibling deliverables by path + heading and schedule at least two coordination touchpoints.
- Testing Agent produces a single consolidated response; discard drafts that fail validation.

**Execution Template**

```text
pnpm run ai:automate "Production Launch Enforcement Run v3" # See instructions/claude-automation-project.md for setup
```

Provide agents with explicit scaffolds so they fill in structured content instead of inventing headings. This excerpt shows the enforced layout:

```markdown
Sequential Thinking (7 steps)
1. ...
2. ...
3. ...
4. ...
5. ...
6. ...
7. ...
Final Recommendation: ...

MCP/Web Research Findings
- Context7: ...
- Web: ...
```

Apply the same pattern for each downstream section (architecture blueprints, infrastructure plans, timelines, risks). Keep scaffolds in sync with the orchestrator prompt so agents self-validate before responding.

**Operational Tips**
- Run a quick spot check of agent outputs—if warnings appear, trigger another automation run or assign manual follow-up.
- Mirror these rules in Documentation updates so release managers have a single source of truth.
- Log each automation command in the release journal to preserve provenance for audits.
- Install the Codacy CLI locally with `./.codacy/cli.sh download` so quality gates can run offline; on Linux environments without native `wsl`, add a lightweight wrapper (for example, create `~/.local/bin/wsl` that simply executes `"$@"`).

---

## 15. Reference

### API Endpoints Summary

```typescript
// Authentication
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
DELETE /api/auth/logout

// Agents
GET /api/agents                    # List available agents
POST /api/agents/:id/execute       # Execute specific agent
GET /api/agents/:id/history        # Get execution history
POST /api/agents/:id/feedback      # Provide feedback

// Conversations
GET /api/conversations             # List user conversations
POST /api/conversations            # Create new conversation
GET /api/conversations/:id         # Get conversation details
POST /api/conversations/:id/messages # Send message
DELETE /api/conversations/:id      # Delete conversation

// Vector Search
POST /api/search/similar           # Find similar messages
POST /api/search/embeddings        # Generate embeddings

// Health & Monitoring
GET /api/health                    # Health check
GET /api/metrics                   # Prometheus metrics
```

### Environment Variables Reference

```bash
# Required API Keys
OPENAI_API_KEY=sk-proj-...           # OpenAI API access
ANTHROPIC_API_KEY=sk-ant-api03-...   # Claude API access
DEEPGRAM_API_KEY=...                 # Speech services
GITHUB_TOKEN=ghp_...                 # GitHub integration
HUGGINGFACE_TOKEN=hf_...             # HuggingFace models
TAVILY_API_KEY=tvly-...              # Web search
SERPAPI_API_KEY=...                  # Alternative search

# Database Configuration
DATABASE_URL=postgresql://...         # Primary database
REDIS_URL=redis://...                # Cache and sessions

# Server Configuration
NODE_ENV=development|production       # Runtime environment
PORT=3000                            # Server port
HOST=0.0.0.0                         # Server host
LOG_LEVEL=info|debug|warn|error      # Logging level

# Security
JWT_SECRET=...                       # JWT signing key
ENCRYPTION_KEY=...                   # Data encryption key
ALLOWED_ORIGINS=http://localhost:5173 # CORS origins

# Feature Flags
ENABLE_TRACING=true|false            # OpenTelemetry tracing
COMPUTER_USE_ENABLED=true|false      # Computer use features
```

### Useful Commands

```bash
# Development
pnpm run dev                         # Start all services
pnpm run dev:backend                 # Backend only
pnpm run dev:frontend                # Frontend only

# Database
pnpm run db:generate                 # Generate migrations
pnpm run db:migrate                  # Apply migrations
pnpm run db:studio                   # Database GUI
pnpm run db:seed                     # Seed test data

# Testing
pnpm run test                        # Run all tests
pnpm run test:watch                  # Watch mode
pnpm run test:coverage               # With coverage
pnpm run test:e2e                    # End-to-end tests

# Code Quality
pnpm run lint                        # Check linting
pnpm run lint:fix                    # Auto-fix issues
pnpm run format                      # Format code
pnpm run type-check                  # TypeScript check

# Docker
pnpm run docker:up                   # Start containers
pnpm run docker:down                 # Stop containers
pnpm run docker:logs                 # View logs
pnpm run docker:clean                # Clean volumes

# Production
pnpm run build                       # Build for production
pnpm run start                       # Start production server
pnpm run preview                     # Preview build
```

### External Documentation Links

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
- [Anthropic Claude API](https://docs.claude.com/)
- [HuggingFace Transformers.js](https://huggingface.co/docs/hub/en/transformers-js)
- [Deepgram SDK](https://developers.deepgram.com/docs/js-sdk)
- [Octokit (GitHub)](https://octokit.github.io/rest.js/)

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Fastify Documentation](https://fastify.dev/)
- [Biome Linter](https://biomejs.dev/)
- [Vitest Testing](https://vitest.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)

---

## Related Documentation

- **[Main README](../../README.md)** - Quick start and project overview
- **[Agent Architecture](../architecture/agent-architecture.md)** - System design and multi-agent patterns  
- **[MCP Server Setup](MCP_SERVER_SETUP.md)** - External service integrations
- **[Installation Guide](INSTALLATION_AND_INTEGRATION_GUIDE.md)** - Step-by-step setup instructions

---

## Conclusion

This comprehensive Engineering Playbook provides everything needed to build, deploy, and maintain a production-ready AI agents system using the latest 2025 technologies. The combination of Node.js 22+, Biome, OpenAI Agents SDK, and unified PostgreSQL+pgvector creates a powerful, scalable foundation for AI agent orchestration.

Key advantages of this stack:

- **Performance**: Biome is 15x faster than ESLint, Node.js 22+ provides latest optimizations
- **Type Safety**: Full TypeScript coverage with strict configuration
- **AI-First**: Built specifically for multi-agent AI workflows
- **Production-Ready**: Comprehensive security, monitoring, and deployment strategies
- **Future-Proof**: Uses latest 2025 APIs and follows modern best practices

Start with the Quick Start section and refer back to specific sections as needed. The modular architecture allows you to implement features incrementally while maintaining code quality and performance.

---

**Last updated:** September 19, 2025 | **Next review:** December 2025
