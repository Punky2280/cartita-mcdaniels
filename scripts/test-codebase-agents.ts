#!/usr/bin/env tsx
/**
 * Test script for new codebase inspection agents
 * Demonstrates usage of CodebaseInspectorAgent and McpIntegrationAgent
 */

import { Orchestrator } from '../src/agents/core/Orchestrator.js';
import { CodebaseInspectorAgent } from '../src/agents/advanced/CodebaseInspectorAgent.js';
import { McpIntegrationAgent } from '../src/agents/advanced/McpIntegrationAgent.js';

class CodebaseAgentTester {
  private orchestrator: Orchestrator;
  private codebaseInspector: CodebaseInspectorAgent;
  private mcpIntegration: McpIntegrationAgent;

  constructor() {
    this.orchestrator = new Orchestrator();
    this.codebaseInspector = new CodebaseInspectorAgent();
    this.mcpIntegration = new McpIntegrationAgent();
  }

  async runTests() {
    console.log('🧪 Testing Codebase Inspection Agents');
    console.log('====================================\n');

    await this.testCodebaseInspector();
    await this.testMcpIntegration();
    await this.testOrchestratorIntegration();

    console.log('\n✅ All tests completed!');
  }

  private async testCodebaseInspector() {
    console.log('🔍 Testing CodebaseInspectorAgent');
    console.log('---------------------------------');

    try {
      // Test security inspection
      console.log('Running security inspection...');
      const securityResult = await this.codebaseInspector.inspectSecurity('/home/robbie/cartrita-mcdaniels-suarez');

      if (securityResult.kind === 'ok') {
        const data = securityResult.data as any;
        console.log('✅ Security inspection completed');
        console.log(`   Files analyzed: ${data.metrics?.filesAnalyzed || 'N/A'}`);
        console.log(`   Findings: ${data.findings?.length || 0}`);
        console.log(`   Recommendations: ${data.recommendations?.length || 0}`);
      } else {
        console.log('❌ Security inspection failed:', securityResult.message);
      }

      // Test performance inspection
      console.log('\nRunning performance inspection...');
      const performanceResult = await this.codebaseInspector.inspectPerformance();

      if (performanceResult.kind === 'ok') {
        console.log('✅ Performance inspection completed');
      } else {
        console.log('❌ Performance inspection failed:', performanceResult.message);
      }

      // Test comprehensive inspection
      console.log('\nRunning comprehensive inspection...');
      const comprehensiveResult = await this.codebaseInspector.comprehensiveInspection();

      if (comprehensiveResult.kind === 'ok') {
        const data = comprehensiveResult.data as any;
        console.log('✅ Comprehensive inspection completed');
        console.log(`   Summary: ${data.summary?.substring(0, 100) || 'N/A'}...`);

        if (data.context7Insights) {
          console.log('   Context7 insights included ✨');
        }
        if (data.mcpServerData) {
          console.log('   MCP server data included 🔗');
        }
      } else {
        console.log('❌ Comprehensive inspection failed:', comprehensiveResult.message);
      }

    } catch (error) {
      console.log('❌ CodebaseInspectorAgent test error:', error);
    }

    console.log();
  }

  private async testMcpIntegration() {
    console.log('🔗 Testing McpIntegrationAgent');
    console.log('------------------------------');

    try {
      // Test repository analysis
      console.log('Running repository analysis...');
      const repoResult = await this.mcpIntegration.analyzeRepository();

      if (repoResult.kind === 'ok') {
        const data = repoResult.data as any;
        console.log('✅ Repository analysis completed');
        console.log(`   Server: ${data.server}`);
        console.log(`   Operation: ${data.operation}`);
        console.log(`   Success: ${data.success}`);
        console.log(`   Data points: ${data.metadata?.dataPoints || 'N/A'}`);
      } else {
        console.log('❌ Repository analysis failed:', repoResult.message);
      }

      // Test codebase search
      console.log('\nRunning codebase search...');
      const searchResult = await this.mcpIntegration.searchCodebase('agent orchestrator');

      if (searchResult.kind === 'ok') {
        console.log('✅ Codebase search completed');
        const data = searchResult.data as any;
        if (data.context7Data) {
          console.log('   Context7 enhancement included ✨');
        }
      } else {
        console.log('❌ Codebase search failed:', searchResult.message);
      }

      // Test best practices research
      console.log('\nResearching TypeScript best practices...');
      const researchResult = await this.mcpIntegration.researchBestPractices('TypeScript');

      if (researchResult.kind === 'ok') {
        console.log('✅ Best practices research completed');
      } else {
        console.log('❌ Best practices research failed:', researchResult.message);
      }

      // Test activity monitoring
      console.log('\nMonitoring codebase activity...');
      const monitorResult = await this.mcpIntegration.monitorCodebaseActivity();

      if (monitorResult.kind === 'ok') {
        console.log('✅ Activity monitoring completed');
      } else {
        console.log('❌ Activity monitoring failed:', monitorResult.message);
      }

    } catch (error) {
      console.log('❌ McpIntegrationAgent test error:', error);
    }

    console.log();
  }

  private async testOrchestratorIntegration() {
    console.log('🎭 Testing Orchestrator Integration');
    console.log('----------------------------------');

    try {
      // Test agent registration
      console.log('Checking agent registration...');
      const metrics = this.orchestrator.getMetrics();

      console.log(`✅ Registered agents: ${metrics.orchestrator.registeredAgents}`);
      console.log(`✅ Registered workflows: ${metrics.orchestrator.registeredWorkflows}`);

      // Check if our new agents are registered
      const agentNames = Object.keys(metrics.agents);
      const hasCodebaseInspector = agentNames.includes('codebase-inspector');
      const hasMcpIntegration = agentNames.includes('mcp-integration');

      console.log(`   CodebaseInspectorAgent: ${hasCodebaseInspector ? '✅' : '❌'}`);
      console.log(`   McpIntegrationAgent: ${hasMcpIntegration ? '✅' : '❌'}`);

      // Test smart execution routing
      console.log('\nTesting smart execution routing...');
      const smartResult = await this.orchestrator.smartExecute(
        'Analyze the security of this codebase and identify potential vulnerabilities'
      );

      if (smartResult.kind === 'ok') {
        console.log('✅ Smart execution completed');
        console.log('   Request was intelligently routed to appropriate agent/workflow');
      } else {
        console.log('❌ Smart execution failed:', smartResult.message);
      }

      // Test direct agent delegation
      console.log('\nTesting direct agent delegation...');
      const delegateResult = await this.orchestrator.delegate('codebase-inspector', {
        inspectionType: 'architecture',
        depth: 'medium',
        includeTests: true
      });

      if (delegateResult.kind === 'ok') {
        console.log('✅ Direct delegation to CodebaseInspectorAgent successful');
      } else {
        console.log('❌ Direct delegation failed:', delegateResult.message);
      }

    } catch (error) {
      console.log('❌ Orchestrator integration test error:', error);
    }

    console.log();
  }

  async demonstrateCapabilities() {
    console.log('🚀 Agent Capabilities Demonstration');
    console.log('===================================\n');

    console.log('🔍 CodebaseInspectorAgent Capabilities:');
    console.log('- Security analysis with OWASP Top 10 coverage');
    console.log('- Performance auditing and optimization suggestions');
    console.log('- Architecture review and design pattern analysis');
    console.log('- Dependency scanning for vulnerabilities and updates');
    console.log('- Code quality assessment with metrics');
    console.log('- Context7 integration for library-specific insights');
    console.log('- MCP server leverage for enhanced analysis\n');

    console.log('🔗 McpIntegrationAgent Capabilities:');
    console.log('- GitHub repository analysis and monitoring');
    console.log('- Memory storage and retrieval operations');
    console.log('- Brave Search for best practices research');
    console.log('- Filesystem analysis and monitoring');
    console.log('- GitLab integration support');
    console.log('- Context7 enhancement for all operations');
    console.log('- Multi-server parallel processing\n');

    console.log('🎭 Orchestrator Integration:');
    console.log('- Intelligent request routing to appropriate agents');
    console.log('- Smart execution with automatic agent selection');
    console.log('- Comprehensive workflow support');
    console.log('- Agent health monitoring and metrics');
    console.log('- Circuit breaker pattern for resilience');
    console.log('- Event-driven architecture with real-time updates\n');
  }

  async showUsageExamples() {
    console.log('📚 Usage Examples');
    console.log('=================\n');

    console.log('// Security Inspection');
    console.log('const inspector = new CodebaseInspectorAgent();');
    console.log('const result = await inspector.inspectSecurity("./src");');
    console.log('console.log(result.data.findings);\n');

    console.log('// Repository Analysis with MCP');
    console.log('const mcpAgent = new McpIntegrationAgent();');
    console.log('const analysis = await mcpAgent.analyzeRepository();');
    console.log('console.log(analysis.data.insights);\n');

    console.log('// Orchestrated Smart Execution');
    console.log('const orchestrator = new Orchestrator();');
    console.log('const result = await orchestrator.smartExecute(');
    console.log('  "Find performance bottlenecks in the API layer"');
    console.log(');');
    console.log('console.log(result.data);\n');

    console.log('// MCP Server Integration');
    console.log('const mcpResult = await mcpAgent.execute({');
    console.log('  mcpServer: "github",');
    console.log('  operation: "analyze",');
    console.log('  context: "code quality metrics",');
    console.log('  includeContext7: true');
    console.log('});');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';

  const tester = new CodebaseAgentTester();

  try {
    switch (command) {
      case 'test':
        await tester.runTests();
        break;

      case 'demo':
        await tester.demonstrateCapabilities();
        break;

      case 'examples':
        await tester.showUsageExamples();
        break;

      case 'all':
        await tester.demonstrateCapabilities();
        await tester.showUsageExamples();
        await tester.runTests();
        break;

      default:
        console.log('Available commands:');
        console.log('  test     - Run agent functionality tests');
        console.log('  demo     - Show agent capabilities');
        console.log('  examples - Display usage examples');
        console.log('  all      - Run everything');
        break;
    }
  } catch (error) {
    console.error('❌ Test execution error:', error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { CodebaseAgentTester };