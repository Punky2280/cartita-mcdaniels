import fastifyPlugin from 'fastify-plugin';
import type { FastifyPluginCallback } from 'fastify';
import fastifyCaching from '@fastify/caching';
import type { CacheConfiguration } from '@fastify/caching';

/**
 * Cache Policy Configuration
 * Defines intelligent caching strategies for different route types
 */
export interface CachePolicy {
  /** TTL in seconds */
  ttl: number;
  /** Cache key generator function */
  keyGenerator?: (request: any) => string;
  /** Whether to vary cache by user authentication */
  varyByAuth?: boolean;
  /** Whether to vary cache by query parameters */
  varyByQuery?: boolean;
  /** Skip cache for certain conditions */
  skipCondition?: (request: any) => boolean;
}

/**
 * Cache Policies for different route types
 */
export const CACHE_POLICIES = {
  // Static content - cache for 1 hour
  STATIC: {
    ttl: 3600,
    varyByAuth: false,
    varyByQuery: false,
  },

  // API responses - cache for 5 minutes
  API_SHORT: {
    ttl: 300,
    varyByAuth: true,
    varyByQuery: true,
  },

  // Agent configurations - cache for 15 minutes
  AGENT_CONFIG: {
    ttl: 900,
    varyByAuth: true,
    varyByQuery: false,
  },

  // Health checks - cache for 30 seconds
  HEALTH: {
    ttl: 30,
    varyByAuth: false,
    varyByQuery: false,
  },

  // Database queries - cache for 2 minutes
  DATABASE: {
    ttl: 120,
    varyByAuth: true,
    varyByQuery: true,
  },

  // AI model responses - cache for 10 minutes (expensive operations)
  AI_MODELS: {
    ttl: 600,
    varyByAuth: true,
    varyByQuery: true,
    skipCondition: (request: any) => {
      // Skip cache for streaming or real-time requests
      return request.headers['accept'] === 'text/event-stream' ||
             request.headers['x-real-time'] === 'true';
    }
  },

  // User authentication - cache for 1 minute
  AUTH: {
    ttl: 60,
    varyByAuth: false,
    varyByQuery: false,
    skipCondition: (request: any) => {
      // Skip cache for login/logout operations
      return ['POST', 'PUT', 'DELETE'].includes(request.method);
    }
  }
} satisfies Record<string, CachePolicy>;

/**
 * Generate intelligent cache key based on policy
 */
function generateCacheKey(request: any, policy: CachePolicy): string {
  let key = `${request.method}:${request.url}`;

  if (policy.varyByAuth && request.user?.id) {
    key += `:user:${request.user.id}`;
  }

  if (policy.varyByQuery && Object.keys(request.query).length > 0) {
    const sortedQuery = Object.keys(request.query)
      .sort()
      .map(k => `${k}=${request.query[k]}`)
      .join('&');
    key += `:query:${sortedQuery}`;
  }

  return key;
}

/**
 * Cache invalidation utilities
 */
export class CacheInvalidator {
  private fastify: any;

  constructor(fastify: any) {
    this.fastify = fastify;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (this.fastify.cache?.invalidatePattern) {
      await this.fastify.cache.invalidatePattern(pattern);
    }
  }

  /**
   * Invalidate user-specific cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.invalidatePattern(`*:user:${userId}*`);
  }

  /**
   * Invalidate cache for specific route
   */
  async invalidateRoute(route: string, method = '*'): Promise<void> {
    await this.invalidatePattern(`${method}:${route}*`);
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    if (this.fastify.cache?.clear) {
      await this.fastify.cache.clear();
    }
  }
}

const cachePlugin: FastifyPluginCallback = async (fastify, opts) => {
  // Configure caching with in-memory store and optional Redis
  const cacheConfig: CacheConfiguration = {
    privacy: 'private',
    expiresIn: 300, // default 5 minutes
    serverExpiresIn: 300,
    vary: ['accept-encoding', 'authorization'],
    cacheControl: {
      public: false,
      private: true,
      maxAge: 300,
      mustRevalidate: true,
      noCache: false,
      noStore: false
    }
  };

  await fastify.register(fastifyCaching, cacheConfig);

  // Add cache invalidator to fastify instance
  const invalidator = new CacheInvalidator(fastify);
  fastify.decorate('cacheInvalidator', invalidator);

  // Add utility function to apply cache policy to routes
  fastify.decorate('applyCache', function(policy: CachePolicy) {
    return async function(request: any, reply: any, done: Function) {
      // Check skip condition
      if (policy.skipCondition && policy.skipCondition(request)) {
        return done();
      }

      // Generate cache key
      const cacheKey = policy.keyGenerator
        ? policy.keyGenerator(request)
        : generateCacheKey(request, policy);

      // Set cache headers
      reply.header('cache-control', `private, max-age=${policy.ttl}`);
      reply.header('x-cache-key', cacheKey);
      reply.header('x-cache-ttl', policy.ttl.toString());

      done();
    };
  });

  // Hook for cache statistics
  fastify.addHook('onResponse', async (request, reply) => {
    // Add cache hit/miss headers for monitoring
    if (reply.getHeader('x-cache-hit')) {
      reply.header('x-cache-status', 'HIT');
    } else {
      reply.header('x-cache-status', 'MISS');
    }
  });

  // Hook for automatic cache invalidation on mutations
  fastify.addHook('onResponse', async (request, reply) => {
    // Invalidate cache on data-modifying operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && reply.statusCode < 400) {
      const routeBase = request.url.split('?')[0];

      // Invalidate related cache patterns
      if (routeBase.includes('/agents')) {
        await invalidator.invalidatePattern('*:/api/v1/agents*');
      }

      if (routeBase.includes('/ai')) {
        await invalidator.invalidatePattern('*:/api/v1/ai*');
      }

      // Invalidate user-specific cache if user is authenticated
      if (request.user?.id) {
        await invalidator.invalidateUser(request.user.id);
      }
    }
  });

  fastify.log.info('Cache plugin registered with intelligent invalidation');
};

export default fastifyPlugin(cachePlugin, {
  name: 'cache-plugin'
});