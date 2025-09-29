import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// Extend Fastify types for CORS
declare module 'fastify' {
  interface FastifyReply {
    cors(): FastifyReply;
  }
}

const env = process.env;
const CORS_ORIGIN = env['CORS_ORIGIN'] ?? '*';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  // Add CORS headers
  fastify.addHook('onRequest', async (_request, reply) => {
    reply.header('Access-Control-Allow-Origin', CORS_ORIGIN);
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    reply.header('Access-Control-Allow-Credentials', 'true');
  });

  // Note: Preflight requests are handled by the security plugin

  // Decorate reply with CORS method
  fastify.decorateReply('cors', function (this: FastifyReply) {
    this.header('Access-Control-Allow-Origin', CORS_ORIGIN);
    return this;
  });
};

export default fp(corsPlugin, {
  name: 'cors-plugin',
  fastify: '5.x'
});