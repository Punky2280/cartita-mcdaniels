# System Architecture

Comprehensive architectural documentation for the Cartrita McDaniels AI Development System.

## Architecture Overview

The Cartrita McDaniels AI Development System follows a modern, microservice-inspired architecture built on Node.js/TypeScript, designed for scalability, maintainability, and extensibility.

```
┌─────────────────────────────────────────────────────────────────┐
│                          External Interfaces                    │
├─────────────────────────────────────────────────────────────────┤
│  CLI Interface  │  REST API  │  WebSocket API  │  Web Dashboard │
├─────────────────────────────────────────────────────────────────┤
│                       API Gateway Layer                        │
├─────────────────────────────────────────────────────────────────┤
│          Authentication & Authorization Middleware              │
├─────────────────────────────────────────────────────────────────┤
│                      Core System Layer                         │
│  ┌─────────────┬───────────────┬─────────────┬───────────────┐  │
│  │ Orchestrator│ ModelRouter   │ Monitor     │ Context7      │  │
│  │             │               │             │ Service       │  │
│  └─────────────┴───────────────┴─────────────┴───────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                       Agent System Layer                       │
│  ┌─────────────┬───────────────┬─────────────┬───────────────┐  │
│  │ Base Agents │ Advanced      │ Code        │ Research      │  │
│  │             │ Agents        │ Agents      │ Agents        │  │
│  └─────────────┴───────────────┴─────────────┴───────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      Data Access Layer                         │
│  ┌─────────────┬───────────────┬─────────────┬───────────────┐  │
│  │ Database    │ Caching       │ External    │ File System   │  │
│  │ (PostgreSQL)│ (Redis)       │ APIs        │ Storage       │  │
│  └─────────────┴───────────────┴─────────────┴───────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Infrastructure Layer                       │
│  ┌─────────────┬───────────────┬─────────────┬───────────────┐  │
│  │ Logging     │ Monitoring    │ Security    │ Deployment    │  │
│  │ (Pino)      │ (Custom)      │ (JWT/Auth)  │ (Docker)      │  │
│  └─────────────┴───────────────┴─────────────┴───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Orchestrator (`src/core/Orchestrator.ts`)

**Purpose**: Central workflow coordinator and execution engine.

**Responsibilities**:
- Workflow registration and management
- Agent coordination and task delegation  
- Resource allocation and optimization
- Error handling and recovery
- Performance monitoring and optimization

**Key Interfaces**:

```typescript
interface Orchestrator {
  execute(request: WorkflowRequest): Promise<WorkflowResult>
  registerWorkflow(name: string, definition: WorkflowDefinition): void
  registerAgent(type: string, agent: BaseAgent): void
  getWorkflowStatus(id: string): WorkflowStatus
}
```

**Architecture Patterns**:
- **Command Pattern**: For workflow execution
- **Observer Pattern**: For monitoring and events
- **Factory Pattern**: For agent instantiation
- **Strategy Pattern**: For workflow selection

### 2. ModelRouter (`src/core/ModelRouter.ts`)

**Purpose**: Intelligent AI model selection and routing system.

**Responsibilities**:
- Model capability assessment
- Cost-performance optimization
- Load balancing across providers
- Fallback and retry logic
- Model performance monitoring

**Decision Matrix**:

```typescript
interface ModelSelectionCriteria {
  taskComplexity: ComplexityLevel;
  responseTime: ResponseTimeRequirement;
  accuracy: AccuracyRequirement;
  cost: CostConstraint;
  contextLength: number;
  capabilities: ModelCapability[];
}
```

**Routing Logic**:
1. **Simple Tasks** → Fast, cost-effective models
2. **Complex Analysis** → High-capability models
3. **Creative Tasks** → Specialized creative models
4. **Code Generation** → Code-optimized models

### 3. Agent System Architecture

#### BaseAgent (`src/agents/base/BaseAgent.ts`)

**Abstract Foundation**:
```typescript
abstract class BaseAgent {
  abstract readonly type: AgentType;
  abstract readonly capabilities: AgentCapability[];
  abstract execute(context: AgentContext): Promise<AgentResult>;
  
  protected validateInput(input: unknown): ValidationResult;
  protected createContext(request: AgentRequest): AgentContext;
  protected formatOutput(result: unknown): AgentResult;
}
```

#### Agent Hierarchy

```
BaseAgent
├── CodeAgent
│   ├── CodeReviewAgent
│   ├── CodeGenerationAgent
│   ├── RefactoringAgent
│   └── SecurityAnalysisAgent
├── ResearchAgent
│   ├── TechnicalResearchAgent
│   ├── MarketResearchAgent
│   └── CompetitiveAnalysisAgent
├── AdvancedAgent
│   ├── ArchitecturalAgent
│   ├── OptimizationAgent
│   └── QualityAssuranceAgent
└── KnowledgeAgent
    ├── DocumentationAgent
    ├── LearningAgent
    └── ExpertiseAgent
```

### 4. Context7Service (`src/core/Context7Service.ts`)

**Purpose**: Enhanced documentation and library integration service.

**Architecture**:
```typescript
class Context7Service {
  private cache: MultiLevelCache;
  private client: Context7Client;
  private resolver: LibraryResolver;
  
  async getDocumentation(libraryId: string, topic?: string): Promise<Documentation>
  async resolveLibrary(name: string): Promise<LibraryMatch[]>
  async getExamples(libraryId: string, pattern: string): Promise<CodeExample[]>
}
```

**Caching Strategy**:
- **L1 Cache**: In-memory LRU cache (100MB)
- **L2 Cache**: Redis cache (1GB, 1-hour TTL)
- **L3 Cache**: Persistent storage (unlimited, 24-hour TTL)

### 5. IntelligentMonitor (`src/core/IntelligentMonitor.ts`)

**Purpose**: Comprehensive system monitoring and analytics.

**Monitoring Domains**:
- **Performance Metrics**: Response times, throughput, resource usage
- **Business Metrics**: Workflow success rates, user engagement
- **System Health**: Component availability, error rates
- **Cost Analytics**: API usage, resource consumption

**Alert System**:
```typescript
interface AlertRule {
  metric: string;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  channels: NotificationChannel[];
}
```

## Data Flow Architecture

### Request Processing Pipeline

```
1. Request Reception
   ├── CLI Command → CLI Parser → Request Builder
   ├── HTTP Request → Route Handler → Request Validator
   └── WebSocket → Event Handler → Message Parser

2. Authentication & Authorization
   ├── JWT Validation
   ├── Permission Check
   └── Rate Limit Enforcement

3. Core Processing
   ├── Orchestrator → Workflow Selection
   ├── ModelRouter → Model Selection
   ├── Agent System → Task Execution
   └── Context7 → Documentation Enhancement

4. Response Generation
   ├── Result Formatting
   ├── Error Handling
   ├── Performance Logging
   └── Response Delivery
```

### Data Persistence Strategy

#### Database Schema Design

```sql
-- Core Tables
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status workflow_status,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE agents (
  id UUID PRIMARY KEY,
  type agent_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  configuration JSONB,
  status agent_status DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE executions (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  agent_id UUID REFERENCES agents(id),
  input_data JSONB,
  output_data JSONB,
  metrics JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status execution_status
);

-- Monitoring Tables
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY,
  component VARCHAR(100),
  metric_name VARCHAR(100),
  metric_value DECIMAL,
  tags JSONB,
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

#### Caching Architecture

```typescript
interface CacheStrategy {
  // Memory Cache (L1)
  memory: {
    type: 'LRU',
    maxSize: '100MB',
    ttl: 300 // 5 minutes
  },
  
  // Redis Cache (L2)  
  redis: {
    type: 'Redis',
    maxSize: '1GB',
    ttl: 3600 // 1 hour
  },
  
  // Database Cache (L3)
  database: {
    type: 'PostgreSQL',
    ttl: 86400 // 24 hours
  }
}
```

## Security Architecture

### Authentication Flow

```
1. Client Authentication
   ├── API Key Authentication (CLI/API)
   ├── JWT Token Authentication (Web)
   └── OAuth2 Integration (External)

2. Authorization Matrix
   ├── Role-Based Access Control (RBAC)
   ├── Resource-Level Permissions
   └── Dynamic Permission Evaluation

3. Security Layers
   ├── Input Validation & Sanitization
   ├── SQL Injection Prevention
   ├── XSS Protection
   └── Rate Limiting & DDoS Protection
```

### Security Components

```typescript
interface SecurityManager {
  authenticate(credentials: AuthCredentials): Promise<AuthResult>
  authorize(user: User, resource: Resource, action: Action): Promise<boolean>
  validateInput(input: unknown): ValidationResult
  sanitizeOutput(output: unknown): SanitizedOutput
}
```

## Performance Architecture

### Scalability Strategy

#### Horizontal Scaling

```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cartrita-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cartrita-ai
  template:
    spec:
      containers:
      - name: cartrita-ai
        image: cartrita-ai:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

#### Load Balancing

```
Internet → Load Balancer → API Gateway → Application Instances
                        → Cache Layer   → Database Cluster
                        → Monitoring    → Logging System
```

### Performance Optimizations

#### Database Optimizations

```sql
-- Indexing Strategy
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX idx_executions_created_at ON executions(created_at DESC);
CREATE INDEX idx_performance_metrics_component ON performance_metrics(component, recorded_at);

-- Partitioning Strategy  
CREATE TABLE executions_2025_01 PARTITION OF executions
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

#### Application Optimizations

```typescript
// Connection Pooling
const pool = new Pool({
  max: 20,
  min: 4,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

// Async Processing
class AsyncWorkflowProcessor {
  private queue = new Bull('workflow-queue');
  
  async processWorkflow(request: WorkflowRequest) {
    return this.queue.add('execute', request, {
      priority: request.priority,
      delay: request.delay,
      attempts: 3,
      backoff: 'exponential'
    });
  }
}
```

## Integration Architecture

### External System Integrations

#### AI Provider Integration

```typescript
interface AIProvider {
  name: string;
  capabilities: ModelCapability[];
  pricing: PricingModel;
  rateLimit: RateLimit;
  
  execute(request: ModelRequest): Promise<ModelResponse>;
  getStatus(): Promise<ProviderStatus>;
}

class ProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  
  async selectProvider(requirements: ModelRequirements): Promise<AIProvider> {
    // Provider selection logic based on:
    // - Capability matching
    // - Cost optimization
    // - Availability status
    // - Performance metrics
  }
}
```

#### Context7 Integration

```typescript
interface Context7Integration {
  // Library resolution and documentation
  resolveLibrary(name: string): Promise<LibraryMatch[]>;
  getDocumentation(libraryId: string, topic?: string): Promise<Documentation>;
  
  // Code examples and patterns
  getExamples(libraryId: string, pattern: string): Promise<CodeExample[]>;
  
  // Implementation guidance
  generateGuidance(scenario: ScenarioRequest): Promise<ImplementationGuidance>;
}
```

### API Design Principles

#### RESTful API Design

```typescript
// Resource-oriented URLs
GET    /api/v1/workflows          // List workflows
POST   /api/v1/workflows          // Create workflow
GET    /api/v1/workflows/{id}     // Get workflow
PUT    /api/v1/workflows/{id}     // Update workflow
DELETE /api/v1/workflows/{id}     // Delete workflow

// Nested resources
GET    /api/v1/workflows/{id}/executions     // List executions
POST   /api/v1/workflows/{id}/executions     // Create execution
GET    /api/v1/workflows/{id}/executions/{executionId}  // Get execution
```

#### GraphQL API (Future Enhancement)

```graphql
type Query {
  workflows(status: WorkflowStatus, limit: Int): [Workflow]
  workflow(id: ID!): Workflow
  agents(type: AgentType): [Agent]
  performance(component: String, timeRange: TimeRange): [Metric]
}

type Mutation {
  executeWorkflow(input: WorkflowInput!): WorkflowExecution
  createAgent(input: AgentInput!): Agent
  updateWorkflow(id: ID!, input: WorkflowUpdateInput!): Workflow
}

type Subscription {
  workflowUpdates(id: ID!): WorkflowUpdate
  systemHealth: HealthUpdate
}
```

## Deployment Architecture

### Container Strategy

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM base AS builder
COPY . .
RUN pnpm build && pnpm prune --production

FROM node:18-alpine AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 cartrita
WORKDIR /app

COPY --from=builder --chown=cartrita:nodejs /app/dist ./dist
COPY --from=builder --chown=cartrita:nodejs /app/node_modules ./node_modules
COPY --chown=cartrita:nodejs package.json ./

USER cartrita
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### Infrastructure as Code

```yaml
# docker-compose.yml for development
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/cartrita
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=cartrita
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Production Deployment

```yaml
# Kubernetes production configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: cartrita-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cartrita-ai
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: cartrita-ai
  template:
    metadata:
      labels:
        app: cartrita-ai
    spec:
      containers:
      - name: cartrita-ai
        image: cartrita-ai:v1.0.0
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: cartrita-config
        - secretRef:
            name: cartrita-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Monitoring and Observability

### Observability Stack

```
Application Metrics → Prometheus → Grafana Dashboard
Application Logs    → Fluentd   → Elasticsearch → Kibana  
Application Traces  → Jaeger    → Trace Analysis
```

### Custom Metrics

```typescript
// Prometheus metrics integration
import { createPrometheusMetrics } from 'prom-client';

export class MetricsCollector {
  private readonly workflowDuration = new Histogram({
    name: 'workflow_execution_duration_seconds',
    help: 'Duration of workflow execution',
    labelNames: ['workflow_type', 'status']
  });

  private readonly agentCalls = new Counter({
    name: 'agent_calls_total',
    help: 'Total number of agent calls',
    labelNames: ['agent_type', 'status']
  });

  recordWorkflowDuration(type: string, duration: number, status: string) {
    this.workflowDuration.labels(type, status).observe(duration);
  }

  incrementAgentCalls(type: string, status: string) {
    this.agentCalls.labels(type, status).inc();
  }
}
```

## Future Architecture Considerations

### Microservices Evolution

```
Current Monolith → Service Extraction → Full Microservices

Phase 1: Extract Context7Service
Phase 2: Extract Agent Management
Phase 3: Extract Workflow Engine
Phase 4: Extract Model Router
```

### Event-Driven Architecture

```typescript
// Event sourcing implementation
interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  version: number;
  data: unknown;
  timestamp: Date;
}

class EventStore {
  async append(events: DomainEvent[]): Promise<void>
  async getEvents(aggregateId: string): Promise<DomainEvent[]>
  async subscribe(eventType: string, handler: EventHandler): void
}
```

### AI Model Evolution

```typescript
// Plugin architecture for AI models
interface ModelPlugin {
  name: string;
  version: string;
  capabilities: ModelCapability[];
  
  initialize(config: ModelConfig): Promise<void>;
  execute(request: ModelRequest): Promise<ModelResponse>;
  destroy(): Promise<void>;
}

class ModelPluginManager {
  async loadPlugin(plugin: ModelPlugin): Promise<void>
  async unloadPlugin(name: string): Promise<void>
  async updatePlugin(name: string, version: string): Promise<void>
}
```

---

*Last updated: September 27, 2025*