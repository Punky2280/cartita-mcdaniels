import { BaseAgent, type AgentInput, type AgentResult, type ExecutionContext } from '../base/BaseAgent.js';
import { Context7Service } from '../../core/Context7Service.js';
import { ModelRouter } from '../../core/ModelRouter.js';

export interface APITaskInput extends AgentInput {
  task: 'endpoint' | 'middleware' | 'validation' | 'auth' | 'database' | 'testing' | 'documentation';
  description: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint?: string;
  technologies?: string[];
  requirements?: string[];
  securityLevel?: 'public' | 'authenticated' | 'admin';
}

export class APIAgent extends BaseAgent {
  readonly name = 'api-agent';
  readonly version = '1.0.0';
  readonly description = 'Designs and implements backend APIs with security, testing, and documentation workflows.';
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
        code: 'invalid_api_input',
        message: 'API agent requires task, description, and valid configuration.',
        category: 'validation',
        retryable: false
      };
    }

    const startTime = Date.now();

    try {
      const {
        task,
        description,
        httpMethod = 'GET',
        endpoint = '',
        technologies = ['Fastify', 'TypeScript', 'Drizzle ORM', 'PostgreSQL'],
        requirements = [],
        securityLevel = 'authenticated'
      } = input;

      console.log('🔍 Starting Context7 research phase for API development...');
      const research = await this.context7.researchBestPractices(
        technologies.join(', '),
        `${task} development`,
        'backend'
      );

      console.log('🧠 Applying sequential thinking to API architecture...');
      const thinking = await this.context7.sequentialThinking(
        `Design ${task} for: ${description} (${httpMethod} ${endpoint})`,
        'backend-api-fastify'
      );

      const securityAnalysis = await this.generateSecurityAnalysis(task, securityLevel, technologies);

      const implementationPrompt = this.generateImplementationPrompt(
        task,
        description,
        httpMethod,
        endpoint,
        technologies,
        requirements,
        research,
        thinking,
        securityLevel,
        securityAnalysis
      );

      const response = await this.modelRouter.execute('code-generation', implementationPrompt, {
        systemPrompt: this.getSystemPrompt(),
        maxTokens: 4000,
        temperature: 0.3
      });

      const apiDocumentation = await this.generateOpenAPIDocumentation(
        task,
        description,
        httpMethod,
        endpoint,
        securityLevel
      );

      const testingStrategy = await this.generateTestingStrategy(task, description, httpMethod, endpoint);

      return {
        kind: 'ok',
        data: {
          implementation: response.content,
          research,
          thinking: thinking.finalRecommendation,
          securityAnalysis,
          apiDocumentation,
          testingStrategy,
          metadata: {
            task,
            httpMethod,
            endpoint,
            securityLevel,
            technologies,
            executionTime: Date.now() - startTime
          }
        }
      };
    } catch (error) {
      return {
        kind: 'error',
        code: 'api_execution_failed',
        message: `API agent execution failed: ${error instanceof Error ? error.message : String(error)}`,
        category: 'execution',
        retryable: true,
        metadata: {
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }

  private isValidInput(input: AgentInput): input is APITaskInput {
    if (typeof (input as Partial<APITaskInput>).task !== 'string') {
      return false;
    }

    if (typeof (input as Partial<APITaskInput>).description !== 'string') {
      return false;
    }

    return true;
  }

  private generateImplementationPrompt(
    task: string,
    description: string,
    httpMethod: string,
    endpoint: string,
    technologies: string[],
    requirements: string[],
    research: any,
    thinking: any,
    securityLevel: string,
    securityAnalysis: string
  ): string {
    return `
# API Development Task

## Task Type: ${task.toUpperCase()}
## Description: ${description}
## HTTP Method: ${httpMethod}
## Endpoint: ${endpoint}
## Security Level: ${securityLevel}

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

## Security Analysis:
${securityAnalysis}

## Technology Stack:
${technologies.map((tech: string) => `- ${tech}`).join('\n')}

## Requirements:
${requirements.map((req: string) => `- ${req}`).join('\n')}

## Implementation Guidelines:

### MANDATORY Requirements:
1. **TypeScript**: Use strict typing with proper interfaces
2. **Validation**: Use Zod schemas for all input validation
3. **Security**: Implement OWASP Top 10 protections
4. **Error Handling**: Comprehensive error responses with proper HTTP status codes
5. **Logging**: Structured logging with request tracing
6. **Performance**: Optimize database queries and response times
7. **Testing**: Include unit and integration test considerations
8. **Documentation**: OpenAPI 3.0 compliant documentation

### Code Structure:
1. Create modular route handlers
2. Implement proper middleware chain
3. Use TypeScript interfaces for all data structures
4. Follow RESTful API design principles
5. Add comprehensive JSDoc comments

### Security Requirements:
1. Input validation and sanitization
2. Rate limiting implementation
3. Authentication and authorization
4. CORS configuration
5. Security headers (helmet)
6. SQL injection prevention
7. XSS protection

### Performance Requirements:
1. Database query optimization
2. Response caching strategies
3. Connection pooling
4. Request/response compression
5. Monitoring and metrics collection

Please provide complete, production-ready code that follows these guidelines and incorporates the Context7 research findings.

Include:
1. Route handler implementation
2. TypeScript interfaces and schemas
3. Middleware functions
4. Error handling
5. Validation logic
6. Security implementations
7. Database operations (if applicable)
8. Comments explaining key decisions
`;
  }

  private async generateSecurityAnalysis(task: string, securityLevel: string, technologies: string[]): Promise<string> {
    const securityPrompt = `Analyze security requirements for ${task} with ${securityLevel} security level.

Technologies: ${technologies.join(', ')}

Consider:
1. Authentication requirements
2. Authorization patterns
3. Input validation needs
4. Rate limiting strategies
5. Data protection requirements
6. OWASP Top 10 vulnerabilities
7. API security best practices

Provide specific security recommendations for this implementation.`;

    const response = await this.modelRouter.execute(
      'code-analysis',
      securityPrompt,
      {
        systemPrompt: 'You are a security specialist focused on API security and OWASP best practices.',
        maxTokens: 1500,
        temperature: 0.2
      }
    );

    return response.content;
  }

  private async generateOpenAPIDocumentation(
    task: string,
    description: string,
    httpMethod: string,
    endpoint: string,
    securityLevel: string
  ): Promise<string> {
    const docPrompt = `Generate OpenAPI 3.0 documentation for:

Task: ${task}
Description: ${description}
Method: ${httpMethod}
Endpoint: ${endpoint}
Security: ${securityLevel}

Include:
1. Complete endpoint specification
2. Request/response schemas
3. Error response definitions
4. Security requirements
5. Example requests/responses
6. Parameter descriptions

Format as valid OpenAPI 3.0 YAML.`;

    const response = await this.modelRouter.execute(
      'documentation',
      docPrompt,
      {
        systemPrompt: 'You are an API documentation specialist creating comprehensive OpenAPI specifications.',
        maxTokens: 2000,
        temperature: 0.2
      }
    );

    return response.content;
  }

  private async generateTestingStrategy(
    task: string,
    description: string,
    httpMethod: string,
    endpoint: string
  ): Promise<string> {
    const testingPrompt = `Generate comprehensive testing strategy for API ${task}: ${description}

Method: ${httpMethod}
Endpoint: ${endpoint}

Include:
1. Unit tests for business logic
2. Integration tests for endpoints
3. Security testing scenarios
4. Performance testing considerations
5. Error handling test cases
6. Data validation testing
7. Authentication/authorization tests

Focus on practical, implementable test cases using Vitest and Supertest.`;

    const response = await this.modelRouter.execute(
      'code-generation',
      testingPrompt,
      {
        systemPrompt: 'You are a testing specialist focused on comprehensive API testing strategies.',
        maxTokens: 2000,
        temperature: 0.2
      }
    );

    return response.content;
  }

  private getSystemPrompt(): string {
    return `You are a senior backend developer specializing in API development with Fastify, TypeScript, and modern backend architectures.

Your expertise includes:
- RESTful API design and implementation
- Fastify framework with TypeScript
- Database design and optimization with Drizzle ORM
- Authentication and authorization patterns
- Input validation and security best practices
- Performance optimization and caching strategies
- API documentation with OpenAPI 3.0
- Comprehensive testing strategies

MANDATORY REQUIREMENTS:
1. Always use Context7 research findings in your implementations
2. Apply sequential thinking for complex architectural decisions
3. Implement OWASP Top 10 security protections
4. Use TypeScript with strict typing (no 'any' types)
5. Validate all inputs with Zod schemas
6. Implement comprehensive error handling
7. Follow RESTful design principles
8. Optimize for performance and scalability
9. Include proper logging and monitoring
10. Generate OpenAPI documentation

Your code should be production-ready, secure, well-documented, and follow industry best practices.`;
  }

  /**
   * Specialized method for creating CRUD endpoints
   */
  async createCRUDEndpoints(entity: string, specifications: string): Promise<AgentResult> {
    return this.execute({
      task: 'endpoint',
      description: `Create complete CRUD endpoints for ${entity}: ${specifications}`,
      technologies: ['Fastify', 'TypeScript', 'Drizzle ORM', 'PostgreSQL', 'Zod'],
      requirements: [
        'Implement all CRUD operations (Create, Read, Update, Delete)',
        'Add comprehensive input validation',
        'Include pagination for list endpoints',
        'Implement proper error handling',
        'Add authentication and authorization',
        'Generate OpenAPI documentation',
        'Include unit and integration tests'
      ],
      securityLevel: 'authenticated'
    });
  }

  /**
   * Specialized method for authentication system
   */
  async createAuthenticationSystem(authType: string, specifications: string): Promise<AgentResult> {
    return this.execute({
      task: 'auth',
      description: `Create ${authType} authentication system: ${specifications}`,
      technologies: ['Fastify', 'TypeScript', 'JWT', 'bcrypt', 'Zod'],
      requirements: [
        'Implement secure password hashing',
        'Generate and validate JWT tokens',
        'Add refresh token functionality',
        'Implement rate limiting for auth endpoints',
        'Add comprehensive input validation',
        'Include security headers and CORS',
        'Generate security-focused documentation'
      ],
      securityLevel: 'public'
    });
  }

  /**
   * Specialized method for middleware creation
   */
  async createMiddleware(middlewareType: string, specifications: string): Promise<AgentResult> {
    return this.execute({
      task: 'middleware',
      description: `Create ${middlewareType} middleware: ${specifications}`,
      technologies: ['Fastify', 'TypeScript'],
      requirements: [
        'Implement proper error handling',
        'Add comprehensive logging',
        'Ensure type safety',
        'Include performance optimizations',
        'Add unit tests',
        'Document usage patterns'
      ]
    });
  }
}