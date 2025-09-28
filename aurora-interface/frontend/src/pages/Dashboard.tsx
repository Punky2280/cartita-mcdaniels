import React from 'react';
import {
  CpuChipIcon,
  ServerIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  PlayIcon,
  PauseIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-orange-500" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd>
              <div className="text-lg font-medium text-gray-900">
                {value}
              </div>
              {change && (
                <div className={`text-sm ${getChangeColor()}`}>
                  {change}
                </div>
              )}
              {description && (
                <div className="text-xs text-gray-500 mt-1">
                  {description}
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

interface StatusCardProps {
  title: string;
  status: 'healthy' | 'warning' | 'error';
  items: Array<{
    name: string;
    status: 'online' | 'offline' | 'degraded';
    lastSeen?: string;
  }>;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, status, items }) => {
  const getStatusIcon = (itemStatus: string) => {
    switch (itemStatus) {
      case 'online':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <ClockIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'healthy':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Healthy</span>;
      case 'warning':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Warning</span>;
      case 'error':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Error</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {getStatusBadge()}
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center gap-3">
              {getStatusIcon(item.status)}
              <span className="text-sm text-gray-900">{item.name}</span>
            </div>
            {item.lastSeen && (
              <span className="text-xs text-gray-500">{item.lastSeen}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface RecentActivityItem {
  id: string;
  type: 'workflow' | 'agent' | 'error' | 'system';
  message: string;
  timestamp: string;
  status?: 'success' | 'error' | 'running';
}

const RecentActivityCard: React.FC<{ activities: RecentActivityItem[] }> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'workflow':
        return <PlayIcon className="h-4 w-4 text-blue-500" />;
      case 'agent':
        return <CpuChipIcon className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      case 'system':
        return <ServerIcon className="h-4 w-4 text-gray-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{activity.message}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="text-sm text-orange-600 hover:text-orange-500">
          View all activity →
        </button>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const dashboardStats = [
    {
      title: 'Active Agents',
      value: 5,
      change: '+2 from last week',
      changeType: 'positive' as const,
      icon: CpuChipIcon,
      description: 'AI agents currently running'
    },
    {
      title: 'MCP Servers',
      value: '7/8',
      change: '1 degraded',
      changeType: 'warning' as const,
      icon: ServerIcon,
      description: 'Model Context Protocol servers'
    },
    {
      title: 'Workflows Executed',
      value: 1247,
      change: '+15% this month',
      changeType: 'positive' as const,
      icon: ArrowTrendingUpIcon,
      description: 'Total workflow executions'
    },
    {
      title: 'System Performance',
      value: '98.5%',
      change: 'Excellent',
      changeType: 'positive' as const,
      icon: ChartBarIcon,
      description: 'Overall system uptime'
    }
  ];

  const agentStatus = [
    { name: 'Frontend Agent', status: 'online' as const, lastSeen: '2 min ago' },
    { name: 'API Agent', status: 'online' as const, lastSeen: '1 min ago' },
    { name: 'Docs Agent', status: 'online' as const, lastSeen: '30 sec ago' },
    { name: 'Codebase Inspector', status: 'online' as const, lastSeen: '1 min ago' },
    { name: 'MCP Integration', status: 'online' as const, lastSeen: '45 sec ago' }
  ];

  const mcpServers = [
    { name: 'GitHub Server', status: 'online' as const, lastSeen: '30 sec ago' },
    { name: 'Memory Server', status: 'online' as const, lastSeen: '1 min ago' },
    { name: 'Brave Search', status: 'online' as const, lastSeen: '2 min ago' },
    { name: 'GitLab Server', status: 'online' as const, lastSeen: '1 min ago' },
    { name: 'Filesystem', status: 'degraded' as const, lastSeen: '10 min ago' },
    { name: 'SQLite Server', status: 'degraded' as const, lastSeen: '15 min ago' },
    { name: 'Context7', status: 'online' as const, lastSeen: '30 sec ago' }
  ];

  const recentActivities: RecentActivityItem[] = [
    {
      id: '1',
      type: 'workflow',
      message: 'Code review workflow completed for authentication module',
      timestamp: '2 minutes ago',
      status: 'success'
    },
    {
      id: '2',
      type: 'agent',
      message: 'Codebase Inspector found 3 security recommendations',
      timestamp: '5 minutes ago',
      status: 'success'
    },
    {
      id: '3',
      type: 'system',
      message: 'MCP server "filesystem" showing degraded performance',
      timestamp: '10 minutes ago',
      status: 'error'
    },
    {
      id: '4',
      type: 'workflow',
      message: 'API documentation generation started',
      timestamp: '15 minutes ago',
      status: 'running'
    },
    {
      id: '5',
      type: 'agent',
      message: 'Frontend Agent created 3 new UI components',
      timestamp: '22 minutes ago',
      status: 'success'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-orange-50 to-purple-50 rounded-lg p-6 border border-orange-100">
        <div className="flex items-center gap-3 mb-3">
          <SparklesIcon className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Aurora Interface</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Your AI-powered development orchestration platform is running smoothly.
          Monitor your agents, track workflows, and manage your development processes from this dashboard.
        </p>
        <div className="flex gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
            <PlayIcon className="h-4 w-4 mr-2" />
            Run Workflow
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            View Documentation
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <DashboardCard key={index} {...stat} />
        ))}
      </div>

      {/* Status and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Status */}
        <StatusCard
          title="AI Agents"
          status="healthy"
          items={agentStatus}
        />

        {/* MCP Servers Status */}
        <StatusCard
          title="MCP Servers"
          status="warning"
          items={mcpServers}
        />

        {/* Recent Activity */}
        <RecentActivityCard activities={recentActivities} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors group">
            <div className="text-center">
              <CpuChipIcon className="h-8 w-8 text-gray-400 group-hover:text-orange-500 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Create Agent</span>
              <p className="text-xs text-gray-500 mt-1">Set up a new AI agent</p>
            </div>
          </button>

          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors group">
            <div className="text-center">
              <PlayIcon className="h-8 w-8 text-gray-400 group-hover:text-orange-500 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Run Workflow</span>
              <p className="text-xs text-gray-500 mt-1">Execute automated process</p>
            </div>
          </button>

          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors group">
            <div className="text-center">
              <ServerIcon className="h-8 w-8 text-gray-400 group-hover:text-orange-500 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Monitor Servers</span>
              <p className="text-xs text-gray-500 mt-1">Check MCP server status</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};