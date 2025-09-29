import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, boolean, index, decimal, foreignKey } from 'drizzle-orm/pg-core';
import { users } from './users';
import { agents } from './agents';

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 100 }).notNull(), // 'sequential', 'parallel', 'conditional', 'loop'
  version: varchar('version', { length: 20 }).notNull().default('1.0.0'),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // 'draft', 'active', 'paused', 'archived'
  isTemplate: boolean('is_template').notNull().default(false),
  templateId: uuid('template_id'),
  configuration: jsonb('configuration').notNull().default('{}'),
  steps: jsonb('steps').notNull().default('[]'), // Array of workflow steps
  triggers: jsonb('triggers').default('[]'), // Event triggers
  schedule: jsonb('schedule'), // Cron-like scheduling
  timeoutMinutes: integer('timeout_minutes').default(60),
  maxRetries: integer('max_retries').default(3),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
}, (table) => {
  return {
    nameIdx: index('workflows_name_idx').on(table.name),
    typeIdx: index('workflows_type_idx').on(table.type),
    statusIdx: index('workflows_status_idx').on(table.status),
    createdByIdx: index('workflows_created_by_idx').on(table.createdBy),
    templateIdx: index('workflows_template_idx').on(table.isTemplate),
    nextRunIdx: index('workflows_next_run_idx').on(table.nextRunAt),
    templateFk: foreignKey({
      name: 'workflows_template_id_fkey',
      columns: [table.templateId],
      foreignColumns: [table.id]
    }).onDelete('set null'),
  };
});

export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(), // 'manual', 'scheduled', 'event'
  triggeredBy: uuid('triggered_by').references(() => users.id),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  duration: integer('duration'), // Duration in seconds
  input: jsonb('input').default('{}'),
  output: jsonb('output').default('{}'),
  error: text('error'),
  logs: jsonb('logs').default('[]'),
  metadata: jsonb('metadata').default('{}'),
}, (table) => {
  return {
    workflowIdIdx: index('workflow_executions_workflow_id_idx').on(table.workflowId),
    statusIdx: index('workflow_executions_status_idx').on(table.status),
    startedAtIdx: index('workflow_executions_started_at_idx').on(table.startedAt),
    triggeredByIdx: index('workflow_executions_triggered_by_idx').on(table.triggeredBy),
  };
});

export const workflowStepExecutions = pgTable('workflow_step_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id').notNull().references(() => workflowExecutions.id, { onDelete: 'cascade' }),
  stepId: varchar('step_id', { length: 100 }).notNull(), // Reference to step in workflow.steps
  agentId: uuid('agent_id').references(() => agents.id),
  stepName: varchar('step_name', { length: 255 }).notNull(),
  stepType: varchar('step_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  order: integer('order').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  duration: integer('duration'), // Duration in seconds
  input: jsonb('input').default('{}'),
  output: jsonb('output').default('{}'),
  error: text('error'),
  retryCount: integer('retry_count').default(0),
  metadata: jsonb('metadata').default('{}'),
}, (table) => {
  return {
    executionIdIdx: index('workflow_step_executions_execution_id_idx').on(table.executionId),
    statusIdx: index('workflow_step_executions_status_idx').on(table.status),
    agentIdIdx: index('workflow_step_executions_agent_id_idx').on(table.agentId),
    orderIdx: index('workflow_step_executions_order_idx').on(table.order),
  };
});