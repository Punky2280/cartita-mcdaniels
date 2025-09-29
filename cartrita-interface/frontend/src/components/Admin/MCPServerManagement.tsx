import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Settings,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  Zap,
  Database,
  Search,
  Image,
  GitBranch,
  FileText,
  Shield,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useApiData } from '@/hooks';
import { logger } from '@/utils/logger';

interface MCPServer {
  id: string;
  name: string;
  category: 'version-control' | 'storage' | 'search' | 'image-generation' | 'filesystem' | 'database';
  status: 'online' | 'offline' | 'error' | 'maintenance';
  priority: number;
  critical: boolean;
  config: {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    healthCheckInterval: number;
    circuitBreaker: {
      failureThreshold: number;
      resetTimeout: number;
    };
    rateLimit: {
      requests: number;
      window: number;
    };
  };
  metrics: {
    uptime: number;
    responseTime: number;
    successRate: number;
    requestCount: number;
    errorCount: number;
    lastHealthCheck: Date;
    cpuUsage: number;
    memoryUsage: number;
  };
  endpoints: {
    health: string;
    metrics: string;
    restart: string;
  };
}

interface MCPMetrics {
  totalServers: number;
  onlineServers: number;
  criticalServers: number;
  averageResponseTime: number;
  totalRequests: number;
  errorRate: number;
}

export const MCPServerManagement: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch MCP servers data
  const { data: serversData, loading: serversLoading, refetch: refetchServers } = useApiData<MCPServer[]>('/api/mcp/servers');
  const { data: metricsData, loading: metricsLoading, refetch: refetchMetrics } = useApiData<MCPMetrics>('/api/mcp/metrics');

  useEffect(() => {
    if (serversData) {
      setServers(serversData);
    }
  }, [serversData]);

  // Real-time updates via polling
  useEffect(() => {
    const interval = setInterval(() => {
      refetchServers();
      refetchMetrics();
    }, 10000); // More frequent updates for MCP monitoring

    return () => clearInterval(interval);
  }, [refetchServers, refetchMetrics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchServers(), refetchMetrics()]);
      logger.info('MCP server data refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh MCP server data', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setRefreshing(false);
    }
  };

  const handleServerAction = async (serverId: string, action: 'restart' | 'start' | 'stop') => {
    try {
      logger.info(`Performing ${action} action on MCP server ${serverId}`);
      const response = await fetch(`/api/mcp/servers/${serverId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} server: ${response.statusText}`);
      }

      await refetchServers();
      logger.info(`MCP server ${serverId} ${action} completed successfully`);
    } catch (error) {
      logger.error(`Failed to ${action} MCP server`, error instanceof Error ? error : new Error(String(error)));
    }
  };

  const getStatusColor = (status: MCPServer['status']) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: MCPServer['status']) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'offline': return <XCircle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      case 'maintenance': return <Clock className="w-4 h-4" />;
      default: return <XCircle className="w-4 h-4" />;
    }
  };

  const getCategoryIcon = (category: MCPServer['category']) => {
    switch (category) {
      case 'version-control': return <GitBranch className="w-5 h-5" />;
      case 'storage': return <Database className="w-5 h-5" />;
      case 'search': return <Search className="w-5 h-5" />;
      case 'image-generation': return <Image className="w-5 h-5" />;
      case 'filesystem': return <FileText className="w-5 h-5" />;
      case 'database': return <Database className="w-5 h-5" />;
      default: return <Server className="w-5 h-5" />;
    }
  };

  const formatUptime = (uptimeMs: number) => {
    const days = Math.floor(uptimeMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptimeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((uptimeMs % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (serversLoading && servers.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">MCP Server Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and control Model Context Protocol servers
          </p>
        </div>
        <div className="flex gap-3">
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
              <Server className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Servers</p>
              <p className="text-2xl font-bold text-gray-900">
                {metricsData?.totalServers || servers.length}
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
              <p className="text-sm font-medium text-gray-600">Online</p>
              <p className="text-2xl font-bold text-gray-900">
                {metricsData?.onlineServers || servers.filter(s => s.status === 'online').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-gray-900">
                {metricsData?.criticalServers || servers.filter(s => s.critical).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">
                {metricsData?.averageResponseTime ||
                 Math.round(servers.reduce((sum, s) => sum + s.metrics.responseTime, 0) / servers.length || 0)}ms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MCP Servers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {servers.map((server) => (
          <div key={server.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              {/* Server Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    {getCategoryIcon(server.category)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{server.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{server.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {server.critical && (
                    <Shield className="w-4 h-4 text-red-500" title="Critical Server" />
                  )}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(server.status)}`}>
                    {getStatusIcon(server.status)}
                    <span className="ml-1">{server.status}</span>
                  </span>
                </div>
              </div>

              {/* Server Metrics */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-medium">{formatUptime(server.metrics.uptime)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className={`text-sm font-medium ${server.metrics.responseTime > 1000 ? 'text-red-600' : 'text-green-600'}`}>
                    {server.metrics.responseTime}ms
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className={`text-sm font-medium ${server.metrics.successRate < 95 ? 'text-red-600' : 'text-green-600'}`}>
                    {server.metrics.successRate.toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Requests</span>
                  <span className="text-sm font-medium">{server.metrics.requestCount.toLocaleString()}</span>
                </div>

                {/* Resource Usage */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">CPU</span>
                    <span className="text-sm font-medium">{server.metrics.cpuUsage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        server.metrics.cpuUsage > 80 ? 'bg-red-500' :
                        server.metrics.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${server.metrics.cpuUsage}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Memory</span>
                    <span className="text-sm font-medium">{server.metrics.memoryUsage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        server.metrics.memoryUsage > 80 ? 'bg-red-500' :
                        server.metrics.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${server.metrics.memoryUsage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  {server.status === 'offline' ? (
                    <button
                      onClick={() => handleServerAction(server.id, 'start')}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      title="Start Server"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleServerAction(server.id, 'stop')}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Stop Server"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleServerAction(server.id, 'restart')}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Restart Server"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedServer(server);
                      setIsConfigModalOpen(true);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                    title="Configure Server"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                    title="View Metrics"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Priority Indicator */}
            <div className={`h-1 ${
              server.priority === 1 ? 'bg-red-500' :
              server.priority === 2 ? 'bg-yellow-500' : 'bg-green-500'
            }`}></div>
          </div>
        ))}
      </div>

      {/* System Health Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {servers.filter(s => s.status === 'online').length}/{servers.length}
            </div>
            <p className="text-sm text-gray-600">Servers Online</p>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {metricsData?.totalRequests?.toLocaleString() || '0'}
            </div>
            <p className="text-sm text-gray-600">Total Requests</p>
          </div>

          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${
              (metricsData?.errorRate || 0) > 0.05 ? 'text-red-600' : 'text-green-600'
            }`}>
              {((metricsData?.errorRate || 0) * 100).toFixed(2)}%
            </div>
            <p className="text-sm text-gray-600">Error Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};