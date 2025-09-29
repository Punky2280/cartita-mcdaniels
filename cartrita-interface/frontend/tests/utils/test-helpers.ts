import { Page, Locator, expect } from '@playwright/test';
import { testData, TestMessage, TestAgent } from '../fixtures/test-data';

/**
 * Test utility functions for Aurora Interface E2E tests
 *
 * Provides reusable functions for common test operations
 * including chat interactions, agent management, and assertions.
 */

export class ChatTestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to the chat interface
   */
  async navigateToChat() {
    await this.page.goto('/chat');
    await this.page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
  }

  /**
   * Send a message in the chat interface
   */
  async sendMessage(message: string, waitForResponse = true) {
    const messageInput = this.page.getByTestId('message-input');
    const sendButton = this.page.getByTestId('send-message-btn');

    await messageInput.fill(message);
    await sendButton.click();

    if (waitForResponse) {
      // Wait for the message to appear
      await this.page.waitForSelector(`[data-testid*="message-"][data-message-type="user"]`, { timeout: 5000 });

      // Wait for agent response (indicated by thinking or response)
      await this.page.waitForSelector(
        `[data-testid*="message-"][data-message-type="agent"], [data-testid*="message-"][data-message-type="error"]`,
        { timeout: 15000 }
      );
    }
  }

  /**
   * Select a specific agent
   */
  async selectAgent(agentId: string) {
    await this.page.getByTestId(`agent-${agentId}`).click();

    // Verify agent is selected
    await expect(this.page.getByTestId('selected-agent-badge')).toContainText(
      testData.agents.find(a => a.id === agentId)?.name || agentId
    );
  }

  /**
   * Wait for agent response with timeout
   */
  async waitForAgentResponse(timeout = 15000) {
    await this.page.waitForSelector(
      '[data-testid*="message-"][data-message-type="agent"]:last-child',
      { timeout }
    );
  }

  /**
   * Get all messages in the chat
   */
  async getAllMessages() {
    return await this.page.locator('[data-testid*="message-"]').all();
  }

  /**
   * Get the last message in the chat
   */
  async getLastMessage() {
    const messages = await this.getAllMessages();
    return messages[messages.length - 1];
  }

  /**
   * Clear chat conversation
   */
  async clearChat() {
    const newConversationBtn = this.page.getByTestId('new-conversation-btn');
    await newConversationBtn.click();

    // Wait for chat to be cleared
    await expect(this.page.locator('[data-testid*="message-"]')).toHaveCount(0);
  }

  /**
   * Check if agent is available
   */
  async isAgentAvailable(agentId: string) {
    const agentButton = this.page.getByTestId(`agent-${agentId}`);
    const isAvailable = await agentButton.getAttribute('data-agent-available');
    return isAvailable === 'true';
  }

  /**
   * Stop message generation
   */
  async stopGeneration() {
    const stopButton = this.page.getByTestId('stop-generation-btn');
    if (await stopButton.isVisible()) {
      await stopButton.click();
    }
  }

  /**
   * Assert message exists with content
   */
  async assertMessageExists(content: string, messageType?: 'user' | 'agent' | 'system' | 'error') {
    const selector = messageType
      ? `[data-testid*="message-"][data-message-type="${messageType}"]`
      : '[data-testid*="message-"]';

    await expect(this.page.locator(selector).filter({ hasText: content })).toBeVisible();
  }

  /**
   * Assert agent response contains text
   */
  async assertAgentResponseContains(text: string) {
    const agentMessages = this.page.locator('[data-testid*="message-"][data-message-type="agent"]');
    await expect(agentMessages.last()).toContainText(text);
  }

  /**
   * Get message metadata
   */
  async getMessageMetadata(messageIndex: number = -1) {
    const messages = await this.getAllMessages();
    const message = messageIndex === -1 ? messages[messages.length - 1] : messages[messageIndex];

    const metadata = await message.locator('[data-testid="message-metadata"]').textContent();
    return metadata;
  }

  /**
   * Simulate slow network
   */
  async simulateSlowNetwork() {
    await this.page.route('**/api/**', async (route) => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.continue();
    });
  }

  /**
   * Simulate network error
   */
  async simulateNetworkError() {
    await this.page.route('**/api/chat/**', async (route) => {
      await route.abort('connectionfailed');
    });
  }
}

export class AgentTestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to agents page
   */
  async navigateToAgents() {
    await this.page.goto('/agents');
    await this.page.waitForSelector('[data-testid="agents-page"]', { timeout: 10000 });
  }

  /**
   * Get all available agents
   */
  async getAvailableAgents() {
    const agentCards = await this.page.locator('[data-testid*="agent-card-"]').all();
    const agents = [];

    for (const card of agentCards) {
      const name = await card.locator('h3').textContent();
      const status = await card.locator('[data-testid="agent-status"]').textContent();
      agents.push({ name, status });
    }

    return agents;
  }

  /**
   * Start an agent
   */
  async startAgent(agentId: string) {
    await this.page.getByTestId(`start-agent-${agentId}`).click();

    // Wait for status to change
    await expect(this.page.getByTestId(`agent-status-${agentId}`)).toContainText('running');
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string) {
    await this.page.getByTestId(`stop-agent-${agentId}`).click();

    // Wait for status to change
    await expect(this.page.getByTestId(`agent-status-${agentId}`)).toContainText('stopped');
  }
}

export class AccessibilityTestHelpers {
  constructor(private page: Page) {}

  /**
   * Check keyboard navigation
   */
  async testKeyboardNavigation() {
    // Test Tab navigation through chat interface
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');

    // Verify focus is visible
    const focusedElement = await this.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  }

  /**
   * Test screen reader labels
   */
  async checkAriaLabels() {
    // Check important elements have proper ARIA labels
    await expect(this.page.getByTestId('message-input')).toHaveAttribute('aria-label');
    await expect(this.page.getByTestId('send-message-btn')).toHaveAttribute('aria-label');
  }

  /**
   * Test color contrast (simplified check)
   */
  async checkColorContrast() {
    // This would ideally use axe-core for comprehensive checks
    const messageElements = await this.page.locator('[data-testid*="message-"]').all();

    for (const element of messageElements) {
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color
        };
      });

      // Basic check that colors are defined
      expect(styles.backgroundColor).toBeTruthy();
      expect(styles.color).toBeTruthy();
    }
  }
}

export class PerformanceTestHelpers {
  constructor(private page: Page) {}

  /**
   * Measure page load time
   */
  async measurePageLoadTime() {
    const startTime = Date.now();
    await this.page.goto('/chat');
    await this.page.waitForSelector('[data-testid="chat-interface"]');
    const endTime = Date.now();

    return endTime - startTime;
  }

  /**
   * Measure message response time
   */
  async measureMessageResponseTime(message: string) {
    const chatHelper = new ChatTestHelpers(this.page);

    const startTime = Date.now();
    await chatHelper.sendMessage(message, false);
    await chatHelper.waitForAgentResponse();
    const endTime = Date.now();

    return endTime - startTime;
  }

  /**
   * Monitor memory usage (simplified)
   */
  async getMemoryUsage() {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
  }

  /**
   * Stress test with multiple messages
   */
  async stressTestMessages(messageCount: number, delay = 100) {
    const chatHelper = new ChatTestHelpers(this.page);
    const times = [];

    for (let i = 0; i < messageCount; i++) {
      const startTime = Date.now();
      await chatHelper.sendMessage(`Stress test message ${i + 1}`, true);
      const endTime = Date.now();

      times.push(endTime - startTime);

      if (delay > 0) {
        await this.page.waitForTimeout(delay);
      }
    }

    return {
      messageCount,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxTime: Math.max(...times),
      minTime: Math.min(...times),
      times
    };
  }
}

/**
 * Mock API responses for testing
 */
export class MockAPIHelpers {
  constructor(private page: Page) {}

  /**
   * Mock successful agent response
   */
  async mockSuccessfulAgentResponse(message: string, agent: TestAgent) {
    await this.page.route('**/api/chat/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `response-${Date.now()}`,
          message: `Mock response from ${agent.name}: I understand your message "${message}".`,
          agent: agent.id,
          timestamp: new Date().toISOString(),
          metadata: {
            executionTime: 1500,
            tokensUsed: 75,
            model: 'gpt-4o'
          }
        })
      });
    });
  }

  /**
   * Mock API error
   */
  async mockAPIError(statusCode = 500) {
    await this.page.route('**/api/chat/**', async (route) => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'Something went wrong processing your request'
        })
      });
    });
  }

  /**
   * Mock network timeout
   */
  async mockNetworkTimeout() {
    await this.page.route('**/api/chat/**', async (route) => {
      // Don't fulfill the route, causing a timeout
      await new Promise(resolve => setTimeout(resolve, 30000));
    });
  }

  /**
   * Clear all mocked routes
   */
  async clearMocks() {
    await this.page.unroute('**/api/**');
  }
}

/**
 * Wait for specific conditions
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout = 10000,
  interval = 100
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Take screenshot for debugging
 */
export async function takeDebugScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/debug-${name}-${timestamp}.png`,
    fullPage: true
  });
}