# Development Guide

Comprehensive guide for developing, extending, and maintaining the Cartrita McDaniels AI Development System.

## Development Environment Setup

### Prerequisites

- **Node.js**: v18 or higher
- **pnpm**: v8 or higher  
- **PostgreSQL**: v14 or higher
- **Git**: v2.30 or higher
- **Docker**: v20 or higher (optional)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/Punky2280/cartita-mcdaniels.git
cd cartita-mcdaniels

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
pnpm db:migrate
pnpm db:seed

# Start development server
pnpm dev
```

### Project Structure Deep Dive

```
src/
├── agents/              # AI agent implementations
│   ├── base/           # Base agent classes and interfaces
│   ├── advanced/       # Advanced specialized agents
│   ├── code/           # Code-specific agents
│   ├── knowledge/      # Knowledge management agents
│   └── research/       # Research and analysis agents
├── cli/                # Command line interface
│   └── cartrita-ai.ts  # Main CLI entry point
├── core/               # Core system components
│   ├── AIDevTools.ts           # Main AI development tools
│   ├── AIIntegrationService.ts # AI service integration
│   ├── Context7Service.ts      # Context7 documentation service
│   ├── IntelligentMonitor.ts   # System monitoring
│   ├── ModelRouter.ts          # AI model routing
│   ├── Orchestrator.ts         # Workflow orchestration
│   └── ProjectWorkflowManager.ts # Project workflow management
├── database/           # Database layer
│   ├── connection.ts   # Database connection management
│   ├── migrate.ts      # Migration runner
│   ├── migrations/     # Database migrations
│   └── schema/         # Database schema definitions
├── handlers/           # Request handlers
├── plugins/            # Fastify plugins
├── routes/             # API routes
├── schemas/            # Request/response schemas
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Architecture Overview

### Core Components

#### Orchestrator

The central component that manages workflow execution:

```typescript
// src/core/Orchestrator.ts
export class Orchestrator {
  private agents: Map<string, BaseAgent> = new Map();
  private workflows: Map<string, WorkflowDefinition> = new Map();
  
  async execute(request: WorkflowRequest): Promise<WorkflowResult> {
    // Workflow execution logic
  }
  
  registerWorkflow(name: string, definition: WorkflowDefinition): void {
    // Workflow registration logic
  }
}
```

#### ModelRouter

Handles AI model selection and routing:

```typescript
// src/core/ModelRouter.ts
export class ModelRouter {
  async selectOptimalModel(request: ModelRequest): Promise<ModelProvider> {
    // Model selection logic based on:
    // - Task complexity
    // - Required capabilities  
    // - Performance requirements
    // - Cost constraints
  }
}
```

#### BaseAgent

Foundation class for all AI agents:

```typescript
// src/agents/base/BaseAgent.ts
export abstract class BaseAgent {
  abstract readonly type: AgentType;
  abstract readonly capabilities: AgentCapability[];
  
  abstract execute(context: AgentContext): Promise<AgentResult>;
  
  protected validateInput(input: unknown): ValidationResult {
    // Input validation logic
  }
}
```

## Development Workflow

### Adding New Workflows

1. **Define Workflow Type**

```typescript
// src/types/workflows.ts
export interface NewWorkflowRequest extends BaseWorkflowRequest {
  type: 'new-workflow';
  specificParam: string;
}

export interface NewWorkflowResult extends BaseWorkflowResult {
  specificOutput: unknown;
}
```

2. **Create Workflow Implementation**

```typescript
// src/workflows/NewWorkflow.ts
export class NewWorkflow implements WorkflowDefinition {
  readonly name = 'new-workflow';
  readonly description = 'Description of new workflow';
  readonly capabilities = ['capability1', 'capability2'];

  async execute(request: NewWorkflowRequest): Promise<NewWorkflowResult> {
    // Implementation logic
    const agent = await this.selectAgent(request);
    const result = await agent.execute(this.buildContext(request));
    return this.formatResult(result);
  }
}
```

3. **Register Workflow**

```typescript
// src/core/Orchestrator.ts - in constructor
this.registerWorkflow('new-workflow', new NewWorkflow());
```

4. **Add CLI Support**

```typescript
// src/cli/cartrita-ai.ts
yargs.command(
  'workflow new-workflow',
  'Execute new workflow',
  (yargs) => yargs.option('specific-param', {
    describe: 'Specific parameter',
    type: 'string',
    demandOption: true
  }),
  async (argv) => {
    const result = await orchestrator.execute({
      workflow: 'new-workflow',
      specificParam: argv.specificParam
    });
    console.log(result);
  }
);
```

5. **Add API Endpoint**

```typescript
// src/routes/workflows.ts
fastify.post<{
  Body: NewWorkflowRequest;
  Reply: NewWorkflowResult;
}>('/new-workflow', {
  schema: {
    body: NewWorkflowRequestSchema,
    response: {
      200: NewWorkflowResultSchema
    }
  }
}, async (request, reply) => {
  const result = await orchestrator.execute(request.body);
  return reply.send(result);
});
```

### Creating Custom Agents

1. **Extend BaseAgent**

```typescript
// src/agents/custom/CustomAgent.ts
export class CustomAgent extends BaseAgent {
  readonly type = 'custom';
  readonly capabilities = ['custom-capability'];

  async execute(context: AgentContext): Promise<AgentResult> {
    // Validate input
    const validation = this.validateInput(context.input);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    // Execute custom logic
    const processed = await this.processInput(context.input);
    const analyzed = await this.analyzeData(processed);
    const result = await this.generateOutput(analyzed);

    return {
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - context.startTime,
        agent: this.type,
        capabilities: this.capabilities
      }
    };
  }

  private async processInput(input: unknown): Promise<ProcessedData> {
    // Custom processing logic
  }

  private async analyzeData(data: ProcessedData): Promise<AnalyzedData> {
    // Custom analysis logic  
  }

  private async generateOutput(data: AnalyzedData): Promise<OutputData> {
    // Custom output generation
  }
}
```

2. **Register Agent**

```typescript
// src/core/Orchestrator.ts
this.agents.set('custom', new CustomAgent());
```

### Database Schema Management

#### Creating Migrations

```bash
# Generate new migration
pnpm db:generate --name add_new_table

# Apply migrations
pnpm db:migrate

# Reset database (development only)
pnpm db:reset
```

#### Schema Definition Example

```typescript
// src/database/schema/newTable.ts
import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const newTable = pgTable('new_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export type NewTable = typeof newTable.$inferSelect;
export type NewTableInsert = typeof newTable.$inferInsert;
```

## Testing Strategy

### Unit Tests

```typescript
// tests/agents/CustomAgent.test.ts
describe('CustomAgent', () => {
  let agent: CustomAgent;

  beforeEach(() => {
    agent = new CustomAgent();
  });

  it('should process input correctly', async () => {
    const context = createMockContext({
      input: { data: 'test' }
    });

    const result = await agent.execute(context);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle validation errors', async () => {
    const context = createMockContext({
      input: { invalid: true }
    });

    await expect(agent.execute(context)).rejects.toThrow(ValidationError);
  });
});
```

### Integration Tests

```typescript
// tests/integration/workflows.test.ts
describe('Workflow Integration', () => {
  let orchestrator: Orchestrator;

  beforeAll(async () => {
    orchestrator = await setupTestOrchestrator();
  });

  it('should execute new workflow end-to-end', async () => {
    const request: NewWorkflowRequest = {
      workflow: 'new-workflow',
      context: 'test context',
      specificParam: 'test value'
    };

    const result = await orchestrator.execute(request);
    
    expect(result.success).toBe(true);
    expect(result.workflow).toBe('new-workflow');
  });
});
```

### Performance Tests

```typescript
// tests/performance/orchestrator.test.ts
describe('Orchestrator Performance', () => {
  it('should handle concurrent workflows', async () => {
    const requests = Array(10).fill(null).map((_, i) => ({
      workflow: 'code-review',
      context: `test-${i}`
    }));

    const startTime = Date.now();
    const results = await Promise.all(
      requests.map(req => orchestrator.execute(req))
    );
    const duration = Date.now() - startTime;

    expect(results.every(r => r.success)).toBe(true);
    expect(duration).toBeLessThan(5000); // 5 seconds
  });
});
```

## Code Quality Standards

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

### ESLint Rules

```json
// .eslintrc.json
{
  "extends": [
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-readonly": "error",
    "@typescript-eslint/prefer-readonly-parameter-types": "warn"
  }
}
```

### Code Formatting

```json
// biome.json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": "error"
      },
      "correctness": {
        "noUnusedVariables": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

## Performance Optimization

### Caching Strategy

```typescript
// src/utils/cache.ts
export class MultiLevelCache {
  constructor(
    private memoryCache: LRUCache<string, unknown>,
    private redisCache: RedisClient
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // 1. Check memory cache
    let value = this.memoryCache.get(key) as T;
    if (value) return value;

    // 2. Check Redis cache
    const serialized = await this.redisCache.get(key);
    if (serialized) {
      value = JSON.parse(serialized) as T;
      this.memoryCache.set(key, value);
      return value;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    // Set in both caches
    this.memoryCache.set(key, value);
    await this.redisCache.setex(key, ttl, JSON.stringify(value));
  }
}
```

### Database Optimization

```typescript
// src/database/optimizations.ts
export class DatabaseOptimizer {
  // Connection pooling
  static createPool() {
    return new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum pool size
      min: 4,  // Minimum pool size
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
    });
  }

  // Query optimization
  static async executeOptimizedQuery<T>(
    query: string, 
    params: unknown[]
  ): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      // Use prepared statements for better performance
      const result = await client.query({
        text: query,
        values: params,
        rowMode: 'array' // Faster than object mode for large datasets
      });
      return result.rows as T[];
    } finally {
      client.release();
    }
  }
}
```

### AI Model Optimization

```typescript
// src/core/ModelOptimizer.ts
export class ModelOptimizer {
  private modelCache = new Map<string, CachedModel>();

  async optimizeModelSelection(request: ModelRequest): Promise<ModelProvider> {
    // 1. Check if we can use a cached/smaller model
    const cachedResult = await this.checkCache(request);
    if (cachedResult) return cachedResult;

    // 2. Analyze complexity to select appropriate model size
    const complexity = await this.analyzeComplexity(request);
    
    // 3. Select model based on complexity and requirements
    if (complexity.score < 0.3) {
      return this.selectFastModel(request);
    } else if (complexity.score < 0.7) {
      return this.selectBalancedModel(request);
    } else {
      return this.selectPowerfulModel(request);
    }
  }

  private async analyzeComplexity(request: ModelRequest): Promise<ComplexityAnalysis> {
    // Analyze request complexity based on:
    // - Input size and structure
    // - Required output format
    // - Processing requirements
    // - Context length needs
  }
}
```

## Monitoring and Debugging

### Logging Configuration

```typescript
// src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  },
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  }
});

// Usage in components
export class ComponentWithLogging {
  private logger = logger.child({ component: 'ComponentName' });

  async execute(): Promise<void> {
    this.logger.info('Starting execution');
    
    try {
      await this.performWork();
      this.logger.info('Execution completed successfully');
    } catch (error) {
      this.logger.error({ error }, 'Execution failed');
      throw error;
    }
  }
}
```

### Performance Monitoring

```typescript
// src/core/IntelligentMonitor.ts - Enhanced version
export class IntelligentMonitor {
  private metrics = new Map<string, MetricCollector>();

  startWorkflowTracking(workflowId: string): WorkflowTracker {
    const tracker = new WorkflowTracker(workflowId);
    
    tracker.on('stage', (stage, duration) => {
      this.recordMetric(`workflow.${stage}.duration`, duration);
    });
    
    tracker.on('error', (error) => {
      this.recordError(`workflow.error`, error);
    });

    return tracker;
  }

  async generatePerformanceReport(): Promise<PerformanceReport> {
    const metrics = await this.aggregateMetrics();
    const trends = await this.analyzeTrends(metrics);
    const recommendations = await this.generateRecommendations(trends);

    return {
      metrics,
      trends,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }
}
```

### Health Checks

```typescript
// src/handlers/health.ts - Enhanced version
export async function enhancedHealthCheck(): Promise<HealthStatus> {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkAIServices(),
    checkContext7Service(),
    checkCacheServices(),
    checkExternalAPIs()
  ]);

  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    components: {}
  };

  // Process check results
  checks.forEach((result, index) => {
    const componentNames = ['database', 'ai', 'context7', 'cache', 'external'];
    const componentName = componentNames[index];

    if (result.status === 'fulfilled') {
      status.components[componentName] = result.value;
    } else {
      status.components[componentName] = {
        status: 'unhealthy',
        message: result.reason.message
      };
      status.status = 'degraded';
    }
  });

  return status;
}
```

## Deployment and DevOps

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM base AS builder
COPY . .
RUN pnpm build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run type checking
        run: pnpm type-check
      
      - name: Run linting
        run: pnpm lint
      
      - name: Run tests
        run: pnpm test:coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and deploy
        run: |
          docker build -t cartrita-ai .
          docker tag cartrita-ai registry.example.com/cartrita-ai:latest
          docker push registry.example.com/cartrita-ai:latest
```

## Contributing Guidelines

### Pull Request Process

1. **Create Feature Branch**
```bash
git checkout -b feature/new-workflow-implementation
```

2. **Development Standards**
- Write comprehensive tests (min 80% coverage)
- Follow TypeScript strict mode
- Add JSDoc comments for public APIs
- Update documentation

3. **Code Review Checklist**
- [ ] Code follows style guidelines
- [ ] Tests pass and provide good coverage
- [ ] Documentation is updated
- [ ] Performance impact is considered
- [ ] Security implications are reviewed

4. **Merge Requirements**
- All CI checks pass
- At least 2 approving reviews
- No merge conflicts
- Documentation updated

### Release Process

1. **Version Bump**
```bash
pnpm version patch|minor|major
```

2. **Generate Changelog**
```bash
pnpm changelog
```

3. **Create Release**
```bash
git tag v1.2.3
git push origin v1.2.3
```

4. **Deploy to Production**
- Automated via CI/CD pipeline
- Blue-green deployment strategy
- Health checks and rollback procedures

---

*Last updated: September 27, 2025*