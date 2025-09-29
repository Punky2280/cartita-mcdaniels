import { BaseAgent, type AgentInput, type AgentResult, type ExecutionContext } from '../base/BaseAgent.js';
import { ModelRouter } from '../../core/ModelRouter.js';

export class AdvancedResearchAgent extends BaseAgent {
  readonly name = 'AdvancedResearchAgent';
  readonly version = '1.0.0';
  readonly description = 'Conducts multi-model research synthesis with strategy generation.';
  private modelRouter: ModelRouter;

  constructor() {
    super();
    this.modelRouter = new ModelRouter();
  }

  async executeCore(input: AgentInput, _context: ExecutionContext): Promise<AgentResult> {
    const queryValue = (input as Record<string, unknown>)['query'];
    if (typeof queryValue !== 'string' || queryValue.trim().length === 0) {
      return {
        kind: 'error',
        code: 'invalid_query',
        message: 'Research query must be a non-empty string.',
        category: 'validation',
        retryable: false
      };
    }

    const query = queryValue.trim();

    try {
      const searchStrategies = await this.modelRouter.execute(
        'research',
        `Generate 3-5 different search strategies for researching: "${query}"`,
        {
          systemPrompt: 'You are a research strategist. Create diverse, comprehensive search approaches.',
          maxTokens: 500
        }
      );

      const synthesis = await this.modelRouter.execute(
        'research',
        `Based on these search strategies: ${searchStrategies.content}\n\nProvide a comprehensive research summary for: "${query}"`,
        {
          systemPrompt: 'You are a research analyst. Provide thorough, well-reasoned analysis.',
          maxTokens: 2000
        }
      );

      const totalTokensUsed =
        (searchStrategies.usage?.inputTokens ?? 0) +
        (searchStrategies.usage?.outputTokens ?? 0) +
        (synthesis.usage?.inputTokens ?? 0) +
        (synthesis.usage?.outputTokens ?? 0);

      const totalExecutionTime = (searchStrategies.executionTime ?? 0) + (synthesis.executionTime ?? 0);

      return {
        kind: 'ok',
        data: {
          query,
          searchStrategies: searchStrategies.content,
          analysis: synthesis.content,
          metadata: {
            totalTokensUsed,
            executionTime: totalExecutionTime
          }
        }
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

export class AdvancedCodeAgent extends BaseAgent {
  readonly name = 'AdvancedCodeAgent';
  readonly version = '1.0.0';
  readonly description = 'Delivers code generation, review, refactoring, and debugging workflows.';
  private modelRouter: ModelRouter;

  constructor() {
    super();
    this.modelRouter = new ModelRouter();
  }

  async executeCore(input: AgentInput, _context: ExecutionContext): Promise<AgentResult> {
    const payload = input as Partial<{
      task: 'generate' | 'review' | 'refactor' | 'debug';
      code: string;
      description: string;
    }>;

    const task = payload.task;
    if (!task) {
      return {
        kind: 'error',
        code: 'missing_task',
        message: 'Task type is required for code agent operations.',
        category: 'validation',
        retryable: false
      };
    }

    const description = typeof payload.description === 'string' ? payload.description.trim() : '';
    const code = typeof payload.code === 'string' ? payload.code : undefined;

    try {
      switch (task) {
        case 'generate':
          if (!description) {
            return {
              kind: 'error',
              code: 'missing_description',
              message: 'Description is required for code generation tasks.',
              category: 'validation',
              retryable: false
            };
          }
          return await this.generateCode(description);
        case 'review':
          if (!code) {
            return {
              kind: 'error',
              code: 'missing_code',
              message: 'Code is required for review tasks.',
              category: 'validation',
              retryable: false
            };
          }
          return await this.reviewCode(code);
        case 'refactor':
          if (!code || !description) {
            return {
              kind: 'error',
              code: 'invalid_refactor_input',
              message: 'Refactor tasks require both code and goals description.',
              category: 'validation',
              retryable: false
            };
          }
          return await this.refactorCode(code, description);
        case 'debug':
          if (!code || !description) {
            return {
              kind: 'error',
              code: 'invalid_debug_input',
              message: 'Debug tasks require both code and an error description.',
              category: 'validation',
              retryable: false
            };
          }
          return await this.debugCode(code, description);
        default:
          return {
            kind: 'error',
            code: 'invalid_task',
            message: `Unknown task: ${task}`,
            category: 'validation',
            retryable: false
          };
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private async generateCode(description: string): Promise<AgentResult> {
    // Use OpenAI for initial code generation (better at structured output)
    const generation = await this.modelRouter.execute(
      'code-generation',
      description,
      {
        systemPrompt: 'Generate clean, well-documented TypeScript code with proper error handling.',
        maxTokens: 1500
      }
    );

    // Use Claude for review and improvements
    const review = await this.modelRouter.execute(
      'code-review',
      `Review and improve this generated code:\n\n${generation.content}`,
      {
        systemPrompt: 'Review code for best practices, security, and potential improvements.',
        maxTokens: 1000
      }
    );

    return {
      kind: 'ok',
      data: {
        originalCode: generation.content,
        reviewedCode: review.content,
        generatedBy: generation.provider,
        reviewedBy: review.provider
      }
    };
  }

  private async reviewCode(code: string): Promise<AgentResult> {
    // Comprehensive multi-model review
    const [securityReview, performanceReview, styleReview] = await Promise.all([
      this.modelRouter.execute('code-analysis', `Security review:\n${code}`, {
        systemPrompt: 'Focus on security vulnerabilities, input validation, and potential exploits.'
      }),
      this.modelRouter.execute('optimization', `Performance analysis:\n${code}`, {
        systemPrompt: 'Analyze for performance bottlenecks and optimization opportunities.'
      }),
      this.modelRouter.execute('code-analysis', `Code style review:\n${code}`, {
        systemPrompt: 'Review for code style, maintainability, and best practices.'
      })
    ]);

    // Synthesize all reviews
    const synthesis = await this.modelRouter.execute(
      'documentation',
      `Synthesize these code reviews into a comprehensive report:
      Security: ${securityReview.content}
      Performance: ${performanceReview.content}
      Style: ${styleReview.content}`,
      {
        systemPrompt: 'Create a comprehensive, actionable code review report.',
        maxTokens: 2000
      }
    );

    return {
      kind: 'ok',
      data: {
        securityReview: securityReview.content,
        performanceReview: performanceReview.content,
        styleReview: styleReview.content,
        comprehensiveReport: synthesis.content
      }
    };
  }

  private async refactorCode(code: string, goals: string): Promise<AgentResult> {
    // Use Claude for analysis and planning
    const plan = await this.modelRouter.execute(
      'planning',
      `Create a refactoring plan for this code to achieve: ${goals}\n\nCode:\n${code}`,
      {
        systemPrompt: 'Create detailed, step-by-step refactoring plans.',
        maxTokens: 1000
      }
    );

    // Use OpenAI for implementation
    const refactored = await this.modelRouter.execute(
      'code-generation',
      `Implement this refactoring plan:\n${plan.content}\n\nOriginal code:\n${code}`,
      {
        systemPrompt: 'Implement refactoring while preserving functionality.',
        maxTokens: 2000
      }
    );

    return {
      kind: 'ok',
      data: {
        originalCode: code,
        refactoringPlan: plan.content,
        refactoredCode: refactored.content,
        goals
      }
    };
  }

  private async debugCode(code: string, errorDescription: string): Promise<AgentResult> {
    // Use Claude for diagnosis (better reasoning)
    const diagnosis = await this.modelRouter.execute(
      'debugging',
      `Diagnose this error:\n${errorDescription}\n\nCode:\n${code}`,
      {
        systemPrompt: 'Provide detailed error diagnosis with root cause analysis.',
        maxTokens: 1000
      }
    );

    // Use OpenAI for fix generation (better at structured solutions)
    const fixes = await this.modelRouter.execute(
      'code-generation',
      `Based on this diagnosis, provide fixes:\n${diagnosis.content}\n\nCode:\n${code}`,
      {
        systemPrompt: 'Generate multiple fix options with explanations.',
        maxTokens: 1500
      }
    );

    return {
      kind: 'ok',
      data: {
        errorDescription,
        diagnosis: diagnosis.content,
        suggestedFixes: fixes.content,
        originalCode: code
      }
    };
  }
}

export class AdvancedKnowledgeAgent extends BaseAgent {
  readonly name = 'AdvancedKnowledgeAgent';
  readonly version = '1.0.0';
  readonly description = 'Delivers knowledge expansion, synthesis, and structured responses.';
  private modelRouter: ModelRouter;

  constructor() {
    super();
    this.modelRouter = new ModelRouter();
  }

  async executeCore(input: AgentInput, _context: ExecutionContext): Promise<AgentResult> {
    const payload = input as Partial<{
      query: string;
      context: string;
      requireSources: boolean;
    }>;

    const query = typeof payload.query === 'string' ? payload.query.trim() : '';
    if (!query) {
      return {
        kind: 'error',
        code: 'invalid_query',
        message: 'Knowledge queries must include a non-empty query string.',
        category: 'validation',
        retryable: false
      };
    }

    const contextValue = typeof payload.context === 'string' ? payload.context : undefined;

    try {
      const expandedQuery = await this.modelRouter.execute(
        'research',
        `Expand and analyze this knowledge query: "${query}"\nContext: ${contextValue ?? 'None'}`,
        {
          systemPrompt: 'Expand queries to find comprehensive information and identify key concepts.',
          maxTokens: 500
        }
      );

      const knowledge = await this.modelRouter.execute(
        'research',
        `Provide comprehensive information based on this expanded query:\n${expandedQuery.content}`,
        {
          systemPrompt: 'Provide accurate, well-sourced information with clear explanations.',
          maxTokens: 2000
        }
      );

      const structuredResponse = await this.modelRouter.execute(
        'documentation',
        `Structure this knowledge into a well-organized response:\n${knowledge.content}`,
        {
          systemPrompt: 'Create clear, well-structured knowledge responses with headings and bullet points.',
          maxTokens: 1500
        }
      );

      const totalTokens = [expandedQuery, knowledge, structuredResponse].reduce((sum, resp) => {
        return (
          sum +
          (resp.usage?.inputTokens ?? 0) +
          (resp.usage?.outputTokens ?? 0)
        );
      }, 0);

      return {
        kind: 'ok',
        data: {
          originalQuery: query,
          expandedQuery: expandedQuery.content,
          rawKnowledge: knowledge.content,
          structuredResponse: structuredResponse.content,
          metadata: {
            processingSteps: 3,
            totalTokens
          }
        }
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

export class AdvancedDocumentationAgent extends BaseAgent {
  readonly name = 'AdvancedDocumentationAgent';
  readonly version = '1.0.0';
  readonly description = 'Produces API docs, READMEs, tutorials, and references with multi-model synthesis.';
  private modelRouter: ModelRouter;

  constructor() {
    super();
    this.modelRouter = new ModelRouter();
  }

  async executeCore(input: AgentInput, _context: ExecutionContext): Promise<AgentResult> {
    const payload = input as Partial<{
      type: 'api' | 'readme' | 'tutorial' | 'reference';
      content: string;
      style: 'technical' | 'beginner' | 'comprehensive';
    }>;

    const type = payload.type;
    if (!type) {
      return {
        kind: 'error',
        code: 'missing_type',
        message: 'Documentation tasks must specify a type (api, readme, tutorial, reference).',
        category: 'validation',
        retryable: false
      };
    }

    const content = typeof payload.content === 'string' ? payload.content.trim() : '';
    if (!content) {
      return {
        kind: 'error',
        code: 'missing_content',
        message: 'Documentation tasks must include content to document.',
        category: 'validation',
        retryable: false
      };
    }

    const style = payload.style ?? (type === 'tutorial' ? 'beginner' : type === 'readme' ? 'comprehensive' : 'technical');

    try {
      switch (type) {
        case 'api':
          return await this.generateAPIDocumentation(content, style);
        case 'readme':
          return await this.generateREADME(content, style);
        case 'tutorial':
          return await this.generateTutorial(content, style);
        case 'reference':
          return await this.generateReference(content, style);
        default:
          return {
            kind: 'error',
            code: 'invalid_doc_type',
            message: `Unknown documentation type: ${type}`,
            category: 'validation',
            retryable: false
          };
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private async generateAPIDocumentation(content: string, style = 'technical'): Promise<AgentResult> {
    // Use OpenAI for structured API extraction
    const apiStructure = await this.modelRouter.execute(
      'structured-data',
      `Extract API structure from this code:\n${content}`,
      {
        systemPrompt: 'Extract endpoints, parameters, responses, and examples in structured format.',
        maxTokens: 1500
      }
    );

    // Use Claude for comprehensive documentation
    const documentation = await this.modelRouter.execute(
      'documentation',
      `Create comprehensive API documentation in ${style} style:\n${apiStructure.content}`,
      {
        systemPrompt: 'Write clear, comprehensive API documentation with examples and use cases.',
        maxTokens: 2500
      }
    );

    return {
      kind: 'ok',
      data: {
        type: 'api',
        apiStructure: apiStructure.content,
        documentation: documentation.content,
        style
      }
    };
  }

  private async generateREADME(content: string, style = 'comprehensive'): Promise<AgentResult> {
    // Analyze project structure and purpose
    const analysis = await this.modelRouter.execute(
      'planning',
      `Analyze this project and identify key features for README:\n${content}`,
      {
        systemPrompt: 'Identify project purpose, key features, and user needs for documentation.',
        maxTokens: 1000
      }
    );

    // Generate comprehensive README
    const readme = await this.modelRouter.execute(
      'documentation',
      `Create a comprehensive README.md based on this analysis:\n${analysis.content}`,
      {
        systemPrompt: 'Write engaging, informative README files with proper structure and examples.',
        maxTokens: 2500
      }
    );

    return {
      kind: 'ok',
      data: {
        type: 'readme',
        analysis: analysis.content,
        readme: readme.content,
        style
      }
    };
  }

  private async generateTutorial(content: string, style = 'beginner'): Promise<AgentResult> {
    // Create tutorial structure
    const structure = await this.modelRouter.execute(
      'planning',
      `Create a step-by-step tutorial structure for: ${content}`,
      {
        systemPrompt: 'Design progressive learning paths with clear steps and examples.',
        maxTokens: 1000
      }
    );

    // Generate detailed tutorial
    const tutorial = await this.modelRouter.execute(
      'documentation',
      `Write a detailed tutorial following this structure:\n${structure.content}`,
      {
        systemPrompt: `Write ${style}-friendly tutorials with clear explanations and practical examples.`,
        maxTokens: 3000
      }
    );

    return {
      kind: 'ok',
      data: {
        type: 'tutorial',
        structure: structure.content,
        tutorial: tutorial.content,
        style
      }
    };
  }

  private async generateReference(content: string, style = 'technical'): Promise<AgentResult> {
    // Extract reference information
    const reference = await this.modelRouter.execute(
      'documentation',
      `Create technical reference documentation for:\n${content}`,
      {
        systemPrompt: 'Create comprehensive reference documentation with all details and specifications.',
        maxTokens: 2500
      }
    );

    return {
      kind: 'ok',
      data: {
        type: 'reference',
        reference: reference.content,
        style
      }
    };
  }
}