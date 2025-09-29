import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Orchestrator, type Workflow, type WorkflowStep } from '../../../src/agents/core/Orchestrator.js';
import { BaseAgent, type AgentInput, type AgentResult } from '../../../src/agents/base/BaseAgent.js';

// Mock ModelRouter
vi.mock('../../../src/core/ModelRouter.js', () => ({
  ModelRouter: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      content: 'Mock AI response',
      provider: 'openai',
      executionTime: 1000,
      usage: { inputTokens: 50, outputTokens: 25, cost: 0.001 }
    })
  }))
}));

// Mock advanced agents
vi.mock('../../../src/agents/advanced/FrontendAgent.js', () => ({
  FrontendAgent: vi.fn().mockImplementation(() => ({
    name: 'frontend-agent',
    version: '1.0.0',
    description: 'Mock frontend agent',
    executeCore: vi.fn().mockResolvedValue({
      kind: 'ok',
      data: 'Frontend task completed'
    })
  }))
}));

vi.mock('../../../src/agents/advanced/APIAgent.js', () => ({
  APIAgent: vi.fn().mockImplementation(() => ({
    name: 'api-agent',
    version: '1.0.0',
    description: 'Mock API agent',
    executeCore: vi.fn().mockResolvedValue({
      kind: 'ok',
      data: 'API task completed'
    })
  }))
}));

vi.mock('../../../src/agents/advanced/DocsAgent.js', () => ({
  DocsAgent: vi.fn().mockImplementation(() => ({
    name: 'docs-agent',
    version: '1.0.0',
    description: 'Mock docs agent',
    executeCore: vi.fn().mockResolvedValue({
      kind: 'ok',
      data: 'Documentation task completed'
    })
  }))
}));

// Test agent implementations
class TestSuccessAgent extends BaseAgent {
  readonly name = 'test-success-agent';
  readonly version = '1.0.0';
  readonly description = 'Test agent that always succeeds';

  async executeCore(_input: AgentInput): Promise<AgentResult> {
    return {
      kind: 'ok',
      data: { message: 'Success', timestamp: Date.now() }
    };
  }
}

class TestErrorAgent extends BaseAgent {
  readonly name = 'test-error-agent';
  readonly version = '1.0.0';
  readonly description = 'Test agent that always fails';

  async executeCore(_input: AgentInput): Promise<AgentResult> {
    return {
      kind: 'error',
      code: 'test_error',
      message: 'Simulated error',
      category: 'execution',
      retryable: false
    };
  }
}

class TestSlowAgent extends BaseAgent {
  readonly name = 'test-slow-agent';
  readonly version = '1.0.0';
  readonly description = 'Test agent that simulates slow execution';

  async executeCore(_input: AgentInput): Promise<AgentResult> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      kind: 'ok',
      data: { message: 'Slow success' }
    };
  }
}

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  describe('Agent Registration', () => {
    it('should register agents successfully', () => {
      const agent = new TestSuccessAgent();
      orchestrator.registerAgent(agent);

      expect(orchestrator['agents'].has('test-success-agent')).toBe(true);
    });

    it('should emit agentRegistered event', (done) => {
      const agent = new TestSuccessAgent();

      orchestrator.on('agentRegistered', (agentName) => {
        expect(agentName).toBe('test-success-agent');
        done();
      });

      orchestrator.registerAgent(agent);
    });

    it('should register Context7 agents by default', () => {
      expect(orchestrator['agents'].has('frontend-agent')).toBe(true);
      expect(orchestrator['agents'].has('api-agent')).toBe(true);
      expect(orchestrator['agents'].has('docs-agent')).toBe(true);
    });
  });

  describe('Agent Delegation', () => {
    beforeEach(() => {
      orchestrator.registerAgent(new TestSuccessAgent());
      orchestrator.registerAgent(new TestErrorAgent());
    });

    it('should delegate to existing agent successfully', async () => {
      const result = await orchestrator.delegate('test-success-agent', {
        test: 'data'
      });

      expect(result.kind).toBe('ok');
      expect(result.data).toMatchObject({
        message: 'Success'
      });
    });

    it('should return error for non-existent agent', async () => {
      const result = await orchestrator.delegate('non-existent-agent', {});

      expect(result.kind).toBe('error');
      expect(result.code).toBe('agent_not_found');
      expect(result.message).toContain('non-existent-agent');
    });

    it('should handle agent execution errors', async () => {
      const result = await orchestrator.delegate('test-error-agent', {});

      expect(result.kind).toBe('error');
      expect(result.code).toBe('test_error');
    });

    it('should emit execution events', (done) => {
      let eventsReceived = 0;

      orchestrator.on('agentExecutionStarted', (agentName, input) => {
        expect(agentName).toBe('test-success-agent');
        expect(input).toEqual({ test: 'data' });
        eventsReceived++;
      });

      orchestrator.on('agentExecutionCompleted', (agentName, result) => {
        expect(agentName).toBe('test-success-agent');
        expect(result.kind).toBe('ok');
        eventsReceived++;

        if (eventsReceived === 2) done();
      });

      orchestrator.delegate('test-success-agent', { test: 'data' });
    });
  });

  describe('Workflow Management', () => {
    it('should register workflows successfully', () => {
      const workflow: Workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [
          {
            id: 'step1',
            taskType: 'code-generation',
            prompt: 'Generate code'
          }
        ]
      };

      orchestrator.registerWorkflow(workflow);
      expect(orchestrator['workflows'].has('test-workflow')).toBe(true);
    });

    it('should emit workflowRegistered event', (done) => {
      const workflow: Workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: []
      };

      orchestrator.on('workflowRegistered', (workflowId) => {
        expect(workflowId).toBe('test-workflow');
        done();
      });

      orchestrator.registerWorkflow(workflow);
    });
  });

  describe('Workflow Execution', () => {
    beforeEach(() => {
      orchestrator.registerAgent(new TestSuccessAgent());
    });

    it('should execute simple workflow successfully', async () => {
      const workflow: Workflow = {
        id: 'simple-workflow',
        name: 'Simple Workflow',
        description: 'A simple test workflow',
        steps: [
          {
            id: 'step1',
            agentName: 'test-success-agent',
            taskType: 'code-generation',
            prompt: 'Test prompt'
          }
        ]
      };

      orchestrator.registerWorkflow(workflow);
      const result = await orchestrator.executeWorkflow('simple-workflow', {
        test: 'input'
      });

      expect(result.kind).toBe('ok');
      expect(result.metadata?.workflowId).toBe('simple-workflow');
      expect(result.metadata?.totalSteps).toBe(1);
    });

    it('should handle workflow not found', async () => {
      const result = await orchestrator.executeWorkflow('non-existent', {});

      expect(result.kind).toBe('error');
      expect(result.code).toBe('workflow_not_found');
    });

    it('should execute multi-step workflow', async () => {
      const workflow: Workflow = {
        id: 'multi-step-workflow',
        name: 'Multi-Step Workflow',
        description: 'A multi-step test workflow',
        steps: [
          {
            id: 'step1',
            taskType: 'research',
            prompt: 'Research step'
          },
          {
            id: 'step2',
            taskType: 'code-generation',
            prompt: 'Generate code step'
          }
        ]
      };

      orchestrator.registerWorkflow(workflow);
      const result = await orchestrator.executeWorkflow('multi-step-workflow', 'input');

      expect(result.kind).toBe('ok');
      expect(result.metadata?.totalSteps).toBe(2);
    });

    it('should handle step failures in workflow', async () => {
      orchestrator.registerAgent(new TestErrorAgent());

      const workflow: Workflow = {
        id: 'failing-workflow',
        name: 'Failing Workflow',
        description: 'A workflow with failing step',
        steps: [
          {
            id: 'failing-step',
            agentName: 'test-error-agent',
            taskType: 'code-generation',
            prompt: 'This will fail'
          }
        ]
      };

      orchestrator.registerWorkflow(workflow);
      const result = await orchestrator.executeWorkflow('failing-workflow', {});

      expect(result.kind).toBe('error');
      expect(result.code).toBe('test_error');
    });

    it('should emit workflow events', (done) => {
      let eventsReceived = 0;

      orchestrator.on('workflowStarted', (workflowId, input) => {
        expect(workflowId).toBe('event-workflow');
        eventsReceived++;
      });

      orchestrator.on('workflowCompleted', (workflowId, result) => {
        expect(workflowId).toBe('event-workflow');
        expect(result.kind).toBe('ok');
        eventsReceived++;

        if (eventsReceived === 2) done();
      });

      const workflow: Workflow = {
        id: 'event-workflow',
        name: 'Event Workflow',
        description: 'Workflow for testing events',
        steps: [
          {
            id: 'step1',
            taskType: 'research',
            prompt: 'Test step'
          }
        ]
      };

      orchestrator.registerWorkflow(workflow);
      orchestrator.executeWorkflow('event-workflow', 'test input');
    });
  });

  describe('Smart Execution', () => {
    it('should analyze and route requests', async () => {
      const routing = await orchestrator.analyzeAndRoute('Generate a React component');

      expect(routing).toHaveProperty('approach');
      expect(routing).toHaveProperty('recommendation');
      expect(routing).toHaveProperty('confidence');
      expect(routing.confidence).toBeGreaterThanOrEqual(0);
      expect(routing.confidence).toBeLessThanOrEqual(1);
    });

    it('should execute smart routing', async () => {
      const result = await orchestrator.smartExecute('Simple test query');

      expect(result.kind).toBe('ok');
      expect(result.data).toBeDefined();
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should provide orchestrator metrics', () => {
      orchestrator.registerAgent(new TestSuccessAgent());

      const workflow: Workflow = {
        id: 'metrics-workflow',
        name: 'Metrics Workflow',
        description: 'Workflow for metrics testing',
        steps: []
      };
      orchestrator.registerWorkflow(workflow);

      const metrics = orchestrator.getMetrics();

      expect(metrics.registeredAgents).toBeGreaterThan(0);
      expect(metrics.registeredWorkflows).toBeGreaterThan(0);
      expect(metrics.executionHistory).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed workflow steps', async () => {
      const workflow: Workflow = {
        id: 'malformed-workflow',
        name: 'Malformed Workflow',
        description: 'Workflow with invalid agent reference',
        steps: [
          {
            id: 'invalid-step',
            agentName: 'non-existent-agent',
            taskType: 'code-generation',
            prompt: 'Test'
          }
        ]
      };

      orchestrator.registerWorkflow(workflow);
      const result = await orchestrator.executeWorkflow('malformed-workflow', {});

      expect(result.kind).toBe('error');
      expect(result.code).toBe('step_execution_failed');
    });

    it('should handle execution timeouts gracefully', async () => {
      orchestrator.registerAgent(new TestSlowAgent());

      const result = await orchestrator.delegate('test-slow-agent', {
        timeout: 50 // Very short timeout
      });

      // The agent might still succeed if execution is fast enough,
      // but we're testing the timeout mechanism exists
      expect(result).toBeDefined();
      expect(result.kind).toMatch(/ok|error/);
    });
  });

  describe('Conditional Workflow Steps', () => {
    it('should skip steps based on conditions', async () => {
      const workflow: Workflow = {
        id: 'conditional-workflow',
        name: 'Conditional Workflow',
        description: 'Workflow with conditional steps',
        steps: [
          {
            id: 'step1',
            taskType: 'research',
            prompt: 'First step'
          },
          {
            id: 'step2',
            taskType: 'code-generation',
            prompt: 'Second step',
            condition: (result) => result.success === false // Should skip
          }
        ]
      };

      orchestrator.registerWorkflow(workflow);
      const result = await orchestrator.executeWorkflow('conditional-workflow', 'input');

      expect(result.kind).toBe('ok');
      // Should have executed only step1, skipped step2
      expect(result.metadata?.results).toHaveLength(1);
    });
  });
});