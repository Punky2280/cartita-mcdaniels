import { FastifyPluginAsync } from 'fastify';
import { healthHandler } from '../handlers/health.js';
import { HealthResponseSchema } from '../schemas/health.js';
import { ErrorResponseSchema } from '../schemas/common.js';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: HealthResponseSchema,
        503: HealthResponseSchema
      }
    }
  }, healthHandler);
};

export default healthRoutes;