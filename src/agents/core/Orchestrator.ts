import type { BaseAgent, AgentInput, AgentResult, AgentMetrics } from '../base/BaseAgent.js';
import { ModelRouter, type ModelProvider, type ModelResponse, type TaskType } from '../../core/ModelRouter.js';
import { FrontendAgent } from '../advanced/FrontendAgent.js';
import { APIAgent } from '../advanced/APIAgent.js';
import { DocsAgent } from '../advanced/DocsAgent.js';
import { CodebaseInspectorAgent } from '../advanced/CodebaseInspectorAgent.js';
import { McpIntegrationAgent } from '../advanced/McpIntegrationAgent.js';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: Date;
  stepId?: string;
  executionTime?: number;
  retryCount?: number;
  agentMetrics?: AgentMetrics;
}

interface ExecutionMetadata {
  startTime: number;
  [key: string]: unknown;
}

interface WorkflowExecutionRecord {
  timestamp: Date;
  input: unknown;
  result: AgentResult;
}

export interface WorkflowStep {
  id: string;
  agentName?: string;
  taskType: TaskType;
  prompt: string;
  condition?: (previousResult: ExecutionResult) => boolean;
  retries?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

interface AgentConfigEntry {
  model: string;
  systemPrompt: string;
  allowedTools?: string[];
  workingDirectory?: string;
}

interface AgentConfigFile {
  project: {
    name: string;
    description: string;
    version?: string;
  };
  agents: Record<string, AgentConfigEntry>;
}

interface AutomationTaskDefinition {
  agentKey: string;
  agentName: string;
  taskType: TaskType;
  promptBuilder: (featureDescription: string) => string;
}

interface AutomationTask extends AutomationTaskDefinition {
  prompt: string;
}

export interface OrchestratorSummary {
  registeredAgents: number;
  registeredWorkflows: number;
  executionHistory: Array<{
    workflowId: string;
    totalExecutions: number;
    lastExecution: Date | undefined;
  }>;
}

export interface OrchestratorMetrics {
  orchestrator: OrchestratorSummary;
  agents: Record<string, AgentMetrics>;
  agentHealth: Record<string, ReturnType<BaseAgent['getHealth']>>;
  systemHealth: SystemHealthSummary;
}

export interface SystemHealthSummary {
  status: 'healthy' | 'degraded' | 'unhealthy';
  healthyAgents: number;
  degradedAgents: number;
  unhealthyAgents: number;
  issues: string[];
}

export interface AutomationRunResult {
  agent: string;
  agentKey: string;
  taskType: TaskType;
  provider: ModelProvider;
  output: string;
  usage?: ModelResponse['usage'];
}

const AUTOMATION_DOC_REFERENCES = [
  'instructions/claude-automation-project.md#phase-2-claude-agent-orchestration-setup',
  'instructions/aurora-interface-complete.md#how-to-use-your-multi-agent-system',
  'PROJECT_LAUNCH_SUCCESS.md#🚀-start-building-with-agent-orchestrator'
];

const AUTOMATION_TASK_DEFINITIONS: AutomationTaskDefinition[] = [
  {
    agentKey: 'frontend',
    agentName: 'frontend-agent',
    taskType: 'code-generation',
    promptBuilder: (feature) => `Feature Brief: ${feature}

You are responsible for all React UI, layout, and styling aspects of this feature. Produce a complete delivery plan that includes:
- A concise analysis of UX goals and states.
- Proposed component tree and file structure (with folder paths under aurora-interface/frontend/src).
- Tailwind utility classes that apply the Aurora color system (Claude Orange, Microsoft Blue, ChatGPT Purple).
- At least two representative TypeScript React component implementations with full code samples.
- Integration notes for data dependencies, hooks, and shared state.

Respond in Markdown with headings: Overview, Component Plan, File Map, Code Samples, Integration Notes. Use TypeScript in code blocks.`
  },
  {
    agentKey: 'api',
    agentName: 'api-agent',
    taskType: 'code-generation',
    promptBuilder: (feature) => `Feature Brief: ${feature}

Design and describe the Fastify API surface needed to power this feature. Include:
- REST endpoint specifications with methods, routes, request/response schemas.
- Security, validation, and error handling considerations.
- Required service layers, Drizzle models, and integration points with the database.
- Example TypeScript implementations for one route handler and corresponding schema definitions.

Structure the response with headings: API Overview, Endpoints, Validation & Security, Example Implementation, Integration Checklist.`
  },
  {
    agentKey: 'sql',
    agentName: 'sql-agent',
    taskType: 'planning',
    promptBuilder: (feature) => `Feature Brief: ${feature}

Produce the database design required for this capability. Deliver:
- Entity relationship outline and data flow notes.
- Drizzle schema or migration snippets for new/updated tables.
- Indexing and performance considerations.
- Sample queries showcasing create/read/update/delete flows.

Respond with headings: Data Model, Schema Changes, Performance Considerations, Sample Queries.`
  },
  {
    agentKey: 'backend-db',
    agentName: 'backend-db-agent',
    taskType: 'code-generation',
    promptBuilder: (feature) => `Feature Brief: ${feature}

Create the data access layer instructions. Include:
- Repository/service abstractions that interact with Drizzle.
- Caching strategies (if applicable) and transaction handling guidance.
- Example TypeScript implementations for critical operations.
- Error handling and observability hooks (logging/metrics).

Return Markdown sections: Data Access Strategy, Services & Repositories, Example Code, Operational Notes.`
  },
  {
    agentKey: 'codewriter',
    agentName: 'codewriter-agent',
    taskType: 'code-generation',
    promptBuilder: (feature) => `Feature Brief: ${feature}

Summarize the core business logic and shared utilities required. Provide:
- Pure TypeScript utility functions or hooks supporting the feature.
- Error handling patterns and domain models.
- Unit-testable logic snippets with Jest/Vitest style examples.

Organize output into: Domain Overview, Utilities & Hooks, Code Samples, Test Recommendations.`
  },
  {
    agentKey: 'documentation',
    agentName: 'docs-agent',
    taskType: 'documentation',
    promptBuilder: (feature) => `Feature Brief: ${feature}

Draft the documentation package covering:
- Executive summary for stakeholders.
- Developer setup and integration instructions.
- API and UI usage notes referencing outputs from other agents.
- Testing checklist and acceptance criteria.

Respond with headings: Summary, Developer Guide, API Notes, UI Notes, Testing Checklist.`
  },
  {
    agentKey: 'testing',
    agentName: 'testing-agent',
    taskType: 'testing',
    promptBuilder: (feature) => `Feature Brief: ${feature}

Design the comprehensive testing strategy. Include:
- Unit, integration, and Playwright end-to-end scenarios.
- Test data requirements and mocking strategies.
- Coverage goals and quality gates.
- Example test cases or code snippets.

Return Markdown sections: Testing Strategy, Test Plans, Example Tests, Coverage & Quality Gates.`
  }
];

export interface ExecutionContext {
  workflowId?: string;
  stepId?: string;
  previousResults: ExecutionResult[];
  metadata: ExecutionMetadata;
}

export class Orchestrator extends EventEmitter {
  private agents: Map<string, BaseAgent> = new Map();
  private modelRouter: ModelRouter;
  private workflows: Map<string, Workflow> = new Map();
  private executionHistory: Map<string, WorkflowExecutionRecord[]> = new Map();
  private agentConfigCache?: AgentConfigFile;
  private automationDocContext?: string;

  constructor() {
    super();
    this.modelRouter = new ModelRouter();
    this.setupDefaultWorkflows();
    this.setupContext7Agents();
  }

  private setupContext7Agents() {
    // Register the three specialized Context7-enabled agents
    this.registerAgent(new FrontendAgent());
    this.registerAgent(new APIAgent());
    this.registerAgent(new DocsAgent());

    // Register new codebase inspection agents
    this.registerAgent(new CodebaseInspectorAgent());
    this.registerAgent(new McpIntegrationAgent());

    this.emit('context7AgentsRegistered', {
      agents: ['frontend-agent', 'api-agent', 'docs-agent', 'codebase-inspector', 'mcp-integration'],
      capabilities: {
        'frontend-agent': 'React, TypeScript, Tailwind CSS, Aurora UI, Accessibility',
        'api-agent': 'Fastify, REST APIs, Database, Security, OpenAPI docs',
        'docs-agent': 'Technical writing, API docs, User guides, Tutorials',
        'codebase-inspector': 'Security analysis, Performance auditing, Architecture review, Dependency scanning',
        'mcp-integration': 'GitHub analysis, Memory operations, Web search, Filesystem monitoring, Context7 enhancement'
      }
    });
  }

  registerAgent(agent: BaseAgent) {
    this.agents.set(agent.name, agent);
    this.emit('agentRegistered', agent.name);
  }

  registerWorkflow(workflow: Workflow) {
    this.workflows.set(workflow.id, workflow);
    this.emit('workflowRegistered', workflow.id);
  }

  async delegate(agentName: string, input: AgentInput): Promise<AgentResult> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      return {
        kind: 'error',
        code: 'agent_not_found',
        message: `Agent '${agentName}' is not registered.`,
        category: 'validation',
        retryable: false
      };
    }

    try {
      // Enhanced logging with agent health status
      const healthStatus = agent.getHealth();
      this.emit('agentExecutionStarted', {
        agentName,
        input: this.sanitizeInput(input),
        agentHealth: healthStatus,
        timestamp: new Date().toISOString()
      });

      const result = await agent.execute(input);

      // Collect post-execution metrics
      const postExecutionMetrics = agent.getMetrics();
      this.emit('agentExecutionCompleted', {
        agentName,
        result: result.kind,
        metrics: postExecutionMetrics,
        executionTime: result.executionTime,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      this.emit('agentExecutionError', {
        agentName,
        error: error instanceof Error ? error.message : String(error),
        agentHealth: agent.getHealth(),
        timestamp: new Date().toISOString()
      });

      return {
        kind: 'error',
        code: 'orchestrator_execution_failed',
        message: `Orchestrator execution failed: ${error}`,
        category: 'execution',
        retryable: true
      };
    }
  }

  private sanitizeInput(input: AgentInput): Record<string, unknown> {
    const sanitized: Record<string, unknown> = { ...input };
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credentials'];
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        delete sanitized[key];
      }
    }
    return sanitized;
  }

  private normalizeAgentInput(value: unknown): AgentInput {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as AgentInput;
    }

    return { input: value };
  }

  /**
   * Intelligently analyze request and select optimal approach
   */
  async analyzeAndRoute(input: string): Promise<{
    approach: 'agent' | 'direct' | 'workflow';
    recommendation: string;
    confidence: number;
  }> {
    const analysisPrompt = `
    Analyze this user request and determine the best approach:
    Request: "${input}"
    
    Available agents: ${Array.from(this.agents.keys()).join(', ')}
    Available workflows: ${Array.from(this.workflows.keys()).join(', ')}
    
    Respond with JSON:
    {
      "approach": "agent|direct|workflow",
      "recommendation": "specific agent name, workflow id, or 'direct'",
      "confidence": 0.0-1.0,
      "reasoning": "brief explanation"
    }`;

    try {
      const response = await this.modelRouter.execute(
        'planning',
        analysisPrompt,
        {
          systemPrompt: 'You are an intelligent task router. Analyze requests and recommend the best execution approach.',
          maxTokens: 500,
          temperature: 0.3
        }
      );

      const analysis = JSON.parse(response.content);
      return analysis;
    } catch (_error) {
      // Fallback to simple routing
      return {
        approach: 'direct',
        recommendation: 'direct',
        confidence: 0.5
      };
    }
  }

  /**
   * Execute complex multi-step workflows with intelligent model routing
   */
  async executeWorkflow(workflowId: string, initialInput: unknown): Promise<AgentResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return {
        kind: 'error',
        code: 'workflow_not_found',
        message: `Workflow '${workflowId}' not found`,
        category: 'validation',
        retryable: false
      };
    }

    const context: ExecutionContext = {
      workflowId,
      previousResults: [],
      metadata: { startTime: Date.now() }
    };

    this.emit('workflowStarted', workflowId, initialInput);

    let currentInput: unknown = initialInput;

    for (const step of workflow.steps) {
      context.stepId = step.id;
      
      // Check step condition based on previous result
      const lastResult = context.previousResults[context.previousResults.length - 1];
      if (step.condition && lastResult && !step.condition(lastResult)) {
        continue;
      }

      try {
        this.emit('stepStarted', workflowId, step.id);
        
        let result: AgentResult;
        if (step.agentName) {
          // Execute with specific agent
          const agent = this.agents.get(step.agentName);
          if (!agent) {
            throw new Error(`Agent '${step.agentName}' not found`);
          }
          const agentInput = this.normalizeAgentInput(currentInput);
          result = await agent.execute(agentInput);
        } else {
          // Execute with optimal model via router
          const modelResponse = await this.modelRouter.execute(
            step.taskType,
            typeof currentInput === 'string' ? currentInput : JSON.stringify(currentInput),
            {
              systemPrompt: step.prompt,
              context: { responseLength: 'medium' }
            }
          );
          result = {
            kind: 'ok',
            data: modelResponse.content,
            executionTime: modelResponse.executionTime,
            metadata: {
              provider: modelResponse.provider,
              usage: modelResponse.usage
            }
          };
        }

        if (result.kind === 'error') {
          // Retry logic
          const retries = step.retries || 0;
          if (retries > 0) {
            // Implement retry with exponential backoff
            // For now, just fail
          }
          this.emit('stepError', workflowId, step.id, result);
          return result;
        }

        const executionResult: ExecutionResult = {
          success: true,
          data: result.data,
          timestamp: new Date(),
          stepId: step.id,
          ...(typeof result.executionTime === 'number' ? { executionTime: result.executionTime } : {})
        };
        
        context.previousResults.push(executionResult);
        if (result.kind === 'ok') {
          currentInput = result.data;
        }
        this.emit('stepCompleted', workflowId, step.id, result);

      } catch (error) {
        this.emit('stepError', workflowId, step.id, error);
        return {
          kind: 'error',
          code: 'step_execution_failed',
          message: `Step ${step.id} failed: ${error instanceof Error ? error.message : String(error)}`,
          category: 'execution',
          retryable: true,
          metadata: {
            stepId: step.id
          }
        };
      }
    }

    const totalExecutionTime = Date.now() - context.metadata.startTime;
    const finalResult: AgentResult = {
      kind: 'ok',
      data: currentInput,
      executionTime: totalExecutionTime,
      metadata: {
        workflowId,
        totalSteps: workflow.steps.length,
        results: context.previousResults
      }
    };

    this.emit('workflowCompleted', workflowId, finalResult);
    
    // Store execution history
    if (!this.executionHistory.has(workflowId)) {
      this.executionHistory.set(workflowId, []);
    }
    this.executionHistory.get(workflowId)?.push({
      timestamp: new Date(),
      input: initialInput,
      result: finalResult
    });

    return finalResult;
  }

  /**
   * Smart execution that automatically chooses the best approach
   */
  async smartExecute(input: string): Promise<AgentResult> {
    try {
      const routing = await this.analyzeAndRoute(input);
      
      switch (routing.approach) {
        case 'agent':
          return await this.delegate(routing.recommendation, { query: input });
        
        case 'workflow':
          return await this.executeWorkflow(routing.recommendation, input);
        default: {
          // Direct AI model execution
          const response = await this.modelRouter.execute(
            'planning', // Default task type
            input,
            {
              systemPrompt: 'You are a helpful AI assistant. Provide accurate and helpful responses.',
              context: { responseLength: 'medium' }
            }
          );
          
          return {
            kind: 'ok',
            data: response.content
          };
        }
      }
    } catch (error) {
      return {
        kind: 'error',
        code: 'smart_execution_failed',
        message: `Smart execution failed: ${error instanceof Error ? error.message : String(error)}`,
        category: 'execution',
        retryable: true
      };
    }
  }

  private async loadAgentConfig(): Promise<AgentConfigFile> {
    if (this.agentConfigCache) {
      return this.agentConfigCache;
    }

    const candidatePaths = [
      path.resolve(process.cwd(), 'claude-agents.config.json'),
      path.resolve(process.cwd(), '../claude-agents.config.json'),
      path.resolve(process.cwd(), '../../claude-agents.config.json')
    ];

    for (const candidate of candidatePaths) {
      try {
        const raw = await readFile(candidate, 'utf-8');
        const parsed = JSON.parse(raw) as AgentConfigFile;
        if (parsed?.agents) {
          this.agentConfigCache = parsed;
          return parsed;
        }
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ENOENT') {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Unable to load claude-agents.config.json. Ensure the automation config exists at the project root.');
  }

  private getAutomationDocContext(): string {
    if (!this.automationDocContext) {
      const references = AUTOMATION_DOC_REFERENCES.map(ref => `- ${ref}`).join('\n');
      this.automationDocContext = `You are operating within the Aurora Interface multi-agent automation environment. Coordinate with sibling agents, reference Context7 research, and follow the automation playbooks located at:\n${references}\nReturn actionable, implementation-ready outputs for the engineering team.`;
    }
    return this.automationDocContext;
  }

  private buildAutomationTasks(featureDescription: string, config: AgentConfigFile): AutomationTask[] {
    return AUTOMATION_TASK_DEFINITIONS
      .filter(def => Boolean(config.agents[def.agentKey]))
      .map(def => ({
        ...def,
        prompt: def.promptBuilder(featureDescription)
      }));
  }

  async automateFeatureDevelopment(featureDescription: string): Promise<AutomationRunResult[]> {
    if (!featureDescription || featureDescription.trim().length === 0) {
      throw new Error('Feature description is required to run automated multi-agent development.');
    }

    const config = await this.loadAgentConfig();
    const tasks = this.buildAutomationTasks(featureDescription, config);
    const systemContext = this.getAutomationDocContext();
    const results: AutomationRunResult[] = [];

    this.emit('automationStarted', {
      featureDescription,
      agents: tasks.map(task => task.agentName)
    });

    for (const task of tasks) {
      const agentConfig = config.agents[task.agentKey];
      if (!agentConfig) {
        continue;
      }

      try {
        this.emit('automationTaskStarted', {
          agent: task.agentName,
          featureDescription,
          taskType: task.taskType
        });

        const response = await this.modelRouter.execute(
          task.taskType,
          task.prompt,
          {
            systemPrompt: `${agentConfig.systemPrompt}\n\n${systemContext}\nCoordinate with all sibling agents and call out dependencies explicitly. Provide outputs ready for implementation, with code samples where relevant.`,
            maxTokens: 2800,
            temperature: 0.25,
            context: { responseLength: 'long', codeComplexity: 'high' }
          }
        );

        const automationResult: AutomationRunResult = {
          agent: task.agentName,
          agentKey: task.agentKey,
          taskType: task.taskType,
          provider: response.provider,
          output: response.content,
          usage: response.usage
        };

        results.push(automationResult);
        this.emit('automationTaskCompleted', automationResult);
      } catch (error) {
        const automationResult: AutomationRunResult = {
          agent: task.agentName,
          agentKey: task.agentKey,
          taskType: task.taskType,
          provider: 'anthropic',
          output: `Automation task failed: ${String(error)}`,
          usage: undefined
        };

        results.push(automationResult);
        this.emit('automationTaskError', {
          agent: task.agentName,
          featureDescription,
          error
        });
      }
    }

    this.emit('automationCompleted', {
      featureDescription,
      results
    });

    return results;
  }

  private setupDefaultWorkflows() {
    // Code Review Workflow
    this.registerWorkflow({
      id: 'code-review',
      name: 'Comprehensive Code Review',
      description: 'Multi-step code analysis and review process',
      steps: [
        {
          id: 'analyze',
          taskType: 'code-analysis',
          prompt: 'Analyze this code for potential issues, bugs, and improvements:'
        },
        {
          id: 'security',
          taskType: 'code-analysis', 
          prompt: 'Review this code specifically for security vulnerabilities:'
        },
        {
          id: 'optimization',
          taskType: 'optimization',
          prompt: 'Suggest performance optimizations for this code:'
        },
        {
          id: 'synthesis',
          taskType: 'documentation',
          prompt: 'Synthesize the previous analysis into a comprehensive code review report:'
        }
      ]
    });

    // Research and Implementation Workflow
    this.registerWorkflow({
      id: 'research-implement',
      name: 'Research and Implementation',
      description: 'Research a topic and generate implementation',
      steps: [
        {
          id: 'research',
          taskType: 'research',
          prompt: 'Research this topic thoroughly and gather relevant information:'
        },
        {
          id: 'plan',
          taskType: 'planning',
          prompt: 'Create an implementation plan based on the research:'
        },
        {
          id: 'implement',
          taskType: 'code-generation',
          prompt: 'Generate code implementation based on the plan:'
        },
        {
          id: 'document',
          taskType: 'documentation',
          prompt: 'Create documentation for the implementation:'
        }
      ]
    });

    // Full Feature Development Workflow
    this.registerWorkflow({
      id: 'full-feature-dev',
      name: 'Complete Feature Development',
      description: 'End-to-end feature development from requirements to deployment',
      steps: [
        {
          id: 'requirements',
          taskType: 'research',
          prompt: 'Analyze and document detailed requirements for this feature:'
        },
        {
          id: 'architecture',
          taskType: 'planning',
          prompt: 'Design system architecture and component structure:'
        },
        {
          id: 'database-design',
          taskType: 'code-generation',
          prompt: 'Generate database schemas and migration scripts:'
        },
        {
          id: 'api-endpoints',
          taskType: 'code-generation',
          prompt: 'Create API endpoints and business logic:'
        },
        {
          id: 'frontend-components',
          taskType: 'code-generation',
          prompt: 'Build frontend components and user interface:'
        },
        {
          id: 'test-suite',
          taskType: 'code-generation',
          prompt: 'Generate comprehensive test suite (unit, integration, e2e):'
        },
        {
          id: 'documentation',
          taskType: 'documentation',
          prompt: 'Create comprehensive feature documentation and API docs:'
        },
        {
          id: 'deployment-config',
          taskType: 'code-generation',
          prompt: 'Generate deployment configuration and CI/CD pipeline:'
        }
      ]
    });

    // Intelligent Bug Hunter & Fixer
    this.registerWorkflow({
      id: 'bug-hunt-fix',
      name: 'AI Bug Detection & Repair',
      description: 'Intelligent bug detection, analysis, and automated fixing',
      steps: [
        {
          id: 'scan-errors',
          taskType: 'code-analysis',
          prompt: 'Scan codebase for bugs, errors, and potential issues:'
        },
        {
          id: 'analyze-logs',
          taskType: 'research',
          prompt: 'Analyze error logs and runtime issues to identify patterns:'
        },
        {
          id: 'root-cause',
          taskType: 'code-analysis',
          prompt: 'Perform deep root cause analysis of identified issues:'
        },
        {
          id: 'generate-fixes',
          taskType: 'code-generation',
          prompt: 'Generate potential fixes with risk assessment:'
        },
        {
          id: 'create-tests',
          taskType: 'code-generation',
          prompt: 'Create tests to validate the proposed fixes:'
        },
        {
          id: 'validate-solution',
          taskType: 'code-analysis',
          prompt: 'Validate the complete solution and assess impact:'
        }
      ]
    });

    // Smart Code Refactoring Workflow
    this.registerWorkflow({
      id: 'intelligent-refactor',
      name: 'AI-Powered Code Refactoring',
      description: 'Intelligent code refactoring with safety validation',
      steps: [
        {
          id: 'analyze-structure',
          taskType: 'code-analysis',
          prompt: 'Analyze code structure and identify refactoring opportunities:'
        },
        {
          id: 'dependency-map',
          taskType: 'code-analysis',
          prompt: 'Map dependencies and potential impact areas:'
        },
        {
          id: 'refactor-plan',
          taskType: 'planning',
          prompt: 'Create detailed refactoring plan with risk assessment:'
        },
        {
          id: 'backup-tests',
          taskType: 'code-generation',
          prompt: 'Generate comprehensive regression tests before refactoring:'
        },
        {
          id: 'execute-refactor',
          taskType: 'code-generation',
          prompt: 'Execute refactoring changes incrementally:'
        },
        {
          id: 'validate-changes',
          taskType: 'code-analysis',
          prompt: 'Validate refactored code and check for regressions:'
        }
      ]
    });

    // API Modernization Workflow
    this.registerWorkflow({
      id: 'api-modernization',
      name: 'API Modernization & Optimization',
      description: 'Modernize APIs with best practices and performance optimization',
      steps: [
        {
          id: 'api-audit',
          taskType: 'code-analysis',
          prompt: 'Audit existing API design and identify improvement opportunities:'
        },
        {
          id: 'schema-optimization',
          taskType: 'code-generation',
          prompt: 'Optimize API schemas and data structures:'
        },
        {
          id: 'versioning-strategy',
          taskType: 'planning',
          prompt: 'Design proper API versioning and migration strategy:'
        },
        {
          id: 'performance-enhance',
          taskType: 'optimization',
          prompt: 'Implement performance optimizations and caching:'
        },
        {
          id: 'security-hardening',
          taskType: 'code-generation',
          prompt: 'Enhance API security with authentication and rate limiting:'
        },
        {
          id: 'generate-docs',
          taskType: 'documentation',
          prompt: 'Generate comprehensive API documentation and examples:'
        },
        {
          id: 'client-sdks',
          taskType: 'code-generation',
          prompt: 'Generate client SDKs for multiple programming languages:'
        }
      ]
    });

    // Deployment Pipeline Builder
    this.registerWorkflow({
      id: 'deployment-pipeline',
      name: 'Automated Deployment Pipeline',
      description: 'Complete CI/CD pipeline setup with monitoring and security',
      steps: [
        {
          id: 'environment-analysis',
          taskType: 'research',
          prompt: 'Analyze deployment requirements and target environments:'
        },
        {
          id: 'pipeline-design',
          taskType: 'planning',
          prompt: 'Design comprehensive CI/CD pipeline architecture:'
        },
        {
          id: 'docker-optimization',
          taskType: 'code-generation',
          prompt: 'Create optimized Docker configurations and multi-stage builds:'
        },
        {
          id: 'ci-workflows',
          taskType: 'code-generation',
          prompt: 'Generate CI workflows with automated testing and quality gates:'
        },
        {
          id: 'deployment-scripts',
          taskType: 'code-generation',
          prompt: 'Create deployment scripts with rollback capabilities:'
        },
        {
          id: 'monitoring-setup',
          taskType: 'code-generation',
          prompt: 'Configure comprehensive monitoring and alerting:'
        },
        {
          id: 'security-scanning',
          taskType: 'code-analysis',
          prompt: 'Implement security scanning and vulnerability assessment:'
        },
        {
          id: 'load-testing',
          taskType: 'code-generation',
          prompt: 'Create automated load testing and performance validation:'
        }
      ]
    });

    // Data Pipeline Builder
    this.registerWorkflow({
      id: 'data-pipeline',
      name: 'Intelligent Data Pipeline',
      description: 'Build robust data processing and analytics pipelines',
      steps: [
        {
          id: 'data-analysis',
          taskType: 'research',
          prompt: 'Analyze data sources, formats, and processing requirements:'
        },
        {
          id: 'pipeline-architecture',
          taskType: 'planning',
          prompt: 'Design scalable data pipeline architecture:'
        },
        {
          id: 'etl-processes',
          taskType: 'code-generation',
          prompt: 'Implement ETL processes and data transformations:'
        },
        {
          id: 'data-validation',
          taskType: 'code-generation',
          prompt: 'Create data quality checks and validation rules:'
        },
        {
          id: 'monitoring-alerts',
          taskType: 'code-generation',
          prompt: 'Set up data pipeline monitoring and alerting:'
        },
        {
          id: 'analytics-dashboard',
          taskType: 'code-generation',
          prompt: 'Build analytics dashboard and reporting systems:'
        }
      ]
    });
  }

  /**
   * Get comprehensive orchestrator and agent metrics
   */
  getMetrics(): OrchestratorMetrics {
    const agentMetrics = new Map<string, AgentMetrics>();
    const agentHealthStatus = new Map<string, ReturnType<BaseAgent['getHealth']>>();

    for (const [agentName, agent] of this.agents) {
      agentMetrics.set(agentName, agent.getMetrics());
      agentHealthStatus.set(agentName, agent.getHealth());
    }

    return {
      orchestrator: {
        registeredAgents: this.agents.size,
        registeredWorkflows: this.workflows.size,
        executionHistory: Array.from(this.executionHistory.entries()).map(([id, history]) => ({
          workflowId: id,
          totalExecutions: history.length,
          lastExecution: history[history.length - 1]?.timestamp
        }))
      },
      agents: Object.fromEntries(agentMetrics),
      agentHealth: Object.fromEntries(agentHealthStatus),
      systemHealth: this.getSystemHealth(agentHealthStatus)
    };
  }

  /**
   * Get overall system health based on agent status
   */
  private getSystemHealth(agentHealthStatus: Map<string, ReturnType<BaseAgent['getHealth']>>): SystemHealthSummary {
    let healthyAgents = 0;
    let degradedAgents = 0;
    let unhealthyAgents = 0;
    const issues: string[] = [];

    for (const [agentName, health] of agentHealthStatus) {
      switch (health.status) {
        case 'healthy':
          healthyAgents++;
          break;
        case 'degraded':
          degradedAgents++;
          issues.push(`Agent ${agentName} is degraded (error rate: ${(health.metrics.errorRate * 100).toFixed(1)}%)`);
          break;
        case 'unhealthy':
          unhealthyAgents++;
          issues.push(`Agent ${agentName} is unhealthy (circuit breaker: ${health.metrics.circuitBreakerState})`);
          break;
      }
    }

    let systemStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyAgents > 0) {
      systemStatus = 'unhealthy';
    } else if (degradedAgents > 0) {
      systemStatus = 'degraded';
    }

    return {
      status: systemStatus,
      healthyAgents,
      degradedAgents,
      unhealthyAgents,
      issues
    };
  }

  /**
   * Reset metrics for all agents
   */
  resetAllMetrics(): void {
    for (const agent of this.agents.values()) {
      agent.resetMetrics();
    }
    this.executionHistory.clear();
  }

  /**
   * Get agent-specific metrics and health
   */
  getAgentStatus(agentName: string): {
    exists: boolean;
    metrics?: AgentMetrics;
    health?: ReturnType<BaseAgent['getHealth']>;
  } {
    const agent = this.agents.get(agentName);
    if (!agent) {
      return { exists: false };
    }

    return {
      exists: true,
      metrics: agent.getMetrics(),
      health: agent.getHealth()
    };
  }
}
