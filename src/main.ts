import './style.css';
import { initI18n, t } from './i18n';
initI18n();
import { discoverPhotos, initPhotoCarousel } from './carousel';
import { initProjects } from './projects';
void initProjects();

// Cache only fingerprinted assets after load, without delaying the first render.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).catch(() => { /* Optional cache. */ });
  }, { once: true });
}

const photoFiles = import.meta.glob<string>('../photos/*', { eager: true, query: '?url', import: 'default' });
const thumbnails = import.meta.glob<string>('../photos/thumbnails/*.webp', { eager: true, query: '?url', import: 'default' });
initPhotoCarousel(discoverPhotos(photoFiles, thumbnails));

type Theme = 'minimal' | 'light' | 'dark' | 'sakura';
const themes: Theme[] = ['minimal', 'light', 'dark', 'sakura'];
const colors: Record<Theme, string[]> = {
  minimal: ['#808080'], light: ['#65a9d8', '#a0cde8'],
  dark: ['#bca4f2', '#719eda'], sakura: ['#5bcefa', '#f5a9b8', '#ffffff'],
};
const root = document.documentElement;
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-set-theme]');
let currentTheme: Theme = themes.includes(root.dataset.theme as Theme) ? root.dataset.theme as Theme : 'sakura';

function applyTheme(theme: Theme, remember = false) {
  currentTheme = theme;
  root.dataset.theme = theme;
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setTheme === theme)));
  document.querySelector('.theme-current')!.textContent = t(`theme.${theme}`);
  document.querySelector('meta[name="theme-color"]')!.setAttribute('content', theme === 'dark' ? '#151820' : theme === 'minimal' ? '#ffffff' : theme === 'light' ? '#f6f9fc' : '#faf8fb');
  if (remember) {
    try { localStorage.setItem('sakuramikku-theme', theme); } catch { /* Storage can be disabled in private contexts. */ }
  }
  document.dispatchEvent(new CustomEvent('themechange'));
}
buttons.forEach(button => button.addEventListener('click', () => applyTheme(button.dataset.setTheme as Theme, true)));
window.addEventListener('storage', event => {
  if (event.key === 'sakuramikku-theme') applyTheme(themes.includes(event.newValue as Theme) ? event.newValue as Theme : 'sakura');
});
applyTheme(currentTheme);
document.addEventListener('localechange', () => applyTheme(currentTheme));
document.getElementById('year')!.textContent = String(new Date().getFullYear());

// Native pointers stay usable even if animation, canvas, or JavaScript is unavailable.
const cursorShapes: Record<Theme, string> = {
  minimal: '<path d="M4 2v20l5-6 5 9 4-2-5-8h8Z" fill="#fff" stroke="#292929" stroke-width="1.5"/>',
  light: '<path d="M4 2v21l5-6 5 9 4-2-5-8h8Z" fill="#71bbe8" stroke="#244d73" stroke-width="1.3"/>',
  dark: '<path d="M12 2v20M2 12h20" stroke="#c6adff" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#202331" stroke="#c6adff"/>',
  sakura: '<path d="M14 24C11 21 3 15 3 9a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 6-8 12-11 15Z" fill="#f5a9b8" stroke="#458fab" stroke-width="1.2"/><path d="M6 9a3 3 0 0 1 4-2" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
};
const cursorStyle = document.createElement('style');
document.head.append(cursorStyle);
function updateNativeCursor() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">${cursorShapes[currentTheme]}</svg>`;
  const data = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const hotspot = currentTheme === 'dark' || currentTheme === 'sakura' ? '13 13' : '4 2';
  cursorStyle.textContent = `@media (hover:hover) and (pointer:fine){html,body{cursor:${data} ${hotspot},auto}a,button{cursor:${data} ${hotspot},pointer}}`;
}
updateNativeCursor();
document.addEventListener('themechange', updateNativeCursor);

const canvas = document.getElementById('cursor-trail') as HTMLCanvasElement;
const context = canvas.getContext('2d');
const follower = document.getElementById('cursor-follower')!;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
type Particle = { x: number; y: number; age: number; size: number; color: string; rotation: number };
let particles: Particle[] = [];
let pointer = { x: 0, y: 0, active: false };
let follow = { x: 0, y: 0 };
let frame = 0;
let previousTime = 0;
let lastEmission = 0;
const enabled = () => finePointer.matches && !reducedMotion.matches && !document.hidden && Boolean(context);

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  context?.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function clearEffects() {
  cancelAnimationFrame(frame);
  frame = 0;
  previousTime = 0;
  particles = [];
  pointer.active = false;
  follower.style.opacity = '0';
  context?.clearRect(0, 0, innerWidth, innerHeight);
}
function animate(time: number) {
  frame = 0;
  if (!enabled() || !context) { clearEffects(); return; }
  const delta = previousTime ? Math.min((time - previousTime) / 16.67, 3) : 1;
  previousTime = time;
  context.clearRect(0, 0, innerWidth, innerHeight);
  follow.x += (pointer.x - follow.x) * (1 - Math.pow(.78, delta));
  follow.y += (pointer.y - follow.y) * (1 - Math.pow(.78, delta));
  follower.style.transform = `translate3d(${follow.x}px,${follow.y}px,0) translate(-50%,-50%)`;
  for (const p of particles) {
    p.age += delta;
    const life = currentTheme === 'minimal' ? 14 : 32;
    context.globalAlpha = Math.max(0, 1 - p.age / life) * .65;
    context.fillStyle = p.color;
    context.strokeStyle = p.color;
    context.save();
    context.translate(p.x, p.y);
    context.rotate(p.rotation + p.age * .025);
    if (currentTheme === 'sakura') {
      // Tiny petals, alternating the blue/pink/white MTF palette.
      context.beginPath();
      context.ellipse(0, p.age * .35, p.size, p.size * .55, .6, 0, Math.PI * 2);
      context.fill();
    } else if (currentTheme === 'dark') {
      context.beginPath();
      context.moveTo(-p.size, 0); context.lineTo(p.size, 0);
      context.moveTo(0, -p.size); context.lineTo(0, p.size);
      context.lineWidth = 1; context.stroke();
    } else {
      context.beginPath(); context.arc(0, 0, p.size * .5, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }
  context.globalAlpha = 1;
  particles = particles.filter(p => p.age < (currentTheme === 'minimal' ? 14 : 32));
  const settling = Math.abs(pointer.x - follow.x) + Math.abs(pointer.y - follow.y) > .1;
  if ((pointer.active && settling) || particles.length) frame = requestAnimationFrame(animate);
  else previousTime = 0;
}
function startAnimation() { if (!frame && enabled()) frame = requestAnimationFrame(animate); }
window.addEventListener('pointermove', event => {
  if (!enabled() || event.pointerType === 'touch') return;
  if (!pointer.active) { follow = { x: event.clientX, y: event.clientY }; }
  pointer = { x: event.clientX, y: event.clientY, active: true };
  follower.style.opacity = '1';
  follower.classList.toggle('is-hovering', Boolean((event.target as Element).closest('a, button')));
  const now = performance.now();
  if (now - lastEmission > 22) {
    const palette = colors[currentTheme];
    particles.push({ x: pointer.x, y: pointer.y, age: 0, size: currentTheme === 'minimal' ? 2 : 2 + Math.random() * 3, color: palette[Math.floor(Math.random() * palette.length)]!, rotation: Math.random() * Math.PI });
    particles = particles.slice(-36);
    lastEmission = now;
  }
  startAnimation();
}, { passive: true });
document.documentElement.addEventListener('pointerleave', clearEffects);
window.addEventListener('blur', clearEffects);
window.addEventListener('resize', resizeCanvas, { passive: true });
document.addEventListener('visibilitychange', clearEffects);
finePointer.addEventListener('change', clearEffects);
reducedMotion.addEventListener('change', clearEffects);
document.addEventListener('themechange', () => { clearEffects(); follower.dataset.theme = currentTheme; });
follower.dataset.theme = currentTheme;
resizeCanvas();

// Keep the single-page navigation in sync without requiring client-side routing.
const navigation = document.querySelectorAll<HTMLAnchorElement>('.nav-link');
const sections = [...document.querySelectorAll<HTMLElement>('main > section[id]')];
function updateNavigation() {
  let active = 'home';
  for (const section of sections) if (section.getBoundingClientRect().top <= innerHeight * .4) active = section.id;
  navigation.forEach(link => {
    const selected = link.hash === `#${active}`;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  });
}
window.addEventListener('scroll', updateNavigation, { passive: true });
window.addEventListener('resize', updateNavigation, { passive: true });
updateNavigation();
