import React, { useState } from 'react';
import {
  ServerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon,
  CogIcon,
  TrashIcon,
  EyeIcon,
  WifiIcon,
  NoSymbolIcon,
  CommandLineIcon,
  DatabaseIcon,
  GlobeAltIcon,
  FolderIcon,
  CodeBracketIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface McpServer {
  id: string;
  name: string;
  type: 'github' | 'memory' | 'brave-search' | 'gitlab' | 'filesystem' | 'sqlite' | 'context7' | 'custom';
  status: 'online' | 'offline' | 'degraded' | 'connecting';
  url: string;
  description: string;
  lastSeen: string;
  uptime: string;
  version: string;
  capabilities: string[];
  metrics: {
    requests: number;
    errors: number;
    avgResponseTime: number;
    errorRate: number;
  };
  configuration: {
    timeout: number;
    retries: number;
    rateLimiting: boolean;
  };
}

interface ServerCardProps {
  server: McpServer;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onConfigure: (id: string) => void;
  onDelete: (id: string) => void;
  onViewLogs: (id: string) => void;
}

const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onStart,
  onStop,
  onRestart,
  onConfigure,
  onDelete,
  onViewLogs
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const getStatusIcon = () => {
    switch (server.status) {
      case 'online':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'offline':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'connecting':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <NoSymbolIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (server.status) {
      case 'online':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Online</span>;
      case 'degraded':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Degraded</span>;
      case 'offline':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Offline</span>;
      case 'connecting':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Connecting</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
  };

  const getTypeIcon = () => {
    switch (server.type) {
      case 'github':
        return <CodeBracketIcon className="h-6 w-6 text-gray-900" />;
      case 'memory':
        return <DatabaseIcon className="h-6 w-6 text-blue-500" />;
      case 'brave-search':
        return <GlobeAltIcon className="h-6 w-6 text-orange-500" />;
      case 'gitlab':
        return <CodeBracketIcon className="h-6 w-6 text-orange-600" />;
      case 'filesystem':
        return <FolderIcon className="h-6 w-6 text-yellow-600" />;
      case 'sqlite':
        return <DatabaseIcon className="h-6 w-6 text-green-600" />;
      case 'context7':
        return <DocumentTextIcon className="h-6 w-6 text-purple-600" />;
      default:
        return <ServerIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-lg bg-gray-50">
            {getTypeIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{server.name}</h3>
              {getStatusIcon()}
            </div>
            <p className="text-sm text-gray-600 mb-2">{server.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>v{server.version}</span>
              <span>•</span>
              <span>Last seen: {server.lastSeen}</span>
              {server.status === 'online' && (
                <>
                  <span>•</span>
                  <span>Uptime: {server.uptime}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  {server.status === 'offline' ? (
                    <button
                      onClick={() => { onStart(server.id); setShowDropdown(false); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Start
                    </button>
                  ) : (
                    <button
                      onClick={() => { onStop(server.id); setShowDropdown(false); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <StopIcon className="h-4 w-4 mr-2" />
                      Stop
                    </button>
                  )}
                  <button
                    onClick={() => { onRestart(server.id); setShowDropdown(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Restart
                  </button>
                  <button
                    onClick={() => { onViewLogs(server.id); setShowDropdown(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View Logs
                  </button>
                  <button
                    onClick={() => { onConfigure(server.id); setShowDropdown(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <CogIcon className="h-4 w-4 mr-2" />
                    Configure
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => { onDelete(server.id); setShowDropdown(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Server URL */}
      <div className="mb-4">
        <span className="text-xs font-medium text-gray-500">Endpoint</span>
        <p className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded mt-1">
          {server.url}
        </p>
      </div>

      {/* Capabilities */}
      <div className="mb-4">
        <span className="text-xs font-medium text-gray-500">Capabilities</span>
        <div className="flex flex-wrap gap-1 mt-2">
          {server.capabilities.map((capability, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div>
          <span className="text-xs font-medium text-gray-500">Requests</span>
          <p className="text-sm font-semibold text-gray-900">{server.metrics.requests.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Error Rate</span>
          <p className={`text-sm font-semibold ${server.metrics.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
            {server.metrics.errorRate}%
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Avg Response</span>
          <p className="text-sm font-semibold text-gray-900">{server.metrics.avgResponseTime}ms</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Errors</span>
          <p className={`text-sm font-semibold ${server.metrics.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {server.metrics.errors}
          </p>
        </div>
      </div>
    </div>
  );
};

export const McpServers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const servers: McpServer[] = [
    {
      id: '1',
      name: 'GitHub Server',
      type: 'github',
      status: 'online',
      url: 'mcp://github-server:8000',
      description: 'GitHub repository integration for code analysis and operations',
      lastSeen: '30 seconds ago',
      uptime: '2d 14h 32m',
      version: '2.1.0',
      capabilities: ['repositories', 'issues', 'pull-requests', 'actions'],
      metrics: {
        requests: 2847,
        errors: 3,
        avgResponseTime: 245,
        errorRate: 0.1
      },
      configuration: {
        timeout: 30000,
        retries: 3,
        rateLimiting: true
      }
    },
    {
      id: '2',
      name: 'Memory Server',
      type: 'memory',
      status: 'online',
      url: 'mcp://memory-server:8001',
      description: 'Persistent memory and context storage for AI agents',
      lastSeen: '1 minute ago',
      uptime: '1d 8h 15m',
      version: '1.5.2',
      capabilities: ['memory-store', 'context-retrieval', 'embeddings', 'search'],
      metrics: {
        requests: 5234,
        errors: 12,
        avgResponseTime: 89,
        errorRate: 0.2
      },
      configuration: {
        timeout: 15000,
        retries: 2,
        rateLimiting: false
      }
    },
    {
      id: '3',
      name: 'Brave Search',
      type: 'brave-search',
      status: 'online',
      url: 'mcp://brave-search:8002',
      description: 'Web search capabilities for research and information gathering',
      lastSeen: '2 minutes ago',
      uptime: '3d 2h 45m',
      version: '1.3.1',
      capabilities: ['web-search', 'news-search', 'image-search', 'filters'],
      metrics: {
        requests: 1567,
        errors: 8,
        avgResponseTime: 1240,
        errorRate: 0.5
      },
      configuration: {
        timeout: 45000,
        retries: 2,
        rateLimiting: true
      }
    },
    {
      id: '4',
      name: 'GitLab Server',
      type: 'gitlab',
      status: 'online',
      url: 'mcp://gitlab-server:8003',
      description: 'GitLab integration for project management and CI/CD',
      lastSeen: '1 minute ago',
      uptime: '1d 22h 10m',
      version: '2.0.3',
      capabilities: ['projects', 'merge-requests', 'pipelines', 'issues'],
      metrics: {
        requests: 892,
        errors: 2,
        avgResponseTime: 312,
        errorRate: 0.2
      },
      configuration: {
        timeout: 30000,
        retries: 3,
        rateLimiting: true
      }
    },
    {
      id: '5',
      name: 'Filesystem',
      type: 'filesystem',
      status: 'degraded',
      url: 'mcp://filesystem:8004',
      description: 'Local filesystem operations and file management',
      lastSeen: '10 minutes ago',
      uptime: '12h 34m',
      version: '1.8.0',
      capabilities: ['read-files', 'write-files', 'directory-ops', 'permissions'],
      metrics: {
        requests: 3421,
        errors: 45,
        avgResponseTime: 156,
        errorRate: 1.3
      },
      configuration: {
        timeout: 10000,
        retries: 1,
        rateLimiting: false
      }
    },
    {
      id: '6',
      name: 'SQLite Server',
      type: 'sqlite',
      status: 'degraded',
      url: 'mcp://sqlite-server:8005',
      description: 'SQLite database operations and query execution',
      lastSeen: '15 minutes ago',
      uptime: '6h 18m',
      version: '1.4.1',
      capabilities: ['queries', 'schema', 'transactions', 'backup'],
      metrics: {
        requests: 1234,
        errors: 23,
        avgResponseTime: 78,
        errorRate: 1.9
      },
      configuration: {
        timeout: 20000,
        retries: 2,
        rateLimiting: false
      }
    },
    {
      id: '7',
      name: 'Context7',
      type: 'context7',
      status: 'online',
      url: 'mcp://context7:8006',
      description: 'Enhanced documentation service with AI-powered insights',
      lastSeen: '30 seconds ago',
      uptime: '4d 12h 23m',
      version: '3.2.1',
      capabilities: ['documentation', 'code-analysis', 'api-docs', 'tutorials'],
      metrics: {
        requests: 4567,
        errors: 7,
        avgResponseTime: 345,
        errorRate: 0.2
      },
      configuration: {
        timeout: 25000,
        retries: 3,
        rateLimiting: true
      }
    }
  ];

  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || server.status === filterStatus;
    const matchesType = filterType === 'all' || server.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleStart = (id: string) => {
    console.log('Starting server:', id);
  };

  const handleStop = (id: string) => {
    console.log('Stopping server:', id);
  };

  const handleRestart = (id: string) => {
    console.log('Restarting server:', id);
  };

  const handleConfigure = (id: string) => {
    console.log('Configuring server:', id);
  };

  const handleDelete = (id: string) => {
    console.log('Deleting server:', id);
  };

  const handleViewLogs = (id: string) => {
    console.log('Viewing logs for server:', id);
  };

  const statusCounts = {
    all: servers.length,
    online: servers.filter(s => s.status === 'online').length,
    degraded: servers.filter(s => s.status === 'degraded').length,
    offline: servers.filter(s => s.status === 'offline').length,
    connecting: servers.filter(s => s.status === 'connecting').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MCP Servers</h1>
          <p className="text-gray-600 mt-1">
            Manage Model Context Protocol servers and monitor their health
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh All
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Server
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              {status === 'online' && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
              {status === 'degraded' && <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />}
              {status === 'offline' && <XCircleIcon className="h-5 w-5 text-red-500" />}
              {status === 'connecting' && <ClockIcon className="h-5 w-5 text-blue-500" />}
              {status === 'all' && <ServerIcon className="h-5 w-5 text-gray-500" />}
            </div>
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-sm text-gray-600 capitalize">
              {status === 'all' ? 'Total Servers' : status}
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search servers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="degraded">Degraded</option>
              <option value="offline">Offline</option>
              <option value="connecting">Connecting</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Types</option>
              <option value="github">GitHub</option>
              <option value="memory">Memory</option>
              <option value="brave-search">Brave Search</option>
              <option value="gitlab">GitLab</option>
              <option value="filesystem">Filesystem</option>
              <option value="sqlite">SQLite</option>
              <option value="context7">Context7</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredServers.map((server) => (
          <ServerCard
            key={server.id}
            server={server}
            onStart={handleStart}
            onStop={handleStop}
            onRestart={handleRestart}
            onConfigure={handleConfigure}
            onDelete={handleDelete}
            onViewLogs={handleViewLogs}
          />
        ))}
      </div>

      {filteredServers.length === 0 && (
        <div className="text-center py-12">
          <ServerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No servers found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first MCP server.'}
          </p>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Server
          </button>
        </div>
      )}
    </div>
  );
};