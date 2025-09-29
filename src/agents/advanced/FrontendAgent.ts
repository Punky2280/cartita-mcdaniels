import { BaseAgent, type AgentInput, type AgentResult, type ExecutionContext } from '../base/BaseAgent.js';
import { Context7Service } from '../../core/Context7Service.js';
import { ModelRouter } from '../../core/ModelRouter.js';

export interface FrontendTaskInput extends AgentInput {
  task: 'component' | 'page' | 'styling' | 'animation' | 'optimization' | 'accessibility' | 'testing';
  description: string;
  technologies?: string[];
  requirements?: string[];
  colorScheme?: 'aurora' | 'custom';
}

export class FrontendAgent extends BaseAgent {
  readonly name = 'frontend-agent';
  readonly version = '1.0.0';
  readonly description = 'Advanced frontend development agent with Context7 integration for React, TypeScript, and modern UI/UX';

  private context7: Context7Service;
  private modelRouter: ModelRouter;

  constructor() {
    super(
      { failureThreshold: 3, recoveryTimeout: 30000 }, // Circuit breaker config
      25000, // Timeout
      { maxRetries: 2, retryableErrors: ['timeout', 'network', 'rate-limit'] } // Retry policy
    );
    this.modelRouter = new ModelRouter();
    this.context7 = new Context7Service(this.modelRouter);
  }

  async executeCore(input: FrontendTaskInput, context: ExecutionContext): Promise<AgentResult> {
    try {
      const { task, description, technologies = ['React', 'TypeScript', 'Tailwind CSS'], requirements = [] } = input;

      // Step 1: Context7 Research Phase (MANDATORY)
      console.log('🔍 Starting Context7 research phase...');
      const research = await this.context7.researchBestPractices(
        technologies.join(', '),
        `${task} development`,
        'frontend'
      );

      // Step 2: Sequential Thinking for Complex Tasks
      console.log('🧠 Applying sequential thinking...');
      const thinking = await this.context7.sequentialThinking(
        `Create ${task} for: ${description}`,
        'frontend-react-typescript'
      );

      // Step 3: Generate Implementation Strategy
      const implementationPrompt = this.generateImplementationPrompt(
        task,
        description,
        technologies,
        requirements,
        research,
        thinking,
        input.colorScheme || 'aurora'
      );

      // Step 4: Execute with ModelRouter
      const response = await this.modelRouter.execute(
        'code-generation',
        implementationPrompt,
        {
          systemPrompt: this.getSystemPrompt(),
          maxTokens: 4000,
          temperature: 0.3
        }
      );

      // Step 5: Generate Testing Strategy
      const testingStrategy = await this.generateTestingStrategy(task, description, technologies);

      return {
        kind: 'ok',
        data: {
          implementation: response.content,
          research: research,
          thinking: thinking.finalRecommendation,
          testingStrategy,
          metadata: {
            task,
            technologies,
            colorScheme: input.colorScheme || 'aurora',
            researchCacheHit: true,
            executionTime: Date.now()
          }
        }
      };

    } catch (error) {
      return {
        kind: 'error',
        code: 'frontend_execution_failed',
        message: `Frontend agent execution failed: ${String(error)}`,
        category: 'execution',
        retryable: true
      };
    }
  }

  private generateImplementationPrompt(
    task: string,
    description: string,
    technologies: string[],
    requirements: string[],
    research: any,
    thinking: any,
    colorScheme: string
  ): string {
    const auroraColors = colorScheme === 'aurora' ? `
    Aurora Color Scheme (MUST USE):
    - Claude Orange: #FF6B35 (primary actions, CTAs)
    - Microsoft Blue: #0078D4 (navigation, secondary elements)
    - ChatGPT Purple: #6B46C1 (accents, highlights)

    Tailwind CSS Classes:
    - Primary: bg-claude-500 hover:bg-claude-600 text-white
    - Secondary: bg-ms-blue-500 hover:bg-ms-blue-600 text-white
    - Accent: bg-gpt-purple-500 hover:bg-gpt-purple-600 text-white
    ` : '';

    return `
# Frontend Development Task

## Task Type: ${task.toUpperCase()}
## Description: ${description}

## Context7 Research Findings:
**Best Practices:**
${research.bestPractices.map((bp: string) => `- ${bp}`).join('\n')}

**Security Considerations:**
${research.securityConsiderations.map((sc: string) => `- ${sc}`).join('\n')}

**Performance Optimizations:**
${research.performanceOptimizations.map((po: string) => `- ${po}`).join('\n')}

**Common Pitfalls to Avoid:**
${research.commonPitfalls.map((cp: string) => `- ${cp}`).join('\n')}

## Sequential Thinking Analysis:
${thinking.finalRecommendation}

## Technology Stack:
${technologies.map((tech: string) => `- ${tech}`).join('\n')}

## Requirements:
${requirements.map((req: string) => `- ${req}`).join('\n')}

${auroraColors}

## Implementation Guidelines:

### MANDATORY Requirements:
1. **TypeScript**: Use strict typing, no 'any' types
2. **Aurora Color Scheme**: Apply the specified color palette
3. **Accessibility**: WCAG 2.1 AA compliance with ARIA labels
4. **Responsive Design**: Mobile-first approach with Tailwind breakpoints
5. **Performance**: Optimize for Core Web Vitals
6. **Testing**: Include data-testid attributes for testing
7. **Error Handling**: Comprehensive error boundaries and states
8. **Security**: XSS prevention and input sanitization

### Code Structure:
1. Create modular, reusable components
2. Use proper TypeScript interfaces for all props
3. Implement React hooks best practices
4. Follow component composition patterns
5. Add JSDoc comments for complex logic

### Styling Requirements:
1. Use Tailwind CSS utility classes
2. Implement Aurora color scheme consistently
3. Add smooth transitions and hover effects
4. Ensure responsive behavior across all devices
5. Include loading states and micro-interactions

Please provide complete, production-ready code that follows these guidelines and incorporates the Context7 research findings.

Include:
1. Main component implementation
2. TypeScript interfaces
3. Styling with Aurora colors
4. Accessibility attributes
5. Error handling
6. Loading states
7. Responsive design
8. Comments explaining key decisions
`;
  }

  private async generateTestingStrategy(task: string, description: string, technologies: string[]): Promise<string> {
    const testingPrompt = `Generate comprehensive testing strategy for ${task}: ${description}

Technologies: ${technologies.join(', ')}

Include:
1. Component unit tests with React Testing Library
2. Accessibility testing with jest-axe
3. Visual regression testing considerations
4. Performance testing recommendations
5. User interaction testing patterns

Focus on practical, implementable test cases.`;

    const response = await this.modelRouter.execute(
      'code-generation',
      testingPrompt,
      {
        systemPrompt: 'You are a testing specialist focused on comprehensive React component testing.',
        maxTokens: 2000,
        temperature: 0.2
      }
    );

    return response.content;
  }

  private getSystemPrompt(): string {
    return `You are a senior frontend developer specializing in React, TypeScript, and modern UI/UX development.

Your expertise includes:
- React 18+ with hooks and modern patterns
- TypeScript with strict type safety
- Tailwind CSS with design system implementation
- Accessibility (WCAG 2.1 AA) compliance
- Performance optimization and Core Web Vitals
- Responsive design and mobile-first development
- Testing with React Testing Library and Playwright

MANDATORY REQUIREMENTS:
1. Always use Context7 research findings in your implementations
2. Apply sequential thinking for complex architectural decisions
3. Use Aurora color scheme (Claude Orange, Microsoft Blue, ChatGPT Purple)
4. Ensure 100% TypeScript coverage with no 'any' types
5. Implement comprehensive accessibility features
6. Follow React best practices and modern patterns
7. Optimize for performance and Core Web Vitals
8. Include proper error handling and loading states

Your code should be production-ready, well-documented, and follow industry best practices.`;
  }

  /**
   * Specialized method for creating Aurora-themed components
   */
  async createAuroraComponent(componentType: string, specifications: string): Promise<AgentResult> {
    return this.execute({
      task: 'component',
      description: `Create Aurora-themed ${componentType} component: ${specifications}`,
      technologies: ['React', 'TypeScript', 'Tailwind CSS'],
      requirements: [
        'Use Aurora color scheme',
        'Implement accessibility features',
        'Add smooth animations',
        'Ensure responsive design',
        'Include TypeScript interfaces',
        'Add data-testid attributes'
      ],
      colorScheme: 'aurora'
    });
  }

  /**
   * Specialized method for responsive layout creation
   */
  async createResponsiveLayout(layoutType: string, specifications: string): Promise<AgentResult> {
    return this.execute({
      task: 'page',
      description: `Create responsive ${layoutType} layout: ${specifications}`,
      technologies: ['React', 'TypeScript', 'Tailwind CSS'],
      requirements: [
        'Mobile-first responsive design',
        'Aurora color scheme integration',
        'Proper semantic HTML structure',
        'Accessibility navigation features',
        'Performance optimized',
        'Cross-browser compatibility'
      ],
      colorScheme: 'aurora'
    });
  }

  /**
   * Specialized method for performance optimization
   */
  async optimizePerformance(target: string, currentMetrics: string): Promise<AgentResult> {
    return this.execute({
      task: 'optimization',
      description: `Optimize performance for ${target}. Current metrics: ${currentMetrics}`,
      technologies: ['React', 'TypeScript', 'Vite'],
      requirements: [
        'Improve Core Web Vitals scores',
        'Reduce bundle size',
        'Optimize rendering performance',
        'Implement code splitting',
        'Add performance monitoring',
        'Maintain functionality and aesthetics'
      ]
    });
  }
}