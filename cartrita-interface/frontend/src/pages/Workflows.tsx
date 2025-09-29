import React, { useState } from 'react';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  ChartBarIcon,
  CpuChipIcon,
  CodeBracketIcon,
  BugAntIcon,
  WrenchScrewdriverIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'code-review' | 'research-implement' | 'full-feature-dev' | 'bug-hunt-fix' | 'intelligent-refactor' | 'api-modernization' | 'deployment-pipeline' | 'data-pipeline';
  status: 'running' | 'completed' | 'failed' | 'paused' | 'scheduled';
  progress: number;
  startTime: string;
  endTime?: string;
  duration?: string;
  trigger: 'manual' | 'scheduled' | 'webhook' | 'push';
  agents: string[];
  metrics: {
    successRate: number;
    averageDuration: string;
    lastRun: string;
    totalRuns: number;
  };
}

interface WorkflowCardProps {
  workflow: Workflow;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onStart,
  onPause,
  onStop,
  onEdit,
  onDelete
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const getStatusIcon = () => {
    switch (workflow.status) {
      case 'running':
        return <PlayIcon className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <PauseIcon className="h-4 w-4 text-yellow-500" />;
      case 'scheduled':
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (workflow.status) {
      case 'running':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Running</span>;
      case 'completed':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Completed</span>;
      case 'failed':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Failed</span>;
      case 'paused':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Paused</span>;
      case 'scheduled':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Scheduled</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
  };

  const getTypeIcon = () => {
    switch (workflow.type) {
      case 'code-review':
        return <CodeBracketIcon className="h-5 w-5 text-orange-500" />;
      case 'research-implement':
        return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
      case 'full-feature-dev':
        return <CpuChipIcon className="h-5 w-5 text-purple-500" />;
      case 'bug-hunt-fix':
        return <BugAntIcon className="h-5 w-5 text-red-500" />;
      case 'intelligent-refactor':
        return <WrenchScrewdriverIcon className="h-5 w-5 text-green-500" />;
      case 'api-modernization':
        return <ArrowPathIcon className="h-5 w-5 text-indigo-500" />;
      case 'deployment-pipeline':
        return <CloudArrowUpIcon className="h-5 w-5 text-cyan-500" />;
      case 'data-pipeline':
        return <ChartBarIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <CodeBracketIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {getTypeIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
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
                  {workflow.status !== 'running' && (
                    <button
                      onClick={() => { onStart(workflow.id); setShowDropdown(false); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Start
                    </button>
                  )}
                  {workflow.status === 'running' && (
                    <button
                      onClick={() => { onPause(workflow.id); setShowDropdown(false); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <PauseIcon className="h-4 w-4 mr-2" />
                      Pause
                    </button>
                  )}
                  {(workflow.status === 'running' || workflow.status === 'paused') && (
                    <button
                      onClick={() => { onStop(workflow.id); setShowDropdown(false); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <StopIcon className="h-4 w-4 mr-2" />
                      Stop
                    </button>
                  )}
                  <button
                    onClick={() => { onEdit(workflow.id); setShowDropdown(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { onDelete(workflow.id); setShowDropdown(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {workflow.status === 'running' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{workflow.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${workflow.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-xs font-medium text-gray-500">Type</span>
          <p className="text-sm text-gray-900 capitalize">{workflow.type.replace('-', ' ')}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Trigger</span>
          <p className="text-sm text-gray-900 capitalize">{workflow.trigger}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Success Rate</span>
          <p className="text-sm text-gray-900">{workflow.metrics.successRate}%</p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500">Total Runs</span>
          <p className="text-sm text-gray-900">{workflow.metrics.totalRuns}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm text-gray-600">
            {workflow.status === 'running' ? 'Started' : 'Last run'}: {workflow.startTime}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">{workflow.agents.length} agents</span>
        </div>
      </div>
    </div>
  );
};

export const Workflows: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const workflows: Workflow[] = [
    {
      id: '1',
      name: 'Authentication Module Review',
      description: 'Comprehensive security review of authentication and authorization systems',
      type: 'code-review',
      status: 'running',
      progress: 65,
      startTime: '2 hours ago',
      trigger: 'manual',
      agents: ['security-agent', 'code-reviewer', 'vulnerability-scanner'],
      metrics: {
        successRate: 94,
        averageDuration: '45 min',
        lastRun: '2 hours ago',
        totalRuns: 23
      }
    },
    {
      id: '2',
      name: 'AI Chat Feature Development',
      description: 'Research and implement real-time AI chat functionality with WebSocket support',
      type: 'research-implement',
      status: 'completed',
      progress: 100,
      startTime: '1 day ago',
      endTime: '18 hours ago',
      duration: '6 hours',
      trigger: 'push',
      agents: ['research-agent', 'frontend-agent', 'api-agent'],
      metrics: {
        successRate: 89,
        averageDuration: '4.5 hours',
        lastRun: '1 day ago',
        totalRuns: 8
      }
    },
    {
      id: '3',
      name: 'E-commerce Platform Refactor',
      description: 'Intelligent refactoring of legacy e-commerce codebase for better performance',
      type: 'intelligent-refactor',
      status: 'scheduled',
      progress: 0,
      startTime: 'Tomorrow 9:00 AM',
      trigger: 'scheduled',
      agents: ['refactor-agent', 'performance-optimizer', 'test-generator'],
      metrics: {
        successRate: 92,
        averageDuration: '8 hours',
        lastRun: '3 days ago',
        totalRuns: 12
      }
    },
    {
      id: '4',
      name: 'Memory Leak Bug Hunt',
      description: 'Identify and fix memory leaks in Node.js backend services',
      type: 'bug-hunt-fix',
      status: 'failed',
      progress: 75,
      startTime: '6 hours ago',
      endTime: '4 hours ago',
      duration: '2 hours',
      trigger: 'webhook',
      agents: ['bug-hunter', 'memory-analyzer', 'performance-tester'],
      metrics: {
        successRate: 87,
        averageDuration: '3 hours',
        lastRun: '6 hours ago',
        totalRuns: 15
      }
    },
    {
      id: '5',
      name: 'API Documentation Generation',
      description: 'Generate comprehensive API documentation with examples and schemas',
      type: 'deployment-pipeline',
      status: 'paused',
      progress: 30,
      startTime: '4 hours ago',
      trigger: 'manual',
      agents: ['docs-generator', 'api-analyzer', 'example-generator'],
      metrics: {
        successRate: 96,
        averageDuration: '2 hours',
        lastRun: '4 hours ago',
        totalRuns: 31
      }
    }
  ];

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || workflow.status === filterStatus;
    const matchesType = filterType === 'all' || workflow.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleStart = (id: string) => {
    console.log('Starting workflow:', id);
  };

  const handlePause = (id: string) => {
    console.log('Pausing workflow:', id);
  };

  const handleStop = (id: string) => {
    console.log('Stopping workflow:', id);
  };

  const handleEdit = (id: string) => {
    console.log('Editing workflow:', id);
  };

  const handleDelete = (id: string) => {
    console.log('Deleting workflow:', id);
  };

  const statusCounts = {
    all: workflows.length,
    running: workflows.filter(w => w.status === 'running').length,
    completed: workflows.filter(w => w.status === 'completed').length,
    failed: workflows.filter(w => w.status === 'failed').length,
    paused: workflows.filter(w => w.status === 'paused').length,
    scheduled: workflows.filter(w => w.status === 'scheduled').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Management</h1>
          <p className="text-gray-600 mt-1">
            Orchestrate AI agents and automate development workflows
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Workflow
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-sm text-gray-600 capitalize">
              {status === 'all' ? 'Total' : status}
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
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="paused">Paused</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="all">All Types</option>
                  <option value="code-review">Code Review</option>
                  <option value="research-implement">Research & Implement</option>
                  <option value="full-feature-dev">Full Feature Development</option>
                  <option value="bug-hunt-fix">Bug Hunt & Fix</option>
                  <option value="intelligent-refactor">Intelligent Refactor</option>
                  <option value="api-modernization">API Modernization</option>
                  <option value="deployment-pipeline">Deployment Pipeline</option>
                  <option value="data-pipeline">Data Pipeline</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredWorkflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            onStart={handleStart}
            onPause={handlePause}
            onStop={handleStop}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <CommandLineIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first workflow.'}
          </p>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Workflow
          </button>
        </div>
      )}
    </div>
  );
};