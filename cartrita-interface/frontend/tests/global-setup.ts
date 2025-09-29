import { chromium, FullConfig } from '@playwright/test';
import { testData } from './fixtures/test-data';

/**
 * Global setup for Playwright tests
 *
 * This runs once before all tests and sets up:
 * - Authentication states
 * - Test database
 * - Mock API endpoints
 * - Performance monitoring
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Aurora Interface E2E Test Setup...');

  // Get base URL from config
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';

  // Create browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be available
    await page.goto(baseURL);
    await page.waitForSelector('[data-testid="chat-interface"], text=Dashboard', { timeout: 30000 });

    console.log('✅ Application is running and accessible');

    // Setup authentication state if needed
    await setupAuthenticationState(page, baseURL);

    // Setup test data
    await setupTestData(page);

    // Setup mock API responses for consistent testing
    await setupMockAPIs(page);

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Setup authentication state for tests
 */
async function setupAuthenticationState(page: any, baseURL: string) {
  // For now, we'll assume no authentication is required
  // This can be extended when auth is implemented
  console.log('📝 Authentication state setup (placeholder)');

  // Save authentication state for reuse
  await page.context().storageState({ path: 'tests/auth-state.json' });
}

/**
 * Setup test data in local storage or mock database
 */
async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');

  // Add test data to local storage for consistent state
  await page.evaluate((data) => {
    // Store test conversations
    localStorage.setItem('test-conversations', JSON.stringify(data.conversations));

    // Store test agents
    localStorage.setItem('test-agents', JSON.stringify(data.agents));

    // Store test settings
    localStorage.setItem('test-settings', JSON.stringify(data.settings));
  }, testData);

  console.log('✅ Test data setup complete');
}

/**
 * Setup mock API endpoints for consistent testing
 */
async function setupMockAPIs(page: any) {
  console.log('🔧 Setting up mock API endpoints...');

  // Intercept and mock API calls
  await page.route('**/api/agents/**', async (route: any) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(testData.agents)
      });
    } else {
      await route.continue();
    }
  });

  // Mock chat API responses
  await page.route('**/api/chat/**', async (route: any) => {
    const requestBody = route.request().postDataJSON();

    // Simulate agent response with delay
    setTimeout(async () => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `response-${Date.now()}`,
          message: `Mock response to: ${requestBody?.message || 'unknown message'}`,
          agent: requestBody?.agent || 'auto-selected',
          timestamp: new Date().toISOString(),
          metadata: {
            executionTime: Math.floor(Math.random() * 2000) + 500,
            tokensUsed: Math.floor(Math.random() * 150) + 50,
            model: 'gpt-4o'
          }
        })
      });
    }, 1000 + Math.random() * 2000); // Simulate realistic response time
  });

  console.log('✅ Mock API endpoints setup complete');
}

export default globalSetup;