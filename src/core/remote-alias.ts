/**
 * Heuristics for the `imwel remote add` argument: a Git URL contains a scheme
 * (`://`), an `@` (scp-like `git@host:...`), or path/host separators; a local
 * alias is a bare token without any of those.
 */
export function looksLikeUrl(value: string): boolean {
  const s = value.trim();
  return s.includes('://') || s.includes('@') || s.includes('/') || s.includes(':');
}

function parseRepoPath(url: string): { owner: string; repo: string } {
  let s = url
    .trim()
    .replace(/\.git$/i, '')
    .replace(/[#?].*$/, '')
    .replace(/\/+$/, '');
  const scp = s.match(/^[^/]+@[^:]+:(.+)$/);
  if (scp) {
    s = scp[1]!;
  } else {
    const proto = s.match(/^[a-z][\w+.-]*:\/\/[^/]+\/(.+)$/i);
    if (proto) {
      s = proto[1]!;
    }
  }
  const parts = s.split('/').filter(Boolean);
  const repo = parts[parts.length - 1] ?? '';
  const owner = parts.length >= 2 ? parts[parts.length - 2]! : '';
  return { owner, repo };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Derive a deterministic local alias from a Git URL, avoiding collisions with
 * already-taken aliases: prefer the repo name, then `owner-repo`, then a numeric
 * suffix. Callers should report the alias that was chosen.
 */
export function deriveRemoteAlias(url: string, taken: Iterable<string>): string {
  const takenSet = new Set(taken);
  const { owner, repo } = parseRepoPath(url);
  const base = slug(repo) || 'remote';
  const candidates = [base];
  const ownerSlug = slug(owner);
  if (ownerSlug) {
    candidates.push(`${ownerSlug}-${base}`);
  }
  for (const candidate of candidates) {
    if (!takenSet.has(candidate)) {
      return candidate;
    }
  }
  let i = 2;
  while (takenSet.has(`${base}-${i}`)) {
    i += 1;
  }
  return `${base}-${i}`;
}
