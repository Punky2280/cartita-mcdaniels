import React, { useState } from 'react';
import {
  ChartBarIcon,
  ChartPieIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CpuChipIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description?: string;
  trend?: number[];
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
  trend
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive': return <TrendingUpIcon className="h-4 w-4" />;
      case 'negative': return <TrendingDownIcon className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50">
            <Icon className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {trend && (
          <div className="w-20 h-10">
            <svg viewBox="0 0 80 40" className="w-full h-full">
              <polyline
                fill="none"
                stroke={changeType === 'positive' ? '#10b981' : changeType === 'negative' ? '#ef4444' : '#6b7280'}
                strokeWidth="2"
                points={trend.map((point, index) => `${(index / (trend.length - 1)) * 80},${40 - (point / Math.max(...trend)) * 30}`).join(' ')}
              />
            </svg>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-1 text-sm ${getChangeColor()}`}>
        {getChangeIcon()}
        <span>{change}</span>
      </div>

      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
};

interface ChartProps {
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
  type: 'bar' | 'pie' | 'line';
}

const Chart: React.FC<ChartProps> = ({ title, data, type }) => {
  const maxValue = Math.max(...data.map(d => d.value));

  if (type === 'bar') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-600 truncate">{item.label}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.color || 'bg-orange-500'}`}
                      style={{ width: `${(item.value / maxValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 min-w-[3rem]">
                    {item.value}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = data.slice(0, index).reduce((sum, d) => sum + ((d.value / total) * 360), 0);

                const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
                const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
                const x2 = 50 + 40 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
                const y2 = 50 + 40 * Math.sin((startAngle + angle - 90) * Math.PI / 180);

                const largeArc = angle > 180 ? 1 : 0;

                return (
                  <path
                    key={index}
                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={item.color || `hsl(${index * 45}, 70%, 60%)`}
                    stroke="white"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color || `hsl(${index * 45}, 70%, 60%)` }}
              />
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm font-medium text-gray-900 ml-auto">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  const systemMetrics = [
    {
      title: 'Total Workflows',
      value: 1247,
      change: '+15% from last month',
      changeType: 'positive' as const,
      icon: ChartBarIcon,
      description: 'Workflows executed across all agents',
      trend: [850, 920, 1050, 1150, 1200, 1180, 1247]
    },
    {
      title: 'Success Rate',
      value: '94.2%',
      change: '+2.1% from last week',
      changeType: 'positive' as const,
      icon: CheckCircleIcon,
      description: 'Average workflow success rate',
      trend: [92.1, 92.8, 93.2, 93.8, 94.0, 93.9, 94.2]
    },
    {
      title: 'Average Duration',
      value: '3.2h',
      change: '-12min from average',
      changeType: 'positive' as const,
      icon: ClockIcon,
      description: 'Mean workflow execution time',
      trend: [4.1, 3.8, 3.6, 3.4, 3.3, 3.2, 3.2]
    },
    {
      title: 'Active Agents',
      value: 8,
      change: '+2 new agents',
      changeType: 'positive' as const,
      icon: CpuChipIcon,
      description: 'Currently deployed AI agents',
      trend: [5, 6, 6, 7, 7, 8, 8]
    },
    {
      title: 'Error Rate',
      value: '2.1%',
      change: '-0.3% improvement',
      changeType: 'positive' as const,
      icon: ExclamationTriangleIcon,
      description: 'Workflow failure percentage',
      trend: [3.2, 2.8, 2.5, 2.4, 2.3, 2.2, 2.1]
    },
    {
      title: 'Resource Usage',
      value: '68%',
      change: '+5% from baseline',
      changeType: 'neutral' as const,
      icon: ServerIcon,
      description: 'System resource utilization',
      trend: [62, 64, 66, 67, 68, 69, 68]
    }
  ];

  const workflowTypeData = [
    { label: 'Code Review', value: 342, color: 'bg-orange-500' },
    { label: 'Bug Fixes', value: 198, color: 'bg-red-500' },
    { label: 'Feature Dev', value: 156, color: 'bg-blue-500' },
    { label: 'Refactoring', value: 124, color: 'bg-green-500' },
    { label: 'Documentation', value: 89, color: 'bg-purple-500' },
    { label: 'Testing', value: 67, color: 'bg-yellow-500' }
  ];

  const agentPerformanceData = [
    { label: 'Frontend Agent', value: 97.2 },
    { label: 'API Agent', value: 94.8 },
    { label: 'Security Agent', value: 96.1 },
    { label: 'Docs Agent', value: 98.5 },
    { label: 'Test Agent', value: 92.3 },
    { label: 'Deploy Agent', value: 95.7 }
  ];

  const statusDistribution = [
    { label: 'Completed', value: 1167, color: '#10b981' },
    { label: 'Failed', value: 43, color: '#ef4444' },
    { label: 'Running', value: 23, color: '#3b82f6' },
    { label: 'Scheduled', value: 14, color: '#6b7280' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Performance metrics and insights for your AI agents and workflows
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>

          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
            <DocumentChartBarIcon className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {systemMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Chart Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Types */}
        <Chart
          title="Workflow Types Distribution"
          data={workflowTypeData}
          type="bar"
        />

        {/* Status Distribution */}
        <Chart
          title="Workflow Status Distribution"
          data={statusDistribution}
          type="pie"
        />
      </div>

      {/* Agent Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance (Success Rate)</h3>
        <div className="space-y-4">
          {agentPerformanceData.map((agent, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-32 text-sm text-gray-600">{agent.label}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600"
                      style={{ width: `${agent.value}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 min-w-[3rem]">
                    {agent.value}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Trends</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUpIcon className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Workflow Success Rate</p>
                  <p className="text-xs text-gray-600">Improved by 2.3% this week</p>
                </div>
              </div>
              <span className="text-sm font-bold text-green-600">+2.3%</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ClockIcon className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Average Execution Time</p>
                  <p className="text-xs text-gray-600">Reduced by 15 minutes</p>
                </div>
              </div>
              <span className="text-sm font-bold text-blue-600">-15min</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CpuChipIcon className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Agent Efficiency</p>
                  <p className="text-xs text-gray-600">Resource usage optimized</p>
                </div>
              </div>
              <span className="text-sm font-bold text-orange-600">+8%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Workflows</h3>
          <div className="space-y-3">
            {[
              { name: 'Authentication Review', runs: 42, success: 98.5, avg: '1.2h' },
              { name: 'API Documentation', runs: 38, success: 97.8, avg: '2.1h' },
              { name: 'Security Scan', runs: 35, success: 96.2, avg: '45min' },
              { name: 'Code Refactor', runs: 29, success: 94.1, avg: '3.5h' },
              { name: 'Bug Hunt', runs: 24, success: 91.7, avg: '2.8h' }
            ].map((workflow, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{workflow.name}</p>
                  <p className="text-xs text-gray-600">{workflow.runs} runs • {workflow.avg} avg</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{workflow.success}%</p>
                  <p className="text-xs text-gray-500">success rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health Monitor</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
            <h4 className="text-sm font-medium text-gray-900">System Status</h4>
            <p className="text-lg font-bold text-green-600">Healthy</p>
            <p className="text-xs text-gray-500">All systems operational</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
              <ServerIcon className="h-8 w-8 text-blue-500" />
            </div>
            <h4 className="text-sm font-medium text-gray-900">MCP Servers</h4>
            <p className="text-lg font-bold text-blue-600">7/8 Online</p>
            <p className="text-xs text-gray-500">1 server degraded</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
              <CpuChipIcon className="h-8 w-8 text-orange-500" />
            </div>
            <h4 className="text-sm font-medium text-gray-900">Active Agents</h4>
            <p className="text-lg font-bold text-orange-600">8 Running</p>
            <p className="text-xs text-gray-500">All agents operational</p>
          </div>
        </div>
      </div>
    </div>
  );
};