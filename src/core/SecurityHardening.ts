import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import crypto from 'node:crypto';
import validator from 'validator';

export interface SecurityConfig {
  rateLimit: {
    max: number;
    timeWindow: string;
    skipOnError: boolean;
    keyGenerator?: (request: FastifyRequest) => string;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    hsts: boolean;
    frameguard: boolean;
    noSniff: boolean;
  };
  input: {
    maxBodySize: number;
    sanitizeHtml: boolean;
    validateJson: boolean;
    maxStringLength: number;
  };
  auth: {
    jwtSecret: string;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  monitoring: {
    logSecurityEvents: boolean;
    alertOnSuspiciousActivity: boolean;
    ipWhitelist?: string[];
    ipBlacklist?: string[];
  };
}

interface SecurityEvent {
  type: 'rate_limit' | 'invalid_input' | 'auth_failure' | 'suspicious_activity';
  ip: string;
  userAgent?: string;
  endpoint: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

type FastifyRequestWithRoute = FastifyRequest & {
  routerPath?: string;
  routeOptions?: {
    url?: string;
  };
};

const getRequestEndpoint = (request: FastifyRequest): string => {
  const enhancedRequest = request as FastifyRequestWithRoute;
  return enhancedRequest.routerPath ?? enhancedRequest.routeOptions?.url ?? request.url ?? 'unknown';
};

export class SecurityHardening {
  private config: SecurityConfig;
  private securityEvents: SecurityEvent[] = [];
  private loginAttempts = new Map<string, { count: number; lastAttempt: Date; locked: boolean }>();
  private suspiciousIps = new Set<string>();

  constructor(config?: Partial<SecurityConfig>) {
    this.config = this.mergeConfig(config);
    this.setupCleanupTasks();
  }

  private mergeConfig(userConfig?: Partial<SecurityConfig>): SecurityConfig {
    const defaultConfig: SecurityConfig = {
      rateLimit: {
        max: 100, // requests per timeWindow
        timeWindow: '1 minute',
        skipOnError: true,
        keyGenerator: (request: FastifyRequest) => {
          return `${request.ip}-${getRequestEndpoint(request)}`;
        }
      },
      helmet: {
        contentSecurityPolicy: true,
        hsts: true,
        frameguard: true,
        noSniff: true
      },
      input: {
        maxBodySize: 10 * 1024 * 1024, // 10MB
        sanitizeHtml: true,
        validateJson: true,
        maxStringLength: 10000
      },
      auth: {
        jwtSecret: process.env['JWT_SECRET'] || crypto.randomBytes(64).toString('hex'),
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000 // 15 minutes
      },
      monitoring: {
        logSecurityEvents: true,
        alertOnSuspiciousActivity: true,
        ipWhitelist: [],
        ipBlacklist: []
      }
    };

    return this.deepMerge(defaultConfig, userConfig || {});
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Apply security hardening to Fastify server
   */
  public async applySecurity(server: FastifyInstance): Promise<void> {
    // Apply Helmet for security headers
    await server.register(fastifyHelmet, {
      contentSecurityPolicy: this.config.helmet.contentSecurityPolicy ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      } : false,
      hsts: this.config.helmet.hsts ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      } : false,
      frameguard: this.config.helmet.frameguard ? { action: 'deny' } : false,
      noSniff: this.config.helmet.noSniff
    });

    // Apply rate limiting
    await server.register(fastifyRateLimit, {
      max: this.config.rateLimit.max,
      timeWindow: this.config.rateLimit.timeWindow,
      skipOnError: this.config.rateLimit.skipOnError,
      keyGenerator: this.config.rateLimit.keyGenerator ?? ((request) => `${request.ip}-${getRequestEndpoint(request)}`),
      errorResponseBuilder: (request, context) => {
        this.logSecurityEvent({
          type: 'rate_limit',
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? 'unknown',
          endpoint: getRequestEndpoint(request),
          details: { limit: context.max, ttl: context.ttl },
          timestamp: new Date()
        });

        return {
          code: 'RATE_LIMIT_EXCEEDED',
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
          limit: context.max,
          remaining: 0,
          reset: new Date(Date.now() + context.ttl)
        };
      }
    });

    // Add security hooks
    this.addSecurityHooks(server);

    console.log('Security hardening applied successfully');
  }

  private addSecurityHooks(server: FastifyInstance): void {
    // Pre-validation hook for input sanitization
    server.addHook('preValidation', async (request, reply) => {
      // Check IP whitelist/blacklist
      if (this.config.monitoring.ipBlacklist?.includes(request.ip)) {
        reply.code(403).send({ error: 'Access denied' });
        return;
      }

      const whitelist = this.config.monitoring.ipWhitelist;
      if (whitelist && whitelist.length > 0 && !whitelist.includes(request.ip)) {
        reply.code(403).send({ error: 'Access denied' });
        return;
      }

      // Check for suspicious activity
      if (this.suspiciousIps.has(request.ip)) {
        reply.code(429).send({ error: 'Suspicious activity detected' });
        return;
      }

      // Validate and sanitize request body
      if (request.body) {
        try {
          this.validateAndSanitizeInput(request.body);
        } catch (error) {
          this.logSecurityEvent({
            type: 'invalid_input',
            ip: request.ip,
            userAgent: request.headers['user-agent'] ?? 'unknown',
            endpoint: getRequestEndpoint(request),
            details: { error: (error as Error).message },
            timestamp: new Date()
          });

          reply.code(400).send({
            error: 'Invalid input',
            message: 'Request contains invalid or potentially dangerous content'
          });
          return;
        }
      }

      // Validate headers
      this.validateRequestHeaders(request);
    });

    // Authentication hook
    server.addHook('onRequest', async (request, reply) => {
      // Skip auth for health endpoints and documentation
      if (request.url.startsWith('/health') ||
          request.url.startsWith('/docs') ||
          request.url === '/') {
        return;
      }

      // Check for auth header on protected endpoints
      if (request.url.startsWith('/api/')) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          reply.code(401).send({ error: 'Authentication required' });
          return;
        }

        try {
          // Validate JWT token (simplified - in production use proper JWT library)
          const token = authHeader.replace('Bearer ', '');
          this.validateJwtToken(token);
        } catch (error) {
          this.handleAuthFailure(request.ip, 'invalid_token');
          reply.code(401).send({ error: 'Invalid token' });
          return;
        }
      }
    });

    // Response security headers
    server.addHook('onSend', async (request, reply, payload) => {
      // Remove sensitive headers
      reply.removeHeader('x-powered-by');
      reply.removeHeader('server');

      // Add security headers
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');
      reply.header('X-XSS-Protection', '1; mode=block');
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

      return payload;
    });
  }

  private validateAndSanitizeInput(input: any): void {
    const sanitize = (obj: any, depth = 0): any => {
      if (depth > 10) {
        throw new Error('Input nesting too deep');
      }

      if (typeof obj === 'string') {
        if (obj.length > this.config.input.maxStringLength) {
          throw new Error('String too long');
        }

        // Check for potential XSS patterns
        if (this.containsXssPatterns(obj)) {
          throw new Error('Potentially dangerous content detected');
        }

        // Check for SQL injection patterns
        if (this.containsSqlInjectionPatterns(obj)) {
          throw new Error('Potentially dangerous content detected');
        }

        // Sanitize HTML if enabled
        if (this.config.input.sanitizeHtml) {
          return validator.escape(obj);
        }

        return obj;
      }

      if (Array.isArray(obj)) {
        if (obj.length > 1000) {
          throw new Error('Array too large');
        }
        return obj.map(item => sanitize(item, depth + 1));
      }

      if (obj && typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length > 100) {
          throw new Error('Object has too many properties');
        }

        const sanitized: any = {};
        for (const key of keys) {
          const sanitizedKey = validator.escape(key);
          sanitized[sanitizedKey] = sanitize(obj[key], depth + 1);
        }
        return sanitized;
      }

      return obj;
    };

    return sanitize(input);
  }

  private containsXssPatterns(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /vbscript:/gi,
      /data:text\/html/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  private containsSqlInjectionPatterns(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/gi,
      /(--|\/\*|\*\/)/g,
      /(\bxp_cmdshell\b)/gi,
      /(\bsp_executesql\b)/gi
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private validateRequestHeaders(request: FastifyRequest): void {
    const userAgent = request.headers['user-agent'];
    const contentType = request.headers['content-type'];

    // Check for suspicious user agents
    if (userAgent) {
      const suspiciousPatterns = [
        /sqlmap/i,
        /nikto/i,
        /nmap/i,
        /burp/i,
        /scanner/i,
        /crawler/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
        this.markSuspiciousIp(request.ip);
        throw new Error('Suspicious user agent detected');
      }
    }

    // Validate content type for POST/PUT requests
    if (request.method === 'POST' || request.method === 'PUT') {
      if (contentType && !contentType.includes('application/json')) {
        throw new Error('Invalid content type');
      }
    }
  }

  private validateJwtToken(token: string): boolean {
    // Simplified JWT validation - in production use proper JWT library
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }

      return true;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  private handleAuthFailure(ip: string, reason: string): void {
    const attempts = this.loginAttempts.get(ip) || { count: 0, lastAttempt: new Date(), locked: false };

    attempts.count++;
    attempts.lastAttempt = new Date();

    if (attempts.count >= this.config.auth.maxLoginAttempts) {
      attempts.locked = true;
      this.markSuspiciousIp(ip);

      // Auto-unlock after lockout duration
      setTimeout(() => {
        this.loginAttempts.delete(ip);
        this.suspiciousIps.delete(ip);
      }, this.config.auth.lockoutDuration);
    }

    this.loginAttempts.set(ip, attempts);

    this.logSecurityEvent({
      type: 'auth_failure',
      ip,
      endpoint: 'auth',
      details: { reason, attempts: attempts.count },
      timestamp: new Date()
    });
  }

  private markSuspiciousIp(ip: string): void {
    this.suspiciousIps.add(ip);

    this.logSecurityEvent({
      type: 'suspicious_activity',
      ip,
      endpoint: 'various',
      details: { reason: 'Multiple security violations' },
      timestamp: new Date()
    });

    // Auto-remove after 1 hour
    setTimeout(() => {
      this.suspiciousIps.delete(ip);
    }, 60 * 60 * 1000);
  }

  private logSecurityEvent(event: SecurityEvent): void {
    if (!this.config.monitoring.logSecurityEvents) return;

    this.securityEvents.push(event);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    console.warn(`Security Event [${event.type}]:`, {
      ip: event.ip,
      endpoint: event.endpoint,
      details: event.details,
      timestamp: event.timestamp
    });

    // Alert on suspicious activity
    if (this.config.monitoring.alertOnSuspiciousActivity &&
        (event.type === 'suspicious_activity' || event.type === 'invalid_input')) {
      this.alertAdministrators(event);
    }
  }

  private alertAdministrators(event: SecurityEvent): void {
    // In production, this would send alerts via email, Slack, etc.
    console.error(`🚨 SECURITY ALERT: ${event.type} from ${event.ip}`, event.details);
  }

  private setupCleanupTasks(): void {
    // Clean up old security events every hour
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.securityEvents = this.securityEvents.filter(event => event.timestamp > oneHourAgo);
    }, 60 * 60 * 1000);

    // Clean up old login attempts every 30 minutes
    setInterval(() => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      for (const [ip, attempts] of this.loginAttempts.entries()) {
        if (attempts.lastAttempt < thirtyMinutesAgo && !attempts.locked) {
          this.loginAttempts.delete(ip);
        }
      }
    }, 30 * 60 * 1000);
  }

  /**
   * Get security metrics and events
   */
  public getSecurityMetrics(): {
    events: SecurityEvent[];
    suspiciousIps: string[];
    loginAttempts: Array<{ip: string; count: number; locked: boolean}>;
    config: SecurityConfig;
  } {
    return {
      events: this.securityEvents.slice(-100), // Last 100 events
      suspiciousIps: Array.from(this.suspiciousIps),
      loginAttempts: Array.from(this.loginAttempts.entries()).map(([ip, data]) => ({
        ip,
        count: data.count,
        locked: data.locked
      })),
      config: this.config
    };
  }

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = this.deepMerge(this.config, newConfig);
  }

  /**
   * Manually block an IP address
   */
  public blockIp(ip: string, duration?: number): void {
    this.suspiciousIps.add(ip);

    if (duration) {
      setTimeout(() => {
        this.suspiciousIps.delete(ip);
      }, duration);
    }

    this.logSecurityEvent({
      type: 'suspicious_activity',
      ip,
      endpoint: 'manual',
      details: { reason: 'Manually blocked', duration },
      timestamp: new Date()
    });
  }

  /**
   * Unblock an IP address
   */
  public unblockIp(ip: string): void {
    this.suspiciousIps.delete(ip);
    this.loginAttempts.delete(ip);
  }
}

export const securityHardening = new SecurityHardening();