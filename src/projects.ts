const endpoint = 'https://api.github.com/users/wuxintlh/repos?sort=updated&direction=desc&per_page=100';

type Repository = { name: string; description: string | null; language: string | null; stargazers_count: number; archived: boolean; fork: boolean };

export async function initProjects() {
  const grid = document.querySelector<HTMLElement>('.project-grid')!;
  const status = document.querySelector<HTMLElement>('.project-status')!;
  const render = (data: unknown) => {
    if (!Array.isArray(data)) throw new Error('Invalid repository list');
    const repos = data.filter((repo): repo is Repository => repo && typeof repo.name === 'string' && /^[\w.-]+$/.test(repo.name) && !repo.fork && !repo.archived).slice(0, 4);
    grid.replaceChildren(...repos.map(repo => {
      const card = document.createElement('a');
      card.className = 'project-card';
      card.href = `https://github.com/wuxintlh/${encodeURIComponent(repo.name)}`;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      const title = document.createElement('h3');
      title.textContent = `${repo.name} ↗`;
      const description = document.createElement('p');
      description.textContent = typeof repo.description === 'string' && repo.description ? repo.description : '在 GitHub 查看项目详情。';
      const meta = document.createElement('span');
      meta.className = 'project-meta';
      const stars = Number.isSafeInteger(repo.stargazers_count) && repo.stargazers_count >= 0 ? repo.stargazers_count : 0;
      meta.textContent = `${typeof repo.language === 'string' ? repo.language : '未标注语言'} · ☆ ${stars}`;
      card.append(title, description, meta);
      return card;
    }));
    return repos.length;
  };
  let hasSnapshot = false;
  try {
    const snapshot = await fetch(`${import.meta.env.BASE_URL}projects.json`, { signal: AbortSignal.timeout(3000), credentials: 'omit' });
    if (!snapshot.ok) throw new Error(`Snapshot ${snapshot.status}`);
    hasSnapshot = render(await snapshot.json()) > 0;
    if (hasSnapshot) {
      status.textContent = '项目快照 · 正在检查 GitHub 最新更新';
      grid.setAttribute('aria-busy', 'false');
    }
  } catch { /* The live API can still provide projects if the snapshot is unavailable. */ }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(endpoint, { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    const count = render(await response.json());
    status.textContent = count ? '按 GitHub 最近更新时间排序 · 不含 Fork 与归档仓库' : '暂时没有可展示的公开项目，可前往 GitHub 查看。';
  } catch {
    status.textContent = hasSnapshot ? '当前展示最近发布的项目快照 · GitHub 暂不可用' : '暂时无法获取项目，可通过下方入口查看。';
  } finally {
    clearTimeout(timeout);
    grid.setAttribute('aria-busy', 'false');
  }
}
