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
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Running</span>;
      case 'stopped':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Stopped</span>;
      case 'error':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Error</span>;
      case 'starting':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Starting</span>;
    }
  };

  const getTypeIcon = () => {
    return <CpuChipIcon className="h-8 w-8 text-orange-500" />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getTypeIcon()}
          <div>
            <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-500">{agent.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          {getStatusBadge()}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">{agent.description}</p>

      {/* Capabilities */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Capabilities</h4>
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 3).map((capability) => (
            <span
              key={capability}
              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800"
            >
              {capability}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
              +{agent.capabilities.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">{agent.totalExecutions}</div>
          <div className="text-xs text-gray-500">Executions</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">{agent.successRate}%</div>
          <div className="text-xs text-gray-500">Success Rate</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">v{agent.version}</div>
          <div className="text-xs text-gray-500">Version</div>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-4">
        Last execution: {agent.lastExecution}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {agent.status === 'running' ? (
          <button
            onClick={() => onStop(agent.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
          >
            <PauseIcon className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={() => onStart(agent.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
          >
            <PlayIcon className="h-4 w-4" />
            Start
          </button>
        )}

        <button
          onClick={() => onView(agent.id)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
        >
          <EyeIcon className="h-4 w-4" />
          View
        </button>

        <button
          onClick={() => onConfigure(agent.id)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
        >
          <Cog6ToothIcon className="h-4 w-4" />
          Configure
        </button>

        <button
          onClick={() => onDelete(agent.id)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors ml-auto"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
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
      description: 'Specialized in React, TypeScript, and UI component development with Aurora design system integration.',
      lastExecution: '2 minutes ago',
      totalExecutions: 1247,
      successRate: 98.5,
      capabilities: ['React Components', 'TypeScript', 'Tailwind CSS', 'Accessibility', 'Aurora UI'],
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor your AI agents orchestrating the development workflow
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Agent
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CpuChipIcon className="h-8 w-8 text-gray-400" />
            </div>
            <div className="ml-5">
              <dl>
                <dt className="text-sm font-medium text-gray-500">Total Agents</dt>
                <dd className="text-2xl font-bold text-gray-900">{statusCounts.total}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-5">
              <dl>
                <dt className="text-sm font-medium text-gray-500">Running</dt>
                <dd className="text-2xl font-bold text-gray-900">{statusCounts.running}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-gray-400" />
            </div>
            <div className="ml-5">
              <dl>
                <dt className="text-sm font-medium text-gray-500">Stopped</dt>
                <dd className="text-2xl font-bold text-gray-900">{statusCounts.stopped}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-5">
              <dl>
                <dt className="text-sm font-medium text-gray-500">Avg Success Rate</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {Math.round(agents.reduce((acc, agent) => acc + agent.successRate, 0) / agents.length)}%
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
      </div>

      {/* Agents Grid */}
      {filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStart={handleStartAgent}
              onStop={handleStopAgent}
              onView={handleViewAgent}
              onConfigure={handleConfigureAgent}
              onDelete={handleDeleteAgent}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No agents found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating your first AI agent.'}
          </p>
          {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Agent
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};