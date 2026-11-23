import { test, expect } from '@playwright/test';

const endpoint = 'https://api.github.com/users/wuxintlh/repos*';
test('projects render dynamic repositories safely without fork or archive', async ({ page }) => {
  await page.route(endpoint, route => route.fulfill({ json: [
    { name: 'demo', description: '<img src=x onerror=alert(1)>', language: 'TypeScript', stargazers_count: 12 },
    { name: 'fork', fork: true }, { name: 'archive', archived: true },
  ] }));
  await page.goto('/');
  await expect(page.locator('.project-card')).toHaveCount(1);
  await expect(page.locator('.project-card')).toHaveAttribute('href', 'https://github.com/wuxintlh/demo');
  await expect(page.locator('.project-card p')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.project-card img')).toHaveCount(0);
  await expect(page.locator('.project-meta')).toContainText('12');
  await expect(page.locator('.project-grid')).toHaveAttribute('aria-busy', 'false');
});
test('GitHub failure leaves a useful profile link', async ({ page }) => {
  await page.route(endpoint, route => route.fulfill({ status: 403, json: { message: 'rate limit' } }));
  await page.goto('/');
  await expect(page.locator('.project-status')).toContainText('限流');
  await expect(page.locator('.project-more')).toHaveAttribute('href', 'https://github.com/wuxintlh?tab=repositories');
});
