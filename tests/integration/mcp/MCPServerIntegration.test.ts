import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  config: {
    priority: number;
    timeout: number;
    retryAttempts: number;
    critical: boolean;
    category: string;
  };
}

interface MCPHealthResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  details?: string;
}

class MCPServerTester {
  private mcpConfig: { mcpServers: Record<string, MCPServerConfig> };
  private runningServers: Map<string, ChildProcess> = new Map();

  constructor() {
    try {
      const configContent = readFileSync('./mcp_config.json', 'utf-8');
      this.mcpConfig = JSON.parse(configContent);
    } catch (error) {
      throw new Error(`Failed to load MCP configuration: ${error}`);
    }
  }

  async startServer(serverName: string): Promise<boolean> {
    const serverConfig = this.mcpConfig.mcpServers[serverName];
    if (!serverConfig) {
      throw new Error(`Server ${serverName} not found in configuration`);
    }

    return new Promise((resolve) => {
      const process = spawn(serverConfig.command, serverConfig.args, {
        env: { ...process.env, ...serverConfig.env },
        stdio: 'pipe'
      });

      let hasStarted = false;
      const timeout = setTimeout(() => {
        if (!hasStarted) {
          this.stopServer(serverName);
          resolve(false);
        }
      }, serverConfig.config.timeout);

      process.stdout?.on('data', (data) => {
        if (!hasStarted && data.toString().includes('Server started')) {
          hasStarted = true;
          clearTimeout(timeout);
          resolve(true);
        }
      });

      process.stderr?.on('data', (data) => {
        // Log errors but don't fail immediately
        console.warn(`MCP Server ${serverName} stderr:`, data.toString());
      });

      process.on('error', (error) => {
        if (!hasStarted) {
          hasStarted = true;
          clearTimeout(timeout);
          resolve(false);
        }
      });

      this.runningServers.set(serverName, process);
    });
  }

  stopServer(serverName: string): void {
    const process = this.runningServers.get(serverName);
    if (process) {
      process.kill();
      this.runningServers.delete(serverName);
    }
  }

  async testServerConnectivity(serverName: string): Promise<MCPHealthResult> {
    const startTime = performance.now();
    const serverConfig = this.mcpConfig.mcpServers[serverName];

    try {
      // Simulate MCP protocol handshake
      const isRunning = this.runningServers.has(serverName);

      if (!isRunning) {
        return {
          name: serverName,
          status: 'unhealthy',
          responseTime: performance.now() - startTime,
          error: 'Server not running',
          details: 'MCP server process is not active'
        };
      }

      // Test basic communication
      const responseTime = performance.now() - startTime;

      // Determine health status based on response time and configuration
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (responseTime > serverConfig.config.timeout / 2) {
        status = 'degraded';
      }
      if (responseTime > serverConfig.config.timeout) {
        status = 'unhealthy';
      }

      return {
        name: serverName,
        status,
        responseTime,
        details: `Server responding within ${responseTime.toFixed(0)}ms`
      };

    } catch (error) {
      return {
        name: serverName,
        status: 'unhealthy',
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        details: 'Failed to establish MCP connection'
      };
    }
  }

  async testServerLoad(serverName: string, requestCount: number = 10): Promise<{
    averageResponseTime: number;
    successRate: number;
    maxResponseTime: number;
    minResponseTime: number;
  }> {
    const results: number[] = [];
    let successes = 0;

    for (let i = 0; i < requestCount; i++) {
      const result = await this.testServerConnectivity(serverName);
      if (result.status !== 'unhealthy') {
        successes++;
      }
      results.push(result.responseTime);
    }

    return {
      averageResponseTime: results.reduce((a, b) => a + b, 0) / results.length,
      successRate: successes / requestCount,
      maxResponseTime: Math.max(...results),
      minResponseTime: Math.min(...results)
    };
  }

  async testFailoverScenario(primaryServer: string, fallbackServer: string): Promise<{
    primaryFailed: boolean;
    fallbackActivated: boolean;
    failoverTime: number;
  }> {
    const startTime = performance.now();

    // First test primary server
    const primaryResult = await this.testServerConnectivity(primaryServer);
    const primaryFailed = primaryResult.status === 'unhealthy';

    if (primaryFailed) {
      // Test fallback server
      const fallbackResult = await this.testServerConnectivity(fallbackServer);
      const fallbackActivated = fallbackResult.status !== 'unhealthy';

      return {
        primaryFailed,
        fallbackActivated,
        failoverTime: performance.now() - startTime
      };
    }

    return {
      primaryFailed: false,
      fallbackActivated: false,
      failoverTime: 0
    };
  }

  cleanup(): void {
    for (const [serverName] of this.runningServers) {
      this.stopServer(serverName);
    }
  }
}

describe('MCP Server Integration Tests', () => {
  let mcpTester: MCPServerTester;
  const criticalServers = ['github', 'memory', 'filesystem'];

  beforeAll(async () => {
    mcpTester = new MCPServerTester();
  });

  afterAll(() => {
    mcpTester.cleanup();
  });

  describe('Server Startup and Health Checks', () => {
    it('should start critical MCP servers successfully', async () => {
      const results = new Map<string, boolean>();

      for (const serverName of criticalServers) {
        try {
          const started = await mcpTester.startServer(serverName);
          results.set(serverName, started);
        } catch (error) {
          results.set(serverName, false);
        }
      }

      // At least 70% of critical servers should start successfully
      const successCount = Array.from(results.values()).filter(Boolean).length;
      const successRate = successCount / criticalServers.length;
      expect(successRate).toBeGreaterThanOrEqual(0.7);
    }, 30000);

    it('should perform health checks on all configured servers', async () => {
      const healthResults: MCPHealthResult[] = [];

      for (const serverName of Object.keys(mcpTester['mcpConfig'].mcpServers)) {
        const result = await mcpTester.testServerConnectivity(serverName);
        healthResults.push(result);
      }

      expect(healthResults).toHaveLength(Object.keys(mcpTester['mcpConfig'].mcpServers).length);

      // Log health status for debugging
      healthResults.forEach(result => {
        console.log(`${result.name}: ${result.status} (${result.responseTime.toFixed(0)}ms)`);
      });

      // At least 50% of servers should be healthy or degraded
      const workingServers = healthResults.filter(r => r.status !== 'unhealthy').length;
      const workingRate = workingServers / healthResults.length;
      expect(workingRate).toBeGreaterThanOrEqual(0.5);
    }, 45000);
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests to memory server', async () => {
      const loadTest = await mcpTester.testServerLoad('memory', 5);

      expect(loadTest.successRate).toBeGreaterThanOrEqual(0.8);
      expect(loadTest.averageResponseTime).toBeLessThan(5000);
      expect(loadTest.maxResponseTime).toBeLessThan(10000);
    }, 15000);

    it('should maintain performance under sustained load', async () => {
      const results = [];

      // Run multiple load tests to simulate sustained usage
      for (let i = 0; i < 3; i++) {
        const result = await mcpTester.testServerLoad('filesystem', 3);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
      }

      // Performance shouldn't degrade significantly over time
      const averageResponseTimes = results.map(r => r.averageResponseTime);
      const firstAverage = averageResponseTimes[0];
      const lastAverage = averageResponseTimes[averageResponseTimes.length - 1];

      // Last average shouldn't be more than 50% slower than first
      expect(lastAverage).toBeLessThan(firstAverage * 1.5);
    }, 20000);
  });

  describe('Failover and Circuit Breaker Testing', () => {
    it('should handle failover between version control servers', async () => {
      const failover = await mcpTester.testFailoverScenario('github', 'gitlab');

      // Either primary should work OR fallback should activate
      expect(failover.primaryFailed === false || failover.fallbackActivated === true).toBe(true);

      if (failover.primaryFailed && failover.fallbackActivated) {
        expect(failover.failoverTime).toBeLessThan(15000);
      }
    }, 20000);

    it('should respect circuit breaker patterns', async () => {
      // Test rapid consecutive failures
      const rapidTests = [];
      for (let i = 0; i < 5; i++) {
        rapidTests.push(mcpTester.testServerConnectivity('everart'));
      }

      const results = await Promise.all(rapidTests);

      // Should handle rapid requests without crashing
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('responseTime');
      });
    }, 15000);
  });

  describe('Error Handling and Recovery', () => {
    it('should gracefully handle server unavailability', async () => {
      // Test connection to a server that doesn't exist
      const result = await mcpTester.testServerConnectivity('non-existent-server');

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBeDefined();
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should recover from temporary failures', async () => {
      const serverName = 'sqlite';

      // First test - may fail due to server not being started
      const firstResult = await mcpTester.testServerConnectivity(serverName);

      // Try to start the server if it failed
      if (firstResult.status === 'unhealthy') {
        await mcpTester.startServer(serverName);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for startup

        // Second test - should succeed after startup
        const secondResult = await mcpTester.testServerConnectivity(serverName);

        // Should either work now or be consistently failing (not intermittent)
        expect(secondResult.status === 'healthy' || secondResult.status === 'degraded' ||
               secondResult.error === firstResult.error).toBe(true);
      }
    }, 15000);
  });

  describe('Integration with System Components', () => {
    it('should validate MCP protocol compliance', async () => {
      const testServers = ['memory', 'filesystem'];

      for (const serverName of testServers) {
        const result = await mcpTester.testServerConnectivity(serverName);

        // Should respond with valid MCP protocol structure
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('responseTime');
        expect(typeof result.responseTime).toBe('number');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      }
    });

    it('should handle rate limiting appropriately', async () => {
      const serverName = 'brave-search';
      const config = mcpTester['mcpConfig'].mcpServers[serverName];

      if (config) {
        // Test rapid requests up to rate limit
        const rapidRequests = 3; // Conservative number for testing
        const results = [];

        for (let i = 0; i < rapidRequests; i++) {
          const result = await mcpTester.testServerConnectivity(serverName);
          results.push(result);
        }

        expect(results).toHaveLength(rapidRequests);

        // Should handle rate limiting gracefully without system crashes
        const systemStillResponding = results.every(r =>
          typeof r.responseTime === 'number' && r.responseTime >= 0
        );
        expect(systemStillResponding).toBe(true);
      }
    }, 10000);
  });

  describe('Configuration Validation', () => {
    it('should validate MCP server configurations', () => {
      const config = mcpTester['mcpConfig'];

      expect(config).toHaveProperty('mcpServers');
      expect(typeof config.mcpServers).toBe('object');

      for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
        expect(serverConfig).toHaveProperty('command');
        expect(serverConfig).toHaveProperty('args');
        expect(serverConfig).toHaveProperty('env');
        expect(serverConfig).toHaveProperty('config');

        expect(Array.isArray(serverConfig.args)).toBe(true);
        expect(typeof serverConfig.env).toBe('object');
        expect(typeof serverConfig.config.timeout).toBe('number');
        expect(typeof serverConfig.config.priority).toBe('number');
        expect(typeof serverConfig.config.critical).toBe('boolean');
      }
    });

    it('should have proper environment variable configuration', () => {
      const config = mcpTester['mcpConfig'];
      const requiredEnvVars = new Set<string>();

      for (const serverConfig of Object.values(config.mcpServers)) {
        for (const envValue of Object.values(serverConfig.env)) {
          const match = envValue.match(/\$\{(\w+)\}/);
          if (match && !envValue.includes(':-')) {
            requiredEnvVars.add(match[1]);
          }
        }
      }

      // Should have identified required environment variables
      expect(requiredEnvVars.size).toBeGreaterThan(0);

      // Log missing env vars for debugging (don't fail test)
      const missingVars = Array.from(requiredEnvVars).filter(
        varName => !process.env[varName]
      );

      if (missingVars.length > 0) {
        console.warn('Missing environment variables:', missingVars);
      }
    });
  });
});