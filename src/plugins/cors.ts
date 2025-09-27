import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// Extend Fastify types for CORS
declare module 'fastify' {
  interface FastifyReply {
    cors(): FastifyReply;
  }
}

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  // Add CORS headers
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', process.env['CORS_ORIGIN'] || '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    reply.header('Access-Control-Allow-Credentials', 'true');
  });

  // Handle preflight requests
  fastify.options('/*', async (request, reply) => {
    reply.status(200).send();
  });

  // Decorate reply with CORS method
  fastify.decorateReply('cors', function () {
    this.header('Access-Control-Allow-Origin', process.env['CORS_ORIGIN'] || '*');
    return this;
  });
};

export default fp(corsPlugin, {
  name: 'cors-plugin',
  fastify: '5.x'
});