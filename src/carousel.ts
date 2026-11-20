type Photo = { url: string; number: number; thumbnail?: string };

export function initPhotoCarousel(photos: Photo[]) {
  const gallery = document.querySelector<HTMLElement>('.photo-gallery')!;
  const stage = gallery.querySelector<HTMLElement>('.photo-stage')!;
  const image = gallery.querySelector<HTMLImageElement>('.photo-image')!;
  const status = gallery.querySelector<HTMLElement>('.photo-status')!;
  const controls = gallery.querySelector<HTMLElement>('.photo-controls')!;
  const pause = gallery.querySelector<HTMLButtonElement>('[data-photo-pause]')!;
  const dots = gallery.querySelector<HTMLElement>('.photo-dots')!;
  if (!photos.length) return;
  gallery.querySelector<HTMLElement>('.photo-empty')!.hidden = true;
  stage.hidden = false;
  controls.hidden = photos.length < 2;
  let index = 0;
  let paused = false;
  let zoomed = false;
  const preview = document.createElement('div');
  preview.className = 'photo-preview';
  preview.hidden = true;
  preview.setAttribute('role', 'dialog');
  preview.setAttribute('aria-label', '照片放大预览');
  const largeImage = document.createElement('img');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'photo-preview-close';
  close.textContent = '×';
  close.setAttribute('aria-label', '关闭照片预览');
  const previous = document.createElement('button');
  const next = document.createElement('button');
  previous.type = next.type = 'button';
  previous.className = 'photo-preview-nav photo-preview-prev';
  next.className = 'photo-preview-nav photo-preview-next';
  previous.textContent = '‹';
  next.textContent = '›';
  previous.setAttribute('aria-label', '上一张照片');
  next.setAttribute('aria-label', '下一张照片');
  previous.hidden = next.hidden = photos.length < 2;
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  const frame = document.createElement('div');
  frame.className = 'photo-preview-frame';
  frame.append(largeImage, previous, next);
  preview.append(frame, close);
  largeImage.draggable = false;
  let drag: { id: number; x: number; y: number } | undefined;
  largeImage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    if (event.isTrusted) largeImage.setPointerCapture(event.pointerId);
    largeImage.classList.add('is-dragging');
  });
  largeImage.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag = undefined;
    largeImage.classList.remove('is-dragging');
    if (largeImage.hasPointerCapture(event.pointerId)) largeImage.releasePointerCapture(event.pointerId);
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  });
  const cancelDrag = () => { drag = undefined; largeImage.classList.remove('is-dragging'); };
  largeImage.addEventListener('pointercancel', cancelDrag);
  largeImage.addEventListener('lostpointercapture', cancelDrag);
  document.body.append(preview);
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  image.tabIndex = 0;
  image.setAttribute('role', 'button');
  image.setAttribute('aria-label', '放大查看照片');
  image.setAttribute('aria-expanded', 'false');
  function closePreview() {
    if (!zoomed) return;
    zoomed = false;
    preview.classList.remove('is-open');
    image.setAttribute('aria-expanded', 'false');
    image.focus({ preventScroll: true });
    closeTimer = setTimeout(() => { preview.hidden = true; }, motion.matches ? 0 : 280);
    schedule();
  }
  function openPreview() {
    if (!image.naturalWidth || image.hidden) return;
    clearTimeout(closeTimer);
    largeImage.src = photos[index].url;
    preloadOriginals();
    largeImage.alt = image.alt;
    zoomed = true;
    preview.hidden = false;
    // Establish the initial scale before transitioning, including on reopen.
    void preview.offsetWidth;
    preview.classList.add('is-open');
    image.setAttribute('aria-expanded', 'true');
    close.focus({ preventScroll: true });
    schedule();
  }
  image.addEventListener('click', openPreview);
  image.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPreview(); }
  });
  close.addEventListener('click', closePreview);
  preview.addEventListener('click', event => { if (event.target === preview) closePreview(); });
  document.addEventListener('keydown', event => {
    if (!zoomed) return;
    if (event.key === 'Escape') closePreview();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  let hovering = false;
  let focused = false;
  let visible = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function schedule() {
    clearInterval(timer);
    if (photos.length > 1 && !zoomed && !paused && !hovering && !focused && visible && !document.hidden && !motion.matches) {
      timer = setInterval(() => show(index + 1), 3000);
    }
  }
  const preloaded = new Set<string>();
  function preload(url: string) {
    if (preloaded.has(url)) return;
    preloaded.add(url);
    const asset = new Image();
    asset.addEventListener('error', () => preloaded.delete(url), { once: true });
    asset.src = url;
  }
  function preloadOriginals() {
    for (const delta of [-1, 1]) preload(photos[(index + delta + photos.length) % photos.length].url);
  }
  function show(next: number) {
    index = (next + photos.length) % photos.length;
    image.hidden = false;
    gallery.querySelector<HTMLElement>('.photo-error')!.hidden = true;
    image.src = photos[index].thumbnail ?? photos[index].url;
    for (const delta of [-1, 1]) {
      const photo = photos[(index + delta + photos.length) % photos.length];
      preload(photo.thumbnail ?? photo.url);
    }
    image.alt = `女装穿搭照片 nz_${photos[index].number}`;
    if (zoomed) {
      largeImage.src = photos[index].url;
      largeImage.alt = image.alt;
      preloadOriginals();
    }
    status.textContent = `${index + 1} / ${photos.length} · NZ_${photos[index].number}`;
    dots.querySelectorAll('button').forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === index)));
  }
  image.addEventListener('error', () => {
    image.hidden = true;
    gallery.querySelector<HTMLElement>('.photo-error')!.hidden = false;
  });
  photos.forEach((photo, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `查看照片 nz_${photo.number}`);
    dot.addEventListener('click', () => { show(i); schedule(); });
    dots.append(dot);
  });
  function step(delta: number) { show(index + delta); schedule(); }
  gallery.querySelector('[data-photo-prev]')!.addEventListener('click', () => step(-1));
  gallery.querySelector('[data-photo-next]')!.addEventListener('click', () => step(1));
  pause.addEventListener('click', () => {
    paused = !paused;
    pause.textContent = paused ? '继续播放' : '暂停播放';
    pause.setAttribute('aria-pressed', String(paused));
    schedule();
  });
  gallery.addEventListener('keydown', event => {
    if (zoomed) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  let start: { x: number; y: number } | undefined;
  stage.addEventListener('touchstart', event => {
    start = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : undefined;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    start = undefined;
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { start = undefined; });
  gallery.addEventListener('mouseenter', () => { hovering = true; schedule(); });
  gallery.addEventListener('mouseleave', () => { hovering = false; schedule(); });
  gallery.addEventListener('focusin', () => { focused = true; schedule(); });
  gallery.addEventListener('focusout', event => { focused = gallery.contains(event.relatedTarget as Node | null); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(gallery);
  show(0);
}

export function discoverPhotos(files: Record<string, string>, thumbnails: Record<string, string> = {}): Photo[] {
  const previews = new Map(Object.entries(thumbnails).flatMap(([path, url]) => {
    const match = /\/nz_([1-9]\d*)\.webp$/i.exec(path);
    return match ? [[Number(match[1]), url] as const] : [];
  }));
  return Object.entries(files).flatMap(([path, url]) => {
    const match = /\/nz_([1-9]\d*)\.(?:jpe?g|png|webp|avif|gif)$/i.exec(path);
    return match ? [{ url, number: Number(match[1]), ...(previews.has(Number(match[1])) ? { thumbnail: previews.get(Number(match[1])) } : {}) }] : [];
  }).sort((a, b) => a.number - b.number || a.url.localeCompare(b.url));
}
