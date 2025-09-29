import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  BarChart3,
  Trash2,
  Edit3,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useApiData } from '@/hooks';
import { agentService } from '@/services/agentService';
import { apiClient } from '@/services/api';
import type { Agent, PaginatedResult } from '@/types';
import { logger } from '@/utils/logger';

interface WorkflowExecution {
  id: string;
  workflowId: string;
  agentName: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  startTime: Date;
  endTime?: Date;
  progress: number;
  currentStep?: string;
}

export const AgentManagement: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch agents data
  const {
    data: agentsResult,
    loading: agentsLoading,
    error: agentsError,
    refresh: refreshAgents,
  } = useApiData<PaginatedResult<Agent>>(
    () => agentService.listAgents({ limit: 100 }),
    {
      cacheKey: 'admin-agents',
      retryAttempts: 2,
    }
  );

  const {
    data: executionsData,
    loading: executionsLoading,
    error: executionsError,
    refresh: refreshExecutions,
  } = useApiData<WorkflowExecution[]>(
    () => apiClient.get<WorkflowExecution[]>('/v1/workflows/executions'),
    {
      cacheKey: 'workflow-executions',
      retryAttempts: 1,
      immediate: false,
    }
  );

  useEffect(() => {
    if (agentsResult?.items) {
      setAgents(agentsResult.items);
    }
  }, [agentsResult]);

  useEffect(() => {
    if (executionsData) {
      setWorkflowExecutions(executionsData);
    }
  }, [executionsData]);

  useEffect(() => {
    void refreshExecutions();
  }, [refreshExecutions]);

  // Real-time updates via polling (in production, use WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      void refreshAgents();
      void refreshExecutions();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshAgents, refreshExecutions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
  await Promise.all([refreshAgents(), refreshExecutions()]);
      logger.info('Agent data refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh agent data', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setRefreshing(false);
    }
  };

  const handleAgentAction = async (agentId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      logger.info(`Performing ${action} action on agent ${agentId}`);
      if (action === 'restart') {
        await agentService.updateAgentStatus(agentId, 'inactive');
        await agentService.updateAgentStatus(agentId, 'active');
      } else if (action === 'start') {
        await agentService.updateAgentStatus(agentId, 'active');
      } else {
        await agentService.updateAgentStatus(agentId, 'inactive');
      }

      await refreshAgents();
    } catch (error) {
      logger.error(`Failed to ${action} agent`, error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    try {
      await agentService.deleteAgent(agentId);
      await refreshAgents();
      logger.info(`Agent ${agentId} deleted successfully`);
    } catch (error) {
      logger.error('Failed to delete agent', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 gb-green-100';
      case 'paused':
        return 'text-yellow-600 gb-yellow-100';
      case 'error':
        return 'text-red-600 gb-red-100';
      case 'inactive':
      case 'maintenance':
        return 'text-gray-600 gb-gray-100';
      default:
        return 'text-gray-600 gb-gray-100';
    }
  };

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'paused':
        return <Clock className="w-4 h-4" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      case 'inactive':
      case 'maintenance':
        return <Square className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (agentsLoading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and control AI agents in the Cartrita McDaniels Suarez platform
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 gb-white hover:gb-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white gb-blue-600 hover:gb-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Agent
          </button>
        </div>
      </div>

        {agentsError && (
          <div className="rounded-lg border border-red-200 gb-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load agents: {agentsError.message}
          </div>
        )}

        {executionsError && (
          <div className="rounded-lg border border-yellow-200 gb-yellow-50 px-4 py-3 text-sm text-yellow-700">
            Workflow execution data is temporarily unavailable.
          </div>
        )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="gb-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 gb-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900">
                {agents.filter(agent => agent.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="gb-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 gb-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Running Tasks</p>
              <p className="text-2xl font-bold text-gray-900">
                {workflowExecutions.filter(exec => exec.status === 'running').length}
              </p>
            </div>
          </div>
        </div>

        <div className="gb-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 gb-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {agents.length > 0
                  ? Math.round(
                      agents.reduce((sum, agent) => {
                        const successRate = agent.performance?.successRate ?? 0;
                        return sum + successRate;
                      }, 0) / agents.length
                    )
                  : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="gb-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 gb-yellow-100 rounded-lg">
              <Cpu className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg CPU Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {agents.length > 0
                  ? Math.round(
                      agents.reduce((sum, agent) => {
                        const cpuUsage = agent.performance?.cpuUsage ?? 0;
                        return sum + cpuUsage;
                      }, 0) / agents.length
                    )
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="gb-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Registered Agents</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="gb-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="gb-white divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:gb-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full gb-blue-100 flex items-center justify-center">
                          <Activity className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                        <div className="text-sm text-gray-500">{agent.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                      {getStatusIcon(agent.status)}
                      <span className="ml-1">{agent.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>{agent.performance?.tasksCompleted ?? 0} tasks</div>
                      <div className="text-gray-500">{agent.performance?.successRate ?? 0}% success</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.lastActivity
                      ? new Date(agent.lastActivity).toLocaleString()
                      : agent.updatedAt
                        ? new Date(agent.updatedAt).toLocaleString()
                        : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {agent.status !== 'active' ? (
                        <button
                          onClick={() => handleAgentAction(agent.id, 'start')}
                          className="text-green-600 hover:text-green-900"
                          title="Start Agent"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAgentAction(agent.id, 'stop')}
                          className="text-red-600 hover:text-red-900"
                          title="Stop Agent"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleAgentAction(agent.id, 'restart')}
                        className="text-blue-600 hover:text-blue-900"
                        title="Restart Agent"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAgent(agent);
                          setIsConfigModalOpen(true);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                        title="Configure Agent"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedAgent(agent)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Agent"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Agent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Workflows */}
      <div className="gb-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Workflows</h3>
        </div>

        <div className="p-6">
          {workflowExecutions.filter(exec => exec.status === 'running').length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active workflows</p>
          ) : (
            <div className="space-y-4">
              {workflowExecutions
                .filter(exec => exec.status === 'running')
                .map((execution) => (
                  <div key={execution.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{execution.workflowId}</h4>
                        <p className="text-sm text-gray-500">Agent: {execution.agentName}</p>
                        <p className="text-sm text-gray-500">
                          Started: {new Date(execution.startTime).toLocaleString()}
                        </p>
                        {execution.currentStep && (
                          <p className="text-sm text-blue-600">Current: {execution.currentStep}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gb-blue-100 text-blue-800">
                          {execution.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{execution.progress}%</span>
                      </div>
                      <div className="w-full gb-gray-200 rounded-full h-2">
                        <div
                          className="gb-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${execution.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};