import { describe, it, expect, vi } from 'vitest';
import { BaseAgent, type AgentInput, type AgentResult } from '../../../src/agents/base/BaseAgent.js';

// Mock implementation for testing
class MockAgent extends BaseAgent {
  readonly name = 'mock-agent';

  async execute(input: AgentInput): Promise<AgentResult> {
    if (input.shouldFail) {
      return {
        kind: 'error',
        code: 'mock_error',
        message: 'Mock error for testing'
      };
    }

    return {
      kind: 'ok',
      data: { processed: true, input }
    };
  }
}

class MockErrorAgent extends BaseAgent {
  readonly name = 'error-agent';

  async execute(_input: AgentInput): Promise<AgentResult> {
    throw new Error('Unexpected error');
  }
}

describe('BaseAgent', () => {
  it('should have a name property', () => {
    const agent = new MockAgent();
    expect(agent.name).toBe('mock-agent');
  });

  it('should execute successfully with valid input', async () => {
    const agent = new MockAgent();
    const input = { test: 'data' };

    const result = await agent.execute(input);

    expect(result.kind).toBe('ok');
    expect(result.data).toEqual({ processed: true, input });
  });

  it('should return error result when execution fails', async () => {
    const agent = new MockAgent();
    const input = { shouldFail: true };

    const result = await agent.execute(input);

    expect(result.kind).toBe('error');
    expect(result.code).toBe('mock_error');
    expect(result.message).toBe('Mock error for testing');
  });

  it('should handle unexpected errors gracefully', async () => {
    const agent = new MockErrorAgent();

    await expect(agent.execute({})).rejects.toThrow('Unexpected error');
  });

  it('should handle empty input', async () => {
    const agent = new MockAgent();

    const result = await agent.execute({});

    expect(result.kind).toBe('ok');
    expect(result.data).toEqual({ processed: true, input: {} });
  });

  it('should handle complex nested input data', async () => {
    const agent = new MockAgent();
    const complexInput = {
      user: { id: 1, name: 'John' },
      settings: { theme: 'dark', notifications: true },
      metadata: { version: '1.0.0', timestamp: Date.now() }
    };

    const result = await agent.execute(complexInput);

    expect(result.kind).toBe('ok');
    expect(result.data).toEqual({ processed: true, input: complexInput });
  });
});

describe('AgentResult types', () => {
  it('should properly type check success results', () => {
    const successResult: AgentResult = {
      kind: 'ok',
      data: { message: 'Success' }
    };

    expect(successResult.kind).toBe('ok');
    if (successResult.kind === 'ok') {
      expect(successResult.data).toEqual({ message: 'Success' });
    }
  });

  it('should properly type check error results', () => {
    const errorResult: AgentResult = {
      kind: 'error',
      code: 'test_error',
      message: 'Test error message'
    };

    expect(errorResult.kind).toBe('error');
    if (errorResult.kind === 'error') {
      expect(errorResult.code).toBe('test_error');
      expect(errorResult.message).toBe('Test error message');
    }
  });
});