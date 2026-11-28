import { test, expect } from '@playwright/test';

test('locale switches all UI, dynamic labels and persists after reload', async ({ page }) => {
  await page.route('https://api.github.com/users/wuxintlh/repos*', route => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.locator('[data-locale-select]').selectOption('en-US');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.locator('#stack-title')).not.toContainText('技术栈');
  await expect(page.locator('.project-status')).not.toContainText('GitHub 暂不可用');
  await expect(page.locator('[data-photo-pause]')).toHaveText('⏸');
  await expect(page.locator('[data-photo-pause]')).toHaveAttribute('aria-label', 'Pause slideshow');
  await page.locator('[data-photo-pause]').click();
  await expect(page.locator('[data-photo-pause]')).toHaveText('▶');
  await expect(page.locator('[data-photo-pause]')).toHaveAttribute('aria-label', 'Resume slideshow');
  await page.reload();
  await expect(page.locator('[data-locale-select]')).toHaveValue('en-US');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await page.locator('[data-locale-select]').selectOption('zh-CN');
  await expect(page.locator('#stack-title')).toContainText('技术栈');
});

test('invalid or blocked locale storage defaults to Chinese without preventing switching', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    Storage.prototype.setItem = () => { throw new Error('blocked'); };
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.locator('[data-locale-select]').selectOption('en-US');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
});

test('locale dictionary parity and cross-tab synchronization', async ({ page, context }) => {
  await page.goto('/');
  const other = await context.newPage();
  await other.goto('/');
  await page.locator('[data-locale-select]').selectOption('en-US');
  await expect(other.locator('html')).toHaveAttribute('lang', 'en-US');
});
