# Cartrita Coding Memory - 2025 Best Practices

> **Memory File for Claude Code and Sub-Agents**
> This file contains essential coding patterns, conventions, and best practices discovered through Context7 research for the Cartrita project in 2025.

## 🎯 Core Architecture Principles

## ✅ Quality Tooling Notes

- Codacy MCP tooling continues to invoke `wsl .codacy/cli.sh …` even on native Linux. We've installed a global shim in `/usr/local/bin` and `/usr/bin` that forwards to the workspace script, but the MCP integration still exits non-zero. Until upstream fixes land, always run Codacy locally with `wsl .codacy/cli.sh analyze <changed-file> --format sarif` immediately after edits and attach the SARIF output manually if needed.

### Project Identity

- **Project Name**: Cartrita (rebranded from Aurora)
- **Core Purpose**: Multi-agent AI orchestration system
- **Primary Model**: GPT-4.1 for orchestrator, GPT-5 Codex Preview for code engineer
- **Technology Stack**: TypeScript 5.7+, React 19+, Fastify, PostgreSQL, Drizzle ORM

## 📋 TypeScript 5.7+ Patterns (2025)

### Essential Configurations

```typescript
// tsconfig.json - Always use strict mode
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "module": "ES2022",
    "target": "ES2022",
    "moduleResolution": "bundler"
  }
}
```

### Type Safety Rules

- **NEVER use `any`** - always prefer `unknown` for maximum type safety
- **Use template literal types** for dynamic string-based types
- **Leverage `satisfies` operator** for type constraints without widening
- **Embrace ESM modules** exclusively - no CommonJS in 2025
- **Use identity columns** over serial in database schemas

### Code Patterns

```typescript
// ✅ Good: Unknown over any
function processData(data: unknown): ProcessedData {
  if (typeof data === 'object' && data !== null) {
    // Type guard implementation
  }
}

// ✅ Good: Template literal types
type AgentType = `${string}-agent` | 'cartrita-orchestrator';

// ✅ Good: Satisfies operator
const config = {
  apiUrl: 'http://localhost:3002',
  timeout: 5000
} satisfies ApiConfig;
```

## ⚛️ React 19+ Patterns (2025)

### Revolutionary Features to Use

- **React Compiler**: Automatic optimizations - reduce manual `useMemo`/`useCallback`
- **Actions API**: For async operations with automatic pending states
- **New Hooks**: `useActionState`, `useFormStatus`, `useOptimistic`
- **`use` API**: First-class promise and context support

### Component Patterns

```typescript
// ✅ Good: React 19 Action pattern
function ChatForm() {
  const [state, formAction] = useActionState(sendMessage, initialState);
  const { pending } = useFormStatus();

  return (
    <form action={formAction}>
      <input name="message" disabled={pending} />
      <button type="submit">Send</button>
    </form>
  );
}

// ✅ Good: useOptimistic for UI updates
function MessageList({ messages }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state, newMessage) => [...state, newMessage]
  );
}
```

### Architecture Rules

- **Function components only** - no class components in 2025
- **Server components first** where possible for performance
- **Embrace concurrent rendering** with Suspense boundaries
- **Let React Compiler optimize** - avoid manual performance optimizations

## 🚀 Fastify API Patterns (2025)

### Plugin Architecture

```typescript
// ✅ Good: Plugin-based structure
const aiRoutes: FastifyPluginAsync = async (fastify) => {
  // Schema validation for all routes
  fastify.post('/chat', {
    schema: {
      body: ChatMessageSchema,
      response: { 200: ChatResponseSchema }
    }
  }, chatHandler);
};

// ✅ Good: Lifecycle hooks
fastify.addHook('preHandler', requireAuth);
fastify.addHook('onSend', rateLimitCheck);
```

### Performance Rules

- **Always use schema validation** for requests/responses
- **Leverage built-in serialization** over manual JSON.stringify
- **Use Pino logger** (built-in) for optimal performance
- **Plugin encapsulation** prevents global namespace pollution

## 🗄️ Database Patterns with Drizzle ORM (2025)

### Modern Schema Patterns

```typescript
// ✅ Good: Identity columns (2025 standard)
export const agents = pgTable('agents', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity({
    startWith: 1000,
    increment: 1,
    cache: 1
  }),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ✅ Good: Reusable patterns
const auditFields = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 255 }),
  updatedBy: varchar('updated_by', { length: 255 })
};
```

### Query Optimization

- **Select only needed fields** - never use `select()` without parameters
- **Use proper indexing** from day one
- **Leverage TypeScript inference** for type safety
- **Use Drizzle migrations exclusively** - never manually edit migration history

## 🤖 AI Agent Orchestration Patterns (2025)

### Model Assignment Strategy

```typescript
// ✅ Good: Specific model assignments based on capabilities
const modelAssignments = {
  'cartrita-orchestrator': {
    primaryModel: 'gpt-4.1',
    fallback: 'gpt-4o',
    performance: 'premium'
  },
  'code-engineer': {
    primaryModel: 'gpt-5-codex-preview',
    fallback: 'gpt-4o',
    performance: 'premium'
  },
  'frontend-agent': {
    primaryModel: 'gpt-4o-mini',
    fallback: 'gpt-4o',
    performance: 'fast'
  }
};
```

### Communication Protocols

- **Model Context Protocol (MCP)** for agent-to-system communication
- **Agent Communication Protocol (ACP)** for inter-agent messaging
- **Context7 integration** for 2025 documentation enhancement
- **Hierarchical orchestration** with central coordinator

### Security Patterns

```typescript
// ✅ Good: Input/output guardrails
const securityGuards = {
  inputValidation: validateAgentInput,
  outputFiltering: filterSensitiveData,
  contextIsolation: isolateAgentContext,
  privilegeControl: enforceMinimalPrivileges
};
```

## 🧪 Testing Patterns (2025)

### Multi-Layer Strategy

```typescript
// ✅ Good: Vitest configuration
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }]
    },
    coverage: { provider: 'istanbul', threshold: 80 }
  }
});
```

### Testing Rules

- **Unit tests** with Vitest for business logic
- **Component tests** with Vitest Browser Mode + Playwright
- **E2E tests** with Playwright for critical user journeys
- **Visual regression testing** for UI consistency
- **MSW for API mocking** in all test environments

## 🔧 Tooling Standards (2025)

### Biome Configuration

```json
{
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "organizeImports": { "enabled": true }
}
```

### Build Pipeline

- **Biome replaces ESLint + Prettier** - 80% faster builds
- **Vite for frontend** with React 19 support
- **tsx for backend** development with hot reload
- **TypeScript strict mode** enforced everywhere

## 🛡️ Security Requirements (2025)

### AI-Specific Security

- **Input/output policy enforcement** for all agent interactions
- **Context isolation** between different agent sessions
- **Instruction hardening** against prompt injection
- **Least-privilege tool access** for agent capabilities
- **Continuous monitoring** of agent behavior
- **Data redaction** for sensitive information

### General Security

- **OWASP Top 10 for LLMs compliance**
- **Rate limiting** on all API endpoints
- **Authentication required** for sensitive operations
- **Encryption at rest and in transit**
- **Audit logging** for all agent actions

## 📦 Package Management (2025)

### Dependencies

- **pnpm exclusively** - fastest package manager
- **Exact versions** in package.json for reproducibility
- **Security audits** before every deploy
- **Minimal dependency footprint** - review every addition

## 🎨 UI/UX Patterns (2025)

### Design System

- **Cartrita brand colors**: Claude Orange, Microsoft Blue, ChatGPT Purple
- **Tailwind CSS 4+** for styling
- **Headless UI components** for accessibility
- **WCAG 2.1 AA compliance** minimum standard
- **Framer Motion** for smooth animations

### Component Architecture

```typescript
// ✅ Good: Compound component pattern
export const ChatInterface = {
  Root: ChatContainer,
  Messages: MessageList,
  Input: MessageInput,
  Actions: ChatActions
};

// Usage
<ChatInterface.Root>
  <ChatInterface.Messages messages={messages} />
  <ChatInterface.Input onSend={handleSend} />
  <ChatInterface.Actions agent={selectedAgent} />
</ChatInterface.Root>
```

## 🔄 Development Workflow (2025)

### Git Workflow

- **Conventional commits** for clear history
- **Feature branches** from main
- **PR reviews required** for all changes
- **Automated testing** in CI/CD pipeline
- **Security scanning** before merge

### Code Review Checklist

- [ ] TypeScript strict mode compliance
- [ ] Biome formatting applied
- [ ] Tests written and passing
- [ ] Security considerations addressed
- [ ] Performance implications considered
- [ ] Accessibility requirements met
- [ ] Documentation updated

## 📊 Performance Targets (2025)

### Frontend

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### Backend

- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 50ms average
- **Agent Response Time**: < 5s for complex operations
- **Throughput**: > 1000 requests/second

## 🔧 Agent Maintenance Insights (2025-09-29)

### Maintenance Orchestration Results

**Successfully Completed Tasks** (3/11):
- ✅ Security Audit (codebase-inspector): 25.7s
- ✅ Performance Analysis (codebase-inspector): 26.4s
- ✅ Architecture Review (codebase-inspector): 29.1s

**Critical Security Findings**:
- Missing @fastify/helmet security headers (CRITICAL)
- No rate limiting implementation (HIGH)
- Insufficient input validation across API endpoints (HIGH)
- Unsecured environment variable handling (HIGH)

**Performance Issues Identified**:
- No caching strategy for API responses
- Multiple outdated dependencies with known vulnerabilities
- TypeScript strict mode not fully enabled

**Agent Performance Analysis**:
- **codebase-inspector**: 100% success rate, excellent detailed findings
- **mcp-integration**: Failed due to MCP server connectivity issues
- **Context7 agents**: Timed out during research phases (>25s)

### Immediate Security Actions Required

```bash
# Critical security hardening
pnpm add @fastify/helmet @fastify/rate-limit dotenv-safe @fastify/caching

# Dependency security updates
pnpm audit && pnpm audit fix
```

### Agent Architecture Improvements

**Multi-Agent Orchestration Patterns**:
- Central orchestrator successfully delegates to specialized agents
- Agent health monitoring and metrics collection implemented
- Failed task retry logic with exponential backoff needed
- MCP server health checks require debugging

**Agent Timeout Optimization**:
- Context7 research phases taking >25s need optimization
- Implement agent response caching for repeated queries
- Add circuit breaker patterns for failing agents

## 🚨 Critical Reminders

### Security (Updated 2025-09-29)

- ❌ **NEVER deploy without security headers** - @fastify/helmet required
- ❌ **NEVER skip rate limiting** - vulnerable to API abuse
- ❌ **NEVER use unvalidated environment variables** - use dotenv-safe
- ❌ Skip schema validation in Fastify routes
- ❌ Use `any` type in TypeScript

### Performance (Updated 2025-09-29)

- ❌ **NEVER deploy without caching** - implement @fastify/caching
- ❌ **NEVER ignore dependency vulnerabilities** - run pnpm audit regularly
- ❌ Manual performance optimizations with React 19
- ❌ ESLint/Prettier instead of Biome

### Architecture (Updated 2025-09-29)

- ❌ **NEVER tight couple services** - implement dependency injection
- ❌ **NEVER skip architectural layering** - separate controllers/services/repos
- ❌ Use class components in React
- ❌ Serial columns in new database schemas
- ❌ Unvalidated agent inputs/outputs

### Always Do

- ✅ **Implement security middleware stack** (helmet, rate-limit, validation)
- ✅ **Enable TypeScript strict mode** with all type checking flags
- ✅ **Use caching strategies** for API performance
- ✅ **Monitor agent health** and implement circuit breakers
- ✅ Use `unknown` instead of `any`
- ✅ Validate all API inputs with schemas
- ✅ Leverage React 19 compiler optimizations
- ✅ Use identity columns for new tables
- ✅ Apply security guardrails to agent interactions
- ✅ Write tests for all new features
- ✅ Follow Cartrita naming conventions

---

**Last Updated**: 2025-09-29 (Maintenance Orchestration Complete)
**Version**: 1.1
**Context7 Research Date**: 2025-09-29
**Maintenance Audit**: Critical security & performance findings documented

> This memory file should be referenced by all agents working on the Cartrita project to ensure consistent, modern, and secure coding practices aligned with 2025 standards. Latest maintenance audit revealed critical security hardening requirements - see Agent Maintenance Insights section above.
