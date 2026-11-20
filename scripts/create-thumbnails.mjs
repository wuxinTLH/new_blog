import sharp from 'sharp';
import { readdir, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = new URL('../photos/', import.meta.url);
const output = new URL('../photos/thumbnails/', import.meta.url);
await mkdir(output, { recursive: true });
const files = (await readdir(source)).filter(name => /^nz_[1-9]\d*\.(?:jpe?g|png|webp|avif|gif)$/i.test(name));
const expected = new Set(files.map(name => name.replace(/\.[^.]+$/, '.webp')));
for (const name of await readdir(output)) {
  if (/^nz_[1-9]\d*\.webp$/.test(name) && !expected.has(name)) await rm(new URL(name, output));
}
let bytes = 0;
for (const name of files) {
  const result = await sharp(fileURLToPath(new URL(name, source))).rotate()
    .resize({ width: 440, height: 420, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72 }).toFile(fileURLToPath(new URL(name.replace(/\.[^.]+$/, '.webp'), output)));
  bytes += result.size;
}
console.log(`Generated ${files.length} WebP thumbnails (${(bytes / 1024).toFixed(1)} KiB total).`);
