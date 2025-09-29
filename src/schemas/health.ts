import { Type, type Static } from '@sinclair/typebox';

// Health check schema
export const HealthResponseSchema = Type.Object({
  status: Type.String(),
  timestamp: Type.String(),
  version: Type.String(),
  environment: Type.String(),
  database: Type.Object({
    connected: Type.Boolean(),
    latency: Type.Optional(Type.Number())
  })
});

export type HealthResponse = Static<typeof HealthResponseSchema>;