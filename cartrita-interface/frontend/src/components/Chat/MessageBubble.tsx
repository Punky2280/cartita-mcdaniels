/**
 * Cartrita Interface - Message Bubble Component
 * Individual chat message with Cartrita design system styling
 */

import React from 'react';
import { ChatMessage } from '@/types';
import {
  UserIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentMagnifyingGlassIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageBubbleProps {
  message: ChatMessage;
  isLatest?: boolean;
  className?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLatest = false,
  className = ''
}) => {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  // Detect Context7 enhancement in AI responses
  const isContext7Enhanced = !isUser && (
    message.metadata?.context7Enabled ||
    message.metadata?.enhancedDocumentation ||
    /context7|2025 documentation|latest.*documentation/i.test(message.content || '')
  );

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <ClockIcon className="h-3 w-3 text-gray-400 animate-pulse" />;
      case 'sent':
      case 'delivered':
        return <CheckCircleIcon className="h-3 w-3 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getAgentAvatar = () => {
    if (isUser) {
      return (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <UserIcon className="h-4 w-4 text-white" />
        </div>
      );
    }

    return (
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center flex-shrink-0">
        <CpuChipIcon className="h-4 w-4 text-white" />
      </div>
    );
  };

  const formatTimestamp = () => {
    try {
      return formatDistanceToNow(new Date(message.timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <div
      className={`flex items-start gap-3 max-w-4xl ${
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      } ${className}`}
    >
      {/* Avatar */}
      {getAgentAvatar()}

      {/* Message Content */}
      <div className={`flex flex-col min-w-0 flex-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {isUser ? 'You' : message.agentName || 'AI Assistant'}
          </span>
          {isContext7Enhanced && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-100 to-purple-100 border border-orange-200 rounded-full">
              <DocumentMagnifyingGlassIcon className="h-3 w-3 text-orange-600" />
              <SparklesIcon className="h-3 w-3 text-purple-600" />
              <span className="text-xs font-medium text-gray-700">Context7 2025</span>
            </div>
          )}
          <span className="text-xs text-gray-500">
            {formatTimestamp()}
          </span>
          {getStatusIcon()}
        </div>

        {/* Message Bubble */}
        <div
          className={`
            relative max-w-prose rounded-2xl px-4 py-3 shadow-sm border
            ${isUser
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-200'
              : isError
              ? 'bg-red-50 text-red-900 border-red-200'
              : 'bg-white text-gray-900 border-gray-200'
            }
            ${isLatest && !isUser ? 'aurora-glass-morphism' : ''}
          `}
        >
          {/* Message Content */}
          <div className="prose prose-sm max-w-none">
            {isUser ? (
              // User messages as plain text with line breaks
              <div className="whitespace-pre-wrap text-white">
                {message.content}
              </div>
            ) : (
              // AI messages with markdown support
              <ReactMarkdown
                className={`
                  prose prose-sm max-w-none
                  ${isError ? 'prose-red' : 'prose-gray'}
                  prose-p:my-2 prose-ul:my-2 prose-ol:my-2
                  prose-li:my-0 prose-headings:my-2
                `}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg text-sm"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className={`
                          px-1.5 py-0.5 rounded text-sm font-mono
                          ${isError
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                          }
                        `}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Metadata */}
          {message.metadata && !isUser && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                {message.metadata.model && (
                  <span>Model: {message.metadata.model}</span>
                )}
                {message.metadata.responseTime && (
                  <span>{message.metadata.responseTime}ms</span>
                )}
                {message.metadata.tokens && (
                  <span>{message.metadata.tokens} tokens</span>
                )}
              </div>
              {isContext7Enhanced && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center gap-1 text-orange-600">
                    <DocumentMagnifyingGlassIcon className="h-3 w-3" />
                    <span className="text-xs">Enhanced with Context7 MCP</span>
                  </div>
                  <div className="flex items-center gap-1 text-purple-600">
                    <SparklesIcon className="h-3 w-3" />
                    <span className="text-xs">2025 Documentation</span>
                  </div>
                </div>
              )}
              {message.metadata.error && (
                <div className="mt-1 text-red-600">
                  Error: {message.metadata.error}
                </div>
              )}
            </div>
          )}

          {/* Message Tail */}
          <div
            className={`
              absolute top-3 w-3 h-3 transform rotate-45
              ${isUser
                ? 'right-[-6px] bg-gradient-to-br from-blue-500 to-blue-600 border-r border-b border-blue-200'
                : 'left-[-6px] bg-white border-l border-t border-gray-200'
              }
              ${isError && !isUser ? 'bg-red-50 border-red-200' : ''}
            `}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;