import type { FastifyPluginAsync } from 'fastify';
import { AIIntegrationService } from '../core/AIIntegrationService.js';

const context7Routes: FastifyPluginAsync = async (fastify) => {
  const aiService = new AIIntegrationService();

  // Get library documentation
  fastify.get('/documentation/:library', {
    schema: {
      description: 'Get enhanced documentation for a library using Context7',
      tags: ['Context7'],
      params: {
        type: 'object',
        properties: {
          library: { type: 'string' }
        },
        required: ['library']
      },
      querystring: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          useCase: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            library: { type: 'string' },
            documentation: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { library } = request.params as { library: string };
      const { topic, useCase } = request.query as { topic?: string; useCase?: string };

      // Access Context7Service through AIIntegrationService
      const context7 = aiService.getContext7Service();
      const documentation = await context7.generateEnhancedDocumentation(library, topic, useCase);

      return reply.send({
        library,
        documentation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      fastify.log.error(`Context7 documentation error: ${String(error)}`);
      return reply.code(500).send({
        error: 'DocumentationError',
        message: String(error)
      });
    }
  });

  // Get code examples for a pattern
  fastify.get('/examples/:library/:pattern', {
    schema: {
      description: 'Get code examples for a specific pattern in a library',
      tags: ['Context7'],
      params: {
        type: 'object',
        properties: {
          library: { type: 'string' },
          pattern: { type: 'string' }
        },
        required: ['library', 'pattern']
      },
      querystring: {
        type: 'object',
        properties: {
          language: { 
            type: 'string',
            enum: ['typescript', 'javascript'],
            default: 'typescript'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            library: { type: 'string' },
            pattern: { type: 'string' },
            examples: {
              type: 'array',
              items: { type: 'string' }
            },
            count: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { library, pattern } = request.params as { library: string; pattern: string };
      const { language = 'typescript' } = request.query as { language?: 'typescript' | 'javascript' };

      const context7 = aiService.getContext7Service();
      const examples = await context7.getCodeExamples(library, pattern, language);

      return reply.send({
        library,
        pattern,
        examples,
        count: examples.length
      });
    } catch (error) {
      fastify.log.error(`Context7 examples error: ${String(error)}`);
      return reply.code(500).send({
        error: 'ExamplesError',
        message: String(error)
      });
    }
  });

  // Generate implementation guidance
  fastify.post('/guidance', {
    schema: {
      description: 'Generate implementation guidance for a specific scenario',
      tags: ['Context7'],
      body: {
        type: 'object',
        properties: {
          scenario: { type: 'string' },
          technologies: {
            type: 'array',
            items: { type: 'string' }
          },
          requirements: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['scenario', 'technologies', 'requirements']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            scenario: { type: 'string' },
            guidance: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { scenario, technologies, requirements } = request.body as {
        scenario: string;
        technologies: string[];
        requirements: string[];
      };

      const context7 = aiService.getContext7Service();
      const guidance = await context7.generateImplementationGuidance(scenario, technologies, requirements);

      return reply.send({
        scenario,
        guidance,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      fastify.log.error(`Context7 guidance error: ${String(error)}`);
      return reply.code(500).send({
        error: 'GuidanceError',
        message: String(error)
      });
    }
  });

  // Resolve library to Context7 ID
  fastify.get('/resolve/:library', {
    schema: {
      description: 'Resolve a library name to Context7-compatible library ID',
      tags: ['Context7'],
      params: {
        type: 'object',
        properties: {
          library: { type: 'string' }
        },
        required: ['library']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            libraries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  libraryId: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  codeSnippets: { type: 'number' },
                  trustScore: { type: 'number' }
                }
              }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { library } = request.params as { library: string };

      const context7 = aiService.getContext7Service();
      const libraries = await context7.resolveLibrary(library);

      return reply.send({
        query: library,
        libraries
      });
    } catch (error) {
      fastify.log.error(`Context7 resolve error: ${String(error)}`);
      return reply.code(500).send({
        error: 'ResolveError',
        message: String(error)
      });
    }
  });
};

export default context7Routes;