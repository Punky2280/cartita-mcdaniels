import { EventEmitter } from 'node:events';

export interface AgentInput {
  [key: string]: unknown;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retryPolicy?: RetryPolicy;
  metadata?: Record<string, unknown>;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  errorRate: number;
}

export interface ExecutionContext {
  startTime: number;
  executionId: string;
  traceId?: string;
  correlationId?: string;
  metadata: Record<string, unknown>;
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

type AgentErrorResult = Extract<AgentResult, { kind: 'error' }>;
type AgentErrorCategory = AgentErrorResult['category'];

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxRequests: number;
}

class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenRequests = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'half-open';
        this.halfOpenRequests = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    if (this.state === 'half-open' && this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
      throw new Error('Circuit breaker half-open limit exceeded');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return this.state;
  }
}

class AgentMetricsCollector {
  private metrics: AgentMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    lastExecutionTime: 0,
    circuitBreakerState: 'closed',
    errorRate: 0
  };

  private executionTimes: number[] = [];
  private readonly maxExecutionTimesSamples = 100;

  recordExecution(duration: number, success: boolean) {
    this.metrics.totalExecutions++;
    this.metrics.lastExecutionTime = duration;

    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    this.executionTimes.push(duration);
    if (this.executionTimes.length > this.maxExecutionTimesSamples) {
      this.executionTimes.shift();
    }

    this.metrics.averageExecutionTime = this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length;
    this.metrics.errorRate = this.metrics.failedExecutions / this.metrics.totalExecutions;
  }

  updateCircuitBreakerState(state: 'closed' | 'open' | 'half-open') {
    this.metrics.circuitBreakerState = state;
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      lastExecutionTime: 0,
      circuitBreakerState: 'closed',
      errorRate: 0
    };
    this.executionTimes = [];
  }
}

export abstract class BaseAgent extends EventEmitter {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;

  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly metricsCollector: AgentMetricsCollector;
  protected readonly defaultTimeout: number;
  protected readonly defaultRetryPolicy: RetryPolicy;

  constructor(
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {},
    defaultTimeout = 30000,
    defaultRetryPolicy: Partial<RetryPolicy> = {}
  ) {
    super();

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 300000,
      halfOpenMaxRequests: 3,
      ...circuitBreakerConfig
    });

    this.metricsCollector = new AgentMetricsCollector();
    this.defaultTimeout = defaultTimeout;

    this.defaultRetryPolicy = {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 30000,
      retryableErrors: ['timeout', 'network', 'rate-limit', 'temporary'],
      ...defaultRetryPolicy
    };
  }

  abstract executeCore(input: AgentInput, context: ExecutionContext): Promise<AgentResult>;

  async execute(input: AgentInput): Promise<AgentResult> {
    const executionId = this.generateExecutionId();
    const timeout = input.timeout || this.defaultTimeout;
    const retryPolicy = { ...this.defaultRetryPolicy, ...input.retryPolicy };

    const context: ExecutionContext = {
      startTime: Date.now(),
      executionId,
      metadata: input.metadata || {}
    };

    if (typeof context.metadata['traceId'] === 'string') {
      context.traceId = context.metadata['traceId'] as string;
    }

    if (typeof context.metadata['correlationId'] === 'string') {
      context.correlationId = context.metadata['correlationId'] as string;
    }

    this.emit('executionStarted', {
      agentName: this.name,
      executionId,
      input: this.sanitizeInput(input),
      timestamp: new Date().toISOString()
    });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          () => this.circuitBreaker.execute(() => this.executeCore(input, context)),
          timeout
        );

        const executionTime = Date.now() - context.startTime;
        this.metricsCollector.recordExecution(executionTime, result.kind === 'ok');
        this.metricsCollector.updateCircuitBreakerState(this.circuitBreaker.getState());

        this.emit('executionCompleted', {
          agentName: this.name,
          executionId,
          result: result.kind === 'ok' ? 'success' : 'error',
          executionTime,
          attempt: attempt + 1,
          timestamp: new Date().toISOString()
        });

        return {
          ...result,
          executionTime,
          metadata: {
            ...result.metadata,
            executionId,
            attempt: attempt + 1,
            circuitBreakerState: this.circuitBreaker.getState()
          }
        };

      } catch (error) {
        lastError = error as Error;
        const executionTime = Date.now() - context.startTime;

        this.metricsCollector.recordExecution(executionTime, false);
        this.metricsCollector.updateCircuitBreakerState(this.circuitBreaker.getState());

        const isRetryable = this.isRetryableError(lastError, retryPolicy);
        const isLastAttempt = attempt === retryPolicy.maxRetries;

        this.emit('executionError', {
          agentName: this.name,
          executionId,
          error: lastError.message,
          attempt: attempt + 1,
          isRetryable,
          isLastAttempt,
          timestamp: new Date().toISOString()
        });

        if (!isRetryable || isLastAttempt) {
          return {
            kind: 'error',
            code: this.categorizeError(lastError),
            message: lastError.message,
            category: this.getErrorCategory(lastError),
            retryable: isRetryable,
            executionTime,
            metadata: {
              executionId,
              attempt: attempt + 1,
              circuitBreakerState: this.circuitBreaker.getState()
            }
          };
        }

        // Wait before retry
        if (attempt < retryPolicy.maxRetries) {
          const delay = Math.min(
            retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, attempt),
            retryPolicy.maxDelay
          );
          await this.sleep(delay);
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      kind: 'error',
      code: 'execution_failed',
      message: lastError?.message || 'Unknown execution error',
      category: 'execution',
      retryable: false,
      executionTime: Date.now() - context.startTime,
      metadata: { executionId }
    };
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout);
      })
    ]);
  }

  private isRetryableError(error: Error, policy: RetryPolicy): boolean {
    const errorType = this.categorizeError(error);
    return policy.retryableErrors.includes(errorType);
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) return 'timeout';
    if (message.includes('network') || message.includes('connection')) return 'network';
    if (message.includes('rate limit') || message.includes('quota')) return 'rate-limit';
    if (message.includes('circuit breaker')) return 'circuit-breaker';
    if (message.includes('validation')) return 'validation';
    if (message.includes('temporary') || message.includes('unavailable')) return 'temporary';

    return 'unknown';
  }

  private getErrorCategory(error: Error): AgentErrorCategory {
    const type = this.categorizeError(error);

    switch (type) {
      case 'validation':
        return 'validation';
      case 'timeout':
        return 'timeout';
      case 'circuit-breaker':
        return 'circuit-breaker';
      case 'network':
      case 'rate-limit':
      case 'temporary':
        return 'system';
      default:
        return 'execution';
    }
  }

  private generateExecutionId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeInput(input: AgentInput): Record<string, unknown> {
    // Remove sensitive data for logging
    const sanitized = { ...input };
    delete sanitized['password'];
    delete sanitized['token'];
    delete sanitized['apiKey'];
    delete sanitized['secret'];
    return sanitized;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetrics(): AgentMetrics {
    return this.metricsCollector.getMetrics();
  }

  resetMetrics(): void {
    this.metricsCollector.reset();
  }

  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: AgentMetrics;
    uptime: number;
  } {
    const metrics = this.getMetrics();
    const uptime = process.uptime();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (metrics.circuitBreakerState === 'open') {
      status = 'unhealthy';
    } else if (metrics.errorRate > 0.1 || metrics.circuitBreakerState === 'half-open') {
      status = 'degraded';
    }

    return { status, metrics, uptime };
  }
}
