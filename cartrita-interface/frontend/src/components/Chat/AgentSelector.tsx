/**
 * Cartrita Interface - Agent Selector Component
 * Dropdown for selecting AI agents with capabilities display
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDownIcon,
  CpuChipIcon,
  CheckIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { AgentInfo } from '@/types';

interface AgentSelectorProps {
  agents: AgentInfo[];
  selectedAgent: AgentInfo | null;
  onSelect: (agent: AgentInfo | null) => void;
  disabled?: boolean;
  className?: string;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  selectedAgent,
  onSelect,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.capabilities.some(cap => cap.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedAgents = filteredAgents.reduce((acc, agent) => {
    const category = agent.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(agent);
    return acc;
  }, {} as Record<string, AgentInfo[]>);

  const getStatusColor = (status: AgentInfo['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'core':
        return 'Core Agents';
      case 'advanced':
        return 'Advanced Agents';
      case 'specialized':
        return 'Specialized Agents';
      default:
        return 'Other Agents';
    }
  };

  const handleSelect = (agent: AgentInfo | null) => {
    onSelect(agent);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-orange-500 border-orange-500' : ''}
        `}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {selectedAgent ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <CpuChipIcon className="h-4 w-4 text-white" />
                </div>
                <div className={`h-2 w-2 rounded-full ${getStatusColor(selectedAgent.status)}`} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="font-medium text-gray-900 truncate">
                  {selectedAgent.name}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {selectedAgent.description}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <CpuChipIcon className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-gray-500">
                Select an AI agent...
              </div>
            </>
          )}
        </div>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search agents..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto">
            {/* Auto Agent Option */}
            <div className="px-3 py-2 border-b border-gray-100">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                  ${!selectedAgent ? 'bg-orange-50 text-orange-700' : 'hover:bg-gray-50'}
                `}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <CpuChipIcon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">Auto-Select Agent</div>
                  <div className="text-sm text-gray-500">
                    Let the system choose the best agent for your task
                  </div>
                </div>
                {!selectedAgent && (
                  <CheckIcon className="h-5 w-5 text-orange-500" />
                )}
              </button>
            </div>

            {/* Agent Categories */}
            {Object.entries(groupedAgents).map(([category, categoryAgents]) => (
              <div key={category}>
                <div className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                  {getCategoryLabel(category)}
                </div>
                <div className="px-3 py-2">
                  {categoryAgents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => handleSelect(agent)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors
                        ${selectedAgent?.id === agent.id
                          ? 'bg-orange-50 text-orange-700'
                          : 'hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <CpuChipIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className={`h-2 w-2 rounded-full ${getStatusColor(agent.status)}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-gray-500 mb-1">
                          {agent.description}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {agent.capabilities.slice(0, 3).map((capability, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                            >
                              {capability}
                            </span>
                          ))}
                          {agent.capabilities.length > 3 && (
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              +{agent.capabilities.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedAgent?.id === agent.id && (
                        <CheckIcon className="h-5 w-5 text-orange-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filteredAgents.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                <CpuChipIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <div className="font-medium">No agents found</div>
                <div className="text-sm">
                  Try adjusting your search terms
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentSelector;