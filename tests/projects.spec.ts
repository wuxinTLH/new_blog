import { test, expect } from '@playwright/test';

const endpoint = 'https://api.github.com/users/wuxintlh/repos*';

test('both sources failing still leaves profile link', async ({ page }) => {
  await page.route('**/projects.json', route => route.fulfill({ status: 500, body: 'unavailable' }));
  await page.route(endpoint, route => route.abort());
  await page.goto('/');
  await expect(page.locator('.project-status')).toContainText('暂时无法获取');
  await expect(page.locator('.project-grid')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.project-more')).toHaveAttribute('href', 'https://github.com/wuxintlh?tab=repositories');
});

test('live API works without snapshot and accepts ordinary repository names', async ({ page }) => {
  await page.route('**/projects.json', route => route.fulfill({ status: 404 }));
  await page.route(endpoint, route => route.fulfill({ json: [
    { name: 'l2d_agent' }, { name: 'new_blog' }, { name: 'novel-agent' }, { name: 'CocosAgent' }, { name: '../bad' },
  ] }));
  await page.goto('/');
  await expect(page.locator('.project-status')).toContainText('最近更新时间');
  await expect(page.locator('.project-card h3')).toHaveText(['l2d_agent ↗', 'new_blog ↗', 'novel-agent ↗', 'CocosAgent ↗']);
});

test('blocked or malformed live API preserves snapshot', async ({ page }) => {
  await page.route(endpoint, route => route.fulfill({ json: { message: 'invalid response' } }));
  await page.goto('/');
  await expect(page.locator('.project-status')).toContainText('暂不可用');
  await expect(page.locator('.project-card')).toHaveCount(4);
});
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
test('GitHub failure retains same-origin project snapshot', async ({ page }) => {
  await page.route(endpoint, route => route.fulfill({ status: 403, json: { message: 'rate limit' } }));
  await page.goto('/');
  await expect(page.locator('.project-status')).toContainText('项目快照');
  await expect(page.locator('.project-status')).toContainText('暂不可用');
  await expect(page.locator('.project-card')).toHaveCount(4);
  await expect(page.locator('.project-card').first()).toHaveAttribute('href', /^https:\/\/github\.com\/wuxintlh\//);
  await expect(page.locator('.project-more')).toHaveAttribute('href', 'https://github.com/wuxintlh?tab=repositories');
});
