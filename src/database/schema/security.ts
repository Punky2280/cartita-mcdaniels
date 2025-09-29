import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// API Keys table for API authentication
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissions: jsonb('permissions').default('[]'),
  scopes: jsonb('scopes').default('[]'),
  lastUsed: timestamp('last_used', { withTimezone: true }),
  usageCount: integer('usage_count').default(0),
  rateLimit: integer('rate_limit').default(100), // requests per minute
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  keyHashIdx: index('api_keys_key_hash_idx').on(table.keyHash),
  userIdIdx: index('api_keys_user_id_idx').on(table.userId),
}));

// Sessions table for web sessions
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  lastActivity: timestamp('last_activity', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionTokenIdx: index('sessions_session_token_idx').on(table.sessionToken),
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

// Audit logs for security events
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: varchar('resource_id', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').default('{}'),
  severity: varchar('severity', { length: 20 }).notNull().default('info'), // info, warning, error, critical
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  actionIdx: index('audit_logs_action_idx').on(table.action),
  timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
  severityIdx: index('audit_logs_severity_idx').on(table.severity),
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
}));

// Security incidents for threat detection
export const securityIncidents = pgTable('security_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(), // brute_force, rate_limit, suspicious_activity, etc.
  severity: varchar('severity', { length: 20 }).notNull(), // low, medium, high, critical
  status: varchar('status', { length: 20 }).notNull().default('open'), // open, investigating, resolved, false_positive
  source: varchar('source', { length: 100 }), // ip_address, user_agent, etc.
  sourceValue: varchar('source_value', { length: 255 }),
  description: text('description'),
  metadata: jsonb('metadata').default('{}'),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolution: text('resolution'),
}, (table) => ({
  typeIdx: index('security_incidents_type_idx').on(table.type),
  severityIdx: index('security_incidents_severity_idx').on(table.severity),
  statusIdx: index('security_incidents_status_idx').on(table.status),
  detectedAtIdx: index('security_incidents_detected_at_idx').on(table.detectedAt),
}));

// Rate limiting tracking
export const rateLimitingRules = pgTable('rate_limiting_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  pattern: varchar('pattern', { length: 255 }).notNull(), // endpoint pattern
  method: varchar('method', { length: 10 }), // GET, POST, etc.
  windowMs: integer('window_ms').notNull(), // time window in milliseconds
  maxRequests: integer('max_requests').notNull(),
  skipSuccessfulRequests: boolean('skip_successful_requests').default(false),
  skipFailedRequests: boolean('skip_failed_requests').default(false),
  keyGenerator: varchar('key_generator', { length: 50 }).default('ip'), // ip, user, api_key
  message: text('message'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  patternIdx: index('rate_limiting_rules_pattern_idx').on(table.pattern),
}));

// MCP server security configurations
export const mcpSecurity = pgTable('mcp_security', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverName: varchar('server_name', { length: 100 }).notNull().unique(),
  authMethod: varchar('auth_method', { length: 50 }).notNull(), // api_key, oauth2, certificate
  encryptionEnabled: boolean('encryption_enabled').default(true),
  tlsVersion: varchar('tls_version', { length: 10 }).default('1.3'),
  certificatePath: varchar('certificate_path', { length: 255 }),
  privateKeyPath: varchar('private_key_path', { length: 255 }),
  allowedIPs: jsonb('allowed_ips').default('[]'),
  rateLimit: integer('rate_limit').default(100),
  timeoutMs: integer('timeout_ms').default(30000),
  retryAttempts: integer('retry_attempts').default(3),
  healthCheckInterval: integer('health_check_interval').default(60000),
  lastHealthCheck: timestamp('last_health_check', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  serverNameIdx: index('mcp_security_server_name_idx').on(table.serverName),
}));

// Data encryption keys management
export const encryptionKeys = pgTable('encryption_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyId: varchar('key_id', { length: 100 }).notNull().unique(),
  algorithm: varchar('algorithm', { length: 50 }).notNull(), // AES-256-GCM, RSA-4096, etc.
  purpose: varchar('purpose', { length: 100 }).notNull(), // data_encryption, api_signing, mcp_communication
  keyHash: varchar('key_hash', { length: 64 }).notNull(), // Hash of the key for verification
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  rotatedBy: uuid('rotated_by').references(() => users.id, { onDelete: 'set null' }),
}, (table) => ({
  keyIdIdx: index('encryption_keys_key_id_idx').on(table.keyId),
  purposeIdx: index('encryption_keys_purpose_idx').on(table.purpose),
}));

// Compliance audit trails
export const complianceAudits = pgTable('compliance_audits', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditType: varchar('audit_type', { length: 50 }).notNull(), // gdpr, soc2, pci_dss
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, in_progress, completed, failed
  scope: varchar('scope', { length: 100 }), // data_processing, access_controls, etc.
  findings: jsonb('findings').default('[]'),
  recommendations: jsonb('recommendations').default('[]'),
  evidence: jsonb('evidence').default('{}'),
  auditedBy: uuid('audited_by').references(() => users.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  nextAuditDue: timestamp('next_audit_due', { withTimezone: true }),
}, (table) => ({
  auditTypeIdx: index('compliance_audits_audit_type_idx').on(table.auditType),
  statusIdx: index('compliance_audits_status_idx').on(table.status),
}));