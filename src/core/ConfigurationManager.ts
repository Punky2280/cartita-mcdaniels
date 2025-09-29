import { readFile, access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';

/**
 * Enterprise Configuration Management System
 *
 * Provides centralized configuration management with:
 * - Environment-based configuration
 * - Type-safe configuration access
 * - Configuration validation
 * - Hot reloading support
 * - Secret management integration
 */

interface DatabaseConfig {
  url: string;
  ssl: boolean;
  poolMin: number;
  poolMax: number;
  idleTimeout: number;
  connectTimeout: number;
  maxLifetime: number;
  logging: boolean;
  debug: boolean;
}

interface SecurityConfig {
  jwtSecret: string;
  bcryptRounds: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  encryptionAlgorithm: string;
  keyLength: number;
  ivLength: number;
}

interface AIConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
  anthropic: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
  fallbackEnabled: boolean;
  retryAttempts: number;
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeout: number;
    halfOpenMaxRequests: number;
  };
}

interface ServerConfig {
  host: string;
  port: number;
  logLevel: string;
  trustProxy: boolean;
  requestIdHeader: string;
  cors: {
    origin: string[] | string | boolean;
    credentials: boolean;
    methods: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  compression: boolean;
  helmet: boolean;
}

interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  metrics: {
    system: boolean;
    application: boolean;
    database: boolean;
    gc: boolean;
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      responseTime: number;
      errorRate: number;
      cpuUsage: number;
      memoryUsage: number;
    };
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
}

interface MCPConfig {
  enabled: boolean;
  servers: Record<string, {
    command: string;
    args: string[];
    env?: Record<string, string>;
    timeout: number;
    retryAttempts: number;
    auth?: {
      type: 'api_key' | 'oauth' | 'basic';
      credentials: Record<string, string>;
    };
  }>;
  connectionPool: {
    maxConnections: number;
    idleTimeout: number;
    retryDelay: number;
  };
  security: {
    enableTLS: boolean;
    certificateValidation: boolean;
    allowedHosts: string[];
  };
}

export interface AppConfig {
  environment: 'development' | 'staging' | 'production' | 'test';
  version: string;
  database: DatabaseConfig;
  security: SecurityConfig;
  ai: AIConfig;
  server: ServerConfig;
  monitoring: MonitoringConfig;
  mcp: MCPConfig;
  features: {
    swaggerDocs: boolean;
    analytics: boolean;
    debugging: boolean;
    performanceMonitoring: boolean;
    securityAuditing: boolean;
  };
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, any> ? DeepPartial<T[K]> : T[K];
};

interface ConfigValidationRule {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  validator?: (value: any) => boolean;
  errorMessage?: string;
}

export class ConfigurationManager extends EventEmitter {
  private config: AppConfig | null = null;
  private watchers: Map<string, NodeJS.Timeout> = new Map();
  private lastModified: Map<string, Date> = new Map();
  private validationRules: ConfigValidationRule[] = [];

  constructor() {
    super();
    this.setupValidationRules();
  }

  /**
   * Load configuration from environment and files
   */
  async loadConfiguration(): Promise<AppConfig> {
    try {
      // Load base configuration from environment
      const baseConfig = this.loadFromEnvironment();

      // Load configuration overrides from files
      const fileConfig = await this.loadFromFiles();

      const environmentOverrides = this.getEnvironmentConfig();
      const mergedConfig = this.mergeConfigurations(
        this.mergeConfigurations(baseConfig, environmentOverrides),
        fileConfig
      );

      // Validate configuration
      this.validateConfiguration(mergedConfig);

      this.config = mergedConfig;
      this.emit('configurationLoaded', mergedConfig);
      return mergedConfig;

    } catch (error) {
      this.emit('configurationError', error);
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  /**
   * Get configuration value by path
   */
  get<T = any>(path: string): T {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }

    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value === null || value === undefined) {
        throw new Error(`Configuration path '${path}' not found`);
      }
      value = value[key];
    }

    return value as T;
  }

  /**
   * Get configuration value with fallback
   */
  getOrDefault<T>(path: string, defaultValue: T): T {
    try {
      return this.get<T>(path);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Check if configuration path exists
   */
  has(path: string): boolean {
    try {
      this.get(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the full configuration object
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }
    return { ...this.config };
  }

  /**
   * Validate current configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    if (!this.config) {
      return { valid: false, errors: ['Configuration not loaded'] };
    }

    return this.validateConfiguration(this.config);
  }

  /**
   * Start watching configuration files for changes
   */
  async startWatching(): Promise<void> {
    const configPaths = [
      '.env',
      '.env.local',
      'config/production.json',
      'config/staging.json',
      'config/development.json'
    ];

    for (const configPath of configPaths) {
      try {
        await access(configPath, constants.F_OK);
        this.watchFile(configPath);
      } catch {
        // File doesn't exist, skip
      }
    }

    this.emit('watchingStarted', configPaths);
  }

  /**
   * Stop watching configuration files
   */
  stopWatching(): void {
    for (const [path, watcher] of this.watchers) {
      clearInterval(watcher);
    }
    this.watchers.clear();
    this.lastModified.clear();

    this.emit('watchingStopped');
  }

  /**
   * Reload configuration from all sources
   */
  async reload(): Promise<AppConfig> {
    const previousConfig = this.config;

    try {
      this.config = await this.loadConfiguration();
      this.emit('configurationReloaded', {
        previous: previousConfig,
        current: this.config
      });
      return this.config;
    } catch (error) {
      // Restore previous configuration on error
      this.config = previousConfig;
      throw error;
    }
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(): DeepPartial<AppConfig> {
    const env = process.env['NODE_ENV'] || 'development';

    switch (env) {
      case 'production':
        return this.getProductionConfig();
      case 'staging':
        return this.getStagingConfig();
      case 'test':
        return this.getTestConfig();
      default:
        return this.getDevelopmentConfig();
    }
  }

  private loadFromEnvironment(): AppConfig {
    const env = process.env;

    return {
      environment: (env['NODE_ENV'] || 'development') as AppConfig['environment'],
      version: env['npm_package_version'] || '1.0.0',

      database: {
        url: env['DATABASE_URL'] || 'postgresql://localhost/cartrita',
        ssl: env['DB_SSL'] === 'true',
        poolMin: parseInt(env['DB_POOL_MIN'] || '5', 10),
        poolMax: parseInt(env['DB_POOL_MAX'] || '20', 10),
        idleTimeout: parseInt(env['DB_IDLE_TIMEOUT'] || '30', 10),
        connectTimeout: parseInt(env['DB_CONNECT_TIMEOUT'] || '10', 10),
        maxLifetime: parseInt(env['DB_MAX_LIFETIME'] || '3600', 10),
        logging: env['DB_LOG'] === 'true',
        debug: env['DB_DEBUG'] === 'true'
      },

      security: {
        jwtSecret: env['JWT_SECRET'] || 'development-secret-change-in-production',
        bcryptRounds: parseInt(env['BCRYPT_ROUNDS'] || '12', 10),
        sessionTimeout: parseInt(env['SESSION_TIMEOUT'] || '86400000', 10),
        maxLoginAttempts: parseInt(env['MAX_LOGIN_ATTEMPTS'] || '5', 10),
        lockoutDuration: parseInt(env['LOCKOUT_DURATION'] || '900000', 10),
        encryptionAlgorithm: env['ENCRYPTION_ALGORITHM'] || 'aes-256-gcm',
        keyLength: parseInt(env['ENCRYPTION_KEY_LENGTH'] || '32', 10),
        ivLength: parseInt(env['ENCRYPTION_IV_LENGTH'] || '16', 10)
      },

      ai: {
        openai: {
          apiKey: env['OPENAI_API_KEY'] || '',
          model: env['OPENAI_MODEL'] || 'gpt-4o',
          maxTokens: parseInt(env['OPENAI_MAX_TOKENS'] || '4000', 10),
          temperature: parseFloat(env['OPENAI_TEMPERATURE'] || '0.7'),
          timeout: parseInt(env['OPENAI_TIMEOUT'] || '30000', 10)
        },
        anthropic: {
          apiKey: env['ANTHROPIC_API_KEY'] || '',
          model: env['ANTHROPIC_MODEL'] || 'claude-3-5-sonnet-20241022',
          maxTokens: parseInt(env['ANTHROPIC_MAX_TOKENS'] || '4000', 10),
          temperature: parseFloat(env['ANTHROPIC_TEMPERATURE'] || '0.7'),
          timeout: parseInt(env['ANTHROPIC_TIMEOUT'] || '30000', 10)
        },
        fallbackEnabled: env['AI_FALLBACK_ENABLED'] !== 'false',
        retryAttempts: parseInt(env['AI_RETRY_ATTEMPTS'] || '3', 10),
        circuitBreaker: {
          failureThreshold: parseInt(env['AI_CIRCUIT_BREAKER_THRESHOLD'] || '5', 10),
          recoveryTimeout: parseInt(env['AI_CIRCUIT_BREAKER_RECOVERY'] || '60000', 10),
          halfOpenMaxRequests: parseInt(env['AI_CIRCUIT_BREAKER_HALF_OPEN'] || '3', 10)
        }
      },

      server: {
        host: env['HOST'] || '0.0.0.0',
        port: parseInt(env['PORT'] || '3000', 10),
        logLevel: env['LOG_LEVEL'] || 'info',
        trustProxy: env['TRUST_PROXY'] === 'true',
        requestIdHeader: env['REQUEST_ID_HEADER'] || 'x-request-id',
        cors: {
          origin: env['CORS_ORIGIN']?.split(',') || true,
          credentials: env['CORS_CREDENTIALS'] !== 'false',
          methods: env['CORS_METHODS']?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
        },
        rateLimit: {
          windowMs: parseInt(env['RATE_LIMIT_WINDOW'] || '60000', 10),
          maxRequests: parseInt(env['RATE_LIMIT_MAX'] || '100', 10),
          skipSuccessfulRequests: env['RATE_LIMIT_SKIP_SUCCESS'] === 'true'
        },
        compression: env['COMPRESSION'] !== 'false',
        helmet: env['HELMET'] !== 'false'
      },

      monitoring: {
        enabled: env['MONITORING_ENABLED'] !== 'false',
        interval: parseInt(env['MONITORING_INTERVAL'] || '10000', 10),
        metrics: {
          system: env['METRICS_SYSTEM'] !== 'false',
          application: env['METRICS_APPLICATION'] !== 'false',
          database: env['METRICS_DATABASE'] !== 'false',
          gc: env['METRICS_GC'] !== 'false'
        },
        alerts: {
          enabled: env['ALERTS_ENABLED'] !== 'false',
          thresholds: {
            responseTime: parseInt(env['ALERT_RESPONSE_TIME'] || '1000', 10),
            errorRate: parseFloat(env['ALERT_ERROR_RATE'] || '0.05'),
            cpuUsage: parseInt(env['ALERT_CPU_USAGE'] || '80', 10),
            memoryUsage: parseInt(env['ALERT_MEMORY_USAGE'] || '80', 10)
          }
        },
        healthChecks: {
          enabled: env['HEALTH_CHECKS_ENABLED'] !== 'false',
          interval: parseInt(env['HEALTH_CHECK_INTERVAL'] || '30000', 10),
          timeout: parseInt(env['HEALTH_CHECK_TIMEOUT'] || '5000', 10)
        }
      },

      mcp: {
        enabled: env['MCP_ENABLED'] !== 'false',
        servers: this.parseMCPServers(env['MCP_SERVERS']),
        connectionPool: {
          maxConnections: parseInt(env['MCP_MAX_CONNECTIONS'] || '10', 10),
          idleTimeout: parseInt(env['MCP_IDLE_TIMEOUT'] || '300000', 10),
          retryDelay: parseInt(env['MCP_RETRY_DELAY'] || '1000', 10)
        },
        security: {
          enableTLS: env['MCP_TLS'] !== 'false',
          certificateValidation: env['MCP_CERT_VALIDATION'] !== 'false',
          allowedHosts: env['MCP_ALLOWED_HOSTS']?.split(',') || []
        }
      },

      features: {
        swaggerDocs: env['SWAGGER_DOCS'] !== 'false',
        analytics: env['ANALYTICS'] !== 'false',
        debugging: env['NODE_ENV'] === 'development',
        performanceMonitoring: env['PERFORMANCE_MONITORING'] !== 'false',
        securityAuditing: env['SECURITY_AUDITING'] !== 'false'
      }
    };
  }

  private async loadFromFiles(): Promise<DeepPartial<AppConfig>> {
    const env = process.env['NODE_ENV'] || 'development';
    const configFiles = [
      `config/${env}.json`,
      'config/local.json'
    ];

  let fileConfig: DeepPartial<AppConfig> = {};

    for (const configFile of configFiles) {
      try {
        const content = await readFile(configFile, 'utf-8');
  const parsedConfig = JSON.parse(content) as DeepPartial<AppConfig>;
        fileConfig = this.mergeConfigurations(fileConfig, parsedConfig);
      } catch {
        // File doesn't exist or invalid JSON, skip
      }
    }

    return fileConfig;
  }

  private mergeConfigurations<T>(base: T, override: DeepPartial<T>): T {
    if (!override) {
      return base;
    }

    const result: any = Array.isArray(base) ? [...base] : { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) {
        continue;
      }

      const currentValue = (result as Record<string, unknown>)[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedBase = currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)
          ? currentValue
          : {};
        (result as Record<string, unknown>)[key] = this.mergeConfigurations(nestedBase, value as DeepPartial<typeof nestedBase>);
      } else {
        (result as Record<string, unknown>)[key] = value as unknown;
      }
    }

    return result;
  }

  private validateConfiguration(config: AppConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of this.validationRules) {
      const value = this.getValueByPath(config, rule.path);

      if (rule.required && (value === undefined || value === null)) {
        errors.push(rule.errorMessage || `Required configuration '${rule.path}' is missing`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (!this.validateType(value, rule.type)) {
          errors.push(rule.errorMessage || `Configuration '${rule.path}' must be of type ${rule.type}`);
        }

        if (rule.validator && !rule.validator(value)) {
          errors.push(rule.errorMessage || `Configuration '${rule.path}' failed custom validation`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private setupValidationRules(): void {
    this.validationRules = [
      // Database rules
      { path: 'database.url', type: 'string', required: true },
      { path: 'database.poolMin', type: 'number', required: true, validator: (v) => v >= 0 },
      { path: 'database.poolMax', type: 'number', required: true, validator: (v) => v > 0 },

      // Security rules
      { path: 'security.jwtSecret', type: 'string', required: true,
        validator: (v) => v.length >= 32,
        errorMessage: 'JWT secret must be at least 32 characters long' },
      { path: 'security.bcryptRounds', type: 'number', required: true,
        validator: (v) => v >= 10 && v <= 15,
        errorMessage: 'Bcrypt rounds must be between 10 and 15' },

      // AI rules
      { path: 'ai.openai.apiKey', type: 'string', required: false },
      { path: 'ai.anthropic.apiKey', type: 'string', required: false },

      // Server rules
      { path: 'server.port', type: 'number', required: true,
        validator: (v) => v > 0 && v <= 65535,
        errorMessage: 'Server port must be between 1 and 65535' },
      { path: 'server.host', type: 'string', required: true }
    ];
  }

  private getValueByPath(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  private async watchFile(filePath: string): Promise<void> {
    // Simple polling-based file watching
    const watcher = setInterval(async () => {
      try {
        const stats = await readFile(filePath);
        const lastMod = this.lastModified.get(filePath);
        const currentMod = new Date();

        if (!lastMod || currentMod > lastMod) {
          this.lastModified.set(filePath, currentMod);
          this.emit('configurationFileChanged', filePath);

          // Auto-reload configuration
          try {
            await this.reload();
          } catch (error) {
            this.emit('reloadError', error);
          }
        }
      } catch {
        // File might have been deleted
      }
    }, 1000);

    this.watchers.set(filePath, watcher);
  }

  private parseMCPServers(serversEnv?: string): MCPConfig['servers'] {
    if (!serversEnv) return {};

    try {
      return JSON.parse(serversEnv);
    } catch {
      return {};
    }
  }

  private getDevelopmentConfig(): DeepPartial<AppConfig> {
    return {
      database: {
        logging: true,
        debug: true
      },
      server: {
        cors: {
          origin: true,
          credentials: true
        }
      },
      features: {
        debugging: true,
        swaggerDocs: true
      }
    };
  }

  private getStagingConfig(): DeepPartial<AppConfig> {
    return {
      database: {
        ssl: true,
        logging: false,
        debug: false
      },
      features: {
        debugging: false,
        swaggerDocs: true
      }
    };
  }

  private getProductionConfig(): DeepPartial<AppConfig> {
    return {
      database: {
        ssl: true,
        logging: false,
        debug: false
      },
      server: {
        compression: true,
        helmet: true
      },
      features: {
        debugging: false,
        swaggerDocs: false
      }
    };
  }

  private getTestConfig(): DeepPartial<AppConfig> {
    return {
      database: {
        logging: false,
        debug: false
      },
      monitoring: {
        enabled: false
      },
      features: {
        debugging: false,
        swaggerDocs: false,
        analytics: false,
        performanceMonitoring: false,
        securityAuditing: false
      }
    };
  }
}

// Global configuration manager instance
export const configManager = new ConfigurationManager();