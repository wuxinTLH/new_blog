import { test, expect } from '@playwright/test';

test('fingerprinted assets use bounded cache while HTML and snapshots stay network-managed', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  });
  const result = await page.evaluate(async () => {
    const asset = [...document.scripts].find(script => script.type === 'module')!.src;
    await fetch(asset);
    await fetch('./projects.json');
    const cache = await caches.open('sakuramikku-assets-v1');
    return { asset: Boolean(await cache.match(asset)), paths: (await cache.keys()).map(key => new URL(key.url).pathname) };
  });
  expect(result.asset).toBe(true);
  expect(result.paths.every(path => path.includes('/assets/'))).toBe(true);
  expect(result.paths).not.toContain('/projects.json');
  await page.route('**/assets/**', route => route.abort());
  // Browser context offline bypasses HTTP cache and proves the service worker serves the asset.
  await page.context().setOffline(true);
  expect(await page.evaluate(async () => {
    const asset = [...document.scripts].find(script => script.type === 'module')!.src;
    return (await fetch(asset)).ok;
  })).toBe(true);
});
