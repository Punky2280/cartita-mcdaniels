import React, { useState } from 'react';
import {
  SparklesIcon,
  DocumentTextIcon,
  BookOpenIcon,
  CodeBracketIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  TagIcon,
  StarIcon,
  ClockIcon,
  UserIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  ListBulletIcon,
  Squares2X2Icon,
  ChartBarIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Documentation {
  id: string;
  title: string;
  description: string;
  category: 'api' | 'guide' | 'tutorial' | 'reference' | 'changelog' | 'best-practices';
  type: 'manual' | 'auto-generated' | 'ai-enhanced';
  status: 'published' | 'draft' | 'needs-review' | 'outdated';
  tags: string[];
  author: string;
  lastUpdated: string;
  views: number;
  rating: number;
  wordCount: number;
  readTime: string;
  aiInsights: {
    completeness: number;
    accuracy: number;
    readability: number;
    suggestions: string[];
  };
  relatedDocs: string[];
}

interface DocumentCardProps {
  doc: Documentation;
  viewMode: 'grid' | 'list';
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onEnhance: (id: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  viewMode,
  onView,
  onEdit,
  onDelete,
  onEnhance
}) => {
  const getCategoryIcon = () => {
    switch (doc.category) {
      case 'api':
        return <CodeBracketIcon className="h-5 w-5 text-blue-500" />;
      case 'guide':
        return <BookOpenIcon className="h-5 w-5 text-green-500" />;
      case 'tutorial':
        return <DocumentTextIcon className="h-5 w-5 text-purple-500" />;
      case 'reference':
        return <FolderIcon className="h-5 w-5 text-orange-500" />;
      case 'changelog':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'best-practices':
        return <StarIcon className="h-5 w-5 text-pink-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
    switch (doc.status) {
      case 'published':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Published</span>;
      case 'draft':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Draft</span>;
      case 'needs-review':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Needs Review</span>;
      case 'outdated':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Outdated</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
  };

  const getTypeIcon = () => {
    switch (doc.type) {
      case 'ai-enhanced':
        return <SparklesIcon className="h-4 w-4 text-orange-500" />;
      case 'auto-generated':
        return <CpuChipIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInsightColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              {getCategoryIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{doc.title}</h3>
                {getTypeIcon()}
                {getStatusBadge()}
              </div>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{doc.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <UserIcon className="h-3 w-3" />
                  {doc.author}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {doc.lastUpdated}
                </span>
                <span className="flex items-center gap-1">
                  <EyeIcon className="h-3 w-3" />
                  {doc.views} views
                </span>
                <span>{doc.readTime} read</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <div className="flex items-center gap-1 text-sm">
              <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-gray-700">{doc.rating.toFixed(1)}</span>
            </div>
            <button
              onClick={() => onView(doc.id)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title="View"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEdit(doc.id)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEnhance(doc.id)}
              className="p-2 rounded-md hover:bg-orange-50 text-orange-600 transition-colors"
              title="AI Enhance"
            >
              <SparklesIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getCategoryIcon()}
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {doc.category.replace('-', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getTypeIcon()}
          {getStatusBadge()}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{doc.title}</h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{doc.description}</p>

      {/* AI Insights */}
      <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-purple-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <SparklesIcon className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium text-gray-900">AI Insights</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className={`font-semibold ${getInsightColor(doc.aiInsights.completeness)}`}>
              {doc.aiInsights.completeness}%
            </div>
            <div className="text-gray-600">Complete</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold ${getInsightColor(doc.aiInsights.accuracy)}`}>
              {doc.aiInsights.accuracy}%
            </div>
            <div className="text-gray-600">Accurate</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold ${getInsightColor(doc.aiInsights.readability)}`}>
              {doc.aiInsights.readability}%
            </div>
            <div className="text-gray-600">Readable</div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {doc.tags.slice(0, 3).map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
          >
            <TagIcon className="h-3 w-3 mr-1" />
            {tag}
          </span>
        ))}
        {doc.tags.length > 3 && (
          <span className="text-xs text-gray-500">+{doc.tags.length - 3} more</span>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            {doc.author}
          </span>
          <span className="flex items-center gap-1">
            <EyeIcon className="h-3 w-3" />
            {doc.views}
          </span>
          <span className="flex items-center gap-1">
            <StarIcon className="h-3 w-3" />
            {doc.rating.toFixed(1)}
          </span>
        </div>
        <span>{doc.readTime}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <span className="text-xs text-gray-500">Updated {doc.lastUpdated}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(doc.id)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            title="View"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(doc.id)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEnhance(doc.id)}
            className="p-2 rounded-md hover:bg-orange-50 text-orange-600 transition-colors"
            title="AI Enhance"
          >
            <SparklesIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Context7: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'views' | 'rating'>('updated');

  const documents: Documentation[] = [
    {
      id: '1',
      title: 'Authentication API Reference',
      description: 'Complete API documentation for authentication endpoints, including OAuth 2.0 and JWT token management',
      category: 'api',
      type: 'ai-enhanced',
      status: 'published',
      tags: ['authentication', 'api', 'oauth', 'jwt', 'security'],
      author: 'AI Agent',
      lastUpdated: '2 hours ago',
      views: 1247,
      rating: 4.8,
      wordCount: 3245,
      readTime: '12 min',
      aiInsights: {
        completeness: 94,
        accuracy: 96,
        readability: 88,
        suggestions: ['Add more code examples', 'Include error handling patterns']
      },
      relatedDocs: ['2', '3']
    },
    {
      id: '2',
      title: 'Getting Started with Cartrita Interface',
      description: 'Step-by-step guide to setting up and configuring your Cartrita Interface for AI agent orchestration',
      category: 'guide',
      type: 'manual',
      status: 'published',
      tags: ['setup', 'configuration', 'getting-started', 'aurora'],
      author: 'Documentation Team',
      lastUpdated: '1 day ago',
      views: 892,
      rating: 4.6,
      wordCount: 2156,
      readTime: '8 min',
      aiInsights: {
        completeness: 87,
        accuracy: 92,
        readability: 91,
        suggestions: ['Add troubleshooting section', 'Include video tutorials']
      },
      relatedDocs: ['1', '4']
    },
    {
      id: '3',
      title: 'Advanced Workflow Patterns',
      description: 'Learn advanced patterns for creating complex AI workflows with multi-agent coordination and error handling',
      category: 'tutorial',
      type: 'ai-enhanced',
      status: 'published',
      tags: ['workflows', 'patterns', 'advanced', 'coordination'],
      author: 'AI Agent',
      lastUpdated: '3 days ago',
      views: 654,
      rating: 4.9,
      wordCount: 4567,
      readTime: '18 min',
      aiInsights: {
        completeness: 91,
        accuracy: 94,
        readability: 85,
        suggestions: ['Simplify complex examples', 'Add visual diagrams']
      },
      relatedDocs: ['1', '5']
    },
    {
      id: '4',
      title: 'MCP Server Configuration',
      description: 'Comprehensive reference for configuring Model Context Protocol servers and managing connections',
      category: 'reference',
      type: 'auto-generated',
      status: 'needs-review',
      tags: ['mcp', 'configuration', 'servers', 'reference'],
      author: 'Auto Generator',
      lastUpdated: '5 days ago',
      views: 423,
      rating: 4.2,
      wordCount: 1876,
      readTime: '7 min',
      aiInsights: {
        completeness: 78,
        accuracy: 89,
        readability: 76,
        suggestions: ['Improve readability', 'Add configuration examples', 'Update outdated sections']
      },
      relatedDocs: ['2', '6']
    },
    {
      id: '5',
      title: 'Release Notes v3.2.1',
      description: 'Latest features, improvements, and bug fixes in Cartrita Interface version 3.2.1',
      category: 'changelog',
      type: 'manual',
      status: 'published',
      tags: ['release', 'changelog', 'features', 'bugfixes'],
      author: 'Product Team',
      lastUpdated: '1 week ago',
      views: 756,
      rating: 4.4,
      wordCount: 987,
      readTime: '4 min',
      aiInsights: {
        completeness: 95,
        accuracy: 98,
        readability: 93,
        suggestions: ['Consider migration guide', 'Add breaking changes section']
      },
      relatedDocs: ['2', '3']
    },
    {
      id: '6',
      title: 'Security Best Practices',
      description: 'Essential security practices for AI agent development and deployment in production environments',
      category: 'best-practices',
      type: 'ai-enhanced',
      status: 'draft',
      tags: ['security', 'best-practices', 'production', 'deployment'],
      author: 'Security Team',
      lastUpdated: '2 weeks ago',
      views: 234,
      rating: 4.7,
      wordCount: 3421,
      readTime: '14 min',
      aiInsights: {
        completeness: 68,
        accuracy: 91,
        readability: 82,
        suggestions: ['Complete missing sections', 'Add practical examples', 'Include checklist']
      },
      relatedDocs: ['1', '4']
    }
  ];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    const matchesType = filterType === 'all' || doc.type === filterType;

    return matchesSearch && matchesCategory && matchesStatus && matchesType;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'views':
        return b.views - a.views;
      case 'rating':
        return b.rating - a.rating;
      default:
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    }
  });

  const handleView = (id: string) => {
    console.log('Viewing document:', id);
  };

  const handleEdit = (id: string) => {
    console.log('Editing document:', id);
  };

  const handleDelete = (id: string) => {
    console.log('Deleting document:', id);
  };

  const handleEnhance = (id: string) => {
    console.log('AI enhancing document:', id);
  };

  const categoryStats = {
    api: documents.filter(d => d.category === 'api').length,
    guide: documents.filter(d => d.category === 'guide').length,
    tutorial: documents.filter(d => d.category === 'tutorial').length,
    reference: documents.filter(d => d.category === 'reference').length,
    changelog: documents.filter(d => d.category === 'changelog').length,
    'best-practices': documents.filter(d => d.category === 'best-practices').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Context7 Documentation</h1>
          </div>
          <p className="text-gray-600">
            AI-powered documentation service with intelligent insights and automated enhancements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <SparklesIcon className="h-4 w-4 mr-2" />
            Enhance All
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Document
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(categoryStats).map(([category, count]) => (
          <div key={category} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 rounded bg-orange-100">
                {category === 'api' && <CodeBracketIcon className="h-4 w-4 text-orange-600" />}
                {category === 'guide' && <BookOpenIcon className="h-4 w-4 text-orange-600" />}
                {category === 'tutorial' && <DocumentTextIcon className="h-4 w-4 text-orange-600" />}
                {category === 'reference' && <FolderIcon className="h-4 w-4 text-orange-600" />}
                {category === 'changelog' && <ClockIcon className="h-4 w-4 text-orange-600" />}
                {category === 'best-practices' && <StarIcon className="h-4 w-4 text-orange-600" />}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-sm text-gray-600 capitalize">
              {category.replace('-', ' ')}
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Categories</option>
              <option value="api">API</option>
              <option value="guide">Guides</option>
              <option value="tutorial">Tutorials</option>
              <option value="reference">Reference</option>
              <option value="changelog">Changelog</option>
              <option value="best-practices">Best Practices</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="needs-review">Needs Review</option>
              <option value="outdated">Outdated</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="updated">Last Updated</option>
              <option value="views">Most Viewed</option>
              <option value="rating">Highest Rated</option>
            </select>

            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid/List */}
      <div className={viewMode === 'grid'
        ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'
        : 'space-y-4'
      }>
        {filteredDocuments.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            viewMode={viewMode}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onEnhance={handleEnhance}
          />
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first document.'}
          </p>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Document
          </button>
        </div>
      )}
    </div>
  );
};