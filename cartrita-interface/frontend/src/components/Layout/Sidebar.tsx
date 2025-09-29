import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CpuChipIcon,
  CommandLineIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  XMarkIcon,
  SparklesIcon,
  ServerIcon,
  CubeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CpuChipIcon as CpuChipIconSolid,
  CommandLineIcon as CommandLineIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  SparklesIcon as SparklesIconSolid,
  ServerIcon as ServerIconSolid,
  CubeIcon as CubeIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid
} from '@heroicons/react/24/solid';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconSolid: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description?: string;
  badge?: string;
  category?: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    description: 'Overview and system status',
    category: 'main'
  },
  {
    name: 'AI Chat',
    href: '/chat',
    icon: ChatBubbleLeftRightIcon,
    iconSolid: ChatBubbleLeftRightIconSolid,
    description: 'Chat with AI agents',
    badge: 'New',
    category: 'main'
  },
  {
    name: 'AI Agents',
    href: '/agents',
    icon: CpuChipIcon,
    iconSolid: CpuChipIconSolid,
    description: 'Manage AI agents and orchestration',
    badge: '5',
    category: 'main'
  },
  {
    name: 'Workflows',
    href: '/workflows',
    icon: CommandLineIcon,
    iconSolid: CommandLineIconSolid,
    description: 'Automated workflows and processes',
    category: 'main'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
    description: 'Performance metrics and insights',
    category: 'main'
  },
  {
    name: 'MCP Servers',
    href: '/mcp-servers',
    icon: ServerIcon,
    iconSolid: ServerIconSolid,
    description: 'Model Context Protocol servers',
    badge: 'Beta',
    category: 'tools'
  },
  {
    name: 'Context7',
    href: '/context7',
    icon: SparklesIcon,
    iconSolid: SparklesIconSolid,
    description: 'Enhanced documentation service',
    category: 'tools'
  },
  {
    name: 'Components',
    href: '/components',
    icon: CubeIcon,
    iconSolid: CubeIconSolid,
    description: 'UI component library',
    category: 'tools'
  },
  {
    name: 'Documentation',
    href: '/docs',
    icon: BookOpenIcon,
    iconSolid: BookOpenIconSolid,
    description: 'API docs and guides',
    category: 'support'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    iconSolid: Cog6ToothIconSolid,
    description: 'Application configuration',
    category: 'support'
  }
];

const categories = {
  main: 'Main',
  tools: 'Tools',
  support: 'Support'
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const groupedItems = React.useMemo(() => {
    const grouped: Record<string, NavigationItem[]> = {};
    navigationItems.forEach(item => {
      const category = item.category || 'main';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 lg:hidden z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Cartrita</h2>
                <p className="text-xs text-gray-500">AI Interface</p>
              </div>
            </div>

            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([categoryKey, items]) => (
                <div key={categoryKey}>
                  {categoryKey !== 'main' && (
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      {categories[categoryKey as keyof typeof categories]}
                    </h3>
                  )}

                  <ul className="space-y-1">
                    {items.map((item) => {
                      const active = isActive(item.href);
                      const Icon = active ? item.iconSolid : item.icon;

                      return (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            onClick={() => {
                              // Close mobile sidebar when navigating
                              if (window.innerWidth < 1024) {
                                onClose();
                              }
                            }}
                            className={`
                              group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                              ${active
                                ? 'bg-orange-50 text-orange-700 border-r-2 border-orange-500'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }
                            `}
                            aria-current={active ? 'page' : undefined}
                          >
                            <Icon
                              className={`
                                flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors
                                ${active ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-500'}
                              `}
                              aria-hidden="true"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="truncate">{item.name}</span>
                                {item.badge && (
                                  <span
                                    className={`
                                      ml-2 px-2 py-1 text-xs font-medium rounded-full
                                      ${active
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-gray-100 text-gray-600'
                                      }
                                    `}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="bg-gradient-to-r from-orange-50 to-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-900">
                  System Status
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Agents</span>
                  <span className="text-green-600 font-medium">5 Active</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">MCP Servers</span>
                  <span className="text-green-600 font-medium">7 Online</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Context7</span>
                  <span className="text-green-600 font-medium">Healthy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};