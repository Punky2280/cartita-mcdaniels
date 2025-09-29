import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
})

// Security middleware
await fastify.register(helmet)
await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : true
})

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
})

// Health check route
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Aurora Interface API'
  }
})

// API routes
fastify.get('/api/v1/status', async (request, reply) => {
  return {
    message: 'Aurora Interface API is running',
    version: '1.0.0',
    agents: [
      'frontend-agent',
      'api-agent', 
      'documentation-agent',
      'sql-agent',
      'codewriter-agent',
      'backend-db-agent',
      'testing-agent'
    ]
  }
})

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ port, host })
    fastify.log.info(`🚀 Aurora Interface API running on http://localhost:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
