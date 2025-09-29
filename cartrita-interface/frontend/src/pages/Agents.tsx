import React, { useState } from 'react';
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
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { Card, Button, Badge, Input, Modal } from '../components/UI';
import { motion, AnimatePresence } from 'framer-motion';

interface Agent {
  id: string;
  name: string;
  type: 'frontend' | 'api' | 'docs' | 'codebase-inspector' | 'mcp-integration';
  status: 'running' | 'stopped' | 'error' | 'starting';
  description: string;
  lastExecution: string;
  totalExecutions: number;
  successRate: number;
  capabilities: string[];
  version: string;
}

interface AgentCardProps {
  agent: Agent;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onView: (id: string) => void;
  onConfigure: (id: string) => void;
  onDelete: (id: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onStart,
  onStop,
  onView,
  onConfigure,
  onDelete
}) => {
  const getStatusIcon = () => {
    switch (agent.status) {
      case 'running':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'stopped':
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'starting':
        return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusBadge = () => {
    switch (agent.status) {
      case 'running':
        return <Badge variant="success">Running</Badge>;
      case 'stopped':
        return <Badge variant="neutral">Stopped</Badge>;
      case 'error':
        return <Badge variant="error">Error</Badge>;
      case 'starting':
        return <Badge variant="info">Starting</Badge>;
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
                <p className="text-sm text-gray-500 capitalize">{agent.type.replace('-', ' ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              {getStatusBadge()}
            </div>
          </div>
        </Card.Header>

        <Card.Content>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">{agent.description}</p>

          {/* Capabilities */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Capabilities</h4>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gradient-to-r from-gray-50 to-claude-50 rounded-lg border border-gray-100">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{agent.totalExecutions.toLocaleString()}</div>
              <div className="text-xs text-gray-500 font-medium">Executions</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{agent.successRate}%</div>
              <div className="text-xs text-gray-500 font-medium">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-claude-600">v{agent.version}</div>
              <div className="text-xs text-gray-500 font-medium">Version</div>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-6 flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            Last execution: <span className="font-medium">{agent.lastExecution}</span>
          </div>
        </Card.Content>

        <Card.Footer className="flex items-center gap-2">
          {agent.status === 'running' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStop(agent.id)}
              icon={<PauseIcon className="h-4 w-4" />}
              className="text-red-600 border-red-200 hover:bg-red-50"
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
            >
              Start
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(agent.id)}
            icon={<EyeIcon className="h-4 w-4" />}
          >
            View
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfigure(agent.id)}
            icon={<Cog6ToothIcon className="h-4 w-4" />}
          >
            Configure
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(agent.id)}
            icon={<TrashIcon className="h-4 w-4" />}
            className="ml-auto text-red-600 hover:bg-red-50"
          />
        </Card.Footer>
      </Card>
    </motion.div>
  );
};

export const Agents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const agents: Agent[] = [
    {
      id: '1',
      name: 'Frontend Agent',
      type: 'frontend',
      status: 'running',
      description: 'Specialized in React, TypeScript, and UI component development with Cartrita design system integration.',
      lastExecution: '2 minutes ago',
      totalExecutions: 1247,
      successRate: 98.5,
      capabilities: ['React Components', 'TypeScript', 'Tailwind CSS', 'Accessibility', 'Cartrita UI'],
      version: '1.2.3'
    },
    {
      id: '2',
      name: 'API Agent',
      type: 'api',
      status: 'running',
      description: 'Handles REST API development, database integration, and security implementation with Fastify.',
      lastExecution: '1 minute ago',
      totalExecutions: 892,
      successRate: 97.2,
      capabilities: ['Fastify APIs', 'Database Design', 'Security', 'OpenAPI', 'Validation'],
      version: '1.1.8'
    },
    {
      id: '3',
      name: 'Documentation Agent',
      type: 'docs',
      status: 'running',
      description: 'Creates comprehensive technical documentation, API docs, and user guides.',
      lastExecution: '5 minutes ago',
      totalExecutions: 543,
      successRate: 99.1,
      capabilities: ['Technical Writing', 'API Docs', 'Tutorials', 'Markdown', 'OpenAPI Specs'],
      version: '1.0.9'
    },
    {
      id: '4',
      name: 'Codebase Inspector',
      type: 'codebase-inspector',
      status: 'running',
      description: 'Performs security analysis, performance auditing, and architecture reviews using MCP servers.',
      lastExecution: '10 minutes ago',
      totalExecutions: 234,
      successRate: 95.8,
      capabilities: ['Security Analysis', 'Performance Audit', 'Code Quality', 'MCP Integration'],
      version: '1.0.0'
    },
    {
      id: '5',
      name: 'MCP Integration Agent',
      type: 'mcp-integration',
      status: 'running',
      description: 'Manages Model Context Protocol servers and provides enhanced documentation through Context7.',
      lastExecution: '3 minutes ago',
      totalExecutions: 156,
      successRate: 94.2,
      capabilities: ['MCP Servers', 'Context7', 'GitHub Integration', 'Memory Management'],
      version: '1.0.0'
    }
  ];

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesType = typeFilter === 'all' || agent.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleStartAgent = (id: string) => {
    console.log('Starting agent:', id);
    // Implementation for starting agent
  };

  const handleStopAgent = (id: string) => {
    console.log('Stopping agent:', id);
    // Implementation for stopping agent
  };

  const handleViewAgent = (id: string) => {
    console.log('Viewing agent:', id);
    // Implementation for viewing agent details
  };

  const handleConfigureAgent = (id: string) => {
    console.log('Configuring agent:', id);
    // Implementation for configuring agent
  };

  const handleDeleteAgent = (id: string) => {
    console.log('Deleting agent:', id);
    // Implementation for deleting agent
  };

  const getStatusCounts = () => {
    return {
      total: agents.length,
      running: agents.filter(a => a.status === 'running').length,
      stopped: agents.filter(a => a.status === 'stopped').length,
      error: agents.filter(a => a.status === 'error').length
    };
  };

  const statusCounts = getStatusCounts();

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Agents',
            value: statusCounts.total,
            icon: CpuChipIcon,
            color: 'gray'
          },
          {
            title: 'Running',
            value: statusCounts.running,
            icon: CheckCircleIcon,
            color: 'green'
          },
          {
            title: 'Stopped',
            value: statusCounts.stopped,
            icon: ClockIcon,
            color: 'gray'
          },
          {
            title: 'Avg Success Rate',
            value: `${Math.round(agents.reduce((acc, agent) => acc + agent.successRate, 0) / agents.length)}%`,
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
                onChange={(e) => setStatusFilter(e.target.value)}
                className="aurora-input min-w-[130px]"
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
                <option value="error">Error</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="aurora-input min-w-[150px]"
              >
                <option value="all">All Types</option>
                <option value="frontend">Frontend</option>
                <option value="api">API</option>
                <option value="docs">Documentation</option>
                <option value="codebase-inspector">Codebase Inspector</option>
                <option value="mcp-integration">MCP Integration</option>
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