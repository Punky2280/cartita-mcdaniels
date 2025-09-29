import { test, expect } from '@playwright/test';

test.describe('Aurora Interface', () => {
  test('should display the main interface with Aurora branding', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.getByRole('heading', { name: 'Aurora Interface' })).toBeVisible();
    
    // Verify color scheme elements are present
    const primaryButton = page.getByRole('button', { name: 'Get Started' });
    await expect(primaryButton).toBeVisible();
    
    const secondaryButton = page.getByRole('button', { name: 'Documentation' });
    await expect(secondaryButton).toBeVisible();
    
    const accentButton = page.getByRole('button', { name: 'View Examples' });
    await expect(accentButton).toBeVisible();
  });
  
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: 'Aurora Interface' })).toBeVisible();
  });
});
