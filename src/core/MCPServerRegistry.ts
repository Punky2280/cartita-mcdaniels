import { EventEmitter } from 'node:events';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface MCPServerCapability {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  examples?: string[];
}

export interface MCPServerInfo {
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
  capabilities?: MCPServerCapability[];
  version?: string;
  description?: string;
  documentation?: string;
  healthEndpoint?: string;
  metricsEndpoint?: string;
}

export interface MCPServerHealthStatus {
  serverName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
  errorRate?: number;
  uptime?: number;
  version?: string;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export interface MCPServerStats {
  totalServers: number;
  healthyServers: number;
  degradedServers: number;
  unhealthyServers: number;
  serversByCategory: Record<string, number>;
  averageResponseTime: number;
  totalRequests: number;
  totalErrors: number;
  globalErrorRate: number;
}

export interface MCPServerFilter {
  category?: string;
  status?: MCPServerHealthStatus['status'];
  capabilities?: string[];
  priority?: number;
  critical?: boolean;
}

export interface MCPServerDiscoveryRule {
  id: string;
  name: string;
  pattern: string | RegExp;
  category: string;
  defaultConfig?: Partial<MCPServerInfo['config']>;
  autoRegister: boolean;
  enabled: boolean;
}

export class MCPServerRegistry extends EventEmitter {
  private servers: Map<string, MCPServerInfo> = new Map();
  private healthStatuses: Map<string, MCPServerHealthStatus> = new Map();
  private discoveryRules: MCPServerDiscoveryRule[] = [];
  private capabilityIndex: Map<string, Set<string>> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();
  private configPath: string;
  private autoDiscoveryEnabled = true;
  private discoveryInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(configPath: string = './mcp_config.json') {
    super();
    this.configPath = configPath;
    this.initializeDefaultDiscoveryRules();
    this.loadConfiguration();
    this.startAutoDiscovery();
    this.startHealthMonitoring();
  }

  /**
   * Initialize default discovery rules for common MCP servers
   */
  private initializeDefaultDiscoveryRules(): void {
    const defaultRules: MCPServerDiscoveryRule[] = [
      {
        id: 'github-servers',
        name: 'GitHub MCP Servers',
        pattern: /@modelcontextprotocol\/server-(github|gitlab)/,
        category: 'version-control',
        defaultConfig: {
          priority: 1,
          timeout: 30000,
          retryAttempts: 3,
          critical: true
        },
        autoRegister: true,
        enabled: true
      },
      {
        id: 'database-servers',
        name: 'Database MCP Servers',
        pattern: /@modelcontextprotocol\/server-(sqlite|postgres|mysql)/,
        category: 'database',
        defaultConfig: {
          priority: 1,
          timeout: 15000,
          retryAttempts: 3,
          critical: true
        },
        autoRegister: true,
        enabled: true
      },
      {
        id: 'filesystem-servers',
        name: 'Filesystem MCP Servers',
        pattern: /@modelcontextprotocol\/server-filesystem/,
        category: 'filesystem',
        defaultConfig: {
          priority: 1,
          timeout: 5000,
          retryAttempts: 2,
          critical: true
        },
        autoRegister: true,
        enabled: true
      },
      {
        id: 'search-servers',
        name: 'Search MCP Servers',
        pattern: /@modelcontextprotocol\/server-(brave-search|google-search)/,
        category: 'search',
        defaultConfig: {
          priority: 2,
          timeout: 10000,
          retryAttempts: 2,
          critical: false
        },
        autoRegister: true,
        enabled: true
      },
      {
        id: 'ai-servers',
        name: 'AI Service MCP Servers',
        pattern: /@modelcontextprotocol\/server-(openai|anthropic|azure)/,
        category: 'ai-services',
        defaultConfig: {
          priority: 2,
          timeout: 20000,
          retryAttempts: 3,
          critical: false
        },
        autoRegister: true,
        enabled: true
      },
      {
        id: 'storage-servers',
        name: 'Storage MCP Servers',
        pattern: /@modelcontextprotocol\/server-(memory|redis|s3)/,
        category: 'storage',
        defaultConfig: {
          priority: 1,
          timeout: 8000,
          retryAttempts: 3,
          critical: true
        },
        autoRegister: true,
        enabled: true
      }
    ];

    this.discoveryRules = defaultRules;
  }

  /**
   * Load MCP server configuration from file
   */
  private loadConfiguration(): void {
    try {
      if (!existsSync(this.configPath)) {
        this.emit('warning', `MCP config file not found: ${this.configPath}`);
        return;
      }

      const configContent = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configContent);

      if (config.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          this.registerServer(name, serverConfig as MCPServerInfo);
        }
      }

      this.emit('configuration-loaded', {
        serversLoaded: this.servers.size,
        configPath: this.configPath
      });
    } catch (error) {
      this.emit('error', new Error(`Failed to load MCP configuration: ${String(error)}`));
    }
  }

  /**
   * Register a new MCP server
   */
  registerServer(name: string, serverInfo: MCPServerInfo): void {
    try {
      // Validate server info
      this.validateServerInfo(name, serverInfo);

      // Enrich server info with discovered capabilities
      const enrichedInfo = this.enrichServerInfo(serverInfo);

      this.servers.set(name, enrichedInfo);

      // Update indexes
      this.updateCapabilityIndex(name, enrichedInfo);
      this.updateCategoryIndex(name, enrichedInfo);

      // Initialize health status
      this.healthStatuses.set(name, {
        serverName: name,
        status: 'unknown',
        lastCheck: new Date()
      });

      this.emit('server-registered', {
        name,
        category: enrichedInfo.config.category,
        capabilities: enrichedInfo.capabilities?.map(c => c.name) || [],
        critical: enrichedInfo.config.critical
      });

    } catch (error) {
      this.emit('server-registration-error', {
        name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate server information
   */
  private validateServerInfo(name: string, serverInfo: MCPServerInfo): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Server name must be a non-empty string');
    }

    if (!serverInfo.command || typeof serverInfo.command !== 'string') {
      throw new Error(`Server ${name}: command is required`);
    }

    if (!Array.isArray(serverInfo.args)) {
      throw new Error(`Server ${name}: args must be an array`);
    }

    if (!serverInfo.config || typeof serverInfo.config !== 'object') {
      throw new Error(`Server ${name}: config object is required`);
    }

    const requiredConfigFields = ['priority', 'timeout', 'retryAttempts', 'category'];
    for (const field of requiredConfigFields) {
      if (!(field in serverInfo.config)) {
        throw new Error(`Server ${name}: config.${field} is required`);
      }
    }
  }

  /**
   * Enrich server info with discovered capabilities and metadata
   */
  private enrichServerInfo(serverInfo: MCPServerInfo): MCPServerInfo {
    const enriched = { ...serverInfo };

    // Auto-discover capabilities based on server type
    if (!enriched.capabilities) {
      enriched.capabilities = this.discoverCapabilities(serverInfo);
    }

    // Set default values
    enriched.version = enriched.version || '1.0.0';
    enriched.description = enriched.description || `${serverInfo.config.category} MCP server`;

    return enriched;
  }

  /**
   * Discover capabilities based on server type and configuration
   */
  private discoverCapabilities(serverInfo: MCPServerInfo): MCPServerCapability[] {
    const capabilities: MCPServerCapability[] = [];

    // Standard MCP capabilities that all servers should have
    capabilities.push(
      {
        name: 'ping',
        description: 'Health check endpoint',
        inputSchema: {},
        outputSchema: { type: 'object', properties: { status: { type: 'string' } } }
      },
      {
        name: 'list',
        description: 'List available resources',
        inputSchema: {},
        outputSchema: { type: 'array', items: { type: 'object' } }
      }
    );

    // Category-specific capabilities
    switch (serverInfo.config.category) {
      case 'version-control':
        capabilities.push(
          {
            name: 'repository.list',
            description: 'List repositories',
            examples: ['List all repositories for a user/organization']
          },
          {
            name: 'repository.get',
            description: 'Get repository details',
            examples: ['Get details for a specific repository']
          },
          {
            name: 'issue.list',
            description: 'List issues',
            examples: ['List issues for a repository']
          },
          {
            name: 'pr.list',
            description: 'List pull requests',
            examples: ['List pull requests for a repository']
          }
        );
        break;

      case 'database':
        capabilities.push(
          {
            name: 'query.execute',
            description: 'Execute SQL query',
            examples: ['SELECT * FROM users WHERE active = true']
          },
          {
            name: 'schema.describe',
            description: 'Describe database schema',
            examples: ['Get schema information for all tables']
          },
          {
            name: 'table.list',
            description: 'List database tables',
            examples: ['List all tables in the database']
          }
        );
        break;

      case 'filesystem':
        capabilities.push(
          {
            name: 'file.read',
            description: 'Read file contents',
            examples: ['Read a text file or binary file']
          },
          {
            name: 'file.write',
            description: 'Write file contents',
            examples: ['Write content to a file']
          },
          {
            name: 'directory.list',
            description: 'List directory contents',
            examples: ['List files and directories']
          },
          {
            name: 'file.stat',
            description: 'Get file statistics',
            examples: ['Get file size, modification time, etc.']
          }
        );
        break;

      case 'search':
        capabilities.push(
          {
            name: 'search.web',
            description: 'Search the web',
            examples: ['Search for recent articles about AI']
          },
          {
            name: 'search.news',
            description: 'Search news articles',
            examples: ['Find latest news about technology']
          }
        );
        break;

      case 'storage':
        capabilities.push(
          {
            name: 'store.set',
            description: 'Store key-value data',
            examples: ['Store user preferences or session data']
          },
          {
            name: 'store.get',
            description: 'Retrieve stored data',
            examples: ['Get user preferences by key']
          },
          {
            name: 'store.delete',
            description: 'Delete stored data',
            examples: ['Remove cached data']
          }
        );
        break;

      case 'ai-services':
        capabilities.push(
          {
            name: 'chat.complete',
            description: 'Chat completion',
            examples: ['Generate text responses using AI models']
          },
          {
            name: 'embedding.create',
            description: 'Create embeddings',
            examples: ['Generate vector embeddings for text']
          }
        );
        break;
    }

    return capabilities;
  }

  /**
   * Update capability index for server discovery
   */
  private updateCapabilityIndex(serverName: string, serverInfo: MCPServerInfo): void {
    if (serverInfo.capabilities) {
      for (const capability of serverInfo.capabilities) {
        if (!this.capabilityIndex.has(capability.name)) {
          this.capabilityIndex.set(capability.name, new Set());
        }
        this.capabilityIndex.get(capability.name)!.add(serverName);
      }
    }
  }

  /**
   * Update category index for server discovery
   */
  private updateCategoryIndex(serverName: string, serverInfo: MCPServerInfo): void {
    const category = serverInfo.config.category;
    if (!this.categoryIndex.has(category)) {
      this.categoryIndex.set(category, new Set());
    }
    this.categoryIndex.get(category)!.add(serverName);
  }

  /**
   * Unregister a server
   */
  unregisterServer(name: string): boolean {
    const serverInfo = this.servers.get(name);
    if (!serverInfo) {
      return false;
    }

    // Remove from indexes
    if (serverInfo.capabilities) {
      for (const capability of serverInfo.capabilities) {
        const capabilityServers = this.capabilityIndex.get(capability.name);
        if (capabilityServers) {
          capabilityServers.delete(name);
          if (capabilityServers.size === 0) {
            this.capabilityIndex.delete(capability.name);
          }
        }
      }
    }

    const categoryServers = this.categoryIndex.get(serverInfo.config.category);
    if (categoryServers) {
      categoryServers.delete(name);
      if (categoryServers.size === 0) {
        this.categoryIndex.delete(serverInfo.config.category);
      }
    }

    // Remove from registry
    this.servers.delete(name);
    this.healthStatuses.delete(name);

    this.emit('server-unregistered', { name });
    return true;
  }

  /**
   * Get server information
   */
  getServer(name: string): MCPServerInfo | undefined {
    return this.servers.get(name);
  }

  /**
   * Get all registered servers
   */
  getAllServers(): Map<string, MCPServerInfo> {
    return new Map(this.servers);
  }

  /**
   * Find servers by capability
   */
  findServersByCapability(capabilityName: string): MCPServerInfo[] {
    const serverNames = this.capabilityIndex.get(capabilityName) || new Set();
    return Array.from(serverNames)
      .map(name => this.servers.get(name))
      .filter((server): server is MCPServerInfo => server !== undefined);
  }

  /**
   * Find servers by category
   */
  findServersByCategory(category: string): MCPServerInfo[] {
    const serverNames = this.categoryIndex.get(category) || new Set();
    return Array.from(serverNames)
      .map(name => this.servers.get(name))
      .filter((server): server is MCPServerInfo => server !== undefined);
  }

  /**
   * Find servers with advanced filtering
   */
  findServers(filter: MCPServerFilter): MCPServerInfo[] {
    let results = Array.from(this.servers.values());

    if (filter.category) {
      results = results.filter(server => server.config.category === filter.category);
    }

    if (filter.capabilities) {
      results = results.filter(server => {
        const serverCapabilities = server.capabilities?.map(c => c.name) || [];
        return filter.capabilities!.every(cap => serverCapabilities.includes(cap));
      });
    }

    if (filter.priority !== undefined) {
      results = results.filter(server => server.config.priority >= filter.priority!);
    }

    if (filter.critical !== undefined) {
      results = results.filter(server => server.config.critical === filter.critical);
    }

    if (filter.status) {
      results = results.filter(server => {
        const health = this.healthStatuses.get(server.name);
        return health?.status === filter.status;
      });
    }

    return results;
  }

  /**
   * Get the best server for a specific capability
   */
  getBestServerForCapability(capabilityName: string): MCPServerInfo | null {
    const servers = this.findServersByCapability(capabilityName);
    if (servers.length === 0) {
      return null;
    }

    // Sort by priority (higher first), then by health status, then by response time
    return servers.sort((a, b) => {
      const priorityDiff = b.config.priority - a.config.priority;
      if (priorityDiff !== 0) return priorityDiff;

      const healthA = this.healthStatuses.get(a.name);
      const healthB = this.healthStatuses.get(b.name);

      if (healthA?.status === 'healthy' && healthB?.status !== 'healthy') return -1;
      if (healthB?.status === 'healthy' && healthA?.status !== 'healthy') return 1;

      const responseTimeA = healthA?.responseTime || Infinity;
      const responseTimeB = healthB?.responseTime || Infinity;
      return responseTimeA - responseTimeB;
    })[0];
  }

  /**
   * Update server health status
   */
  updateHealthStatus(name: string, status: Partial<MCPServerHealthStatus>): void {
    const current = this.healthStatuses.get(name) || {
      serverName: name,
      status: 'unknown',
      lastCheck: new Date()
    };

    const updated = {
      ...current,
      ...status,
      lastCheck: new Date()
    };

    this.healthStatuses.set(name, updated);

    this.emit('health-status-updated', {
      serverName: name,
      status: updated.status,
      previousStatus: current.status
    });
  }

  /**
   * Get server health status
   */
  getHealthStatus(name: string): MCPServerHealthStatus | undefined {
    return this.healthStatuses.get(name);
  }

  /**
   * Get all health statuses
   */
  getAllHealthStatuses(): Map<string, MCPServerHealthStatus> {
    return new Map(this.healthStatuses);
  }

  /**
   * Get registry statistics
   */
  getStats(): MCPServerStats {
    const totalServers = this.servers.size;
    let healthyServers = 0;
    let degradedServers = 0;
    let unhealthyServers = 0;
    let totalResponseTime = 0;
    let responseTimes = 0;

    for (const health of this.healthStatuses.values()) {
      switch (health.status) {
        case 'healthy':
          healthyServers++;
          break;
        case 'degraded':
          degradedServers++;
          break;
        case 'unhealthy':
          unhealthyServers++;
          break;
      }

      if (health.responseTime !== undefined) {
        totalResponseTime += health.responseTime;
        responseTimes++;
      }
    }

    const serversByCategory: Record<string, number> = {};
    for (const [category, servers] of this.categoryIndex) {
      serversByCategory[category] = servers.size;
    }

    return {
      totalServers,
      healthyServers,
      degradedServers,
      unhealthyServers,
      serversByCategory,
      averageResponseTime: responseTimes > 0 ? totalResponseTime / responseTimes : 0,
      totalRequests: 0, // This would come from connection manager
      totalErrors: 0,   // This would come from connection manager
      globalErrorRate: 0 // This would come from connection manager
    };
  }

  /**
   * Get available capabilities across all servers
   */
  getAvailableCapabilities(): Map<string, string[]> {
    const capabilities = new Map<string, string[]>();

    for (const [capabilityName, serverNames] of this.capabilityIndex) {
      capabilities.set(capabilityName, Array.from(serverNames));
    }

    return capabilities;
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): string[] {
    return Array.from(this.categoryIndex.keys());
  }

  /**
   * Start auto-discovery process
   */
  private startAutoDiscovery(): void {
    if (!this.autoDiscoveryEnabled) return;

    this.discoveryInterval = setInterval(() => {
      this.performAutoDiscovery();
    }, 60000); // Check every minute
  }

  /**
   * Perform auto-discovery of new MCP servers
   */
  private async performAutoDiscovery(): Promise<void> {
    try {
      // This would scan for new MCP servers based on discovery rules
      // For now, it's a placeholder for the actual implementation
      this.emit('auto-discovery-completed', {
        timestamp: new Date(),
        serversFound: 0
      });
    } catch (error) {
      this.emit('auto-discovery-error', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.servers.keys()).map(async (serverName) => {
      try {
        await this.checkServerHealth(serverName);
      } catch (error) {
        this.emit('health-check-error', {
          serverName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Check health of a specific server
   */
  private async checkServerHealth(serverName: string): Promise<void> {
    const server = this.servers.get(serverName);
    if (!server) return;

    const startTime = Date.now();

    try {
      // This would send a ping request to the MCP server
      // For now, it's a placeholder that updates status
      const responseTime = Date.now() - startTime;

      this.updateHealthStatus(serverName, {
        status: 'healthy',
        responseTime,
        lastCheck: new Date()
      });

    } catch (error) {
      this.updateHealthStatus(serverName, {
        status: 'unhealthy',
        lastCheck: new Date()
      });
    }
  }

  /**
   * Add a discovery rule
   */
  addDiscoveryRule(rule: MCPServerDiscoveryRule): void {
    this.discoveryRules.push(rule);
    this.emit('discovery-rule-added', { ruleId: rule.id });
  }

  /**
   * Remove a discovery rule
   */
  removeDiscoveryRule(ruleId: string): boolean {
    const index = this.discoveryRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.discoveryRules.splice(index, 1);
      this.emit('discovery-rule-removed', { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Get all discovery rules
   */
  getDiscoveryRules(): MCPServerDiscoveryRule[] {
    return [...this.discoveryRules];
  }

  /**
   * Enable/disable auto-discovery
   */
  setAutoDiscoveryEnabled(enabled: boolean): void {
    this.autoDiscoveryEnabled = enabled;

    if (enabled && !this.discoveryInterval) {
      this.startAutoDiscovery();
    } else if (!enabled && this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    this.emit('auto-discovery-toggle', { enabled });
  }

  /**
   * Export registry data
   */
  export(): {
    servers: Record<string, MCPServerInfo>;
    healthStatuses: Record<string, MCPServerHealthStatus>;
    discoveryRules: MCPServerDiscoveryRule[];
    stats: MCPServerStats;
  } {
    return {
      servers: Object.fromEntries(this.servers),
      healthStatuses: Object.fromEntries(this.healthStatuses),
      discoveryRules: this.discoveryRules,
      stats: this.getStats()
    };
  }

  /**
   * Shutdown the registry
   */
  shutdown(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.emit('shutdown');
    this.removeAllListeners();
  }
}

export default MCPServerRegistry;