# Cartrita AI Agents Platform - API Documentation

## Overview

The Cartrita McDaniels Suarez AI Agents platform provides a comprehensive REST API for managing AI agents, multi-agent workflows, and agent orchestration. Built with Fastify and TypeScript, this API offers high performance and type-safe operations for enterprise AI applications.

**Key Features:**
- Multi-agent orchestration and workflow management
- Real-time agent execution with streaming responses
- Vector similarity search for intelligent content retrieval
- Comprehensive authentication and authorization
- OpenAPI 3.0 specification with interactive documentation
- Built-in rate limiting and security features

## Base URLs

```
Development: http://localhost:3000/api/v1
Production: https://api.cartrita.com/v1
Documentation: http://localhost:3000/docs
```

## Architecture

The API follows RESTful conventions with these core resources:
- **Agents**: AI agent management and execution
- **Workflows**: Multi-step agent orchestration
- **Context7**: Advanced agent collaboration features
- **Health**: System monitoring and diagnostics

## Authentication

All API endpoints require authentication using Bearer tokens.

### Getting an Access Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

### Using the Token

Include the token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     https://your-domain.com/api/agents
```

## API Endpoints

### Agents Management

#### List Agents

```http
GET /api/v1/agents
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of results to return (1-100, default: 10)
- `type` (optional): Filter by agent type (`research`, `code`, `documentation`, `analysis`, `orchestrator`, `custom`)
- `status` (optional): Filter by status (`active`, `inactive`, `paused`, `error`, `maintenance`)
- `search` (optional): Search in agent names and descriptions

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     "https://api.cartrita.com/v1/agents?page=1&limit=10&type=research&status=active"
```

**Response:**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Research Agent",
      "description": "Specialized in web research and data gathering",
      "type": "research",
      "status": "active",
      "capabilities": ["web_search", "data_analysis", "citation"],
      "mcpServers": ["tavily", "serpapi"],
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

#### Create Agent

```http
POST /api/agents
```

**Request Body:**
```json
{
  "name": "Custom Research Agent",
  "description": "Specialized research agent for technical documentation",
  "type": "research",
  "config": {
    "model": "gpt-4o",
    "temperature": 0.3,
    "maxTokens": 2000
  },
  "capabilities": ["web_search", "document_analysis"],
  "mcpServers": ["tavily", "github"]
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "name": "Custom Research Agent",
  "description": "Specialized research agent for technical documentation",
  "type": "research",
  "status": "active",
  "config": {
    "model": "gpt-4o",
    "temperature": 0.3,
    "maxTokens": 2000
  },
  "capabilities": ["web_search", "document_analysis"],
  "mcpServers": ["tavily", "github"],
  "createdAt": "2025-01-15T11:00:00Z",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

#### Get Agent

```http
GET /api/agents/{id}
```

**Path Parameters:**
- `id`: UUID of the agent

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Research Agent",
  "description": "Specialized in web research and data gathering",
  "type": "research",
  "status": "active",
  "capabilities": ["web_search", "data_analysis", "citation"],
  "mcpServers": ["tavily", "serpapi"],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Update Agent

```http
PUT /api/agents/{id}
```

**Request Body:**
```json
{
  "name": "Updated Research Agent",
  "description": "Enhanced research capabilities",
  "config": {
    "temperature": 0.2
  }
}
```

#### Delete Agent

```http
DELETE /api/agents/{id}
```

**Response:** `204 No Content`

#### Execute Agent

```http
POST /api/agents/{id}/execute
```

**Request Body:**
```json
{
  "query": "Research the latest developments in AI agent orchestration",
  "context": {
    "maxResults": 5,
    "includeImages": false
  },
  "streaming": false
}
```

**Response:**
```json
{
  "executionId": "exec_123456789",
  "result": {
    "content": "Based on my research, here are the latest developments...",
    "sources": [
      {
        "title": "AI Agent Orchestration Trends 2025",
        "url": "https://example.com/article",
        "relevance": 0.95
      }
    ],
    "metadata": {
      "model": "gpt-4o",
      "tokensUsed": 1500,
      "executionTime": 3.2
    }
  },
  "status": "completed",
  "createdAt": "2025-01-15T12:00:00Z",
  "completedAt": "2025-01-15T12:00:03Z"
}
```

### Conversations

#### List Conversations

```http
GET /api/conversations
```

**Query Parameters:**
- `limit` (optional): Number of results (1-100, default: 20)
- `offset` (optional): Number to skip (default: 0)
- `search` (optional): Search in conversation titles

#### Create Conversation

```http
POST /api/conversations
```

**Request Body:**
```json
{
  "title": "Agent Development Discussion",
  "agentId": "123e4567-e89b-12d3-a456-426614174000",
  "initialMessage": "Help me understand multi-agent orchestration patterns"
}
```

#### Send Message

```http
POST /api/conversations/{id}/messages
```

**Request Body:**
```json
{
  "content": "What are the best practices for agent communication?",
  "role": "user",
  "agentId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Workflows

#### Execute Workflow

```http
POST /api/workflows/{workflowId}/execute
```

**Request Body:**
```json
{
  "input": "Build a user authentication system",
  "config": {
    "priority": "high",
    "parallelExecution": true
  }
}
```

**Response:**
```json
{
  "executionId": "workflow_exec_123456",
  "status": "running",
  "steps": [
    {
      "id": "requirements",
      "agentName": "research-agent",
      "status": "completed",
      "result": "Requirements analysis complete..."
    },
    {
      "id": "architecture",
      "agentName": "planning-agent",
      "status": "running",
      "estimatedCompletion": "2025-01-15T12:05:00Z"
    }
  ],
  "createdAt": "2025-01-15T12:00:00Z"
}
```

### Health & Monitoring

#### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "redis": true,
    "openai": true,
    "anthropic": true
  },
  "timestamp": "2025-01-15T12:00:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

#### Metrics

```http
GET /api/metrics
```

**Response:**
```json
{
  "agents": {
    "total": 5,
    "active": 4,
    "inactive": 1
  },
  "executions": {
    "total": 1000,
    "today": 50,
    "averageTime": 2.5
  },
  "conversations": {
    "total": 200,
    "active": 15
  },
  "system": {
    "memoryUsage": "512MB",
    "cpuUsage": "25%",
    "diskUsage": "2.1GB"
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent with ID 123e4567-e89b-12d3-a456-426614174000 not found",
    "details": {
      "agentId": "123e4567-e89b-12d3-a456-426614174000"
    }
  },
  "timestamp": "2025-01-15T12:00:00Z",
  "requestId": "req_123456789"
}
```

### Common Error Codes

- `400 BAD_REQUEST`: Invalid request format or parameters
- `401 UNAUTHORIZED`: Missing or invalid authentication token
- `403 FORBIDDEN`: Insufficient permissions
- `404 NOT_FOUND`: Resource not found
- `409 CONFLICT`: Resource already exists or conflict
- `429 RATE_LIMITED`: Rate limit exceeded
- `500 INTERNAL_ERROR`: Server error
- `503 SERVICE_UNAVAILABLE`: Service temporarily unavailable

## Rate Limiting

API endpoints are rate limited based on user tier:

- **Free Tier**: 100 requests/minute, 1000 requests/day
- **Pro Tier**: 1000 requests/minute, 10000 requests/day
- **Enterprise**: Custom limits

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642675200
```

## Webhooks

Configure webhooks to receive real-time notifications:

### Supported Events

- `agent.execution.started`
- `agent.execution.completed`
- `agent.execution.failed`
- `workflow.started`
- `workflow.completed`
- `conversation.message.received`

### Webhook Configuration

```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/cartrita",
  "events": ["agent.execution.completed", "workflow.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload Example

```json
{
  "event": "agent.execution.completed",
  "data": {
    "executionId": "exec_123456789",
    "agentId": "123e4567-e89b-12d3-a456-426614174000",
    "result": {
      "content": "Execution completed successfully",
      "metadata": {
        "executionTime": 3.2,
        "tokensUsed": 1500
      }
    }
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { CartraitaClient } from '@cartrita/sdk';

const client = new CartraitaClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-domain.com/api'
});

// Execute an agent
const result = await client.agents.execute('agent-id', {
  query: 'Research AI trends',
  streaming: true
});

// Handle streaming response
for await (const chunk of result.stream) {
  console.log(chunk.content);
}
```

### Python

```python
from cartrita_sdk import CartraitaClient

client = CartraitaClient(
    api_key="your-api-key",
    base_url="https://your-domain.com/api"
)

# Execute agent
result = client.agents.execute(
    agent_id="agent-id",
    query="Research AI trends",
    streaming=False
)

print(result.content)
```

### cURL Examples

#### Create and Execute Agent

```bash
# Create agent
AGENT_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Research Agent",
    "type": "research",
    "capabilities": ["web_search"]
  }' \
  https://your-domain.com/api/agents | jq -r '.id')

# Execute agent
curl -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Research latest AI developments",
    "streaming": false
  }' \
  https://your-domain.com/api/agents/$AGENT_ID/execute
```

## Best Practices

### Authentication
- Store tokens securely (environment variables, secure storage)
- Implement token refresh logic for long-running applications
- Use HTTPS in production

### Rate Limiting
- Implement exponential backoff for retries
- Cache responses when appropriate
- Monitor rate limit headers

### Error Handling
- Implement proper error handling for all API calls
- Log errors for debugging
- Provide meaningful error messages to users

### Performance
- Use streaming for long-running agent executions
- Implement request/response compression
- Consider pagination for large datasets

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:
- Development: `http://localhost:3000/docs`
- Production: `https://your-domain.com/docs`

You can also download the specification:
- JSON: `https://your-domain.com/api/openapi.json`
- YAML: `https://your-domain.com/api/openapi.yaml`

## Support

- **Documentation Issues**: [GitHub Issues](https://github.com/your-org/cartrita-agents/issues)
- **API Support**: api-support@cartrita.com
- **Discord Community**: [Join our Discord](https://discord.gg/cartrita)