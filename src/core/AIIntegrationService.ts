import { Orchestrator } from '../agents/core/Orchestrator.js';
import { AdvancedCodeAgent, AdvancedResearchAgent, AdvancedKnowledgeAgent, AdvancedDocumentationAgent } from '../agents/advanced/AdvancedAgents.js';
import {
  ExternalInterfacesDivisionAgent,
  CoreSystemDivisionAgent,
  AgentEcosystemDivisionAgent,
  DataAccessDivisionAgent,
  InfrastructureDivisionAgent
} from '../agents/advanced/DivisionAgents.js';
import { IntelligentMonitor } from './IntelligentMonitor.js';
import { ModelRouter } from './ModelRouter.js';
import { AIDevTools, type CodeAnalysisResult } from './AIDevTools.js';
import { Context7Service } from './Context7Service.js';
import { EventEmitter } from 'node:events';
import type { AgentInput, AgentResult } from '../agents/base/BaseAgent.js';

type OrchestratorMetrics = ReturnType<Orchestrator['getMetrics']>;
type ModelRouterStats = Awaited<ReturnType<ModelRouter['getModelStats']>>;

interface MonitoringStats {
  errors: ReturnType<IntelligentMonitor['getErrorStats']>;
  performance: ReturnType<IntelligentMonitor['getPerformanceStats']>;
  insights: ReturnType<IntelligentMonitor['getInsights']>;
}

interface SystemMetrics {
  tasks: {
    queued: number;
    active: number;
    completed: number;
    failed: number;
  };
  orchestrator: OrchestratorMetrics;
  models: ModelRouterStats | null;
  monitoring?: MonitoringStats;
}

type ComponentHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface HealthComponent {
  status: ComponentHealthStatus;
  message?: string;
}

interface HealthComponents {
  models?: HealthComponent;
  orchestrator?: HealthComponent;
  monitoring?: HealthComponent;
  context7?: HealthComponent;
}

// Task result type definitions
export interface RefactoringSuggestions {
  suggestions: Array<{
    type: 'extract-function' | 'reduce-complexity' | 'improve-naming' | 'add-types' | 'optimize-performance';
    description: string;
    before: string;
    after: string;
    reasoning: string;
  }>;
}

export interface BatchAnalysisResult {
  [filePath: string]: CodeAnalysisResult;
}

export type TaskResultData = string | CodeAnalysisResult | RefactoringSuggestions | BatchAnalysisResult | AgentResult;

export interface AIServiceConfig {
  enableMonitoring?: boolean;
  logPath?: string;
  enableAutoRecovery?: boolean;
  maxRetries?: number;
}

export type DivisionKey = 'external' | 'core' | 'agents' | 'data' | 'infrastructure';

// Task input type definitions
export interface CodeTaskInput {
  action: 'generate' | 'analyze' | 'refactor' | 'test' | 'agent';
  description?: string;
  outputPath?: string;
  filePath?: string;
  [key: string]: unknown;
}

export interface ResearchTaskInput {
  query?: string;
  context?: Record<string, unknown>;
  depth?: 'shallow' | 'medium' | 'deep';
  [key: string]: unknown;
}

export interface AnalysisTaskInput {
  files: string | string[];
  analysisType?: string;
  [key: string]: unknown;
}

export interface WorkflowTaskInput {
  workflowId: string;
  input: unknown;
  [key: string]: unknown;
}

export interface DocumentationTaskInput {
  type?: string;
  outputPath?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

// Union type for all task inputs
export type TaskInputData = CodeTaskInput | ResearchTaskInput | AnalysisTaskInput | WorkflowTaskInput | DocumentationTaskInput;

export interface TaskRequest {
  id: string;
  type: 'code' | 'research' | 'documentation' | 'analysis' | 'workflow';
  input: TaskInputData;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  id: string;
  status: 'completed' | 'failed' | 'cancelled';
  result?: unknown;
  error?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * Central AI service that integrates all AI-powered development tools
 */
export class AIIntegrationService extends EventEmitter {
  private orchestrator!: Orchestrator;
  private monitor?: IntelligentMonitor;
  private modelRouter!: ModelRouter;
  private devTools!: AIDevTools;
  private context7!: Context7Service;
  private config: AIServiceConfig;
  
  private codeAgent!: AdvancedCodeAgent;
  private researchAgent!: AdvancedResearchAgent;
  private knowledgeAgent!: AdvancedKnowledgeAgent;
  private docAgent!: AdvancedDocumentationAgent;
  private externalInterfacesAgent!: ExternalInterfacesDivisionAgent;
  private coreSystemAgent!: CoreSystemDivisionAgent;
  private agentEcosystemAgent!: AgentEcosystemDivisionAgent;
  private dataAccessAgent!: DataAccessDivisionAgent;
  private infrastructureAgent!: InfrastructureDivisionAgent;
  
  private taskQueue: TaskRequest[] = [];
  private activeTasks: Map<string, TaskRequest> = new Map();
  private taskResults: Map<string, TaskResult> = new Map();
  private isProcessing = false;

  constructor(config: AIServiceConfig = {}) {
    super();
    this.config = {
      enableMonitoring: true,
      enableAutoRecovery: true,
      maxRetries: 3,
      logPath: './logs',
      ...config
    };

    this.initializeComponents();
    this.setupIntegrations();
  }

  private initializeComponents(): void {
    // Core components
    this.orchestrator = new Orchestrator();
    this.modelRouter = new ModelRouter();
    this.devTools = new AIDevTools();
    this.context7 = new Context7Service(this.modelRouter);
    
    if (this.config.enableMonitoring) {
      this.monitor = new IntelligentMonitor(this.config.logPath);
    }

    // Advanced agents
    this.codeAgent = new AdvancedCodeAgent();
    this.researchAgent = new AdvancedResearchAgent();
    this.knowledgeAgent = new AdvancedKnowledgeAgent();
    this.docAgent = new AdvancedDocumentationAgent();
    this.externalInterfacesAgent = new ExternalInterfacesDivisionAgent();
    this.coreSystemAgent = new CoreSystemDivisionAgent();
    this.agentEcosystemAgent = new AgentEcosystemDivisionAgent();
    this.dataAccessAgent = new DataAccessDivisionAgent();
    this.infrastructureAgent = new InfrastructureDivisionAgent();

    // Register agents with orchestrator
    this.orchestrator.registerAgent(this.codeAgent);
    this.orchestrator.registerAgent(this.researchAgent);
    this.orchestrator.registerAgent(this.knowledgeAgent);
    this.orchestrator.registerAgent(this.docAgent);
    this.orchestrator.registerAgent(this.externalInterfacesAgent);
    this.orchestrator.registerAgent(this.coreSystemAgent);
    this.orchestrator.registerAgent(this.agentEcosystemAgent);
    this.orchestrator.registerAgent(this.dataAccessAgent);
    this.orchestrator.registerAgent(this.infrastructureAgent);
  }

  private setupIntegrations(): void {
    // Monitor orchestrator events
    const monitor = this.monitor;
    if (monitor) {
      this.orchestrator.on('agentExecutionStarted', (agentName, input) => {
        void monitor.recordPerformance({
          component: `Agent:${agentName}`,
          operation: 'execute',
          duration: 0,
          success: false,
          metadata: { input }
        });
      });

      this.orchestrator.on('agentExecutionCompleted', (agentName, result) => {
        void monitor.recordPerformance({
          component: `Agent:${agentName}`,
          operation: 'execute',
          duration: Date.now(),
          success: result.kind === 'ok',
          metadata: { result }
        });
      });

      this.orchestrator.on('agentExecutionError', (agentName, error) => {
        const message = error instanceof Error ? error.message : String(error);
        void monitor.recordError({
          component: `Agent:${agentName}`,
          errorType: 'agent_execution_error',
          message,
          severity: 'medium',
          metadata: { error }
        });
      });

      // Monitor AI insights
      monitor.on('aiInsight', (insight) => {
        this.emit('aiInsight', insight);
      });

      // Auto-recovery integration
      if (this.config.enableAutoRecovery) {
        monitor.on('errorRecorded', async (error) => {
          if (error.severity === 'critical' || error.severity === 'high') {
            const recovered = await monitor.attemptAutoRecovery(error);
            this.emit('autoRecoveryAttempt', { error, recovered });
          }
        });
      }
    }

    // Start task processing
    this.startTaskProcessing();
  }

  /**
   * Submit a task for AI processing
   */
  async submitTask(request: Omit<TaskRequest, 'id'>): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: TaskRequest = {
      id: taskId,
      priority: 'medium',
      ...request
    };

    // Insert task based on priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = this.taskQueue.findIndex(
      t => priorityOrder[t.priority || 'medium'] > priorityOrder[task.priority || 'medium']
    );
    
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }

    this.emit('taskSubmitted', task);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNextTask();
    }

    return taskId;
  }

  /**
   * Get task result
   */
  getTaskResult(taskId: string): TaskResult | null {
    return this.taskResults.get(taskId) || null;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): 'queued' | 'active' | 'completed' | 'failed' | 'not_found' {
    if (this.taskResults.has(taskId)) {
      const result = this.taskResults.get(taskId);
      if (result) {
        return result.status === 'completed' ? 'completed' : 'failed';
      }
    }
    
    if (this.activeTasks.has(taskId)) {
      return 'active';
    }
    
    if (this.taskQueue.some(t => t.id === taskId)) {
      return 'queued';
    }
    
    return 'not_found';
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    // Remove from queue
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
      this.emit('taskCancelled', taskId);
      return true;
    }

    // Cannot cancel active tasks for now
    return false;
  }

  private async startTaskProcessing(): Promise<void> {
    this.isProcessing = true;
    
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (task) {
        await this.processTask(task);
      }
    }
    
    this.isProcessing = false;
  }

  private async processNextTask(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) return;
    
    this.isProcessing = true;
    const task = this.taskQueue.shift();
    if (task) {
      await this.processTask(task);
    }
    this.isProcessing = false;
    
    // Process next task if available
    if (this.taskQueue.length > 0) {
      setImmediate(() => this.processNextTask());
    }
  }

  private async processTask(task: TaskRequest): Promise<void> {
    const startTime = new Date();
    this.activeTasks.set(task.id, task);
    this.emit('taskStarted', task);

    try {
      let result: TaskResultData | AgentResult;

      // Route task to appropriate processor
      switch (task.type) {
        case 'code':
          result = await this.processCodeTask(task);
          break;
        case 'research':
          result = await this.processResearchTask(task);
          break;
        case 'documentation':
          result = await this.processDocumentationTask(task);
          break;
        case 'analysis':
          result = await this.processAnalysisTask(task);
          break;
        case 'workflow':
          result = await this.processWorkflowTask(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Record successful completion
      const endTime = new Date();
      const taskResult: TaskResult = {
        id: task.id,
        status: 'completed',
        result,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        metadata: task.metadata || {}
      };

      this.taskResults.set(task.id, taskResult);
      this.activeTasks.delete(task.id);
      this.emit('taskCompleted', taskResult);

    } catch (error) {
      // Record failure
      const endTime = new Date();
      const taskResult: TaskResult = {
        id: task.id,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        metadata: task.metadata || {}
      };

      this.taskResults.set(task.id, taskResult);
      this.activeTasks.delete(task.id);
      this.emit('taskFailed', taskResult);

      // Record error for monitoring
      if (this.monitor) {
        void this.monitor.recordError({
          component: 'AIIntegrationService',
          errorType: 'task_processing_error',
          message: `Task ${task.id} (${task.type}) failed: ${taskResult.error}`,
          severity: task.priority === 'critical' ? 'critical' : 'medium',
          metadata: { task, error }
        });
      }
    }
  }

  // Type guard methods
  private isCodeTaskInput(input: TaskInputData): input is CodeTaskInput {
    return typeof input === 'object' && input !== null && 'action' in input;
  }

  private isAnalysisTaskInput(input: TaskInputData): input is AnalysisTaskInput {
    return typeof input === 'object' && input !== null && 'files' in input;
  }

  private isWorkflowTaskInput(input: TaskInputData): input is WorkflowTaskInput {
    return typeof input === 'object' && input !== null && 'workflowId' in input;
  }

  private isAgentResult(value: unknown): value is AgentResult {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const result = value as Partial<AgentResult> & { kind?: unknown };
    if (result.kind === 'ok') {
      return 'data' in result;
    }

    if (result.kind === 'error') {
      return typeof result.code === 'string' && typeof result.message === 'string' && typeof result.retryable === 'boolean' && typeof result.category === 'string';
    }

    return false;
  }

  private async processCodeTask(task: TaskRequest): Promise<TaskResultData> {
    if (!this.isCodeTaskInput(task.input)) {
      throw new Error('Invalid code task input');
    }
    
    const { action, ...input } = task.input;
    
    switch (action) {
      case 'generate':
        return await this.devTools.generateSchema(input.description as string, input.outputPath as string);
      case 'analyze':
        return await this.devTools.analyzeCode(input.filePath as string);
      case 'refactor':
        return await this.devTools.suggestRefactoring(input.filePath as string);
      case 'test':
        return await this.devTools.generateTests(input.filePath as string, input.outputPath as string);
      case 'agent':
        return await this.codeAgent.execute(input);
      default:
        throw new Error(`Unknown code action: ${action}`);
    }
  }

  private async processResearchTask(task: TaskRequest): Promise<AgentResult> {
    return await this.researchAgent.execute(task.input);
  }

  private async processDocumentationTask(task: TaskRequest): Promise<AgentResult> {
    return await this.docAgent.execute(task.input);
  }

  private async processAnalysisTask(task: TaskRequest): Promise<TaskResultData> {
    if (!this.isAnalysisTaskInput(task.input)) {
      throw new Error('Invalid analysis task input');
    }
    
    const { files } = task.input;
    if (Array.isArray(files)) {
      return await this.devTools.batchAnalyze(files);
    } else {
      return await this.devTools.analyzeCode(files);
    }
  }

  private async processWorkflowTask(task: TaskRequest): Promise<AgentResult> {
    if (!this.isWorkflowTaskInput(task.input)) {
      throw new Error('Invalid workflow task input');
    }
    
    const { workflowId, input } = task.input;
    return await this.orchestrator.executeWorkflow(workflowId, input);
  }

  /**
   * Smart task execution - automatically determines best approach
   */
  async executeSmartTask(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    const taskId = await this.submitTask({
      type: 'workflow',
      input: { workflowId: 'smart-analysis', input, context }
    });

    // Wait for completion
    return new Promise((resolve, reject) => {
      const checkResult = () => {
        const result = this.getTaskResult(taskId);
        if (result) {
          if (result.status === 'completed') {
            if (this.isAgentResult(result.result)) {
              resolve(result.result);
            } else {
              reject(new Error('Smart task completed with unexpected result format'));
            }
          } else {
            const message = result.error ?? 'Task failed without error details';
            reject(new Error(message));
          }
        } else {
          setTimeout(checkResult, 1000);
        }
      };
      checkResult();
    });
  }

  async executeDivisionTask(division: DivisionKey, input: AgentInput): Promise<AgentResult> {
    const agent = this.getDivisionAgentInstance(division);
    if (!agent) {
      return {
        kind: 'error',
        code: 'division_agent_not_found',
        message: `No agent is registered for division '${division}'.`,
        category: 'validation',
        retryable: false
      };
    }

    return await this.orchestrator.delegate(agent.name, input);
  }

  private getDivisionAgentInstance(division: DivisionKey) {
    switch (division) {
      case 'external':
        return this.externalInterfacesAgent;
      case 'core':
        return this.coreSystemAgent;
      case 'agents':
        return this.agentEcosystemAgent;
      case 'data':
        return this.dataAccessAgent;
      case 'infrastructure':
        return this.infrastructureAgent;
      default:
        return undefined;
    }
  }

  /**
   * Get comprehensive system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const completedTasks = Array.from(this.taskResults.values());
    const metrics: SystemMetrics = {
      tasks: {
        queued: this.taskQueue.length,
        active: this.activeTasks.size,
        completed: completedTasks.filter(t => t.status === 'completed').length,
        failed: completedTasks.filter(t => t.status === 'failed').length
      },
      orchestrator: this.orchestrator.getMetrics(),
      models: null
    };

    if (this.monitor) {
      metrics.monitoring = {
        errors: this.monitor.getErrorStats(),
        performance: this.monitor.getPerformanceStats(),
        insights: this.monitor.getInsights()
      };
    }

    // Get model stats asynchronously
    void this.modelRouter.getModelStats()
      .then(stats => {
        metrics.models = stats;
      })
      .catch(error => {
        this.emit('metricsError', { component: 'modelRouter', error });
      });

    return metrics;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: ComponentHealthStatus;
    components: HealthComponents;
  }> {
    const components: HealthComponents = {};

    // Check model availability
    try {
      const modelStats = await this.modelRouter.getModelStats();
      const stats = Object.values(modelStats);
      const availableModels = stats.filter(s => s.available).length;
      const totalModels = stats.length;

      components.models = {
        status: availableModels > 0 ? 'healthy' : 'unhealthy',
        message: totalModels > 0 ? `${availableModels}/${totalModels} models available` : 'No models registered'
      };
    } catch (_error) {
      components.models = {
        status: 'unhealthy',
        message: 'Failed to check model availability'
      };
    }

    // Check orchestrator
    try {
      const orchMetrics = this.orchestrator.getMetrics();
      const orchestratorSummary = orchMetrics.orchestrator;
      components.orchestrator = {
        status: 'healthy',
        message: `${orchestratorSummary.registeredAgents} agents, ${orchestratorSummary.registeredWorkflows} workflows`
      };
    } catch (_error) {
      components.orchestrator = {
        status: 'unhealthy',
        message: 'Orchestrator check failed'
      };
    }

    // Check monitoring
    if (this.monitor) {
      try {
        const errorStats = this.monitor.getErrorStats(1); // Last hour
        components.monitoring = {
          status: errorStats.total < 10 ? 'healthy' : 'degraded',
          message: `${errorStats.total} errors in last hour`
        };
      } catch (_error) {
        components.monitoring = {
          status: 'unhealthy',
          message: 'Monitoring check failed'
        };
      }
    }

    // Check Context7 service
    try {
      const context7Health = await this.context7.healthCheck();
      components.context7 = {
        status: context7Health.status,
        message: context7Health.message
      };
    } catch (_error) {
      components.context7 = {
        status: 'unhealthy',
        message: 'Context7 health check failed'
      };
    }

    // Determine overall status
    const statuses = Object.values(components)
      .filter((component): component is HealthComponent => component !== undefined)
      .map(component => component.status);

    const overallStatus: ComponentHealthStatus = statuses.includes('unhealthy')
      ? 'unhealthy'
      : statuses.includes('degraded')
        ? 'degraded'
        : 'healthy';

    return { status: overallStatus, components };
  }

  /**
   * Get Context7 service instance
   */
  getContext7Service(): Context7Service {
    return this.context7;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.isProcessing = false;
    this.taskQueue = [];
    this.activeTasks.clear();
    
    if (this.monitor) {
      this.monitor.destroy();
    }
    
    this.removeAllListeners();
  }
}

// Export singleton instance
export const aiService = new AIIntegrationService();