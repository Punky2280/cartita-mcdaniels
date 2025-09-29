import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: 'code' | 'research' | 'documentation' | 'analysis' | 'orchestrator' | 'custom';
  status: 'active' | 'inactive' | 'paused' | 'error' | 'maintenance';
  config: Record<string, any>;
  capabilities: string[];
  mcpServers: string[];
  performance?: {
    tasksCompleted: number;
    averageResponseTime: number;
    successRate: number;
    cpuUsage: number;
    memoryUsage: number;
    lastActivity?: Date;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  agentName: string;
  status: 'running' | 'completed' | 'failed' | 'queued' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  progress: number;
  currentStep?: string;
  steps: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
    result?: any;
    error?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface AgentMetrics {
  totalAgents: number;
  activeAgents: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageSuccessRate: number;
  averageResponseTime: number;
  systemLoad: {
    cpu: number;
    memory: number;
    network: number;
  };
}

interface AgentStore {
  // State
  agents: Agent[];
  selectedAgent: Agent | null;
  workflowExecutions: WorkflowExecution[];
  metrics: AgentMetrics | null;
  loading: {
    agents: boolean;
    executions: boolean;
    metrics: boolean;
    action: boolean;
  };
  error: string | null;
  filters: {
    type?: string;
    status?: string;
    search?: string;
  };

  // Actions
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  setSelectedAgent: (agent: Agent | null) => void;

  setWorkflowExecutions: (executions: WorkflowExecution[]) => void;
  updateWorkflowExecution: (id: string, updates: Partial<WorkflowExecution>) => void;

  setMetrics: (metrics: AgentMetrics) => void;

  setLoading: (key: keyof AgentStore['loading'], value: boolean) => void;
  setError: (error: string | null) => void;

  setFilters: (filters: Partial<AgentStore['filters']>) => void;

  // Computed getters
  getFilteredAgents: () => Agent[];
  getActiveExecutions: () => WorkflowExecution[];
  getAgentById: (id: string) => Agent | undefined;

  // Async actions
  fetchAgents: () => Promise<void>;
  fetchWorkflowExecutions: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  createAgent: (agentData: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAgentStatus: (id: string, status: Agent['status']) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  executeWorkflow: (workflowId: string, agentId: string, params?: Record<string, any>) => Promise<string>;
  cancelWorkflow: (executionId: string) => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const useAgentStore = create<AgentStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        agents: [],
        selectedAgent: null,
        workflowExecutions: [],
        metrics: null,
        loading: {
          agents: false,
          executions: false,
          metrics: false,
          action: false,
        },
        error: null,
        filters: {},

        // Actions
        setAgents: (agents) => set((state) => {
          state.agents = agents;
        }),

        addAgent: (agent) => set((state) => {
          state.agents.push(agent);
        }),

        updateAgent: (id, updates) => set((state) => {
          const index = state.agents.findIndex(agent => agent.id === id);
          if (index !== -1) {
            Object.assign(state.agents[index], updates, { updatedAt: new Date() });
          }
        }),

        removeAgent: (id) => set((state) => {
          state.agents = state.agents.filter(agent => agent.id !== id);
          if (state.selectedAgent?.id === id) {
            state.selectedAgent = null;
          }
        }),

        setSelectedAgent: (agent) => set((state) => {
          state.selectedAgent = agent;
        }),

        setWorkflowExecutions: (executions) => set((state) => {
          state.workflowExecutions = executions;
        }),

        updateWorkflowExecution: (id, updates) => set((state) => {
          const index = state.workflowExecutions.findIndex(exec => exec.id === id);
          if (index !== -1) {
            Object.assign(state.workflowExecutions[index], updates);
          }
        }),

        setMetrics: (metrics) => set((state) => {
          state.metrics = metrics;
        }),

        setLoading: (key, value) => set((state) => {
          state.loading[key] = value;
        }),

        setError: (error) => set((state) => {
          state.error = error;
        }),

        setFilters: (filters) => set((state) => {
          Object.assign(state.filters, filters);
        }),

        // Computed getters
        getFilteredAgents: () => {
          const { agents, filters } = get();
          return agents.filter(agent => {
            if (filters.type && agent.type !== filters.type) return false;
            if (filters.status && agent.status !== filters.status) return false;
            if (filters.search) {
              const search = filters.search.toLowerCase();
              return agent.name.toLowerCase().includes(search) ||
                     agent.description.toLowerCase().includes(search);
            }
            return true;
          });
        },

        getActiveExecutions: () => {
          return get().workflowExecutions.filter(exec =>
            exec.status === 'running' || exec.status === 'queued'
          );
        },

        getAgentById: (id) => {
          return get().agents.find(agent => agent.id === id);
        },

        // Async actions
        fetchAgents: async () => {
          const { setLoading, setError, setAgents } = get();
          setLoading('agents', true);
          setError(null);

          try {
            const response = await fetch(`${API_BASE_URL}/api/v1/agents`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch agents: ${response.statusText}`);
            }

            const data = await response.json();
            setAgents(data.data || []);
          } catch (error) {
            console.error('Error fetching agents:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch agents');
          } finally {
            setLoading('agents', false);
          }
        },

        fetchWorkflowExecutions: async () => {
          const { setLoading, setError, setWorkflowExecutions } = get();
          setLoading('executions', true);
          setError(null);

          try {
            const response = await fetch(`${API_BASE_URL}/api/v1/workflows/executions`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch executions: ${response.statusText}`);
            }

            const data = await response.json();
            setWorkflowExecutions(data.data || []);
          } catch (error) {
            console.error('Error fetching workflow executions:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch workflow executions');
          } finally {
            setLoading('executions', false);
          }
        },

        fetchMetrics: async () => {
          const { setLoading, setError, setMetrics } = get();
          setLoading('metrics', true);
          setError(null);

          try {
            const response = await fetch(`${API_BASE_URL}/api/v1/agents/metrics`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch metrics: ${response.statusText}`);
            }

            const data = await response.json();
            setMetrics(data.data);
          } catch (error) {
            console.error('Error fetching metrics:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch metrics');
          } finally {
            setLoading('metrics', false);
          }
        },

        createAgent: async (agentData) => {
          const { setLoading, setError, addAgent } = get();
          setLoading('action', true);
          setError(null);

          try {
            const response = await fetch(`${API_BASE_URL}/api/v1/agents`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(agentData),
            });

            if (!response.ok) {
              throw new Error(`Failed to create agent: ${response.statusText}`);
            }

            const data = await response.json();
            addAgent(data.data);
          } catch (error) {
            console.error('Error creating agent:', error);
            setError(error instanceof Error ? error.message : 'Failed to create agent');
            throw error;
          } finally {
            setLoading('action', false);
          }
        },

        updateAgentStatus: async (id, status) => {
          const { setLoading, setError, updateAgent } = get();
          setLoading('action', true);
          setError(null);

          try {
            const response = await fetch(`${API_BASE_URL}/api/v1/agents/${id}/status`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status }),
            });

            if (!response.ok) {
              throw new Error(`Failed to update agent status: ${response.statusText}`);
            }

            const data = await response.json();
            updateAgent(id, data.data);
          } catch (error) {
            console.error('Error updating agent status:', error);
            setError(error instanceof Error ? error.message : 'Failed to update agent status');
            throw error;
          } finally {
            setLoading('action', false);
          }
        },

        deleteAgent: async (id) => {
          const { setLoading, setError, removeAgent } = get();
          setLoading('action', true);
          setError(null);

          try {
            const response = await fetch(`${API_BASE_URL}/api/v1/agents/${id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to delete agent: ${response.statusText}`);
            }

            removeAgent(id);
          } catch (error) {
            console.error('Error deleting agent:', error);
            setError(error instanceof Error ? error.message : 'Failed to delete agent');
            throw error;
          } finally {
            setLoading('action', false);
          }
        },

        executeWorkflow: async (workflowId, agentId, params = {}) => {
          const { setLoading, setError } = get();
          setLoading('action', true);
          setError(null);

          try {
            const response = await fetch(`${API_BASE_URL}/api/v1/workflows/${workflowId}/execute`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ agentId, params }),
            });

            if (!response.ok) {
              throw new Error(`Failed to execute workflow: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data.executionId;
          } catch (error) {
            console.error('Error executing workflow:', error);
            setError(error instanceof Error ? error.message : 'Failed to execute workflow');
            throw error;
          } finally {
            setLoading('action', false);
          }
        },

        cancelWorkflow: async (executionId) => {
          const { setLoading, setError, updateWorkflowExecution } = get();
          setLoading('action', true);
          setError(null);

          try {
            const response = await fetch(`${API_BASE_URL}/api/v1/workflows/executions/${executionId}/cancel`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to cancel workflow: ${response.statusText}`);
            }

            updateWorkflowExecution(executionId, { status: 'cancelled' });
          } catch (error) {
            console.error('Error cancelling workflow:', error);
            setError(error instanceof Error ? error.message : 'Failed to cancel workflow');
            throw error;
          } finally {
            setLoading('action', false);
          }
        },
      })),
      {
        name: 'agent-store',
        partialize: (state) => ({
          filters: state.filters,
          selectedAgent: state.selectedAgent,
        }),
      }
    ),
    {
      name: 'agent-store',
    }
  )
);