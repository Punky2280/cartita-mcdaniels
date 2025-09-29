import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  ConversationEventBroker,
  ConversationService
} from '../services/ConversationService.js';
import {
  ConversationSchema,
  ConversationListSchema,
  CreateConversationSchema,
  UpdateConversationSchema,
  ConversationParamsSchema,
  ListConversationsQuerySchema,
  MessageListSchema,
  CreateMessageSchema,
  MessageResponseSchema,
  ListMessagesQuerySchema,
  ConversationSuccessSchema
} from '../schemas/conversations.js';
import type {
  ConversationParams,
  ListConversationsQuery,
  CreateConversationBody,
  UpdateConversationBody,
  CreateMessageBody,
  ListMessagesQuery
} from '../schemas/conversations.js';
import { ErrorResponseSchema } from '../schemas/common.js';

declare module 'fastify' {
  interface FastifyInstance {
    conversationService: ConversationService;
    conversationEvents: ConversationEventBroker;
  }
}

const chatRoutes: FastifyPluginAsync = async (fastify) => {
  const logger = fastify.log.child({ module: 'chatRoutes' });
  const eventBroker = new ConversationEventBroker(logger);
  const conversationService = new ConversationService(fastify.db, eventBroker, logger);

  fastify.decorate('conversationService', conversationService);
  fastify.decorate('conversationEvents', eventBroker);

  fastify.addHook('onClose', async () => {
    conversationService.dispose();
  });

  // Create conversation
  fastify.post<{ Body: CreateConversationBody }>('/conversations', {
    schema: {
      description: 'Create a new conversation',
      tags: ['Conversations'],
      security: [{ bearerAuth: [] }],
      body: CreateConversationSchema,
      response: {
        201: ConversationSuccessSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    const user = await request.requireAuth(['conversations:create', 'admin']);
    const body = request.body;

    const conversationInput: CreateConversationBody & { userId: string } = {
      userId: user.id
    };

    if (body.title !== undefined) {
      conversationInput.title = body.title;
    }

    if (body.type !== undefined) {
      conversationInput.type = body.type;
    }

    if (body.metadata !== undefined) {
      conversationInput.metadata = body.metadata;
    }

    if (body.knowledgeBaseId !== undefined) {
      conversationInput.knowledgeBaseId = body.knowledgeBaseId;
    }

    const conversation = await conversationService.createConversation(conversationInput);

    return reply.status(201).apiSuccess(conversation);
  });

  // List conversations
  fastify.get<{ Querystring: ListConversationsQuery }>('/conversations', {
    schema: {
      description: 'List conversations for the authenticated user',
      tags: ['Conversations'],
      security: [{ bearerAuth: [] }],
      querystring: ListConversationsQuerySchema,
      response: {
        200: ConversationListSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    const user = await request.requireAuth(['conversations:read', 'admin']);
    const query = request.query;

    const canViewAll = request.checkPermission('admin') || request.checkPermission('conversations:read:all');

    const listOptions: Partial<ListConversationsQuery> & { userId?: string } = {};

    if (!canViewAll) {
      listOptions.userId = user.id;
    }

    if (query.includeArchived !== undefined) {
      listOptions.includeArchived = query.includeArchived;
    }

    if (query.limit !== undefined) {
      listOptions.limit = query.limit;
    }

    if (query.offset !== undefined) {
      listOptions.offset = query.offset;
    }

    if (query.type !== undefined) {
      listOptions.type = query.type;
    }

    if (query.status !== undefined) {
      listOptions.status = query.status;
    }

    if (query.search !== undefined) {
      listOptions.search = query.search;
    }

    const result = await conversationService.listConversations(listOptions);

    return reply.apiPaginated(result.conversations, {
      page: Math.floor(result.offset / result.limit) + 1,
      limit: result.limit,
      total: result.total
    });
  });

  // Get conversation by id
  fastify.get<{ Params: ConversationParams }>('/conversations/:id', {
    schema: {
      description: 'Get a conversation by ID',
      tags: ['Conversations'],
      security: [{ bearerAuth: [] }],
      params: ConversationParamsSchema,
      response: {
        200: ConversationSuccessSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    const user = await request.requireAuth(['conversations:read', 'admin']);
    const { id } = request.params;

    const conversation = await conversationService.getConversationById(id);
    if (!conversation) {
      return reply.apiError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
    }

    const canViewAll = request.checkPermission('admin') || request.checkPermission('conversations:read:all');
    if (!canViewAll && conversation.userId && conversation.userId !== user.id) {
      return reply.apiError('FORBIDDEN', 'You do not have access to this conversation', 403);
    }

    return reply.apiSuccess(conversation);
  });

  // Update conversation
  fastify.patch<{ Params: ConversationParams; Body: UpdateConversationBody }>('/conversations/:id', {
    schema: {
      description: 'Update conversation metadata or status',
      tags: ['Conversations'],
      security: [{ bearerAuth: [] }],
      params: ConversationParamsSchema,
      body: UpdateConversationSchema,
      response: {
        200: ConversationSuccessSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    const user = await request.requireAuth(['conversations:update', 'admin']);
    const { id } = request.params;
    const body = request.body;

    const conversation = await conversationService.getConversationById(id);
    if (!conversation) {
      return reply.apiError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
    }

    const canModifyAll = request.checkPermission('admin') || request.checkPermission('conversations:update:all');
    if (!canModifyAll && conversation.userId && conversation.userId !== user.id) {
      return reply.apiError('FORBIDDEN', 'You do not have access to modify this conversation', 403);
    }

  const updateInput: UpdateConversationBody = {};

    if (body.title !== undefined) {
      updateInput.title = body.title;
    }

    if (body.metadata !== undefined) {
      updateInput.metadata = body.metadata;
    }

    if (body.status !== undefined) {
      updateInput.status = body.status;
    }

    if (body.summary !== undefined) {
      updateInput.summary = body.summary;
    }

    const updated = await conversationService.updateConversation(id, updateInput);

    if (!updated) {
      return reply.apiError('CONVERSATION_UPDATE_FAILED', 'Failed to update conversation', 500);
    }

    return reply.apiSuccess(updated);
  });

  // Archive conversation
  fastify.delete<{ Params: ConversationParams }>('/conversations/:id', {
    schema: {
      description: 'Archive a conversation',
      tags: ['Conversations'],
      security: [{ bearerAuth: [] }],
      params: ConversationParamsSchema,
      response: {
        200: ConversationSuccessSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    const user = await request.requireAuth(['conversations:delete', 'admin']);
    const { id } = request.params;

    const conversation = await conversationService.getConversationById(id);
    if (!conversation) {
      return reply.apiError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
    }

    const canDeleteAll = request.checkPermission('admin') || request.checkPermission('conversations:delete:all');
    if (!canDeleteAll && conversation.userId && conversation.userId !== user.id) {
      return reply.apiError('FORBIDDEN', 'You do not have permission to archive this conversation', 403);
    }

    const archived = await conversationService.archiveConversation(id);
    if (!archived) {
      return reply.apiError('CONVERSATION_ARCHIVE_FAILED', 'Failed to archive conversation', 500);
    }

    return reply.apiSuccess(archived);
  });

  // List messages
  fastify.get<{ Params: ConversationParams; Querystring: ListMessagesQuery }>('/conversations/:id/messages', {
    schema: {
      description: 'List messages in a conversation',
      tags: ['Conversations'],
      security: [{ bearerAuth: [] }],
      params: ConversationParamsSchema,
      querystring: ListMessagesQuerySchema,
      response: {
        200: MessageListSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    const user = await request.requireAuth(['conversations:read', 'admin']);
    const { id } = request.params;
    const query = request.query;

    const conversation = await conversationService.getConversationById(id);
    if (!conversation) {
      return reply.apiError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
    }

    const canViewAll = request.checkPermission('admin') || request.checkPermission('conversations:read:all');
    if (!canViewAll && conversation.userId && conversation.userId !== user.id) {
      return reply.apiError('FORBIDDEN', 'You do not have access to this conversation', 403);
    }

    const messageOptions: ListMessagesQuery & { conversationId: string } = {
      conversationId: id
    };

    if (query.limit !== undefined) {
      messageOptions.limit = query.limit;
    }

    if (query.offset !== undefined) {
      messageOptions.offset = query.offset;
    }

    if (query.ascending !== undefined) {
      messageOptions.ascending = query.ascending;
    }

    const result = await conversationService.listMessages(messageOptions);

    return reply.apiPaginated(result.messages, {
      page: Math.floor(result.offset / result.limit) + 1,
      limit: result.limit,
      total: result.total
    });
  });

  // Create message
  fastify.post<{ Params: ConversationParams; Body: CreateMessageBody }>('/conversations/:id/messages', {
    schema: {
      description: 'Create a new message in the conversation',
      tags: ['Conversations'],
      security: [{ bearerAuth: [] }],
      params: ConversationParamsSchema,
      body: CreateMessageSchema,
      response: {
        201: MessageResponseSchema,
        202: MessageResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    const user = await request.requireAuth(['conversations:write', 'admin']);
    const { id } = request.params;
    const body = request.body;

    const conversation = await conversationService.getConversationById(id);
    if (!conversation) {
      return reply.apiError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
    }

    const canWriteAll = request.checkPermission('admin') || request.checkPermission('conversations:write:all');
    if (!canWriteAll && conversation.userId && conversation.userId !== user.id) {
      return reply.apiError('FORBIDDEN', 'You do not have access to this conversation', 403);
    }

    if (conversation.status === 'archived') {
      return reply.apiError('CONVERSATION_ARCHIVED', 'Cannot add messages to an archived conversation', 400);
    }

    const messageInput: CreateMessageBody & { conversationId: string; userId: string | null } = {
      conversationId: id,
      role: body.role,
      content: body.content,
      userId: body.role === 'user' ? user.id : null
    };

    if (body.contentType !== undefined) {
      messageInput.contentType = body.contentType;
    }

    if (body.metadata !== undefined) {
      messageInput.metadata = body.metadata;
    }

    if (body.agentId !== undefined) {
      messageInput.agentId = body.agentId;
    }

    if (body.parentMessageId !== undefined) {
      messageInput.parentMessageId = body.parentMessageId;
    }

    const messageOptions: { triggerAI: boolean; stream: boolean; toolPreferences?: string[] } = {
      triggerAI: body.generateResponse ?? false,
      stream: body.stream ?? false
    };

    if (body.toolPreferences !== undefined) {
      messageOptions.toolPreferences = body.toolPreferences;
    }

    const result = await conversationService.createMessage(messageInput, messageOptions);

    const statusCode = result.taskId ? 202 : 201;
    return reply.status(statusCode).apiSuccess(result);
  });

  // SSE events
  fastify.get<{ Params: ConversationParams }>('/conversations/:id/events', {
    schema: {
      description: 'Subscribe to conversation events via SSE',
      tags: ['Conversations'],
      security: [{ bearerAuth: [] }],
      params: ConversationParamsSchema,
      response: {
        200: Type.Any(),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    const user = await request.requireAuth(['conversations:read', 'admin']);
    const { id } = request.params;

    const conversation = await conversationService.getConversationById(id);
    if (!conversation) {
      return reply.apiError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
    }

    const canViewAll = request.checkPermission('admin') || request.checkPermission('conversations:read:all');
    if (!canViewAll && conversation.userId && conversation.userId !== user.id) {
      return reply.apiError('FORBIDDEN', 'You do not have access to this conversation', 403);
    }

    reply.hijack();
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');

    const clientId = eventBroker.addClient(id, reply.raw);
    eventBroker.replayEvents(id, reply.raw);

    const cleanup = () => {
      eventBroker.removeClient(id, clientId);
    };

    request.raw.on('close', cleanup);
    request.raw.on('end', cleanup);
    request.raw.on('error', cleanup);
  });
};

export default chatRoutes;
