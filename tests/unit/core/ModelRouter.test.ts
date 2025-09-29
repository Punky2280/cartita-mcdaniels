import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelRouter, type TaskType, type ModelProvider } from '../../../src/core/ModelRouter.js';

// Mock OpenAI and Anthropic SDKs
vi.mock('openai');
vi.mock('@anthropic-ai/sdk');
vi.mock('dotenv/config');

// Mock environment variables
const mockEnv = {
  OPENAI_API_KEY: 'test-openai-key',
  ANTHROPIC_API_KEY: 'test-anthropic-key'
};

describe('ModelRouter', () => {
  let modelRouter: ModelRouter;
  let mockOpenAI: any;
  let mockAnthropic: any;

  beforeEach(() => {
    // Set up environment variables
    Object.assign(process.env, mockEnv);

    // Mock OpenAI
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    };

    // Mock Anthropic
    mockAnthropic = {
      messages: {
        create: vi.fn()
      }
    };

    // Mock the constructors
    const OpenAI = vi.fn(() => mockOpenAI);
    const Anthropic = vi.fn(() => mockAnthropic);

    vi.doMock('openai', () => ({ default: OpenAI }));
    vi.doMock('@anthropic-ai/sdk', () => ({ default: Anthropic }));

    // Create fresh instance
    const { ModelRouter: FreshModelRouter } = require('../../../src/core/ModelRouter.js');
    modelRouter = new FreshModelRouter();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Constructor', () => {
    it('should throw error when OPENAI_API_KEY is missing', () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        const { ModelRouter } = require('../../../src/core/ModelRouter.js');
        new ModelRouter();
      }).toThrow('OPENAI_API_KEY environment variable is required');
    });

    it('should throw error when ANTHROPIC_API_KEY is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;

      expect(() => {
        const { ModelRouter } = require('../../../src/core/ModelRouter.js');
        new ModelRouter();
      }).toThrow('ANTHROPIC_API_KEY environment variable is required');
    });
  });

  describe('selectOptimalModel', () => {
    it('should select OpenAI for code generation tasks', () => {
      const provider = modelRouter.selectOptimalModel('code-generation');
      expect(provider).toBe('openai');
    });

    it('should select Anthropic for code analysis tasks', () => {
      const provider = modelRouter.selectOptimalModel('code-analysis');
      expect(provider).toBe('anthropic');
    });

    it('should select Anthropic for research tasks', () => {
      const provider = modelRouter.selectOptimalModel('research');
      expect(provider).toBe('anthropic');
    });

    it('should consider context for model selection', () => {
      const provider = modelRouter.selectOptimalModel('documentation', {
        responseLength: 'long'
      });
      expect(provider).toBe('anthropic');
    });

    it('should prefer OpenAI for real-time required tasks', () => {
      const provider = modelRouter.selectOptimalModel('code-analysis', {
        realTimeRequired: true
      });
      expect(provider).toBe('openai');
    });

    it('should consider cost sensitivity', () => {
      const provider = modelRouter.selectOptimalModel('code-analysis', {
        costSensitive: true
      });
      expect(provider).toBe('anthropic');
    });

    it('should fallback to OpenAI for unknown task types', () => {
      const provider = modelRouter.selectOptimalModel('unknown-task' as TaskType);
      expect(provider).toBe('openai');
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Mock successful OpenAI response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'OpenAI response' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      });

      // Mock successful Anthropic response
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Anthropic response' }],
        usage: { input_tokens: 100, output_tokens: 50 }
      });
    });

    it('should execute successfully with OpenAI', async () => {
      const result = await modelRouter.execute('code-generation', 'Test prompt');

      expect(result.provider).toBe('openai');
      expect(result.content).toBe('OpenAI response');
      expect(result.usage?.inputTokens).toBe(100);
      expect(result.usage?.outputTokens).toBe(50);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should execute successfully with Anthropic', async () => {
      const result = await modelRouter.execute('code-analysis', 'Test prompt');

      expect(result.provider).toBe('anthropic');
      expect(result.content).toBe('Anthropic response');
      expect(result.usage?.inputTokens).toBe(100);
      expect(result.usage?.outputTokens).toBe(50);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should include system prompt when provided', async () => {
      await modelRouter.execute('code-generation', 'Test prompt', {
        systemPrompt: 'You are a helpful assistant'
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Test prompt' }
        ],
        max_tokens: 4000,
        temperature: 0.7
      });
    });

    it('should handle custom parameters', async () => {
      await modelRouter.execute('code-generation', 'Test prompt', {
        maxTokens: 2000,
        temperature: 0.5
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Test prompt' }],
        max_tokens: 2000,
        temperature: 0.5
      });
    });

    it('should fallback to alternative model on primary failure', async () => {
      // Make OpenAI fail
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'));

      const result = await modelRouter.execute('code-generation', 'Test prompt');

      expect(result.provider).toBe('anthropic');
      expect(result.content).toBe('Anthropic response');
    });

    it('should throw error when both models fail', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI error'));
      mockAnthropic.messages.create.mockRejectedValue(new Error('Anthropic error'));

      await expect(
        modelRouter.execute('code-generation', 'Test prompt')
      ).rejects.toThrow('Both models failed');
    });

    it('should respect fallbackOnError option', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI error'));

      await expect(
        modelRouter.execute('code-generation', 'Test prompt', {
          fallbackOnError: false
        })
      ).rejects.toThrow('OpenAI error');
    });
  });

  describe('cost calculation', () => {
    it('should calculate OpenAI costs correctly', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 500 }
      });

      const result = await modelRouter.execute('code-generation', 'Test prompt');

      // Cost calculation: (1000/1000 * 0.005) + (500/1000 * 0.015) = 0.005 + 0.0075 = 0.0125
      expect(result.usage?.cost).toBeCloseTo(0.0125, 4);
    });

    it('should calculate Anthropic costs correctly', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 1000, output_tokens: 500 }
      });

      const result = await modelRouter.execute('code-analysis', 'Test prompt');

      // Cost calculation: (1000/1000 * 0.003) + (500/1000 * 0.015) = 0.003 + 0.0075 = 0.0105
      expect(result.usage?.cost).toBeCloseTo(0.0105, 4);
    });
  });

  describe('getModelStats', () => {
    it('should return model availability stats', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Test' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Test' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      const stats = await modelRouter.getModelStats();

      expect(stats.openai.available).toBe(true);
      expect(stats.anthropic.available).toBe(true);
      expect(stats.openai.latency).toBeGreaterThan(0);
      expect(stats.anthropic.latency).toBeGreaterThan(0);
    });

    it('should handle unavailable models', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Service unavailable'));
      mockAnthropic.messages.create.mockRejectedValue(new Error('Service unavailable'));

      const stats = await modelRouter.getModelStats();

      expect(stats.openai.available).toBe(false);
      expect(stats.anthropic.available).toBe(false);
      expect(stats.openai.latency).toBeNull();
      expect(stats.anthropic.latency).toBeNull();
    });
  });

  describe('route method', () => {
    it('should execute routing correctly', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Analysis complete' }],
        usage: { input_tokens: 50, output_tokens: 25 }
      });

      const result = await modelRouter.route({
        prompt: 'Analyze this code',
        taskType: 'code-analysis',
        context: 'You are a code reviewer'
      });

      expect(result.provider).toBe('anthropic');
      expect(result.content).toBe('Analysis complete');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle routing without context', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Research complete' }],
        usage: { input_tokens: 75, output_tokens: 100 }
      });

      const result = await modelRouter.route({
        prompt: 'Research this topic',
        taskType: 'research'
      });

      expect(result.provider).toBe('anthropic');
      expect(result.content).toBe('Research complete');
    });
  });
});