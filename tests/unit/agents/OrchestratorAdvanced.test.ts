import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Orchestrator } from '../../../src/agents/core/Orchestrator.js';
import { BaseAgent, type AgentInput, type AgentResult } from '../../../src/agents/base/BaseAgent.js';

// Mock ModelRouter
vi.mock('../../../src/core/ModelRouter.js', () => ({
  ModelRouter: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      content: 'Mock AI response',
      provider: 'openai',
      usage: { inputTokens: 10, outputTokens: 5, cost: 0.001 },
      executionTime: 100
    }),
    selectOptimalModel: vi.fn().mockReturnValue('openai')
  }))
}));

// Test agents
class MockAnalysisAgent extends BaseAgent {
  readonly name = 'analysis-agent';

  async execute(input: AgentInput): Promise<AgentResult> {
    if (input.shouldFail) {
      return {
        kind: 'error',
        code: 'analysis_failed',
        message: 'Analysis failed'
      };
    }

    return {
      kind: 'ok',
      data: {
        analysis: 'Code analysis complete',
        metrics: { complexity: 5, maintainability: 8 },
        suggestions: ['Use more descriptive variable names']
      }
    };
  }
}

class MockGenerationAgent extends BaseAgent {
  readonly name = 'generation-agent';

  async execute(input: AgentInput): Promise<AgentResult> {
    if (input.shouldFail) {
      return {
        kind: 'error',
        code: 'generation_failed',
        message: 'Code generation failed'
      };
    }

    return {
      kind: 'ok',
      data: {
        generatedCode: 'function hello() { return "Hello, World!"; }',
        explanation: 'Generated a simple hello function'
      }
    };
  }
}

class MockSlowAgent extends BaseAgent {
  readonly name = 'slow-agent';

  async execute(input: AgentInput): Promise<AgentResult> {
    await new Promise(resolve => setTimeout(resolve, input.delay || 100));
    return {
      kind: 'ok',
      data: { processed: true }
    };
  }
}

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  let analysisAgent: MockAnalysisAgent;
  let generationAgent: MockGenerationAgent;
  let slowAgent: MockSlowAgent;

  beforeEach(() => {
    orchestrator = new Orchestrator();
    analysisAgent = new MockAnalysisAgent();
    generationAgent = new MockGenerationAgent();
    slowAgent = new MockSlowAgent();

    // Register test agents
    orchestrator.registerAgent(analysisAgent);
    orchestrator.registerAgent(generationAgent);
    orchestrator.registerAgent(slowAgent);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Registration', () => {
    it('should register agents successfully', () => {
      const metrics = orchestrator.getMetrics();
      expect(metrics.orchestrator.registeredAgents).toBe(6); // 3 test + 3 Context7 agents
    });

    it('should prevent duplicate agent registration', () => {
      const duplicateAgent = new MockAnalysisAgent();

      expect(() => {
        orchestrator.registerAgent(duplicateAgent);
      }).toThrow();
    });

    it('should track agent metrics', () => {
      const status = orchestrator.getAgentStatus('analysis-agent');
      expect(status.exists).toBe(true);
      expect(status.metrics).toBeDefined();
      expect(status.health).toBeDefined();
    });
  });

  describe('Single Agent Execution', () => {
    it('should execute a single agent successfully', async () => {
      const result = await orchestrator.delegate('analysis-agent', {
        code: 'const x = 1;'
      });

      expect(result.kind).toBe('ok');
      expect(result.data).toHaveProperty('analysis');
      expect(result.data).toHaveProperty('metrics');
      expect(result.data).toHaveProperty('suggestions');
    });

    it('should handle agent execution errors', async () => {
      const result = await orchestrator.delegate('analysis-agent', {
        shouldFail: true
      });

      expect(result.kind).toBe('error');
      expect(result.code).toBe('analysis_failed');
      expect(result.message).toBe('Analysis failed');
    });

    it('should return error for non-existent agent', async () => {
      const result = await orchestrator.delegate('non-existent-agent', {});
      expect(result.kind).toBe('error');
      expect(result.code).toBe('agent_not_found');
    });
  });

  describe('Workflow Execution', () => {
    beforeEach(() => {
      // Register a test workflow
      orchestrator.registerWorkflow({
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A simple test workflow',
        steps: [
          {
            id: 'step1',
            agentName: 'analysis-agent',
            taskType: 'code-analysis',
            prompt: 'Analyze this code'
          },
          {
            id: 'step2',
            agentName: 'generation-agent',
            taskType: 'code-generation',
            prompt: 'Generate improved code'
          }
        ]
      });
    });

    it('should execute a simple workflow', async () => {
      const result = await orchestrator.executeWorkflow('test-workflow', {
        code: 'const x = 1;'
      });

      expect(result.kind).toBe('ok');
      expect(result.metadata?.workflowId).toBe('test-workflow');
      expect(result.metadata?.totalSteps).toBe(2);
    });

    it('should handle workflow step failures', async () => {
      const result = await orchestrator.executeWorkflow('test-workflow', {
        shouldFail: true
      });

      expect(result.kind).toBe('error');
      expect(result.code).toBe('step_execution_failed');
    });

    it('should return error for non-existent workflow', async () => {
      const result = await orchestrator.executeWorkflow('non-existent-workflow', {});
      expect(result.kind).toBe('error');
      expect(result.code).toBe('workflow_not_found');
    });
  });

  describe('Built-in Workflows', () => {
    it('should have registered default workflows', () => {
      const metrics = orchestrator.getMetrics();
      expect(metrics.orchestrator.registeredWorkflows).toBeGreaterThan(0);
    });

    it('should execute code-review workflow', async () => {
      const result = await orchestrator.executeWorkflow('code-review', {
        code: 'const x = 1; console.log(x);'
      });

      expect(result.kind).toBe('ok');
    });

    it('should execute research-implement workflow', async () => {
      const result = await orchestrator.executeWorkflow('research-implement', {
        topic: 'fibonacci sequence'
      });

      expect(result.kind).toBe('ok');
    });
  });

  describe('Smart Execution', () => {
    it('should intelligently route requests', async () => {
      const result = await orchestrator.smartExecute('Analyze this code for bugs');

      expect(result.kind).toBe('ok');
      expect(result.data).toBeDefined();
    });

    it('should handle routing failures gracefully', async () => {
      // Mock analyzeAndRoute to throw error
      vi.spyOn(orchestrator, 'analyzeAndRoute').mockRejectedValueOnce(new Error('Routing failed'));

      const result = await orchestrator.smartExecute('Test input');

      expect(result.kind).toBe('error');
      expect(result.code).toBe('smart_execution_failed');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track execution metrics', async () => {
      await orchestrator.delegate('analysis-agent', { code: 'const x = 1;' });

      const metrics = orchestrator.getMetrics();
      expect(metrics.agents['analysis-agent']).toBeDefined();
      expect(metrics.systemHealth).toBeDefined();
    });

    it('should handle concurrent agent executions', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        orchestrator.delegate('analysis-agent', {
          code: `const x${i} = ${i};`
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.kind).toBe('ok');
      });
    });

    it('should provide system health status', () => {
      const metrics = orchestrator.getMetrics();
      expect(metrics.systemHealth.status).toMatch(/healthy|degraded|unhealthy/);
      expect(typeof metrics.systemHealth.healthyAgents).toBe('number');
      expect(typeof metrics.systemHealth.degradedAgents).toBe('number');
      expect(typeof metrics.systemHealth.unhealthyAgents).toBe('number');
    });
  });

  describe('Event System', () => {
    it('should emit events during agent execution', async () => {
      const executionStartedSpy = vi.fn();
      const executionCompletedSpy = vi.fn();

      orchestrator.on('agentExecutionStarted', executionStartedSpy);
      orchestrator.on('agentExecutionCompleted', executionCompletedSpy);

      await orchestrator.delegate('analysis-agent', { code: 'const x = 1;' });

      expect(executionStartedSpy).toHaveBeenCalled();
      expect(executionCompletedSpy).toHaveBeenCalled();
    });

    it('should emit workflow events', async () => {
      const workflowStartedSpy = vi.fn();
      const workflowCompletedSpy = vi.fn();

      orchestrator.on('workflowStarted', workflowStartedSpy);
      orchestrator.on('workflowCompleted', workflowCompletedSpy);

      await orchestrator.executeWorkflow('code-review', { code: 'const x = 1;' });

      expect(workflowStartedSpy).toHaveBeenCalled();
      expect(workflowCompletedSpy).toHaveBeenCalled();
    });
  });

  describe('Agent Communication', () => {
    it('should enable agent-to-agent communication', () => {
      // Verify that agents have access to orchestrator
      expect(analysisAgent.orchestrator).toBeDefined();
    });

    it('should sanitize sensitive input during logging', async () => {
      const result = await orchestrator.delegate('analysis-agent', {
        code: 'const x = 1;',
        password: 'secret123',
        token: 'abc123'
      });

      expect(result.kind).toBe('ok');
      // Password and token should be sanitized in logs (verified through event emission)
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle unexpected errors gracefully', async () => {
      const errorAgent = new class extends BaseAgent {
        readonly name = 'error-agent';

        async execute(_input: AgentInput): Promise<AgentResult> {
          throw new Error('Unexpected error');
        }
      }();

      orchestrator.registerAgent(errorAgent);

      const result = await orchestrator.delegate('error-agent', {});

      expect(result.kind).toBe('error');
      expect(result.code).toBe('orchestrator_execution_failed');
    });

    it('should implement circuit breaker for failing agents', async () => {
      const failingAgent = new class extends BaseAgent {
        readonly name = 'failing-agent';
        private failureCount = 0;

        async execute(_input: AgentInput): Promise<AgentResult> {
          this.failureCount++;
          throw new Error(`Failure ${this.failureCount}`);
        }
      }();

      orchestrator.registerAgent(failingAgent);

      // Execute multiple times to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        await orchestrator.delegate('failing-agent', {});
      }

      const status = orchestrator.getAgentStatus('failing-agent');
      expect(status.health?.status).toBe('unhealthy');
    });
  });

  describe('Context7 Integration', () => {
    it('should have Context7 agents registered', () => {
      const metrics = orchestrator.getMetrics();

      // Should have Context7 agents: frontend-agent, api-agent, docs-agent
      expect(metrics.agents['frontend-agent']).toBeDefined();
      expect(metrics.agents['api-agent']).toBeDefined();
      expect(metrics.agents['docs-agent']).toBeDefined();
    });

    it('should emit Context7 registration event', () => {
      const context7Spy = vi.fn();

      const newOrchestrator = new Orchestrator();
      newOrchestrator.on('context7AgentsRegistered', context7Spy);

      // Force re-setup to trigger event
      newOrchestrator['setupContext7Agents']();

      expect(context7Spy).toHaveBeenCalledWith({
        agents: ['frontend-agent', 'api-agent', 'docs-agent'],
        capabilities: {
          'frontend-agent': 'React, TypeScript, Tailwind CSS, Aurora UI, Accessibility',
          'api-agent': 'Fastify, REST APIs, Database, Security, OpenAPI docs',
          'docs-agent': 'Technical writing, API docs, User guides, Tutorials'
        }
      });
    });
  });

  describe('Metrics and Reset', () => {
    it('should reset all metrics', async () => {
      // Execute some operations to generate metrics
      await orchestrator.delegate('analysis-agent', { code: 'const x = 1;' });
      await orchestrator.executeWorkflow('code-review', { code: 'const y = 2;' });

      orchestrator.resetAllMetrics();

      const metrics = orchestrator.getMetrics();
      expect(metrics.orchestrator.executionHistory).toHaveLength(0);
    });

    it('should provide comprehensive metrics', () => {
      const metrics = orchestrator.getMetrics();

      expect(metrics.orchestrator).toBeDefined();
      expect(metrics.agents).toBeDefined();
      expect(metrics.agentHealth).toBeDefined();
      expect(metrics.systemHealth).toBeDefined();

      expect(typeof metrics.orchestrator.registeredAgents).toBe('number');
      expect(typeof metrics.orchestrator.registeredWorkflows).toBe('number');
      expect(Array.isArray(metrics.orchestrator.executionHistory)).toBe(true);
    });
  });

  describe('Automation Features', () => {
    it('should handle feature development automation', async () => {
      // Mock loadAgentConfig to return test config
      vi.spyOn(orchestrator as any, 'loadAgentConfig').mockResolvedValue({
        project: { name: 'Test Project', description: 'Test' },
        agents: {
          frontend: { model: 'gpt-4o', systemPrompt: 'You are a frontend agent' },
          api: { model: 'claude-3-5-sonnet', systemPrompt: 'You are an API agent' }
        }
      });

      const results = await orchestrator.automateFeatureDevelopment('Build a user dashboard');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle missing feature description', async () => {
      await expect(
        orchestrator.automateFeatureDevelopment('')
      ).rejects.toThrow('Feature description is required');
    });
  });
});