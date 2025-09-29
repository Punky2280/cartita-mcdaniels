import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Aurora Interface
 *
 * This configuration is optimized for testing AI chat interfaces,
 * agent interactions, and responsive design.
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Timeout settings for AI responses
  timeout: 30000,
  expect: {
    timeout: 10000
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['line'],
    ['allure-playwright', { outputFolder: 'allure-results' }]
  ],

  // Global test configuration
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Record video on failure
    video: 'retain-on-failure',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Accept downloads
    acceptDownloads: true,

    // Additional context options for AI testing
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },

    // Set longer action timeout for AI responses
    actionTimeout: 15000,

    // Set navigation timeout
    navigationTimeout: 30000,
  },

  // Global setup and teardown
  globalSetup: './tests/global-setup.ts',

  // Projects for different browsers and screen sizes
  projects: [
    {
      name: 'setup-db',
      testMatch: /global\.setup\.ts/,
    },

    // Desktop Chrome
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Emulate chat interface usage
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['setup-db'],
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['setup-db'],
    },

    // Desktop Safari
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['setup-db'],
    },

    // Mobile Chrome
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
      dependencies: ['setup-db'],
    },

    // Mobile Safari
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
      },
      dependencies: ['setup-db'],
    },

    // Tablet
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
      },
      dependencies: ['setup-db'],
    },

    // High-DPI displays
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome HiDPI'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup-db'],
    },

    // Accessibility testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Force reduced motion for accessibility tests
        reducedMotion: 'reduce',
      },
      dependencies: ['setup-db'],
      testMatch: /.*\.accessibility\.spec\.ts/,
    },

    // Performance testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Network throttling for performance tests
        launchOptions: {
          args: ['--enable-features=VaapiVideoDecodeLinuxGL']
        }
      },
      dependencies: ['setup-db'],
      testMatch: /.*\.performance\.spec\.ts/,
    },

    // API testing (headless)
    {
      name: 'api',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3002',
      },
      testMatch: /.*\.api\.spec\.ts/,
    },
  ],

  // Web Server configuration - start dev server before running tests
  webServer: [
    {
      command: 'pnpm run dev',
      port: 5173,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    // Backend server for integration tests
    {
      command: 'cd ../../ && pnpm run dev',
      port: 3002,
      timeout: 60 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    }
  ],

  // Output directories
  outputDir: 'test-results/',

  // Test metadata
  metadata: {
    environment: process.env.NODE_ENV || 'test',
    testSuite: 'Aurora Interface E2E Tests',
    version: process.env.npm_package_version || '1.0.0',
    browser: 'multi-browser',
    platform: process.platform,
  },
});