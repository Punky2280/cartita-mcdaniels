import { EventEmitter } from 'node:events';
import { spawn, ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  config: {
    priority: number;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    healthCheckInterval: number;
    circuitBreaker: {
      failureThreshold: number;
      resetTimeout: number;
    };
    rateLimit: {
      requests: number;
      window: number;
    };
    category: string;
    critical: boolean;
  };
}

export interface MCPServerMetrics {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'degraded';
  uptime: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastHealthCheck: Date;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  rateLimitStatus: {
    remaining: number;
    resetTime: number;
  };
  resourceUsage: {
    cpu: number;
    memory: number;
  };
}

export interface MCPRequest {
  id: string;
  serverName: string;
  method: string;
  params: any;
  timestamp: number;
  timeout: number;
}

export interface MCPResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  responseTime: number;
  fromCache?: boolean;
}

export class MCPOptimizer extends EventEmitter {
  private servers = new Map<string, MCPServerConfig>();
  private processes = new Map<string, ChildProcess>();
  private metrics = new Map<string, MCPServerMetrics>();
  private circuitBreakers = new Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number;
    halfOpenRequests: number;
  }>();
  private rateLimiters = new Map<string, {
    requests: number[];
    windowStart: number;
  }>();
  private requestQueue = new Map<string, MCPRequest[]>();
  private responseCache = new Map<string, { data: any; expiry: number }>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    this.loadConfiguration();
    this.setupGlobalErrorHandling();
  }

  private loadConfiguration(): void {
    try {
      const configContent = readFileSync('./mcp_config.json', 'utf-8');
      const config = JSON.parse(configContent);

      if (config.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          this.servers.set(name, serverConfig as MCPServerConfig);
          this.initializeServerMetrics(name);
          this.initializeCircuitBreaker(name);
          this.initializeRateLimiter(name);
        }
      }

      console.log(`Loaded ${this.servers.size} MCP server configurations`);
    } catch (error) {
      console.error('Failed to load MCP configuration:', error);
    }
  }

  private initializeServerMetrics(name: string): void {
    this.metrics.set(name, {
      name,
      status: 'stopped',
      uptime: 0,
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastHealthCheck: new Date(),
      circuitBreakerState: 'closed',
      rateLimitStatus: {
        remaining: 0,
        resetTime: 0
      },
      resourceUsage: {
        cpu: 0,
        memory: 0
      }
    });
  }

  private initializeCircuitBreaker(name: string): void {
    this.circuitBreakers.set(name, {
      state: 'closed',
      failures: 0,
      lastFailure: 0,
      halfOpenRequests: 0
    });
  }

  private initializeRateLimiter(name: string): void {
    this.rateLimiters.set(name, {
      requests: [],
      windowStart: Date.now()
    });
  }

  private setupGlobalErrorHandling(): void {
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled MCP rejection:', reason);
      this.emit('error', { type: 'unhandled_rejection', reason, promise });
    });
  }

  /**
   * Start all MCP servers with optimization
   */
  public async startAllServers(): Promise<void> {
    console.log('Starting optimized MCP servers...');

    // Sort servers by priority (higher priority first)
    const sortedServers = Array.from(this.servers.entries())
      .sort(([, a], [, b]) => b.config.priority - a.config.priority);

    // Start critical servers first
    const criticalServers = sortedServers.filter(([, config]) => config.config.critical);
    const nonCriticalServers = sortedServers.filter(([, config]) => !config.config.critical);

    // Start critical servers sequentially
    for (const [name, config] of criticalServers) {
      await this.startServer(name, config);
      await this.delay(1000); // 1 second delay between critical servers
    }

    // Start non-critical servers in parallel
    const nonCriticalPromises = nonCriticalServers.map(([name, config]) =>
      this.startServer(name, config).catch(error => {
        console.error(`Failed to start non-critical server ${name}:`, error);
      })
    );

    await Promise.allSettled(nonCriticalPromises);

    console.log('MCP server startup completed');
    this.startHealthChecks();
  }

  private async startServer(name: string, config: MCPServerConfig): Promise<void> {
    try {
      console.log(`Starting MCP server: ${name}`);

      // Prepare environment variables
      const serverEnv = { ...process.env };
      for (const [key, value] of Object.entries(config.env)) {
        const envValue = value.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
          const parts = envVar.split(':-');
          const varName = parts[0];
          const defaultValue = parts[1] || '';
          return process.env[varName] || defaultValue;
        });
        serverEnv[key] = envValue;
      }

      // Spawn the server process
      const childProcess = spawn(config.command, config.args, {
        env: serverEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      this.processes.set(name, childProcess);

      // Setup process event handlers
      this.setupProcessHandlers(name, childProcess, config);

      // Wait for server to be ready
      await this.waitForServerReady(name, config.config.timeout);

      // Update metrics
      const metrics = this.metrics.get(name)!;
      metrics.status = 'running';
      metrics.uptime = Date.now();

      console.log(`✅ MCP server ${name} started successfully`);

    } catch (error) {
      console.error(`❌ Failed to start MCP server ${name}:`, error);
      this.handleServerError(name, error as Error);
      throw error;
    }
  }

  private setupProcessHandlers(name: string, childProcess: ChildProcess, config: MCPServerConfig): void {
    childProcess.stdout?.on('data', (data) => {
      this.emit('serverOutput', { name, output: data.toString(), type: 'stdout' });
    });

    childProcess.stderr?.on('data', (data) => {
      this.emit('serverOutput', { name, output: data.toString(), type: 'stderr' });
    });

    childProcess.on('error', (error) => {
      console.error(`MCP server ${name} error:`, error);
      this.handleServerError(name, error);
    });

    childProcess.on('exit', (code, signal) => {
      console.log(`MCP server ${name} exited with code ${code}, signal ${signal}`);
      this.handleServerExit(name, code, signal, config);
    });

    childProcess.on('close', (code) => {
      console.log(`MCP server ${name} closed with code ${code}`);
      this.processes.delete(name);
    });
  }

  private async waitForServerReady(name: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(async () => {
        try {
          const isReady = await this.checkServerHealth(name);
          if (isReady) {
            clearInterval(checkInterval);
            resolve();
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(new Error(`Server ${name} failed to start within ${timeout}ms`));
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(error);
          }
        }
      }, 500); // Check every 500ms
    });
  }

  private async checkServerHealth(name: string): Promise<boolean> {
    const process = this.processes.get(name);
    if (!process || process.killed) {
      return false;
    }

    try {
      // Send a simple ping request to check if server is responsive
      const response = await this.sendRequest(name, 'ping', {}, 2000);
      return response.success;
    } catch {
      return false;
    }
  }

  private handleServerError(name: string, error: Error): void {
    const metrics = this.metrics.get(name)!;
    metrics.errorCount++;
    metrics.status = 'error';

    // Update circuit breaker
    const circuitBreaker = this.circuitBreakers.get(name)!;
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();

    const config = this.servers.get(name)!;
    if (circuitBreaker.failures >= config.config.circuitBreaker.failureThreshold) {
      circuitBreaker.state = 'open';
      metrics.circuitBreakerState = 'open';
      console.log(`Circuit breaker opened for ${name} due to failures`);

      // Auto-recovery after timeout
      setTimeout(() => {
        circuitBreaker.state = 'half-open';
        circuitBreaker.halfOpenRequests = 0;
        metrics.circuitBreakerState = 'half-open';
        console.log(`Circuit breaker for ${name} moved to half-open state`);
      }, config.config.circuitBreaker.resetTimeout);
    }

    this.emit('serverError', { name, error, metrics });
  }

  private async handleServerExit(
    name: string,
    code: number | null,
    signal: string | null,
    config: MCPServerConfig
  ): Promise<void> {
    const metrics = this.metrics.get(name)!;
    metrics.status = 'stopped';

    // Auto-restart critical servers
    if (config.config.critical && code !== 0) {
      console.log(`Attempting to restart critical server ${name}`);
      await this.delay(config.config.retryDelay);

      try {
        await this.startServer(name, config);
      } catch (error) {
        console.error(`Failed to restart server ${name}:`, error);
      }
    }
  }

  /**
   * Send optimized request to MCP server
   */
  public async sendRequest(
    serverName: string,
    method: string,
    params: any,
    timeout?: number
  ): Promise<MCPResponse> {
    const config = this.servers.get(serverName);
    if (!config) {
      throw new Error(`MCP server ${serverName} not found`);
    }

    const requestId = this.generateRequestId();
    const request: MCPRequest = {
      id: requestId,
      serverName,
      method,
      params,
      timestamp: Date.now(),
      timeout: timeout || config.config.timeout
    };

    // Check circuit breaker
    if (!this.isCircuitBreakerClosed(serverName)) {
      throw new Error(`Circuit breaker is open for ${serverName}`);
    }

    // Check rate limit
    if (!this.checkRateLimit(serverName)) {
      throw new Error(`Rate limit exceeded for ${serverName}`);
    }

    // Check cache first
    const cacheKey = `${serverName}:${method}:${JSON.stringify(params)}`;
    const cached = this.responseCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return {
        id: requestId,
        success: true,
        data: cached.data,
        responseTime: 0,
        fromCache: true
      };
    }

    const startTime = performance.now();

    try {
      const response = await this.executeRequest(request);

      // Update metrics
      this.updateSuccessMetrics(serverName, performance.now() - startTime);

      // Cache successful responses
      if (response.success && this.isCacheable(method)) {
        this.responseCache.set(cacheKey, {
          data: response.data,
          expiry: Date.now() + 60000 // 1 minute cache
        });
      }

      return response;

    } catch (error) {
      this.updateErrorMetrics(serverName);
      throw error;
    }
  }

  private isCircuitBreakerClosed(serverName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serverName)!;
    const config = this.servers.get(serverName)!;

    switch (circuitBreaker.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if enough time has passed to try half-open
        if (Date.now() - circuitBreaker.lastFailure > config.config.circuitBreaker.resetTimeout) {
          circuitBreaker.state = 'half-open';
          circuitBreaker.halfOpenRequests = 0;
          return true;
        }
        return false;

      case 'half-open':
        // Allow limited requests in half-open state
        return circuitBreaker.halfOpenRequests < 3;
    }
  }

  private checkRateLimit(serverName: string): boolean {
    const config = this.servers.get(serverName)!;
    const rateLimiter = this.rateLimiters.get(serverName)!;
    const now = Date.now();

    // Clean old requests outside the window
    rateLimiter.requests = rateLimiter.requests.filter(
      timestamp => now - timestamp < config.config.rateLimit.window
    );

    // Check if we're within limits
    if (rateLimiter.requests.length >= config.config.rateLimit.requests) {
      return false;
    }

    // Add current request
    rateLimiter.requests.push(now);
    return true;
  }

  private async executeRequest(request: MCPRequest): Promise<MCPResponse> {
    return new Promise((resolve, reject) => {
      const process = this.processes.get(request.serverName);
      if (!process) {
        reject(new Error(`Server ${request.serverName} is not running`));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${request.serverName}`));
      }, request.timeout);

      // Send request to process
      const requestData = JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        method: request.method,
        params: request.params
      });

      process.stdin?.write(requestData + '\n');

      // Listen for response
      const responseHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === request.id) {
            clearTimeout(timeout);
            process.stdout?.off('data', responseHandler);

            resolve({
              id: request.id,
              success: !response.error,
              data: response.result || response.error,
              responseTime: Date.now() - request.timestamp
            });
          }
        } catch (error) {
          // Ignore parse errors, wait for complete response
        }
      };

      process.stdout?.on('data', responseHandler);
    });
  }

  private updateSuccessMetrics(serverName: string, responseTime: number): void {
    const metrics = this.metrics.get(serverName)!;
    metrics.requestCount++;

    // Update average response time (exponential moving average)
    const alpha = 0.1;
    metrics.averageResponseTime =
      (1 - alpha) * metrics.averageResponseTime + alpha * responseTime;

    // Reset circuit breaker on success
    const circuitBreaker = this.circuitBreakers.get(serverName)!;
    if (circuitBreaker.state === 'half-open') {
      circuitBreaker.halfOpenRequests++;
      if (circuitBreaker.halfOpenRequests >= 3) {
        circuitBreaker.state = 'closed';
        circuitBreaker.failures = 0;
        metrics.circuitBreakerState = 'closed';
      }
    } else if (circuitBreaker.state === 'closed') {
      circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
    }
  }

  private updateErrorMetrics(serverName: string): void {
    const metrics = this.metrics.get(serverName)!;
    metrics.errorCount++;
    this.handleServerError(serverName, new Error('Request failed'));
  }

  private isCacheable(method: string): boolean {
    // Cache read-only operations
    const cacheableMethods = ['ping', 'list', 'get', 'search', 'read'];
    return cacheableMethods.includes(method.toLowerCase());
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start health monitoring for all servers
   */
  private startHealthChecks(): void {
    for (const [name, config] of this.servers.entries()) {
      const interval = setInterval(async () => {
        try {
          const isHealthy = await this.checkServerHealth(name);
          const metrics = this.metrics.get(name)!;

          if (isHealthy) {
            if (metrics.status === 'error' || metrics.status === 'degraded') {
              metrics.status = 'running';
              console.log(`✅ Server ${name} recovered`);
            }
          } else {
            if (metrics.status === 'running') {
              metrics.status = 'degraded';
              console.log(`⚠️ Server ${name} health check failed`);
            }
          }

          metrics.lastHealthCheck = new Date();

        } catch (error) {
          console.error(`Health check failed for ${name}:`, error);
        }
      }, config.config.healthCheckInterval);

      this.healthCheckIntervals.set(name, interval);
    }
  }

  /**
   * Get server metrics
   */
  public getServerMetrics(serverName?: string): MCPServerMetrics | MCPServerMetrics[] {
    if (serverName) {
      const metrics = this.metrics.get(serverName);
      if (!metrics) {
        throw new Error(`Server ${serverName} not found`);
      }
      return metrics;
    }

    return Array.from(this.metrics.values());
  }

  /**
   * Get optimization recommendations
   */
  public getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.errorCount > metrics.requestCount * 0.1) {
        recommendations.push(`Consider reducing timeout or improving error handling for ${name}`);
      }

      if (metrics.averageResponseTime > 5000) {
        recommendations.push(`Server ${name} has high response times - consider optimization`);
      }

      if (metrics.circuitBreakerState === 'open') {
        recommendations.push(`Circuit breaker is open for ${name} - investigate and fix issues`);
      }
    }

    return recommendations;
  }

  /**
   * Gracefully shutdown all servers
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down MCP servers...');

    // Clear health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }

    // Gracefully terminate all processes
    const shutdownPromises = Array.from(this.processes.entries()).map(([name, process]) =>
      this.gracefullyTerminateProcess(name, process)
    );

    await Promise.allSettled(shutdownPromises);
    console.log('All MCP servers shut down');
  }

  private async gracefullyTerminateProcess(name: string, process: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      process.on('exit', () => resolve());

      // Send SIGTERM first
      process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (!process.killed) {
          console.log(`Force killing MCP server ${name}`);
          process.kill('SIGKILL');
        }
        resolve();
      }, 5000);
    });
  }
}

export const mcpOptimizer = new MCPOptimizer();