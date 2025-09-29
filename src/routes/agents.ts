import type { FastifyPluginAsync } from 'fastify';
import { eq, desc, count, and, ilike, sql } from 'drizzle-orm';
import { Type } from '@sinclair/typebox';
import {
  CreateAgentSchema,
  UpdateAgentSchema,
  AgentResponseSchema,
  AgentQuerySchema,
  AgentParamsSchema,
  type CreateAgent,
  type AgentQuery,
  type AgentParams,
  type UpdateAgent
} from '../schemas/agents.js';
import { ErrorResponseSchema, ListResponseSchema, SuccessResponseSchema } from '../schemas/common.js';
import { agents } from '../database/schema/agents.js';

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

const agentRoutes: FastifyPluginAsync = async (fastify) => {
  // Create agent
  fastify.post<{ Body: CreateAgent }>('/', {
    schema: {
      description: 'Create a new agent',
      tags: ['Agents'],
      security: [{ bearerAuth: [] }],
      body: CreateAgentSchema,
      response: {
        201: AgentResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const user = await request.requireAuth(['agents:create', 'admin']);
  const agentData = request.body;

      // Validate agent type
      const validTypes = ['code', 'research', 'documentation', 'analysis', 'orchestrator', 'custom'];
      if (!validTypes.includes(agentData.type)) {
        return reply.apiError('INVALID_AGENT_TYPE', `Agent type must be one of: ${validTypes.join(', ')}`, 400);
      }

      // Create agent in database
      const [newAgent] = await fastify.db.insert(agents)
        .values({
          name: agentData.name,
          description: agentData.description,
          type: agentData.type,
          status: 'inactive',
          config: agentData.config ?? {},
          capabilities: agentData.capabilities ?? [],
          mcpServers: agentData.mcpServers ?? [],
          createdBy: user.id
        })
        .returning();

      return reply.status(201).apiSuccess({
        id: newAgent.id,
        name: newAgent.name,
        description: newAgent.description,
        type: newAgent.type,
        status: newAgent.status,
        config: newAgent.config,
        capabilities: newAgent.capabilities,
        mcpServers: newAgent.mcpServers,
        createdBy: newAgent.createdBy,
        createdAt: newAgent.createdAt,
        updatedAt: newAgent.updatedAt
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error creating agent');
      return reply.apiError('AGENT_CREATION_FAILED', 'Failed to create agent', 500, err);
    }
  });

  // List agents
  fastify.get<{ Querystring: AgentQuery }>('/', {
    schema: {
      description: 'List all agents with pagination and filtering',
      tags: ['Agents'],
      security: [{ bearerAuth: [] }],
      querystring: AgentQuerySchema,
      response: {
        200: Type.Object({
          data: Type.Array(AgentResponseSchema),
          pagination: Type.Object({
            total: Type.Number(),
            limit: Type.Number(),
            offset: Type.Number(),
            hasMore: Type.Boolean()
          })
        }),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['agents:read', 'admin']);
  const query = request.query;

  const limit = Math.min(query.limit ?? 10, 100); // Max 100 items per page
  const offset = query.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;

      // Build filter conditions
      const conditions = [];

      if (query.type) {
        conditions.push(eq(agents.type, query.type));
      }

      if (query.status) {
        conditions.push(eq(agents.status, query.status));
      }

      if (query.search) {
        conditions.push(
          sql`(
            ${agents.name} ILIKE ${`%${query.search}%`} OR
            ${agents.description} ILIKE ${`%${query.search}%`}
          )`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ total }] = await fastify.db
        .select({ total: count() })
        .from(agents)
        .where(whereClause);

      // Get paginated results
      const results = await fastify.db
        .select({
          id: agents.id,
          name: agents.name,
          description: agents.description,
          type: agents.type,
          status: agents.status,
          config: agents.config,
          capabilities: agents.capabilities,
          mcpServers: agents.mcpServers,
          createdBy: agents.createdBy,
          createdAt: agents.createdAt,
          updatedAt: agents.updatedAt
        })
        .from(agents)
        .where(whereClause)
        .orderBy(desc(agents.createdAt))
        .limit(limit)
        .offset(offset);

      return reply.apiPaginated(results, {
        page,
        limit,
        total: Number(total)
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error listing agents');
      return reply.apiError('AGENTS_LIST_FAILED', 'Failed to list agents', 500, err);
    }
  });

  // Get agent by ID
  fastify.get<{ Params: AgentParams }>('/:id', {
    schema: {
      description: 'Get agent by ID',
      tags: ['Agents'],
      security: [{ bearerAuth: [] }],
      params: AgentParamsSchema,
      response: {
        200: AgentResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      await request.requireAuth(['agents:read', 'admin']);
      const { id } = request.params;

      const [agent] = await fastify.db
        .select()
        .from(agents)
        .where(eq(agents.id, id))
        .limit(1);

      if (!agent) {
        return reply.apiError('AGENT_NOT_FOUND', 'Agent not found', 404);
      }

      return reply.apiSuccess({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        type: agent.type,
        status: agent.status,
        config: agent.config,
        capabilities: agent.capabilities,
        mcpServers: agent.mcpServers,
        createdBy: agent.createdBy,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error getting agent');
      return reply.apiError('AGENT_RETRIEVAL_FAILED', 'Failed to retrieve agent', 500, err);
    }
  });

  // Update agent
  fastify.put<{ Params: AgentParams; Body: UpdateAgent }>('/:id', {
    schema: {
      description: 'Update an existing agent',
      tags: ['Agents'],
      security: [{ bearerAuth: [] }],
      params: AgentParamsSchema,
      body: UpdateAgentSchema,
      response: {
        200: AgentResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const user = await request.requireAuth(['agents:update', 'admin']);
      const { id } = request.params;
      const updateData = request.body;

      // Check if agent exists
      const [existingAgent] = await fastify.db
        .select()
        .from(agents)
        .where(eq(agents.id, id))
        .limit(1);

      if (!existingAgent) {
        return reply.apiError('AGENT_NOT_FOUND', 'Agent not found', 404);
      }

      // Check ownership or admin permission
      if (existingAgent.createdBy !== user.id && !user.permissions.includes('admin')) {
        return reply.apiError('INSUFFICIENT_PERMISSIONS', 'You can only update agents you created', 403);
      }

      // Validate agent type if provided
      if (updateData.type) {
        const validTypes = ['code', 'research', 'documentation', 'analysis', 'orchestrator', 'custom'];
        if (!validTypes.includes(updateData.type)) {
          return reply.apiError('INVALID_AGENT_TYPE', `Agent type must be one of: ${validTypes.join(', ')}`, 400);
        }
      }

      // Update agent
      const [updatedAgent] = await fastify.db
        .update(agents)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(agents.id, id))
        .returning();

      return reply.apiSuccess({
        id: updatedAgent.id,
        name: updatedAgent.name,
        description: updatedAgent.description,
        type: updatedAgent.type,
        status: updatedAgent.status,
        config: updatedAgent.config,
        capabilities: updatedAgent.capabilities,
        mcpServers: updatedAgent.mcpServers,
        createdBy: updatedAgent.createdBy,
        createdAt: updatedAgent.createdAt,
        updatedAt: updatedAgent.updatedAt
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error updating agent');
      return reply.apiError('AGENT_UPDATE_FAILED', 'Failed to update agent', 500, err);
    }
  });

  // Delete agent
  fastify.delete<{ Params: AgentParams }>('/:id', {
    schema: {
      description: 'Delete an agent',
      tags: ['Agents'],
      security: [{ bearerAuth: [] }],
      params: AgentParamsSchema,
      response: {
        204: SuccessResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const user = await request.requireAuth(['agents:delete', 'admin']);
      const { id } = request.params;

      // Check if agent exists
      const [existingAgent] = await fastify.db
        .select()
        .from(agents)
        .where(eq(agents.id, id))
        .limit(1);

      if (!existingAgent) {
        return reply.apiError('AGENT_NOT_FOUND', 'Agent not found', 404);
      }

      // Check ownership or admin permission
      if (existingAgent.createdBy !== user.id && !user.permissions.includes('admin')) {
        return reply.apiError('INSUFFICIENT_PERMISSIONS', 'You can only delete agents you created', 403);
      }

      // Delete agent
      await fastify.db
        .delete(agents)
        .where(eq(agents.id, id));

      return reply.status(204).send();
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error deleting agent');
      return reply.apiError('AGENT_DELETION_FAILED', 'Failed to delete agent', 500, err);
    }
  });

  // Agent status management
  fastify.patch<{ Params: AgentParams; Body: { status: string } }>('/:id/status', {
    schema: {
      description: 'Update agent status',
      tags: ['Agents'],
      security: [{ bearerAuth: [] }],
      params: AgentParamsSchema,
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'paused', 'error', 'maintenance']
          }
        }
      },
      response: {
        200: AgentResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const user = await request.requireAuth(['agents:update', 'admin']);
      const { id } = request.params;
      const { status } = request.body;

      // Check if agent exists
      const [existingAgent] = await fastify.db
        .select()
        .from(agents)
        .where(eq(agents.id, id))
        .limit(1);

      if (!existingAgent) {
        return reply.apiError('AGENT_NOT_FOUND', 'Agent not found', 404);
      }

      // Check ownership or admin permission
      if (existingAgent.createdBy !== user.id && !user.permissions.includes('admin')) {
        return reply.apiError('INSUFFICIENT_PERMISSIONS', 'You can only update agents you created', 403);
      }

      // Update status
      const [updatedAgent] = await fastify.db
        .update(agents)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(agents.id, id))
        .returning();

      return reply.apiSuccess({
        id: updatedAgent.id,
        name: updatedAgent.name,
        description: updatedAgent.description,
        type: updatedAgent.type,
        status: updatedAgent.status,
        config: updatedAgent.config,
        capabilities: updatedAgent.capabilities,
        mcpServers: updatedAgent.mcpServers,
        createdBy: updatedAgent.createdBy,
        createdAt: updatedAgent.createdAt,
        updatedAt: updatedAgent.updatedAt
      });
    } catch (error) {
      const err = toError(error);
      fastify.log.error({ err }, 'Error updating agent status');
      return reply.apiError('AGENT_STATUS_UPDATE_FAILED', 'Failed to update agent status', 500, err);
    }
  });
};

export default agentRoutes;