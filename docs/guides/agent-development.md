# Agent Development Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Agent Architecture](#agent-architecture)
3. [Creating Custom Agents](#creating-custom-agents)
4. [Agent Configuration](#agent-configuration)
5. [MCP Server Integration](#mcp-server-integration)
6. [Multi-Agent Orchestration](#multi-agent-orchestration)
7. [Testing Agents](#testing-agents)
8. [Deployment and Monitoring](#deployment-and-monitoring)
9. [Best Practices](#best-practices)
10. [Examples and Templates](#examples-and-templates)

## Introduction

The Cartrita McDaniels Suarez platform provides a powerful framework for building and orchestrating AI agents. This guide covers everything you need to know to create sophisticated AI agents that can work independently or collaborate in multi-agent workflows.

### What You'll Learn

- How to create custom agents using the BaseAgent interface
- Best practices for agent design and implementation
- Integration with MCP (Model Context Protocol) servers
- Multi-agent orchestration patterns
- Testing and deployment strategies

### Prerequisites

- Node.js 22+ and TypeScript knowledge
- Familiarity with the platform architecture
- Understanding of AI/LLM concepts

## Agent Architecture

### Core Components

The agent system is built around several key components:

```md
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   BaseAgent     │    │  Orchestrator   │    │  ModelRouter    │
│                 │    │                 │    │                 │
│ • execute()     │◄───┤ • delegate()    │    │ • route()       │
│ • validate()    │    │ • workflow()    │    │ • optimize()    │
│ • transform()   │    │ • monitor()     │    │ • fallback()    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tools Layer   │    │   MCP Servers   │    │   AI Providers  │
│                 │    │                 │    │                 │
│ • web_search    │    │ • tavily        │    │ • OpenAI        │
│ • file_ops      │    │ • github        │    │ • Anthropic     │
│ • database      │    │ • slack         │    │ • Local Models  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### BaseAgent Interface

All agents extend the `BaseAgent` class, which provides a standardized interface:

```typescript
// src/agents/base/BaseAgent.ts
export interface AgentInput {
  [key: string]: unknown;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retryPolicy?: RetryPolicy;
  metadata?: Record<string, unknown>;
}

export type AgentResult =
  | {
      kind: 'ok';
      data: unknown;
      executionTime?: number;
      metadata?: Record<string, unknown>;
    }
  | {
      kind: 'error';
      code: string;
      message: string;
      category: 'validation' | 'execution' | 'timeout' | 'circuit-breaker' | 'system';
      retryable: boolean;
      executionTime?: number;
      metadata?: Record<string, unknown>;
    };

export abstract class BaseAgent extends EventEmitter {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;

  constructor(
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
    defaultTimeout?: number,
    defaultRetryPolicy?: Partial<RetryPolicy>
  );

  protected abstract executeCore(input: AgentInput, context: ExecutionContext): Promise<AgentResult>;

  async execute(input: AgentInput): Promise<AgentResult>;

  // Metrics helpers, circuit breaker management, and health reporting methods omitted for brevity
}
```

## Creating Custom Agents

### Step 1: Basic Agent Structure

Create a new agent by extending `BaseAgent` and implementing the `executeCore` method:

```typescript
// src/agents/custom/WeatherAgent.ts
import { BaseAgent, AgentInput, AgentResult } from '../base/BaseAgent.js';
import { ModelRouter } from '../../core/ModelRouter.js';

export class WeatherAgent extends BaseAgent {
  readonly name = 'weather-agent';
  readonly version = '1.0.0';
  readonly description = 'Provides weather information and forecasts';

  private modelRouter: ModelRouter;

  constructor() {
    super();
    this.modelRouter = new ModelRouter();
  }

  protected async executeCore(input: AgentInput, context: ExecutionContext): Promise<AgentResult> {
    if (typeof input.query !== 'string' || !input.query.trim()) {
      return {
        kind: 'error',
        code: 'invalid_input',
        message: 'Query is required',
        category: 'validation',
        retryable: false
      };
    }

    // Extract location from query using an LLM helper
    const location = await this.extractLocation(input.query);
    if (!location) {
      return {
        kind: 'error',
        code: 'location_not_found',
        message: 'Could not determine location from query',
        category: 'validation',
        retryable: false
      };
    }

    // Get weather data and generate a response
    const weatherData = await this.getWeatherData(location);
    const response = await this.generateResponse(weatherData, input.query);

    return {
      kind: 'ok',
      data: {
        content: response,
        location,
        weatherData
      },
      metadata: {
        executionId: context.executionId,
        agentName: this.name
      }
    };
  }

  private async extractLocation(query: string): Promise<string | null> {
    const response = await this.modelRouter.execute(
      'code-analysis',
      `Extract the location from this weather query: "${query}"
       Return only the location name, or "unknown" if no location is found.`,
      {
        systemPrompt: 'You are a location extraction specialist.',
        maxTokens: 50,
        temperature: 0.1
      }
    );

    const location = response.content.trim();
    return location !== 'unknown' ? location : null;
  }

  private async getWeatherData(location: string): Promise<any> {
    // Integration with weather API (OpenWeatherMap, WeatherAPI, etc.)
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private async generateResponse(weatherData: any, originalQuery: string): Promise<string> {
    const prompt = `
    Weather data for ${weatherData.name}:
    - Temperature: ${weatherData.main.temp}°C
    - Feels like: ${weatherData.main.feels_like}°C
    - Humidity: ${weatherData.main.humidity}%
    - Weather: ${weatherData.weather[0].description}
    - Wind: ${weatherData.wind.speed} m/s

    Original query: "${originalQuery}"

    Provide a natural, helpful response about the weather.
    `;

    const response = await this.modelRouter.execute(
      'documentation',
      prompt,
      {
        systemPrompt: 'You are a friendly weather assistant. Provide clear, concise weather information.',
        maxTokens: 200,
        temperature: 0.3
      }
    );

    return response.content;
  }
}
```

### Step 2: Register Your Agent

Register the agent with the orchestrator:

```typescript
// src/main.ts or agent registration file
import { Orchestrator } from './agents/core/Orchestrator.js';
import { WeatherAgent } from './agents/custom/WeatherAgent.js';

const orchestrator = new Orchestrator();

// Register custom agent
orchestrator.registerAgent(new WeatherAgent());

// Verify registration
console.log('Registered agents:', Array.from(orchestrator.getAgents().keys()));
```

### Step 3: Test Your Agent

```typescript
// tests/agents/WeatherAgent.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeatherAgent } from '../../src/agents/custom/WeatherAgent.js';

describe('WeatherAgent', () => {
  let agent: WeatherAgent;

  beforeEach(() => {
    agent = new WeatherAgent();

    // Mock external API calls
    global.fetch = vi.fn();
  });

  it('should extract location from query', async () => {
    // Mock weather API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        name: 'London',
        main: { temp: 15, feels_like: 13, humidity: 70 },
        weather: [{ description: 'partly cloudy' }],
        wind: { speed: 3.5 }
      })
    });

    const result = await agent.execute({
      query: 'What is the weather like in London?'
    });

    expect(result.kind).toBe('ok');
    expect(result.data.location).toBe('London');
    expect(result.data.content).toContain('London');
  });

  it('should handle invalid location', async () => {
    const result = await agent.execute({
      query: 'What is the weather like?'
    });

    expect(result.kind).toBe('error');
    expect(result.code).toBe('location_not_found');
  });
});
```

## Agent Configuration

### Configuration Schema

Agents can be configured using a standardized configuration object:

```typescript
// src/types/agent-config.ts
export interface AgentConfig {
  name: string;
  description?: string;
  type: 'research' | 'code' | 'knowledge' | 'custom';
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: string[];
  mcpServers?: string[];
  systemPrompt?: string;
  capabilities?: string[];
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  timeout?: number;
  retries?: number;
}
```

### Configuration Examples

#### Research Agent Configuration

```json
{
  "name": "advanced-research-agent",
  "description": "Research agent with web search and document analysis",
  "type": "research",
  "model": "gpt-4o",
  "maxTokens": 3000,
  "temperature": 0.2,
  "tools": ["web_search", "document_parser", "citation_generator"],
  "mcpServers": ["tavily", "serpapi", "arxiv"],
  "systemPrompt": "You are an expert research assistant. Always cite sources and provide accurate information.",
  "capabilities": ["web_search", "academic_research", "fact_checking"],
  "rateLimit": {
    "requests": 100,
    "windowMs": 60000
  },
  "timeout": 30000,
  "retries": 3
}
```

#### Code Agent Configuration

```json
{
  "name": "code-analysis-agent",
  "description": "Analyzes code for quality, security, and best practices",
  "type": "code",
  "model": "claude-3.5-sonnet",
  "maxTokens": 4000,
  "temperature": 0.1,
  "tools": ["code_parser", "security_scanner", "dependency_analyzer"],
  "mcpServers": ["github", "gitlab"],
  "systemPrompt": "You are a senior software engineer. Analyze code thoroughly and provide actionable feedback.",
  "capabilities": ["code_review", "security_analysis", "refactoring_suggestions"],
  "rateLimit": {
    "requests": 50,
    "windowMs": 60000
  }
}
```

### Configuration Management

```typescript
// src/core/AgentConfigManager.ts
export class AgentConfigManager {
  private configs: Map<string, AgentConfig> = new Map();

  async loadConfig(configPath: string): Promise<void> {
    const config = await this.readConfigFile(configPath);
    this.validateConfig(config);
    this.configs.set(config.name, config);
  }

  getConfig(agentName: string): AgentConfig | undefined {
    return this.configs.get(agentName);
  }

  private validateConfig(config: AgentConfig): void {
    // Validation logic
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Agent name is required');
    }

    if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 4096)) {
      throw new Error('maxTokens must be between 1 and 4096');
    }

    if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
      throw new Error('temperature must be between 0 and 2');
    }
  }
}
```

## MCP Server Integration

### Understanding MCP Servers

Model Context Protocol (MCP) servers provide standardized access to external services and tools. The platform supports various MCP servers for different capabilities.

### Available MCP Servers

```typescript
// src/mcp/servers.ts
export const MCP_SERVERS = {
  // Web Search
  tavily: {
    name: 'tavily',
    description: 'Advanced web search with AI-powered results',
    capabilities: ['web_search', 'news_search', 'academic_search'],
    config: {
      apiKey: process.env.TAVILY_API_KEY,
      maxResults: 10
    }
  },

  // Code Repositories
  github: {
    name: 'github',
    description: 'GitHub repository access and operations',
    capabilities: ['repo_search', 'code_analysis', 'issue_management'],
    config: {
      token: process.env.GITHUB_TOKEN,
      baseUrl: 'https://api.github.com'
    }
  },

  // Communication
  slack: {
    name: 'slack',
    description: 'Slack workspace integration',
    capabilities: ['send_message', 'read_channels', 'user_lookup'],
    config: {
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET
    }
  },

  // File Operations
  filesystem: {
    name: 'filesystem',
    description: 'Local and cloud filesystem operations',
    capabilities: ['read_file', 'write_file', 'list_directory'],
    config: {
      allowedPaths: ['/workspace', '/tmp'],
      maxFileSize: '10MB'
    }
  },

  // Database
  postgresql: {
    name: 'postgresql',
    description: 'PostgreSQL database operations',
    capabilities: ['query', 'schema_analysis', 'data_export'],
    config: {
      connectionString: process.env.DATABASE_URL,
      readOnly: true
    }
  }
};
```

### Using MCP Servers in Agents

```typescript
// src/agents/advanced/ResearchAgent.ts
import { BaseAgent, AgentInput, AgentResult } from '../base/BaseAgent.js';
import { MCPClient } from '../../mcp/client.js';

export class ResearchAgent extends BaseAgent {
  readonly name = 'research-agent';
  readonly description = 'Advanced research agent with MCP integration';
  readonly capabilities = ['web_search', 'academic_research', 'fact_checking'];

  private mcpClient: MCPClient;

  constructor() {
    super();
    this.mcpClient = new MCPClient();
  }

  async execute(input: AgentInput): Promise<AgentResult> {
    try {
      // Use Tavily for web search
      const searchResults = await this.mcpClient.call('tavily', 'web_search', {
        query: input.query,
        searchDepth: 'advanced',
        maxResults: 5
      });

      // Use GitHub for code examples if relevant
      let codeExamples = [];
      if (this.isCodeRelated(input.query)) {
        codeExamples = await this.mcpClient.call('github', 'search_code', {
          query: input.query,
          language: 'typescript',
          limit: 3
        });
      }

      // Combine and analyze results
      const analysis = await this.analyzeResults(searchResults, codeExamples);

      return {
        kind: 'ok',
        data: {
          content: analysis,
          sources: searchResults.sources,
          codeExamples
        }
      };

    } catch (error) {
      return {
        kind: 'error',
        code: 'mcp_execution_failed',
        message: `MCP execution failed: ${error.message}`
      };
    }
  }

  private isCodeRelated(query: string): boolean {
    const codeKeywords = ['code', 'programming', 'typescript', 'javascript', 'function', 'class'];
    return codeKeywords.some(keyword =>
      query.toLowerCase().includes(keyword)
    );
  }

  private async analyzeResults(searchResults: any, codeExamples: any[]): Promise<string> {
    // Analysis logic using ModelRouter
    return 'Analysis result...';
  }
}
```

### MCP Client Implementation

```typescript
// src/mcp/client.ts
export class MCPClient {
  private connections: Map<string, MCPConnection> = new Map();

  async call(serverName: string, method: string, params: any): Promise<any> {
    const connection = await this.getConnection(serverName);

    try {
      const result = await connection.request(method, params);
      return result;
    } catch (error) {
      throw new Error(`MCP call failed: ${serverName}.${method} - ${error.message}`);
    }
  }

  private async getConnection(serverName: string): Promise<MCPConnection> {
    if (!this.connections.has(serverName)) {
      const serverConfig = MCP_SERVERS[serverName];
      if (!serverConfig) {
        throw new Error(`Unknown MCP server: ${serverName}`);
      }

      const connection = new MCPConnection(serverConfig);
      await connection.connect();
      this.connections.set(serverName, connection);
    }

    return this.connections.get(serverName)!;
  }
}

class MCPConnection {
  constructor(private config: any) {}

  async connect(): Promise<void> {
    // Establish connection to MCP server
  }

  async request(method: string, params: any): Promise<any> {
    // Send request to MCP server
  }
}
```

## Multi-Agent Orchestration

### Workflow Definition

Define complex workflows that coordinate multiple agents:

```typescript
// src/workflows/feature-development.ts
export const featureDevelopmentWorkflow = {
  id: 'feature-development',
  name: 'Complete Feature Development',
  description: 'End-to-end feature development with multiple specialized agents',
  steps: [
    {
      id: 'requirements-analysis',
      agentName: 'research-agent',
      taskType: 'research',
      prompt: 'Analyze requirements and research best practices for: {input}',
      outputs: ['requirements', 'research_findings']
    },
    {
      id: 'architecture-design',
      agentName: 'architecture-agent',
      taskType: 'planning',
      prompt: 'Design system architecture based on requirements: {requirements}',
      inputs: ['requirements'],
      outputs: ['architecture_design', 'component_diagram']
    },
    {
      id: 'database-schema',
      agentName: 'database-agent',
      taskType: 'code-generation',
      prompt: 'Create database schema for: {architecture_design}',
      inputs: ['architecture_design'],
      outputs: ['schema_sql', 'migrations']
    },
    {
      id: 'api-development',
      agentName: 'api-agent',
      taskType: 'code-generation',
      prompt: 'Implement API endpoints for: {architecture_design}',
      inputs: ['architecture_design', 'schema_sql'],
      outputs: ['api_code', 'openapi_spec']
    },
    {
      id: 'frontend-components',
      agentName: 'frontend-agent',
      taskType: 'code-generation',
      prompt: 'Create React components for: {architecture_design}',
      inputs: ['architecture_design', 'api_code'],
      outputs: ['components', 'styles']
    },
    {
      id: 'testing-suite',
      agentName: 'testing-agent',
      taskType: 'code-generation',
      prompt: 'Generate comprehensive tests for: {api_code} and {components}',
      inputs: ['api_code', 'components'],
      outputs: ['unit_tests', 'integration_tests', 'e2e_tests']
    },
    {
      id: 'documentation',
      agentName: 'docs-agent',
      taskType: 'documentation',
      prompt: 'Create documentation for: {architecture_design}, {api_code}, {components}',
      inputs: ['architecture_design', 'api_code', 'components'],
      outputs: ['api_docs', 'user_guide', 'developer_docs']
    }
  ],
  parallelSteps: [
    ['database-schema', 'api-development'],
    ['unit_tests', 'integration_tests']
  ],
  conditions: {
    'testing-suite': 'architecture_design.complexity > "simple"',
    'documentation': 'true'
  }
};
```

### Orchestrator Enhanced Features

```typescript
// src/agents/core/Orchestrator.ts (enhanced)
export class Orchestrator extends EventEmitter {
  async executeWorkflowWithDependencies(
    workflowId: string,
    input: any,
    options: WorkflowOptions = {}
  ): Promise<AgentResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const context = new WorkflowContext(workflow, input, options);

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(workflow);

    // Execute steps based on dependencies
    const results = await this.executeWithDependencies(dependencyGraph, context);

    return this.consolidateResults(results);
  }

  private buildDependencyGraph(workflow: Workflow): DependencyGraph {
    const graph = new DependencyGraph();

    for (const step of workflow.steps) {
      graph.addNode(step.id, step);

      // Add dependencies based on inputs
      if (step.inputs) {
        for (const input of step.inputs) {
          const dependentStep = workflow.steps.find(s =>
            s.outputs?.includes(input)
          );
          if (dependentStep) {
            graph.addEdge(dependentStep.id, step.id);
          }
        }
      }
    }

    return graph;
  }

  private async executeWithDependencies(
    graph: DependencyGraph,
    context: WorkflowContext
  ): Promise<Map<string, AgentResult>> {
    const results = new Map<string, AgentResult>();
    const executed = new Set<string>();
    const inProgress = new Set<string>();

    while (executed.size < graph.size()) {
      const readySteps = graph.getReadyNodes(executed);

      if (readySteps.length === 0) {
        throw new Error('Circular dependency or deadlock detected');
      }

      // Execute ready steps in parallel
      const promises = readySteps.map(async (stepId) => {
        if (inProgress.has(stepId)) return;

        inProgress.add(stepId);
        const step = graph.getNode(stepId);
        const stepInput = this.prepareStepInput(step, results, context);

        try {
          const result = await this.executeStep(step, stepInput);
          results.set(stepId, result);
          executed.add(stepId);
          inProgress.delete(stepId);

          this.emit('stepCompleted', stepId, result);
        } catch (error) {
          inProgress.delete(stepId);
          throw error;
        }
      });

      await Promise.all(promises);
    }

    return results;
  }
}
```

### Agent Communication Patterns

```typescript
// src/patterns/agent-communication.ts
export class AgentCommunicationBus {
  private subscribers: Map<string, AgentSubscriber[]> = new Map();

  subscribe(event: string, agentId: string, handler: AgentEventHandler) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }

    this.subscribers.get(event)!.push({
      agentId,
      handler
    });
  }

  async publish(event: string, data: any, fromAgentId: string) {
    const subscribers = this.subscribers.get(event) || [];

    const promises = subscribers
      .filter(sub => sub.agentId !== fromAgentId) // Don't send to self
      .map(sub => sub.handler(data, fromAgentId));

    await Promise.all(promises);
  }
}

// Usage in agents
export class CollaborativeAgent extends BaseAgent {
  constructor(private communicationBus: AgentCommunicationBus) {
    super();
    this.setupCommunication();
  }

  private setupCommunication() {
    // Subscribe to relevant events
    this.communicationBus.subscribe(
      'research_completed',
      this.name,
      this.handleResearchCompleted.bind(this)
    );
  }

  async execute(input: AgentInput): Promise<AgentResult> {
    // Execute agent logic
    const result = await this.performTask(input);

    // Publish results for other agents
    await this.communicationBus.publish(
      'task_completed',
      { result, agentId: this.name },
      this.name
    );

    return result;
  }

  private async handleResearchCompleted(data: any, fromAgentId: string) {
    // React to research completion from another agent
    console.log(`Received research from ${fromAgentId}:`, data);
  }
}
```

## Testing Agents

### Unit Testing

```typescript
// tests/agents/WeatherAgent.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WeatherAgent } from '../../src/agents/custom/WeatherAgent.js';

describe('WeatherAgent', () => {
  let agent: WeatherAgent;
  let mockFetch: any;

  beforeEach(() => {
    agent = new WeatherAgent();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('execute()', () => {
    it('should return weather information for valid location', async () => {
      // Arrange
      const mockWeatherData = {
        name: 'London',
        main: { temp: 15, feels_like: 13, humidity: 70 },
        weather: [{ description: 'partly cloudy' }],
        wind: { speed: 3.5 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherData)
      });

      // Act
      const result = await agent.execute({
        query: 'What is the weather like in London?'
      });

      // Assert
      expect(result.kind).toBe('ok');
      expect(result.data).toBeDefined();
      expect(result.data.location).toBe('London');
      expect(result.data.weatherData).toEqual(mockWeatherData);
      expect(result.data.content).toContain('London');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      // Act
      const result = await agent.execute({
        query: 'Weather in NonexistentCity?'
      });

      // Assert
      expect(result.kind).toBe('error');
      expect(result.code).toBe('execution_failed');
      expect(result.message).toContain('Weather API error');
    });

    it('should validate input correctly', async () => {
      // Act
      const result = await agent.execute({
        query: ''
      });

      // Assert
      expect(result.kind).toBe('error');
      expect(result.code).toBe('invalid_input');
    });
  });

  describe('performance', () => {
    it('should complete execution within reasonable time', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          name: 'TestCity',
          main: { temp: 20 },
          weather: [{ description: 'sunny' }],
          wind: { speed: 1 }
        })
      });

      const startTime = Date.now();

      // Act
      const result = await agent.execute({
        query: 'Weather in TestCity?'
      });

      const executionTime = Date.now() - startTime;

      // Assert
      expect(result.kind).toBe('ok');
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.metadata?.executionTime).toBeDefined();
    });
  });
});
```

### Integration Testing

```typescript
// tests/integration/agent-orchestration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Orchestrator } from '../../src/agents/core/Orchestrator.js';
import { ResearchAgent } from '../../src/agents/advanced/ResearchAgent.js';
import { CodeAgent } from '../../src/agents/advanced/CodeAgent.js';

describe('Agent Orchestration Integration', () => {
  let orchestrator: Orchestrator;

  beforeAll(async () => {
    orchestrator = new Orchestrator();
    orchestrator.registerAgent(new ResearchAgent());
    orchestrator.registerAgent(new CodeAgent());
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should execute simple workflow with multiple agents', async () => {
    const result = await orchestrator.executeWorkflow(
      'research-implement',
      'Create a TypeScript utility function for date formatting'
    );

    expect(result.kind).toBe('ok');
    expect(result.metadata?.workflowId).toBe('research-implement');
    expect(result.metadata?.totalSteps).toBeGreaterThan(0);
  });

  it('should handle agent communication in workflows', async () => {
    const workflowEvents: any[] = [];

    orchestrator.on('stepCompleted', (stepId, result) => {
      workflowEvents.push({ stepId, result });
    });

    await orchestrator.executeWorkflow(
      'full-feature-dev',
      'Build a user authentication API'
    );

    expect(workflowEvents.length).toBeGreaterThan(2);

    // Verify that research step completed before implementation
    const researchStep = workflowEvents.find(e => e.stepId === 'research');
    const implementStep = workflowEvents.find(e => e.stepId === 'implement');

    expect(researchStep).toBeDefined();
    expect(implementStep).toBeDefined();
  });
});
```

### End-to-End Testing

```typescript
// tests/e2e/agent-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('Agent API E2E Tests', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login and get auth token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'test-password'
      }
    });

    authToken = JSON.parse(loginResponse.body).access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create and execute custom agent', async () => {
    // Create agent
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/agents',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        name: 'Test Weather Agent',
        type: 'custom',
        capabilities: ['weather_info']
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const agent = JSON.parse(createResponse.body);

    // Execute agent
    const executeResponse = await app.inject({
      method: 'POST',
      url: `/api/agents/${agent.id}/execute`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        query: 'What is the weather like today?',
        streaming: false
      }
    });

    expect(executeResponse.statusCode).toBe(200);
    const result = JSON.parse(executeResponse.body);
    expect(result.result).toBeDefined();
    expect(result.status).toBe('completed');
  });
});
```

## Deployment and Monitoring

### Docker Configuration for Agents

```dockerfile
# Dockerfile.agents
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy agent code
COPY src/agents ./src/agents
COPY src/core ./src/core
COPY src/mcp ./src/mcp

# Build
RUN npm run build

# Production stage
FROM node:22-alpine AS production
WORKDIR /app

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js

CMD ["node", "dist/main.js"]
```

### Monitoring Agent Performance

```typescript
// src/monitoring/agent-metrics.ts
import { Counter, Histogram, Gauge } from 'prom-client';

export const agentMetrics = {
  executionCount: new Counter({
    name: 'agent_executions_total',
    help: 'Total number of agent executions',
    labelNames: ['agent_name', 'status', 'workflow_id']
  }),

  executionDuration: new Histogram({
    name: 'agent_execution_duration_seconds',
    help: 'Agent execution duration in seconds',
    labelNames: ['agent_name', 'workflow_id'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
  }),

  activeAgents: new Gauge({
    name: 'active_agents_count',
    help: 'Number of currently active agents',
    labelNames: ['agent_type']
  }),

  mcpConnections: new Gauge({
    name: 'mcp_connections_active',
    help: 'Number of active MCP server connections',
    labelNames: ['server_name']
  }),

  workflowSteps: new Counter({
    name: 'workflow_steps_total',
    help: 'Total workflow steps executed',
    labelNames: ['workflow_id', 'step_id', 'status']
  })
};

export function recordAgentExecution(
  agentName: string,
  duration: number,
  status: 'success' | 'error',
  workflowId?: string
) {
  agentMetrics.executionCount.inc({
    agent_name: agentName,
    status,
    workflow_id: workflowId || 'standalone'
  });

  agentMetrics.executionDuration.observe(
    { agent_name: agentName, workflow_id: workflowId || 'standalone' },
    duration
  );
}
```

### Health Checks

```typescript
// src/health/agent-health.ts
export class AgentHealthChecker {
  async checkAgentHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkAgentRegistry(),
      this.checkMCPConnections(),
      this.checkModelProviders(),
      this.checkWorkflowEngine()
    ]);

    const results = checks.map((check, index) => ({
      name: ['agent_registry', 'mcp_connections', 'model_providers', 'workflow_engine'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: check.status === 'fulfilled' ? check.value : check.reason
    }));

    const overallHealth = results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      status: overallHealth,
      checks: results,
      timestamp: new Date().toISOString()
    };
  }

  private async checkAgentRegistry(): Promise<any> {
    // Check if agents are properly registered and responsive
    const orchestrator = new Orchestrator();
    const agentCount = orchestrator.getAgents().size;

    if (agentCount === 0) {
      throw new Error('No agents registered');
    }

    return { agentCount, status: 'ok' };
  }

  private async checkMCPConnections(): Promise<any> {
    // Check MCP server connectivity
    const mcpClient = new MCPClient();
    const serverChecks = await Promise.allSettled([
      mcpClient.call('tavily', 'health_check', {}),
      mcpClient.call('github', 'health_check', {})
    ]);

    return {
      servers: serverChecks.map((check, i) => ({
        name: ['tavily', 'github'][i],
        status: check.status === 'fulfilled' ? 'connected' : 'disconnected'
      }))
    };
  }
}
```

## Best Practices

### 1. Agent Design Principles

**Single Responsibility**: Each agent should have a clear, single purpose.

```typescript
// Good: Focused responsibility
class WeatherAgent extends BaseAgent {
  // Only handles weather-related queries
}

// Bad: Mixed responsibilities
class WeatherNewsAgent extends BaseAgent {
  // Handles both weather AND news - too broad
}
```

**Stateless Execution**: Agents should not maintain state between executions.

```typescript
// Good: Stateless
class StatelessAgent extends BaseAgent {
  async execute(input: AgentInput): Promise<AgentResult> {
    // All state is derived from input
    const result = await this.processInput(input);
    return result;
  }
}

// Bad: Stateful
class StatefulAgent extends BaseAgent {
  private previousResults: any[] = []; // Avoid this

  async execute(input: AgentInput): Promise<AgentResult> {
    // Relies on internal state
    this.previousResults.push(input);
    return this.processWithHistory();
  }
}
```

**Error Resilience**: Always handle errors gracefully.

```typescript
class ResilientAgent extends BaseAgent {
  async execute(input: AgentInput): Promise<AgentResult> {
    try {
      return await this.performTask(input);
    } catch (error) {
      // Log error for debugging
      this.logError(error, input);

      // Return meaningful error response
      return {
        kind: 'error',
        code: this.classifyError(error),
        message: this.sanitizeErrorMessage(error.message)
      };
    }
  }

  private classifyError(error: Error): string {
    if (error.name === 'ValidationError') return 'invalid_input';
    if (error.name === 'NetworkError') return 'external_service_error';
    return 'internal_error';
  }
}
```

### 2. Performance Optimization

**Caching Strategy**:

```typescript
class CachedAgent extends BaseAgent {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  async execute(input: AgentInput): Promise<AgentResult> {
    const cacheKey = this.generateCacheKey(input);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return {
        kind: 'ok',
        data: cached.result,
        metadata: { fromCache: true }
      };
    }

    const result = await this.performTask(input);

    this.cache.set(cacheKey, {
      result: result.data,
      timestamp: Date.now()
    });

    return result;
  }

  private generateCacheKey(input: AgentInput): string {
    return `${this.name}:${btoa(JSON.stringify(input))}`;
  }
}
```

**Parallel Processing**:

```typescript
class ParallelAgent extends BaseAgent {
  async execute(input: AgentInput): Promise<AgentResult> {
    // Execute multiple operations in parallel
    const [webResults, dbResults, apiResults] = await Promise.all([
      this.searchWeb(input.query),
      this.queryDatabase(input.query),
      this.callExternalAPI(input.query)
    ]);

    return {
      kind: 'ok',
      data: this.combineResults(webResults, dbResults, apiResults)
    };
  }
}
```

### 3. Security Best Practices

**Input Sanitization**:

```typescript
import DOMPurify from 'dompurify';
import validator from 'validator';

class SecureAgent extends BaseAgent {
  protected async validate(input: AgentInput): Promise<boolean> {
    // Sanitize input
    input.query = DOMPurify.sanitize(input.query, { ALLOWED_TAGS: [] });

    // Validate input length
    if (input.query.length > 10000) {
      throw new Error('Input too long');
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousContent(input.query)) {
      throw new Error('Suspicious content detected');
    }

    return super.validate(input);
  }

  private containsSuspiciousContent(text: string): boolean {
    const suspiciousPatterns = [
      /eval\s*\(/i,
      /function\s*\(/i,
      /<script/i,
      /javascript:/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }
}
```

**API Key Protection**:

```typescript
class SecureAPIAgent extends BaseAgent {
  private getAPIKey(service: string): string {
    const key = process.env[`${service.toUpperCase()}_API_KEY`];

    if (!key) {
      throw new Error(`API key for ${service} not configured`);
    }

    // Validate key format
    if (!this.validateKeyFormat(service, key)) {
      throw new Error(`Invalid API key format for ${service}`);
    }

    return key;
  }

  private validateKeyFormat(service: string, key: string): boolean {
    const formats = {
      openai: /^sk-[a-zA-Z0-9]+$/,
      anthropic: /^sk-ant-api03-[a-zA-Z0-9]+$/,
      github: /^ghp_[a-zA-Z0-9]+$/
    };

    return formats[service]?.test(key) || false;
  }
}
```

### 4. Testing Strategies

**Test Data Factories**:

```typescript
// tests/factories/agent-factory.ts
export class AgentTestFactory {
  static createTestInput(overrides: Partial<AgentInput> = {}): AgentInput {
    return {
      query: 'Test query',
      context: {},
      conversationId: 'test-conversation',
      userId: 'test-user',
      ...overrides
    };
  }

  static createMockAgent(name: string = 'test-agent'): BaseAgent {
    return {
      name,
      description: 'Test agent',
      capabilities: ['test'],
      execute: vi.fn().mockResolvedValue({
        kind: 'ok',
        data: { content: 'Test response' }
      })
    } as any;
  }
}
```

**Mock Utilities**:

```typescript
// tests/utils/mock-utils.ts
export class MockUtils {
  static mockMCPServer(serverName: string, responses: Record<string, any>) {
    const mockClient = {
      call: vi.fn().mockImplementation((server, method, params) => {
        if (server === serverName && responses[method]) {
          return Promise.resolve(responses[method]);
        }
        return Promise.reject(new Error(`Mock not configured for ${server}.${method}`));
      })
    };

    return mockClient;
  }

  static mockModelRouter(responses: Record<string, string>) {
    return {
      execute: vi.fn().mockImplementation((taskType, prompt, options) => {
        const response = responses[taskType] || responses['default'];
        return Promise.resolve({
          content: response,
          provider: 'mock',
          executionTime: 100
        });
      })
    };
  }
}
```

## Examples and Templates

### Template: Basic Agent

```typescript
// templates/basic-agent.template.ts
import { BaseAgent, AgentInput, AgentResult } from '../base/BaseAgent.js';

export class BasicAgentTemplate extends BaseAgent {
  readonly name = 'template-agent';
  readonly description = 'Template for creating new agents';
  readonly capabilities = ['template_capability'];

  async execute(input: AgentInput): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // 1. Validate input
      if (!await this.validate(input)) {
        return this.createErrorResult('invalid_input', 'Invalid input provided');
      }

      // 2. Transform input if needed
      const processedInput = await this.transform(input);

      // 3. Execute main logic
      const result = await this.performMainTask(processedInput);

      // 4. Return success result
      return {
        kind: 'ok',
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          agentName: this.name
        }
      };

    } catch (error) {
      // 5. Handle errors
      const result = this.createErrorResult('execution_failed', error.message);
      await this.logExecution(input, result, Date.now() - startTime);
      return result;
    }
  }

  private async performMainTask(input: AgentInput): Promise<any> {
    // TODO: Implement main agent logic
    throw new Error('Not implemented');
  }

  private createErrorResult(code: string, message: string): AgentResult {
    return {
      kind: 'error',
      code,
      message,
      metadata: {
        agentName: this.name,
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

### Template: MCP-Enabled Agent

```typescript
// templates/mcp-agent.template.ts
import { BaseAgent, AgentInput, AgentResult } from '../base/BaseAgent.js';
import { MCPClient } from '../../mcp/client.js';

export class MCPAgentTemplate extends BaseAgent {
  readonly name = 'mcp-template-agent';
  readonly description = 'Template for MCP-enabled agents';
  readonly capabilities = ['mcp_integration'];

  private mcpClient: MCPClient;

  constructor() {
    super();
    this.mcpClient = new MCPClient();
  }

  async execute(input: AgentInput): Promise<AgentResult> {
    try {
      // 1. Determine required MCP operations
      const mcpOperations = await this.planMCPOperations(input);

      // 2. Execute MCP operations
      const mcpResults = await this.executeMCPOperations(mcpOperations);

      // 3. Process and combine results
      const finalResult = await this.processMCPResults(mcpResults, input);

      return {
        kind: 'ok',
        data: finalResult,
        metadata: {
          mcpOperations: mcpOperations.length,
          serversUsed: [...new Set(mcpOperations.map(op => op.server))]
        }
      };

    } catch (error) {
      return {
        kind: 'error',
        code: 'mcp_execution_failed',
        message: `MCP execution failed: ${error.message}`
      };
    }
  }

  private async planMCPOperations(input: AgentInput): Promise<MCPOperation[]> {
    // TODO: Determine which MCP servers and methods to call
    return [];
  }

  private async executeMCPOperations(operations: MCPOperation[]): Promise<any[]> {
    const results = await Promise.allSettled(
      operations.map(op =>
        this.mcpClient.call(op.server, op.method, op.params)
      )
    );

    return results.map((result, index) => ({
      operation: operations[index],
      result: result.status === 'fulfilled' ? result.value : result.reason
    }));
  }

  private async processMCPResults(results: any[], input: AgentInput): Promise<any> {
    // TODO: Process and combine MCP results
    return { results, processedAt: new Date().toISOString() };
  }
}

interface MCPOperation {
  server: string;
  method: string;
  params: any;
}
```

### Template: Workflow Agent

```typescript
// templates/workflow-agent.template.ts
import { BaseAgent, AgentInput, AgentResult } from '../base/BaseAgent.js';
import { Orchestrator } from '../core/Orchestrator.js';

export class WorkflowAgentTemplate extends BaseAgent {
  readonly name = 'workflow-template-agent';
  readonly description = 'Template for workflow-orchestrating agents';
  readonly capabilities = ['workflow_orchestration'];

  private orchestrator: Orchestrator;

  constructor() {
    super();
    this.orchestrator = new Orchestrator();
  }

  async execute(input: AgentInput): Promise<AgentResult> {
    try {
      // 1. Analyze input to determine workflow
      const workflowId = await this.selectWorkflow(input);

      // 2. Prepare workflow input
      const workflowInput = await this.prepareWorkflowInput(input);

      // 3. Execute workflow
      const workflowResult = await this.orchestrator.executeWorkflow(
        workflowId,
        workflowInput
      );

      // 4. Post-process results
      const finalResult = await this.postProcessWorkflowResult(workflowResult);

      return {
        kind: 'ok',
        data: finalResult,
        metadata: {
          workflowId,
          workflowSteps: workflowResult.metadata?.totalSteps,
          executionTime: workflowResult.metadata?.executionTime
        }
      };

    } catch (error) {
      return {
        kind: 'error',
        code: 'workflow_execution_failed',
        message: `Workflow execution failed: ${error.message}`
      };
    }
  }

  private async selectWorkflow(input: AgentInput): Promise<string> {
    // TODO: Implement workflow selection logic
    // Analyze input to determine which workflow to use
    return 'default-workflow';
  }

  private async prepareWorkflowInput(input: AgentInput): Promise<any> {
    // TODO: Transform agent input into workflow input format
    return {
      query: input.query,
      context: input.context,
      metadata: {
        agentName: this.name,
        timestamp: new Date().toISOString()
      }
    };
  }

  private async postProcessWorkflowResult(workflowResult: AgentResult): Promise<any> {
    // TODO: Process workflow results for final output
    return {
      content: 'Workflow completed successfully',
      workflowData: workflowResult.data,
      summary: 'Generated summary of workflow execution'
    };
  }
}
```

## Conclusion

This comprehensive guide provides everything you need to develop sophisticated AI agents for the Cartrita McDaniels Suarez platform. Key takeaways:

### Development Checklist

- [ ] **Agent Design**: Single responsibility, stateless, error-resilient
- [ ] **Configuration**: Use standardized configuration schema
- [ ] **MCP Integration**: Leverage MCP servers for external capabilities
- [ ] **Testing**: Comprehensive unit, integration, and E2E tests
- [ ] **Monitoring**: Implement metrics and health checks
- [ ] **Security**: Input validation, API key protection, safe execution
- [ ] **Documentation**: Document agent capabilities and usage

### Next Steps

1. **Start Simple**: Begin with basic agent templates
2. **Add Capabilities**: Integrate MCP servers for enhanced functionality
3. **Build Workflows**: Create multi-agent orchestration patterns
4. **Test Thoroughly**: Implement comprehensive testing strategies
5. **Monitor Performance**: Set up metrics and alerting
6. **Scale Gradually**: Deploy and monitor in production

### Additional Resources

- [API Documentation](../api/README.md)
- [Architecture Guide](../architecture/system-design.md)
- [MCP Integration Guide](../guides/mcp-integration.md)
- [Deployment Guide](../deployment/production.md)
- [Troubleshooting Guide](../troubleshooting/common-issues.md)

The platform's modular architecture enables rapid development of specialized agents while maintaining consistency and reliability across the entire system.
