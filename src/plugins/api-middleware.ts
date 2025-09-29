import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { Type } from '@sinclair/typebox';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: FastifyRequest) => string;
}

// Request metadata interface
interface RequestMetadata {
  id: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  userId?: string;
  apiKeyId?: string;
  processingTime?: number;
  responseSize?: number;
  statusCode?: number;
}

// Response wrapper interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
    path: string;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTime: number;
    version: string;
    rateLimit?: {
      remaining: number;
      resetTime: number;
      limit: number;
    };
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// In-memory rate limiting (replace with Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Request analytics store
const requestAnalytics: RequestMetadata[] = [];

const env = process.env;
const PACKAGE_VERSION = env['npm_package_version'] ?? '1.0.0';

// Rate limiting configurations by endpoint
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  '/api/v1/ai/': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20
  },
  '/api/v1/agents/': {
    windowMs: 60 * 1000,
    maxRequests: 50
  },
  '/auth/': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // Strict limit for auth endpoints
  },
  'default': {
    windowMs: 60 * 1000,
    maxRequests: 100
  }
};

// Extend Fastify interfaces
declare module 'fastify' {
  interface FastifyReply {
    apiSuccess<T>(data: T, metadata?: any): FastifyReply;
    apiError(code: string, message: string, statusCode?: number, details?: any): FastifyReply;
    apiPaginated<T>(data: T[], pagination: any, metadata?: any): FastifyReply;
  }

  interface FastifyRequest {
    metadata: RequestMetadata;
    startTime: number;
  }
}

function getRateLimitKey(request: FastifyRequest): string {
  // Use API key ID if available, otherwise IP + user ID, otherwise just IP
  if (request.apiKey) {
    return `api_key:${request.apiKey.id}`;
  }
  if (request.user) {
    return `user:${request.user.id}:${request.ip}`;
  }
  return `ip:${request.ip}`;
}

function getRateLimitConfig(path: string): RateLimitConfig {
  for (const [pattern, config] of Object.entries(rateLimitConfigs)) {
    if (pattern !== 'default' && path.startsWith(pattern)) {
      return config;
    }
  }
  return rateLimitConfigs['default'];
}

function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime <= now) {
    // Create new window
    entry = {
      count: 1,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

function validateRequestSize(request: FastifyRequest): boolean {
  const contentLength = request.headers['content-length'];
  if (!contentLength) return true;

  const maxSize = 10 * 1024 * 1024; // 10MB
  return Number.parseInt(contentLength, 10) <= maxSize;
}

function sanitizeInput(obj: any): any {
  if (typeof obj === 'string') {
    // Basic XSS prevention
    return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return obj;
}

const apiMiddlewarePlugin: FastifyPluginAsync = async (fastify) => {
  // Request initialization hook
  fastify.addHook('onRequest', async (request, reply) => {
    const startTime = Date.now();
    const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize request metadata
    request.startTime = startTime;
    request.metadata = {
      id: requestId,
      timestamp: new Date(),
      ip: request.ip,
      userAgent: request.headers['user-agent'] || 'unknown',
      method: request.method,
      url: request.url,
      ...(request.user?.id ? { userId: request.user.id } : {}),
      ...(request.apiKey?.id ? { apiKeyId: request.apiKey.id } : {})
    };

    // Add request ID to headers
    reply.header('X-Request-ID', requestId);

    // Validate request size
    if (!validateRequestSize(request)) {
      throw fastify.httpErrors.payloadTooLarge('Request payload too large');
    }

    // Skip rate limiting for health checks and docs
    const skipPaths = ['/health', '/docs', '/'];
    if (skipPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    // Apply rate limiting
    const rateLimitKey = getRateLimitKey(request);
    const rateLimitConfig = getRateLimitConfig(request.url);
    const rateLimit = checkRateLimit(rateLimitKey, rateLimitConfig);

    // Add rate limit headers
    reply.header('X-RateLimit-Limit', rateLimitConfig.maxRequests);
    reply.header('X-RateLimit-Remaining', rateLimit.remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000));

    if (!rateLimit.allowed) {
      throw fastify.httpErrors.tooManyRequests('Rate limit exceeded');
    }
  });

  // Input sanitization hook
  fastify.addHook('preValidation', async (request) => {
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeInput(request.body);
    }

    if (request.query && typeof request.query === 'object') {
      request.query = sanitizeInput(request.query);
    }
  });

  // Response completion hook
  fastify.addHook('onSend', async (request, reply, payload) => {
    const processingTime = Date.now() - request.startTime;
    const responseSize = typeof payload === 'string' ? Buffer.byteLength(payload) : 0;

    // Update request metadata
    request.metadata.processingTime = processingTime;
    request.metadata.responseSize = responseSize;
    request.metadata.statusCode = reply.statusCode;

    // Add performance headers
    reply.header('X-Response-Time', `${processingTime}ms`);
    reply.header('X-Response-Size', responseSize);

    // Store analytics (implement proper storage in production)
    if (requestAnalytics.length > 10000) {
      requestAnalytics.shift(); // Remove oldest entry
    }
    requestAnalytics.push({ ...request.metadata });

    return payload;
  });

  // Decorate reply with API response methods
  fastify.decorateReply('apiSuccess', function <T>(this: FastifyReply, data: T, metadata?: Record<string, unknown>) {
    const response: ApiResponse<T> = {
      success: true,
      data,
      metadata: {
        requestId: this.request.metadata.id,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - this.request.startTime,
        version: PACKAGE_VERSION,
        ...metadata
      }
    };

    return this.send(response);
  });

  fastify.decorateReply('apiError', function (this: FastifyReply, code: string, message: string, statusCode = 500, details?: unknown) {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId: this.request.metadata.id,
        path: this.request.url
      }
    };

    return this.status(statusCode).send(response);
  });

  fastify.decorateReply('apiPaginated', function <T>(this: FastifyReply, data: T[], pagination: { page: number; limit: number; total: number }, metadata?: Record<string, unknown>) {
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    const response: ApiResponse<T[]> = {
      success: true,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      },
      metadata: {
        requestId: this.request.metadata.id,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - this.request.startTime,
        version: PACKAGE_VERSION,
        ...metadata
      }
    };

    return this.send(response);
  });

  // Analytics endpoints
  fastify.get('/api/v1/analytics/requests', {
    schema: {
      description: 'Get request analytics',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      querystring: Type.Object({
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 50 })),
        offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
        from: Type.Optional(Type.String({ format: 'date-time' })),
        to: Type.Optional(Type.String({ format: 'date-time' })),
        statusCode: Type.Optional(Type.Number()),
        method: Type.Optional(Type.String()),
        userId: Type.Optional(Type.String())
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Array(Type.Object({
            id: Type.String(),
            timestamp: Type.String(),
            method: Type.String(),
            url: Type.String(),
            statusCode: Type.Optional(Type.Number()),
            processingTime: Type.Optional(Type.Number()),
            responseSize: Type.Optional(Type.Number()),
            userId: Type.Optional(Type.String()),
            ip: Type.String()
          })),
          metadata: Type.Object({
            total: Type.Number(),
            limit: Type.Number(),
            offset: Type.Number()
          })
        })
      }
    }
  }, async (request, reply) => {
    await request.requireAuth(['admin', 'analytics:read']);

    const query = request.query as any;
    let filteredAnalytics = [...requestAnalytics];

    // Apply filters
    if (query.from) {
      const fromDate = new Date(query.from);
      filteredAnalytics = filteredAnalytics.filter(req => req.timestamp >= fromDate);
    }

    if (query.to) {
      const toDate = new Date(query.to);
      filteredAnalytics = filteredAnalytics.filter(req => req.timestamp <= toDate);
    }

    if (query.statusCode) {
      filteredAnalytics = filteredAnalytics.filter(req => req.statusCode === query.statusCode);
    }

    if (query.method) {
      filteredAnalytics = filteredAnalytics.filter(req => req.method === query.method);
    }

    if (query.userId) {
      filteredAnalytics = filteredAnalytics.filter(req => req.userId === query.userId);
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginatedData = filteredAnalytics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);

    return reply.apiSuccess(paginatedData, {
      total: filteredAnalytics.length,
      limit,
      offset
    });
  });

  fastify.get('/api/v1/analytics/summary', {
    schema: {
      description: 'Get analytics summary',
      tags: ['Analytics'],
      security: [{ bearerAuth: [] }],
      querystring: Type.Object({
        period: Type.Optional(Type.Union([
          Type.Literal('1h'),
          Type.Literal('24h'),
          Type.Literal('7d'),
          Type.Literal('30d')
        ], { default: '24h' }))
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            totalRequests: Type.Number(),
            averageResponseTime: Type.Number(),
            errorRate: Type.Number(),
            topEndpoints: Type.Array(Type.Object({
              path: Type.String(),
              count: Type.Number(),
              averageResponseTime: Type.Number()
            })),
            statusCodeDistribution: Type.Record(Type.String(), Type.Number()),
            rateLimitHits: Type.Number(),
            uniqueUsers: Type.Number()
          })
        })
      }
    }
  }, async (request, reply) => {
    await request.requireAuth(['admin', 'analytics:read']);

    const { period = '24h' } = request.query as { period?: '1h' | '24h' | '7d' | '30d' };
    const periodDurations: Record<'1h' | '24h' | '7d' | '30d', number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    const periodMs = periodDurations[period];

    const cutoff = new Date(Date.now() - periodMs);
    const recentRequests = requestAnalytics.filter(req => req.timestamp >= cutoff);

    // Calculate metrics
    const totalRequests = recentRequests.length;
    const averageResponseTime = totalRequests > 0
      ? recentRequests.reduce((sum, req) => sum + (req.processingTime || 0), 0) / totalRequests
      : 0;

    const errorRequests = recentRequests.filter(req => req.statusCode && req.statusCode >= 400);
    const errorRate = totalRequests > 0 ? errorRequests.length / totalRequests : 0;

    // Top endpoints
    const endpointCounts = new Map<string, { count: number; totalTime: number }>();
    recentRequests.forEach(req => {
      const path = req.url.split('?')[0]; // Remove query parameters
      const current = endpointCounts.get(path) || { count: 0, totalTime: 0 };
      current.count++;
      current.totalTime += req.processingTime || 0;
      endpointCounts.set(path, current);
    });

    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([path, stats]) => ({
        path,
        count: stats.count,
        averageResponseTime: stats.count > 0 ? stats.totalTime / stats.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Status code distribution
    const statusCodeDistribution: Record<string, number> = {};
    recentRequests.forEach(req => {
      if (req.statusCode) {
        const code = req.statusCode.toString();
        statusCodeDistribution[code] = (statusCodeDistribution[code] || 0) + 1;
      }
    });

    // Rate limit hits (429 status codes)
    const rateLimitHits = recentRequests.filter(req => req.statusCode === 429).length;

    // Unique users
    const uniqueUsers = new Set(recentRequests.map(req => req.userId).filter(Boolean)).size;

    return reply.apiSuccess({
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimal places
      topEndpoints,
      statusCodeDistribution,
      rateLimitHits,
      uniqueUsers
    });
  });
};

export default fp(apiMiddlewarePlugin, {
  name: 'api-middleware-plugin',
  fastify: '5.x'
});

export {
  type ApiResponse,
  type RequestMetadata,
  type RateLimitConfig,
  rateLimitStore,
  requestAnalytics
};