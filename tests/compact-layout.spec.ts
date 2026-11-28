import { test, expect } from '@playwright/test';

test('photo indicators stay on one row and follow current image', async ({ page }) => {
  await page.goto('/');
  await page.locator('.photo-gallery').scrollIntoViewIfNeeded();
  const dots = page.locator('.photo-dots');
  await expect(dots.locator('button')).toHaveCount(16);
  expect(await dots.locator('button').evaluateAll(elements => new Set(elements.map(el => Math.round(el.getBoundingClientRect().top))).size)).toBe(1);
  await page.locator('[data-photo-prev]').click();
  await expect(dots.locator('button').last()).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => dots.evaluate(el => {
    const active = el.querySelector('[aria-pressed=true]')!.getBoundingClientRect();
    const bounds = el.getBoundingClientRect();
    return active.left >= bounds.left && active.right <= bounds.right;
  })).toBe(true);
  await expect(page.locator('.footer-bottom')).toContainText('Built with love');
});

test('mobile sections use compact horizontal rails without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://api.github.com/users/wuxintlh/repos*', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.project-card')).toHaveCount(4);
  for (const selector of ['.skill-grid', '.project-grid']) {
    const rail = page.locator(selector);
    expect(await rail.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
    expect((await rail.boundingBox())!.height).toBeLessThan(330);
    await rail.evaluate(el => el.scrollLeft = el.scrollWidth);
    expect(await rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
