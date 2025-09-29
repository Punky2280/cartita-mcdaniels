import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load test environment variables
config({ path: '.env.test' });

// Mock environment variables for testing
const TEST_ENV = {
  NODE_ENV: 'test',
  PORT: '3001',
  LOG_LEVEL: 'silent',
  POSTGRES_URL: 'postgresql://test:test@localhost:5432/test_db',
  OPENAI_API_KEY: 'test-openai-key',
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes-only',
  BCRYPT_ROUNDS: '4', // Lower for faster tests
  RATE_LIMIT_MAX: '1000',
  RATE_LIMIT_WINDOW: '60000',
  CORS_ORIGIN: 'http://localhost:3000'
};

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  Object.assign(process.env, TEST_ENV);

  // Silence console logs during testing unless explicitly enabled
  if (process.env.TEST_VERBOSE !== 'true') {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  }

  // Set up global test utilities
  global.testUtils = {
    generateMockId: () => Math.random().toString(36).substring(2, 15),
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    mockTimestamp: () => new Date('2024-01-01T00:00:00.000Z'),
    loadTestFixture: (filename: string) => {
      try {
        const fixturePath = resolve(__dirname, '../fixtures', filename);
        return JSON.parse(readFileSync(fixturePath, 'utf-8'));
      } catch (error) {
        throw new Error(`Failed to load test fixture: ${filename}`);
      }
    }
  };
});

// Global test cleanup
afterAll(async () => {
  // Restore console methods
  vi.restoreAllMocks();

  // Clean up any global resources
  // Database connections, file handles, etc.
});

// Per-test setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Reset time if using fake timers
  vi.useRealTimers();
});

// Per-test cleanup
afterEach(() => {
  // Clean up any test-specific resources
  vi.clearAllTimers();
  vi.restoreAllMocks();
});

// Global type extensions
declare global {
  var testUtils: {
    generateMockId: () => string;
    sleep: (ms: number) => Promise<void>;
    mockTimestamp: () => Date;
    loadTestFixture: (filename: string) => any;
  };
}

// Mock external services by default
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock OpenAI response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 }
        })
      }
    }
  }))
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mock Anthropic response' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      })
    }
  }))
}));

// Mock database by default
vi.mock('postgres', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({}),
    end: vi.fn().mockResolvedValue({}),
    query: vi.fn().mockResolvedValue([])
  }))
}));

// Export common test utilities
export { TEST_ENV };
export const createMockAgent = (name: string, shouldFail = false) => ({
  name,
  execute: vi.fn().mockImplementation(async (input: any) => {
    if (shouldFail) {
      return {
        kind: 'error',
        code: 'mock_error',
        message: 'Mock error for testing'
      };
    }
    return {
      kind: 'ok',
      data: { processed: true, input }
    };
  })
});

export const createMockFastifyServer = () => ({
  register: vi.fn(),
  listen: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  inject: vi.fn().mockResolvedValue({
    statusCode: 200,
    body: JSON.stringify({ status: 'ok' })
  }),
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
});

export const createMockDatabase = () => ({
  query: vi.fn().mockResolvedValue([]),
  transaction: vi.fn().mockImplementation((fn) => fn({
    query: vi.fn().mockResolvedValue([])
  })),
  end: vi.fn().mockResolvedValue(undefined)
});