# Conversational Backend Blueprint

## Goals

- Persist user <> assistant conversations with full audit history.
- Expose a REST interface that the hybrid chat frontend can consume for listing conversations, fetching messages, posting new turns, and orchestrating tool calls.
- Provide real-time feedback during AI task execution using Server-Sent Events (SSE).
- Bridge the existing `AIIntegrationService` task queue with conversational workflows by enriching metadata, capturing results, and emitting lifecycle notifications.

## Domain Overview

| Entity | Source Table | Key Attributes | Notes |
| --- | --- | --- | --- |
| Conversation | `conversations` | `id`, `title`, `user_id`, `type`, `status`, `metadata`, `last_message_at` | Optional ownership (`user_id`), supports multiple conversation types (`chat`, `workflow`, `agent_execution`). |
| Message | `messages` | `id`, `conversation_id`, `role`, `content`, `metadata`, `model`, `tokens`, timestamps | Supports `user`, `assistant`, `system`, `tool`, `agent` roles; metadata captures attachments/tool data. |
| Tool Execution | (metadata on message) | `toolName`, `input`, `status`, `output` | Stored in message metadata; surfaced via dedicated endpoints for execution/confirmation. |

## API Surface (v1)

Base prefix: `/api/v1/chat`

| Method | Path | Description | Auth Scope |
| --- | --- | --- | --- |
| `POST` | `/conversations` | Create a conversation shell. | `conversations:create` |
| `GET` | `/conversations` | Paginated list with filtering by type/status/ownership. | `conversations:read` |
| `GET` | `/conversations/:id` | Fetch a conversation with latest message summary. | `conversations:read` |
| `PATCH` | `/conversations/:id` | Update title, metadata, or archive flag. | `conversations:update` |
| `DELETE` | `/conversations/:id` | Soft delete / archive conversation. | `conversations:delete` |
| `GET` | `/conversations/:id/messages` | Cursor-paginated message history. | `conversations:read` |
| `POST` | `/conversations/:id/messages` | Append a user/assistant/system/tool message; optionally trigger AI response. | `conversations:write` |
| `GET` | `/conversations/:id/events` | SSE stream delivering lifecycle updates (`message.created`, `task.*`, `tool.*`). | `conversations:read` |
| `POST` | `/conversations/:id/tools/execute` | Schedule a tool call via AI task queue; logs `tool`-role message placeholder. | `tools:execute` |
| `POST` | `/conversations/:id/tools/:messageId/complete` | Submit tool output, resolving pending tool call. | `tools:execute` |

### Request/Response Contracts

All responses use the standard `apiSuccess` / `apiError` wrappers supplied by `api-middleware`.

### Create Conversation

```jsonc
POST /api/v1/chat/conversations
{
  "title": "Build pipeline fixes",
  "type": "chat",
  "metadata": {
    "projectId": "pkg-42"
  }
}
```

Returns the persisted conversation (201).

### Post Message + Trigger AI

```jsonc
POST /api/v1/chat/conversations/:id/messages
{
  "role": "user",
  "content": "Why is the build red?",
  "metadata": {
    "attachments": []
  },
  "generateResponse": true,
  "stream": true,
  "toolPreferences": ["context7:search"]
}
```

- Persists the user message.
- Emits `message.created` event to `/events` subscribers.
- Submits AI task with metadata `{ conversationId, parentMessageId }`.
- Returns `202 Accepted` payload with task id if `generateResponse` else `201`.

### Tool Execution

```jsonc
POST /api/v1/chat/conversations/:id/tools/execute
{
  "tool": "github:pull-request",
  "input": {
    "owner": "Punky2280",
    "repo": "cartita-mcdaniels",
    "query": "open bugs"
  },
  "messageId": "optional",
  "timeoutMs": 30000
}
```

- Emits `tool.requested` event.
- Stores placeholder tool message (`role: "tool"`, status `pending`).
- Schedules AI task with metadata linking to placeholder message (if absent, service creates one).

## Streaming Lifecycle

The endpoint `/api/v1/chat/conversations/:id/events` keeps an SSE channel open. Events include:

```jsonc
{
  "event": "message.created",
  "data": {
    "conversationId": "...",
    "message": { /* full message payload */ }
  }
}
```

Other event types:

- `task.submitted` — AI task enqueued, includes `taskId`, `metadata`.
- `task.started`
- `task.completed` — includes sanitized `result`; server stores assistant message before broadcasting.
- `task.failed` — error payload, client may show toast.
- `tool.requested`, `tool.running`, `tool.completed`, `tool.failed` — mirror conversation tool calls.

The SSE handler auto-replays the last `N` events (configurable cache) on initial subscription to avoid empty UI states.

## AI Task Orchestration

1. User post sets `generateResponse` flag.
2. Service composes `TaskRequest`:

   ```ts
   aiService.submitTask({
     type: 'analysis',
     input: {
       conversationId,
       prompt: latestContext,
       toolPreferences
     },
     metadata: {
       conversationId,
       triggerMessageId,
       responseMode: stream ? 'sse' : 'poll'
     }
   });
   ```

3. `ConversationService` subscribes to `taskSubmitted`, `taskStarted`, `taskCompleted`, `taskFailed` and applies the following rules:
   - `taskSubmitted`/`taskStarted`: broadcast event only.
   - `taskCompleted`: persist assistant message (role `assistant`, metadata includes `taskId`, `model`, `tokens` if provided) then broadcast.
   - `taskFailed`: broadcast error, optionally create `assistant` message flagged as `error`.

Metadata bridging ensures we only react to conversation-specific tasks.

## Tool Execution Flow

- Tool requests piggyback on messages or dedicated endpoint.
- When a tool action is requested, a placeholder `tool` message is stored with status `pending`.
- Downstream integration/service performs the tool work (e.g., via `aiService` workflow task or direct connector).
- Upon completion, a follow-up `tool` message with `status: succeeded` (or `failed`) overwrites the placeholder row (or creates a new row referencing `parentMessageId`).
- SSE broadcasts each state change to keep the UI updated.

## Permissions & Security

- Reuse Fastify auth plugin: `conversations:*` scopes follow existing colon-delimited convention.
- Authorization checks verify ownership unless user has `admin` or matching permission.
- Input sanitization handled by `api-middleware`; additional length/role validation occurs in schema layer.
- SSE connections respect the same auth gate (token validated on initial request; connection terminates if token missing or invalid).

## Error Handling

- Validation errors (e.g., unsupported role, blank content) => `400` with `VALIDATION_ERROR` code.
- Missing conversation => `404` (`CONVERSATION_NOT_FOUND`).
- Task scheduling issues => `502` (`AI_TASK_FAILED`).
- Tool execution timeouts => `504` (`TOOL_TIMEOUT`).
- All responses leverage `reply.apiError` / `reply.apiSuccess` for consistent shape.

## Extensibility Notes

- Conversation subscriptions stored in-memory initially; can be upgraded to Redis pub/sub or WebSocket for scale.
- Task metadata contract keeps AI pipeline decoupled—other workers can emit lifecycle events by calling `conversationService.publishEvent`.
- Add vector search hooks later by querying `messages.embedding` via pgvector for "search in conversation" UX.

## Implementation Checklist

- [ ] Service layer (`ConversationService`) encapsulating DB + AIIntegrationService coordination.
- [ ] New schemas in `src/schemas/conversations.ts`.
- [ ] Route module under `src/routes/conversations.ts` registered at `/api/v1/chat`.
- [ ] SSE helper utilities for connection registry and cleanup.
- [ ] Unit tests via `vitest` + drizzle test harness.
- [ ] Documentation updates (this file + README pointers).
