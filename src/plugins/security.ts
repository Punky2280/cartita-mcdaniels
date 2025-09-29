import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { securityService, type SecurityEvent } from '../core/SecurityService.js';
import { config } from '../config/environment.js';

const IS_PRODUCTION = config.server.isProduction;
type InputValidationType = Parameters<(typeof securityService)['validateAndSanitizeInput']>[1];

// Security plugin options
interface SecurityPluginOptions {
  rateLimit?: {
    windowMs?: number;
    maxRequests?: number;
    skipOnError?: boolean;
  };
  cors?: {
    origin?: string | string[] | boolean;
    credentials?: boolean;
  };
  headers?: {
    csp?: string;
    hsts?: boolean;
    frameGuard?: boolean;
  };
  inputValidation?: {
    enabled?: boolean;
    maxBodySize?: string;
    maxQueryStringSize?: number;
  };
  threatDetection?: {
    enabled?: boolean;
    blockSuspicious?: boolean;
    logAllRequests?: boolean;
  };
}

// Extend Fastify instance for security methods
declare module 'fastify' {
  interface FastifyInstance {
    security: {
      validateInput: (input: unknown, type: InputValidationType) => string;
      logSecurityEvent: (event: Partial<SecurityEvent>) => Promise<void>;
      checkThreat: (request: FastifyRequest) => { isSuspicious: boolean; threats: string[]; riskScore: number };
    };
  }
}

const securityPlugin: FastifyPluginAsync<SecurityPluginOptions> = async (fastify, opts) => {
  // Default options using centralized config
  const options: SecurityPluginOptions = {
    rateLimit: {
      windowMs: config.security.rateLimiting.windowMs,
      maxRequests: config.security.rateLimiting.maxRequests,
      skipOnError: config.security.rateLimiting.skipOnError,
    },
    cors: {
      origin: config.security.corsOrigin,
      credentials: true,
    },
    headers: {
      csp: config.security.headers.csp,
      hsts: config.security.headers.hsts,
      frameGuard: config.security.headers.frameGuard,
    },
    inputValidation: {
      enabled: config.security.inputValidation.enabled,
      maxBodySize: config.security.inputValidation.maxBodySize,
      maxQueryStringSize: config.security.inputValidation.maxQueryStringSize,
    },
    threatDetection: {
      enabled: config.security.threatDetection.enabled,
      blockSuspicious: config.security.threatDetection.blockSuspicious,
      logAllRequests: config.security.threatDetection.logAllRequests,
    },
    ...opts,
  };

  // === ENHANCED HELMET SECURITY HEADERS ===
  await fastify.register(helmet, {
    // Content Security Policy - Stricter in production
    contentSecurityPolicy: options.headers?.csp ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: IS_PRODUCTION ? ["'self'"] : ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: IS_PRODUCTION ? [] : undefined,
      },
    } : false,

    // HSTS - HTTP Strict Transport Security
    hsts: options.headers?.hsts ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    } : false,

    // X-Frame-Options
    frameguard: options.headers?.frameGuard ? {
      action: 'deny'
    } : false,

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection (legacy but still useful)
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin"
    },

    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: {
      policy: "same-origin"
    },

    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: {
      policy: "same-origin"
    },

    // Origin-Agent-Cluster
    originAgentCluster: true,

    // Permissions Policy (formerly Feature Policy)
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      bluetooth: [],
      accelerometer: [],
      gyroscope: [],
      magnetometer: [],
    },

    // Remove potentially sensitive headers
    hidePoweredBy: true,
  });

  // === ENHANCED RATE LIMITING ===
  await fastify.register(rateLimit, {
    max: options.rateLimit?.maxRequests ?? 100,
    timeWindow: options.rateLimit?.windowMs ?? 60000,
    skipOnError: options.rateLimit?.skipOnError ?? false,

    // Enhanced key generation with tiered limits
    keyGenerator: (request) => {
      // Different limits for different user types
      if (request.user?.id) {
        const userType = request.user.role || 'user';
        return `user:${userType}:${request.user.id}`;
      }
      if (request.apiKey?.id) {
        return `api:standard:${request.apiKey.id}`;
      }

      // IP-based limiting with subnet considerations
      const ip = request.ip;
      const forwardedFor = request.headers['x-forwarded-for'];
      const realIp = forwardedFor ? String(forwardedFor).split(',')[0].trim() : ip;
      return `ip:${realIp}`;
    },

    // Remove duplicate max property and keep the simple one

    // Enhanced error response with security headers
    errorResponseBuilder: (request, context) => {

      return {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
          retryAfter: Math.round(context.ttl / 1000),
        },
        timestamp: new Date().toISOString(),
      };
    },

    // Enhanced rate limit headers
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },


    onExceeding: async (request, key) => {
      await securityService.logSecurityEvent({
        type: 'rate_limit_exceeded',
        severity: 'warning',
        metadata: {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          url: request.url,
          method: request.method,
          key,
          timestamp: new Date().toISOString(),
        },
      }, request);
    },

  });

  // === INPUT VALIDATION ===
  if (options.inputValidation?.enabled) {
    const maxBodySizeSetting = options.inputValidation.maxBodySize ?? '10mb';
    const parsedBodySize = Number.parseInt(maxBodySizeSetting.replace(/mb/i, ''), 10);
    const bodySizeMb = Number.isNaN(parsedBodySize) ? 10 : parsedBodySize;
    const bodyLimitBytes = bodySizeMb * 1024 * 1024;

    // Body size limit
    fastify.addContentTypeParser('application/json', {
      parseAs: 'string',
      bodyLimit: bodyLimitBytes,
    }, (request, body, done) => {
      try {
        const json = JSON.parse(body as string);
        done(null, json);
      } catch (err) {
        done(new Error('Invalid JSON'), undefined);
      }
    });

    // Query string validation
    fastify.addHook('preValidation', async (request, reply) => {
      const queryString = request.url.split('?')[1];
      if (queryString && queryString.length > (options.inputValidation?.maxQueryStringSize || 1024)) {
        throw fastify.httpErrors.badRequest('Query string too long');
      }

      // Validate query parameters for malicious content
      for (const [key, value] of Object.entries(request.query as Record<string, any>)) {
        try {
          if (typeof value === 'string') {
            securityService.validateAndSanitizeInput(value, 'alphanumeric');
          }
        } catch (error) {
          throw fastify.httpErrors.badRequest(`Invalid query parameter: ${key}`);
        }
      }
    });
  }

  // === THREAT DETECTION ===
  if (options.threatDetection?.enabled) {
    fastify.addHook('onRequest', async (request, reply) => {
      // Analyze request for threats
      const analysis = securityService.analyzeRequest(request);

      // Log suspicious activity
      if (analysis.isSuspicious) {
        await securityService.logSecurityEvent({
          type: 'suspicious_activity',
          severity: analysis.riskScore > 8 ? 'critical' : 'warning',
          metadata: {
            threats: analysis.threats,
            riskScore: analysis.riskScore,
            url: request.url,
            method: request.method,
          },
        }, request);

        // Block if configured to do so
        if (options.threatDetection?.blockSuspicious && analysis.riskScore > 8) {
          throw fastify.httpErrors.forbidden('Suspicious activity detected');
        }
      }

      // Log all requests if enabled
      if (options.threatDetection?.logAllRequests) {
        await securityService.logSecurityEvent({
          type: 'data_access',
          severity: 'info',
          resource: 'api_endpoint',
          resourceId: request.url,
          metadata: {
            method: request.method,
            userAgent: request.headers['user-agent'],
          },
        }, request);
      }
    });
  }

  // === CORS HANDLING ===
  fastify.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    const allowedOrigins = Array.isArray(options.cors?.origin)
      ? options.cors.origin
      : [options.cors?.origin ?? '*'];

    if (allowedOrigins.includes('*')) {
      reply.header('Access-Control-Allow-Origin', '*');
    } else if (origin) {
      const matchedOrigin = allowedOrigins.find(allowed => allowed === origin);
      if (matchedOrigin) {
        reply.header('Access-Control-Allow-Origin', matchedOrigin);
      }
    }

    if (options.cors?.credentials) {
      reply.header('Access-Control-Allow-Credentials', 'true');
    }

    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
    reply.header('Access-Control-Max-Age', '86400'); // 24 hours
  });

  // Handle CORS preflight
  fastify.options('/*', async (request, reply) => {
    reply.status(204).send();
  });

  // === ADDITIONAL SECURITY HEADERS ===
  fastify.addHook('onSend', async (request, reply) => {
    // Prevent MIME type sniffing
    reply.header('X-Content-Type-Options', 'nosniff');

    // XSS Protection (legacy but still useful)
    reply.header('X-XSS-Protection', '1; mode=block');

    // Frame protection
    if (options.headers?.frameGuard) {
      reply.header('X-Frame-Options', 'DENY');
    }

    // Referrer policy
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove server header
    reply.removeHeader('X-Powered-By');

    // Cache control for sensitive endpoints
    if (request.url.includes('/auth/') || request.url.includes('/admin/')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }

    // HSTS for production
    if (IS_PRODUCTION) {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
  });

  // === ERROR HANDLING ===
  fastify.setErrorHandler(async (error, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    // Log all errors for monitoring
    fastify.log.error(error);

    // Handle validation errors specifically
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
          timestamp: new Date().toISOString(),
          path: request.url
        }
      });
    }

    // Log security-related errors
    if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
      await securityService.logSecurityEvent({
        type: 'permission_denied',
        severity: statusCode === 429 ? 'warning' : 'error',
        metadata: {
          statusCode,
          message: error.message,
          url: request.url,
          method: request.method,
        },
      }, request);
    }

    // Handle client errors (4xx)
    if (statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({
        error: {
          code: error.code || 'CLIENT_ERROR',
          message: error.message,
          timestamp: new Date().toISOString(),
          path: request.url
        }
      });
    }

    // Don't expose sensitive error details in production for server errors (5xx)
    if (IS_PRODUCTION) {
      const sanitizedError = {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred',
          timestamp: new Date().toISOString(),
          path: request.url
        }
      };

      reply.status(500).send(sanitizedError);
    } else {
      reply.status(statusCode).send({
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          path: request.url
        }
      });
    }
  });

  // === SECURITY API METHODS ===
  fastify.decorate('security', {
    validateInput: (input: unknown, type: InputValidationType) => {
      return securityService.validateAndSanitizeInput(input, type);
    },

    logSecurityEvent: async (event: Partial<SecurityEvent>) => {
      return securityService.logSecurityEvent(event);
    },

    checkThreat: (request: FastifyRequest) => {
      return securityService.analyzeRequest(request);
    },
  });

  // === SECURITY MONITORING ENDPOINTS ===
  fastify.get('/security/status', {
    schema: {
      description: 'Get security system status',
      tags: ['Security'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            config: { type: 'object' },
            auditEvents: { type: 'number' },
            threatRules: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    await request.requireAuth(['admin', 'security:read']);

    const config = securityService.getConfig();
    const auditEvents = securityService.getAuditEvents();

    return {
      status: 'active',
      config: {
        rateLimitEnabled: true,
        threatDetectionEnabled: options.threatDetection?.enabled,
        auditLoggingEnabled: config.audit.enableLogging,
      },
      auditEvents: auditEvents.length,
      threatRules: 4, // Number of active threat detection rules
    };
  });

  fastify.get('/security/audit-events', {
    schema: {
      description: 'Get recent security audit events',
      tags: ['Security'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 100 },
          severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  severity: { type: 'string' },
                  timestamp: { type: 'string' },
                  metadata: { type: 'object' },
                },
              },
            },
            total: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    await request.requireAuth(['admin', 'security:read']);

    const { limit = 100, severity } = request.query as any;
    let events = securityService.getAuditEvents();

    if (severity) {
      events = events.filter(event => event.severity === severity);
    }

    events = events.slice(-limit);

    return {
      events,
      total: events.length,
    };
  });
};

export default fp(securityPlugin, {
  name: 'security-plugin',
  fastify: '5.x',
  dependencies: [],
});