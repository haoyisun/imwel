import { parseFrontmatter } from './frontmatter.js';

export type HealthCode = 'rule.empty' | 'rule.deadImport' | 'rule.orphanRef';

export interface HealthIssue {
  code: HealthCode;
  /** Relative path of the rule file the issue was found in. */
  path: string;
  /** The offending reference (import/path), when applicable. */
  ref?: string;
}

/** Resolves a referenced path (relative to project root and/or the rule file dir) to existence. */
export type ExistsFn = (relPath: string, fromFileDir: string) => boolean;

const KNOWN_EXTENSIONS = [
  'ts',
  'tsx',
  'js',
  'jsx',
  'md',
  'json',
  'py',
  'go',
  'yaml',
  'yml',
  'sql',
  'sh',
  'rs',
  'java',
];

const EXT_RE = new RegExp(`\\.(${KNOWN_EXTENSIONS.join('|')})$`, 'i');

function dirOf(relPath: string): string {
  const idx = relPath.replace(/\\/g, '/').lastIndexOf('/');
  return idx === -1 ? '' : relPath.slice(0, idx);
}

/** Body with frontmatter, HTML comments, and heading-only lines removed. */
function meaningfulBody(content: string): string {
  const { body } = parseFrontmatter(content);
  return body
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return false;
      }
      if (/^#{1,6}\s/.test(trimmed)) {
        return false;
      }
      return true;
    })
    .join('\n')
    .trim();
}

function looksLikePath(token: string): boolean {
  if (!token || /\s/.test(token)) {
    return false;
  }
  if (/^(https?:|mailto:|#)/i.test(token)) {
    return false;
  }
  if (token.startsWith('-')) {
    return false;
  }
  if (token.includes('*') || token.includes('?')) {
    return false;
  }
  if (!/^[\w./@~-]+$/.test(token)) {
    return false;
  }
  return token.includes('/') || EXT_RE.test(token);
}

/**
 * Deterministic, LLM-free static health checks over rule files.
 * `exists(relPath, fromFileDir)` reports whether a referenced path resolves.
 */
export function checkRuleHealth(
  files: { path: string; content: string }[],
  exists: ExistsFn,
): HealthIssue[] {
  const issues: HealthIssue[] = [];

  for (const file of files) {
    const fileDir = dirOf(file.path);

    if (!meaningfulBody(file.content)) {
      issues.push({ code: 'rule.empty', path: file.path });
      continue;
    }

    const { body } = parseFrontmatter(file.content);

    for (const match of body.matchAll(/^@([\w./@~-]+)\s*$/gm)) {
      const ref = match[1]!;
      if (!exists(ref, fileDir)) {
        issues.push({ code: 'rule.deadImport', path: file.path, ref });
      }
    }

    const seen = new Set<string>();
    for (const match of body.matchAll(/`([^`\n]+)`/g)) {
      const token = match[1]!.trim();
      if (seen.has(token) || !looksLikePath(token)) {
        continue;
      }
      seen.add(token);
      if (!exists(token, fileDir)) {
        issues.push({ code: 'rule.orphanRef', path: file.path, ref: token });
      }
    }
  }

  return issues;
}
