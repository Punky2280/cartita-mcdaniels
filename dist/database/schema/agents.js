import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, boolean, index, vector, foreignKey } from 'drizzle-orm/pg-core';
import { users } from './users';
export const agents = pgTable('agents', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('inactive'),
    config: jsonb('config').default('{}'),
    capabilities: jsonb('capabilities').default('[]'),
    mcpServers: jsonb('mcp_servers').default('[]'),
    version: varchar('version', { length: 20 }).default('1.0.0'),
    isTemplate: boolean('is_template').default(false),
    parentAgentId: uuid('parent_agent_id'),
    performance: jsonb('performance').default('{}'), // Performance metrics
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    executionCount: integer('execution_count').default(0),
    successRate: integer('success_rate').default(100), // Percentage
    avgResponseTime: integer('avg_response_time'), // Milliseconds
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        nameIdx: index('agents_name_idx').on(table.name),
        typeIdx: index('agents_type_idx').on(table.type),
        statusIdx: index('agents_status_idx').on(table.status),
        createdByIdx: index('agents_created_by_idx').on(table.createdBy),
        templateIdx: index('agents_template_idx').on(table.isTemplate),
        parentAgentIdx: index('agents_parent_agent_idx').on(table.parentAgentId),
        parentAgentFk: foreignKey({
            name: 'agents_parent_agent_id_fkey',
            columns: [table.parentAgentId],
            foreignColumns: [table.id]
        }).onDelete('set null'),
        lastActiveIdx: index('agents_last_active_idx').on(table.lastActiveAt),
        performanceIdx: index('agents_performance_idx').on(table.successRate),
    };
});
export const agentExecutions = pgTable('agent_executions', {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id),
    workflowId: uuid('workflow_id'), // Reference to workflows if part of workflow
    sessionId: varchar('session_id', { length: 255 }),
    input: jsonb('input').notNull(),
    output: jsonb('output'),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    duration: integer('duration'), // Milliseconds
    tokensUsed: integer('tokens_used'),
    cost: integer('cost'), // Cost in cents
    model: varchar('model', { length: 100 }),
    error: text('error'),
    metadata: jsonb('metadata').default('{}'),
}, (table) => {
    return {
        agentIdIdx: index('agent_executions_agent_id_idx').on(table.agentId),
        userIdIdx: index('agent_executions_user_id_idx').on(table.userId),
        statusIdx: index('agent_executions_status_idx').on(table.status),
        startedAtIdx: index('agent_executions_started_at_idx').on(table.startedAt),
        workflowIdIdx: index('agent_executions_workflow_id_idx').on(table.workflowId),
    };
});
export const agentKnowledge = pgTable('agent_knowledge', {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content').notNull(),
    contentType: varchar('content_type', { length: 50 }).default('text'),
    tags: jsonb('tags').default('[]'),
    embedding: vector('embedding', { dimensions: 1536 }), // For AI similarity search
    metadata: jsonb('metadata').default('{}'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        agentIdIdx: index('agent_knowledge_agent_id_idx').on(table.agentId),
        titleIdx: index('agent_knowledge_title_idx').on(table.title),
        contentTypeIdx: index('agent_knowledge_content_type_idx').on(table.contentType),
        activeIdx: index('agent_knowledge_active_idx').on(table.isActive),
        // Vector similarity search index
        embeddingIdx: index('agent_knowledge_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
    };
});
