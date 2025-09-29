/**
 * Cartrita Interface - Chat Page
 * Main chat interface with AI agents integration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/UI/Button';
import { LoadingSpinner } from '@/components/UI/LoadingSpinner';
import { MessageBubble } from '@/components/Chat/MessageBubble';
import { TypingIndicator } from '@/components/Chat/TypingIndicator';
import { MessageInput } from '@/components/Chat/MessageInput';
import { AgentSelector } from '@/components/Chat/AgentSelector';
import {
  ChatMessage,
  ChatConversation,
  ChatRequest,
  AgentInfo,
  TypingIndicator as TypingIndicatorType,
  WebSocketMessage
} from '@/types';
import { chatService } from '@/services/chatService';
import { logger } from '@/utils/logger';

// Context7 enhancement for 2025 development patterns
const enhanceMessageWithContext7 = (content: string, agentType?: string): string => {
  // Check if message is development-related
  const isDevelopmentQuery = /react|typescript|javascript|next\.?js|vite|tailwind|css|api|database|fastify|node|npm|pnpm|component|hook|state|props|jsx|tsx|html|backend|frontend|ui|ux|auth|security|test|playwright|vitest|build|deploy/i.test(content);

  if (isDevelopmentQuery) {
    // Add Context7 directive for current 2025 documentation
    const year = new Date().getFullYear();
    const context7Directive = `use context7 (${year} documentation)`;

    // Smart enhancement based on agent type
    let enhancedDirective = context7Directive;

    switch (agentType) {
      case 'frontend-agent':
        enhancedDirective += ' - Focus on React 19+, TypeScript 5.7+, Vite 6+, Tailwind CSS 4+';
        break;
      case 'api-agent':
        enhancedDirective += ' - Focus on Node.js 22+, Fastify 5+, TypeScript 5.7+, modern APIs';
        break;
      case 'codebase-inspector':
        enhancedDirective += ' - Focus on 2025 security best practices, modern vulnerability patterns';
        break;
      case 'mcp-integration':
        enhancedDirective += ' - Focus on latest MCP protocol, Context7 API, GitHub v4';
        break;
      default:
        enhancedDirective += ' - Focus on latest 2025 best practices and patterns';
    }

    return `${enhancedDirective}\n\n${content}`;
  }

  return content;
};

export const Chat: React.FC = () => {
  // State management
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [typing, setTyping] = useState<TypingIndicatorType>({ isTyping: false });
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoadingAgents(true);

        // Load available agents from backend
        const availableAgents = await chatService.getAvailableAgents();
        setAgents(availableAgents);

        // Create a default conversation
        const defaultConversation: ChatConversation = {
          id: 'default-chat',
          title: 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        };

        setCurrentConversation(defaultConversation);
        setConversations([defaultConversation]);

      } catch (err) {
        logger.error('Failed to initialize chat data', err instanceof Error ? err : new Error(String(err)));
        setError('Failed to load chat data. Please refresh the page.');
      } finally {
        setIsLoadingAgents(false);
      }
    };

    initializeData();
  }, []);

  // WebSocket message handling
  useEffect(() => {
    const handleWebSocketMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        case 'chat_response':
          setTyping({ isTyping: false });
          break;
        case 'typing_start':
          setTyping({
            isTyping: true,
            agentName: (message.payload as { agentName: string }).agentName
          });
          break;
        case 'typing_stop':
          setTyping({ isTyping: false });
          break;
        case 'error':
          setTyping({ isTyping: false });
          setError((message.payload as { message: string }).message);
          break;
      }
    };

    chatService.addMessageListener('chat-page', handleWebSocketMessage);

    return () => {
      chatService.removeMessageListener('chat-page');
    };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages, typing, scrollToBottom]);

  const handleSendMessage = async (content: string) => {
    if (!currentConversation || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      // Create user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content,
        role: 'user',
        timestamp: new Date(),
        status: 'sending'
      };

      // Update conversation optimistically
      const updatedConversation: ChatConversation = {
        ...currentConversation,
        messages: [...currentConversation.messages, userMessage],
        updatedAt: new Date()
      };
      setCurrentConversation(updatedConversation);

      // Show typing indicator
      setTyping({
        isTyping: true,
        agentName: selectedAgent?.name || 'AI Assistant'
      });

      // Enhance message with Context7 integration for development queries
      const enhancedContent = enhanceMessageWithContext7(content, selectedAgent?.id);

      // Send message to backend via chat service
      const chatRequest: ChatRequest = {
        conversationId: currentConversation.id,
        message: { ...userMessage, content: enhancedContent },
        agentType: selectedAgent?.id,
        streaming: true,
        context: {
          previousMessages: currentConversation.messages.slice(-5), // Last 5 messages for context
          userPreferences: {
            useContext7: true,
            enhancedDocumentation: true
          },
          sessionData: {
            timestamp: new Date().toISOString(),
            context7Enabled: true
          }
        }
      };

      try {
        const response = await chatService.sendMessage(chatRequest);

        const assistantMessage: ChatMessage = {
          id: response.messageId,
          content: response.content,
          role: 'assistant',
          timestamp: new Date(response.timestamp),
          agentName: response.agentName || selectedAgent?.name || 'AI Assistant',
          status: 'delivered',
          metadata: response.metadata
        };

        const finalConversation: ChatConversation = {
          ...updatedConversation,
          messages: [
            ...updatedConversation.messages.map(msg =>
              msg.id === userMessage.id ? { ...msg, status: 'delivered' as const } : msg
            ),
            assistantMessage
          ],
          updatedAt: new Date()
        };

        setCurrentConversation(finalConversation);
        setConversations(prev =>
          prev.map(conv =>
            conv.id === currentConversation.id ? finalConversation : conv
          )
        );
      } catch (err) {
        logger.error('Failed to get response from AI agent', err instanceof Error ? err : new Error(String(err)));
        setError('Failed to get response from AI agent. Please try again.');

        // Mark user message as failed
        const failedConversation: ChatConversation = {
          ...updatedConversation,
          messages: updatedConversation.messages.map(msg =>
            msg.id === userMessage.id ? { ...msg, status: 'failed' as const } : msg
          ),
          updatedAt: new Date()
        };
        setCurrentConversation(failedConversation);
      } finally {
        setTyping({ isTyping: false });
        setIsLoading(false);
      }

    } catch (err) {
      logger.error('Failed to send message', err instanceof Error ? err : new Error(String(err)));
      setError('Failed to send message. Please try again.');
      setIsLoading(false);
      setTyping({ isTyping: false });
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConversation: ChatConversation = {
        id: `chat-${Date.now()}`,
        title: 'New Chat',
        messages: [],
        agentType: selectedAgent?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      setCurrentConversation(newConversation);
      setConversations(prev => [newConversation, ...prev]);
    } catch (err) {
      logger.error('Failed to create new conversation', err instanceof Error ? err : new Error(String(err)));
      setError('Failed to create new conversation.');
    }
  };

  const handleClearConversation = async () => {
    if (!currentConversation) return;

    if (window.confirm('Are you sure you want to clear this conversation?')) {
      try {
        const clearedConversation: ChatConversation = {
          ...currentConversation,
          messages: [],
          updatedAt: new Date()
        };
        setCurrentConversation(clearedConversation);
      } catch (err) {
        logger.error('Failed to clear conversation', err instanceof Error ? err : new Error(String(err)));
        setError('Failed to clear conversation.');
      }
    }
  };

  const handleExportConversation = () => {
    if (!currentConversation) return;

    const conversationText = currentConversation.messages
      .map(msg => `${msg.role === 'user' ? 'User' : msg.agentName || 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation-${currentConversation.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoadingAgents) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading chat interface...</p>
        </div>
      </div>
    );
  }

return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Chat</h1>
                <p className="text-sm text-gray-500">
                  {currentConversation
                    ? `${currentConversation.messages.length} messages`
                    : 'Start a new conversation'
                  }
                </p>
              </div>
            </div>

            {/* Agent Selector */}
            <div className="w-80">
              <AgentSelector
                agents={agents}
                selectedAgent={selectedAgent}
                onSelect={setSelectedAgent}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleNewConversation}
              variant="secondary"
              size="sm"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              New Chat
            </Button>
            <Button
              onClick={handleExportConversation}
              variant="secondary"
              size="sm"
              disabled={!currentConversation?.messages.length}
              className="flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={handleClearConversation}
              variant="secondary"
              size="sm"
              disabled={!currentConversation?.messages.length}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {currentConversation?.messages.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChatBubbleLeftRightIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {selectedAgent
                  ? `Chat with ${selectedAgent.name} to get help with ${selectedAgent.capabilities.join(', ')}.`
                  : 'Select an AI agent or let the system choose the best one for your needs.'
                }
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => handleSendMessage('Hello! How can you help me today?')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  Hello! How can you help me today?
                </button>
                <button
                  onClick={() => handleSendMessage('What are your capabilities?')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  What are your capabilities?
                </button>
                <button
                  onClick={() => handleSendMessage('Help me with a coding problem')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  Help me with a coding problem
                </button>
              </div>
            </div>
          ) : (
            // Messages
            <>
              {currentConversation?.messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLatest={index === currentConversation.messages.length - 1}
                />
              ))}

              {/* Typing Indicator */}
              {typing.isTyping && (
                <TypingIndicator typing={typing} />
              )}
            </>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={isLoading || !currentConversation}
        placeholder={
          selectedAgent
            ? `Message ${selectedAgent.name}... (Shift+Enter for new line)`
            : 'Type your message... (Shift+Enter for new line)'
        }
      />
    </div>
  );
};

export default Chat;