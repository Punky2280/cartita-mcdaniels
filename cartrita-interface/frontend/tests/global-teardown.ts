import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global teardown for Playwright tests
 *
 * This runs once after all tests and cleans up:
 * - Test artifacts
 * - Temporary files
 * - Performance reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Aurora Interface E2E Test Cleanup...');

  try {
    // Clean up temporary auth files
    await cleanupAuthFiles();

    // Generate performance summary
    await generatePerformanceSummary();

    // Archive test artifacts if needed
    await archiveTestArtifacts();

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  }
}

/**
 * Clean up authentication state files
 */
async function cleanupAuthFiles() {
  const authFile = 'tests/auth-state.json';

  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
    console.log('🗑️  Cleaned up authentication state file');
  }
}

/**
 * Generate performance summary from test results
 */
async function generatePerformanceSummary() {
  console.log('📊 Generating performance summary...');

  const testResultsPath = 'test-results/results.json';

  if (!fs.existsSync(testResultsPath)) {
    console.log('⚠️  No test results found for performance summary');
    return;
  }

  try {
    const results = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));

    const summary = {
      totalTests: results.stats?.total || 0,
      passed: results.stats?.passed || 0,
      failed: results.stats?.failed || 0,
      skipped: results.stats?.skipped || 0,
      duration: results.stats?.duration || 0,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      performance: {
        avgTestDuration: results.stats?.duration ? (results.stats.duration / results.stats.total) : 0,
        slowestTests: results.suites?.flatMap((suite: any) =>
          suite.specs?.map((spec: any) => ({
            title: spec.title,
            duration: spec.tests?.[0]?.results?.[0]?.duration || 0
          }))
        ).sort((a: any, b: any) => b.duration - a.duration).slice(0, 5) || []
      }
    };

    const summaryPath = 'test-results/performance-summary.json';
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('✅ Performance summary generated:', summaryPath);
    console.log(`📈 Test Stats: ${summary.passed}/${summary.totalTests} passed (${summary.duration}ms total)`);

  } catch (error) {
    console.error('❌ Failed to generate performance summary:', error);
  }
}

/**
 * Archive test artifacts for CI/CD
 */
async function archiveTestArtifacts() {
  if (!process.env.CI) {
    return; // Only archive on CI
  }

  console.log('📦 Archiving test artifacts...');

  const artifactsDir = 'test-artifacts';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Copy important files to artifacts directory
  const filesToArchive = [
    'test-results/results.json',
    'test-results/performance-summary.json',
    'playwright-report',
    'test-results'
  ];

  for (const file of filesToArchive) {
    if (fs.existsSync(file)) {
      const targetPath = path.join(artifactsDir, `${timestamp}-${path.basename(file)}`);

      if (fs.statSync(file).isDirectory()) {
        // For directories, we would need to recursively copy (simplified here)
        console.log(`📁 Would archive directory: ${file} -> ${targetPath}`);
      } else {
        fs.copyFileSync(file, targetPath);
        console.log(`📄 Archived file: ${file} -> ${targetPath}`);
      }
    }
  }
}

export default globalTeardown;