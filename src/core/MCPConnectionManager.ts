import { readFileSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';

interface MCPServerConfig {
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

interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
  connectionPool: {
    maxConnections: number;
    minConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
    maxRetries: number;
    retryDelay: number;
    healthCheckInterval: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      availabilityRate: number;
    };
  };
  security: {
    enableTLS: boolean;
    certificateValidation: boolean;
    maxRequestSize: string;
    rateLimitGlobal: {
      requests: number;
      window: number;
    };
  };
}

enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface ConnectionMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: number;
  uptime: number;
  circuitBreakerState: CircuitBreakerState;
  rateLimitResets: number;
}

interface MCPConnection {
  id: string;
  serverName: string;
  process?: ChildProcess;
  config: MCPServerConfig;
  state: 'idle' | 'active' | 'error' | 'disconnected';
  createdAt: number;
  lastUsed: number;
  metrics: ConnectionMetrics;
  circuitBreaker: {
    state: CircuitBreakerState;
    failureCount: number;
    lastFailureTime: number;
    nextAttemptTime: number;
  };
  rateLimit: {
    requests: number[];
    lastReset: number;
  };
}

interface RequestOptions {
  timeout?: number;
  retries?: number;
  priority?: number;
}

export class MCPConnectionManager extends EventEmitter {
  private config!: MCPConfig;
  private connections: Map<string, MCPConnection[]> = new Map();
  private connectionCounter = 0;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(configPath: string = './mcp_config.json') {
    super();
    this.loadConfig(configPath);
    this.startHealthCheck();
    this.startMetricsCollection();
    this.setupGracefulShutdown();
  }

  private loadConfig(configPath: string): void {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      this.emit('config-loaded', this.config);
    } catch (error) {
      this.emit('error', new Error(`Failed to load MCP configuration: ${String(error)}`));
      throw error;
    }
  }

  /**
   * Initialize connection pools for all MCP servers
   */
  async initialize(): Promise<void> {
    try {
      const serverNames = Object.keys(this.config.mcpServers);

      for (const serverName of serverNames) {
        await this.initializeServerPool(serverName);
      }

      this.emit('initialized', { servers: serverNames.length });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Initialize connection pool for a specific server
   */
  private async initializeServerPool(serverName: string): Promise<void> {
    const serverConfig = this.config.mcpServers[serverName];
    if (!serverConfig) {
      throw new Error(`Server ${serverName} not found in configuration`);
    }

    this.connections.set(serverName, []);

    // Create minimum connections
    const minConnections = Math.min(
      this.config.connectionPool.minConnections,
      serverConfig.config.critical ? 2 : 1
    );

    for (let i = 0; i < minConnections; i++) {
      await this.createConnection(serverName);
    }

    this.emit('pool-initialized', { serverName, connections: minConnections });
  }

  /**
   * Create a new connection to an MCP server
   */
  private async createConnection(serverName: string): Promise<MCPConnection> {
    const serverConfig = this.config.mcpServers[serverName];
    if (!serverConfig) {
      throw new Error(`Server ${serverName} not found in configuration`);
    }

    const connectionId = `${serverName}-${++this.connectionCounter}`;
    const now = Date.now();

    const connection: MCPConnection = {
      id: connectionId,
      serverName,
      config: serverConfig,
      state: 'idle',
      createdAt: now,
      lastUsed: now,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastRequestTime: 0,
        uptime: 0,
        circuitBreakerState: CircuitBreakerState.CLOSED,
        rateLimitResets: 0
      },
      circuitBreaker: {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0
      },
      rateLimit: {
        requests: [],
        lastReset: now
      }
    };

    try {
      await this.startServerProcess(connection);

      const serverConnections = this.connections.get(serverName) || [];
      serverConnections.push(connection);
      this.connections.set(serverName, serverConnections);

      this.emit('connection-created', { connectionId, serverName });
      return connection;
    } catch (error) {
      this.emit('connection-failed', { connectionId, serverName, error });
      throw error;
    }
  }

  /**
   * Start the server process for a connection
   */
  private async startServerProcess(connection: MCPConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      const { command, args, env } = connection.config;
      const processEnv = { ...process.env, ...env };

      // Replace environment variable placeholders
      for (const [key, value] of Object.entries(processEnv)) {
        if (typeof value === 'string' && value.includes('${')) {
          processEnv[key] = value.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
            const [varName, defaultValue] = envVar.split(':-');
            return process.env[varName] || defaultValue || '';
          });
        }
      }

      try {
        connection.process = spawn(command, args, {
          env: processEnv,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        connection.process.on('spawn', () => {
          connection.state = 'idle';
          this.emit('process-started', { connectionId: connection.id });
          resolve();
        });

        connection.process.on('error', (error) => {
          connection.state = 'error';
          this.handleConnectionFailure(connection, error);
          reject(error);
        });

        connection.process.on('exit', (code, signal) => {
          connection.state = 'disconnected';
          this.emit('process-exited', {
            connectionId: connection.id,
            code,
            signal
          });
        });

        // Set timeout for process startup
        setTimeout(() => {
          if (connection.state !== 'idle') {
            reject(new Error(`Connection ${connection.id} failed to start within timeout`));
          }
        }, connection.config.config.timeout);

      } catch (error) {
        connection.state = 'error';
        reject(error);
      }
    });
  }

  /**
   * Get an available connection for a server
   */
  async getConnection(serverName: string, options: RequestOptions = {}): Promise<MCPConnection> {
    const serverConnections = this.connections.get(serverName) || [];

    // Check if we have any available connections
    const availableConnections = serverConnections
      .filter(conn => this.isConnectionAvailable(conn))
      .sort((a, b) => {
        // Sort by priority (higher priority first), then by last used (LRU)
        const priorityDiff = (options.priority || 0) - (options.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return a.lastUsed - b.lastUsed;
      });

    if (availableConnections.length > 0) {
      const connection = availableConnections[0];
      connection.state = 'active';
      connection.lastUsed = Date.now();
      return connection;
    }

    // Try to create a new connection if pool is not at max capacity
    const maxConnections = this.config.connectionPool.maxConnections;
    if (serverConnections.length < maxConnections) {
      return await this.createConnection(serverName);
    }

    // Wait for an available connection or timeout
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || this.config.connectionPool.connectionTimeout;
      const timeoutId = setTimeout(() => {
        reject(new Error(`Connection timeout for server ${serverName}`));
      }, timeout);

      const checkForConnection = () => {
        const available = serverConnections.find(conn => this.isConnectionAvailable(conn));
        if (available) {
          clearTimeout(timeoutId);
          available.state = 'active';
          available.lastUsed = Date.now();
          resolve(available);
        } else {
          setTimeout(checkForConnection, 100);
        }
      };

      checkForConnection();
    });
  }

  /**
   * Check if a connection is available for use
   */
  private isConnectionAvailable(connection: MCPConnection): boolean {
    // Check circuit breaker state
    if (connection.circuitBreaker.state === CircuitBreakerState.OPEN) {
      if (Date.now() >= connection.circuitBreaker.nextAttemptTime) {
        connection.circuitBreaker.state = CircuitBreakerState.HALF_OPEN;
      } else {
        return false;
      }
    }

    // Check rate limits
    if (!this.checkRateLimit(connection)) {
      return false;
    }

    if (connection.state !== 'idle') {
      return false;
    }

    const process = connection.process;
    if (!process || process.killed) {
      return false;
    }

    return true;
  }

  /**
   * Check rate limit for a connection
   */
  private checkRateLimit(connection: MCPConnection): boolean {
    const now = Date.now();
    const { requests, window } = connection.config.config.rateLimit;

    // Clean up old requests outside the window
    connection.rateLimit.requests = connection.rateLimit.requests
      .filter(timestamp => now - timestamp < window);

    // Check if we're within the rate limit
    if (connection.rateLimit.requests.length >= requests) {
      return false;
    }

    return true;
  }

  /**
   * Execute a request on an MCP server
   */
  async executeRequest(
    serverName: string,
    requestData: any,
    options: RequestOptions = {}
  ): Promise<any> {
    const startTime = performance.now();
    let connection: MCPConnection | undefined;

    try {
      connection = await this.getConnection(serverName, options);

      // Record the request in rate limiting
      connection.rateLimit.requests.push(Date.now());

      // Update metrics
      connection.metrics.totalRequests++;
      connection.metrics.lastRequestTime = Date.now();

      // Execute the request with timeout and retries
      const result = await this.executeWithRetry(connection, requestData, options);

      // Record successful request
      const responseTime = performance.now() - startTime;
      this.recordSuccessfulRequest(connection, responseTime);

      return result;
    } catch (error) {
      if (connection) {
        this.handleConnectionFailure(connection, error);
      }
      throw error;
    } finally {
      if (connection) {
        connection.state = 'idle';
      }
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(
    connection: MCPConnection,
    requestData: any,
    options: RequestOptions
  ): Promise<any> {
    const maxRetries = options.retries ?? connection.config.config.retryAttempts;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.sendRequest(connection, requestData, options);
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry
        const delay = connection.config.config.retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Send actual request to MCP server
   */
  private async sendRequest(
    connection: MCPConnection,
    requestData: any,
    options: RequestOptions
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!connection.process || connection.process.killed) {
        reject(new Error('Connection process is not available'));
        return;
      }

      const timeout = options.timeout || connection.config.config.timeout;
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);

      // Handle response
      const handleResponse = (data: Buffer) => {
        clearTimeout(timeoutId);
        try {
          const response = JSON.parse(data.toString());
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      };

      const handleError = (error: Error) => {
        clearTimeout(timeoutId);
        reject(error);
      };

      // Set up listeners
      connection.process.stdout?.once('data', handleResponse);
      connection.process.stderr?.once('data', handleError);

      // Send request
      try {
        connection.process.stdin?.write(JSON.stringify(requestData) + '\n');
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Record a successful request
   */
  private recordSuccessfulRequest(connection: MCPConnection, responseTime: number): void {
    connection.metrics.successfulRequests++;

    // Update average response time
    const totalRequests = connection.metrics.totalRequests;
    connection.metrics.averageResponseTime =
      (connection.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;

    // Reset circuit breaker if in half-open state
    if (connection.circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
      connection.circuitBreaker.state = CircuitBreakerState.CLOSED;
      connection.circuitBreaker.failureCount = 0;
    }

    this.emit('request-success', {
      connectionId: connection.id,
      serverName: connection.serverName,
      responseTime
    });
  }

  /**
   * Handle connection failure
   */
  private handleConnectionFailure(connection: MCPConnection, error: any): void {
    connection.metrics.failedRequests++;
    connection.circuitBreaker.failureCount++;
    connection.circuitBreaker.lastFailureTime = Date.now();

    // Check if circuit breaker should open
    const { failureThreshold, resetTimeout } = connection.config.config.circuitBreaker;
    if (connection.circuitBreaker.failureCount >= failureThreshold) {
      connection.circuitBreaker.state = CircuitBreakerState.OPEN;
      connection.circuitBreaker.nextAttemptTime = Date.now() + resetTimeout;
      connection.metrics.circuitBreakerState = CircuitBreakerState.OPEN;
    }

    this.emit('request-failure', {
      connectionId: connection.id,
      serverName: connection.serverName,
      error: error.message,
      circuitBreakerState: connection.circuitBreaker.state
    });
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    if (!this.config.monitoring.enabled) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.connectionPool.healthCheckInterval);
  }

  /**
   * Perform health check on all connections
   */
  private async performHealthCheck(): Promise<void> {
    for (const [serverName, connections] of this.connections) {
      for (const connection of connections) {
        try {
          await this.checkConnectionHealth(connection);
        } catch (error) {
          this.emit('health-check-failed', {
            connectionId: connection.id,
            serverName,
            error
          });
        }
      }
    }
  }

  /**
   * Check health of a single connection
   */
  private async checkConnectionHealth(connection: MCPConnection): Promise<void> {
    if (!connection.process || connection.process.killed) {
      // Try to restart the connection
      await this.restartConnection(connection);
      return;
    }

    // Send ping request
    try {
      await this.sendRequest(connection, { type: 'ping' }, { timeout: 5000 });

      // Update uptime
      connection.metrics.uptime = Date.now() - connection.createdAt;

      this.emit('health-check-success', {
        connectionId: connection.id,
        serverName: connection.serverName
      });
    } catch (error) {
      this.handleConnectionFailure(connection, error);
    }
  }

  /**
   * Restart a failed connection
   */
  private async restartConnection(connection: MCPConnection): Promise<void> {
    try {
      connection.state = 'disconnected';

      // Kill existing process if it exists
      if (connection.process && !connection.process.killed) {
        connection.process.kill();
      }

      // Start new process
      await this.startServerProcess(connection);

      this.emit('connection-restarted', {
        connectionId: connection.id,
        serverName: connection.serverName
      });
    } catch (error) {
      this.emit('connection-restart-failed', {
        connectionId: connection.id,
        serverName: connection.serverName,
        error
      });
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    if (!this.config.monitoring.enabled) return;

    this.metricsInterval = setInterval(() => {
      this.collectAndEmitMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  /**
   * Collect and emit metrics
   */
  private collectAndEmitMetrics(): void {
    const metrics: Record<string, any> = {};

    for (const [serverName, connections] of this.connections) {
      const totalConnections = connections.length;
      const totalRequests = connections.reduce((sum, c) => sum + c.metrics.totalRequests, 0);
      const successfulRequests = connections.reduce((sum, c) => sum + c.metrics.successfulRequests, 0);
      const failedRequests = connections.reduce((sum, c) => sum + c.metrics.failedRequests, 0);
      const averageResponseTime = totalConnections > 0
        ? connections.reduce((sum, c) => sum + c.metrics.averageResponseTime, 0) / totalConnections
        : 0;

      const serverMetrics = {
        totalConnections,
        activeConnections: connections.filter(c => c.state === 'active').length,
        idleConnections: connections.filter(c => c.state === 'idle').length,
        errorConnections: connections.filter(c => c.state === 'error').length,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        circuitBreakersOpen: connections.filter(c => c.circuitBreaker.state === CircuitBreakerState.OPEN).length,
        errorRate: 0,
        availabilityRate: 1
      };

      // Calculate error rate
      serverMetrics.errorRate = serverMetrics.totalRequests > 0
        ? serverMetrics.failedRequests / serverMetrics.totalRequests
        : 0;

      // Calculate availability rate
      serverMetrics.availabilityRate = serverMetrics.totalRequests > 0
        ? serverMetrics.successfulRequests / serverMetrics.totalRequests
        : 1;

      metrics[serverName] = serverMetrics;
    }

    this.emit('metrics-collected', metrics);

    // Check alert thresholds
    this.checkAlertThresholds(metrics);
  }

  /**
   * Check alert thresholds and emit alerts
   */
  private checkAlertThresholds(metrics: Record<string, any>): void {
    const thresholds = this.config.monitoring.alertThresholds;

    for (const [serverName, serverMetrics] of Object.entries(metrics)) {
      if (serverMetrics.averageResponseTime > thresholds.responseTime) {
        this.emit('alert', {
          type: 'high-response-time',
          serverName,
          value: serverMetrics.averageResponseTime,
          threshold: thresholds.responseTime
        });
      }

      if (serverMetrics.errorRate > thresholds.errorRate) {
        this.emit('alert', {
          type: 'high-error-rate',
          serverName,
          value: serverMetrics.errorRate,
          threshold: thresholds.errorRate
        });
      }

      if (serverMetrics.availabilityRate < thresholds.availabilityRate) {
        this.emit('alert', {
          type: 'low-availability',
          serverName,
          value: serverMetrics.availabilityRate,
          threshold: thresholds.availabilityRate
        });
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [serverName, connections] of this.connections) {
      stats[serverName] = {
        totalConnections: connections.length,
        states: {
          idle: connections.filter(c => c.state === 'idle').length,
          active: connections.filter(c => c.state === 'active').length,
          error: connections.filter(c => c.state === 'error').length,
          disconnected: connections.filter(c => c.state === 'disconnected').length
        },
        circuitBreakers: {
          closed: connections.filter(c => c.circuitBreaker.state === CircuitBreakerState.CLOSED).length,
          open: connections.filter(c => c.circuitBreaker.state === CircuitBreakerState.OPEN).length,
          halfOpen: connections.filter(c => c.circuitBreaker.state === CircuitBreakerState.HALF_OPEN).length
        },
        metrics: connections.map(c => ({
          id: c.id,
          totalRequests: c.metrics.totalRequests,
          successfulRequests: c.metrics.successfulRequests,
          failedRequests: c.metrics.failedRequests,
          averageResponseTime: c.metrics.averageResponseTime,
          uptime: c.metrics.uptime
        }))
      };
    }

    return stats;
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      this.emit('shutting-down');

      // Clear intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }

      // Close all connections
      for (const [serverName, connections] of this.connections) {
        for (const connection of connections) {
          if (connection.process && !connection.process.killed) {
            connection.process.kill('SIGTERM');
          }
        }
      }

      this.emit('shutdown-complete');
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGQUIT', shutdown);
  }

  /**
   * Gracefully shutdown the connection manager
   */
  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isShuttingDown) {
        resolve();
        return;
      }

      this.once('shutdown-complete', resolve);
      process.emit('SIGTERM', 'SIGTERM');
    });
  }
}

export default MCPConnectionManager;