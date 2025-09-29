/**
 * Test data fixtures for E2E tests
 *
 * Provides consistent test data across all test scenarios
 * including agents, conversations, messages, and settings.
 */

export interface TestAgent {
  id: string;
  name: string;
  type: 'frontend' | 'api' | 'docs' | 'codebase-inspector' | 'mcp-integration';
  description: string;
  isAvailable: boolean;
  capabilities: string[];
  status: 'running' | 'stopped' | 'error' | 'starting';
  lastExecution: string;
  totalExecutions: number;
  successRate: number;
  version: string;
}

export interface TestConversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  messages: TestMessage[];
}

export interface TestMessage {
  id: string;
  type: 'user' | 'agent' | 'system' | 'error';
  content: string;
  timestamp: string;
  agentId?: string;
  agentName?: string;
  status?: 'sending' | 'sent' | 'error' | 'thinking';
  metadata?: {
    executionTime?: number;
    tokensUsed?: number;
    model?: string;
  };
}

export interface TestSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoSave: boolean;
  defaultAgent: string | null;
  chatSettings: {
    showTimestamps: boolean;
    showMetadata: boolean;
    autoScroll: boolean;
    messageLimit: number;
  };
}

export const testData = {
  agents: [
    {
      id: 'frontend-agent',
      name: 'Frontend Agent',
      type: 'frontend' as const,
      description: 'React, TypeScript, UI/UX specialist',
      isAvailable: true,
      capabilities: ['React', 'TypeScript', 'CSS', 'Accessibility', 'Aurora UI'],
      status: 'running' as const,
      lastExecution: '2 minutes ago',
      totalExecutions: 1247,
      successRate: 98.5,
      version: '1.2.3'
    },
    {
      id: 'api-agent',
      name: 'API Agent',
      type: 'api' as const,
      description: 'Backend API development specialist',
      isAvailable: true,
      capabilities: ['REST APIs', 'Database', 'Security', 'Fastify'],
      status: 'running' as const,
      lastExecution: '1 minute ago',
      totalExecutions: 892,
      successRate: 97.2,
      version: '1.1.8'
    },
    {
      id: 'docs-agent',
      name: 'Documentation Agent',
      type: 'docs' as const,
      description: 'Technical documentation specialist',
      isAvailable: false,
      capabilities: ['Technical Writing', 'API Docs', 'Tutorials'],
      status: 'stopped' as const,
      lastExecution: '1 hour ago',
      totalExecutions: 543,
      successRate: 99.1,
      version: '1.0.9'
    },
    {
      id: 'codebase-inspector',
      name: 'Codebase Inspector',
      type: 'codebase-inspector' as const,
      description: 'Code analysis and security specialist',
      isAvailable: true,
      capabilities: ['Security Analysis', 'Code Review', 'Performance Audit'],
      status: 'running' as const,
      lastExecution: '5 minutes ago',
      totalExecutions: 234,
      successRate: 95.8,
      version: '1.0.0'
    },
    {
      id: 'mcp-integration',
      name: 'MCP Integration Agent',
      type: 'mcp-integration' as const,
      description: 'Model Context Protocol integration specialist',
      isAvailable: true,
      capabilities: ['MCP Servers', 'Context7', 'GitHub Integration'],
      status: 'running' as const,
      lastExecution: '3 minutes ago',
      totalExecutions: 156,
      successRate: 94.2,
      version: '1.0.0'
    }
  ] as TestAgent[],

  conversations: [
    {
      id: 'conv-test-1',
      title: 'Basic Chat Test',
      lastMessage: 'Test message for basic functionality',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      messageCount: 5,
      messages: [
        {
          id: 'msg-test-1',
          type: 'system' as const,
          content: 'Welcome to the test chat interface!',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'sent' as const
        },
        {
          id: 'msg-test-2',
          type: 'user' as const,
          content: 'Hello, can you help me with React components?',
          timestamp: new Date(Date.now() - 3500000).toISOString(),
          status: 'sent' as const
        },
        {
          id: 'msg-test-3',
          type: 'agent' as const,
          content: 'Of course! I\'m the Frontend Agent and I specialize in React, TypeScript, and UI development. What specific help do you need?',
          timestamp: new Date(Date.now() - 3400000).toISOString(),
          agentId: 'frontend-agent',
          agentName: 'Frontend Agent',
          status: 'sent' as const,
          metadata: {
            executionTime: 1250,
            tokensUsed: 85,
            model: 'gpt-4o'
          }
        }
      ]
    },
    {
      id: 'conv-test-2',
      title: 'Agent Selection Test',
      lastMessage: 'Testing agent switching functionality',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      messageCount: 8,
      messages: [
        {
          id: 'msg-test-4',
          type: 'user' as const,
          content: 'I need help with API security',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'sent' as const
        },
        {
          id: 'msg-test-5',
          type: 'agent' as const,
          content: 'I\'m the API Agent, specialized in backend security. Let me help you with that.',
          timestamp: new Date(Date.now() - 7100000).toISOString(),
          agentId: 'api-agent',
          agentName: 'API Agent',
          status: 'sent' as const,
          metadata: {
            executionTime: 980,
            tokensUsed: 62,
            model: 'gpt-4o'
          }
        }
      ]
    },
    {
      id: 'conv-test-3',
      title: 'Error Handling Test',
      lastMessage: 'Testing error scenarios',
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      messageCount: 3,
      messages: [
        {
          id: 'msg-test-6',
          type: 'user' as const,
          content: 'This should trigger an error scenario',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: 'sent' as const
        },
        {
          id: 'msg-test-7',
          type: 'error' as const,
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(Date.now() - 86300000).toISOString(),
          status: 'error' as const
        }
      ]
    }
  ] as TestConversation[],

  settings: {
    theme: 'light' as const,
    notifications: true,
    autoSave: true,
    defaultAgent: null,
    chatSettings: {
      showTimestamps: true,
      showMetadata: true,
      autoScroll: true,
      messageLimit: 100
    }
  } as TestSettings,

  // Test scenarios for different user types
  scenarios: {
    newUser: {
      conversations: [],
      settings: {
        theme: 'light' as const,
        notifications: true,
        autoSave: true,
        defaultAgent: null,
        chatSettings: {
          showTimestamps: false,
          showMetadata: false,
          autoScroll: true,
          messageLimit: 50
        }
      }
    },
    powerUser: {
      conversations: [
        // Multiple conversations with different agents
      ],
      settings: {
        theme: 'dark' as const,
        notifications: false,
        autoSave: true,
        defaultAgent: 'frontend-agent',
        chatSettings: {
          showTimestamps: true,
          showMetadata: true,
          autoScroll: false,
          messageLimit: 200
        }
      }
    }
  },

  // Common test messages for different scenarios
  messages: {
    simple: 'Hello, this is a simple test message.',
    complex: 'Can you help me implement a React component with TypeScript that handles form validation, state management, and has proper accessibility features?',
    codeRequest: 'Show me how to create a custom hook for managing API calls with error handling.',
    longText: 'This is a very long message that should test how the chat interface handles lengthy content. '.repeat(20),
    specialCharacters: 'Testing special characters: @#$%^&*()[]{}|;:,.<>?',
    multiline: `This is a multiline message
that spans multiple lines
and should test text formatting
and display capabilities.`,
    urgentHelp: '🚨 URGENT: I need help debugging a critical production issue!',
    followUp: 'Can you explain that in more detail?',
    thankYou: 'Thank you, that was very helpful!'
  },

  // Error scenarios for testing
  errorScenarios: {
    networkError: {
      message: 'Test network error scenario',
      expectedError: 'Network error: Unable to connect to the server'
    },
    apiError: {
      message: 'Test API error scenario',
      expectedError: 'API error: Invalid request format'
    },
    timeoutError: {
      message: 'Test timeout error scenario',
      expectedError: 'Request timeout: The operation took too long to complete'
    },
    agentUnavailable: {
      message: 'Test with unavailable agent',
      expectedError: 'Agent unavailable: The selected agent is currently offline'
    }
  },

  // Performance test data
  performance: {
    stressTest: {
      messageCount: 100,
      messageDelay: 100, // ms between messages
      expectedMaxResponseTime: 5000 // ms
    },
    loadTest: {
      concurrentUsers: 5,
      messagesPerUser: 20,
      expectedAvgResponseTime: 2000 // ms
    }
  }
};