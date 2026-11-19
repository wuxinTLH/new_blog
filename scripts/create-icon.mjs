import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const avatar = await readFile(new URL('../public/avatar.jpg', import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const data = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, 0, 0, 128, 128);
    return canvas.toDataURL('image/png').split(',')[1];
  }, avatar.toString('base64'));
  await writeFile(new URL('../public/avatar-circle.png', import.meta.url), Buffer.from(data, 'base64'));
} finally { await browser.close(); }
