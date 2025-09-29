import { BaseAgent, type AgentInput, type AgentResult, type ExecutionContext } from '../base/BaseAgent.js';
import { Context7Service } from '../../core/Context7Service.js';
import { ModelRouter } from '../../core/ModelRouter.js';

export interface DocsTaskInput extends AgentInput {
  task: 'api-docs' | 'user-guide' | 'technical-docs' | 'readme' | 'architecture' | 'tutorial' | 'troubleshooting';
  description: string;
  audience: 'developers' | 'end-users' | 'system-admins' | 'stakeholders';
  format: 'markdown' | 'openapi' | 'jsdoc' | 'confluence' | 'gitbook';
  technologies?: string[];
  codeExamples?: boolean;
  interactiveElements?: boolean;
}

export class DocsAgent extends BaseAgent {
  readonly name = 'docs-agent';
  readonly version = '1.0.0';
  readonly description = 'Produces comprehensive technical documentation tailored to multiple audiences and formats.';
  private context7: Context7Service;
  private modelRouter: ModelRouter;

  constructor() {
    super();
    this.modelRouter = new ModelRouter();
    this.context7 = new Context7Service(this.modelRouter);
  }

  async executeCore(input: AgentInput, _context: ExecutionContext): Promise<AgentResult> {
    if (!this.isValidInput(input)) {
      return {
        kind: 'error',
        code: 'invalid_docs_input',
        message: 'Documentation agent requires task, description, audience, and format.',
        category: 'validation',
        retryable: false
      };
    }

    const startTime = Date.now();

    try {
      const {
        task,
        description,
        audience,
        format,
        technologies = [],
        codeExamples = true,
        interactiveElements = false
      } = input;

      console.log('🔍 Starting Context7 research phase for documentation...');
      const research = await this.context7.researchBestPractices(
        'Technical Documentation',
        `${task} for ${audience}`,
        'frontend'
      );

      console.log('🧠 Applying sequential thinking to documentation strategy...');
      const thinking = await this.context7.sequentialThinking(
        `Create comprehensive ${task} documentation for ${audience}: ${description}`,
        'technical-documentation'
      );

      const audienceAnalysis = await this.generateAudienceAnalysis(audience, task, technologies);
      const contentStructure = await this.generateContentStructure(task, audience, description, technologies);

      const implementationPrompt = this.generateImplementationPrompt(
        task,
        description,
        audience,
        format,
        technologies,
        research,
        thinking,
        audienceAnalysis,
        contentStructure,
        codeExamples,
        interactiveElements
      );

      const response = await this.modelRouter.execute('documentation', implementationPrompt, {
        systemPrompt: this.getSystemPrompt(),
        maxTokens: 4000,
        temperature: 0.4
      });

      const supplementaryMaterials = await this.generateSupplementaryMaterials(
        task,
        audience,
        technologies,
        codeExamples
      );

      return {
        kind: 'ok',
        data: {
          documentation: response.content,
          research,
          thinking: thinking.finalRecommendation,
          audienceAnalysis,
          contentStructure,
          supplementaryMaterials,
          metadata: {
            task,
            audience,
            format,
            technologies,
            codeExamples,
            interactiveElements,
            wordCount: response.content.split(' ').length,
            executionTime: Date.now() - startTime
          }
        }
      };
    } catch (error) {
      return {
        kind: 'error',
        code: 'docs_execution_failed',
        message: `Documentation agent execution failed: ${error instanceof Error ? error.message : String(error)}`,
        category: 'execution',
        retryable: true,
        metadata: {
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }

  private isValidInput(input: AgentInput): input is DocsTaskInput {
    const payload = input as Partial<DocsTaskInput>;
    return (
      typeof payload.task === 'string' &&
      typeof payload.description === 'string' &&
      typeof payload.audience === 'string' &&
      typeof payload.format === 'string'
    );
  }

  private generateImplementationPrompt(
    task: string,
    description: string,
    audience: string,
    format: string,
    technologies: string[],
    research: any,
    thinking: any,
    audienceAnalysis: string,
    contentStructure: string,
    codeExamples: boolean,
    interactiveElements: boolean
  ): string {
    return `
# Documentation Creation Task

## Task Type: ${task.toUpperCase()}
## Description: ${description}
## Target Audience: ${audience}
## Format: ${format}
## Technologies: ${technologies.join(', ')}

## Context7 Research Findings:
**Best Practices:**
${research.bestPractices.map((bp: string) => `- ${bp}`).join('\n')}

**Common Pitfalls to Avoid:**
${research.commonPitfalls.map((cp: string) => `- ${cp}`).join('\n')}

## Sequential Thinking Analysis:
${thinking.finalRecommendation}

## Audience Analysis:
${audienceAnalysis}

## Content Structure:
${contentStructure}

## Documentation Guidelines:

### MANDATORY Requirements:
1. **Clarity**: Write in clear, concise language appropriate for the audience
2. **Accuracy**: Ensure all technical information is correct and up-to-date
3. **Completeness**: Cover all necessary topics without overwhelming detail
4. **Usability**: Structure content for easy navigation and quick reference
5. **Accessibility**: Use inclusive language and accessible formatting
6. **Maintainability**: Create content that can be easily updated
7. **Searchability**: Use descriptive headings and keywords

### Content Structure Requirements:
1. Clear table of contents
2. Executive summary (for stakeholders)
3. Quick start guide (for developers)
4. Detailed sections with examples
5. Troubleshooting section
6. Glossary of terms
7. References and links

### Writing Style Guidelines:
1. Use active voice where possible
2. Write in second person for instructions ("you should...")
3. Use consistent terminology throughout
4. Include cross-references between sections
5. Provide context before diving into details
6. Use bullet points and numbered lists for clarity

### Code Examples (${codeExamples ? 'REQUIRED' : 'OPTIONAL'}):
${codeExamples ? `
1. Include practical, working code examples
2. Add comments explaining key concepts
3. Show both basic and advanced usage patterns
4. Include error handling examples
5. Provide complete, runnable examples
6. Use consistent code formatting and style
` : 'Include minimal code references as needed'}

### Interactive Elements (${interactiveElements ? 'REQUIRED' : 'NOT NEEDED'}):
${interactiveElements ? `
1. Add interactive code playground links
2. Include decision trees or flowcharts
3. Provide interactive tutorials
4. Add collapsible sections for detailed information
5. Include interactive API explorers
` : 'Focus on static content with clear navigation'}

### Format-Specific Requirements (${format}):
${this.getFormatSpecificRequirements(format)}

Please create comprehensive, professional documentation that follows these guidelines and incorporates the Context7 research findings.

The documentation should be:
- Immediately useful to the target audience
- Easy to navigate and search
- Professional and polished
- Technically accurate and complete
- Engaging and well-structured
`;
  }

  private getFormatSpecificRequirements(format: string): string {
    const requirements = {
      markdown: `
- Use proper Markdown syntax and formatting
- Include a clear heading hierarchy (H1, H2, H3)
- Add code blocks with syntax highlighting
- Use tables for structured data
- Include links and cross-references
- Add badges and status indicators where appropriate`,

      openapi: `
- Follow OpenAPI 3.0 specification exactly
- Include complete endpoint definitions
- Provide detailed parameter descriptions
- Add request/response examples
- Include error code documentation
- Use proper schema definitions`,

      jsdoc: `
- Use proper JSDoc syntax and tags
- Include @param, @returns, @throws documentation
- Add @example blocks with working code
- Use @see for cross-references
- Include @since version information
- Add @deprecated warnings where needed`,

      confluence: `
- Use Confluence-compatible markup
- Include page hierarchy and navigation
- Add macros for enhanced functionality
- Use proper spacing and formatting
- Include attachments and media references
- Add page metadata and labels`,

      gitbook: `
- Structure content with proper book organization
- Use GitBook-specific syntax and features
- Include interactive elements and embeds
- Add proper navigation and summary
- Use callouts and hints effectively
- Include search-friendly content structure`
    };

    return requirements[format as keyof typeof requirements] || requirements.markdown;
  }

  private async generateAudienceAnalysis(audience: string, task: string, technologies: string[]): Promise<string> {
    const analysisPrompt = `Analyze the documentation needs for ${audience} regarding ${task}.

Technologies involved: ${technologies.join(', ')}

Consider:
1. Technical expertise level
2. Primary use cases and goals
3. Time constraints and urgency
4. Preferred learning styles
5. Common pain points and questions
6. Success metrics and outcomes

Provide specific recommendations for content depth, technical detail level, and presentation style.`;

    const response = await this.modelRouter.execute(
      'research',
      analysisPrompt,
      {
        systemPrompt: 'You are a technical communication specialist analyzing audience needs.',
        maxTokens: 1000,
        temperature: 0.3
      }
    );

    return response.content;
  }

  private async generateContentStructure(task: string, audience: string, description: string, technologies: string[]): Promise<string> {
    const structurePrompt = `Design optimal content structure for ${task} documentation.

Audience: ${audience}
Description: ${description}
Technologies: ${technologies.join(', ')}

Create a detailed outline including:
1. Main sections and subsections
2. Recommended section ordering
3. Cross-references between sections
4. Appendices and supplementary content
5. Navigation structure
6. Entry points for different user journeys

Focus on logical flow and user experience.`;

    const response = await this.modelRouter.execute(
      'planning',
      structurePrompt,
      {
        systemPrompt: 'You are an information architect specializing in technical documentation.',
        maxTokens: 1500,
        temperature: 0.3
      }
    );

    return response.content;
  }

  private async generateSupplementaryMaterials(
    task: string,
    audience: string,
    technologies: string[],
    includeCode: boolean
  ): Promise<string> {
    const materialsPrompt = `Generate supplementary materials for ${task} documentation.

Audience: ${audience}
Technologies: ${technologies.join(', ')}
Include Code: ${includeCode}

Create:
1. Quick reference cards/cheat sheets
2. FAQ section with common questions
3. Troubleshooting guide
4. Glossary of terms
5. Additional resources and links
6. Version compatibility matrix
${includeCode ? '7. Code templates and boilerplates' : ''}

Focus on practical, immediately useful content.`;

    const response = await this.modelRouter.execute(
      'documentation',
      materialsPrompt,
      {
        systemPrompt: 'You are a documentation specialist creating comprehensive support materials.',
        maxTokens: 2000,
        temperature: 0.3
      }
    );

    return response.content;
  }

  private getSystemPrompt(): string {
    return `You are a senior technical writer specializing in comprehensive software documentation.

Your expertise includes:
- Technical writing and communication
- API documentation with OpenAPI specifications
- User experience documentation
- Developer guides and tutorials
- System architecture documentation
- Troubleshooting and support documentation

MANDATORY REQUIREMENTS:
1. Always use Context7 research findings in your documentation
2. Apply sequential thinking for complex documentation strategies
3. Tailor content specifically to the target audience
4. Use clear, concise, and accessible language
5. Include practical examples and use cases
6. Ensure technical accuracy and completeness
7. Structure content for easy navigation and search
8. Follow industry documentation standards
9. Include comprehensive cross-references
10. Make content maintainable and updatable

Your documentation should be immediately useful, professionally written, and follow best practices for technical communication.`;
  }

  /**
   * Specialized method for API documentation
   */
  async createAPIDocumentation(apiName: string, specifications: string): Promise<AgentResult> {
    return this.execute({
      task: 'api-docs',
      description: `Create comprehensive API documentation for ${apiName}: ${specifications}`,
      audience: 'developers',
      format: 'openapi',
      technologies: ['REST API', 'OpenAPI 3.0', 'Fastify', 'TypeScript'],
      codeExamples: true,
      interactiveElements: true
    });
  }

  /**
   * Specialized method for user guides
   */
  async createUserGuide(productName: string, specifications: string): Promise<AgentResult> {
    return this.execute({
      task: 'user-guide',
      description: `Create user guide for ${productName}: ${specifications}`,
      audience: 'end-users',
      format: 'markdown',
      technologies: ['Web Application', 'User Interface'],
      codeExamples: false,
      interactiveElements: true
    });
  }

  /**
   * Specialized method for technical architecture documentation
   */
  async createArchitectureDocumentation(systemName: string, specifications: string): Promise<AgentResult> {
    return this.execute({
      task: 'architecture',
      description: `Create architecture documentation for ${systemName}: ${specifications}`,
      audience: 'developers',
      format: 'markdown',
      technologies: ['System Architecture', 'Microservices', 'Database Design'],
      codeExamples: true,
      interactiveElements: false
    });
  }

  /**
   * Specialized method for troubleshooting guides
   */
  async createTroubleshootingGuide(systemName: string, commonIssues: string): Promise<AgentResult> {
    return this.execute({
      task: 'troubleshooting',
      description: `Create troubleshooting guide for ${systemName}. Common issues: ${commonIssues}`,
      audience: 'system-admins',
      format: 'markdown',
      technologies: ['System Administration', 'Debugging', 'Monitoring'],
      codeExamples: true,
      interactiveElements: false
    });
  }
}