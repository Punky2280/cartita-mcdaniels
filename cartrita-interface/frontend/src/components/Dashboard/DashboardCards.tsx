import React from 'react';
import {
  Users,
  TrendingUp,
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Download
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<any>;
  color: 'claude' | 'ms-blue' | 'gpt-purple' | 'green';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon: Icon, color }) => {
  const colorClasses = {
    claude: 'bg-claude-50 text-claude-600 border-claude-200',
    'ms-blue': 'bg-ms-blue-50 text-ms-blue-600 border-ms-blue-200',
    'gpt-purple': 'bg-gpt-purple-50 text-gpt-purple-600 border-gpt-purple-200',
    green: 'bg-green-50 text-green-600 border-green-200'
  };

  const iconColorClasses = {
    claude: 'text-claude-500',
    'ms-blue': 'text-ms-blue-500',
    'gpt-purple': 'text-gpt-purple-500',
    green: 'text-green-500'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <div className="flex items-center mt-2">
            {changeType === 'increase' ? (
              <ArrowUpRight className="w-4 h-4 text-green-500" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500" aria-hidden="true" />
            )}
            <span className={`text-sm font-medium ml-1 ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {change}
            </span>
            <span className="text-sm text-gray-500 ml-1">vs last month</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          <Icon className={`w-6 h-6 ${iconColorClasses[color]}`} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

const RecentActivity: React.FC = () => {
  const activities: ActivityItem[] = [
    {
      id: '1',
      user: 'John Doe',
      action: 'Created new user account',
      timestamp: '2 minutes ago',
      status: 'completed'
    },
    {
      id: '2',
      user: 'Jane Smith',
      action: 'Updated profile information',
      timestamp: '5 minutes ago',
      status: 'completed'
    },
    {
      id: '3',
      user: 'Mike Johnson',
      action: 'Generated analytics report',
      timestamp: '12 minutes ago',
      status: 'pending'
    },
    {
      id: '4',
      user: 'Sarah Wilson',
      action: 'Deleted user account',
      timestamp: '1 hour ago',
      status: 'failed'
    },
    {
      id: '5',
      user: 'Tom Brown',
      action: 'Exported data to CSV',
      timestamp: '2 hours ago',
      status: 'completed'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <button className="text-sm text-claude-600 hover:text-claude-700 font-medium flex items-center gap-1">
          <Eye className="w-4 h-4" aria-hidden="true" />
          View All
        </button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-claude-500 to-ms-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {activity.user.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                <p className="text-sm text-gray-600">{activity.action}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                {activity.status}
              </span>
              <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const QuickActions: React.FC = () => {
  const actions = [
    {
      name: 'Create User',
      description: 'Add a new user to the system',
      icon: Users,
      color: 'claude' as const,
      href: '#'
    },
    {
      name: 'Generate Report',
      description: 'Create analytics report',
      icon: TrendingUp,
      color: 'ms-blue' as const,
      href: '#'
    },
    {
      name: 'Export Data',
      description: 'Download data as CSV/Excel',
      icon: Download,
      color: 'gpt-purple' as const,
      href: '#'
    }
  ];

  const getActionClasses = (color: string) => {
    const classes = {
      claude: 'border-claude-200 hover:border-claude-300 hover:bg-claude-50',
      'ms-blue': 'border-ms-blue-200 hover:border-ms-blue-300 hover:bg-ms-blue-50',
      'gpt-purple': 'border-gpt-purple-200 hover:border-gpt-purple-300 hover:bg-gpt-purple-50'
    };
    return classes[color as keyof typeof classes];
  };

  const getIconClasses = (color: string) => {
    const classes = {
      claude: 'text-claude-600',
      'ms-blue': 'text-ms-blue-600',
      'gpt-purple': 'text-gpt-purple-600'
    };
    return classes[color as keyof typeof classes];
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
      <div className="space-y-4">
        {actions.map((action) => (
          <button
            key={action.name}
            className={`w-full flex items-center gap-4 p-4 border-2 rounded-lg transition-all duration-200 ${getActionClasses(action.color)}`}
          >
            <action.icon className={`w-6 h-6 ${getIconClasses(action.color)}`} aria-hidden="true" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{action.name}</p>
              <p className="text-sm text-gray-600">{action.description}</p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400 ml-auto" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
};

export const DashboardCards: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value="2,847"
          change="+12.5%"
          changeType="increase"
          icon={Users}
          color="claude"
        />
        <StatCard
          title="Active Sessions"
          value="1,234"
          change="+8.3%"
          changeType="increase"
          icon={Activity}
          color="ms-blue"
        />
        <StatCard
          title="Revenue"
          value="$54,832"
          change="+15.2%"
          changeType="increase"
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Growth Rate"
          value="23.4%"
          change="-2.1%"
          changeType="decrease"
          icon={TrendingUp}
          color="gpt-purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
};