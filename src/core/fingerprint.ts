import fs from 'node:fs/promises';
import path from 'node:path';
import type { Adapter } from '../adapters/types.js';
import { collectHistorySignals, type HistorySignals } from './history-signals.js';

export const FINGERPRINT_VERSION = 2;

export interface LanguageCount {
  ext: string;
  files: number;
}

export interface ToolingSignals {
  test: string[];
  lint: string[];
  format: string[];
  ci: string[];
}

export interface ExistingRuleLocation {
  tool: string;
  path: string;
}

export interface Fingerprint {
  version: number;
  generatedAt: string;
  root: string;
  languages: LanguageCount[];
  manifests: string[];
  tooling: ToolingSignals;
  topLevelDirs: string[];
  schemaFiles: string[];
  existingRules: ExistingRuleLocation[];
  /**
   * Optional Git-history overlay (change hotspots, co-change pairs). Additive:
   * `available: false` when there is no Git work tree or no commits, in which case
   * the file-tree layer above is still complete.
   */
  history: HistorySignals;
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
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

/** Exact filename → category. Matched case-insensitively on the basename. */
const MANIFEST_FILES = new Set([
  'package.json',
  'pnpm-workspace.yaml',
  'pyproject.toml',
  'requirements.txt',
  'setup.py',
  'go.mod',
  'cargo.toml',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'gemfile',
  'composer.json',
]);

/** Prefix/suffix rules per tooling category, matched on the basename. */
interface NameRule {
  exact?: string[];
  prefix?: string[];
}

const TEST_RULE: NameRule = {
  exact: ['pytest.ini', 'tox.ini'],
  prefix: ['jest.config', 'vitest.config', 'playwright.config', '.mocharc', 'karma.conf'],
};
const LINT_RULE: NameRule = {
  exact: ['.flake8', 'ruff.toml', '.rubocop.yml', '.golangci.yml', '.golangci.yaml'],
  prefix: ['.eslintrc', 'eslint.config'],
};
const FORMAT_RULE: NameRule = {
  exact: ['.editorconfig', 'rustfmt.toml', '.clang-format'],
  prefix: ['.prettierrc', 'prettier.config'],
};

function matchesNameRule(name: string, rule: NameRule): boolean {
  const lower = name.toLowerCase();
  if (rule.exact?.includes(lower)) {
    return true;
  }
  return rule.prefix?.some((p) => lower.startsWith(p)) ?? false;
}

/** Path-based CI signals (relative POSIX path from root). */
function ciSignal(relPosix: string): boolean {
  const lower = relPosix.toLowerCase();
  return (
    lower.startsWith('.github/workflows/') ||
    lower === '.gitlab-ci.yml' ||
    lower === 'azure-pipelines.yml' ||
    lower === 'jenkinsfile' ||
    lower === '.circleci/config.yml'
  );
}

function schemaSignal(relPosix: string): boolean {
  const lower = relPosix.toLowerCase();
  return (
    lower === 'prisma/schema.prisma' ||
    lower.includes('/migrations/') ||
    lower.startsWith('migrations/') ||
    lower === 'db/schema.rb' ||
    lower.endsWith('.sql')
  );
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

/**
 * Deterministic, LLM-free, read-only project scan. Only inspects dirent names
 * and paths (never file contents) and records paths + counts — a map of "where
 * to look", not conclusions.
 */
export async function buildFingerprint(
  projectDir: string,
  adapters: Adapter[],
): Promise<Fingerprint> {
  const langCounts = new Map<string, number>();
  const manifests = new Set<string>();
  const tooling: ToolingSignals = { test: [], lint: [], format: [], ci: [] };
  const schemaFiles = new Set<string>();

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = toPosix(path.relative(projectDir, abs));
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) {
          continue;
        }
        await walk(abs);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (ext) {
        langCounts.set(ext, (langCounts.get(ext) ?? 0) + 1);
      }
      if (MANIFEST_FILES.has(entry.name.toLowerCase())) {
        manifests.add(rel);
      }
      if (matchesNameRule(entry.name, TEST_RULE)) {
        tooling.test.push(rel);
      }
      if (matchesNameRule(entry.name, LINT_RULE)) {
        tooling.lint.push(rel);
      }
      if (matchesNameRule(entry.name, FORMAT_RULE)) {
        tooling.format.push(rel);
      }
      if (ciSignal(rel)) {
        tooling.ci.push(rel);
      }
      if (schemaSignal(rel)) {
        schemaFiles.add(rel);
      }
    }
  }

  await walk(projectDir);

  const topLevelDirs: string[] = [];
  for (const entry of await fs.readdir(projectDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
      topLevelDirs.push(entry.name);
    }
  }

  const existingRules: ExistingRuleLocation[] = [];
  for (const adapter of adapters) {
    if (!adapter.discoverExisting) {
      continue;
    }
    const discovered = await adapter.discoverExisting(projectDir);
    for (const artifact of discovered) {
      for (const source of artifact.sourceFiles) {
        existingRules.push({ tool: adapter.id, path: toPosix(source) });
      }
    }
  }

  const languages: LanguageCount[] = [...langCounts.entries()]
    .map(([ext, files]) => ({ ext, files }))
    .sort((a, b) => (b.files - a.files) || a.ext.localeCompare(b.ext));

  const byPath = (a: string, b: string): number => a.localeCompare(b);
  const uniqSort = (values: string[]): string[] => [...new Set(values)].sort(byPath);

  const history = await collectHistorySignals(projectDir);

  return {
    version: FINGERPRINT_VERSION,
    generatedAt: new Date().toISOString(),
    root: path.basename(path.resolve(projectDir)),
    languages,
    manifests: uniqSort([...manifests]),
    tooling: {
      test: uniqSort(tooling.test),
      lint: uniqSort(tooling.lint),
      format: uniqSort(tooling.format),
      ci: uniqSort(tooling.ci),
    },
    topLevelDirs: topLevelDirs.sort(byPath),
    schemaFiles: uniqSort([...schemaFiles]),
    existingRules: existingRules.sort(
      (a, b) => byPath(a.tool, b.tool) || byPath(a.path, b.path),
    ),
    history,
  };
}
