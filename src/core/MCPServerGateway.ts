import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import MCPConnectionManager from './MCPConnectionManager.js';
import MCPServerRegistry, { type MCPServerInfo, type MCPServerFilter } from './MCPServerRegistry.js';
import MCPMonitoringService from './MCPMonitoringService.js';

export interface MCPRequest {
  id: string;
  method: string;
  params?: any;
  timeout?: number;
  retries?: number;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface MCPResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    serverName: string;
    responseTime: number;
    fromCache: boolean;
    retryCount: number;
    provider: string;
  };
}

export interface MCPRequestContext {
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  permissions?: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: number;
  };
}

export interface MCPGatewayConfig {
  connectionManager: {
    maxConnections: number;
    minConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
    healthCheckInterval: number;
  };
  loadBalancing: {
    strategy: 'round-robin' | 'least-connections' | 'weighted' | 'priority' | 'capability-based';
    weights?: Record<string, number>;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    strategy: 'lru' | 'lfu' | 'fifo';
  };
  retry: {
    maxAttempts: number;
    backoffStrategy: 'exponential' | 'linear' | 'fixed';
    initialDelay: number;
    maxDelay: number;
  };
  security: {
    enableAuth: boolean;
    enableRateLimit: boolean;
    enableAuditLog: boolean;
    allowedMethods?: string[];
    blockedMethods?: string[];
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      queueSize: number;
    };
  };
}

export interface MCPServerSelection {
  server: MCPServerInfo;
  weight: number;
  reason: string;
}

export interface MCPGatewayStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedRequests: number;
  averageResponseTime: number;
  queueSize: number;
  activeConnections: number;
  serverStats: Record<string, {
    requests: number;
    errors: number;
    responseTime: number;
    status: string;
  }>;
  loadBalancer: {
    strategy: string;
    decisions: Record<string, number>;
  };
}

interface RequestQueueItem {
  request: MCPRequest;
  context: MCPRequestContext;
  resolve: (response: MCPResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: number;
}

interface CacheEntry {
  data: any;
  expiry: number;
  hits: number;
  lastAccess: number;
}

export class MCPServerGateway extends EventEmitter {
  private config: MCPGatewayConfig;
  private connectionManager: MCPConnectionManager;
  private registry: MCPServerRegistry;
  private monitoring: MCPMonitoringService;

  private requestQueue: RequestQueueItem[] = [];
  private responseCache: Map<string, CacheEntry> = new Map();
  private loadBalancerState: Map<string, any> = new Map();
  private requestCounter = 0;
  private stats: MCPGatewayStats;

  private processingInterval?: NodeJS.Timeout;
  private cacheCleanupInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;

  private isShuttingDown = false;

  constructor(
    config: Partial<MCPGatewayConfig> = {},
    connectionManager?: MCPConnectionManager,
    registry?: MCPServerRegistry
  ) {
    super();

    this.config = this.mergeConfig(config);
    this.connectionManager = connectionManager || new MCPConnectionManager();
    this.registry = registry || new MCPServerRegistry();
    this.monitoring = new MCPMonitoringService({
      enabled: this.config.monitoring.enabled,
      logLevel: 'info',
      metricsInterval: this.config.monitoring.metricsInterval,
      alertThresholds: {
        responseTime: this.config.monitoring.alertThresholds.responseTime,
        errorRate: this.config.monitoring.alertThresholds.errorRate,
        availabilityRate: 0.95,
        memoryUsage: 80,
        cpuUsage: 80
      },
      retention: {
        metrics: 7,
        logs: 30,
        alerts: 30
      },
      outputs: {
        console: true,
        file: true
      }
    });

    this.stats = this.initializeStats();
    this.setupEventHandlers();
    this.startProcessing();
    this.startCacheCleanup();
    this.startMetricsCollection();
  }

  /**
   * Merge default configuration with provided config
   */
  private mergeConfig(config: Partial<MCPGatewayConfig>): MCPGatewayConfig {
    const defaultConfig: MCPGatewayConfig = {
      connectionManager: {
        maxConnections: 20,
        minConnections: 5,
        connectionTimeout: 30000,
        idleTimeout: 300000,
        healthCheckInterval: 60000
      },
      loadBalancing: {
        strategy: 'capability-based'
      },
      caching: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 1000,
        strategy: 'lru'
      },
      retry: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000
      },
      security: {
        enableAuth: false,
        enableRateLimit: true,
        enableAuditLog: true
      },
      monitoring: {
        enabled: true,
        metricsInterval: 30000,
        alertThresholds: {
          responseTime: 5000,
          errorRate: 0.05,
          queueSize: 100
        }
      }
    };

    return {
      connectionManager: { ...defaultConfig.connectionManager, ...config.connectionManager },
      loadBalancing: { ...defaultConfig.loadBalancing, ...config.loadBalancing },
      caching: { ...defaultConfig.caching, ...config.caching },
      retry: { ...defaultConfig.retry, ...config.retry },
      security: { ...defaultConfig.security, ...config.security },
      monitoring: { ...defaultConfig.monitoring, ...config.monitoring }
    };
  }

  /**
   * Initialize statistics object
   */
  private initializeStats(): MCPGatewayStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      averageResponseTime: 0,
      queueSize: 0,
      activeConnections: 0,
      serverStats: {},
      loadBalancer: {
        strategy: this.config.loadBalancing.strategy,
        decisions: {}
      }
    };
  }

  /**
   * Setup event handlers for monitoring and logging
   */
  private setupEventHandlers(): void {
    this.connectionManager.on('connection-created', (event) => {
      this.monitoring.log('info', 'MCP connection created', event);
    });

    this.connectionManager.on('connection-failed', (event) => {
      this.monitoring.log('error', 'MCP connection failed', event);
    });

    this.connectionManager.on('request-success', (event) => {
      this.monitoring.recordMetric(
        event.serverName,
        event.connectionId,
        'response_time',
        event.responseTime
      );
    });

    this.connectionManager.on('request-failure', (event) => {
      this.monitoring.recordMetric(
        event.serverName,
        event.connectionId,
        'error_count',
        1
      );
    });

    this.registry.on('server-registered', (event) => {
      this.monitoring.log('info', 'MCP server registered', event);
    });

    this.registry.on('health-status-updated', (event) => {
      if (event.status === 'unhealthy') {
        this.monitoring.createAlert(
          'server_down',
          'high',
          event.serverName,
          `Server ${event.serverName} is unhealthy`
        );
      }
    });
  }

  /**
   * Execute an MCP request through the gateway
   */
  async execute(
    method: string,
    params?: any,
    context: MCPRequestContext = {},
    options: {
      timeout?: number;
      retries?: number;
      priority?: number;
      useCache?: boolean;
    } = {}
  ): Promise<MCPResponse> {
    const requestId = this.generateRequestId();
    const request: MCPRequest = {
      id: requestId,
      method,
      params,
      timeout: options.timeout || 30000,
      retries: options.retries || this.config.retry.maxAttempts,
      priority: options.priority || 1,
      metadata: {
        timestamp: Date.now(),
        useCache: options.useCache !== false && this.config.caching.enabled
      }
    };

    this.stats.totalRequests++;
    this.stats.queueSize++;

    try {
      // Check cache first
  if (request.metadata?.['useCache'] && this.isCacheableMethod(method)) {
        const cacheKey = this.generateCacheKey(method, params);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.stats.cachedRequests++;
          this.stats.queueSize--;
          return {
            id: requestId,
            success: true,
            data: cached,
            metadata: {
              serverName: 'cache',
              responseTime: 0,
              fromCache: true,
              retryCount: 0,
              provider: 'cache'
            }
          };
        }
      }

      // Security checks
      if (this.config.security.enableAuth && !this.isAuthorized(context, method)) {
        throw new Error('Unauthorized request');
      }

      if (this.config.security.allowedMethods && !this.config.security.allowedMethods.includes(method)) {
        throw new Error(`Method ${method} is not allowed`);
      }

      if (this.config.security.blockedMethods && this.config.security.blockedMethods.includes(method)) {
        throw new Error(`Method ${method} is blocked`);
      }

      // Rate limiting
      if (this.config.security.enableRateLimit && !this.checkRateLimit(context)) {
        throw new Error('Rate limit exceeded');
      }

      // Execute request
      const response = await this.executeRequest(request, context);

      // Cache successful responses
  if (response.success && request.metadata?.['useCache'] && this.isCacheableMethod(method)) {
        const cacheKey = this.generateCacheKey(method, params);
        this.setCache(cacheKey, response.data);
      }

      this.stats.successfulRequests++;
      this.updateResponseTimeStats(response.metadata.responseTime);

      // Audit logging
      if (this.config.security.enableAuditLog) {
        this.monitoring.log('info', 'MCP request executed', {
          requestId,
          method,
          serverName: response.metadata.serverName,
          responseTime: response.metadata.responseTime,
          success: response.success
        }, response.metadata.serverName);
      }

      return response;

    } catch (error) {
      this.stats.failedRequests++;
      this.stats.queueSize--;

      const errorResponse: MCPResponse = {
        id: requestId,
        success: false,
        error: {
          code: 'GATEWAY_ERROR',
          message: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          serverName: 'gateway',
          responseTime: 0,
          fromCache: false,
          retryCount: 0,
          provider: 'gateway'
        }
      };

      this.monitoring.log('error', 'MCP gateway execution failed', {
        requestId,
        method,
        error: errorResponse.error?.message
      });

      return errorResponse;
    } finally {
      this.stats.queueSize = Math.max(0, this.stats.queueSize - 1);
    }
  }

  /**
   * Execute request with server selection and load balancing
   */
  private async executeRequest(request: MCPRequest, context: MCPRequestContext): Promise<MCPResponse> {
    const startTime = performance.now();

    // Select optimal server for the request
    const serverSelection = await this.selectServer(request, context);
    if (!serverSelection) {
      throw new Error(`No available server for method: ${request.method}`);
    }

    const serverName = serverSelection.server.name;

    // Record load balancer decision
    this.stats.loadBalancer.decisions[serverName] =
      (this.stats.loadBalancer.decisions[serverName] || 0) + 1;

    this.monitoring.log('debug', 'Server selected for request', {
      requestId: request.id,
      method: request.method,
      serverName,
      selectionReason: serverSelection.reason,
      weight: serverSelection.weight
    }, serverName);

    try {
      // Execute with retries
      const response = await this.executeWithRetry(request, serverName);

      const responseTime = performance.now() - startTime;

      // Update server stats
      this.updateServerStats(serverName, responseTime, true);

      return {
        ...response,
        metadata: {
          ...response.metadata,
          serverName,
          responseTime,
          fromCache: false,
          provider: 'mcp-server'
        }
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.updateServerStats(serverName, responseTime, false);
      throw error;
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(request: MCPRequest, serverName: string): Promise<MCPResponse> {
    let lastError: Error;
    let retryCount = 0;
    const timeout = request.timeout ?? this.config.connectionManager.connectionTimeout;
    const priority = request.priority ?? 1;

    for (let attempt = 0; attempt <= (request.retries || 0); attempt++) {
      try {
        const response = await this.connectionManager.executeRequest(
          serverName,
          {
            jsonrpc: '2.0',
            id: request.id,
            method: request.method,
            params: request.params
          },
          {
            timeout,
            retries: 0, // Handle retries at gateway level
            priority
          }
        );

        return {
          id: request.id,
          success: true,
          data: response,
          metadata: {
            serverName,
            responseTime: 0, // Will be set by caller
            fromCache: false,
            retryCount,
            provider: 'mcp-server'
          }
        };

      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (attempt < (request.retries || 0)) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);

          this.monitoring.log('warn', 'Retrying MCP request', {
            requestId: request.id,
            serverName,
            attempt: attempt + 1,
            delay,
            error: lastError.message
          }, serverName);
        }
      }
    }

    throw new Error(`Request failed after ${retryCount} retries: ${lastError!.message}`);
  }

  /**
   * Calculate retry delay based on backoff strategy
   */
  private calculateRetryDelay(attempt: number): number {
    const { backoffStrategy, initialDelay, maxDelay } = this.config.retry;

    switch (backoffStrategy) {
      case 'exponential':
        return Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      case 'linear':
        return Math.min(initialDelay + (attempt * 1000), maxDelay);
      case 'fixed':
      default:
        return initialDelay;
    }
  }

  /**
   * Select optimal server for request using configured load balancing strategy
   */
  private async selectServer(request: MCPRequest, context: MCPRequestContext): Promise<MCPServerSelection | null> {
    // Find servers that can handle this method
    const capableServers = this.findCapableServers(request.method);
    if (capableServers.length === 0) {
      return null;
    }

    // Filter healthy servers
    const healthyServers = capableServers.filter(server => {
      const health = this.registry.getHealthStatus(server.name);
      return health?.status === 'healthy';
    });

    // Use degraded servers if no healthy ones available
    const availableServers = healthyServers.length > 0 ? healthyServers : capableServers;

    switch (this.config.loadBalancing.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(availableServers);

      case 'least-connections':
        return this.selectLeastConnections(availableServers);

      case 'weighted':
        return this.selectWeighted(availableServers);

      case 'priority':
        return this.selectByPriority(availableServers);

      case 'capability-based':
      default:
        return this.selectByCapability(availableServers, request.method);
    }
  }

  /**
   * Find servers capable of handling a specific method
   */
  private findCapableServers(method: string): MCPServerInfo[] {
    // Try exact capability match first
    let servers = this.registry.findServersByCapability(method);

    if (servers.length === 0) {
      // Try category-based matching
      const methodParts = method.split('.');
      if (methodParts.length > 1) {
        const category = this.mapMethodToCategory(methodParts[0]);
        if (category) {
          servers = this.registry.findServersByCategory(category);
        }
      }
    }

    return servers;
  }

  /**
   * Map method prefix to server category
   */
  private mapMethodToCategory(methodPrefix: string): string | null {
    const mappings: Record<string, string> = {
      'file': 'filesystem',
      'directory': 'filesystem',
      'repo': 'version-control',
      'repository': 'version-control',
      'issue': 'version-control',
      'pr': 'version-control',
      'query': 'database',
      'table': 'database',
      'schema': 'database',
      'search': 'search',
      'store': 'storage',
      'cache': 'storage',
      'chat': 'ai-services',
      'embedding': 'ai-services'
    };

    return mappings[methodPrefix] || null;
  }

  /**
   * Round-robin server selection
   */
  private selectRoundRobin(servers: MCPServerInfo[]): MCPServerSelection {
    const key = 'round-robin-index';
    let index = this.loadBalancerState.get(key) || 0;

    const server = servers[index % servers.length];
    this.loadBalancerState.set(key, index + 1);

    return {
      server,
      weight: 1,
      reason: 'round-robin'
    };
  }

  /**
   * Least connections server selection
   */
  private selectLeastConnections(servers: MCPServerInfo[]): MCPServerSelection {
    let bestServer = servers[0];
    let minConnections = Infinity;

    for (const server of servers) {
      const connections = this.getActiveConnections(server.name);
      if (connections < minConnections) {
        minConnections = connections;
        bestServer = server;
      }
    }

    return {
      server: bestServer,
      weight: 1 / (minConnections + 1),
      reason: 'least-connections'
    };
  }

  /**
   * Weighted server selection
   */
  private selectWeighted(servers: MCPServerInfo[]): MCPServerSelection {
    const weights = this.config.loadBalancing.weights || {};
    const weighted = servers.map(server => ({
      server,
      weight: weights[server.name] || 1
    }));

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (const item of weighted) {
      currentWeight += item.weight;
      if (random <= currentWeight) {
        return {
          server: item.server,
          weight: item.weight / totalWeight,
          reason: 'weighted'
        };
      }
    }

    return {
      server: servers[0],
      weight: 1,
      reason: 'weighted-fallback'
    };
  }

  /**
   * Priority-based server selection
   */
  private selectByPriority(servers: MCPServerInfo[]): MCPServerSelection {
    const sorted = servers.sort((a, b) => b.config.priority - a.config.priority);
    return {
      server: sorted[0],
      weight: sorted[0].config.priority / 10,
      reason: 'priority'
    };
  }

  /**
   * Capability-based server selection (most specific capability wins)
   */
  private selectByCapability(servers: MCPServerInfo[], method: string): MCPServerSelection {
    let bestServer = servers[0];
    let bestScore = 0;

    for (const server of servers) {
      const score = this.calculateCapabilityScore(server, method);
      if (score > bestScore) {
        bestScore = score;
        bestServer = server;
      }
    }

    return {
      server: bestServer,
      weight: bestScore,
      reason: 'capability-match'
    };
  }

  /**
   * Calculate capability match score for a server
   */
  private calculateCapabilityScore(server: MCPServerInfo, method: string): number {
    if (!server.capabilities) return 0;

    let score = 0;
    for (const capability of server.capabilities) {
      if (capability.name === method) {
        score += 10; // Exact match
      } else if (capability.name.startsWith(method.split('.')[0])) {
        score += 5; // Category match
      }
    }

    // Bonus for priority and health
    score += server.config.priority;

    const health = this.registry.getHealthStatus(server.name);
    if (health?.status === 'healthy') {
      score += 3;
    } else if (health?.status === 'degraded') {
      score += 1;
    }

    return score;
  }

  /**
   * Get active connections count for a server
   */
  private getActiveConnections(serverName: string): number {
    // This would query the connection manager for active connections
    // For now, return a placeholder value
    return 0;
  }

  /**
   * Update server statistics
   */
  private updateServerStats(serverName: string, responseTime: number, success: boolean): void {
    if (!this.stats.serverStats[serverName]) {
      this.stats.serverStats[serverName] = {
        requests: 0,
        errors: 0,
        responseTime: 0,
        status: 'unknown'
      };
    }

    const stats = this.stats.serverStats[serverName];
    stats.requests++;

    if (!success) {
      stats.errors++;
    }

    // Update average response time
    stats.responseTime = (stats.responseTime * (stats.requests - 1) + responseTime) / stats.requests;
  }

  /**
   * Update global response time statistics
   */
  private updateResponseTimeStats(responseTime: number): void {
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + responseTime) /
      this.stats.successfulRequests;
  }

  /**
   * Cache management methods
   */
  private isCacheableMethod(method: string): boolean {
    const cacheableMethods = ['ping', 'list', 'get', 'search', 'read', 'query'];
    return cacheableMethods.some(pattern => method.includes(pattern));
  }

  private generateCacheKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    const entry = this.responseCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.responseCache.delete(key);
      return null;
    }

    entry.hits++;
    entry.lastAccess = Date.now();
    return entry.data;
  }

  private setCache(key: string, data: any): void {
    if (this.responseCache.size >= this.config.caching.maxSize) {
      this.evictFromCache();
    }

    this.responseCache.set(key, {
      data,
      expiry: Date.now() + this.config.caching.ttl,
      hits: 0,
      lastAccess: Date.now()
    });
  }

  private evictFromCache(): void {
    if (this.responseCache.size === 0) return;

    switch (this.config.caching.strategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      case 'fifo':
      default:
        this.evictFIFO();
        break;
    }
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, entry] of this.responseCache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.responseCache.delete(oldestKey);
    }
  }

  private evictLFU(): void {
    let leastUsedKey = '';
    let leastHits = Infinity;

    for (const [key, entry] of this.responseCache) {
      if (entry.hits < leastHits) {
        leastHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.responseCache.delete(leastUsedKey);
    }
  }

  private evictFIFO(): void {
    const firstKey = this.responseCache.keys().next().value;
    if (firstKey) {
      this.responseCache.delete(firstKey);
    }
  }

  /**
   * Security and authorization methods
   */
  private isAuthorized(context: MCPRequestContext, method: string): boolean {
    // Placeholder for authorization logic
    return true;
  }

  private checkRateLimit(context: MCPRequestContext): boolean {
    // Placeholder for rate limiting logic
    return true;
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Background processing methods
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processRequestQueue();
    }, 100);
  }

  private processRequestQueue(): void {
    if (this.requestQueue.length === 0) return;

    // Sort by priority and timestamp
    this.requestQueue.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    // Process requests
    const batch = this.requestQueue.splice(0, 10); // Process up to 10 requests at once
    batch.forEach(item => {
      this.execute(item.request.method, item.request.params, item.context)
        .then(item.resolve)
        .catch(item.reject);
    });
  }

  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // Cleanup every minute
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.responseCache) {
      if (now > entry.expiry) {
        this.responseCache.delete(key);
      }
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  private collectMetrics(): void {
    // Update queue size
    this.stats.queueSize = this.requestQueue.length;

    // Emit metrics for monitoring
    this.emit('metrics-collected', this.stats);

    // Check alert thresholds
    if (this.stats.averageResponseTime > this.config.monitoring.alertThresholds.responseTime) {
      this.monitoring.createAlert(
        'high_response_time',
        'medium',
        'gateway',
        `High average response time: ${this.stats.averageResponseTime}ms`,
        this.stats.averageResponseTime,
        this.config.monitoring.alertThresholds.responseTime
      );
    }

    if (this.stats.queueSize > this.config.monitoring.alertThresholds.queueSize) {
      this.monitoring.createAlert(
        'high_response_time',
        'high',
        'gateway',
        `High queue size: ${this.stats.queueSize}`,
        this.stats.queueSize,
        this.config.monitoring.alertThresholds.queueSize
      );
    }
  }

  /**
   * Public API methods
   */

  /**
   * Get gateway statistics
   */
  getStats(): MCPGatewayStats {
    return { ...this.stats };
  }

  /**
   * Get available servers and capabilities
   */
  getAvailableServices(): {
    servers: Record<string, MCPServerInfo>;
    capabilities: Record<string, string[]>;
    categories: string[];
  } {
    return {
      servers: Object.fromEntries(this.registry.getAllServers()),
      capabilities: Object.fromEntries(this.registry.getAvailableCapabilities()),
      categories: this.registry.getAvailableCategories()
    };
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    totalRequests: number;
  } {
    let totalHits = 0;
    for (const entry of this.responseCache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.responseCache.size,
      hitRate: this.stats.totalRequests > 0 ? this.stats.cachedRequests / this.stats.totalRequests : 0,
      totalHits,
      totalRequests: this.stats.totalRequests
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MCPGatewayConfig>): void {
    this.config = this.mergeConfig(newConfig);
    this.emit('config-updated', this.config);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.emit('shutting-down');

    // Stop processing
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Process remaining queue items
    while (this.requestQueue.length > 0) {
      this.processRequestQueue();
      await this.sleep(100);
    }

    // Shutdown components
    await Promise.all([
      this.connectionManager.shutdown(),
      this.registry.shutdown()
    ]);

    this.monitoring.shutdown();

    this.emit('shutdown-complete');
    this.removeAllListeners();
  }
}

export default MCPServerGateway;