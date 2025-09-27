import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// Define authentication interfaces
interface AuthUser {
  id: string;
  email: string;
  role: string;
}

// Extend Fastify request to include authenticated user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    requireAuth(): Promise<AuthUser>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate request with requireAuth method
  fastify.decorateRequest('requireAuth', async function () {
    if (!this.user) {
      throw fastify.httpErrors.unauthorized('Authentication required');
    }
    return this.user;
  });

  // Authentication hook
  fastify.addHook('onRequest', async (request, reply) => {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // TODO: Implement JWT verification or API key validation
        // For now, this is a placeholder
        if (token === 'development-token') {
          request.user = {
            id: 'dev-user',
            email: 'dev@example.com',
            role: 'admin'
          };
        }
      } catch (error) {
        fastify.log.warn('Invalid authentication token:', error);
      }
    }
  });
};

export default fp(authPlugin, {
  name: 'auth-plugin',
  fastify: '5.x'
});