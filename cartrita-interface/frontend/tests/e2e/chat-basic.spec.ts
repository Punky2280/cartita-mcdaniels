import { test, expect } from '@playwright/test';
import { ChatTestHelpers, takeDebugScreenshot } from '../utils/test-helpers';
import { testData } from '../fixtures/test-data';

/**
 * Basic Chat Functionality Tests
 *
 * Tests core chat features including:
 * - Sending and receiving messages
 * - Message display and formatting
 * - Input validation
 * - Chat state management
 */

test.describe('Chat Basic Functionality', () => {
  let chatHelper: ChatTestHelpers;

  test.beforeEach(async ({ page }) => {
    chatHelper = new ChatTestHelpers(page);
    await chatHelper.navigateToChat();
  });

  test('should display chat interface correctly', async ({ page }) => {
    // Check main interface elements are present
    await expect(page.getByTestId('chat-interface')).toBeVisible();
    await expect(page.getByTestId('message-input')).toBeVisible();
    await expect(page.getByTestId('send-message-btn')).toBeVisible();
    await expect(page.getByTestId('agent-selector')).toBeVisible();

    // Check initial state
    await expect(page.getByTestId('send-message-btn')).toBeDisabled();
    await expect(page.getByTestId('message-input')).toHaveAttribute('placeholder', /ask.*ai.*agents/i);
  });

  test('should send and receive a simple message', async ({ page }) => {
    const testMessage = testData.messages.simple;

    await chatHelper.sendMessage(testMessage);

    // Verify user message appears
    await chatHelper.assertMessageExists(testMessage, 'user');

    // Verify agent response appears
    await chatHelper.waitForAgentResponse();
    const lastMessage = await chatHelper.getLastMessage();
    await expect(lastMessage).toHaveAttribute('data-message-type', 'agent');

    // Verify response contains some acknowledgment of the user message
    await expect(lastMessage.getByTestId('message-content')).toContainText(/thank you|understand|help/i);
  });

  test('should handle complex messages with proper formatting', async ({ page }) => {
    const complexMessage = testData.messages.complex;

    await chatHelper.sendMessage(complexMessage);

    // Verify message is displayed correctly
    await chatHelper.assertMessageExists(complexMessage, 'user');

    // Verify agent responds appropriately to complex requests
    await chatHelper.waitForAgentResponse();
    await chatHelper.assertAgentResponseContains('React');
    await chatHelper.assertAgentResponseContains('TypeScript');
  });

  test('should handle multiline messages correctly', async ({ page }) => {
    const multilineMessage = testData.messages.multiline;

    await chatHelper.sendMessage(multilineMessage);

    // Verify multiline formatting is preserved
    const userMessage = page.locator('[data-testid*="message-"][data-message-type="user"]').last();
    const messageContent = await userMessage.getByTestId('message-content').textContent();

    expect(messageContent).toContain('multiline message');
    expect(messageContent).toContain('multiple lines');
    expect(messageContent).toContain('display capabilities');
  });

  test('should disable send button when input is empty', async ({ page }) => {
    const sendButton = page.getByTestId('send-message-btn');
    const messageInput = page.getByTestId('message-input');

    // Initially disabled
    await expect(sendButton).toBeDisabled();

    // Type message - should enable
    await messageInput.fill('test message');
    await expect(sendButton).toBeEnabled();

    // Clear message - should disable again
    await messageInput.fill('');
    await expect(sendButton).toBeDisabled();

    // Whitespace only - should remain disabled
    await messageInput.fill('   ');
    await expect(sendButton).toBeDisabled();
  });

  test('should prevent sending when loading', async ({ page }) => {
    const sendButton = page.getByTestId('send-message-btn');
    const messageInput = page.getByTestId('message-input');

    await messageInput.fill('test message');
    await sendButton.click();

    // Button should show loading state and be disabled
    await expect(sendButton).toBeDisabled();
    await expect(sendButton).toContainText(/sending/i);

    // Input should be disabled during sending
    await expect(messageInput).toBeDisabled();
  });

  test('should handle Enter key to send message', async ({ page }) => {
    const messageInput = page.getByTestId('message-input');
    const testMessage = 'Message sent with Enter key';

    await messageInput.fill(testMessage);
    await messageInput.press('Enter');

    // Verify message was sent
    await chatHelper.assertMessageExists(testMessage, 'user');
    await chatHelper.waitForAgentResponse();
  });

  test('should handle Shift+Enter for new lines', async ({ page }) => {
    const messageInput = page.getByTestId('message-input');

    await messageInput.fill('First line');
    await messageInput.press('Shift+Enter');
    await messageInput.type('Second line');

    const inputValue = await messageInput.inputValue();
    expect(inputValue).toContain('First line\nSecond line');

    // Should not send message with Shift+Enter
    const messagesBefore = await chatHelper.getAllMessages();
    await messageInput.press('Shift+Enter');
    const messagesAfter = await chatHelper.getAllMessages();

    expect(messagesAfter.length).toBe(messagesBefore.length);
  });

  test('should display message timestamps', async ({ page }) => {
    await chatHelper.sendMessage('Test timestamp message');

    const userMessage = page.locator('[data-testid*="message-"][data-message-type="user"]').last();

    // Check timestamp format (should contain time)
    await expect(userMessage).toContainText(/\d{1,2}:\d{2}/); // HH:MM format
  });

  test('should display agent information in responses', async ({ page }) => {
    await chatHelper.sendMessage('Test agent information');

    await chatHelper.waitForAgentResponse();
    const agentMessage = page.locator('[data-testid*="message-"][data-message-type="agent"]').last();

    // Should show agent name
    await expect(agentMessage).toContainText(/agent/i);

    // Should show agent badge/identifier
    await expect(agentMessage.locator('[data-testid*="badge"], .badge')).toBeVisible();
  });

  test('should auto-scroll to latest message', async ({ page }) => {
    // Send multiple messages to create scroll
    for (let i = 1; i <= 10; i++) {
      await chatHelper.sendMessage(`Message ${i}`);
      await page.waitForTimeout(500); // Brief pause between messages
    }

    // Wait for last response
    await chatHelper.waitForAgentResponse();

    // Check that the last message is visible
    const lastMessage = await chatHelper.getLastMessage();
    await expect(lastMessage).toBeInViewport();
  });

  test('should maintain conversation state', async ({ page }) => {
    const messages = ['First message', 'Second message', 'Third message'];

    // Send multiple messages
    for (const message of messages) {
      await chatHelper.sendMessage(message);
      await page.waitForTimeout(1000);
    }

    // Verify all user messages are present
    for (const message of messages) {
      await chatHelper.assertMessageExists(message, 'user');
    }

    // Should have user messages + agent responses
    const allMessages = await chatHelper.getAllMessages();
    expect(allMessages.length).toBeGreaterThanOrEqual(messages.length * 2);
  });

  test('should handle special characters correctly', async ({ page }) => {
    const specialMessage = testData.messages.specialCharacters;

    await chatHelper.sendMessage(specialMessage);

    // Verify special characters are displayed correctly
    await chatHelper.assertMessageExists(specialMessage, 'user');

    const userMessage = page.locator('[data-testid*="message-"][data-message-type="user"]').last();
    const content = await userMessage.getByTestId('message-content').textContent();

    expect(content).toBe(specialMessage);
  });

  test('should show message status indicators', async ({ page }) => {
    await chatHelper.sendMessage('Test message status');

    // Check for sending status
    const userMessage = page.locator('[data-testid*="message-"][data-message-type="user"]').last();

    // Should eventually show sent status (check circle or similar indicator)
    await expect(userMessage.locator('[data-testid*="status"], .status-indicator')).toBeVisible();
  });

  test('should handle long messages gracefully', async ({ page }) => {
    const longMessage = testData.messages.longText;

    await chatHelper.sendMessage(longMessage);

    // Verify long message is handled without breaking layout
    await chatHelper.assertMessageExists(longMessage.substring(0, 50), 'user');

    const userMessage = page.locator('[data-testid*="message-"][data-message-type="user"]').last();

    // Message should be contained within reasonable bounds
    const boundingBox = await userMessage.boundingBox();
    expect(boundingBox?.width).toBeLessThan(800); // Reasonable max width
  });

  test('should clear input after sending message', async ({ page }) => {
    const messageInput = page.getByTestId('message-input');
    const testMessage = 'Message to clear';

    await messageInput.fill(testMessage);
    await page.getByTestId('send-message-btn').click();

    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await takeDebugScreenshot(page, `chat-basic-${testInfo.title.replace(/\s+/g, '-')}`);
    }
  });
});