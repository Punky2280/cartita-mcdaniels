import Fastify from 'fastify';
import fastifySensible from '@fastify/sensible';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import 'dotenv/config';
// Import plugins
import databasePlugin from './plugins/database.js';
import corsPlugin from './plugins/cors.js';
import authPlugin from './plugins/auth.js';
import apiMiddlewarePlugin from './plugins/api-middleware.js';
import securityPlugin from './plugins/security.js';
// Import routes
import healthRoutes from './routes/health.js';
import agentRoutes from './routes/agents.js';
import aiRoutes from './routes/ai.js';
import context7Routes from './routes/context7.js';
import webhookRoutes from './routes/webhooks.js';
import chatRoutes from './routes/chat.js';
const env = process.env;
const isDevelopment = env['NODE_ENV'] === 'development';
const packageVersion = env['npm_package_version'] ?? '1.0.0';
const logLevel = env['LOG_LEVEL'] ?? 'info';
const server = Fastify({
    logger: isDevelopment ? {
        level: logLevel,
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname'
            }
        }
    } : {
        level: logLevel
    },
    trustProxy: true,
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId'
});
// Register sensible plugin for common utilities and error helpers
await server.register(fastifySensible);
// Register Swagger documentation
await server.register(fastifySwagger, {
    openapi: {
        openapi: '3.0.0',
        info: {
            title: 'Cartrita McDaniels Suarez API',
            description: 'Advanced AI Agent Management System',
            version: packageVersion
        },
        servers: [
            {
                url: env['API_BASE_URL'] ?? 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    }
});
await server.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => {
        return swaggerObject;
    },
    transformSpecificationClone: true
});
// Register plugins
await server.register(securityPlugin, {
    threatDetection: {
        enabled: true,
        blockSuspicious: !isDevelopment,
        logAllRequests: isDevelopment,
    },
    inputValidation: {
        enabled: true,
        maxBodySize: '10mb',
        maxQueryStringSize: 2048,
    },
});
await server.register(corsPlugin);
await server.register(databasePlugin);
await server.register(authPlugin);
await server.register(apiMiddlewarePlugin);
// Register routes
await server.register(healthRoutes);
await server.register(agentRoutes, { prefix: '/api/v1/agents' });
await server.register(aiRoutes, { prefix: '/api/v1/ai' });
await server.register(context7Routes, { prefix: '/api/v1/context7' });
await server.register(webhookRoutes, { prefix: '/api/v1/webhooks' });
await server.register(chatRoutes, { prefix: '/api/v1/chat' });
// Root route
server.get('/', async (_request, _reply) => {
    return {
        name: 'Cartrita McDaniels Suarez API',
        version: packageVersion,
        environment: env['NODE_ENV'] ?? 'development',
        documentation: '/docs',
        health: '/health'
    };
});
// Global error handler
server.setErrorHandler(async (error, request, reply) => {
    server.log.error(error);
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
    if (error.statusCode && error.statusCode < 500) {
        return reply.status(error.statusCode).send({
            error: {
                code: error.code || 'CLIENT_ERROR',
                message: error.message,
                timestamp: new Date().toISOString(),
                path: request.url
            }
        });
    }
    return reply.status(500).send({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal server error occurred',
            timestamp: new Date().toISOString(),
            path: request.url
        }
    });
});
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    server.log.info(`Received ${signal}, shutting down gracefully`);
    try {
        await server.close();
        server.log.info('Server closed successfully');
        process.exit(0);
    }
    catch (error) {
        server.log.error(`Error during shutdown: ${String(error)}`);
        process.exit(1);
    }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
const start = async () => {
    try {
        const portValue = env['PORT'];
        const port = portValue ? Number(portValue) : 3000;
        const host = env['HOST'] ?? '0.0.0.0';
        await server.listen({ port, host });
        server.log.info(`Server running on http://${host}:${port}`);
        server.log.info(`API Documentation available at http://${host}:${port}/docs`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
