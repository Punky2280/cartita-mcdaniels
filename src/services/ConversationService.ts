import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';
import type { FastifyBaseLogger } from 'fastify';
import {
  and,
  desc,
  eq,
  ilike,
  sql,
  type InferInsertModel,
  type InferSelectModel
} from 'drizzle-orm';
import { conversations, messages } from '../database/schema/knowledge.js';
import type { TaskRequest, TaskResult } from '../core/AIIntegrationService.js';
import { aiService } from '../core/AIIntegrationService.js';
import type { db } from '../database/connection.js';

type DbClient = typeof db;

export type ConversationRecord = InferSelectModel<typeof conversations>;
export type MessageRecord = InferSelectModel<typeof messages>;

interface PaginationOptions {
  limit?: number;
  offset?: number;
  type?: string;
  status?: string;
  search?: string;
  includeArchived?: boolean;
  userId?: string;
}

interface ConversationList {
  conversations: ConversationRecord[];
  total: number;
  limit: number;
  offset: number;
}

interface CreateConversationInput {
  title?: string | null;
  type?: string;
  status?: string;
  metadata?: Record<string, unknown> | null;
  userId?: string;
  knowledgeBaseId?: string | null;
}

interface UpdateConversationInput {
  title?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: string;
  summary?: string | null;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'agent' | 'tool';

interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  contentType?: string;
  metadata?: Record<string, unknown> | null;
  userId?: string | null;
  agentId?: string | null;
  model?: string | null;
  tokens?: number | null;
  parentMessageId?: string | null;
}

interface CreateMessageOptions {
  triggerAI?: boolean;
  stream?: boolean;
  toolPreferences?: string[];
}

interface CreateMessageResult {
  message: MessageRecord;
  taskId?: string;
}

interface MessageListOptions {
  conversationId: string;
  limit?: number;
  offset?: number;
  ascending?: boolean;
}

interface MessageList {
  messages: MessageRecord[];
  total: number;
  limit: number;
  offset: number;
}

interface ConversationEvent {
  event: string;
  data: unknown;
  timestamp: number;
}

interface SSEClient {
  id: string;
  stream: ServerResponse;
  heartbeat: NodeJS.Timeout;
}

export class ConversationEventBroker extends EventEmitter {
  private readonly clients: Map<string, Map<string, SSEClient>> = new Map();
  private readonly recentEvents: Map<string, ConversationEvent[]> = new Map();
  private readonly maxRecentEvents: number;
  private readonly heartbeatInterval: number;
  private readonly logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger, options?: { maxRecentEvents?: number; heartbeatInterval?: number }) {
    super();
    this.logger = logger;
    this.maxRecentEvents = options?.maxRecentEvents ?? 50;
    this.heartbeatInterval = options?.heartbeatInterval ?? 30000;
  }

  addClient(conversationId: string, stream: ServerResponse): string {
    const clientId = randomUUID();
    const clients = this.clients.get(conversationId) ?? new Map<string, SSEClient>();

    stream.write(': connected\n\n');

    const heartbeat = setInterval(() => {
      this.safeWrite(stream, ': heartbeat\n\n');
    }, this.heartbeatInterval).unref();

    clients.set(clientId, { id: clientId, stream, heartbeat });
    this.clients.set(conversationId, clients);

    this.logger.debug({ conversationId, clientId }, 'SSE client connected');
    return clientId;
  }

  removeClient(conversationId: string, clientId: string): void {
    const clients = this.clients.get(conversationId);
    if (!clients) return;

    const client = clients.get(clientId);
    if (client) {
      clearInterval(client.heartbeat);
      try {
        client.stream.end();
      } catch (error) {
        this.logger.debug({ conversationId, clientId, error }, 'Error closing SSE stream');
      }
      clients.delete(clientId);
      this.logger.debug({ conversationId, clientId }, 'SSE client disconnected');
    }

    if (clients.size === 0) {
      this.clients.delete(conversationId);
    }
  }

  replayEvents(conversationId: string, stream: ServerResponse): void {
    const events = this.recentEvents.get(conversationId);
    if (!events?.length) return;

    for (const event of events) {
      this.safeWrite(stream, this.formatEvent(event.event, event.data));
    }
  }

  publishEvent(conversationId: string, event: string, data: unknown): void {
    const payload: ConversationEvent = {
      event,
      data,
      timestamp: Date.now()
    };

    const recent = this.recentEvents.get(conversationId) ?? [];
    recent.push(payload);
    if (recent.length > this.maxRecentEvents) {
      recent.shift();
    }
    this.recentEvents.set(conversationId, recent);

    const clients = this.clients.get(conversationId);
    if (!clients?.size) {
      this.logger.trace({ conversationId, event }, 'No SSE clients to publish event');
      return;
    }

    const formatted = this.formatEvent(event, data);
    for (const client of clients.values()) {
      this.safeWrite(client.stream, formatted);
    }
  }

  private safeWrite(stream: ServerResponse, chunk: string): void {
    try {
      stream.write(chunk);
    } catch (error) {
      this.logger.debug({ error }, 'Failed writing to SSE stream');
    }
  }

  private formatEvent(event: string, data: unknown): string {
    const json = JSON.stringify({ data, timestamp: new Date().toISOString() });
    return `event: ${event}\ndata: ${json}\n\n`;
  }
}

export class ConversationService {
  private readonly db: DbClient;
  private readonly events: ConversationEventBroker;
  private readonly logger: FastifyBaseLogger;
  private readonly onTaskSubmittedBound: (task: TaskRequest) => void;
  private readonly onTaskStartedBound: (task: TaskRequest) => void;
  private readonly onTaskCompletedBound: (result: TaskResult) => Promise<void>;
  private readonly onTaskFailedBound: (result: TaskResult) => Promise<void>;

  constructor(db: DbClient, events: ConversationEventBroker, logger: FastifyBaseLogger) {
    this.db = db;
    this.events = events;
    this.logger = logger;

    this.onTaskSubmittedBound = this.handleTaskSubmitted.bind(this);
    this.onTaskStartedBound = this.handleTaskStarted.bind(this);
    this.onTaskCompletedBound = this.handleTaskCompleted.bind(this);
    this.onTaskFailedBound = this.handleTaskFailed.bind(this);

    aiService.on('taskSubmitted', this.onTaskSubmittedBound);
    aiService.on('taskStarted', this.onTaskStartedBound);
    aiService.on('taskCompleted', this.onTaskCompletedBound);
    aiService.on('taskFailed', this.onTaskFailedBound);
  }

  dispose(): void {
    aiService.off('taskSubmitted', this.onTaskSubmittedBound);
    aiService.off('taskStarted', this.onTaskStartedBound);
    aiService.off('taskCompleted', this.onTaskCompletedBound);
    aiService.off('taskFailed', this.onTaskFailedBound);
  }

  async createConversation(input: CreateConversationInput): Promise<ConversationRecord> {
    const now = new Date();
    const values: InferInsertModel<typeof conversations> = {
      title: input.title ?? null,
      type: input.type ?? 'chat',
      status: input.status ?? 'active',
      metadata: input.metadata ?? {},
      userId: input.userId ?? null,
      knowledgeBaseId: input.knowledgeBaseId ?? null,
      summary: null,
      messageCount: 0,
      lastMessageAt: null,
      createdAt: now,
      updatedAt: now
    };

    const [record] = await this.db.insert(conversations).values(values).returning();
    return record;
  }

  async listConversations(options: PaginationOptions): Promise<ConversationList> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);

    const filters = [];

    if (options.type) {
      filters.push(eq(conversations.type, options.type));
    }

    if (options.status) {
      filters.push(eq(conversations.status, options.status));
    } else if (!options.includeArchived) {
      filters.push(eq(conversations.status, 'active'));
    }

    if (options.userId) {
      filters.push(eq(conversations.userId, options.userId));
    }

    if (options.search) {
      const pattern = `%${options.search}%`;
      filters.push(
        ilike(conversations.title, pattern)
      );
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const totalQuery = this.db
      .select({ total: sql<number>`count(*)` })
      .from(conversations)
      .$dynamic();

    if (whereClause) {
      totalQuery.where(whereClause);
    }

    const [{ total }] = await totalQuery;

    const recordsQuery = this.db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset)
      .$dynamic();

    if (whereClause) {
      recordsQuery.where(whereClause);
    }

    const records = await recordsQuery;

    return {
      conversations: records,
      total: Number(total),
      limit,
      offset
    };
  }

  async getConversationById(id: string): Promise<ConversationRecord | null> {
    const [record] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    return record ?? null;
  }

  async updateConversation(id: string, input: UpdateConversationInput): Promise<ConversationRecord | null> {
    const updates: Partial<InferInsertModel<typeof conversations>> = {};
    const now = new Date();

    if (input.title !== undefined) {
      updates.title = input.title;
    }

    if (input.metadata !== undefined) {
      updates.metadata = input.metadata ?? {};
    }

    if (input.status !== undefined) {
      updates.status = input.status;
    }

    if (input.summary !== undefined) {
      updates.summary = input.summary;
    }

    updates.updatedAt = now;

    const [record] = await this.db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();

    return record ?? null;
  }

  async archiveConversation(id: string): Promise<ConversationRecord | null> {
    return await this.updateConversation(id, { status: 'archived' });
  }

  async listMessages(options: MessageListOptions): Promise<MessageList> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);
    const order = options.ascending ? messages.createdAt : desc(messages.createdAt);

    const [{ total }] = await this.db
      .select({ total: sql`count(*)` })
      .from(messages)
      .where(eq(messages.conversationId, options.conversationId));

    const records = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, options.conversationId))
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    return {
      messages: records,
      total: Number(total),
      limit,
      offset
    };
  }

  async createMessage(input: CreateMessageInput, options?: CreateMessageOptions): Promise<CreateMessageResult> {
    const now = new Date();
    const values: InferInsertModel<typeof messages> = {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      contentType: input.contentType ?? 'text',
      metadata: input.metadata ?? {},
      userId: input.userId ?? null,
      agentId: input.agentId ?? null,
      parentMessageId: input.parentMessageId ?? null,
      model: input.model ?? null,
      tokens: input.tokens ?? null,
      createdAt: now,
      updatedAt: now
    };

    const [message] = await this.db.insert(messages).values(values).returning();

    // Update conversation stats
    await this.db
      .update(conversations)
      .set({
        messageCount: sql`${conversations.messageCount} + 1`,
        lastMessageAt: message.createdAt,
        updatedAt: now
      })
      .where(eq(conversations.id, input.conversationId));

    this.events.publishEvent(input.conversationId, 'message.created', {
      conversationId: input.conversationId,
      message
    });

    if (options?.triggerAI) {
      const taskMetadata = {
        conversationId: input.conversationId,
        triggerMessageId: message.id,
        stream: options.stream ?? false,
        source: 'conversation'
      } satisfies Record<string, unknown>;

      const taskId = await aiService.submitTask({
        type: 'research',
        input: {
          query: message.content,
          context: {
            conversationId: input.conversationId,
            role: message.role,
            toolPreferences: options.toolPreferences ?? []
          }
        },
        priority: 'medium',
        metadata: taskMetadata
      });

      return { message, taskId };
    }

    return { message };
  }

  private handleTaskSubmitted(task: TaskRequest): void {
    const conversationId = task.metadata?.['conversationId'];
    if (typeof conversationId !== 'string') {
      return;
    }

    this.events.publishEvent(conversationId, 'task.submitted', {
      conversationId,
      task: {
        id: task.id,
        type: task.type,
        metadata: task.metadata,
        priority: task.priority
      }
    });
  }

  private handleTaskStarted(task: TaskRequest): void {
    const conversationId = task.metadata?.['conversationId'];
    if (typeof conversationId !== 'string') {
      return;
    }

    this.events.publishEvent(conversationId, 'task.started', {
      conversationId,
      task: {
        id: task.id,
        type: task.type,
        metadata: task.metadata,
        priority: task.priority
      }
    });
  }

  private async handleTaskCompleted(result: TaskResult): Promise<void> {
    const conversationId = result.metadata?.['conversationId'];
    if (typeof conversationId !== 'string') {
      return;
    }

    try {
      const triggerMessageId = result.metadata?.['triggerMessageId'];
      const model = result.metadata?.['model'];
      const tokens = result.metadata?.['tokens'];

      const triggerId = typeof triggerMessageId === 'string' ? triggerMessageId : undefined;
      const modelName = typeof model === 'string' ? model : null;
      const tokenCount = typeof tokens === 'number' ? tokens : null;

      let content: string;
      if (typeof result.result === 'string') {
        content = result.result;
      } else if (result.result) {
        content = JSON.stringify(result.result, null, 2);
      } else {
        content = 'Task completed with no additional content.';
      }

      const metadata = {
        taskId: result.id,
        status: 'completed',
        triggerMessageId: triggerId,
        ...(result.metadata ?? {})
      } as Record<string, unknown>;

      const now = new Date();

      const [message] = await this.db
        .insert(messages)
        .values({
          conversationId,
          role: 'assistant',
          content,
          contentType: 'text',
          metadata,
          model: modelName,
          tokens: tokenCount,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      await this.db
        .update(conversations)
        .set({
          messageCount: sql`${conversations.messageCount} + 1`,
          lastMessageAt: message.createdAt,
          updatedAt: now
        })
        .where(eq(conversations.id, conversationId));

      this.events.publishEvent(conversationId, 'message.created', {
        conversationId,
        message
      });

      this.events.publishEvent(conversationId, 'task.completed', {
        conversationId,
        task: result,
        message
      });
    } catch (error) {
      this.logger.error({ error, taskId: result.id, conversationId }, 'Failed to handle completed task for conversation');
    }
  }

  private async handleTaskFailed(result: TaskResult): Promise<void> {
    const conversationId = result.metadata?.['conversationId'];
    if (typeof conversationId !== 'string') {
      return;
    }

    try {
      const triggerMessageId = result.metadata?.['triggerMessageId'];
      const triggerId = typeof triggerMessageId === 'string' ? triggerMessageId : undefined;

      const metadata = {
        taskId: result.id,
        status: 'failed',
        triggerMessageId: triggerId,
        error: result.error,
        ...(result.metadata ?? {})
      } as Record<string, unknown>;

      const now = new Date();

      const [message] = await this.db
        .insert(messages)
        .values({
          conversationId,
          role: 'assistant',
          content: `Task failed: ${result.error ?? 'Unknown error'}`,
          contentType: 'text',
          metadata,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      await this.db
        .update(conversations)
        .set({
          messageCount: sql`${conversations.messageCount} + 1`,
          lastMessageAt: message.createdAt,
          updatedAt: now
        })
        .where(eq(conversations.id, conversationId));

      this.events.publishEvent(conversationId, 'message.created', {
        conversationId,
        message
      });

      this.events.publishEvent(conversationId, 'task.failed', {
        conversationId,
        task: result,
        message
      });
    } catch (error) {
      this.logger.error({ error, taskId: result.id, conversationId }, 'Failed to handle failed task for conversation');
    }
  }
}
