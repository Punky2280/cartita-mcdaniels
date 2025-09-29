import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  RefreshCw,
  Eye,
  Download,
  GitBranch,
  Zap,
  Cpu,
  Timer,
  TrendingUp,
  ArrowRight,
  ArrowDown
} from 'lucide-react';
import { useApiData } from '@/hooks';
import { logger } from '@/utils/logger';

interface WorkflowExecution {
  id: string;
  workflowId: string;
  name: string;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'queued' | 'paused';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  progress: number;
  currentStep?: string;
  totalSteps: number;
  completedSteps: number;
  initiatedBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  agents: string[];
  input: unknown;
  output?: unknown;
  error?: string;
  steps: WorkflowStepExecution[];
  metrics: {
    totalExecutionTime: number;
    averageStepTime: number;
    memoryUsage: number;
    cpuUsage: number;
    successRate: number;
  };
}

interface WorkflowStepExecution {
  id: string;
  stepId: string;
  name: string;
  agentName?: string;
  taskType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

interface OrchestratorMetrics {
  totalWorkflows: number;
  runningWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  systemLoad: number;
  memoryUsage: number;
  agentUtilization: number;
  throughput: number;
}

interface AgentStatus {
  name: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  currentTask?: string;
  taskQueue: number;
  performance: {
    tasksCompleted: number;
    averageResponseTime: number;
    successRate: number;
  };
}

export const OrchestratorMonitoring: React.FC = () => {
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');

  // Fetch orchestrator data
  const { data: executionsData, loading: executionsLoading, refetch: refetchExecutions } = useApiData<WorkflowExecution[]>(`/api/orchestrator/executions?timeFilter=${timeFilter}&status=${statusFilter}`);
  const { data: metricsData, loading: metricsLoading, refetch: refetchMetrics } = useApiData<OrchestratorMetrics>('/api/orchestrator/metrics');
  const { data: agentStatusData, loading: agentStatusLoading, refetch: refetchAgentStatus } = useApiData<AgentStatus[]>('/api/orchestrator/agents/status');

  useEffect(() => {
    if (executionsData) {
      setWorkflowExecutions(executionsData);
    }
  }, [executionsData]);

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetchExecutions();
      refetchMetrics();
      refetchAgentStatus();
    }, 3000); // Frequent updates for real-time monitoring

    return () => clearInterval(interval);
  }, [refetchExecutions, refetchMetrics, refetchAgentStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchExecutions(), refetchMetrics(), refetchAgentStatus()]);
      logger.info('Orchestrator data refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh orchestrator data', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setRefreshing(false);
    }
  };

  const handleWorkflowAction = async (executionId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      logger.info(`Performing ${action} action on workflow execution ${executionId}`);
      await fetch(`/api/orchestrator/executions/${executionId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      await refetchExecutions();
    } catch (error) {
      logger.error(`Failed to ${action} workflow execution`, error instanceof Error ? error : new Error(String(error)));
    }
  };

  const getStatusColor = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'queued': return 'text-yellow-600 bg-yellow-100';
      case 'paused': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4 animate-pulse" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'queued': return <Clock className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: WorkflowExecution['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (executionsLoading && workflowExecutions.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Orchestrator Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of workflow executions and agent orchestration
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Running Workflows</p>
              <p className="text-2xl font-bold text-gray-900">
                {metricsData?.runningWorkflows || workflowExecutions.filter(w => w.status === 'running').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {metricsData?.completedWorkflows || workflowExecutions.filter(w => w.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Timer className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Execution</p>
              <p className="text-2xl font-bold text-gray-900">
                {metricsData?.averageExecutionTime ? formatDuration(metricsData.averageExecutionTime) : '0s'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Throughput</p>
              <p className="text-2xl font-bold text-gray-900">
                {metricsData?.throughput || 0}/hr
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Resource Usage */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">System Load</span>
              <span className="text-sm font-medium">{metricsData?.systemLoad || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  (metricsData?.systemLoad || 0) > 80 ? 'bg-red-500' :
                  (metricsData?.systemLoad || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${metricsData?.systemLoad || 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <span className="text-sm font-medium">{metricsData?.memoryUsage || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  (metricsData?.memoryUsage || 0) > 80 ? 'bg-red-500' :
                  (metricsData?.memoryUsage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${metricsData?.memoryUsage || 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Agent Utilization</span>
              <span className="text-sm font-medium">{metricsData?.agentUtilization || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  (metricsData?.agentUtilization || 0) > 80 ? 'bg-red-500' :
                  (metricsData?.agentUtilization || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${metricsData?.agentUtilization || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Workflows */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Workflow Executions</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workflowExecutions.map((execution) => (
                <tr key={execution.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{execution.name}</div>
                      <div className="text-sm text-gray-500">{execution.workflowId}</div>
                      <div className="text-xs text-gray-400">
                        {execution.agents.length} agents • {execution.totalSteps} steps
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                      {getStatusIcon(execution.status)}
                      <span className="ml-1">{execution.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${execution.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{execution.progress}%</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {execution.completedSteps}/{execution.totalSteps} steps
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {execution.duration ? formatDuration(execution.duration) :
                     execution.startTime ? formatDuration(Date.now() - new Date(execution.startTime).getTime()) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${getPriorityColor(execution.priority)}`}></div>
                      <span className="text-sm text-gray-900 capitalize">{execution.priority}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedExecution(execution)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {execution.status === 'running' && (
                        <button
                          onClick={() => handleWorkflowAction(execution.id, 'pause')}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {execution.status === 'paused' && (
                        <button
                          onClick={() => handleWorkflowAction(execution.id, 'resume')}
                          className="text-green-600 hover:text-green-900"
                          title="Resume"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {['running', 'paused', 'queued'].includes(execution.status) && (
                        <button
                          onClick={() => handleWorkflowAction(execution.id, 'cancel')}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Status Overview */}
      {agentStatusData && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentStatusData.map((agent) => (
              <div key={agent.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{agent.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agent.status === 'active' ? 'bg-green-100 text-green-800' :
                    agent.status === 'busy' ? 'bg-blue-100 text-blue-800' :
                    agent.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                {agent.currentTask && (
                  <p className="text-sm text-gray-600 mb-2">Task: {agent.currentTask}</p>
                )}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Queue: {agent.taskQueue}</span>
                  <span>Success: {agent.performance.successRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};