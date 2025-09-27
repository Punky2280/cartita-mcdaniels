import { FastifyRequest, FastifyReply } from 'fastify';
import { HealthResponseSchema, type HealthResponse } from '../schemas/health.js';

export const healthHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<HealthResponse> => {
  const startTime = Date.now();
  let dbConnected = false;
  let dbLatency: number | undefined;

  try {
    // Test database connection
    await request.server.db.execute('SELECT 1 as health_check');
    dbConnected = true;
    dbLatency = Date.now() - startTime;
  } catch (error) {
    request.server.log.warn('Database health check failed:', error);
  }

  const response: HealthResponse = {
    status: dbConnected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] || '1.0.0',
    environment: process.env['NODE_ENV'] || 'development',
    database: {
      connected: dbConnected,
      ...(dbLatency !== undefined && { latency: dbLatency })
    }
  };

  return reply
    .status(dbConnected ? 200 : 503)
    .send(response);
};