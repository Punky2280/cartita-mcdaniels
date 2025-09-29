# API Endpoints Documentation

Complete REST API documentation for the Cartrita McDaniels AI Development System.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, the API uses bearer token authentication for protected endpoints:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/protected-endpoint
```

## API Endpoints Overview

### Health and Status

#### `GET /`

System health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-27T10:00:00Z",
  "version": "1.0.0",
  "environment": "development",
  "database": {
    "connected": true,
    "latency": 45
  },
  "components": {
    "models": {
      "status": "healthy",
      "message": "All models operational"
    },
    "orchestrator": {
      "status": "healthy", 
      "message": "8 workflows registered"
    },
    "monitoring": {
      "status": "healthy",
      "message": "0 errors in last hour"
    },
    "context7": {
      "status": "healthy",
      "message": "Context7 service is operational"
    }
  }
}
```

---

### AI Workflows and Processing

#### `POST /api/v1/ai/workflow`

Execute an AI workflow.

**Request Body:**
```json
{
  "workflow": "code-review",
  "context": "Review authentication module",
  "priority": "high",
  "parameters": {
    "target": "src/auth/",
    "severity": "medium"
  }
}
```

**Response:**
```json
{
  "id": "wf-12345",
  "status": "executing",
  "workflow": "code-review",
  "startTime": "2025-09-27T10:00:00Z",
  "estimatedDuration": 120
}
```

#### `GET /api/v1/ai/workflow/{workflowId}`

Get workflow execution status and results.

**Response:**
```json
{
  "id": "wf-12345",
  "status": "completed",
  "workflow": "code-review",
  "startTime": "2025-09-27T10:00:00Z",
  "endTime": "2025-09-27T10:02:15Z",
  "duration": 135,
  "result": {
    "analysis": "Comprehensive code review completed",
    "issues": 5,
    "suggestions": 12,
    "report": "..."
  }
}
```

#### `POST /api/v1/ai/generate`

Generate code using AI.

**Request Body:**
```json
{
  "type": "component",
  "name": "UserDashboard",
  "technologies": ["typescript", "react", "fastify"],
  "features": ["authentication", "responsive", "accessible"],
  "research": true
}
```

**Response:**
```json
{
  "generated": {
    "files": [
      {
        "path": "src/components/UserDashboard.tsx",
        "content": "...",
        "description": "Main dashboard component"
      }
    ],
    "documentation": "...",
    "tests": "...",
    "dependencies": ["react", "@types/react"]
  }
}
```

#### `POST /api/v1/ai/analyze`

Analyze code using AI.

**Request Body:**
```json
{
  "type": "security",
  "target": "src/api/",
  "severity": "high",
  "autoFix": false
}
```

**Response:**
```json
{
  "analysis": {
    "type": "security",
    "target": "src/api/",
    "issues": [
      {
        "severity": "high",
        "type": "sql-injection",
        "file": "src/api/users.ts",
        "line": 45,
        "description": "Potential SQL injection vulnerability",
        "suggestion": "Use parameterized queries"
      }
    ],
    "summary": {
      "total": 3,
      "high": 1,
      "medium": 2,
      "low": 0
    }
  }
}
```

---

### Context7 Enhanced Documentation

#### `GET /api/v1/context7/documentation/{library}`

Get enhanced documentation for a library.

**Query Parameters:**
- `topic` (optional): Focus topic
- `useCase` (optional): Specific use case

**Example:**
```bash
curl "http://localhost:3000/api/v1/context7/documentation/fastify?topic=authentication&useCase=jwt"
```

**Response:**
```json
{
  "library": "fastify",
  "documentation": "Comprehensive guide for implementing JWT authentication in Fastify applications...",
  "timestamp": "2025-09-27T10:00:00Z"
}
```

#### `GET /api/v1/context7/examples/{library}/{pattern}`

Get code examples for a specific pattern.

**Query Parameters:**
- `language`: `typescript` or `javascript` (default: `typescript`)

**Example:**
```bash
curl "http://localhost:3000/api/v1/context7/examples/fastify/authentication?language=typescript"
```

**Response:**
```json
{
  "library": "fastify",
  "pattern": "authentication",
  "examples": [
    "const fastify = require('fastify')({ logger: true });\n\nfastify.register(require('@fastify/jwt'), {\n  secret: 'supersecret'\n});\n\nfastify.post('/login', async (request, reply) => {\n  // Login logic\n  const token = fastify.jwt.sign({ user: 'username' });\n  reply.send({ token });\n});"
  ],
  "count": 1
}
```

#### `POST /api/v1/context7/guidance`

Generate implementation guidance for a scenario.

**Request Body:**
```json
{
  "scenario": "Build a scalable authentication system",
  "technologies": ["fastify", "jwt", "postgresql", "redis"],
  "requirements": ["secure", "scalable", "production-ready", "rate-limited"]
}
```

**Response:**
```json
{
  "scenario": "Build a scalable authentication system",
  "guidance": "Detailed implementation guidance with architecture recommendations, security best practices, code examples, and deployment considerations...",
  "timestamp": "2025-09-27T10:00:00Z"
}
```

#### `GET /api/v1/context7/resolve/{library}`

Resolve library name to Context7-compatible library ID.

**Example:**
```bash
curl "http://localhost:3000/api/v1/context7/resolve/fastify"
```

**Response:**
```json
{
  "query": "fastify",
  "libraries": [
    {
      "libraryId": "/fastify/fastify",
      "name": "Fastify",
      "description": "Fast and low overhead web framework, for Node.js",
      "codeSnippets": 561,
      "trustScore": 10
    }
  ]
}
```

---

### Agent Management

#### `POST /api/v1/agents`

Create a new AI agent.

**Request Body:**
```json
{
  "name": "CustomCodeReviewer",
  "type": "code-review",
  "configuration": {
    "focus": "security",
    "severity": "high",
    "languages": ["typescript", "javascript"]
  }
}
```

**Response:**
```json
{
  "id": "agent-12345",
  "name": "CustomCodeReviewer",
  "type": "code-review",
  "status": "active",
  "created": "2025-09-27T10:00:00Z"
}
```

#### `GET /api/v1/agents`

List all agents with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `type`: Filter by agent type
- `status`: Filter by status

**Response:**
```json
{
  "data": [
    {
      "id": "agent-12345",
      "name": "CustomCodeReviewer",
      "type": "code-review",
      "status": "active",
      "created": "2025-09-27T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

#### `GET /api/v1/agents/{agentId}`

Get agent details.

**Response:**
```json
{
  "id": "agent-12345",
  "name": "CustomCodeReviewer",
  "type": "code-review",
  "configuration": {
    "focus": "security",
    "severity": "high",
    "languages": ["typescript", "javascript"]
  },
  "status": "active",
  "created": "2025-09-27T10:00:00Z",
  "stats": {
    "executions": 150,
    "averageDuration": 45,
    "successRate": 0.98
  }
}
```

#### `PUT /api/v1/agents/{agentId}`

Update agent configuration.

**Request Body:**
```json
{
  "configuration": {
    "focus": "performance",
    "severity": "medium",
    "languages": ["typescript", "javascript", "python"]
  }
}
```

#### `DELETE /api/v1/agents/{agentId}`

Delete an agent.

**Response:** `204 No Content`

---

## Error Responses

### Standard Error Format

```json
{
  "error": "ValidationError",
  "message": "Invalid workflow name provided",
  "code": "INVALID_WORKFLOW",
  "timestamp": "2025-09-27T10:00:00Z",
  "details": {
    "field": "workflow",
    "value": "invalid-workflow",
    "allowed": ["code-review", "research-implement", ...]
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST request |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Service temporarily unavailable |

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Standard endpoints**: 100 requests per minute
- **AI processing endpoints**: 10 requests per minute
- **Workflow execution**: 5 concurrent workflows per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1695808800
```

## Webhooks

The system supports webhooks for workflow completion and system events:

### Webhook Configuration

```json
{
  "url": "https://your-app.com/webhooks/cartrita",
  "events": ["workflow.completed", "workflow.failed", "system.alert"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload

```json
{
  "event": "workflow.completed",
  "timestamp": "2025-09-27T10:00:00Z",
  "data": {
    "workflowId": "wf-12345",
    "workflow": "code-review",
    "status": "completed",
    "duration": 135,
    "result": { ... }
  },
  "signature": "sha256=..."
}
```

## SDK and Client Libraries

### JavaScript/TypeScript

```typescript
import { CartritalAI } from '@cartrita/ai-sdk';

const client = new CartritalAI({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:3000'
});

// Execute workflow
const result = await client.workflows.execute({
  workflow: 'code-review',
  context: 'Review authentication module'
});

// Get enhanced documentation
const docs = await client.context7.getDocumentation('fastify', {
  topic: 'authentication'
});
```

### Python

```python
from cartrita_ai import CartritalAI

client = CartritalAI(
    api_key="your-api-key",
    base_url="http://localhost:3000"
)

# Execute workflow
result = client.workflows.execute(
    workflow="code-review",
    context="Review authentication module"
)

# Generate code
generated = client.ai.generate(
    type="component",
    name="UserDashboard",
    technologies=["typescript", "react"]
)
```

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
GET /api/v1/openapi.json
GET /api/v1/openapi.yaml
```

Interactive API documentation (Swagger UI) is available at:

```
GET /docs
```

---

*Last updated: September 27, 2025*