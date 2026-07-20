import { runGit } from './git.js';

export type HistoryConfidence = 'normal' | 'low';

export interface Hotspot {
  path: string;
  changes: number;
}

export interface CoChange {
  /** A sorted file pair that repeatedly changed together. */
  files: string[];
  together: number;
}

export interface HistorySignals {
  available: boolean;
  confidence?: HistoryConfidence;
  commitsAnalyzed?: number;
  hotspots?: Hotspot[];
  coChanges?: CoChange[];
}

/** How many recent commits to analyze. Older history carries diminishing signal. */
const WINDOW = 500;
/** Below this commit count the signal is real but weak — mark it low-confidence. */
const MIN_COMMITS_FOR_NORMAL = 20;
/**
 * Commits touching more files than this are skipped entirely: bulk reformatting or
 * generated-file churn would otherwise dominate hotspots and pollute co-change pairs.
 */
const MAX_FILES_PER_COMMIT = 50;
/** Cap the number of entries kept, so the fingerprint stays bounded on large repos. */
const HOTSPOT_LIMIT = 30;
const COCHANGE_LIMIT = 30;

/** Record separator (0x1e) prefixes each commit header so file names can't be confused for it. */
const COMMIT_MARK = '\x1e';

/** First path segment used to drop history entries under dependency/build directories. */
const IGNORED_TOP_SEGMENTS = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  'target',
  'vendor',
  '__pycache__',
  '.venv',
  '.imwel',
]);

function isIgnored(relPosix: string): boolean {
  const top = relPosix.split('/')[0] ?? '';
  return IGNORED_TOP_SEGMENTS.has(top);
}

async function isGitWorkTree(projectDir: string): Promise<boolean> {
  try {
    const { stdout } = await runGit(['rev-parse', '--is-inside-work-tree'], { cwd: projectDir });
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

/** Parse `git log --name-only` output into one file list per commit. */
function parseCommits(stdout: string): string[][] {
  const commits: string[][] = [];
  let current: string[] | null = null;
  for (const raw of stdout.split('\n')) {
    if (raw.startsWith(COMMIT_MARK)) {
      current = [];
      commits.push(current);
      continue;
    }
    const file = raw.trim();
    if (file && current) {
      current.push(file);
    }
  }
  return commits;
}

/**
 * Mine change hotspots and co-change pairs from recent Git history. Read-only and
 * deterministic (same repo state → same output). Returns `{ available: false }` when
 * there is no Git work tree or no commits, so callers can treat it as an optional layer.
 */
export async function collectHistorySignals(projectDir: string): Promise<HistorySignals> {
  if (!(await isGitWorkTree(projectDir))) {
    return { available: false };
  }

  let stdout: string;
  try {
    const result = await runGit(
      ['log', `--max-count=${WINDOW}`, '--name-only', `--pretty=format:${COMMIT_MARK}%H`],
      { cwd: projectDir },
    );
    stdout = result.stdout;
  } catch {
    // Repository has no commits yet, or log failed — fall back to the tree layer.
    return { available: false };
  }

  const commits = parseCommits(stdout);
  if (commits.length === 0) {
    return { available: false };
  }

  const changeCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();

  for (const files of commits) {
    const tracked = files.filter((f) => !isIgnored(f));
    if (tracked.length === 0 || tracked.length > MAX_FILES_PER_COMMIT) {
      continue;
    }
    for (const file of tracked) {
      changeCounts.set(file, (changeCounts.get(file) ?? 0) + 1);
    }
    const sorted = [...tracked].sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}\t${sorted[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const hotspots: Hotspot[] = [...changeCounts.entries()]
    .map(([path, changes]) => ({ path, changes }))
    .sort((a, b) => b.changes - a.changes || a.path.localeCompare(b.path))
    .slice(0, HOTSPOT_LIMIT);

  const coChanges: CoChange[] = [...pairCounts.entries()]
    .filter(([, together]) => together > 1)
    .map(([key, together]) => ({ files: key.split('\t'), together }))
    .sort((a, b) => b.together - a.together || a.files[0]!.localeCompare(b.files[0]!) || a.files[1]!.localeCompare(b.files[1]!))
    .slice(0, COCHANGE_LIMIT);

  return {
    available: true,
    confidence: commits.length < MIN_COMMITS_FOR_NORMAL ? 'low' : 'normal',
    commitsAnalyzed: commits.length,
    hotspots,
    coChanges,
  };
}
