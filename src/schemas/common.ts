import { Type, Static } from '@sinclair/typebox';

// Error response schema
export const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Any()),
    timestamp: Type.String(),
    path: Type.Optional(Type.String())
  })
});

// Pagination schema
export const PaginationSchema = Type.Object({
  total: Type.Number(),
  limit: Type.Number(),
  offset: Type.Number(),
  hasMore: Type.Boolean()
});

// Generic list response schema
export const ListResponseSchema = <T extends ReturnType<typeof Type.Object>>(itemSchema: T) => Type.Object({
  data: Type.Array(itemSchema),
  pagination: PaginationSchema
});

// Success response schema
export const SuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any())
});

// Type exports
export type ErrorResponse = Static<typeof ErrorResponseSchema>;
export type PaginationResponse = Static<typeof PaginationSchema>;
export type SuccessResponse = Static<typeof SuccessResponseSchema>;