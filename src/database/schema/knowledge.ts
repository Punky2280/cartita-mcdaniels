import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, boolean, index, decimal, vector, foreignKey } from 'drizzle-orm/pg-core';
import { users } from './users';
import { agents } from './agents';

export const knowledgeBases = pgTable('knowledge_bases', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // 'documents', 'code', 'conversations', 'mixed'
  isPublic: boolean('is_public').notNull().default(false),
  settings: jsonb('settings').default('{}'),
  embeddingModel: varchar('embedding_model', { length: 100 }).default('text-embedding-3-small'),
  vectorDimensions: integer('vector_dimensions').default(1536),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastIndexedAt: timestamp('last_indexed_at', { withTimezone: true }),
}, (table) => {
  return {
    nameIdx: index('knowledge_bases_name_idx').on(table.name),
    typeIdx: index('knowledge_bases_type_idx').on(table.type),
    createdByIdx: index('knowledge_bases_created_by_idx').on(table.createdBy),
    publicIdx: index('knowledge_bases_public_idx').on(table.isPublic),
  };
});

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  knowledgeBaseId: uuid('knowledge_base_id').notNull().references(() => knowledgeBases.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  contentType: varchar('content_type', { length: 100 }).notNull(), // 'text/plain', 'text/markdown', 'application/json', etc.
  sourceUrl: varchar('source_url', { length: 1000 }),
  sourceType: varchar('source_type', { length: 100 }), // 'upload', 'web', 'api', 'sync'
  language: varchar('language', { length: 10 }).default('en'),
  wordCount: integer('word_count'),
  characterCount: integer('character_count'),
  checksum: varchar('checksum', { length: 64 }), // SHA-256 hash for content integrity
  metadata: jsonb('metadata').default('{}'),
  tags: jsonb('tags').default('[]'),
  isProcessed: boolean('is_processed').notNull().default(false),
  processingError: text('processing_error'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  indexedAt: timestamp('indexed_at', { withTimezone: true }),
}, (table) => {
  return {
    knowledgeBaseIdIdx: index('documents_knowledge_base_id_idx').on(table.knowledgeBaseId),
    titleIdx: index('documents_title_idx').on(table.title),
    contentTypeIdx: index('documents_content_type_idx').on(table.contentType),
    sourceTypeIdx: index('documents_source_type_idx').on(table.sourceType),
    processedIdx: index('documents_processed_idx').on(table.isProcessed),
    createdByIdx: index('documents_created_by_idx').on(table.createdBy),
    indexedAtIdx: index('documents_indexed_at_idx').on(table.indexedAt),
  };
});

export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  knowledgeBaseId: uuid('knowledge_base_id').notNull().references(() => knowledgeBases.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  wordCount: integer('word_count'),
  characterCount: integer('character_count'),
  startPosition: integer('start_position'), // Character position in original document
  endPosition: integer('end_position'),
  embedding: vector('embedding', { dimensions: 1536 }), // pgvector for AI similarity search
  embeddingModel: varchar('embedding_model', { length: 100 }),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    documentIdIdx: index('document_chunks_document_id_idx').on(table.documentId),
    knowledgeBaseIdIdx: index('document_chunks_knowledge_base_id_idx').on(table.knowledgeBaseId),
    chunkIndexIdx: index('document_chunks_chunk_index_idx').on(table.chunkIndex),
    // Vector similarity search index
    embeddingIdx: index('document_chunks_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  };
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }),
  userId: uuid('user_id').references(() => users.id),
  knowledgeBaseId: uuid('knowledge_base_id').references(() => knowledgeBases.id),
  type: varchar('type', { length: 50 }).notNull().default('chat'), // 'chat', 'agent_execution', 'workflow'
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'archived', 'deleted'
  metadata: jsonb('metadata').default('{}'),
  summary: text('summary'),
  messageCount: integer('message_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
}, (table) => {
  return {
    userIdIdx: index('conversations_user_id_idx').on(table.userId),
    knowledgeBaseIdIdx: index('conversations_knowledge_base_id_idx').on(table.knowledgeBaseId),
    typeIdx: index('conversations_type_idx').on(table.type),
    statusIdx: index('conversations_status_idx').on(table.status),
    lastMessageAtIdx: index('conversations_last_message_at_idx').on(table.lastMessageAt),
  };
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // 'user', 'assistant', 'system', 'agent'
  content: text('content').notNull(),
  contentType: varchar('content_type', { length: 50 }).default('text'), // 'text', 'json', 'markdown'
  userId: uuid('user_id').references(() => users.id),
  agentId: uuid('agent_id').references(() => agents.id),
  parentMessageId: uuid('parent_message_id'),
  embedding: vector('embedding', { dimensions: 1536 }), // For semantic search
  metadata: jsonb('metadata').default('{}'),
  tokens: integer('tokens'), // Token count for cost tracking
  model: varchar('model', { length: 100 }), // AI model used
  temperature: decimal('temperature', { precision: 3, scale: 2 }), // Model temperature
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    conversationIdIdx: index('messages_conversation_id_idx').on(table.conversationId),
    roleIdx: index('messages_role_idx').on(table.role),
    userIdIdx: index('messages_user_id_idx').on(table.userId),
    agentIdIdx: index('messages_agent_id_idx').on(table.agentId),
    parentMessageIdIdx: index('messages_parent_message_id_idx').on(table.parentMessageId),
    createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
    // Vector similarity search index
    embeddingIdx: index('messages_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
    parentMessageFk: foreignKey({
      name: 'messages_parent_message_id_fkey',
      columns: [table.parentMessageId],
      foreignColumns: [table.id]
    }).onDelete('set null'),
  };
});