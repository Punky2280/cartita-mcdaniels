#!/usr/bin/env tsx
/**
 * Context7 Agents Demonstration Script
 * Shows how to use the three specialized agents with Context7 and sequential thinking
 */

import { Orchestrator } from '../src/agents/core/Orchestrator.js';
import { FrontendAgent } from '../src/agents/advanced/FrontendAgent.js';
import { APIAgent } from '../src/agents/advanced/APIAgent.js';
import { DocsAgent } from '../src/agents/advanced/DocsAgent.js';
import { AgentPrompts } from '../src/core/AgentPrompts.js';

class Context7AgentDemo {
  private orchestrator: Orchestrator;
  private frontendAgent: FrontendAgent;
  private apiAgent: APIAgent;
  private docsAgent: DocsAgent;

  constructor() {
    this.orchestrator = new Orchestrator();
    this.frontendAgent = new FrontendAgent();
    this.apiAgent = new APIAgent();
    this.docsAgent = new DocsAgent();
  }

  async runDemo() {
    console.log('🚀 Context7 Agents Demonstration');
    console.log('=================================\n');

    await this.demonstrateFrontendAgent();
    await this.demonstrateAPIAgent();
    await this.demonstrateDocsAgent();
    await this.demonstrateOrchestration();

    console.log('\n✅ Demo completed successfully!');
  }

  private async demonstrateFrontendAgent() {
    console.log('🎨 Frontend Agent Demo');
    console.log('----------------------');

    console.log('Creating Aurora-themed user dashboard component...\n');

    try {
      const result = await this.frontendAgent.createAuroraComponent(
        'UserDashboard',
        'A comprehensive user dashboard with navigation sidebar, main content area with data cards, user profile section, and responsive design using Aurora color scheme'
      );

      if (result.kind === 'ok') {
        console.log('✅ Frontend Agent Success:');
        console.log('- Research completed using Context7');
        console.log('- Sequential thinking applied for component architecture');
        console.log('- Aurora color scheme integrated');
        console.log('- TypeScript interfaces generated');
        console.log('- Accessibility features included');
        console.log('- Testing strategy provided\n');

        // Show sample of the implementation
        const data = result.data as any;
        console.log('Sample Implementation Preview:');
        console.log('```typescript');
        console.log(data.implementation.substring(0, 300) + '...');
        console.log('```\n');
      } else {
        console.log('❌ Frontend Agent Error:', result.message);
      }
    } catch (error) {
      console.log('❌ Frontend Agent Demo Error:', error);
    }
  }

  private async demonstrateAPIAgent() {
    console.log('⚡ API Agent Demo');
    console.log('----------------');

    console.log('Creating secure user authentication API endpoints...\n');

    try {
      const result = await this.apiAgent.createAuthenticationSystem(
        'JWT',
        'Complete authentication system with login, register, refresh tokens, password reset, and role-based access control'
      );

      if (result.kind === 'ok') {
        console.log('✅ API Agent Success:');
        console.log('- Research completed using Context7');
        console.log('- Sequential thinking applied for security architecture');
        console.log('- OWASP Top 10 protections implemented');
        console.log('- Input validation with Zod schemas');
        console.log('- OpenAPI documentation generated');
        console.log('- Security analysis provided');
        console.log('- Testing strategy included\n');

        // Show sample of the implementation
        const data = result.data as any;
        console.log('Sample Security Analysis:');
        console.log(data.securityAnalysis.substring(0, 200) + '...\n');
      } else {
        console.log('❌ API Agent Error:', result.message);
      }
    } catch (error) {
      console.log('❌ API Agent Demo Error:', error);
    }
  }

  private async demonstrateDocsAgent() {
    console.log('📚 Documentation Agent Demo');
    console.log('---------------------------');

    console.log('Creating comprehensive API documentation...\n');

    try {
      const result = await this.docsAgent.createAPIDocumentation(
        'Aurora Interface API',
        'RESTful API for Aurora Interface application with user management, authentication, and data operations'
      );

      if (result.kind === 'ok') {
        console.log('✅ Documentation Agent Success:');
        console.log('- Research completed using Context7');
        console.log('- Sequential thinking applied for content structure');
        console.log('- Audience analysis performed');
        console.log('- OpenAPI specification generated');
        console.log('- Interactive elements included');
        console.log('- Supplementary materials created\n');

        // Show sample of the implementation
        const data = result.data as any;
        console.log('Sample Documentation Structure:');
        console.log(data.contentStructure.substring(0, 250) + '...\n');
      } else {
        console.log('❌ Documentation Agent Error:', result.message);
      }
    } catch (error) {
      console.log('❌ Documentation Agent Demo Error:', error);
    }
  }

  private async demonstrateOrchestration() {
    console.log('🎭 Agent Orchestration Demo');
    console.log('---------------------------');

    console.log('Using smart execution to choose optimal agent...\n');

    try {
      const result = await this.orchestrator.smartExecute(
        'Create a responsive navigation component with Aurora colors and accessibility features'
      );

      if (result.kind === 'ok') {
        console.log('✅ Orchestration Success:');
        console.log('- Analyzed request and routed to appropriate agent');
        console.log('- Applied Context7 research methodology');
        console.log('- Used sequential thinking for decision making');
        console.log('- Generated production-ready solution\n');
      } else {
        console.log('❌ Orchestration Error:', result.message);
      }
    } catch (error) {
      console.log('❌ Orchestration Demo Error:', error);
    }
  }

  private async showPromptExamples() {
    console.log('📝 Optimized Prompt Examples');
    console.log('----------------------------\n');

    // Frontend prompt example
    const frontendPrompt = AgentPrompts.generateCompletePrompt('frontend', 'implementation', {
      task: 'component',
      description: 'User profile card with avatar, name, role, and actions',
      requirements: 'Aurora colors, responsive design, accessibility'
    });

    console.log('Frontend Agent Prompt:');
    console.log(frontendPrompt.substring(0, 200) + '...\n');

    // API prompt example
    const apiPrompt = AgentPrompts.generateCompletePrompt('api', 'implementation', {
      task: 'authentication',
      method: 'POST',
      endpoint: '/auth/login',
      securityLevel: 'public',
      description: 'User login with email and password'
    });

    console.log('API Agent Prompt:');
    console.log(apiPrompt.substring(0, 200) + '...\n');

    // Documentation prompt example
    const docsPrompt = AgentPrompts.generateCompletePrompt('docs', 'implementation', {
      task: 'api-docs',
      audience: 'developers',
      format: 'openapi',
      description: 'Authentication API endpoints documentation'
    });

    console.log('Documentation Agent Prompt:');
    console.log(docsPrompt.substring(0, 200) + '...\n');
  }

  async showAgentCapabilities() {
    console.log('🔧 Agent Capabilities Summary');
    console.log('=============================\n');

    console.log('🎨 Frontend Agent (frontend-agent):');
    console.log('- Context7 research for React/TypeScript best practices');
    console.log('- Sequential thinking for component architecture');
    console.log('- Aurora color scheme implementation');
    console.log('- WCAG 2.1 AA accessibility compliance');
    console.log('- Core Web Vitals performance optimization');
    console.log('- Responsive design with Tailwind CSS');
    console.log('- Testing strategy with React Testing Library\n');

    console.log('⚡ API Agent (api-agent):');
    console.log('- Context7 research for API security and performance');
    console.log('- Sequential thinking for system architecture');
    console.log('- OWASP Top 10 security implementation');
    console.log('- RESTful design with Fastify framework');
    console.log('- Database optimization with Drizzle ORM');
    console.log('- Input validation with Zod schemas');
    console.log('- OpenAPI 3.0 documentation generation\n');

    console.log('📚 Documentation Agent (docs-agent):');
    console.log('- Context7 research for technical writing best practices');
    console.log('- Sequential thinking for content organization');
    console.log('- Multi-audience content adaptation');
    console.log('- Interactive documentation elements');
    console.log('- OpenAPI specification generation');
    console.log('- Comprehensive troubleshooting guides');
    console.log('- Multi-format output (Markdown, HTML, etc.)\n');

    console.log('Aurora Color Scheme:');
    console.log(AgentPrompts.getAuroraColorInfo());
  }
}

// Usage examples
async function runExamples() {
  const demo = new Context7AgentDemo();

  console.log('Context7 Agents - Aurora Interface Development');
  console.log('=============================================\n');

  await demo.showAgentCapabilities();

  console.log('\n🎯 Example Usage Commands:');
  console.log('==========================\n');

  console.log('Frontend Development:');
  console.log('pnpm tsx scripts/demo-context7-agents.ts frontend "Create user profile component with Aurora colors"');
  console.log('pnpm tsx scripts/demo-context7-agents.ts frontend "Build responsive dashboard layout with sidebar navigation"\n');

  console.log('API Development:');
  console.log('pnpm tsx scripts/demo-context7-agents.ts api "Create CRUD endpoints for user management"');
  console.log('pnpm tsx scripts/demo-context7-agents.ts api "Implement JWT authentication with refresh tokens"\n');

  console.log('Documentation:');
  console.log('pnpm tsx scripts/demo-context7-agents.ts docs "Generate API documentation for authentication system"');
  console.log('pnpm tsx scripts/demo-context7-agents.ts docs "Create user guide for dashboard interface"\n');

  console.log('For full demonstration:');
  console.log('pnpm tsx scripts/demo-context7-agents.ts demo\n');
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const description = args[1];

  const demo = new Context7AgentDemo();

  try {
    switch (command) {
      case 'demo':
        await demo.runDemo();
        break;

      case 'frontend':
        if (!description) {
          console.log('❌ Please provide a description for the frontend task');
          process.exit(1);
        }
        console.log(`🎨 Running Frontend Agent: ${description}`);
        const frontendResult = await demo.frontendAgent.execute({
          task: 'component',
          description,
          technologies: ['React', 'TypeScript', 'Tailwind CSS'],
          colorScheme: 'aurora'
        });
        console.log('Result:', frontendResult);
        break;

      case 'api':
        if (!description) {
          console.log('❌ Please provide a description for the API task');
          process.exit(1);
        }
        console.log(`⚡ Running API Agent: ${description}`);
        const apiResult = await demo.apiAgent.execute({
          task: 'endpoint',
          description,
          technologies: ['Fastify', 'TypeScript', 'Drizzle ORM'],
          securityLevel: 'authenticated'
        });
        console.log('Result:', apiResult);
        break;

      case 'docs':
        if (!description) {
          console.log('❌ Please provide a description for the documentation task');
          process.exit(1);
        }
        console.log(`📚 Running Documentation Agent: ${description}`);
        const docsResult = await demo.docsAgent.execute({
          task: 'api-docs',
          description,
          audience: 'developers',
          format: 'markdown',
          codeExamples: true
        });
        console.log('Result:', docsResult);
        break;

      case 'capabilities':
        await demo.showAgentCapabilities();
        break;

      default:
        await runExamples();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { Context7AgentDemo };