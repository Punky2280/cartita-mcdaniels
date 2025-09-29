import { Type, type Static } from '@sinclair/typebox';
import { PaginationSchema } from './common.js';

export const ConversationMetadataSchema = Type.Record(Type.String(), Type.Any());

export const ConversationSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  title: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  userId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  knowledgeBaseId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  type: Type.String({ default: 'chat' }),
  status: Type.String({ default: 'active' }),
  metadata: Type.Optional(ConversationMetadataSchema),
  summary: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  messageCount: Type.Optional(Type.Number()),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  lastMessageAt: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
});

const MetadataSchema = Type.Optional(Type.Record(Type.String(), Type.Any()));

export const ConversationSuccessSchema = Type.Object({
  success: Type.Boolean(),
  data: ConversationSchema,
  metadata: MetadataSchema
});

export const ConversationListSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Array(ConversationSchema),
  pagination: PaginationSchema,
  metadata: MetadataSchema
});

export const CreateConversationSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  type: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  metadata: Type.Optional(ConversationMetadataSchema),
  knowledgeBaseId: Type.Optional(Type.String({ format: 'uuid' }))
});

export const UpdateConversationSchema = Type.Object({
  title: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 255 }), Type.Null()])),
  metadata: Type.Optional(ConversationMetadataSchema),
  status: Type.Optional(Type.String()),
  summary: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});

export const ConversationParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' })
});

export const ListConversationsQuerySchema = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  type: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  includeArchived: Type.Optional(Type.Boolean())
});

export const MessageMetadataSchema = Type.Record(Type.String(), Type.Any());

export const MessageSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  conversationId: Type.String({ format: 'uuid' }),
  role: Type.String(),
  content: Type.String(),
  contentType: Type.String({ default: 'text' }),
  metadata: Type.Optional(MessageMetadataSchema),
  userId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  agentId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  parentMessageId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  model: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  tokens: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' })
});

export const MessageListSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Array(MessageSchema),
  pagination: PaginationSchema,
  metadata: MetadataSchema
});

export const ListMessagesQuerySchema = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200, default: 50 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  ascending: Type.Optional(Type.Boolean())
});

export const CreateMessageSchema = Type.Object({
  role: Type.Union([
    Type.Literal('user'),
    Type.Literal('assistant'),
    Type.Literal('system'),
    Type.Literal('agent'),
    Type.Literal('tool')
  ]),
  content: Type.String({ minLength: 1 }),
  contentType: Type.Optional(Type.String({ default: 'text' })),
  metadata: Type.Optional(MessageMetadataSchema),
  generateResponse: Type.Optional(Type.Boolean()),
  stream: Type.Optional(Type.Boolean()),
  toolPreferences: Type.Optional(Type.Array(Type.String())),
  parentMessageId: Type.Optional(Type.String({ format: 'uuid' })),
  agentId: Type.Optional(Type.String({ format: 'uuid' }))
});

const MessageResponseDataSchema = Type.Object({
  message: MessageSchema,
  taskId: Type.Optional(Type.String())
});

export const MessageResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: MessageResponseDataSchema,
  metadata: MetadataSchema
});

export type ConversationResponse = Static<typeof ConversationSchema>;
export type ConversationListResponse = Static<typeof ConversationListSchema>;
export type ConversationSuccessResponse = Static<typeof ConversationSuccessSchema>;
export type CreateConversationBody = Static<typeof CreateConversationSchema>;
export type UpdateConversationBody = Static<typeof UpdateConversationSchema>;
export type ConversationParams = Static<typeof ConversationParamsSchema>;
export type ListConversationsQuery = Static<typeof ListConversationsQuerySchema>;
export type MessageResponse = Static<typeof MessageResponseSchema>;
export type CreateMessageBody = Static<typeof CreateMessageSchema>;
export type ListMessagesQuery = Static<typeof ListMessagesQuerySchema>;