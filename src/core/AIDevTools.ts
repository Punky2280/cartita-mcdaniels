import { ModelRouter, } from './ModelRouter.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';

export interface CodeGenerationRequest {
  type: 'schema' | 'route' | 'test' | 'component' | 'function' | 'class' | 'migration';
  description: string;
  context?: {
    framework?: string;
    language?: 'typescript' | 'javascript' | 'python';
    style?: 'functional' | 'class-based';
    testing?: 'vitest' | 'jest' | 'mocha';
  };
  outputPath?: string;
  dependencies?: string[];
}

export interface CodeAnalysisResult {
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    type: 'bug' | 'security' | 'performance' | 'style' | 'maintainability';
    message: string;
    line?: number;
    column?: number;
    suggestion?: string;
  }>;
  metrics: {
    complexity: number;
    maintainability: number;
    testCoverage?: number;
  };
  suggestions: string[];
}

export class AIDevTools {
  private modelRouter: ModelRouter;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.modelRouter = new ModelRouter();
    this.projectRoot = projectRoot;
  }

  /**
   * Automatically generate TypeScript schemas from descriptions
   */
  async generateSchema(description: string, outputPath?: string): Promise<string> {
    const prompt = `
Generate a TypeScript schema using @sinclair/typebox based on this description:
${description}

Requirements:
- Use Type.Object, Type.String, Type.Number, etc. from @sinclair/typebox
- Include proper validation constraints
- Add JSDoc comments
- Export both the schema and the type
- Follow the existing pattern in the project

Example format:
\`\`\`typescript
import { Type, Static } from '@sinclair/typebox';

/**
 * Schema description
 */
export const ExampleSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  createdAt: Type.String({ format: 'date-time' })
});

export type Example = Static<typeof ExampleSchema>;
\`\`\`

Generate only the schema code:`;

    const response = await this.modelRouter.execute('code-generation', prompt, {
      systemPrompt: 'You are an expert TypeScript developer. Generate clean, well-documented schemas.',
      maxTokens: 1000,
      temperature: 0.3
    });

    const code = this.extractCode(response.content);

    if (outputPath) {
      await this.saveGeneratedCode(code, outputPath);
    }

    return code;
  }

  /**
   * Generate Fastify routes from API specifications
   */
  async generateRoute(description: string, outputPath?: string): Promise<string> {
    const prompt = `
Generate a Fastify route handler based on this description:
${description}

Requirements:
- Use FastifyPluginAsync pattern
- Include proper TypeScript types
- Add OpenAPI schema definitions
- Include error handling
- Follow RESTful conventions
- Use the existing project patterns

Example structure:
\`\`\`typescript
import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const routeSchema = {
  description: 'Route description',
  tags: ['Tag'],
  body: Type.Object({...}),
  response: {
    200: Type.Object({...}),
    400: ErrorResponseSchema
  }
};

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', { schema: routeSchema }, async (request, reply) => {
    // Implementation
  });
};

export default routes;
\`\`\`

Generate the complete route code:`;

    const response = await this.modelRouter.execute('code-generation', prompt, {
      systemPrompt: 'You are an expert Fastify developer. Generate robust, well-structured routes.',
      maxTokens: 1500,
      temperature: 0.3
    });

    const code = this.extractCode(response.content);

    if (outputPath) {
      await this.saveGeneratedCode(code, outputPath);
    }

    return code;
  }

  /**
   * Generate comprehensive test cases for functions/classes
   */
  async generateTests(codeFilePath: string, outputPath?: string): Promise<string> {
    const code = await readFile(codeFilePath, 'utf-8');
    
    const prompt = `
Generate comprehensive test cases using Vitest for this TypeScript code:

\`\`\`typescript
${code}
\`\`\`

Requirements:
- Use Vitest (describe, it, expect, vi.mock, etc.)
- Test all public methods/functions
- Include edge cases and error scenarios
- Test both success and failure paths
- Use proper TypeScript types
- Mock external dependencies appropriately
- Include setup/teardown if needed

Generate complete test file:`;

    const response = await this.modelRouter.execute('testing', prompt, {
      systemPrompt: 'You are an expert in test-driven development. Generate thorough, maintainable tests.',
      maxTokens: 2000,
      temperature: 0.3
    });

    const testCode = this.extractCode(response.content);

    if (outputPath) {
      await this.saveGeneratedCode(testCode, outputPath);
    } else {
      // Auto-generate test file path
      const testPath = codeFilePath.replace(/\.(ts|js)$/, '.test.$1');
      await this.saveGeneratedCode(testCode, testPath);
    }

    return testCode;
  }

  /**
   * Comprehensive code analysis and suggestions
   */
  async analyzeCode(filePath: string): Promise<CodeAnalysisResult> {
    const code = await readFile(filePath, 'utf-8');
    
    const analysisPrompt = `
Analyze this TypeScript code for issues and improvements:

\`\`\`typescript
${code}
\`\`\`

Provide analysis in this JSON format:
{
  "issues": [
    {
      "severity": "error|warning|info",
      "type": "bug|security|performance|style|maintainability", 
      "message": "Description of the issue",
      "line": 10,
      "suggestion": "How to fix it"
    }
  ],
  "metrics": {
    "complexity": 5,
    "maintainability": 8
  },
  "suggestions": ["General improvement suggestions"]
}

Focus on:
- Potential bugs and logic errors
- Security vulnerabilities
- Performance issues
- Code style and maintainability
- TypeScript best practices
- Unused imports/variables`;

    const response = await this.modelRouter.execute('code-analysis', analysisPrompt, {
      systemPrompt: 'You are an expert code reviewer. Provide detailed, actionable analysis.',
      maxTokens: 2000,
      temperature: 0.3
    });

    try {
      return JSON.parse(response.content);
    } catch (_error) {
      // Fallback if JSON parsing fails
      return {
        issues: [{
          severity: 'info' as const,
          type: 'maintainability' as const,
          message: 'Could not parse analysis results',
          suggestion: 'Review code manually'
        }],
        metrics: {
          complexity: 5,
          maintainability: 7
        },
        suggestions: ['Review the code analysis response manually']
      };
    }
  }

  /**
   * Intelligent code refactoring suggestions
   */
  async suggestRefactoring(filePath: string): Promise<{
    suggestions: Array<{
      type: 'extract-function' | 'reduce-complexity' | 'improve-naming' | 'add-types' | 'optimize-performance';
      description: string;
      before: string;
      after: string;
      reasoning: string;
    }>;
  }> {
    const code = await readFile(filePath, 'utf-8');
    
    const prompt = `
Analyze this code and suggest specific refactoring improvements:

\`\`\`typescript
${code}
\`\`\`

Provide suggestions in JSON format:
{
  "suggestions": [
    {
      "type": "extract-function|reduce-complexity|improve-naming|add-types|optimize-performance",
      "description": "Brief description of the refactoring",
      "before": "Original code snippet",
      "after": "Improved code snippet", 
      "reasoning": "Why this improvement is beneficial"
    }
  ]
}

Focus on:
- Extracting reusable functions
- Reducing cyclomatic complexity
- Improving variable/function names
- Adding missing TypeScript types
- Performance optimizations`;

    const response = await this.modelRouter.execute('optimization', prompt, {
      systemPrompt: 'You are an expert at code refactoring. Suggest practical, beneficial improvements.',
      maxTokens: 2000,
      temperature: 0.3
    });

    try {
      return JSON.parse(response.content);
    } catch (_error) {
      return { suggestions: [] };
    }
  }

  /**
   * Generate documentation from code
   */
  async generateDocumentation(filePath: string, type: 'api' | 'readme' | 'jsdoc' = 'jsdoc'): Promise<string> {
    const code = await readFile(filePath, 'utf-8');
    
    let prompt = '';
    
    switch (type) {
      case 'api':
        prompt = `Generate API documentation in Markdown format for this code:\n\n${code}\n\nInclude endpoints, parameters, responses, and examples.`;
        break;
      case 'readme':
        prompt = `Generate a comprehensive README.md for this code:\n\n${code}\n\nInclude installation, usage, examples, and API reference.`;
        break;
      case 'jsdoc':
        prompt = `Add comprehensive JSDoc comments to this TypeScript code:\n\n${code}\n\nReturn the code with added documentation comments.`;
        break;
    }

    const response = await this.modelRouter.execute('documentation', prompt, {
      systemPrompt: 'You are a technical writer. Create clear, comprehensive documentation.',
      maxTokens: 2000,
      temperature: 0.3
    });

    return response.content;
  }

  /**
   * Automated bug fix suggestions
   */
  async suggestBugFixes(errorMessage: string, codeContext: string): Promise<{
    diagnosis: string;
    fixes: Array<{
      description: string;
      code: string;
      confidence: number;
    }>;
  }> {
    const prompt = `
Debug this error and suggest fixes:

Error: ${errorMessage}

Code context:
\`\`\`typescript
${codeContext}
\`\`\`

Provide response in JSON format:
{
  "diagnosis": "Explanation of what's causing the error",
  "fixes": [
    {
      "description": "What this fix does",
      "code": "Fixed code snippet",
      "confidence": 0.9
    }
  ]
}`;

    const response = await this.modelRouter.execute('debugging', prompt, {
      systemPrompt: 'You are an expert debugger. Provide accurate diagnosis and practical fixes.',
      maxTokens: 1500,
      temperature: 0.3
    });

    try {
      return JSON.parse(response.content);
    } catch (_error) {
      return {
        diagnosis: 'Could not analyze the error',
        fixes: []
      };
    }
  }

  /**
   * Generate database migration from schema changes
   */
  async generateMigration(description: string, outputPath?: string): Promise<string> {
    const prompt = `
Generate a Drizzle ORM migration SQL based on this description:
${description}

Requirements:
- Use proper PostgreSQL syntax
- Include CREATE, ALTER, DROP statements as needed
- Add proper indexes and constraints
- Include rollback statements in comments
- Follow the existing migration pattern

Generate the SQL migration:`;

    const response = await this.modelRouter.execute('code-generation', prompt, {
      systemPrompt: 'You are a database expert. Generate safe, efficient migrations.',
      maxTokens: 1000,
      temperature: 0.3
    });

    const migrationCode = this.extractCode(response.content);

    if (outputPath) {
      await this.saveGeneratedCode(migrationCode, outputPath);
    }

    return migrationCode;
  }

  private extractCode(response: string): string {
    // Extract code from markdown code blocks
    const codeBlockRegex = /```(?:typescript|javascript|ts|js|sql)?\n?([\s\S]*?)\n?```/;
    const match = response.match(codeBlockRegex);
    return match ? match[1].trim() : response.trim();
  }

  private async saveGeneratedCode(code: string, outputPath: string): Promise<void> {
    const fullPath = join(this.projectRoot, outputPath);
    const dir = dirname(fullPath);
    
    // Ensure directory exists
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(fullPath, code, 'utf-8');
  }

  /**
   * Batch process multiple files
   */
  async batchAnalyze(filePaths: string[]): Promise<{
    [filePath: string]: CodeAnalysisResult;
  }> {
    const results: { [filePath: string]: CodeAnalysisResult } = {};
    
    for (const filePath of filePaths) {
      try {
        results[filePath] = await this.analyzeCode(filePath);
      } catch (error) {
        results[filePath] = {
          issues: [{
            severity: 'error' as const,
            type: 'bug' as const,
            message: `Failed to analyze: ${error}`,
            suggestion: 'Check file path and permissions'
          }],
          metrics: { complexity: 0, maintainability: 0 },
          suggestions: []
        };
      }
    }

    return results;
  }
}

// Export singleton instance
export const aiDevTools = new AIDevTools();