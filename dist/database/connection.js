import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import 'dotenv/config';
const env = process.env;
const databaseUrl = env['DATABASE_URL'];
if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
}
const parseIntegerEnv = (key, fallback) => {
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
const connectionConfig = {
    // Connection pooling settings
    max: parseIntegerEnv('DB_POOL_MAX', 20),
    idle_timeout: parseIntegerEnv('DB_IDLE_TIMEOUT', 30),
    connect_timeout: parseIntegerEnv('DB_CONNECT_TIMEOUT', 10),
    // SSL configuration for production
    ssl: isProduction ? 'require' : false,
    // Performance optimizations
    prepare: true,
    transform: {
        undefined: null
    },
    // Connection management
    max_lifetime: parseIntegerEnv('DB_MAX_LIFETIME', 3600),
    backoff: (attempt) => Math.min(attempt * 50, 1000),
    ...(shouldDebugDb ? { debug: console.debug } : {}),
    ...(isDevelopment ? { onnotice: console.log } : {})
};
// Create postgres client with optimized configuration
const client = postgres(databaseUrl, connectionConfig);
// Enhanced Drizzle configuration
export const db = drizzle(client, {
    schema,
    logger: shouldLogDb,
});
// Connection health check
export const checkDatabaseConnection = async () => {
    try {
        await client `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
};
// Graceful shutdown
export const closeDatabaseConnection = async () => {
    try {
        await client.end();
        console.log('Database connection closed gracefully');
    }
    catch (error) {
        console.error('Error closing database connection:', error);
    }
};
// Connection pool monitoring
export const getConnectionPoolStats = () => {
    const statsClient = client;
    return {
        totalConnections: statsClient.totalCount ?? 0,
        idleConnections: statsClient.idleCount ?? 0,
        reservedConnections: statsClient.reservedCount ?? 0,
    };
};
