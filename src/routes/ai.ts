import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { aiService, type TaskInputData, type CodeTaskInput, type AnalysisTaskInput, type ResearchTaskInput, type RefactoringSuggestions, type TaskRequest } from '../core/AIIntegrationService.js';
import { ErrorResponseSchema, SuccessResponseSchema } from '../schemas/common.js';
import { CartritalModelRouter } from '../core/CartritalModelRouter.js';
import { Orchestrator } from '../agents/core/Orchestrator.js';

// Route body type definitions
interface SubmitTaskBody {
  type: 'code' | 'research' | 'documentation' | 'analysis' | 'workflow';
  input: unknown;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

interface GenerateDocumentationBody {
  type: string;
  description?: string;
  outputPath?: string;
  context?: Record<string, unknown>;
}

interface AnalyzeCodeBody {
  filePath?: string;
  code?: string;
  analysisType?: string;
}

interface ResearchQueryBody {
  query: string;
  context?: string | Record<string, unknown>;
  depth?: 'shallow' | 'medium' | 'deep';
}

// Chat interface types for Cartrita
interface ChatRequestBody {
  conversationId: string;
  message: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: string;
  };
  agentType?: string;
  streaming?: boolean;
  context?: {
    previousMessages?: unknown[];
    userPreferences?: {
      useContext7?: boolean;
      enhancedDocumentation?: boolean;
    };
    sessionData?: {
      timestamp?: string;
      context7Enabled?: boolean;
    };
  };
}

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

const isTaskInputData = (value: unknown): value is TaskInputData => typeof value === 'object' && value !== null;

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  const logger = fastify.log.child({ module: 'aiRoutes' });

  // Initialize Cartrita orchestrator with proper model routing
  const modelRouter = new CartritalModelRouter(logger);
  const orchestrator = new Orchestrator(modelRouter, logger);
  
  // Submit AI task
  fastify.post('/tasks', {
    schema: {
      description: 'Submit a task for AI processing',
      tags: ['AI'],
      body: Type.Object({
        type: Type.Union([
          Type.Literal('code'),
          Type.Literal('research'), 
          Type.Literal('documentation'),
          Type.Literal('analysis'),
          Type.Literal('workflow')
        ]),
        input: Type.Any(),
        priority: Type.Optional(Type.Union([
          Type.Literal('low'),
          Type.Literal('medium'),
          Type.Literal('high'),
          Type.Literal('critical')
        ])),
        metadata: Type.Optional(Type.Record(Type.String(), Type.Any()))
      }),
      response: {
        200: Type.Object({
          taskId: Type.String(),
          status: Type.String(),
          message: Type.String()
        }),
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { type, input, priority, metadata } = request.body as SubmitTaskBody;

      if (!isTaskInputData(input)) {
        reply.code(400);
        return {
          error: 'INVALID_TASK_INPUT',
          message: 'Task input must be an object with task-specific fields'
        };
      }

      const taskRequest: Omit<TaskRequest, 'id'> = {
        type,
        input,
        ...(priority ? { priority } : {}),
        ...(metadata ? { metadata } : {})
      };

      const taskId = await aiService.submitTask(taskRequest);

      return {
        taskId,
        status: 'submitted',
        message: 'Task submitted successfully'
      };
    } catch (error) {
      reply.code(500);
      return {
        error: 'Task submission failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Get task status
  fastify.get<{ Params: { taskId: string } }>('/tasks/:taskId', {
    schema: {
      description: 'Get task status and result',
      tags: ['AI'],
      params: Type.Object({
        taskId: Type.String()
      }),
      response: {
        200: Type.Object({
          taskId: Type.String(),
          status: Type.String(),
          result: Type.Optional(Type.Any()),
          error: Type.Optional(Type.String()),
          startTime: Type.Optional(Type.String()),
          endTime: Type.Optional(Type.String()),
          duration: Type.Optional(Type.Number())
        }),
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { taskId } = request.params;
      const status = aiService.getTaskStatus(taskId);
      
      if (status === 'not_found') {
        reply.code(404);
        return {
          error: 'Task not found',
          message: `Task with ID ${taskId} does not exist`
        };
      }

      const result = aiService.getTaskResult(taskId);
      
      return {
        taskId,
        status,
        ...(result && {
          result: result.result,
          error: result.error,
          startTime: result.startTime.toISOString(),
          endTime: result.endTime.toISOString(),
          duration: result.duration
        })
      };
    } catch (error) {
      reply.code(500);
      return {
        error: 'Failed to get task status',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Cancel task
  fastify.delete<{ Params: { taskId: string } }>('/tasks/:taskId', {
    schema: {
      description: 'Cancel a queued task',
      tags: ['AI'],
      params: Type.Object({
        taskId: Type.String()
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { taskId } = request.params;
      const cancelled = aiService.cancelTask(taskId);
      
      if (!cancelled) {
        reply.code(400);
        return {
          error: 'Cannot cancel task',
          message: 'Task is either not found, already active, or completed'
        };
      }

      return {
        success: true,
        message: 'Task cancelled successfully'
      };
    } catch (error) {
      reply.code(500);
      return {
        error: 'Failed to cancel task',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Code generation endpoint
  fastify.post('/code/generate', {
    schema: {
      description: 'Generate code using AI',
      tags: ['AI', 'Code'],
      body: Type.Object({
        type: Type.Union([
          Type.Literal('schema'),
          Type.Literal('route'),
          Type.Literal('test'),
          Type.Literal('component')
        ]),
        description: Type.String(),
        outputPath: Type.Optional(Type.String()),
        context: Type.Optional(Type.Object({
          framework: Type.Optional(Type.String()),
          language: Type.Optional(Type.String()),
          style: Type.Optional(Type.String())
        }))
      }),
      response: {
        200: Type.Object({
          code: Type.String(),
          type: Type.String(),
          saved: Type.Boolean(),
          path: Type.Optional(Type.String())
        }),
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { type, description, outputPath, context } = request.body as GenerateDocumentationBody;

      const taskInput: CodeTaskInput = {
        action: 'generate',
        type,
        ...(description !== undefined ? { description } : {}),
        ...(outputPath ? { outputPath } : {}),
        ...(context ? { context } : {})
      };

      const taskId = await aiService.submitTask({
        type: 'code',
        input: taskInput,
        priority: 'medium'
      });

      // Wait for completion (simplified for demo)
      const result = await new Promise((resolve, reject) => {
        const checkResult = () => {
          const taskResult = aiService.getTaskResult(taskId);
          if (taskResult) {
            if (taskResult.status === 'completed') {
              resolve(taskResult.result);
            } else {
              reject(new Error(taskResult.error));
            }
          } else {
            setTimeout(checkResult, 1000);
          }
        };
        checkResult();
      });

      const generatedCode = typeof result === 'string' ? result : String(result);

      return {
        code: generatedCode,
        type,
        saved: Boolean(outputPath),
        path: outputPath
      };
    } catch (error) {
      reply.code(500);
      return {
        error: 'Code generation failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Code analysis endpoint
  fastify.post('/code/analyze', {
    schema: {
      description: 'Analyze code for issues and improvements',
      tags: ['AI', 'Code'],
      body: Type.Object({
        filePath: Type.Optional(Type.String()),
        code: Type.Optional(Type.String()),
        analysisType: Type.Optional(Type.Union([
          Type.Literal('full'),
          Type.Literal('security'),
          Type.Literal('performance'),
          Type.Literal('style')
        ]))
      }),
      response: {
        200: Type.Object({
          analysis: Type.Any(),
          recommendations: Type.Array(Type.String()),
          metrics: Type.Object({
            complexity: Type.Number(),
            maintainability: Type.Number()
          })
        }),
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
  const { filePath, code, analysisType } = request.body as AnalyzeCodeBody;
      
      if (!filePath && !code) {
        reply.code(400);
        return {
          error: 'Missing required data',
          message: 'Either filePath or code must be provided'
        };
      }

      const taskInput: AnalysisTaskInput = {
        files: filePath ?? code ?? '',
        ...(analysisType ? { analysisType } : {})
      };

      const taskId = await aiService.submitTask({
        type: 'analysis',
        input: taskInput,
        priority: 'medium'
      });

      // Wait for completion
      const result = await new Promise((resolve, reject) => {
        const checkResult = () => {
          const taskResult = aiService.getTaskResult(taskId);
          if (taskResult) {
            if (taskResult.status === 'completed') {
              resolve(taskResult.result);
            } else {
              reject(new Error(taskResult.error));
            }
          } else {
            setTimeout(checkResult, 1000);
          }
        };
        checkResult();
      });

      const analysisData = result as Partial<RefactoringSuggestions> & {
        issues?: unknown[];
        metrics?: Record<string, unknown>;
      };

      const issues = Array.isArray(analysisData.issues) ? analysisData.issues : [];
      const suggestions = 'suggestions' in analysisData && Array.isArray(analysisData.suggestions)
        ? analysisData.suggestions.map((item) => 'description' in item ? item.description : JSON.stringify(item))
        : [];

      const metricsRecord = analysisData.metrics ?? {};
      const complexityValue = metricsRecord['complexity'];
      const complexity = typeof complexityValue === 'number' ? complexityValue : 0;
      const maintainabilityValue = metricsRecord['maintainability'];
      const maintainability = typeof maintainabilityValue === 'number'
        ? maintainabilityValue
        : 0;

      return {
        analysis: issues.length > 0 ? issues : analysisData,
        recommendations: suggestions,
        metrics: {
          complexity,
          maintainability
        }
      };
    } catch (error) {
      reply.code(500);
      return {
        error: 'Code analysis failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Research endpoint
  fastify.post('/research', {
    schema: {
      description: 'Conduct AI-powered research',
      tags: ['AI', 'Research'],
      body: Type.Object({
        query: Type.String(),
        context: Type.Optional(Type.String()),
        depth: Type.Optional(Type.Union([
          Type.Literal('shallow'),
          Type.Literal('medium'),
          Type.Literal('deep')
        ]))
      }),
      response: {
        200: Type.Object({
          query: Type.String(),
          analysis: Type.String(),
          searchStrategies: Type.String(),
          sources: Type.Optional(Type.Array(Type.String()))
        }),
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { query, context, depth } = request.body as ResearchQueryBody;

      const contextValue = typeof context === 'string' ? { summary: context } : context;

      const researchInput: ResearchTaskInput = {
        query,
        ...(contextValue ? { context: contextValue } : {}),
        ...(depth ? { depth } : {})
      };

      const taskId = await aiService.submitTask({
        type: 'research',
        input: researchInput,
        priority: 'medium'
      });

      // Wait for completion
      const result = await new Promise((resolve, reject) => {
        const checkResult = () => {
          const taskResult = aiService.getTaskResult(taskId);
          if (taskResult) {
            if (taskResult.status === 'completed') {
              resolve(taskResult.result);
            } else {
              reject(new Error(taskResult.error));
            }
          } else {
            setTimeout(checkResult, 1000);
          }
        };
        checkResult();
      });

      const rawResult = (result as { data?: unknown }).data ?? result;
      const resultRecord = (rawResult && typeof rawResult === 'object') ? rawResult as Record<string, unknown> : {};

      const responseQueryValue = resultRecord['query'];
      const analysisValue = resultRecord['analysis'];
      const searchStrategiesValue = resultRecord['searchStrategies'];
      const responseQuery = typeof responseQueryValue === 'string' ? responseQueryValue : query;
      const analysisText = typeof analysisValue === 'string' ? analysisValue : '';
      const searchStrategies = Array.isArray(searchStrategiesValue)
        ? searchStrategiesValue.join(', ')
        : typeof searchStrategiesValue === 'string'
          ? searchStrategiesValue
          : '';
      const sourcesValue = resultRecord['sources'];
      const sources = Array.isArray(sourcesValue) ? sourcesValue.map(String) : [];

      return {
        query: responseQuery,
        analysis: analysisText,
        searchStrategies,
        sources
      };
    } catch (error) {
      reply.code(500);
      return {
        error: 'Research failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // System metrics endpoint
  fastify.get('/metrics', {
    schema: {
      description: 'Get AI system metrics',
      tags: ['AI', 'Monitoring'],
      response: {
        200: Type.Object({
          system: Type.Any(),
          models: Type.Any(),
          tasks: Type.Any()
        }),
        500: ErrorResponseSchema
      }
    }
  }, async (_request, reply) => {
    try {
      const metrics = aiService.getSystemMetrics();
      return metrics;
    } catch (error) {
      reply.code(500);
      return {
        error: 'Failed to get system metrics',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Health check endpoint
  fastify.get('/health', {
    schema: {
      description: 'Check AI system health',
      tags: ['AI', 'Monitoring'],
      response: {
        200: Type.Object({
          status: Type.String(),
          components: Type.Any()
        }),
        500: ErrorResponseSchema
      }
    }
  }, async (_request, reply) => {
    try {
      const health = await aiService.healthCheck();
      return health;
    } catch (error) {
      reply.code(500);
      return {
        error: 'Health check failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Orchestration endpoints
  fastify.post('/orchestration/workflow', {
    schema: {
      description: 'Execute a predefined workflow',
      tags: ['AI', 'Orchestration'],
      security: [{ bearerAuth: [] }],
      body: Type.Object({
        workflowId: Type.String(),
        input: Type.Any(),
        context: Type.Optional(Type.Record(Type.String(), Type.Any())),
        options: Type.Optional(Type.Object({
          priority: Type.Optional(Type.Union([
            Type.Literal('low'),
            Type.Literal('medium'),
            Type.Literal('high'),
            Type.Literal('critical')
          ])),
          timeout: Type.Optional(Type.Number()),
          retryCount: Type.Optional(Type.Number({ minimum: 0, maximum: 5 }))
        }))
      }),
      response: {
        200: Type.Object({
          taskId: Type.String(),
          workflowId: Type.String(),
          status: Type.String(),
          estimatedDuration: Type.Optional(Type.Number())
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['ai:execute', 'workflow:execute']);
      const { workflowId, input, context, options } = request.body as any;

      const taskId = await aiService.submitTask({
        type: 'workflow',
        input: { workflowId, input, context },
        priority: options?.priority || 'medium',
        metadata: {
          userId: request.user?.id,
          timeout: options?.timeout,
          retryCount: options?.retryCount || 0
        }
      });

      return reply.apiSuccess({
        taskId,
        workflowId,
        status: 'submitted',
        estimatedDuration: getWorkflowEstimatedDuration(workflowId)
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error executing workflow');
      return reply.apiError('WORKFLOW_EXECUTION_FAILED', 'Failed to execute workflow', 500, err);
    }
  });

  fastify.post('/orchestration/division/:division', {
    schema: {
      description: 'Execute task using a specific division agent',
      tags: ['AI', 'Orchestration'],
      security: [{ bearerAuth: [] }],
      params: Type.Object({
        division: Type.Union([
          Type.Literal('external'),
          Type.Literal('core'),
          Type.Literal('agents'),
          Type.Literal('data'),
          Type.Literal('infrastructure')
        ])
      }),
      body: Type.Object({
        task: Type.String(),
        input: Type.Any(),
        context: Type.Optional(Type.Record(Type.String(), Type.Any())),
        priority: Type.Optional(Type.Union([
          Type.Literal('low'),
          Type.Literal('medium'),
          Type.Literal('high'),
          Type.Literal('critical')
        ]))
      }),
      response: {
        200: Type.Object({
          division: Type.String(),
          result: Type.Any(),
          executionTime: Type.Number(),
          status: Type.String()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['ai:execute', 'division:execute']);
      const { division } = request.params as { division: 'external' | 'core' | 'agents' | 'data' | 'infrastructure' };
      const { task, input, context, priority } = request.body as any;

      const startTime = Date.now();
      const result = await aiService.executeDivisionTask(division, {
        task,
        input,
        context: {
          ...context,
          userId: request.user?.id,
          priority: priority || 'medium'
        }
      });

      const executionTime = Date.now() - startTime;

      if (result.kind === 'error') {
        return reply.apiError(result.code, result.message, result.retryable ? 500 : 400, {
          category: result.category,
          retryable: result.retryable
        });
      }

      return reply.apiSuccess({
        division,
        result: result.data,
        executionTime,
        status: 'completed'
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error executing division task');
      return reply.apiError('DIVISION_EXECUTION_FAILED', 'Failed to execute division task', 500, err);
    }
  });

  fastify.post('/orchestration/smart-task', {
    schema: {
      description: 'Execute smart task with automatic agent selection',
      tags: ['AI', 'Orchestration'],
      security: [{ bearerAuth: [] }],
      body: Type.Object({
        input: Type.String(),
        context: Type.Optional(Type.Record(Type.String(), Type.Any())),
        preferences: Type.Optional(Type.Object({
          speed: Type.Optional(Type.Union([Type.Literal('fast'), Type.Literal('balanced'), Type.Literal('thorough')])),
          cost: Type.Optional(Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')])),
          quality: Type.Optional(Type.Union([Type.Literal('draft'), Type.Literal('production'), Type.Literal('premium')]))
        }))
      }),
      response: {
        200: Type.Object({
          result: Type.Any(),
          strategy: Type.String(),
          agentsUsed: Type.Array(Type.String()),
          executionTime: Type.Number(),
          confidence: Type.Number()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['ai:execute', 'smart-task:execute']);
      const { input, context, preferences } = request.body as any;

      const startTime = Date.now();
      const result = await aiService.executeSmartTask(input, {
        ...context,
        userId: request.user?.id,
        preferences: preferences || { speed: 'balanced', cost: 'medium', quality: 'production' }
      });

      const executionTime = Date.now() - startTime;

      if (result.kind === 'error') {
        return reply.apiError(result.code, result.message, result.retryable ? 500 : 400, {
          category: result.category,
          retryable: result.retryable
        });
      }

      const metadataRecord = (result.metadata ?? undefined) as Record<string, unknown> | undefined;
      const agentsUsedValue = metadataRecord?.['agentsUsed'];
      const confidenceValue = metadataRecord?.['confidence'];

      return reply.apiSuccess({
        result: result.data,
        strategy: 'smart-analysis',
        agentsUsed: Array.isArray(agentsUsedValue) ? agentsUsedValue.map(String) : [],
        executionTime,
        confidence: typeof confidenceValue === 'number' ? confidenceValue : 0.85
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error executing smart task');
      return reply.apiError('SMART_TASK_FAILED', 'Failed to execute smart task', 500, err);
    }
  });

  // Context7 integration endpoints
  fastify.post('/context7/knowledge', {
    schema: {
      description: 'Add knowledge to Context7 system',
      tags: ['AI', 'Context7'],
      security: [{ bearerAuth: [] }],
      body: Type.Object({
        content: Type.String(),
        type: Type.Union([
          Type.Literal('document'),
          Type.Literal('code'),
          Type.Literal('conversation'),
          Type.Literal('insight')
        ]),
        metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
        tags: Type.Optional(Type.Array(Type.String()))
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          indexed: Type.Boolean(),
          vectorId: Type.Optional(Type.String())
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['context7:write', 'knowledge:create']);
      const { content, type, metadata, tags } = request.body as any;

      const context7Service = aiService.getContext7Service();
      const result = await context7Service.addKnowledge({
        content,
        type,
        metadata: {
          ...metadata,
          userId: request.user?.id,
          createdAt: new Date().toISOString()
        },
        tags: tags || []
      });

      return reply.apiSuccess({
        id: result.id,
        indexed: result.indexed,
        vectorId: result.vectorId
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error adding knowledge to Context7');
      return reply.apiError('CONTEXT7_KNOWLEDGE_FAILED', 'Failed to add knowledge', 500, err);
    }
  });

  fastify.post('/context7/search', {
    schema: {
      description: 'Search Context7 knowledge base',
      tags: ['AI', 'Context7'],
      security: [{ bearerAuth: [] }],
      body: Type.Object({
        query: Type.String(),
        filters: Type.Optional(Type.Object({
          type: Type.Optional(Type.Array(Type.String())),
          tags: Type.Optional(Type.Array(Type.String())),
          dateRange: Type.Optional(Type.Object({
            start: Type.String({ format: 'date-time' }),
            end: Type.String({ format: 'date-time' })
          })),
          userId: Type.Optional(Type.String())
        })),
        options: Type.Optional(Type.Object({
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 10 })),
          includeContent: Type.Optional(Type.Boolean({ default: true })),
          similarity: Type.Optional(Type.Number({ minimum: 0, maximum: 1, default: 0.7 }))
        }))
      }),
      response: {
        200: Type.Object({
          results: Type.Array(Type.Object({
            id: Type.String(),
            content: Type.Optional(Type.String()),
            type: Type.String(),
            similarity: Type.Number(),
            metadata: Type.Record(Type.String(), Type.Any()),
            tags: Type.Array(Type.String())
          })),
          totalCount: Type.Number(),
          query: Type.String(),
          executionTime: Type.Number()
        }),
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['context7:read', 'knowledge:search']);
      const { query, filters, options } = request.body as any;

      const startTime = Date.now();
      const context7Service = aiService.getContext7Service();
      const results = await context7Service.search(query, {
        filters: filters || {},
        ...options
      });

      const executionTime = Date.now() - startTime;

      return reply.apiSuccess({
        results,
        totalCount: results.length,
        query,
        executionTime
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error searching Context7');
      return reply.apiError('CONTEXT7_SEARCH_FAILED', 'Failed to search knowledge base', 500, err);
    }
  });

  // Cartrita Chat Interface for frontend
  fastify.post('/chat', {
    schema: {
      description: 'Send message to Cartrita AI agents and get response',
      tags: ['AI Chat'],
      body: Type.Object({
        conversationId: Type.String(),
        message: Type.Object({
          id: Type.String(),
          content: Type.String(),
          role: Type.Union([Type.Literal('user'), Type.Literal('assistant')]),
          timestamp: Type.String()
        }),
        agentType: Type.Optional(Type.String()),
        streaming: Type.Optional(Type.Boolean()),
        context: Type.Optional(Type.Object({
          previousMessages: Type.Optional(Type.Array(Type.Any())),
          userPreferences: Type.Optional(Type.Object({
            useContext7: Type.Optional(Type.Boolean()),
            enhancedDocumentation: Type.Optional(Type.Boolean())
          })),
          sessionData: Type.Optional(Type.Object({
            timestamp: Type.Optional(Type.String()),
            context7Enabled: Type.Optional(Type.Boolean())
          }))
        }))
      }),
      response: {
        200: Type.Object({
          messageId: Type.String(),
          content: Type.String(),
          conversationId: Type.String(),
          agentName: Type.Optional(Type.String()),
          timestamp: Type.String(),
          metadata: Type.Optional(Type.Object({
            model: Type.Optional(Type.String()),
            tokens: Type.Optional(Type.Number()),
            responseTime: Type.Optional(Type.Number()),
            context7Enabled: Type.Optional(Type.Boolean()),
            enhancedDocumentation: Type.Optional(Type.Boolean()),
            mcpServersUsed: Type.Optional(Type.Array(Type.String())),
            documentationVersion: Type.Optional(Type.String())
          }))
        })
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now();
    const { conversationId, message, agentType, context } = request.body as ChatRequestBody;

    try {
      logger.info({ conversationId, agentType, messageId: message.id }, 'Processing Cartrita chat message');

      // Smart agent selection by Cartrita orchestrator
      const selectedAgent = agentType || 'cartrita-orchestrator';

      // Prepare enhanced prompt with Context7 integration if requested
      let enhancedContent = message.content;
      if (context?.userPreferences?.useContext7) {
        const year = new Date().getFullYear();
        enhancedContent = `use context7 (${year} documentation) - Focus on latest 2025 best practices and patterns\n\n${message.content}`;
      }

      // Execute through Cartrita model router
      const result = await modelRouter.executeForAgent(selectedAgent, enhancedContent, {
        systemPrompt: getSystemPromptForAgent(selectedAgent),
        maxTokens: 4000,
        temperature: 0.7
      });

      const responseTime = Date.now() - startTime;

      // Prepare response with metadata
      const response = {
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: result.content || 'I apologize, but I encountered an issue processing your request.',
        conversationId,
        agentName: getAgentDisplayName(selectedAgent),
        timestamp: new Date().toISOString(),
        metadata: {
          model: result.model,
          tokens: result.tokens,
          responseTime: result.responseTime,
          context7Enabled: context?.userPreferences?.useContext7 || false,
          enhancedDocumentation: context?.userPreferences?.enhancedDocumentation || false,
          mcpServersUsed: context?.userPreferences?.useContext7 ? ['context7'] : [],
          documentationVersion: '2025'
        }
      };

      logger.info({
        conversationId,
        responseTime,
        agentUsed: selectedAgent,
        model: result.model,
        tokens: result.tokens
      }, 'Cartrita chat response generated');

      return reply.send(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error({ error, conversationId, responseTime }, 'Cartrita chat processing failed');

      return reply.status(500).send({
        messageId: `error_${Date.now()}`,
        content: 'I apologize, but I encountered an error while processing your message. Please try again.',
        conversationId,
        agentName: 'Cartrita Error Handler',
        timestamp: new Date().toISOString(),
        metadata: {
          error: 'Internal processing error',
          responseTime
        }
      });
    }
  });

  // Get available Cartrita agents
  fastify.get('/agents', {
    schema: {
      description: 'Get list of available Cartrita AI agents',
      tags: ['AI Chat'],
      response: {
        200: Type.Array(Type.Object({
          id: Type.String(),
          name: Type.String(),
          description: Type.String(),
          capabilities: Type.Array(Type.String()),
          status: Type.Union([Type.Literal('online'), Type.Literal('offline'), Type.Literal('busy')]),
          category: Type.Union([Type.Literal('core'), Type.Literal('advanced'), Type.Literal('specialized')]),
          model: Type.Optional(Type.String())
        }))
      }
    }
  }, async (request, reply) => {

    const assignments = modelRouter.getAgentAssignments();
    const agents = Object.values(assignments).map(assignment => ({
      id: assignment.agentId,
      name: assignment.agentName,
      description: assignment.description,
      capabilities: getAgentCapabilities(assignment.agentId),
      status: 'online' as const,
      category: getAgentCategory(assignment.agentId),
      model: assignment.primaryModel
    }));

    return reply.send(agents);
  });

  // Health check for Cartrita AI services
  fastify.get('/ai-health', {
    schema: {
      description: 'Check health of Cartrita AI services',
      tags: ['AI Chat'],
      response: {
        200: Type.Object({
          status: Type.Union([Type.Literal('healthy'), Type.Literal('degraded'), Type.Literal('unhealthy')]),
          agents: Type.Object({
            online: Type.Number(),
            total: Type.Number()
          }),
          models: Type.Object({
            orchestrator: Type.String(),
            codeEngineer: Type.String(),
            available: Type.Array(Type.String())
          }),
          uptime: Type.Number(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const metrics = modelRouter.getModelMetrics();

    const health = {
      status: 'healthy' as const,
      agents: {
        online: metrics.totalAgents,
        total: metrics.totalAgents
      },
      models: {
        orchestrator: 'gpt-4.1',
        codeEngineer: 'gpt-5-codex-preview',
        available: Object.keys(metrics.models)
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    return reply.send(health);
  });
};

// Helper functions for Cartrita chat integration
function getSystemPromptForAgent(agentId: string): string {
  const prompts = {
    'cartrita-orchestrator': 'You are Cartrita, the main orchestrator agent. You coordinate tasks, select appropriate agents, and provide intelligent responses with strategic thinking. Use GPT-4.1 capabilities for complex reasoning and planning.',
    'code-engineer': 'You are a code engineer specialist using GPT-5 Codex Preview. You excel at code generation, debugging, refactoring, and architectural design. Provide high-quality, production-ready code solutions.',
    'frontend-agent': 'You are a frontend specialist focused on React, TypeScript, Tailwind CSS, and modern UI development. Provide practical, accessible, and performant frontend solutions.',
    'api-agent': 'You are an API engineer specialist focused on Fastify, REST APIs, database design, and backend architecture. Provide secure, scalable API solutions.',
    'codebase-inspector': 'You are a codebase inspector focused on security analysis, performance auditing, and code quality assessment. Provide thorough analysis and actionable recommendations.',
    'mcp-integration': 'You are an MCP integration agent that coordinates with external services like GitHub, Context7, and web search. Enhance responses with real-time data and integrations.'
  };
  return prompts[agentId] || prompts['cartrita-orchestrator'];
}

function getAgentDisplayName(agentId: string): string {
  const names = {
    'cartrita-orchestrator': 'Cartrita Orchestrator',
    'code-engineer': 'Code Engineer',
    'frontend-agent': 'Frontend Specialist',
    'api-agent': 'API Engineer',
    'codebase-inspector': 'Codebase Inspector',
    'mcp-integration': 'MCP Integration Agent'
  };
  return names[agentId] || 'Cartrita Assistant';
}

function getAgentCapabilities(agentId: string): string[] {
  const capabilities = {
    'cartrita-orchestrator': ['task-coordination', 'agent-selection', 'workflow-management', 'smart-routing'],
    'code-engineer': ['code-generation', 'refactoring', 'optimization', 'architecture', 'debugging'],
    'frontend-agent': ['react', 'typescript', 'tailwind-css', 'ui-components', 'accessibility'],
    'api-agent': ['fastify', 'rest-apis', 'database', 'security', 'openapi'],
    'codebase-inspector': ['security-audit', 'performance-analysis', 'code-review', 'vulnerability-scanning'],
    'mcp-integration': ['mcp-servers', 'github-integration', 'web-search', 'context7', 'external-apis']
  };
  return capabilities[agentId] || ['general-assistance'];
}

function getAgentCategory(agentId: string): 'core' | 'advanced' | 'specialized' {
  const categories = {
    'cartrita-orchestrator': 'core' as const,
    'code-engineer': 'advanced' as const,
    'frontend-agent': 'specialized' as const,
    'api-agent': 'specialized' as const,
    'codebase-inspector': 'advanced' as const,
    'mcp-integration': 'specialized' as const
  };
  return categories[agentId] || 'specialized';
}

// Utility function to estimate workflow duration
function getWorkflowEstimatedDuration(workflowId: string): number {
  const estimations = {
    'code-review': 300000, // 5 minutes
    'research-implement': 600000, // 10 minutes
    'full-feature-dev': 1800000, // 30 minutes
    'bug-hunt-fix': 900000, // 15 minutes
    'intelligent-refactor': 1200000, // 20 minutes
    'api-modernization': 2400000, // 40 minutes
    'deployment-pipeline': 1800000, // 30 minutes
    'data-pipeline': 2100000, // 35 minutes
    'smart-analysis': 180000 // 3 minutes
  };

  return estimations[workflowId as keyof typeof estimations] || 600000; // Default 10 minutes
}

export default aiRoutes;