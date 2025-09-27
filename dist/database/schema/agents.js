import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
export const agents = pgTable('agents', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 256 }).notNull().unique(),
    instructions: varchar('instructions', { length: 4096 }).notNull(),
    model: varchar('model', { length: 100 }).default('gpt-4o'),
    tools: jsonb('tools').default('[]'),
    createdAt: timestamp('created_at').defaultNow(),
});
