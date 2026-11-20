import { test, expect } from '@playwright/test';
import { discoverPhotos, initPhotoCarousel } from '../src/carousel';

test('photo preview is transparent, animated and does not lock page scrolling', async ({ page }) => {
  await page.goto('/');
  const image = page.locator('.photo-image');
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await image.click();
  const preview = page.getByRole('dialog', { name: '照片放大预览' });
  await expect(preview).toHaveClass(/is-open/);
  await expect(preview).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const largeImage = preview.locator('img');
  const first = await largeImage.getAttribute('src');
  await preview.getByRole('button', { name: '上一张照片', exact: true }).click();
  await expect(largeImage).not.toHaveAttribute('src', first!);
  const last = await largeImage.getAttribute('src');
  await preview.getByRole('button', { name: '下一张照片', exact: true }).click();
  await expect(largeImage).toHaveAttribute('src', first!);
  await page.keyboard.press('ArrowLeft');
  await expect(largeImage).toHaveAttribute('src', last!);
  await page.keyboard.press('ArrowRight');
  await expect(largeImage).toHaveAttribute('src', first!);
  await expect.poll(async () => {
    const img = await largeImage.boundingBox();
    const prev = await preview.locator('.photo-preview-prev').boundingBox();
    const next = await preview.locator('.photo-preview-next').boundingBox();
    return !!img && !!prev && !!next && Math.abs(img.x - (prev.x + prev.width)) < 18 && Math.abs(next.x - (img.x + img.width)) < 18;
  }).toBe(true);
  const bounds = (await largeImage.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .7 - 80, bounds.y + bounds.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(largeImage).not.toHaveAttribute('src', first!);
  await largeImage.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, clientX: 100, clientY: 200 });
  await largeImage.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, clientX: 180, clientY: 202 });
  await expect(largeImage).toHaveAttribute('src', first!);
  await expect(page.locator('footer .connect-section .footer-top .brand')).toBeAttached();
  await expect(page.locator('footer .connect-section .footer-links a')).toHaveCount(5);
  await expect(page.getByRole('link', { name: '在 GitHub 找到我' })).toHaveCount(0);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(15, 300);
  await page.mouse.wheel(0, 350);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  await preview.click({ position: { x: 10, y: 100 } });
  await expect(preview).toBeHidden();
});

test('carousel loads lightweight thumbnails and opens original only on demand', async ({ page }) => {
  const originals: string[] = [];
  page.on('request', request => {
    if (/nz_\d+.*\.jpg(?:\?|$)/i.test(request.url())) originals.push(request.url());
  });
  await page.goto('/');
  const image = page.locator('.photo-image');
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute('src', /\.webp/);
  await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.locator('[data-photo-next]').click();
  await expect(image).toHaveAttribute('alt', /nz_2$/);
  await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(originals).toEqual([]);
  await image.click();
  await expect(page.getByRole('dialog').locator('img')).toHaveAttribute('src', /nz_2.*\.jpg/);
  await expect.poll(() => originals.length).toBeGreaterThan(0);
});

test('photo discovery sorts numeric names and ignores unrelated files', () => {
  expect(discoverPhotos({ '/photos/nz_10.JPG': 'ten', '/photos/nz_2.webp': 'two', '/photos/readme.md': 'no', '/photos/nz_0.png': 'zero' })).toEqual([{ url: 'two', number: 2 }, { url: 'ten', number: 10 }]);
});

test('photo carousel empty state and manual controls', async ({ page }) => {
  await page.goto('/');
  // Isolate fixture data so this test also passes after real photos are added.
  await page.evaluate(() => {
    const original = document.querySelector('.photo-gallery')!;
    const clone = original.cloneNode(true) as HTMLElement;
    clone.querySelector('.photo-dots')!.replaceChildren();
    clone.querySelector<HTMLElement>('.photo-empty')!.hidden = false;
    clone.querySelector<HTMLElement>('.photo-stage')!.hidden = true;
    clone.querySelector<HTMLElement>('.photo-controls')!.hidden = true;
    original.replaceWith(clone);
  });
  await page.evaluate(initPhotoCarousel, []);
  await expect(page.locator('.photo-empty')).toBeVisible();
  await expect(page.locator('.photo-controls')).toBeHidden();
  const url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  await page.evaluate(initPhotoCarousel, [{ url, number: 2 }, { url, number: 10 }]);
  await expect(page.locator('.photo-empty')).toBeHidden();
  await expect(page.locator('.photo-status')).toHaveText('1 / 2 · NZ_2');
  await page.getByRole('button', { name: '下一张照片' }).click();
  await expect(page.locator('.photo-status')).toHaveText('2 / 2 · NZ_10');
  await page.getByRole('button', { name: '下一张照片' }).click();
  await expect(page.locator('.photo-status')).toHaveText('1 / 2 · NZ_2');
  await page.locator('.photo-gallery').press('ArrowLeft');
  await expect(page.locator('.photo-image')).toHaveAttribute('alt', '女装穿搭照片 nz_10');
  await page.getByRole('button', { name: '暂停播放', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续播放' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '查看照片 nz_2', exact: true }).click();
  await expect(page.locator('.photo-status')).toHaveText('1 / 2 · NZ_2');
  expect(await page.locator('.photos-section').evaluate(section => Boolean(section.compareDocumentPosition(document.querySelector('.about-section')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  expect((await page.locator('.photo-stage').boundingBox())!.height).toBeLessThanOrEqual(210);
});

test('homepage, links, navigation and responsive layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('SakuraMikku · 代码与浪漫');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.brand-avatar')).toHaveCount(2);
  for (const avatar of await page.locator('.brand-avatar').all()) {
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute('src', './avatar-circle.png');
    expect(await avatar.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.getByRole('img', { name: '跨性别旗帜：蓝、粉、白、粉、蓝五条色带' })).toBeVisible();
  await expect(page.locator('.identity-note')).toContainText('Male to Female');
  await expect(page.locator('.identity-message')).toHaveText('自在生长，成为自己。');
  await expect(page.locator('.hero-intro')).toContainText('女装穿搭与 Cosplay');
  await expect(page.getByRole('heading', { name: '穿搭 & 日常' })).toBeVisible();
  await expect(page.locator('.info-card')).toHaveCount(3);
  await expect(page.locator('.skill-card')).toHaveCount(8);
  await expect(page.locator('.skill-card h3')).toHaveText(['前端开发', '后端开发', '游戏开发', '数据库', '消息队列', '云运维', '机器人开发', 'Agent 开发']);
  const expectedSkills = [
    ['Vue3 Composition API + script setup', 'TypeScript', 'HTML', 'JavaScript'],
    ['Java SpringBoot 框架', 'Python', 'Node.js Express 框架', 'C/C++', 'C# Unity3D 游戏开发'],
    ['Unity3D C#', 'UE5 虚幻引擎'],
    ['MySQL', 'PostgreSQL', 'Redis'],
    ['Kafka', 'RocketMQ'],
    ['Docker', 'Prometheus', 'Python 脚本', 'Shell 脚本'],
    ['AstrBot 聊天机器人框架', 'OneBot 聊天机器人协议'],
    ['LLM API 大模型接入', 'Prompt Engineering 提示词工程', 'Tool Calling 工具调用', 'MCP 模型上下文协议', 'RAG 检索增强生成', 'Multi-Agent 多智能体协作'],
  ];
  for (const [index, skills] of expectedSkills.entries()) {
    await expect(page.locator('.skill-card').nth(index).locator('li')).toHaveText(skills);
  }
  for (const link of await page.locator('a[href^="https://"]').all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(page.locator('footer a[href="https://github.com/wuxintlh"]')).toBeVisible();
  await expect(page.locator('footer a[href="https://space.bilibili.com/29058270"]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: '社交导航' }).locator('a')).toHaveCount(5);
  await expect(page.locator('.footer-links a svg')).toHaveCount(5);
  await expect(page.locator('.footer-links a > span:first-of-type')).toHaveText(['GitHub', '哔哩哔哩', 'X', '加入 QQ 粉丝群', '加入电报群']);
  await expect(page.locator('footer a[href="https://x.com/SakuraMikku"]')).toBeVisible();
  const qqGroup = page.locator('footer').getByRole('link', { name: '加入 QQ 粉丝群' });
  await expect(qqGroup).toBeVisible();
  await expect(qqGroup).toHaveAttribute('href', 'https://qm.qq.com/q/qWt61dd9cG');
  await expect(page.locator('.footer-links a').last()).toHaveAttribute('href', 'https://t.me/+4-YmXdo5WC9mZTY8');
  await expect(page.locator('footer')).toContainText('SakuraMikku. All rights reserved.');
  await page.getByRole('link', { name: '关于', exact: true }).click();
  await expect(page).toHaveURL(/#about$/);
  await expect(page.locator('#about')).toHaveClass(/photos-section/);
  await expect(page.locator('#photos-title')).toBeInViewport();
  await page.getByRole('link', { name: '技术栈', exact: true }).click();
  await expect(page).toHaveURL(/#stack$/);
  await expect(page.locator('#stack-title')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('all four themes persist and have distinct cursor styles', async ({ page }, testInfo) => {
  await page.goto('/');
  const pointers = new Set<string>();
  for (const [id, name] of [['minimal', '极简'], ['light', '浅色'], ['dark', '深色'], ['sakura', '蓝粉']]) {
    await page.getByRole('button', { name: `${name}主题`, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', id!);
    await expect(page.getByRole('button', { name: `${name}主题`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('sakuramikku-theme'))).toBe(id);
    pointers.add(await page.evaluate(() => [...document.querySelectorAll('style')].map(s => s.textContent).join('')));
    await page.mouse.move(0, 0);
    await page.screenshot({ path: testInfo.outputPath(`${id}.png`), fullPage: true, animations: 'disabled' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', id!);
    await expect(page.locator('.theme-current')).toHaveText(name!);
  }
  expect(pointers.size).toBe(4);
});

test('invalid or blocked storage safely falls back', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sakuramikku-theme', 'invalid'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sakura');
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new Error('Blocked'); } });
    Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new Error('Blocked'); } });
  });
  await page.reload();
  await page.getByRole('button', { name: '深色主题', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('motion preferences and pointer capabilities are respected', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.mouse.move(200, 200);
  const isMobile = testInfo.project.name === 'mobile';
  if (!isMobile) {
    await expect(page.locator('#cursor-follower')).toHaveCSS('opacity', '1');
    await expect(page.locator('#cursor-follower')).toHaveAttribute('data-theme', 'sakura');
    await page.getByRole('button', { name: '深色主题', exact: true }).click();
    await expect(page.locator('#cursor-follower')).toHaveAttribute('data-theme', 'dark');
  } else {
    await expect(page.locator('#cursor-trail')).toBeHidden();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(220, 220);
  await expect(page.locator('#cursor-trail')).toBeHidden();
  await expect(page.locator('#cursor-follower')).toBeHidden();
});
