import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

export type TaskType = 
  | 'code-generation'
  | 'code-analysis' 
  | 'code-review'
  | 'documentation'
  | 'testing'
  | 'debugging'
  | 'research'
  | 'planning'
  | 'creative-writing'
  | 'structured-data'
  | 'error-handling'
  | 'optimization';

export type ModelProvider = 'openai' | 'anthropic';

export interface ModelResponse {
  provider: ModelProvider;
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  executionTime: number;
  retryCount?: number;
  circuitBreakerUsed?: boolean;
  fallbackUsed?: boolean;
}

interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  errorRate: number;
  lastUsed: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  halfOpenRequests: number;
}

export class ModelRouter {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private fallbackEnabled: boolean;
  private metrics: Map<ModelProvider, ProviderMetrics>;
  private circuitBreakers: Map<ModelProvider, CircuitBreakerState>;
  private readonly circuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    halfOpenMaxRequests: 3
  };

  constructor() {
  const openaiKey = process.env['OPENAI_API_KEY'];
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({
      apiKey: openaiKey
    });
    
  const anthropicKey = process.env['ANTHROPIC_API_KEY'];
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.anthropic = new Anthropic({
      apiKey: anthropicKey
    });

    this.fallbackEnabled = true;

    // Initialize metrics and circuit breakers
    this.metrics = new Map<ModelProvider, ProviderMetrics>([
      ['openai', {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        errorRate: 0,
        lastUsed: 0,
        circuitBreakerState: 'closed'
      }],
      ['anthropic', {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        errorRate: 0,
        lastUsed: 0,
        circuitBreakerState: 'closed'
      }]
    ]);

    this.circuitBreakers = new Map<ModelProvider, CircuitBreakerState>([
      ['openai', {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        halfOpenRequests: 0
      }],
      ['anthropic', {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        halfOpenRequests: 0
      }]
    ]);
  }

  /**
   * Intelligently selects the best model based on task type and context
   */
  selectOptimalModel(task: TaskType, context?: {
    codeComplexity?: 'low' | 'medium' | 'high';
    responseLength?: 'short' | 'medium' | 'long';
    realTimeRequired?: boolean;
    costSensitive?: boolean;
  }): ModelProvider {
    const { codeComplexity = 'medium', responseLength = 'medium', realTimeRequired = false, costSensitive = false } = context || {};

    // Cost-sensitive routing
    if (costSensitive) {
      return this.getCostEffectiveModel(task);
    }

    // Real-time routing (prefer faster models)
    if (realTimeRequired) {
      return 'openai'; // Generally faster response times
    }

    // Task-specific optimal routing
    switch (task) {
      case 'code-generation':
        return codeComplexity === 'high' ? 'openai' : 'openai'; // GPT-4 excels at coding
      
      case 'code-analysis':
      case 'code-review':
        return 'anthropic'; // Claude better at deep analysis and reasoning
      
      case 'documentation':
        return responseLength === 'long' ? 'anthropic' : 'openai';
      
      case 'testing':
        return 'openai'; // Better at structured test generation
      
      case 'debugging':
      case 'error-handling':
        return 'anthropic'; // Superior reasoning for complex debugging
      
      case 'research':
      case 'planning':
        return 'anthropic'; // Excellent at research synthesis and planning
      
      case 'creative-writing':
        return 'anthropic'; // More creative and nuanced
      
      case 'structured-data':
        return 'openai'; // Better with JSON, schemas, structured formats
      
      case 'optimization':
        return codeComplexity === 'high' ? 'anthropic' : 'openai';
      
      default:
        return 'openai'; // Default fallback
    }
  }

  private getCostEffectiveModel(task: TaskType): ModelProvider {
    // Anthropic generally more cost-effective for analysis tasks
    const analysisTasksAnthropicBetter = [
      'code-analysis', 'code-review', 'research', 'documentation', 'debugging'
    ];
    
    return analysisTasksAnthropicBetter.includes(task) ? 'anthropic' : 'openai';
  }

  /**
   * Execute task with optimal model, circuit breaker protection, and automatic fallback
   */
  async execute(
    task: TaskType,
    prompt: string,
    options: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      context?: Record<string, unknown>;
      fallbackOnError?: boolean;
    } = {}
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    let primaryModel = this.selectOptimalModel(task, options.context);
    let retryCount = 0;
    let circuitBreakerUsed = false;
    let fallbackUsed = false;

    // Check circuit breaker state and potentially select alternative
    if (!this.isProviderAvailable(primaryModel)) {
      const alternativeModel: ModelProvider = primaryModel === 'openai' ? 'anthropic' : 'openai';
      if (this.isProviderAvailable(alternativeModel)) {
        primaryModel = alternativeModel;
        circuitBreakerUsed = true;
        console.log(`Primary model ${primaryModel} circuit breaker open, using ${alternativeModel}`);
      } else {
        throw new Error('All model providers are currently unavailable due to circuit breaker protection');
      }
    }

    // Try primary model with circuit breaker protection
    try {
      const response = await this.executeWithCircuitBreaker(primaryModel, prompt, options);
      this.recordSuccess(primaryModel, Date.now() - startTime);

      return {
        ...response,
        provider: primaryModel,
        executionTime: Date.now() - startTime,
        retryCount,
        circuitBreakerUsed,
        fallbackUsed
      };
    } catch (error) {
      this.recordFailure(primaryModel, Date.now() - startTime);
      console.error(`Error with primary model ${primaryModel}:`, error);

      // Try fallback if enabled
      if (this.fallbackEnabled && (options.fallbackOnError ?? true)) {
        const fallbackModel: ModelProvider = primaryModel === 'openai' ? 'anthropic' : 'openai';

        if (this.isProviderAvailable(fallbackModel)) {
          console.log(`Falling back to ${fallbackModel}`);
          fallbackUsed = true;
          retryCount++;

          try {
            const response = await this.executeWithCircuitBreaker(fallbackModel, prompt, options);
            this.recordSuccess(fallbackModel, Date.now() - startTime);

            return {
              ...response,
              provider: fallbackModel,
              executionTime: Date.now() - startTime,
              retryCount,
              circuitBreakerUsed,
              fallbackUsed
            };
          } catch (fallbackError) {
            this.recordFailure(fallbackModel, Date.now() - startTime);
            console.error(`Fallback model ${fallbackModel} also failed:`, fallbackError);
            throw new Error(`Both models failed. Primary: ${error}, Fallback: ${fallbackError}`);
          }
        } else {
          throw new Error(`Primary model failed and fallback model ${fallbackModel} is unavailable`);
        }
      }

      throw error;
    }
  }

  private isProviderAvailable(provider: ModelProvider): boolean {
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (!circuitBreaker) return true;

    if (circuitBreaker.state === 'open') {
      // Check if recovery timeout has passed
      if (Date.now() - circuitBreaker.lastFailureTime > this.circuitBreakerConfig.recoveryTimeout) {
        circuitBreaker.state = 'half-open';
        circuitBreaker.halfOpenRequests = 0;
        this.updateMetricsCircuitBreakerState(provider, 'half-open');
        return true;
      }
      return false;
    }

    if (circuitBreaker.state === 'half-open') {
      return circuitBreaker.halfOpenRequests < this.circuitBreakerConfig.halfOpenMaxRequests;
    }

    return true;
  }

  private async executeWithCircuitBreaker(
    provider: ModelProvider,
    prompt: string,
    options: Record<string, unknown>
  ): Promise<Omit<ModelResponse, 'provider' | 'executionTime' | 'retryCount' | 'circuitBreakerUsed' | 'fallbackUsed'>> {
    const circuitBreaker = this.circuitBreakers.get(provider);

    if (circuitBreaker?.state === 'half-open') {
      circuitBreaker.halfOpenRequests++;
    }

    try {
      const result = await this.executeWithModel(provider, prompt, options);

      // Success - reset circuit breaker if it was half-open
      if (circuitBreaker?.state === 'half-open') {
        circuitBreaker.state = 'closed';
        circuitBreaker.failureCount = 0;
        this.updateMetricsCircuitBreakerState(provider, 'closed');
      }

      return result;
    } catch (error) {
      // Failure - update circuit breaker state
      if (circuitBreaker) {
        circuitBreaker.failureCount++;
        circuitBreaker.lastFailureTime = Date.now();

        if (circuitBreaker.state === 'half-open') {
          circuitBreaker.state = 'open';
          this.updateMetricsCircuitBreakerState(provider, 'open');
        } else if (circuitBreaker.failureCount >= this.circuitBreakerConfig.failureThreshold) {
          circuitBreaker.state = 'open';
          this.updateMetricsCircuitBreakerState(provider, 'open');
        }
      }

      throw error;
    }
  }

  private recordSuccess(provider: ModelProvider, latency: number): void {
    const metrics = this.metrics.get(provider);
    if (metrics) {
      metrics.totalRequests++;
      metrics.successfulRequests++;
      metrics.lastUsed = Date.now();

      // Update rolling average latency
      const totalLatency = metrics.averageLatency * (metrics.totalRequests - 1) + latency;
      metrics.averageLatency = totalLatency / metrics.totalRequests;

      metrics.errorRate = metrics.failedRequests / metrics.totalRequests;
    }
  }

  private recordFailure(provider: ModelProvider, latency: number): void {
    const metrics = this.metrics.get(provider);
    if (metrics) {
      metrics.totalRequests++;
      metrics.failedRequests++;
      metrics.lastUsed = Date.now();

      // Update rolling average latency
      const totalLatency = metrics.averageLatency * (metrics.totalRequests - 1) + latency;
      metrics.averageLatency = totalLatency / metrics.totalRequests;

      metrics.errorRate = metrics.failedRequests / metrics.totalRequests;
    }
  }

  private updateMetricsCircuitBreakerState(provider: ModelProvider, state: 'closed' | 'open' | 'half-open'): void {
    const metrics = this.metrics.get(provider);
    if (metrics) {
      metrics.circuitBreakerState = state;
    }
  }

  private async executeWithModel(
    provider: ModelProvider,
    prompt: string,
    options: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<Omit<ModelResponse, 'provider' | 'executionTime'>> {
    const { systemPrompt, maxTokens = 4000, temperature = 0.7 } = options;

    if (provider === 'openai') {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          { role: 'user' as const, content: prompt }
        ],
        max_tokens: maxTokens,
        temperature
      });

      return {
        content: response.choices[0]?.message?.content || '',
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          cost: this.calculateOpenAICost(response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0)
        }
      };
    } else {
      const messages = [
        ...(systemPrompt ? [{ role: 'user' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: prompt }
      ];

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        messages,
        max_tokens: maxTokens,
        temperature
      });

      const content = response.content[0];
      return {
        content: content.type === 'text' ? content.text : '',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cost: this.calculateAnthropicCost(response.usage.input_tokens, response.usage.output_tokens)
        }
      };
    }
  }

  private calculateOpenAICost(inputTokens: number, outputTokens: number): number {
    // GPT-4o pricing (as of 2024)
    const inputCostPer1K = 0.005;  // $0.005 per 1K input tokens
    const outputCostPer1K = 0.015; // $0.015 per 1K output tokens
    
    return (inputTokens / 1000) * inputCostPer1K + (outputTokens / 1000) * outputCostPer1K;
  }

  private calculateAnthropicCost(inputTokens: number, outputTokens: number): number {
    // Claude 3.5 Sonnet pricing
    const inputCostPer1K = 0.003;  // $0.003 per 1K input tokens
    const outputCostPer1K = 0.015; // $0.015 per 1K output tokens
    
    return (inputTokens / 1000) * inputCostPer1K + (outputTokens / 1000) * outputCostPer1K;
  }

  /**
   * Get model performance stats for monitoring
   */
  async getModelStats(): Promise<{
    openai: { available: boolean; latency: number | null };
    anthropic: { available: boolean; latency: number | null };
  }> {
    const checkModel = async (provider: ModelProvider): Promise<{ available: boolean; latency: number | null }> => {
      try {
        const start = Date.now();
        await this.executeWithModel(provider, 'Test', { maxTokens: 10 });
        return { available: true, latency: Date.now() - start };
      } catch {
        return { available: false, latency: null };
      }
    };

    const [openaiStats, anthropicStats] = await Promise.all([
      checkModel('openai'),
      checkModel('anthropic')
    ]);

    return {
      openai: openaiStats,
      anthropic: anthropicStats
    };
  }

  /**
   * Simplified route method for Context7Service integration
   */
  async route(request: { prompt: string; taskType: TaskType; context?: string }): Promise<ModelResponse> {
    const provider = this.selectOptimalModel(request.taskType);
    const startTime = Date.now();
    
    const result = await this.executeWithModel(provider, request.prompt, {
      ...(request.context ? { systemPrompt: request.context } : {})
    });
    
    const executionTime = Date.now() - startTime;
    
    return {
      provider,
      executionTime,
      ...result
    };
  }
}

// Export singleton instance
export const modelRouter = new ModelRouter();