import { EventEmitter } from 'node:events';
class CircuitBreaker {
    config;
    state = 'closed';
    failureCount = 0;
    lastFailureTime = 0;
    halfOpenRequests = 0;
    constructor(config) {
        this.config = config;
    }
    async execute(fn) {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
                this.state = 'half-open';
                this.halfOpenRequests = 0;
            }
            else {
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
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failureCount = 0;
        if (this.state === 'half-open') {
            this.state = 'closed';
        }
    }
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.state === 'half-open') {
            this.state = 'open';
        }
        else if (this.failureCount >= this.config.failureThreshold) {
            this.state = 'open';
        }
    }
    getState() {
        return this.state;
    }
}
class AgentMetricsCollector {
    metrics = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        lastExecutionTime: 0,
        circuitBreakerState: 'closed',
        errorRate: 0
    };
    executionTimes = [];
    maxExecutionTimesSamples = 100;
    recordExecution(duration, success) {
        this.metrics.totalExecutions++;
        this.metrics.lastExecutionTime = duration;
        if (success) {
            this.metrics.successfulExecutions++;
        }
        else {
            this.metrics.failedExecutions++;
        }
        this.executionTimes.push(duration);
        if (this.executionTimes.length > this.maxExecutionTimesSamples) {
            this.executionTimes.shift();
        }
        this.metrics.averageExecutionTime = this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length;
        this.metrics.errorRate = this.metrics.failedExecutions / this.metrics.totalExecutions;
    }
    updateCircuitBreakerState(state) {
        this.metrics.circuitBreakerState = state;
    }
    getMetrics() {
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
export class BaseAgent extends EventEmitter {
    circuitBreaker;
    metricsCollector;
    defaultTimeout;
    defaultRetryPolicy;
    constructor(circuitBreakerConfig = {}, defaultTimeout = 30000, defaultRetryPolicy = {}) {
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
    async execute(input) {
        const executionId = this.generateExecutionId();
        const timeout = input.timeout || this.defaultTimeout;
        const retryPolicy = { ...this.defaultRetryPolicy, ...input.retryPolicy };
        const context = {
            startTime: Date.now(),
            executionId,
            metadata: input.metadata || {}
        };
        if (typeof context.metadata['traceId'] === 'string') {
            context.traceId = context.metadata['traceId'];
        }
        if (typeof context.metadata['correlationId'] === 'string') {
            context.correlationId = context.metadata['correlationId'];
        }
        this.emit('executionStarted', {
            agentName: this.name,
            executionId,
            input: this.sanitizeInput(input),
            timestamp: new Date().toISOString()
        });
        let lastError = null;
        for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
            try {
                const result = await this.executeWithTimeout(() => this.circuitBreaker.execute(() => this.executeCore(input, context)), timeout);
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
            }
            catch (error) {
                lastError = error;
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
                    const delay = Math.min(retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, attempt), retryPolicy.maxDelay);
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
    async executeWithTimeout(fn, timeout) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout);
            })
        ]);
    }
    isRetryableError(error, policy) {
        const errorType = this.categorizeError(error);
        return policy.retryableErrors.includes(errorType);
    }
    categorizeError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('timeout'))
            return 'timeout';
        if (message.includes('network') || message.includes('connection'))
            return 'network';
        if (message.includes('rate limit') || message.includes('quota'))
            return 'rate-limit';
        if (message.includes('circuit breaker'))
            return 'circuit-breaker';
        if (message.includes('validation'))
            return 'validation';
        if (message.includes('temporary') || message.includes('unavailable'))
            return 'temporary';
        return 'unknown';
    }
    getErrorCategory(error) {
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
    generateExecutionId() {
        return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    sanitizeInput(input) {
        // Remove sensitive data for logging
        const sanitized = { ...input };
        delete sanitized['password'];
        delete sanitized['token'];
        delete sanitized['apiKey'];
        delete sanitized['secret'];
        return sanitized;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getMetrics() {
        return this.metricsCollector.getMetrics();
    }
    resetMetrics() {
        this.metricsCollector.reset();
    }
    getHealth() {
        const metrics = this.getMetrics();
        const uptime = process.uptime();
        let status = 'healthy';
        if (metrics.circuitBreakerState === 'open') {
            status = 'unhealthy';
        }
        else if (metrics.errorRate > 0.1 || metrics.circuitBreakerState === 'half-open') {
            status = 'degraded';
        }
        return { status, metrics, uptime };
    }
}
