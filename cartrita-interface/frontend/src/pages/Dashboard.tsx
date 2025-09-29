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
import { Card, Button, Badge } from '../components/UI';
import { motion } from 'framer-motion';

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="aurora-card hover:shadow-lg transition-all duration-300">
        <Card.Content className="flex items-center p-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-claude-500 to-claude-600 rounded-lg flex items-center justify-center">
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {value}
                </div>
                {change && (
                  <div className={`text-sm font-medium ${getChangeColor()}`}>
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
        </Card.Content>
      </Card>
    </motion.div>
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
        return <Badge variant="success">Healthy</Badge>;
      case 'warning':
        return <Badge variant="warning">Warning</Badge>;
      case 'error':
        return <Badge variant="error">Error</Badge>;
    }
  };

  return (
    <Card>
      <Card.Header title={title} actions={getStatusBadge()} />
      <Card.Content>
        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status)}
                <span className="text-sm font-medium text-gray-900">{item.name}</span>
              </div>
              {item.lastSeen && (
                <span className="text-xs text-gray-500">{item.lastSeen}</span>
              )}
            </motion.div>
          ))}
        </div>
      </Card.Content>
    </Card>
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
    <Card>
      <Card.Header title="Recent Activity" />
      <Card.Content>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card.Content>
      <Card.Footer>
        <Button variant="ghost" size="sm" className="text-claude-600 hover:text-claude-700">
          View all activity →
        </Button>
      </Card.Footer>
    </Card>
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card variant="glass" className="bg-gradient-to-r from-claude-50 to-gpt-purple-50 border-claude-200">
          <Card.Content className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-claude-500 to-gpt-purple-500 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome to Cartrita Interface</h1>
            </div>
            <p className="text-gray-600 mb-6 text-lg">
              Your AI-powered development orchestration platform is running smoothly.
              Monitor your agents, track workflows, and manage your development processes from this dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="lg" icon={<PlayIcon className="w-4 h-4" />}>
                Run Workflow
              </Button>
              <Button variant="outline" size="lg">
                View Documentation
              </Button>
              <Button variant="secondary" size="lg">
                Create Agent
              </Button>
            </div>
          </Card.Content>
        </Card>
      </motion.div>

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
      <Card>
        <Card.Header title="Quick Actions" subtitle="Common tasks and shortcuts" />
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: CpuChipIcon,
                title: 'Create Agent',
                description: 'Set up a new AI agent',
                color: 'claude'
              },
              {
                icon: PlayIcon,
                title: 'Run Workflow',
                description: 'Execute automated process',
                color: 'ms-blue'
              },
              {
                icon: ServerIcon,
                title: 'Monitor Servers',
                description: 'Check MCP server status',
                color: 'gpt-purple'
              }
            ].map((action, index) => (
              <motion.button
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-claude-300 hover:bg-claude-50 transition-all duration-200 group"
              >
                <div className={`w-12 h-12 bg-gradient-to-br from-${action.color}-500 to-${action.color}-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-900 mb-1">{action.title}</span>
                <p className="text-xs text-gray-500 text-center">{action.description}</p>
              </motion.button>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};