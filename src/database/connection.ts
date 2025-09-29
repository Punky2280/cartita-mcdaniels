import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Options, type PostgresType } from 'postgres';
import * as schema from './schema';
import 'dotenv/config';

const env = process.env;
const databaseUrl = env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const parseIntegerEnv = (key: string, fallback: number): number => {
  const value = env[key];
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const isDevelopment = env['NODE_ENV'] === 'development';
const isProduction = env['NODE_ENV'] === 'production';
const shouldLogDb = isDevelopment && env['DB_LOG'] === 'true';
const shouldDebugDb = isDevelopment && env['DB_DEBUG'] === 'true';

type DatabaseTypeMap = Record<string, PostgresType<any>>;

const connectionConfig: Options<DatabaseTypeMap> = {
  // Connection pooling settings optimized for production
  max: parseIntegerEnv('DB_POOL_MAX', isProduction ? 25 : 10),
  idle_timeout: parseIntegerEnv('DB_IDLE_TIMEOUT', isProduction ? 30 : 20),
  connect_timeout: parseIntegerEnv('DB_CONNECT_TIMEOUT', isProduction ? 30 : 10),

  // SSL configuration for production
  ssl: isProduction ? 'require' : false,

  // Performance optimizations
  prepare: true,
  transform: {
    undefined: null
  },

  // Connection management with production optimization
  max_lifetime: parseIntegerEnv('DB_MAX_LIFETIME', isProduction ? 3600 : 1800),

  // Exponential backoff with jitter for production resilience
  backoff: (attempt: number) => {
    const baseDelay = Math.min(attempt * 100, 2000);
    const jitter = Math.random() * 100;
    return baseDelay + jitter;
  },

  // Additional production optimizations
  keep_alive: isProduction,

  // Retry configuration for production resilience
  fetch_array_types: false, // Disable unless needed for performance

  // Connection pool behavior
  connection: {
    application_name: `cartrita-${env['NODE_ENV']}-${process.pid}`,
    statement_timeout: 30000, // 30 seconds
    idle_in_transaction_session_timeout: 60000 // 1 minute
  },

  // Error handling and logging
  ...(shouldDebugDb ? { debug: console.debug } : {}),
  ...(isDevelopment ? { onnotice: console.log } : {}),

  // Production error handling
  onnotice: isProduction ? () => {} : console.log, // Suppress notices in production
  onparameter: isProduction ? () => {} : console.log // Suppress parameter logs in production
};

// Create postgres client with optimized configuration
const client = postgres(databaseUrl, connectionConfig);

// Enhanced Drizzle configuration
export const db = drizzle(client, {
  schema,
  logger: shouldLogDb,
});

// Connection health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await client.end();
    console.log('Database connection closed gracefully');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

// Connection pool monitoring
export const getConnectionPoolStats = () => {
  const statsClient = client as typeof client & {
    totalCount?: number;
    idleCount?: number;
    reservedCount?: number;
  };

  return {
    totalConnections: statsClient.totalCount ?? 0,
    idleConnections: statsClient.idleCount ?? 0,
    reservedConnections: statsClient.reservedCount ?? 0,
  };
};
