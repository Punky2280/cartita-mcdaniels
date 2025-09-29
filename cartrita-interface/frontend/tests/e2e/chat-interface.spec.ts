/**
 * Aurora Interface - Chat Interface E2E Tests
 *
 * Comprehensive testing of the AI chat interface including:
 * - Basic chat functionality
 * - Agent selection and interaction
 * - Message sending and receiving
 * - UI responsiveness and accessibility
 * - Error handling
 */

import { test, expect, type Page, type Locator } from '@playwright/test';

// Test data and helpers
const TEST_MESSAGES = {
  simple: 'Hello, can you help me?',
  code: 'How do I create a React component?',
  complex: 'Can you analyze the security of my authentication system and provide recommendations?',
  multiline: 'This is a multi-line message.\n\nWith multiple paragraphs.\n\nAnd some code:\n```javascript\nconst hello = "world";\n```'
};

const AGENT_TYPES = {
  frontend: 'frontend-agent',
  api: 'api-agent',
  codebase: 'codebase-inspector',
  mcp: 'mcp-integration'
};

class ChatPage {
  readonly page: Page;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messagesList: Locator;
  readonly agentSelector: Locator;
  readonly typingIndicator: Locator;
  readonly clearButton: Locator;
  readonly exportButton: Locator;
  readonly newChatButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.messageInput = page.getByTestId('message-input');
    this.sendButton = page.getByTestId('send-button');
    this.messagesList = page.getByTestId('messages-list');
    this.agentSelector = page.getByTestId('agent-selector');
    this.typingIndicator = page.getByTestId('typing-indicator');
    this.clearButton = page.getByTestId('clear-conversation');
    this.exportButton = page.getByTestId('export-conversation');
    this.newChatButton = page.getByTestId('new-chat');
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.sendButton.click();
  }

  async selectAgent(agentId: string) {
    await this.agentSelector.click();
    await this.page.getByTestId(`agent-option-${agentId}`).click();
  }

  async waitForResponse(timeout = 30000) {
    // Wait for typing indicator to appear
    await expect(this.typingIndicator).toBeVisible({ timeout: 5000 });

    // Wait for typing indicator to disappear (response received)
    await expect(this.typingIndicator).toBeHidden({ timeout });
  }

  async getLastMessage() {
    const messages = this.page.getByTestId('message-bubble');
    return messages.last();
  }

  async getMessageCount() {
    const messages = this.page.getByTestId('message-bubble');
    return await messages.count();
  }
}

test.describe('Chat Interface', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await page.goto('/chat');

    // Wait for the chat interface to load
    await expect(page.getByText('AI Chat')).toBeVisible();
    await expect(chatPage.messageInput).toBeVisible();
  });

  test.describe('Basic Functionality', () => {
    test('should load chat interface successfully', async ({ page }) => {
      // Check that main UI elements are present
      await expect(page.getByText('AI Chat')).toBeVisible();
      await expect(chatPage.messageInput).toBeVisible();
      await expect(chatPage.sendButton).toBeVisible();
      await expect(chatPage.agentSelector).toBeVisible();

      // Check empty state
      await expect(page.getByText('Start a conversation')).toBeVisible();
    });

    test('should send and receive a simple message', async ({ page }) => {
      await chatPage.sendMessage(TEST_MESSAGES.simple);

      // Verify user message appears
      const userMessage = page.getByTestId('message-bubble').filter({ hasText: TEST_MESSAGES.simple });
      await expect(userMessage).toBeVisible();

      // Wait for AI response
      await chatPage.waitForResponse();

      // Verify AI response appears
      const messageCount = await chatPage.getMessageCount();
      expect(messageCount).toBeGreaterThanOrEqual(2);

      // Check that the last message is from the assistant
      const lastMessage = await chatPage.getLastMessage();
      await expect(lastMessage.getByTestId('message-role-assistant')).toBeVisible();
    });

    test('should handle multiline messages', async ({ page }) => {
      await chatPage.sendMessage(TEST_MESSAGES.multiline);

      // Verify multiline content is preserved
      const userMessage = page.getByTestId('message-bubble').filter({ hasText: 'This is a multi-line message' });
      await expect(userMessage).toBeVisible();
      await expect(userMessage.getByText('const hello = "world";')).toBeVisible();
    });

    test('should show typing indicator during response', async ({ page }) => {
      await chatPage.sendMessage(TEST_MESSAGES.simple);

      // Check typing indicator appears
      await expect(chatPage.typingIndicator).toBeVisible({ timeout: 5000 });

      // Check it shows the correct agent name
      await expect(chatPage.typingIndicator.getByText(/is typing/)).toBeVisible();
    });
  });

  test.describe('Agent Selection', () => {
    test('should allow selecting different agents', async ({ page }) => {
      // Select frontend agent
      await chatPage.selectAgent(AGENT_TYPES.frontend);

      // Verify selection
      await expect(chatPage.agentSelector.getByText('Frontend Agent')).toBeVisible();

      // Send message and verify response comes from selected agent
      await chatPage.sendMessage('Help me with React');
      await chatPage.waitForResponse();

      const lastMessage = await chatPage.getLastMessage();
      await expect(lastMessage.getByText(/Frontend Agent|React/i)).toBeVisible();
    });

    test('should switch between agents', async ({ page }) => {
      // Start with API agent
      await chatPage.selectAgent(AGENT_TYPES.api);
      await chatPage.sendMessage('Help me with database design');
      await chatPage.waitForResponse();

      // Switch to frontend agent
      await chatPage.selectAgent(AGENT_TYPES.frontend);
      await chatPage.sendMessage('Now help me with UI components');
      await chatPage.waitForResponse();

      // Verify we have responses from both agents
      const messageCount = await chatPage.getMessageCount();
      expect(messageCount).toBeGreaterThanOrEqual(4);
    });

    test('should show agent capabilities', async ({ page }) => {
      await chatPage.agentSelector.click();

      // Check that agent options show capabilities
      await expect(page.getByText('React, TypeScript, CSS')).toBeVisible();
      await expect(page.getByText('REST APIs, Database, Security')).toBeVisible();
    });
  });

  test.describe('Conversation Management', () => {
    test('should clear conversation', async ({ page }) => {
      // Send a few messages
      await chatPage.sendMessage('Message 1');
      await chatPage.waitForResponse();
      await chatPage.sendMessage('Message 2');
      await chatPage.waitForResponse();

      // Clear conversation
      await chatPage.clearButton.click();
      await page.getByRole('button', { name: 'OK' }).click();

      // Verify conversation is cleared
      await expect(page.getByText('Start a conversation')).toBeVisible();
      const messageCount = await chatPage.getMessageCount();
      expect(messageCount).toBe(0);
    });

    test('should create new conversation', async ({ page }) => {
      // Send a message
      await chatPage.sendMessage('First conversation');
      await chatPage.waitForResponse();

      // Start new conversation
      await chatPage.newChatButton.click();

      // Verify new conversation state
      await expect(page.getByText('Start a conversation')).toBeVisible();
      const messageCount = await chatPage.getMessageCount();
      expect(messageCount).toBe(0);
    });

    test('should export conversation', async ({ page }) => {
      // Send messages to create conversation content
      await chatPage.sendMessage('Test message for export');
      await chatPage.waitForResponse();

      // Set up download handler
      const downloadPromise = page.waitForEvent('download');

      // Export conversation
      await chatPage.exportButton.click();

      // Verify download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/conversation-.*\.txt/);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and simulate network error
      await page.route('**/api/v1/chat', route => {
        route.abort('failed');
      });

      await chatPage.sendMessage('This should fail');

      // Check error message appears
      await expect(page.getByText(/Failed to get response/)).toBeVisible({ timeout: 10000 });

      // Check message is marked as failed
      const userMessage = page.getByTestId('message-bubble').filter({ hasText: 'This should fail' });
      await expect(userMessage.getByTestId('message-status-failed')).toBeVisible();
    });

    test('should handle empty messages', async ({ page }) => {
      // Try to send empty message
      await chatPage.sendButton.click();

      // Verify nothing happens (no new messages)
      const messageCount = await chatPage.getMessageCount();
      expect(messageCount).toBe(0);
    });

    test('should handle very long messages', async ({ page }) => {
      const longMessage = 'A'.repeat(5000);

      await chatPage.sendMessage(longMessage);

      // Verify message is sent and displayed
      const userMessage = page.getByTestId('message-bubble').filter({ hasText: longMessage });
      await expect(userMessage).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Focus on message input with tab
      await page.keyboard.press('Tab');
      await expect(chatPage.messageInput).toBeFocused();

      // Type message
      await page.keyboard.type('Keyboard navigation test');

      // Send with Enter
      await page.keyboard.press('Enter');

      // Verify message was sent
      await expect(page.getByText('Keyboard navigation test')).toBeVisible();
    });

    test('should support multiline input with Shift+Enter', async ({ page }) => {
      await chatPage.messageInput.focus();

      // Type first line
      await page.keyboard.type('Line 1');

      // Add new line with Shift+Enter
      await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('Line 2');

      // Send with Enter
      await page.keyboard.press('Enter');

      // Verify multiline message
      const userMessage = page.getByTestId('message-bubble').filter({ hasText: 'Line 1' });
      await expect(userMessage.getByText('Line 2')).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check important elements have ARIA labels
      await expect(chatPage.messageInput).toHaveAttribute('aria-label', /message|input/i);
      await expect(chatPage.sendButton).toHaveAttribute('aria-label', /send/i);
      await expect(chatPage.agentSelector).toHaveAttribute('aria-label', /agent|select/i);
    });

    test('should announce new messages to screen readers', async ({ page }) => {
      await chatPage.sendMessage('Screen reader test');
      await chatPage.waitForResponse();

      // Check for aria-live regions or similar announcements
      const liveRegion = page.getByRole('status').or(page.getByRole('log'));
      await expect(liveRegion).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should handle rapid message sending', async ({ page }) => {
      const messages = ['Message 1', 'Message 2', 'Message 3'];

      // Send messages rapidly
      for (const message of messages) {
        await chatPage.sendMessage(message);
        // Don't wait for response, send next immediately
      }

      // Wait for all responses
      await page.waitForTimeout(10000);

      // Verify all messages were processed
      for (const message of messages) {
        await expect(page.getByText(message)).toBeVisible();
      }
    });

    test('should maintain performance with many messages', async ({ page }) => {
      // Send multiple messages to build up conversation
      for (let i = 1; i <= 10; i++) {
        await chatPage.sendMessage(`Performance test message ${i}`);
        await chatPage.waitForResponse();
      }

      // Check that interface is still responsive
      const responseTime = await page.evaluate(() => {
        const start = performance.now();
        document.querySelector('[data-testid="message-input"]')?.focus();
        return performance.now() - start;
      });

      expect(responseTime).toBeLessThan(100); // Should focus quickly
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Verify mobile layout
      await expect(chatPage.messageInput).toBeVisible();
      await expect(chatPage.sendButton).toBeVisible();

      // Test mobile interaction
      await chatPage.sendMessage('Mobile test message');
      await chatPage.waitForResponse();

      // Verify message display on mobile
      await expect(page.getByText('Mobile test message')).toBeVisible();
    });

    test('should adapt to different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 },  // Tablet
        { width: 375, height: 667 },   // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);

        // Verify layout adaptation
        await expect(chatPage.messageInput).toBeVisible();
        await expect(chatPage.agentSelector).toBeVisible();

        // Test functionality at this size
        await chatPage.sendMessage(`Test at ${viewport.width}x${viewport.height}`);
        await expect(page.getByText(`Test at ${viewport.width}x${viewport.height}`)).toBeVisible();
      }
    });
  });
});

// Test hooks for cleanup and setup
test.afterEach(async ({ page }) => {
  // Clean up any ongoing requests or websocket connections
  await page.close();
});