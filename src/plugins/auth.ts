import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// JWT token payload interfaces
interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
  permissions: string[];
  iat: number; // Issued at
  exp: number; // Expires at
  scope?: string[];
  jti?: string; // JWT ID for tracking
  type: 'access' | 'refresh';
}

interface RefreshTokenPayload extends Omit<TokenPayload, 'type' | 'exp'> {
  type: 'refresh';
  exp: number;
  tokenId: string;
}

interface OAuth2Client {
  id: string;
  secret: string;
  name: string;
  redirectUris: string[];
  allowedGrants: ('authorization_code' | 'client_credentials' | 'refresh_token')[];
  scopes: string[];
  isActive: boolean;
  createdAt: Date;
}

interface OAuth2AuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  expiresAt: Date;
  challenge?: string;
  challengeMethod?: 'S256' | 'plain';
}

interface OAuth2AccessToken {
  token: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: Date;
  refreshToken?: string;
}

// Define authentication interfaces
interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  scope?: string[];
}

interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  userId: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  isActive: boolean;
}

// Rate limiting per API key
interface RateLimit {
  windowMs: number;
  maxRequests: number;
  currentCount: number;
  resetTime: number;
}

// Extend Fastify request to include authenticated user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    apiKey?: ApiKey;
    requireAuth(requiredPermissions?: string[]): Promise<AuthUser>;
    requireScope(requiredScopes: string[]): Promise<AuthUser>;
    checkPermission(permission: string): boolean;
  }
}

// In-memory stores (replace with database in production)
const apiKeys = new Map<string, ApiKey>();
const rateLimits = new Map<string, RateLimit>();
const blacklistedTokens = new Set<string>();
const refreshTokens = new Map<string, RefreshTokenPayload>();
const oauth2Clients = new Map<string, OAuth2Client>();
const authorizationCodes = new Map<string, OAuth2AuthorizationCode>();
const accessTokens = new Map<string, OAuth2AccessToken>();

const env = process.env;

function parseIntegerEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

// Configuration
const NODE_ENV = env['NODE_ENV'] ?? 'development';
const AUTH_CONFIG = {
  JWT_SECRET: env['JWT_SECRET'] ?? 'development-secret-key',
  API_KEY_RATE_LIMIT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: parseIntegerEnv(env['API_RATE_LIMIT'], 100)
  },
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  DEVELOPMENT_MODE: NODE_ENV === 'development',
  NODE_ENV
} as const;

// Utility functions
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function generateApiKey(): string {
  return `cms_${randomBytes(32).toString('hex')}`;
}

function createToken(payload: TokenPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHash('sha256')
    .update(`${header}.${body}.${AUTH_CONFIG.JWT_SECRET}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function createAccessToken(userId: string, email: string, role: string, permissions: string[], scopes: string[] = []): { accessToken: string; refreshToken: string; expiresIn: number } {
  const now = Date.now();
  const accessTokenExpiry = now + (15 * 60 * 1000); // 15 minutes
  const refreshTokenExpiry = now + (7 * 24 * 60 * 60 * 1000); // 7 days

  const jti = `jwt_${now}_${Math.random().toString(36).substr(2, 9)}`;
  const tokenId = `ref_${now}_${Math.random().toString(36).substr(2, 9)}`;

  const accessPayload: TokenPayload = {
    sub: userId,
    email,
    role,
    permissions,
    scope: scopes,
    iat: now,
    exp: accessTokenExpiry,
    jti,
    type: 'access'
  };

  const refreshPayload: RefreshTokenPayload = {
    sub: userId,
    email,
    role,
    permissions,
    scope: scopes,
    iat: now,
    exp: refreshTokenExpiry,
    jti,
    type: 'refresh',
    tokenId
  };

  const accessToken = createToken(accessPayload);
  const refreshToken = createToken(refreshPayload);

  // Store refresh token
  refreshTokens.set(tokenId, refreshPayload);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // 15 minutes in seconds
  };
}

function generateAuthorizationCode(): string {
  return `code_${randomBytes(32).toString('hex')}`;
}

function generateClientCredentials(): { clientId: string; clientSecret: string } {
  return {
    clientId: `client_${randomBytes(16).toString('hex')}`,
    clientSecret: randomBytes(32).toString('hex')
  };
}

function validateRedirectUri(redirectUri: string, allowedUris: string[]): boolean {
  return allowedUris.some(allowed => {
    if (allowed === redirectUri) return true;
    // Allow wildcards for localhost in development
    if (AUTH_CONFIG.DEVELOPMENT_MODE && allowed.includes('localhost')) {
      const allowedUrl = new URL(allowed);
      const redirectUrl = new URL(redirectUri);
      return allowedUrl.hostname === redirectUrl.hostname &&
             allowedUrl.protocol === redirectUrl.protocol;
    }
    return false;
  });
}

function validatePKCE(challenge: string, verifier: string, method: 'S256' | 'plain'): boolean {
  if (method === 'plain') {
    return challenge === verifier;
  }

  if (method === 'S256') {
    const hash = createHash('sha256').update(verifier).digest('base64url');
    return challenge === hash;
  }

  return false;
}

function verifyToken(token: string): TokenPayload | null {
  try {
    if (blacklistedTokens.has(token)) {
      return null;
    }

    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = createHash('sha256')
      .update(`${header}.${body}.${AUTH_CONFIG.JWT_SECRET}`)
      .digest('base64url');

    if (!timingSafeEqual(Buffer.from(signature, 'base64url'), Buffer.from(expectedSignature, 'base64url'))) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString());

    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function checkRateLimit(apiKeyId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(apiKeyId);

  if (!limit || now > limit.resetTime) {
    // Create new window
    rateLimits.set(apiKeyId, {
      windowMs: AUTH_CONFIG.API_KEY_RATE_LIMIT.windowMs,
      maxRequests: AUTH_CONFIG.API_KEY_RATE_LIMIT.maxRequests,
      currentCount: 1,
      resetTime: now + AUTH_CONFIG.API_KEY_RATE_LIMIT.windowMs
    });
    return true;
  }

  if (limit.currentCount >= limit.maxRequests) {
    return false;
  }

  limit.currentCount++;
  return true;
}

// Initialize development API keys
if (AUTH_CONFIG.DEVELOPMENT_MODE) {
  const devApiKey: ApiKey = {
    id: 'dev-key-1',
    name: 'Development Key',
    keyHash: hashApiKey('development-token'),
    userId: 'dev-user',
    permissions: ['*'], // All permissions
    createdAt: new Date(),
    isActive: true
  };
  apiKeys.set(devApiKey.keyHash, devApiKey);
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate request with auth methods
  fastify.decorateRequest('requireAuth', async function (this: FastifyRequest, requiredPermissions: string[] = []) {
    if (!this.user) {
      throw fastify.httpErrors.unauthorized('Authentication required');
    }

    // Check permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(perm =>
        this.user?.permissions.includes('*') || this.user?.permissions.includes(perm)
      );

      if (!hasPermission) {
        throw fastify.httpErrors.forbidden('Insufficient permissions');
      }
    }

    return this.user;
  });

  fastify.decorateRequest('requireScope', async function (this: FastifyRequest, requiredScopes: string[]) {
    if (!this.user) {
      throw fastify.httpErrors.unauthorized('Authentication required');
    }

    const userScopes = this.user.scope || [];
    const hasScope = requiredScopes.every(scope => userScopes.includes(scope));

    if (!hasScope) {
      throw fastify.httpErrors.forbidden('Insufficient scope');
    }

    return this.user;
  });

  fastify.decorateRequest('checkPermission', function (this: FastifyRequest, permission: string): boolean {
    if (!this.user) return false;
    return this.user.permissions.includes('*') || this.user.permissions.includes(permission);
  });

  // Authentication hook
  fastify.addHook('onRequest', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const apiKeyHeader = request.headers['x-api-key'] as string;

    // Skip auth for health endpoints and documentation
    const skipAuthPaths = ['/health', '/docs', '/'];
    if (skipAuthPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    try {
      // Try JWT Bearer token first
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        if (payload) {
          request.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            permissions: payload.permissions,
            ...(payload.scope ? { scope: payload.scope } : {})
          };
          return;
        }
      }

      // Try API key authentication
      if (apiKeyHeader) {
        const keyHash = hashApiKey(apiKeyHeader);
        const apiKey = apiKeys.get(keyHash);

        if (apiKey && apiKey.isActive) {
          // Check expiration
          if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
            throw fastify.httpErrors.unauthorized('API key expired');
          }

          // Check rate limit
          if (!checkRateLimit(apiKey.id)) {
            throw fastify.httpErrors.tooManyRequests('Rate limit exceeded');
          }

          // Update last used
          apiKey.lastUsed = new Date();

          request.apiKey = apiKey;
          request.user = {
            id: apiKey.userId,
            email: '', // API keys don't have email
            role: 'api-user',
            permissions: apiKey.permissions
          };

          return;
        }
      }

      // Development fallback
      if (AUTH_CONFIG.DEVELOPMENT_MODE && (authHeader === 'Bearer development-token' || apiKeyHeader === 'development-token')) {
        request.user = {
          id: 'dev-user',
          email: 'dev@example.com',
          role: 'admin',
          permissions: ['*']
        };
        return;
      }

    } catch (error) {
      fastify.log.warn(`Authentication error: ${String(error)}`);
      // Let the request continue without authentication
      // Individual routes can require auth as needed
    }
  });

  // Add security headers
  fastify.addHook('onSend', async (_request, reply) => {
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (AUTH_CONFIG.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  });

  // Auth management routes
  fastify.post('/auth/token', {
    schema: {
      description: 'Generate authentication token',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['userId', 'email'],
        properties: {
          userId: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', default: 'user' },
          permissions: { type: 'array', items: { type: 'string' }, default: [] },
          expiresIn: { type: 'number', default: AUTH_CONFIG.TOKEN_EXPIRY }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            expiresAt: { type: 'string' },
            tokenType: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { userId, email, role = 'user', permissions = [], expiresIn = AUTH_CONFIG.TOKEN_EXPIRY } = request.body as any;

    const now = Date.now();
    const payload: TokenPayload = {
      sub: userId,
      email,
      role,
      permissions,
      iat: now,
      exp: now + expiresIn,
      type: 'access'
    };

    const token = createToken(payload);

    return {
      token,
      expiresAt: new Date(payload.exp).toISOString(),
      tokenType: 'Bearer'
    };
  });

  fastify.post('/auth/api-key', {
    schema: {
      description: 'Generate API key',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' }, default: [] },
          expiresIn: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            key: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
            expiresAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    await request.requireAuth(['admin', 'api-key:create']);

    const { name, permissions = [], expiresIn } = request.body as any;
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn) : undefined;

    const keyData: ApiKey = {
      id: `key_${Date.now()}_${randomBytes(8).toString('hex')}`,
      name,
      keyHash,
      userId: request.user!.id,
      permissions,
      createdAt: new Date(),
      isActive: true,
      ...(expiresAt ? { expiresAt } : {})
    };

    apiKeys.set(keyHash, keyData);

    return {
      id: keyData.id,
      name: keyData.name,
      key: apiKey, // Only returned once
      permissions: keyData.permissions,
      expiresAt: keyData.expiresAt?.toISOString()
    };
  });

  fastify.delete('/auth/token', {
    schema: {
      description: 'Revoke authentication token',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      blacklistedTokens.add(token);
    }

    return { success: true, message: 'Token revoked' };
  });
};

export default fp(authPlugin, {
  name: 'auth-plugin',
  fastify: '5.x'
});

// Export utilities for use in other modules
export {
  type AuthUser,
  type ApiKey,
  hashApiKey,
  generateApiKey,
  createToken,
  verifyToken
};