import React, { useMemo, useState, useCallback } from 'react';
import {
  CpuChipIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon,
  EyeIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { Card, Button, Badge, Input } from '../components/UI';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useApiData } from '@/hooks';
import { agentService } from '@/services/agentService';
import type { Agent, AgentStatus, PaginatedResult } from '@/types';
import { logger } from '@/utils/logger';

interface AgentCardProps {
  agent: Agent;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onView: (id: string) => void;
  onConfigure: (id: string) => void;
  onDelete: (id: string) => void;
  isProcessing?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onStart,
  onStop,
  onView,
  onConfigure,
  onDelete,
  isProcessing = false
}) => {
  const resolvedStatus = agent.status ?? 'inactive';
  const totalExecutions = agent.performance?.tasksCompleted ?? agent.executionCount ?? 0;
  const rawSuccessRate = agent.performance?.successRate ?? agent.successRate ?? 0;
  const successRate = Number.isFinite(rawSuccessRate)
    ? Math.round(rawSuccessRate <= 1 ? rawSuccessRate * 100 : rawSuccessRate)
    : 0;
  const version = typeof agent.version === 'string'
    ? agent.version
    : typeof agent.config?.version === 'string'
      ? agent.config.version
      : '1.0.0';
  const lastExecutionDate = agent.lastActivity ?? agent.lastActiveAt ?? agent.updatedAt ?? agent.createdAt;
  const lastExecutionDisplay = lastExecutionDate
    ? formatDistanceToNow(new Date(lastExecutionDate), { addSuffix: true })
    : 'No recorded activity';

  const getStatusIcon = () => {
    switch (resolvedStatus) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'paused':
        return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'maintenance':
        return <PauseIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (resolvedStatus) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="neutral">Inactive</Badge>;
      case 'error':
        return <Badge variant="error">Error</Badge>;
      case 'paused':
        return <Badge variant="info">Paused</Badge>;
      case 'maintenance':
        return <Badge variant="warning">Maintenance</Badge>;
      default:
        return <Badge variant="neutral">{resolvedStatus}</Badge>;
    }
  };

  const getTypeIcon = () => {
    return <CpuChipIcon className="h-8 w-8 text-orange-500" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full hover:shadow-xl transition-all duration-300">
        <Card.Header>
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-claude-500 to-claude-600 rounded-lg flex items-center justify-center">
                <CpuChipIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{agent.type?.toString().replace('-', ' ') ?? 'Unknown type'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              {getStatusBadge()}
            </div>
          </div>
        </Card.Header>

        <Card.Content>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">{agent.description ?? 'No description provided yet.'}</p>

          {/* Capabilities */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities && agent.capabilities.length > 0 ? (
                <>
                  {agent.capabilities.slice(0, 3).map((capability, index) => (
                    <motion.div
                      key={capability}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Badge variant="primary" size="sm">
                        {capability}
                      </Badge>
                    </motion.div>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <Badge variant="neutral" size="sm">
                      +{agent.capabilities.length - 3} more
                    </Badge>
                  )}
                </>
              ) : (
                <Badge variant="neutral" size="sm">No capabilities defined</Badge>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gradient-to-r from-gray-50 to-claude-50 rounded-lg border border-gray-100">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{totalExecutions.toLocaleString()}</div>
              <div className="text-xs text-gray-500 font-medium">Executions</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{successRate}%</div>
              <div className="text-xs text-gray-500 font-medium">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-claude-600">v{version}</div>
              <div className="text-xs text-gray-500 font-medium">Version</div>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            Last activity: <span className="font-medium">{lastExecutionDisplay}</span>
          </div>
        </Card.Content>

        <Card.Footer className="flex items-center gap-2">
          {resolvedStatus === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStop(agent.id)}
              icon={<PauseIcon className="h-4 w-4" />}
              className="text-red-600 border-red-200 hover:bg-red-50"
              disabled={isProcessing}
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStart(agent.id)}
              icon={<PlayIcon className="h-4 w-4" />}
              className="text-green-600 border-green-200 hover:bg-green-50"
              disabled={isProcessing}
            >
              Start
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(agent.id)}
            icon={<EyeIcon className="h-4 w-4" />}
            disabled={isProcessing}
          >
            View
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfigure(agent.id)}
            icon={<Cog6ToothIcon className="h-4 w-4" />}
            disabled={isProcessing}
          >
            Configure
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(agent.id)}
            icon={<TrashIcon className="h-4 w-4" />}
            className="ml-auto text-red-600 hover:bg-red-50"
            disabled={isProcessing}
          />
        </Card.Footer>
      </Card>
    </motion.div>
  );
};

type StatusFilterValue = AgentStatus | 'all';

export const Agents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAgents = useCallback(() => agentService.listAgents({ limit: 100 }), []);

  const {
    data: agentsResult,
    loading: agentsLoading,
    error: agentsError,
    refresh: refreshAgents,
  } = useApiData<PaginatedResult<Agent>>(fetchAgents, {
    cacheKey: 'agents-page',
    retryAttempts: 2,
  });

  const agents = useMemo(() => agentsResult?.items ?? [], [agentsResult]);

  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    for (const agent of agents) {
      if (agent.type) {
        typeSet.add(agent.type.toString());
      }
    }
    return Array.from(typeSet).sort((a, b) => a.localeCompare(b));
  }, [agents]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const name = agent.name?.toLowerCase() ?? '';
      const description = agent.description?.toLowerCase() ?? '';
      const capabilitiesMatch = agent.capabilities?.some(capability => capability.toLowerCase().includes(normalizedSearch)) ?? false;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        name.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        capabilitiesMatch;

      const agentStatus = agent.status?.toString().toLowerCase() as AgentStatus | undefined;
      const matchesStatus =
        statusFilter === 'all' ||
        (agentStatus !== undefined && agentStatus === statusFilter);

      const agentType = agent.type?.toString();
      const matchesType =
        typeFilter === 'all' ||
        (agentType !== undefined && agentType === typeFilter);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [agents, normalizedSearch, statusFilter, typeFilter]);

  const dashboardMetrics = useMemo(() => {
    const metrics = {
      total: agents.length,
      active: 0,
      inactive: 0,
      paused: 0,
      maintenance: 0,
      error: 0,
      averageSuccessRate: null as number | null,
    };

    let successSum = 0;
    let successSamples = 0;

    for (const agent of agents) {
      const status = agent.status?.toString().toLowerCase() as AgentStatus | undefined;

      switch (status) {
        case 'active':
          metrics.active += 1;
          break;
        case 'inactive':
          metrics.inactive += 1;
          break;
        case 'paused':
          metrics.paused += 1;
          break;
        case 'maintenance':
          metrics.maintenance += 1;
          break;
        case 'error':
          metrics.error += 1;
          break;
        default:
          break;
      }

      const successRateValue = agent.performance?.successRate ?? agent.successRate;
      if (typeof successRateValue === 'number' && !Number.isNaN(successRateValue)) {
        const normalized = successRateValue <= 1 ? successRateValue * 100 : successRateValue;
        successSum += normalized;
        successSamples += 1;
      }
    }

    metrics.averageSuccessRate = successSamples > 0
      ? Math.round(successSum / successSamples)
      : null;

    return metrics;
  }, [agents]);

  const handleStartAgent = useCallback(async (id: string) => {
    setActionInProgress(id);
    setActionError(null);
    try {
      await agentService.updateAgentStatus(id, 'active');
      await refreshAgents();
      logger.info('Agent started successfully', { id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start agent';
      setActionError(message);
      logger.error('Failed to start agent', error instanceof Error ? error : new Error(String(error)), { id });
    } finally {
      setActionInProgress(null);
    }
  }, [refreshAgents]);

  const handleStopAgent = useCallback(async (id: string) => {
    setActionInProgress(id);
    setActionError(null);
    try {
      await agentService.updateAgentStatus(id, 'inactive');
      await refreshAgents();
      logger.info('Agent stopped successfully', { id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop agent';
      setActionError(message);
      logger.error('Failed to stop agent', error instanceof Error ? error : new Error(String(error)), { id });
    } finally {
      setActionInProgress(null);
    }
  }, [refreshAgents]);

  const handleViewAgent = useCallback((id: string) => {
    logger.info('Viewing agent details', { id });
  }, []);

  const handleConfigureAgent = useCallback((id: string) => {
    logger.info('Configuring agent', { id });
  }, []);

  const handleDeleteAgent = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    setActionInProgress(id);
    setActionError(null);
    try {
      await agentService.deleteAgent(id);
      await refreshAgents();
      logger.info('Agent deleted successfully', { id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete agent';
      setActionError(message);
      logger.error('Failed to delete agent', error instanceof Error ? error : new Error(String(error)), { id });
    } finally {
      setActionInProgress(null);
    }
  }, [refreshAgents]);

  const statusOptions: StatusFilterValue[] = useMemo(
    () => ['all', 'active', 'inactive', 'paused', 'maintenance', 'error'],
    []
  );

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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600 mt-2 text-lg">
            Manage and monitor your AI agents orchestrating the development workflow
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          icon={<PlusIcon className="h-5 w-5" />}
          className="shadow-lg"
        >
          Create Agent
        </Button>
      </motion.div>

      {agentsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load agents: {agentsError.message}
        </div>
      )}

      {actionError && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <span>{actionError}</span>
          <button
            type="button"
            className="text-yellow-700 hover:text-yellow-900"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Agents',
            value: dashboardMetrics.total,
            icon: CpuChipIcon,
            color: 'gray'
          },
          {
            title: 'Active Agents',
            value: dashboardMetrics.active,
            icon: CheckCircleIcon,
            color: 'green'
          },
          {
            title: 'Idle Agents',
            value: dashboardMetrics.inactive + dashboardMetrics.paused + dashboardMetrics.maintenance,
            icon: ClockIcon,
            color: 'yellow'
          },
          {
            title: 'Avg Success Rate',
            value: dashboardMetrics.averageSuccessRate !== null
              ? `${dashboardMetrics.averageSuccessRate}%`
              : '--',
            icon: ChartBarIcon,
            color: 'blue'
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-all duration-300">
              <Card.Content className="flex items-center p-6">
                <div className={`w-12 h-12 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-lg flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500">{stat.title}</dt>
                  <dd className="text-2xl font-bold text-gray-900">{stat.value}</dd>
                </div>
              </Card.Content>
            </Card>
          </motion.div>
        ))}
      </div>

      {dashboardMetrics.error > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>
            {dashboardMetrics.error} agent{dashboardMetrics.error === 1 ? '' : 's'} reporting errors. Review their configuration or recent activity.
          </span>
        </div>
      )}

      {/* Filters */}
      <Card>
        <Card.Content className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input.Search
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                clearable
                onClear={() => setSearchTerm('')}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}
                className="aurora-input min-w-[140px]"
              >
                {statusOptions.map(option => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Status' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="aurora-input min-w-[160px]"
              >
                <option value="all">All Types</option>
                {availableTypes.map(typeValue => (
                  <option key={typeValue} value={typeValue}>
                    {typeValue.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Agents Grid */}
      <AnimatePresence mode="wait">
        {filteredAgents.length > 0 ? (
          <motion.div
            key="agents-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AgentCard
                  agent={agent}
                  onStart={handleStartAgent}
                  onStop={handleStopAgent}
                  onView={handleViewAgent}
                  onConfigure={handleConfigureAgent}
                  onDelete={handleDeleteAgent}
                  isProcessing={actionInProgress === agent.id}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card>
              <Card.Content className="text-center py-16">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CpuChipIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No agents found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your search or filters to find the agents you\'re looking for.'
                    : 'Get started by creating your first AI agent to begin orchestrating your development workflow.'}
                </p>
                {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<PlusIcon className="h-5 w-5" />}
                  >
                    Create Your First Agent
                  </Button>
                )}
              </Card.Content>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};