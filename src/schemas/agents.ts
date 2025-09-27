import { Type, Static } from '@sinclair/typebox';

// Agent creation schema
export const CreateAgentSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
  type: Type.Union([
    Type.Literal('research'),
    Type.Literal('code'),
    Type.Literal('knowledge'),
    Type.Literal('base')
  ]),
  config: Type.Optional(Type.Record(Type.String(), Type.Any())),
  capabilities: Type.Optional(Type.Array(Type.String())),
  mcpServers: Type.Optional(Type.Array(Type.String()))
});

export const AgentResponseSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  type: Type.String(),
  status: Type.Union([
    Type.Literal('active'),
    Type.Literal('inactive'),
    Type.Literal('error')
  ]),
  config: Type.Optional(Type.Record(Type.String(), Type.Any())),
  capabilities: Type.Optional(Type.Array(Type.String())),
  mcpServers: Type.Optional(Type.Array(Type.String())),
  createdAt: Type.String(),
  updatedAt: Type.String()
});

export const UpdateAgentSchema = Type.Partial(CreateAgentSchema);

export const AgentQuerySchema = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  type: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  search: Type.Optional(Type.String())
});

export const AgentParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' })
});

// Type exports
export type CreateAgent = Static<typeof CreateAgentSchema>;
export type AgentResponse = Static<typeof AgentResponseSchema>;
export type UpdateAgent = Static<typeof UpdateAgentSchema>;
export type AgentQuery = Static<typeof AgentQuerySchema>;
export type AgentParams = Static<typeof AgentParamsSchema>;