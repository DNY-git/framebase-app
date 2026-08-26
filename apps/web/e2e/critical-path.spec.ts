import { test, expect } from '@playwright/test';

test.describe('Critical Path', () => {
  test('loads the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/FrameBase/);
  });

  test('can navigate to register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /register/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/register/);
    }
  });

  test('health check returns 200', async ({ request }) => {
    const response = await request.get(
      `${process.env.API_URL || 'http://localhost:4000'}/api/v1/health`,
    );
    expect(response.status()).toBe(200);
  });
});
