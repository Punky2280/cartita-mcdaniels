import { FastifyPluginAsync } from 'fastify';
import {
  createAgentHandler,
  getAgentsHandler,
  getAgentHandler,
  updateAgentHandler,
  deleteAgentHandler
} from '../handlers/agents.js';
import {
  CreateAgentSchema,
  AgentResponseSchema,
  UpdateAgentSchema,
  AgentQuerySchema,
  AgentParamsSchema
} from '../schemas/agents.js';
import { ErrorResponseSchema, ListResponseSchema, SuccessResponseSchema } from '../schemas/common.js';

const agentRoutes: FastifyPluginAsync = async (fastify) => {
  // Create agent
  fastify.post<{ Body: any }>('/', {
    schema: {
      description: 'Create a new agent',
      tags: ['Agents'],
      security: [{ bearerAuth: [] }],
      body: CreateAgentSchema,
      response: {
        201: AgentResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, createAgentHandler);

  // List agents
  fastify.get<{ Querystring: any }>('/', {
    schema: {
      description: 'List all agents with pagination and filtering',
      tags: ['Agents'],
      querystring: AgentQuerySchema,
      response: {
        200: ListResponseSchema(AgentResponseSchema),
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, getAgentsHandler);

  // Get agent by ID
  fastify.get<{ Params: any }>('/:id', {
    schema: {
      description: 'Get agent by ID',
      tags: ['Agents'],
      params: AgentParamsSchema,
      response: {
        200: AgentResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, getAgentHandler);

  // Update agent
  fastify.put<{ Params: any; Body: any }>('/:id', {
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
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, updateAgentHandler);

  // Delete agent
  fastify.delete<{ Params: any }>('/:id', {
    schema: {
      description: 'Delete an agent',
      tags: ['Agents'],
      security: [{ bearerAuth: [] }],
      params: AgentParamsSchema,
      response: {
        200: SuccessResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, deleteAgentHandler);
};

export default agentRoutes;