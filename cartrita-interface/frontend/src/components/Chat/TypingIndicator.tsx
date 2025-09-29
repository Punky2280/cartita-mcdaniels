/**
 * Cartrita Interface - Typing Indicator Component
 * Shows when AI agent is processing a response
 */

import React from 'react';
import { CpuChipIcon } from '@heroicons/react/24/outline';
import { TypingIndicator as TypingIndicatorType } from '@/types';

interface TypingIndicatorProps {
  typing: TypingIndicatorType;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typing,
  className = ''
}) => {
  if (!typing.isTyping) return null;

  return (
    <div className={`flex items-start gap-3 max-w-4xl mr-auto ${className}`}>
      {/* Avatar */}
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center flex-shrink-0">
        <CpuChipIcon className="h-4 w-4 text-white" />
      </div>

      {/* Typing Content */}
      <div className="flex flex-col min-w-0 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {typing.agentName || 'AI Assistant'}
          </span>
          <span className="text-xs text-gray-500">
            is typing...
          </span>
        </div>

        {/* Typing Bubble */}
        <div className="relative bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm aurora-glass-morphism">
          {/* Animated Dots */}
          <div className="flex items-center gap-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="ml-2 text-sm text-gray-500">Thinking...</span>
          </div>

          {/* Pulse Effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-purple-600/5 animate-pulse" />

          {/* Message Tail */}
          <div className="absolute top-3 left-[-6px] w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45" />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;