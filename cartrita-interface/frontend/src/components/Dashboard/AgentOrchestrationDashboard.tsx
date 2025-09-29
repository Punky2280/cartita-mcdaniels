import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Cpu,
  Database,
  Globe,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Plus,
  Filter,
  Search,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

import { useAgentStore } from '@/stores/useAgentStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/UI/Button';
import { StatusBadge } from '@/components/UI/StatusBadge';
import { LoadingSpinner } from '@/components/UI/LoadingSpinner';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: 'claude' | 'ms-blue' | 'gpt-purple' | 'green' | 'red' | 'yellow';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color }) => {
  const colorClasses = {
    claude: 'bg-claude-50 text-claude-600 border-claude-200',
    'ms-blue': 'bg-ms-blue-50 text-ms-blue-600 border-ms-blue-200',
    'gpt-purple': 'bg-gpt-purple-50 text-gpt-purple-600 border-gpt-purple-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline mt-2">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change !== undefined && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`ml-2 text-sm font-medium ${
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {change >= 0 ? '+' : ''}{change}%
              </motion.span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

interface AgentCardProps {
  agent: any;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onConfigure: (agent: any) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onStart,
  onStop,
  onRestart,
  onConfigure,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-500">{agent.type}</p>
          </div>
        </div>
        <StatusBadge status={agent.status} size="sm" />
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{agent.description}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Tasks Completed</p>
          <p className="text-lg font-semibold text-gray-900">
            {agent.performance?.tasksCompleted || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Success Rate</p>
          <p className="text-lg font-semibold text-gray-900">
            {agent.performance?.successRate || 0}%
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {agent.status === 'inactive' ? (
          <Button
            size="sm"
            variant="primary"
            icon={<Play className="w-4 h-4" />}
            onClick={() => onStart(agent.id)}
          >
            Start
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            icon={<Pause className="w-4 h-4" />}
            onClick={() => onStop(agent.id)}
          >
            Stop
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={() => onRestart(agent.id)}
        />
        <Button
          size="sm"
          variant="ghost"
          icon={<Settings className="w-4 h-4" />}
          onClick={() => onConfigure(agent)}
        />
      </div>
    </motion.div>
  );
};

export const AgentOrchestrationDashboard: React.FC = () => {
  const {
    agents,
    workflowExecutions,
    metrics,
    loading,
    error,
    filters,
    getFilteredAgents,
    getActiveExecutions,
    fetchAgents,
    fetchWorkflowExecutions,
    fetchMetrics,
    updateAgentStatus,
    setFilters,
  } = useAgentStore();

  const { isConnected, connectionError, lastMessage } = useWebSocket({
    autoConnect: true,
    enableHeartbeat: true,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Initialize data
  useEffect(() => {
    fetchAgents();
    fetchWorkflowExecutions();
    fetchMetrics();
  }, [fetchAgents, fetchWorkflowExecutions, fetchMetrics]);

  // Update filters
  useEffect(() => {
    setFilters({
      search: searchTerm,
      type: selectedType || undefined,
      status: selectedStatus || undefined,
    });
  }, [searchTerm, selectedType, selectedStatus, setFilters]);

  const filteredAgents = getFilteredAgents();
  const activeExecutions = getActiveExecutions();

  const handleAgentAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const statusMap = {
        start: 'active' as const,
        stop: 'inactive' as const,
        restart: 'active' as const,
      };

      await updateAgentStatus(id, statusMap[action]);
    } catch (error) {
      console.error(`Failed to ${action} agent:`, error);
    }
  };

  const handleConfigure = (agent: any) => {
    // Open configuration modal
    console.log('Configure agent:', agent);
  };

  const metricsData = [
    {
      title: 'Total Agents',
      value: agents.length,
      change: 5,
      icon: <Users className="w-6 h-6" />,
      color: 'claude' as const,
    },
    {
      title: 'Active Agents',
      value: agents.filter(a => a.status === 'active').length,
      change: 12,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green' as const,
    },
    {
      title: 'Running Tasks',
      value: activeExecutions.length,
      change: -3,
      icon: <Activity className="w-6 h-6" />,
      color: 'ms-blue' as const,
    },
    {
      title: 'Success Rate',
      value: `${metrics?.averageSuccessRate || 0}%`,
      change: 8,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'gpt-purple' as const,
    },
  ];

  if (loading.agents && agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Loading Agent Dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Orchestration</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage your AI agents in real-time
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => console.log('Create agent')}
          >
            Create Agent
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsData.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Real-time Message Indicator */}
      <AnimatePresence>
        {lastMessage && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">
                Real-time update: {lastMessage.type}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-claude-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-claude-500"
            >
              <option value="">All Types</option>
              <option value="code">Code</option>
              <option value="research">Research</option>
              <option value="documentation">Documentation</option>
              <option value="analysis">Analysis</option>
              <option value="orchestrator">Orchestrator</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-claude-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="paused">Paused</option>
              <option value="error">Error</option>
            </select>
          </div>
          <Button
            variant="outline"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => {
              fetchAgents();
              fetchWorkflowExecutions();
              fetchMetrics();
            }}
            loading={loading.agents || loading.executions || loading.metrics}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStart={(id) => handleAgentAction(id, 'start')}
              onStop={(id) => handleAgentAction(id, 'stop')}
              onRestart={(id) => handleAgentAction(id, 'restart')}
              onConfigure={handleConfigure}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Active Workflows */}
      {activeExecutions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Workflows</h3>
          <div className="space-y-4">
            <AnimatePresence>
              {activeExecutions.map((execution) => (
                <motion.div
                  key={execution.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{execution.workflowId}</h4>
                      <p className="text-sm text-gray-500">Agent: {execution.agentName}</p>
                    </div>
                    <StatusBadge status={execution.status} size="sm" />
                  </div>
                  {execution.currentStep && (
                    <p className="text-sm text-blue-600 mb-2">
                      Current: {execution.currentStep}
                    </p>
                  )}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${execution.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Progress</span>
                    <span>{execution.progress}%</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AgentOrchestrationDashboard;