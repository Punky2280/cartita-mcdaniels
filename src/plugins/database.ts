import type { FastifyPluginAsync, } from 'fastify';
import fp from 'fastify-plugin';
import { db } from '../database/connection.js';

// Extend Fastify instance to include database
declare module 'fastify' {
  interface FastifyInstance {
    db: typeof db;
  }
}

const databasePlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate Fastify instance with database connection
  fastify.decorate('db', db);

  // Add database health check
  fastify.addHook('onReady', async () => {
    try {
      await db.execute('SELECT 1 as health_check');
      fastify.log.info('Database connection established');
    } catch (error) {
      fastify.log.error(`Database connection failed: ${String(error)}`);
      throw error;
    }
  });

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing database connection');
    // Drizzle doesn't have a close method, but we could add connection pool cleanup here
  });
};

export default fp(databasePlugin, {
  name: 'database',
  fastify: '5.x'
});