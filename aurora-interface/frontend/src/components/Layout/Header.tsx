import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, isSidebarOpen }) => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/': return 'Dashboard';
      case '/agents': return 'AI Agents';
      case '/workflows': return 'Workflows';
      case '/analytics': return 'Analytics';
      case '/settings': return 'Settings';
      case '/docs': return 'Documentation';
      default: return 'Aurora Interface';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        {/* Left Section - Menu Button & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">
              {getPageTitle()}
            </h1>

            {/* Breadcrumb for deeper navigation */}
            {location.pathname.includes('/') && location.pathname !== '/' && (
              <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                <Link to="/" className="hover:text-orange-500 transition-colors">
                  Home
                </Link>
                <span>/</span>
                <span className="text-gray-900">{getPageTitle()}</span>
              </nav>
            )}
          </div>
        </div>

        {/* Right Section - Actions & User Menu */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            className="p-2 rounded-md hover:bg-gray-100 transition-colors hidden sm:flex"
            aria-label="Toggle theme"
          >
            <SunIcon className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              className="p-2 rounded-md hover:bg-gray-100 transition-colors relative"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                3
              </span>
            </button>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
              <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                U
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-gray-900">
                  Guest User
                </span>
                <span className="text-xs text-gray-500">
                  guest@example.com
                </span>
              </div>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile breadcrumb */}
      {location.pathname.includes('/') && location.pathname !== '/' && (
        <nav
          aria-label="Breadcrumb"
          className="md:hidden flex items-center gap-2 text-sm text-gray-500 mt-2 pt-2 border-t border-gray-100"
        >
          <Link to="/" className="hover:text-orange-500 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900">{getPageTitle()}</span>
        </nav>
      )}
    </header>
  );
};