# Cartrita AI Agents Architecture

## Overview

The Cartrita AI Agents system implements a sophisticated multi-agent architecture based on hierarchical orchestration patterns using Node.js and TypeScript. The system uses an orchestrator-agent model where a central orchestrator coordinates specialized agents for different tasks.

## Architecture Components

### 1. Agent Orchestrator (`src/core/Orchestrator.ts`)

The orchestrator serves as the central coordinator and uses modern AI APIs to:

- **Agent Selection**: Intelligently routes user requests to appropriate specialized agents
- **Task Coordination**: Manages complex multi-step tasks across different agents
- **Response Synthesis**: Combines responses from multiple agents when needed
- **Fallback Handling**: Provides direct responses when no specialized agent is suitable

**Key Features:**

- Hierarchical task delegation using TypeScript interfaces
- Multi-agent conversation management
- Dynamic agent selection using AI reasoning
- Comprehensive error handling and fallback mechanisms

### 2. Base Agent System

#### Base Agent Interface (`src/agents/base/BaseAgent.ts`)

All agents extend the `BaseAgent` abstract class which provides:

```typescript
export abstract class BaseAgent {
  abstract readonly name: string;
  abstract execute(input: AgentInput): Promise<AgentResult>;
}

export type AgentResult = 
  | { kind: 'ok'; data: unknown }
  | { kind: 'error'; code: string; message: string };
```

### 3. Specialized Agent Types

#### Research Agent

- **Purpose**: Web search, information gathering, and research tasks

- **Implementation**: TypeScript with external API integrations

- **Capabilities:**

  - Academic research and fact-checking
  - Market analysis and trend research
  - Technical documentation research
  - Real-time information gathering via Tavily/SerpAPI

#### Code Agent

- **Purpose**: Code generation, analysis, and programming tasks

- **Implementation**: TypeScript with AI model integration

- **Capabilities**:

  - Multi-language code generation
  - Code review and optimization
  - Bug fixing and debugging
  - Architecture design and documentation

#### Knowledge Agent

- **Purpose**: Information retrieval from knowledge bases

- **Implementation**: TypeScript with vector database integration (pgvector)

- **Capabilities**:

  - RAG-based document search
  - Knowledge base query optimization
  - Context-aware information retrieval
  - Document similarity analysis

#### Task Agent

- **Purpose**: Task planning and project management

- **Implementation**: TypeScript for structured planning

- **Capabilities**:

  - Project breakdown and planning
  - Dependency analysis and timeline creation
  - Risk assessment and mitigation
  - Resource allocation and optimization

## Implementation Details

### Agent Initialization

All agents are dynamically initialized by the orchestrator with proper error handling:

```typescript
interface AgentRegistry {
  research: ResearchAgent;
  code: CodeAgent;
  knowledge: KnowledgeAgent;
  task: TaskAgent;
}

class AgentOrchestrator {
  private agents: AgentRegistry;

  constructor() {
    this.agents = this.initializeAgents();
  }

  private initializeAgents(): AgentRegistry {
    try {
      return {
        research: new ResearchAgent(),
        code: new CodeAgent(),
        knowledge: new KnowledgeAgent(),
        task: new TaskAgent(),
      };
    } catch (error) {
      logger.error('Failed to initialize agents:', error);
      throw new Error('Agent initialization failed');
    }
  }
}
```

### Agent Selection Logic

The orchestrator uses AI models to intelligently route requests:

```typescript
async selectAppropriateAgent(
  input: string
): Promise<keyof AgentRegistry | null> {
  // Analyzes user request and selects optimal agent
  // Falls back to direct response if no agent matches
  const analysis = await this.analyzeRequest(input);
  return analysis.recommendedAgent;
}
```

### Configuration Management

Each agent is configured with appropriate models and API keys from environment variables:

```typescript
interface AgentConfig {
  openaiApiKey: string;
  anthropicApiKey?: string;
  tavilyApiKey?: string;
  deepgramApiKey?: string;
}

const config: AgentConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  tavilyApiKey: process.env.TAVILY_API_KEY,
  deepgramApiKey: process.env.DEEPGRAM_API_KEY,
};
```

## Multi-Agent Workflow

### 1. Request Processing

1. User submits request via REST API or WebSocket
2. Orchestrator receives and analyzes request
3. AI model determines optimal agent selection
4. Request is routed to appropriate specialized agent

### 2. Agent Execution

1. Specialized agent processes request using domain-specific logic
2. Agent leverages appropriate tools and external APIs
3. Response is generated with structured result format
4. Results are returned to orchestrator

### 3. Response Coordination

1. Orchestrator receives agent response
2. Additional processing or agent coordination if needed
3. Final response is formatted and returned to user
4. Conversation state is persisted to PostgreSQL database

## Error Handling & Resilience

### Graceful Degradation

- Import failures don't crash the system
- Missing agents trigger fallback responses
- Configuration errors are logged and handled

### Retry Logic

- Failed agent calls are retried with exponential backoff
- Alternative agents can be selected for similar tasks
- Supervisor provides direct responses when agents fail

### Monitoring & Observability

- Comprehensive structured logging with correlation IDs
- Agent performance metrics and execution times
- Error tracking and debugging information

## Benefits of This Architecture

### 1. Scalability

- New agents can be added without modifying existing code
- Horizontal scaling through multiple orchestrator instances
- Independent agent deployment and versioning
- TypeScript provides compile-time guarantees for scaling

### 2. Maintainability

- Clear separation of concerns between agents
- Modular design enables independent development
- Standardized TypeScript interfaces and lifecycle management
- Strong typing reduces runtime errors

### 3. Flexibility

- Dynamic agent selection based on request analysis
- Multi-agent coordination for complex tasks
- Easy configuration through environment variables
- Plugin-style architecture for custom agents

### 4. Reliability

- Robust error handling and fallback mechanisms
- Health monitoring and automatic recovery
- Graceful degradation under failure conditions
- PostgreSQL provides ACID compliance for data integrity

## Configuration

Agents are configured through environment variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/cartrita_ai_agents"

# AI Model Configuration
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-api03-...

# External Service Keys
TAVILY_API_KEY=tvly-...
DEEPGRAM_API_KEY=...
GITHUB_TOKEN=ghp_...

# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

## Monitoring & Debugging

The system provides comprehensive logging and monitoring:

- **Structured Logging**: All agent activities logged with structured data using modern logging libraries
- **Execution Metrics**: Performance tracking for agent selection and execution
- **Error Tracking**: Detailed error information for debugging with stack traces
- **Health Checks**: Agent availability and status monitoring via REST endpoints
- **Database Monitoring**: PostgreSQL performance and query analysis

## Future Enhancements

- **Agent Learning**: Implement feedback loops for improving agent selection
- **Dynamic Scaling**: Auto-scaling based on load and performance
- **Advanced Coordination**: Multi-agent collaboration patterns
- **Custom Agents**: Plugin system for user-defined agents
- **Performance Optimization**: Caching with Redis and parallel execution
- **Real-time Communication**: WebSocket-based agent streaming
- **AI Model Flexibility**: Support for multiple AI providers (OpenAI, Anthropic, local models)

## Related Documentation

- [Engineering Playbook](../operations/ENGINEERING_PLAYBOOK.md) - Complete technical implementation guide
- [MCP Server Setup](../operations/MCP_SERVER_SETUP.md) - Model Context Protocol server configuration
- [Installation Guide](../operations/INSTALLATION_AND_INTEGRATION_GUIDE.md) - Step-by-step setup instructions

---

This architecture provides a robust foundation for building sophisticated AI applications with specialized capabilities while maintaining system reliability and user experience using modern TypeScript and Node.js technologies.
