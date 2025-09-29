/**
 * Aurora Interface - AI Agent Interactions E2E Tests
 *
 * Tests specific to AI agent functionality:
 * - Agent selection and switching
 * - Specialized agent capabilities
 * - Multi-agent workflows
 * - Context preservation
 * - MCP server integration
 */

import { test, expect, type Page } from '@playwright/test';

// Test scenarios for different agent types
const AGENT_SCENARIOS = {
  'frontend-agent': {
    name: 'Frontend Agent',
    testQueries: [
      'Create a React component for a button',
      'How do I implement dark mode with Tailwind CSS?',
      'What are React hooks?',
      'Help me with TypeScript interfaces'
    ],
    expectedKeywords: ['React', 'component', 'TypeScript', 'CSS', 'hook']
  },
  'api-agent': {
    name: 'API Agent',
    testQueries: [
      'Design a REST API for user authentication',
      'How do I secure my API endpoints?',
      'What database should I use for my project?',
      'Help me with JWT authentication'
    ],
    expectedKeywords: ['API', 'authentication', 'database', 'security', 'endpoint']
  },
  'codebase-inspector': {
    name: 'Codebase Inspector',
    testQueries: [
      'Analyze the security of my authentication system',
      'Review my code for performance issues',
      'Check for vulnerabilities in my codebase',
      'Audit my API security'
    ],
    expectedKeywords: ['security', 'vulnerability', 'performance', 'audit', 'analysis']
  },
  'mcp-integration': {
    name: 'MCP Integration Agent',
    testQueries: [
      'Search GitHub for best practices',
      'Find documentation about React hooks',
      'Research TypeScript patterns',
      'Get the latest updates on Fastify'
    ],
    expectedKeywords: ['GitHub', 'documentation', 'research', 'search', 'MCP']
  }
};

class AgentTestHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async selectAgent(agentId: string) {
    const agentSelector = this.page.getByTestId('agent-selector');
    await agentSelector.click();
    await this.page.getByTestId(`agent-option-${agentId}`).click();

    // Verify selection
    const selectedAgent = AGENT_SCENARIOS[agentId as keyof typeof AGENT_SCENARIOS];
    await expect(agentSelector.getByText(selectedAgent.name)).toBeVisible();
  }

  async sendMessageAndWaitForResponse(message: string, timeout = 30000) {
    const messageInput = this.page.getByTestId('message-input');
    const sendButton = this.page.getByTestId('send-button');

    await messageInput.fill(message);
    await sendButton.click();

    // Wait for typing indicator
    const typingIndicator = this.page.getByTestId('typing-indicator');
    await expect(typingIndicator).toBeVisible({ timeout: 5000 });

    // Wait for response
    await expect(typingIndicator).toBeHidden({ timeout });

    // Return the last message
    const messages = this.page.getByTestId('message-bubble');
    return messages.last();
  }

  async getConversationHistory() {
    const messages = this.page.getByTestId('message-bubble');
    const count = await messages.count();

    const history = [];
    for (let i = 0; i < count; i++) {
      const message = messages.nth(i);
      const role = await message.getAttribute('data-role');
      const content = await message.textContent();
      history.push({ role, content });
    }

    return history;
  }

  async verifyAgentCapabilities(agentId: string, response: any) {
    const agentConfig = AGENT_SCENARIOS[agentId as keyof typeof AGENT_SCENARIOS];
    const responseText = await response.textContent();

    // Check if response contains expected keywords for this agent type
    const hasExpectedKeywords = agentConfig.expectedKeywords.some(keyword =>
      responseText?.toLowerCase().includes(keyword.toLowerCase())
    );

    expect(hasExpectedKeywords).toBe(true);
  }
}

test.describe('AI Agent Interactions', () => {
  let helper: AgentTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AgentTestHelper(page);
    await page.goto('/chat');

    // Wait for chat interface to load
    await expect(page.getByText('AI Chat')).toBeVisible();
    await expect(page.getByTestId('message-input')).toBeVisible();
  });

  test.describe('Individual Agent Testing', () => {
    Object.entries(AGENT_SCENARIOS).forEach(([agentId, config]) => {
      test(`should interact correctly with ${config.name}`, async ({ page }) => {
        await helper.selectAgent(agentId);

        // Test each query for this agent
        for (const query of config.testQueries) {
          const response = await helper.sendMessageAndWaitForResponse(query);

          // Verify response is appropriate for this agent type
          await helper.verifyAgentCapabilities(agentId, response);

          // Verify agent name appears in response
          await expect(response.getByText(config.name)).toBeVisible();
        }
      });
    });
  });

  test.describe('Agent Switching', () => {
    test('should maintain context when switching agents', async ({ page }) => {
      // Start with frontend agent
      await helper.selectAgent('frontend-agent');
      await helper.sendMessageAndWaitForResponse('I need help building a user interface');

      // Switch to API agent
      await helper.selectAgent('api-agent');
      const response = await helper.sendMessageAndWaitForResponse('Now I need the backend API for this UI');

      // Verify the API agent understands the UI context
      const responseText = await response.textContent();
      expect(responseText?.toLowerCase()).toContain('api');
    });

    test('should handle rapid agent switching', async ({ page }) => {
      const agents = ['frontend-agent', 'api-agent', 'codebase-inspector'];

      for (const agentId of agents) {
        await helper.selectAgent(agentId);
        await helper.sendMessageAndWaitForResponse(`Quick test for ${agentId}`);
      }

      // Verify all messages were processed
      const history = await helper.getConversationHistory();
      expect(history.length).toBeGreaterThanOrEqual(6); // 3 user + 3 assistant messages
    });
  });

  test.describe('MCP Server Integration', () => {
    test('should use Context7 for documentation queries', async ({ page }) => {
      await helper.selectAgent('mcp-integration');

      const response = await helper.sendMessageAndWaitForResponse(
        'Find the latest React documentation about hooks'
      );

      // Verify MCP integration keywords
      const responseText = await response.textContent();
      expect(responseText?.toLowerCase()).toMatch(/context7|documentation|search|research/);
    });

    test('should use GitHub MCP for code searches', async ({ page }) => {
      await helper.selectAgent('mcp-integration');

      const response = await helper.sendMessageAndWaitForResponse(
        'Search GitHub for React TypeScript examples'
      );

      // Verify GitHub integration
      const responseText = await response.textContent();
      expect(responseText?.toLowerCase()).toMatch(/github|repository|code|search/);
    });

    test('should handle MCP server timeouts gracefully', async ({ page }) => {
      // Intercept MCP requests and simulate timeout
      await page.route('**/api/v1/mcp/**', route => {
        setTimeout(() => route.abort('timedout'), 1000);
      });

      await helper.selectAgent('mcp-integration');

      const response = await helper.sendMessageAndWaitForResponse(
        'This request should timeout',
        45000 // Longer timeout for this test
      );

      // Should get a fallback response
      await expect(response).toBeVisible();
    });
  });

  test.describe('Multi-Agent Workflows', () => {
    test('should handle complex multi-step workflow', async ({ page }) => {
      // Step 1: Research with MCP agent
      await helper.selectAgent('mcp-integration');
      await helper.sendMessageAndWaitForResponse(
        'Research best practices for React authentication'
      );

      // Step 2: Design API with API agent
      await helper.selectAgent('api-agent');
      await helper.sendMessageAndWaitForResponse(
        'Based on the research, design an authentication API'
      );

      // Step 3: Implement frontend with Frontend agent
      await helper.selectAgent('frontend-agent');
      await helper.sendMessageAndWaitForResponse(
        'Create React components for the authentication system'
      );

      // Step 4: Security review with Codebase Inspector
      await helper.selectAgent('codebase-inspector');
      const finalResponse = await helper.sendMessageAndWaitForResponse(
        'Review the security of this authentication implementation'
      );

      // Verify workflow completion
      const history = await helper.getConversationHistory();
      expect(history.length).toBeGreaterThanOrEqual(8); // 4 user + 4 assistant messages

      // Verify security analysis response
      const responseText = await finalResponse.textContent();
      expect(responseText?.toLowerCase()).toMatch(/security|vulnerability|authentication/);
    });

    test('should maintain workflow state across sessions', async ({ page }) => {
      // Create a complex conversation
      await helper.selectAgent('frontend-agent');
      await helper.sendMessageAndWaitForResponse('Help me build a dashboard');

      await helper.selectAgent('api-agent');
      await helper.sendMessageAndWaitForResponse('Design the API for this dashboard');

      // Simulate page refresh
      await page.reload();
      await expect(page.getByText('AI Chat')).toBeVisible();

      // Continue the conversation (assuming session persistence)
      await helper.selectAgent('codebase-inspector');
      const response = await helper.sendMessageAndWaitForResponse(
        'Review the dashboard implementation'
      );

      await expect(response).toBeVisible();
    });
  });

  test.describe('Agent Performance', () => {
    test('should respond within acceptable timeframes', async ({ page }) => {
      const agents = Object.keys(AGENT_SCENARIOS);
      const responseTimes: number[] = [];

      for (const agentId of agents) {
        await helper.selectAgent(agentId);

        const startTime = Date.now();
        await helper.sendMessageAndWaitForResponse('Quick performance test', 15000);
        const endTime = Date.now();

        responseTimes.push(endTime - startTime);
      }

      // Verify all responses came within 15 seconds
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(15000);
      });

      // Verify average response time is reasonable
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(averageTime).toBeLessThan(10000); // 10 second average
    });

    test('should handle concurrent agent requests', async ({ page }) => {
      // This would test multiple browser tabs/contexts if needed
      await helper.selectAgent('frontend-agent');

      // Send multiple rapid requests
      const promises = [
        helper.sendMessageAndWaitForResponse('Concurrent test 1'),
        helper.sendMessageAndWaitForResponse('Concurrent test 2'),
        helper.sendMessageAndWaitForResponse('Concurrent test 3')
      ];

      // All should complete successfully
      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response).toBeVisible();
      });
    });
  });

  test.describe('Agent Error Handling', () => {
    test('should handle agent unavailability', async ({ page }) => {
      // Mock agent service returning error
      await page.route('**/api/v1/agents/**', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Agent temporarily unavailable' })
        });
      });

      await helper.selectAgent('frontend-agent');

      // Should show error message
      await expect(page.getByText(/temporarily unavailable|error/i)).toBeVisible({ timeout: 10000 });
    });

    test('should fallback to default agent on selection error', async ({ page }) => {
      // Mock agent selection error
      await page.route('**/api/v1/agents', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([]) // Empty agents list
        });
      });

      await page.reload();
      await expect(page.getByText('AI Chat')).toBeVisible();

      // Should still allow basic chat functionality
      const messageInput = page.getByTestId('message-input');
      const sendButton = page.getByTestId('send-button');

      await expect(messageInput).toBeVisible();
      await expect(sendButton).toBeVisible();
    });
  });
});

test.describe('Agent Integration with Backend', () => {
  test('should verify agent API endpoints', async ({ page }) => {
    // Test direct API calls to verify backend integration
    const response = await page.request.get('/api/v1/agents');
    expect(response.status()).toBe(200);

    const agents = await response.json();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);

    // Verify agent structure
    agents.forEach((agent: any) => {
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('capabilities');
      expect(agent).toHaveProperty('status');
    });
  });

  test('should verify chat API integration', async ({ page }) => {
    const chatRequest = {
      conversationId: 'test-conversation',
      message: {
        id: 'test-message',
        content: 'API integration test',
        role: 'user',
        timestamp: new Date().toISOString()
      },
      agentType: 'frontend-agent',
      streaming: false
    };

    const response = await page.request.post('/api/v1/chat', {
      data: chatRequest
    });

    // Should handle the request (may require auth)
    expect([200, 401, 403]).toContain(response.status());
  });
});