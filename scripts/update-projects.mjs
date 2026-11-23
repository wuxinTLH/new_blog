import { writeFile } from 'node:fs/promises';

// Runs during deployment; the token never enters the generated public snapshot.
try {
  const response = await fetch('https://api.github.com/users/wuxintlh/repos?sort=updated&direction=desc&per_page=100', {
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Invalid repository list');
  const projects = data.filter(repo => repo && typeof repo.name === 'string' && /^[\w.-]+$/.test(repo.name) && !repo.fork && !repo.archived)
    .slice(0, 4).map(({ name, description, language, stargazers_count }) => ({ name, description, language, stargazers_count, fork: false, archived: false }));
  if (!projects.length) throw new Error('Empty snapshot; retaining previous projects');
  await writeFile(new URL('../public/projects.json', import.meta.url), `${JSON.stringify(projects, null, 2)}\n`);
  console.log(`Updated public snapshot with ${projects.length} projects.`);
} catch (error) {
  console.warn(`Project snapshot refresh unavailable; keeping bundled snapshot. ${error.message}`);
}
