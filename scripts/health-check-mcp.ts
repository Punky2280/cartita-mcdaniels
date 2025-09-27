#!/usr/bin/env tsx

/**
 * MCP Server Health Check Script
 * Tests connectivity and basic functionality for all configured MCP servers
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { performance } from "node:perf_hooks";

interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  details?: string;
}

class MCPHealthChecker {
  private mcpConfig: { mcpServers: Record<string, MCPServer> };

  constructor() {
    try {
      const configContent = readFileSync('./mcp_config.json', 'utf-8');
      this.mcpConfig = JSON.parse(configContent);
    } catch (error) {
      console.error('❌ Failed to load MCP configuration:', error);
      process.exit(1);
    }
  }

  /**
   * Check if required environment variables are set
   */
  private checkEnvironmentVariables(server: MCPServer): string[] {
    const missing: string[] = [];
    
    for (const [key, value] of Object.entries(server.env)) {
      // Skip optional variables (those with default values or marked as optional)
      if (value.includes(':-') || value.endsWith(':-}') || key === 'NODE_PATH') {
        continue;
      }
      
      const envVarName = value.replace('${', '').replace('}', '');
      if (!process.env[envVarName]) {
        missing.push(envVarName);
      }
    }
    
    return missing;
  }

  /**
   * Test basic connectivity to an MCP server
   */
  private async testMCPServer(name: string, server: MCPServer): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      // Check environment variables first
      const missingVars = this.checkEnvironmentVariables(server);
      if (missingVars.length > 0) {
        return {
          name,
          status: 'degraded',
          responseTime: performance.now() - startTime,
          error: `Missing environment variables: ${missingVars.join(', ')}`,
          details: 'Server may not function properly without required API keys'
        };
      }

      // Try to execute the server command with a timeout
      const timeout = 5000; // 5 seconds
      const command = `timeout ${timeout / 1000}s ${server.command} ${server.args.join(' ')} --help`;
      
      try {
        execSync(command, { 
          stdio: 'pipe',
          timeout,
          env: { ...process.env, ...server.env }
        });
        
        return {
          name,
          status: 'healthy',
          responseTime: performance.now() - startTime,
          details: 'Server command accessible and responsive'
        };
      } catch (execError: any) {
        // If it's a timeout or command not found, mark as unhealthy
        if (execError.code === 'ENOENT' || execError.signal === 'SIGTERM') {
          return {
            name,
            status: 'unhealthy',
            responseTime: performance.now() - startTime,
            error: 'Server command not found or not responding',
            details: execError.message
          };
        }
        
        // Other errors might be expected (like missing API keys), so mark as degraded
        return {
          name,
          status: 'degraded',
          responseTime: performance.now() - startTime,
          error: 'Server command failed',
          details: execError.message
        };
      }
    } catch (error: any) {
      return {
        name,
        status: 'unhealthy',
        responseTime: performance.now() - startTime,
        error: error.message,
        details: 'Unexpected error during health check'
      };
    }
  }

  /**
   * Run health checks on all MCP servers
   */
  async runAllHealthChecks(): Promise<HealthCheckResult[]> {
    console.log('🔍 Starting MCP Server Health Checks...\n');
    
    const results: HealthCheckResult[] = [];
    const serverEntries = Object.entries(this.mcpConfig.mcpServers);
    
    for (const [name, server] of serverEntries) {
      console.log(`⏳ Checking ${name}...`);
      const result = await this.testMCPServer(name, server);
      results.push(result);
      
      // Print immediate result
      const statusIcon = result.status === 'healthy' ? '✅' : 
                        result.status === 'degraded' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${name}: ${result.status} (${result.responseTime.toFixed(0)}ms)`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      console.log();
    }
    
    return results;
  }

  /**
   * Generate a summary report
   */
  generateSummaryReport(results: HealthCheckResult[]): void {
    const healthy = results.filter(r => r.status === 'healthy').length;
    const degraded = results.filter(r => r.status === 'degraded').length;
    const unhealthy = results.filter(r => r.status === 'unhealthy').length;
    const total = results.length;
    
    console.log('📊 Health Check Summary');
    console.log('========================');
    console.log(`Total MCP servers: ${total}`);
    console.log(`✅ Healthy: ${healthy}`);
    console.log(`⚠️  Degraded: ${degraded}`);
    console.log(`❌ Unhealthy: ${unhealthy}`);
    console.log();
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    console.log(`Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log();
    
    if (degraded > 0 || unhealthy > 0) {
      console.log('🔧 Recommendations:');
      console.log('- Check .env file for missing API keys');
      console.log('- Ensure all required dependencies are installed');
      console.log('- Verify network connectivity for external services');
      console.log('- Run: pnpm install to install missing packages');
      console.log();
    }
    
    // Exit with appropriate code
    if (unhealthy > 0) {
      console.log('❌ Some MCP servers are unhealthy. Please address the issues above.');
      process.exit(1);
    } else if (degraded > 0) {
      console.log('⚠️  Some MCP servers are degraded but functional.');
      process.exit(0);
    } else {
      console.log('✅ All MCP servers are healthy!');
      process.exit(0);
    }
  }
}

// Main execution
async function main() {
  const checker = new MCPHealthChecker();
  const results = await checker.runAllHealthChecks();
  checker.generateSummaryReport(results);
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the health check
main().catch(console.error);