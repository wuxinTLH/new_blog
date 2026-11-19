import { test, expect } from '@playwright/test';

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
  await expect(page.locator('footer')).toContainText('SakuraMikku. All rights reserved.');
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
