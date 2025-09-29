/**
 * Cartrita Interface - Agent Service
 * Provides strongly typed access to the agents API with comprehensive error handling.
 */

import { apiClient } from './api';
import { logger } from '@/utils/logger';
import type {
  Agent,
  AgentStatus,
  AgentType,
  ApiResponse,
  PaginatedResult,
  CreateAgentRequest,
  UpdateAgentRequest
} from '@/types';

export interface ListAgentsParams {
  readonly limit?: number;
  readonly offset?: number;
  readonly status?: AgentStatus | string;
  readonly type?: AgentType | string;
  readonly search?: string;
}

const buildQueryString = (params: ListAgentsParams): string => {
  const query = new URLSearchParams();

  if (typeof params.limit === 'number') {
    query.append('limit', params.limit.toString());
  }

  if (typeof params.offset === 'number') {
    query.append('offset', params.offset.toString());
  }

  if (params.status) {
    query.append('status', params.status);
  }

  if (params.type) {
    query.append('type', params.type);
  }

  if (params.search) {
    query.append('search', params.search);
  }

  const queryString = query.toString();
  return queryString.length > 0 ? `?${queryString}` : '';
};

class AgentService {
  private readonly baseEndpoint = '/v1/agents';

  public async listAgents(params: ListAgentsParams = {}): Promise<ApiResponse<PaginatedResult<Agent>>> {
    try {
      const queryString = buildQueryString(params);
      const response = await apiClient.get<Agent[]>(`${this.baseEndpoint}${queryString}`);

      return {
        ...response,
        data: {
          items: response.data ?? [],
          pagination: {
            page: response.pagination?.page ?? (params.offset && params.limit
              ? Math.floor(params.offset / params.limit) + 1
              : 1),
            limit: response.pagination?.limit ?? params.limit ?? response.data?.length ?? 0,
            total: response.pagination?.total ?? response.data?.length ?? 0,
            totalPages: response.pagination?.totalPages ?? 1,
            hasNext: response.pagination?.hasNext,
            hasPrev: response.pagination?.hasPrev,
          },
        },
      } satisfies ApiResponse<PaginatedResult<Agent>>;
    } catch (error) {
      logger.error('Failed to list agents', error instanceof Error ? error : new Error(String(error)), { params });
      throw error;
    }
  }

  public async getAgent(id: string): Promise<ApiResponse<Agent>> {
    try {
      const response = await apiClient.get<Agent>(`${this.baseEndpoint}/${id}`);
      return response;
    } catch (error) {
      logger.error('Failed to fetch agent', error instanceof Error ? error : new Error(String(error)), { id });
      throw error;
    }
  }

  public async createAgent(payload: CreateAgentRequest): Promise<ApiResponse<Agent>> {
    try {
      const response = await apiClient.post<Agent>(this.baseEndpoint, payload);
      return response;
    } catch (error) {
      logger.error('Failed to create agent', error instanceof Error ? error : new Error(String(error)), { payload });
      throw error;
    }
  }

  public async updateAgent(id: string, payload: UpdateAgentRequest): Promise<ApiResponse<Agent>> {
    try {
      const response = await apiClient.put<Agent>(`${this.baseEndpoint}/${id}`, payload);
      return response;
    } catch (error) {
      logger.error('Failed to update agent', error instanceof Error ? error : new Error(String(error)), { id, payload });
      throw error;
    }
  }

  public async updateAgentStatus(id: string, status: AgentStatus): Promise<ApiResponse<Agent>> {
    try {
      const response = await apiClient.patch<Agent>(`${this.baseEndpoint}/${id}/status`, { status });
      return response;
    } catch (error) {
      logger.error('Failed to update agent status', error instanceof Error ? error : new Error(String(error)), { id, status });
      throw error;
    }
  }

  public async deleteAgent(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseEndpoint}/${id}`);
    } catch (error) {
      logger.error('Failed to delete agent', error instanceof Error ? error : new Error(String(error)), { id });
      throw error;
    }
  }
}

export const agentService = new AgentService();

export default agentService;
