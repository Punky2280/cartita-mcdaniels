import React, { useState } from 'react';
import {
  BookOpenIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  ServerIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  StarIcon,
  ClockIcon,
  TagIcon,
  ChevronRightIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  BeakerIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

interface DocSection {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'api' | 'guides' | 'agents' | 'workflows' | 'advanced' | 'troubleshooting';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  items: Array<{
    id: string;
    title: string;
    description: string;
    readTime: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    updated: string;
    popular?: boolean;
  }>;
}

interface QuickLinkProps {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  external?: boolean;
}

const QuickLink: React.FC<QuickLinkProps> = ({ title, description, icon: Icon, href, external }) => (
  <a
    href={href}
    className="group block p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md hover:border-orange-300 transition-all duration-200"
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
  >
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors">
        <Icon className="h-5 w-5 text-orange-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 group-hover:text-orange-700 transition-colors">
            {title}
          </h3>
          {external && <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-400" />}
        </div>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  </a>
);

interface DocItemProps {
  item: DocSection['items'][0];
  onClick: (id: string) => void;
}

const DocItem: React.FC<DocItemProps> = ({ item, onClick }) => {
  const getDifficultyColor = () => {
    switch (item.difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <button
      onClick={() => onClick(item.id)}
      className="w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md hover:border-orange-300 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 group-hover:text-orange-700 transition-colors">
            {item.title}
          </h3>
          {item.popular && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              <StarIcon className="h-3 w-3 mr-1" />
              Popular
            </span>
          )}
        </div>
        <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
      </div>

      <p className="text-sm text-gray-600 mb-3">{item.description}</p>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${getDifficultyColor()}`}>
          {item.difficulty}
        </span>
        <span className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          {item.readTime}
        </span>
        <span>Updated {item.updated}</span>
      </div>
    </button>
  );
};

export const Documentation: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const docSections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Everything you need to know to get up and running with Cartrita Interface',
      category: 'getting-started',
      icon: RocketLaunchIcon,
      items: [
        {
          id: 'installation',
          title: 'Installation & Setup',
          description: 'Install Cartrita Interface and configure your development environment',
          readTime: '5 min',
          difficulty: 'beginner',
          updated: '2 days ago',
          popular: true
        },
        {
          id: 'quick-start',
          title: 'Quick Start Guide',
          description: 'Create your first AI agent and run a workflow in minutes',
          readTime: '10 min',
          difficulty: 'beginner',
          updated: '1 week ago',
          popular: true
        },
        {
          id: 'basic-concepts',
          title: 'Basic Concepts',
          description: 'Learn about agents, workflows, and the Cartrita architecture',
          readTime: '8 min',
          difficulty: 'beginner',
          updated: '3 days ago'
        }
      ]
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      description: 'Complete API documentation for all endpoints and methods',
      category: 'api',
      icon: CodeBracketIcon,
      items: [
        {
          id: 'authentication',
          title: 'Authentication',
          description: 'API authentication using JWT tokens and OAuth 2.0',
          readTime: '12 min',
          difficulty: 'intermediate',
          updated: '1 day ago'
        },
        {
          id: 'agents-api',
          title: 'Agents API',
          description: 'Create, manage, and execute AI agents via REST API',
          readTime: '15 min',
          difficulty: 'intermediate',
          updated: '2 days ago',
          popular: true
        },
        {
          id: 'workflows-api',
          title: 'Workflows API',
          description: 'Workflow orchestration and management endpoints',
          readTime: '18 min',
          difficulty: 'intermediate',
          updated: '3 days ago'
        },
        {
          id: 'webhooks',
          title: 'Webhooks',
          description: 'Configure webhooks for real-time notifications',
          readTime: '10 min',
          difficulty: 'advanced',
          updated: '1 week ago'
        }
      ]
    },
    {
      id: 'guides',
      title: 'Guides & Tutorials',
      description: 'Step-by-step guides for common use cases and scenarios',
      category: 'guides',
      icon: DocumentTextIcon,
      items: [
        {
          id: 'create-custom-agent',
          title: 'Creating Custom Agents',
          description: 'Build your own AI agents with custom capabilities',
          readTime: '25 min',
          difficulty: 'intermediate',
          updated: '4 days ago',
          popular: true
        },
        {
          id: 'workflow-patterns',
          title: 'Workflow Design Patterns',
          description: 'Common patterns for designing effective workflows',
          readTime: '20 min',
          difficulty: 'intermediate',
          updated: '1 week ago'
        },
        {
          id: 'error-handling',
          title: 'Error Handling Best Practices',
          description: 'Handle errors gracefully in your AI workflows',
          readTime: '15 min',
          difficulty: 'intermediate',
          updated: '5 days ago'
        }
      ]
    },
    {
      id: 'agents',
      title: 'AI Agents',
      description: 'Documentation for built-in agents and agent development',
      category: 'agents',
      icon: CpuChipIcon,
      items: [
        {
          id: 'agent-types',
          title: 'Agent Types & Capabilities',
          description: 'Overview of different agent types and their use cases',
          readTime: '12 min',
          difficulty: 'beginner',
          updated: '3 days ago'
        },
        {
          id: 'agent-orchestration',
          title: 'Agent Orchestration',
          description: 'Coordinate multiple agents for complex tasks',
          readTime: '22 min',
          difficulty: 'advanced',
          updated: '1 week ago'
        },
        {
          id: 'custom-tools',
          title: 'Building Custom Tools',
          description: 'Extend agent capabilities with custom tools',
          readTime: '30 min',
          difficulty: 'advanced',
          updated: '2 weeks ago'
        }
      ]
    },
    {
      id: 'mcp-integration',
      title: 'MCP Integration',
      description: 'Model Context Protocol servers and integrations',
      category: 'workflows',
      icon: ServerIcon,
      items: [
        {
          id: 'mcp-setup',
          title: 'MCP Server Setup',
          description: 'Configure and manage MCP servers',
          readTime: '15 min',
          difficulty: 'intermediate',
          updated: '2 days ago'
        },
        {
          id: 'github-mcp',
          title: 'GitHub MCP Integration',
          description: 'Integrate with GitHub repositories and workflows',
          readTime: '18 min',
          difficulty: 'intermediate',
          updated: '4 days ago'
        },
        {
          id: 'custom-mcp',
          title: 'Custom MCP Servers',
          description: 'Build your own MCP servers for specific use cases',
          readTime: '35 min',
          difficulty: 'advanced',
          updated: '1 week ago'
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Advanced Topics',
      description: 'Advanced configuration, optimization, and deployment',
      category: 'advanced',
      icon: BeakerIcon,
      items: [
        {
          id: 'performance-optimization',
          title: 'Performance Optimization',
          description: 'Optimize your Cartrita setup for maximum performance',
          readTime: '25 min',
          difficulty: 'advanced',
          updated: '3 days ago'
        },
        {
          id: 'security-hardening',
          title: 'Security Hardening',
          description: 'Secure your Cartrita deployment for production use',
          readTime: '30 min',
          difficulty: 'advanced',
          updated: '1 week ago'
        },
        {
          id: 'monitoring-logging',
          title: 'Monitoring & Logging',
          description: 'Set up comprehensive monitoring and logging',
          readTime: '20 min',
          difficulty: 'advanced',
          updated: '5 days ago'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      description: 'Common issues and their solutions',
      category: 'troubleshooting',
      icon: WrenchScrewdriverIcon,
      items: [
        {
          id: 'common-errors',
          title: 'Common Errors & Solutions',
          description: 'Quick fixes for the most common issues',
          readTime: '10 min',
          difficulty: 'beginner',
          updated: '2 days ago',
          popular: true
        },
        {
          id: 'debugging-workflows',
          title: 'Debugging Workflows',
          description: 'Debug failed workflows and agent errors',
          readTime: '15 min',
          difficulty: 'intermediate',
          updated: '1 week ago'
        },
        {
          id: 'performance-issues',
          title: 'Performance Issues',
          description: 'Diagnose and fix performance problems',
          readTime: '18 min',
          difficulty: 'advanced',
          updated: '4 days ago'
        }
      ]
    }
  ];

  const quickLinks = [
    {
      title: 'API Playground',
      description: 'Test API endpoints interactively',
      icon: CodeBracketIcon,
      href: '/api/playground',
      external: true
    },
    {
      title: 'GitHub Repository',
      description: 'View source code and contribute',
      icon: CodeBracketIcon,
      href: 'https://github.com/aurora-interface',
      external: true
    },
    {
      title: 'Community Forum',
      description: 'Get help from the community',
      icon: QuestionMarkCircleIcon,
      href: 'https://community.aurora-interface.com',
      external: true
    },
    {
      title: 'Video Tutorials',
      description: 'Learn with step-by-step videos',
      icon: BookOpenIcon,
      href: 'https://tutorials.aurora-interface.com',
      external: true
    }
  ];

  const allItems = docSections.flatMap(section =>
    section.items.map(item => ({ ...item, category: section.category, sectionTitle: section.title }))
  );

  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesDifficulty = filterDifficulty === 'all' || item.difficulty === filterDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const handleItemClick = (id: string) => {
    console.log('Opening documentation item:', id);
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/docs/${id}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <BookOpenIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
          </div>
          <p className="text-gray-600">
            Comprehensive guides and API reference for Cartrita Interface
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
            Copy Link
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
            API Playground
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-center gap-2 mb-4">
          <LightBulbIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link, index) => (
            <QuickLink key={index} {...link} />
          ))}
        </div>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="getting-started">Getting Started</option>
              <option value="api">API Reference</option>
              <option value="guides">Guides</option>
              <option value="agents">AI Agents</option>
              <option value="workflows">MCP Integration</option>
              <option value="advanced">Advanced</option>
              <option value="troubleshooting">Troubleshooting</option>
            </select>

            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {searchTerm ? (
        /* Search Results */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results ({filteredItems.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <DocItem key={item.id} item={item} onClick={handleItemClick} />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or browse the categories below.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Documentation Sections */
        <div className="space-y-8">
          {docSections.map((section) => (
            <div key={section.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gray-100">
                  <section.icon className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {section.items.map((item) => (
                  <DocItem key={item.id} item={item} onClick={handleItemClick} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <QuestionMarkCircleIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Need Help?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpenIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Documentation</h3>
            <p className="text-sm text-gray-600">
              Browse our comprehensive documentation and guides
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
              <QuestionMarkCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Community</h3>
            <p className="text-sm text-gray-600">
              Get help from our active community forum
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Support</h3>
            <p className="text-sm text-gray-600">
              Contact our support team for technical assistance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};