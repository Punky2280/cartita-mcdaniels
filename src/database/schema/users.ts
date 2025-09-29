import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';

// Consolidated users table with comprehensive security features
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  permissions: jsonb('permissions').default('[]'),

  // Account status and verification
  isActive: boolean('is_active').notNull().default(true),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),

  // Security features
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 32 }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  loginAttempts: integer('login_attempts').default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),

  // User preferences and metadata
  preferences: jsonb('preferences').default('{}'),
  metadata: jsonb('metadata').default('{}'),

  // Audit timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
}, (table) => {
  return {
    // Performance indexes
    emailIdx: index('users_email_idx').on(table.email),
    usernameIdx: index('users_username_idx').on(table.username),
    roleIdx: index('users_role_idx').on(table.role),
    activeIdx: index('users_active_idx').on(table.isActive),
    createdAtIdx: index('users_created_at_idx').on(table.createdAt),

    // Security indexes
    loginAttemptsIdx: index('users_login_attempts_idx').on(table.loginAttempts),
    lockedUntilIdx: index('users_locked_until_idx').on(table.lockedUntil),
    twoFactorIdx: index('users_two_factor_idx').on(table.twoFactorEnabled),

    // Soft delete index
    deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt),
  };
});

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  refreshToken: varchar('refresh_token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => {
  return {
    userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
    tokenIdx: index('user_sessions_token_idx').on(table.token),
    expiresAtIdx: index('user_sessions_expires_at_idx').on(table.expiresAt),
    activeIdx: index('user_sessions_active_idx').on(table.isActive),
  };
});