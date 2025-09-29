import 'dotenv-safe/config';

/**
 * Secure Environment Configuration
 * Uses dotenv-safe to validate required environment variables
 */

const env = process.env;

// Validate environment
const NODE_ENV = env['NODE_ENV'] || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';
const IS_TEST = NODE_ENV === 'test';

// Core server configuration
export const serverConfig = {
  env: NODE_ENV,
  isProduction: IS_PRODUCTION,
  isDevelopment: IS_DEVELOPMENT,
  isTest: IS_TEST,
  port: Number(env['PORT']) || 3002,
  host: env['HOST'] || '0.0.0.0',
  logLevel: env['LOG_LEVEL'] || 'info',
} as const;

// Database configuration
export const databaseConfig = {
  url: env['DATABASE_URL']!,
  poolMax: Number(env['DB_POOL_MAX']) || 20,
  idleTimeout: Number(env['DB_IDLE_TIMEOUT']) || 30,
  connectTimeout: Number(env['DB_CONNECT_TIMEOUT']) || 10,
  maxLifetime: Number(env['DB_MAX_LIFETIME']) || 3600,
  debug: env['DB_DEBUG'] === 'true',
  log: env['DB_LOG'] === 'true',
} as const;

// Security configuration
export const securityConfig = {
  jwtSecret: env['JWT_SECRET']!,
  corsOrigin: env['CORS_ORIGIN'] || '*',
  apiRateLimit: Number(env['API_RATE_LIMIT']) || 100,
  apiBaseUrl: env['API_BASE_URL'] || `http://localhost:3002`,

  // Security options based on environment
  rateLimiting: {
    windowMs: IS_PRODUCTION ? 60 * 1000 : 60 * 1000, // 1 minute
    maxRequests: IS_PRODUCTION ? 60 : 100, // Stricter in production
    skipOnError: !IS_PRODUCTION,
  },

  threatDetection: {
    enabled: true,
    blockSuspicious: IS_PRODUCTION,
    logAllRequests: IS_DEVELOPMENT,
  },

  inputValidation: {
    enabled: true,
    maxBodySize: '10mb',
    maxQueryStringSize: IS_PRODUCTION ? 1024 : 2048,
  },

  headers: {
    csp: IS_PRODUCTION
      ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none';"
      : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none';",
    hsts: IS_PRODUCTION,
    frameGuard: true,
  },
} as const;

// AI Services configuration
export const aiConfig = {
  openai: {
    apiKey: env['OPENAI_API_KEY'],
    embeddingsApiKey: env['OPENAI_EMBEDDINGS_API_KEY'] || env['EMBEDDING_API_KEY'],
  },
  anthropic: {
    apiKey: env['ANTHROPIC_API_KEY'],
    computerUseEnabled: env['COMPUTER_USE_ENABLED'] === 'true',
    computerUseSafetyMode: env['COMPUTER_USE_SAFETY_MODE'] || 'strict',
  },
  huggingface: {
    token: env['HUGGINGFACE_TOKEN'] || env['HUGGING_FACE_HUB_TOKEN'],
  },
} as const;

// External services configuration
export const externalConfig = {
  github: {
    token: env['GITHUB_TOKEN'],
  },
  deepgram: {
    apiKey: env['DEEPGRAM_API_KEY'],
  },
  search: {
    tavilyApiKey: env['TAVILY_API_KEY'],
    serpApiKey: env['SERPAPI_API_KEY'],
    braveApiKey: env['BRAVE_API_KEY'],
  },
  codacy: {
    apiToken: env['CODACY_API_TOKEN'],
  },
  context7: {
    apiKey: env['CONTEXT7_API_KEY'],
  },
  figma: {
    accessToken: env['FIGMA_ACCESS_TOKEN'],
  },
  everart: {
    apiKey: env['EVERART_API_KEY'],
  },
  gitlab: {
    token: env['GITLAB_TOKEN'],
  },
} as const;

// MCP Server configuration
export const mcpConfig = {
  configPath: env['MCP_CONFIG_PATH'],
  sequentialThinkingPath: env['MCP_SEQUENTIAL_THINKING_PATH'],
  logLevel: env['MCP_LOG_LEVEL'] || 'info',
} as const;

// Validation functions
export const validateConfig = () => {
  const errors: string[] = [];

  // Validate required AI provider
  if (!aiConfig.openai.apiKey && !aiConfig.anthropic.apiKey) {
    errors.push('At least one AI provider API key must be configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)');
  }

  // Validate JWT secret strength in production
  if (IS_PRODUCTION && securityConfig.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long in production');
  }

  // Validate CORS origin in production
  if (IS_PRODUCTION && securityConfig.corsOrigin === '*') {
    errors.push('CORS_ORIGIN must be set to specific origins in production (not *)');
  }

  // Validate database URL format
  if (!databaseConfig.url.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
};

// Export all configs
export const config = {
  server: serverConfig,
  database: databaseConfig,
  security: securityConfig,
  ai: aiConfig,
  external: externalConfig,
  mcp: mcpConfig,
  validate: validateConfig,
} as const;

export default config;