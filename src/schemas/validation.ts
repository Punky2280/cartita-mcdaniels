import { Type, Static } from '@sinclair/typebox';

/**
 * Comprehensive JSON Schema Validation Utilities
 * Provides reusable schema components and validation patterns
 * for secure API input validation
 */

// === COMMON VALIDATION PATTERNS ===

// String patterns
export const StringPatterns = {
  // Basic string types
  NonEmptyString: Type.String({ minLength: 1, maxLength: 1000 }),
  ShortString: Type.String({ minLength: 1, maxLength: 100 }),
  MediumString: Type.String({ minLength: 1, maxLength: 500 }),
  LongString: Type.String({ minLength: 1, maxLength: 2000 }),

  // Identifiers
  UUID: Type.String({
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    description: 'Valid UUID v4'
  }),
  AlphaNumeric: Type.String({
    pattern: '^[a-zA-Z0-9_-]+$',
    minLength: 1,
    maxLength: 100,
    description: 'Alphanumeric with hyphens and underscores'
  }),
  SafeFilename: Type.String({
    pattern: '^[a-zA-Z0-9._-]+$',
    minLength: 1,
    maxLength: 255,
    description: 'Safe filename (no path traversal)'
  }),

  // Communication
  Email: Type.String({
    format: 'email',
    maxLength: 320,
    description: 'Valid email address'
  }),
  URL: Type.String({
    format: 'uri',
    maxLength: 2000,
    description: 'Valid URL'
  }),

  // Security-sensitive
  Password: Type.String({
    minLength: 8,
    maxLength: 128,
    description: 'Password (8-128 characters)'
  }),
  APIKey: Type.String({
    pattern: '^[a-zA-Z0-9_-]{32,128}$',
    description: 'API Key format'
  }),
  JWT: Type.String({
    pattern: '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]*$',
    description: 'JWT token format'
  }),

  // Content validation
  SafeHTML: Type.String({
    maxLength: 10000,
    description: 'HTML content (will be sanitized)'
  }),
  PlainText: Type.String({
    pattern: '^[\\p{L}\\p{N}\\p{P}\\p{Z}\\s]*$',
    maxLength: 5000,
    description: 'Plain text (Unicode letters, numbers, punctuation, spaces)'
  }),
} as const;

// Numeric patterns
export const NumericPatterns = {
  PositiveInteger: Type.Integer({ minimum: 1 }),
  NonNegativeInteger: Type.Integer({ minimum: 0 }),
  LimitedInteger: Type.Integer({ minimum: 0, maximum: 1000000 }),
  PageNumber: Type.Integer({ minimum: 1, maximum: 10000 }),
  PageSize: Type.Integer({ minimum: 1, maximum: 1000, default: 50 }),
  Percentage: Type.Number({ minimum: 0, maximum: 100 }),
  Score: Type.Number({ minimum: 0, maximum: 10 }),
  Timestamp: Type.Integer({ minimum: 0 }),
} as const;

// Date patterns
export const DatePatterns = {
  ISO8601: Type.String({
    format: 'date-time',
    description: 'ISO 8601 date-time string'
  }),
  DateOnly: Type.String({
    format: 'date',
    description: 'Date in YYYY-MM-DD format'
  }),
  TimeOnly: Type.String({
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$',
    description: 'Time in HH:MM:SS format'
  }),
} as const;

// === SECURITY VALIDATION SCHEMAS ===

// Authentication schemas
export const AuthenticationSchemas = {
  LoginRequest: Type.Object({
    email: StringPatterns.Email,
    password: StringPatterns.Password,
    rememberMe: Type.Optional(Type.Boolean()),
    mfaCode: Type.Optional(Type.String({ pattern: '^[0-9]{6}$' })),
  }),

  RegisterRequest: Type.Object({
    email: StringPatterns.Email,
    password: StringPatterns.Password,
    confirmPassword: StringPatterns.Password,
    firstName: StringPatterns.ShortString,
    lastName: StringPatterns.ShortString,
    terms: Type.Literal(true),
  }),

  PasswordResetRequest: Type.Object({
    email: StringPatterns.Email,
  }),

  PasswordChangeRequest: Type.Object({
    currentPassword: StringPatterns.Password,
    newPassword: StringPatterns.Password,
    confirmPassword: StringPatterns.Password,
  }),

  APIKeyRequest: Type.Object({
    name: StringPatterns.ShortString,
    description: Type.Optional(StringPatterns.MediumString),
    expiresIn: Type.Optional(NumericPatterns.PositiveInteger),
    scopes: Type.Array(StringPatterns.AlphaNumeric, { maxItems: 20 }),
  }),
} as const;

// User management schemas
export const UserSchemas = {
  UserProfile: Type.Object({
    firstName: StringPatterns.ShortString,
    lastName: StringPatterns.ShortString,
    email: StringPatterns.Email,
    bio: Type.Optional(StringPatterns.MediumString),
    avatar: Type.Optional(StringPatterns.URL),
    timezone: Type.Optional(StringPatterns.ShortString),
    language: Type.Optional(Type.String({ pattern: '^[a-z]{2}(-[A-Z]{2})?$' })),
  }),

  UserPreferences: Type.Object({
    notifications: Type.Object({
      email: Type.Boolean(),
      push: Type.Boolean(),
      sms: Type.Boolean(),
    }),
    privacy: Type.Object({
      profileVisible: Type.Boolean(),
      dataSharing: Type.Boolean(),
    }),
    ui: Type.Object({
      theme: Type.Union([Type.Literal('light'), Type.Literal('dark'), Type.Literal('auto')]),
      language: Type.String({ pattern: '^[a-z]{2}(-[A-Z]{2})?$' }),
    }),
  }),
} as const;

// AI/Agent schemas
export const AISchemas = {
  ChatMessage: Type.Object({
    content: Type.String({ minLength: 1, maxLength: 8000 }),
    role: Type.Union([Type.Literal('user'), Type.Literal('assistant'), Type.Literal('system')]),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
  }),

  AgentRequest: Type.Object({
    prompt: Type.String({ minLength: 1, maxLength: 4000 }),
    model: Type.Optional(StringPatterns.AlphaNumeric),
    maxTokens: Type.Optional(NumericPatterns.LimitedInteger),
    temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
    context: Type.Optional(Type.Array(Type.Any(), { maxItems: 50 })),
  }),

  CodeAnalysisRequest: Type.Object({
    code: Type.String({ minLength: 1, maxLength: 50000 }),
    language: StringPatterns.AlphaNumeric,
    analysisType: Type.Union([
      Type.Literal('security'),
      Type.Literal('performance'),
      Type.Literal('quality'),
      Type.Literal('style'),
    ]),
    includeFixSuggestions: Type.Optional(Type.Boolean()),
  }),
} as const;

// File upload schemas
export const FileSchemas = {
  FileUpload: Type.Object({
    filename: StringPatterns.SafeFilename,
    mimeType: Type.String({
      pattern: '^[a-zA-Z0-9][a-zA-Z0-9!#$&\\-\\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\\-\\^_]*$',
      maxLength: 100,
    }),
    size: Type.Integer({ minimum: 1, maximum: 50 * 1024 * 1024 }), // 50MB max
    checksum: Type.Optional(Type.String({ pattern: '^[a-f0-9]{64}$' })), // SHA256
  }),

  ImageUpload: Type.Object({
    filename: StringPatterns.SafeFilename,
    mimeType: Type.Union([
      Type.Literal('image/jpeg'),
      Type.Literal('image/png'),
      Type.Literal('image/webp'),
      Type.Literal('image/gif'),
    ]),
    size: Type.Integer({ minimum: 1, maximum: 10 * 1024 * 1024 }), // 10MB max
    dimensions: Type.Optional(Type.Object({
      width: NumericPatterns.PositiveInteger,
      height: NumericPatterns.PositiveInteger,
    })),
  }),
} as const;

// API request/response schemas
const PaginationQuery = Type.Object({
  page: Type.Optional(NumericPatterns.PageNumber),
  limit: Type.Optional(NumericPatterns.PageSize),
  sort: Type.Optional(StringPatterns.AlphaNumeric),
  order: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
});

export const APISchemas = {
  PaginationQuery,

  SearchQuery: Type.Object({
    q: Type.String({ minLength: 1, maxLength: 200 }),
    filters: Type.Optional(Type.Record(Type.String(), Type.String())),
    page: Type.Optional(NumericPatterns.PageNumber),
    limit: Type.Optional(NumericPatterns.PageSize),
    sort: Type.Optional(StringPatterns.AlphaNumeric),
    order: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
  }),

  BulkOperation: Type.Object({
    ids: Type.Array(StringPatterns.UUID, { minItems: 1, maxItems: 1000 }),
    action: StringPatterns.AlphaNumeric,
    options: Type.Optional(Type.Record(Type.String(), Type.Any())),
  }),

  ErrorResponse: Type.Object({
    error: Type.Object({
      code: StringPatterns.AlphaNumeric,
      message: StringPatterns.MediumString,
      details: Type.Optional(Type.Any()),
      timestamp: DatePatterns.ISO8601,
      path: StringPatterns.URL,
    }),
  }),

  SuccessResponse: Type.Object({
    success: Type.Literal(true),
    data: Type.Any(),
    timestamp: DatePatterns.ISO8601,
  }),
} as const;

// === VALIDATION UTILITIES ===

// Create typed interfaces
export type LoginRequest = Static<typeof AuthenticationSchemas.LoginRequest>;
export type RegisterRequest = Static<typeof AuthenticationSchemas.RegisterRequest>;
export type UserProfile = Static<typeof UserSchemas.UserProfile>;
export type ChatMessage = Static<typeof AISchemas.ChatMessage>;
export type AgentRequest = Static<typeof AISchemas.AgentRequest>;
export type PaginationQuery = Static<typeof APISchemas.PaginationQuery>;
export type ErrorResponse = Static<typeof APISchemas.ErrorResponse>;
export type SuccessResponse = Static<typeof APISchemas.SuccessResponse>;

// Security validation helpers
export const SecurityValidation = {
  // Validate against common injection patterns
  validateSQLInjection: (input: string): boolean => {
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(;|\-\-|\/\*|\*\/)/,
      /(\b(OR|AND)\b.*[=<>])/i,
      /(UNION.*SELECT)/i,
    ];
    return !patterns.some(pattern => pattern.test(input));
  },

  // Validate against XSS patterns
  validateXSS: (input: string): boolean => {
    const patterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<.*?\s+(on\w+)\s*=/gi,
    ];
    return !patterns.some(pattern => pattern.test(input));
  },

  // Validate against path traversal
  validatePathTraversal: (input: string): boolean => {
    const patterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
    ];
    return !patterns.some(pattern => pattern.test(input));
  },

  // Validate against command injection
  validateCommandInjection: (input: string): boolean => {
    const patterns = [
      /[;&|`$(){}[\]]/,
      /\b(cat|ls|pwd|whoami|id|uname|curl|wget|nc|netcat)\b/i,
    ];
    return !patterns.some(pattern => pattern.test(input));
  },

  // Comprehensive validation
  validateSecure: (input: string): { isValid: boolean; threats: string[] } => {
    const threats: string[] = [];

    if (!SecurityValidation.validateSQLInjection(input)) {
      threats.push('sql_injection');
    }
    if (!SecurityValidation.validateXSS(input)) {
      threats.push('xss');
    }
    if (!SecurityValidation.validatePathTraversal(input)) {
      threats.push('path_traversal');
    }
    if (!SecurityValidation.validateCommandInjection(input)) {
      threats.push('command_injection');
    }

    return {
      isValid: threats.length === 0,
      threats,
    };
  },
} as const;

// Export all schemas as a single object for easy import
export const ValidationSchemas = {
  StringPatterns,
  NumericPatterns,
  DatePatterns,
  Authentication: AuthenticationSchemas,
  User: UserSchemas,
  AI: AISchemas,
  File: FileSchemas,
  API: APISchemas,
  Security: SecurityValidation,
} as const;