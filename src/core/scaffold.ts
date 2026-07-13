import fs from 'node:fs/promises';
import path from 'node:path';
import { templatesDir } from './package-root.js';
import { pathExists } from './fs-utils.js';

export interface CopyScaffoldResult {
  written: string[];
  skipped: string[];
}

export async function copyScaffold(
  targetDir: string,
  locale: string,
  substitutions: Record<string, string>,
  options: { onSkip?: (relativePath: string) => void } = {},
): Promise<CopyScaffoldResult> {
  const localeDir = path.join(templatesDir(), 'init', locale);
  const fallbackDir = path.join(templatesDir(), 'init', 'en');
  const sourceDir = (await pathExists(localeDir)) ? localeDir : fallbackDir;
  const result: CopyScaffoldResult = { written: [], skipped: [] };
  await copyRecursive(sourceDir, targetDir, substitutions, targetDir, result, options.onSkip);
  return result;
}

async function copyRecursive(
  sourceDir: string,
  targetDir: string,
  substitutions: Record<string, string>,
  scaffoldRoot: string,
  result: CopyScaffoldResult,
  onSkip?: (relativePath: string) => void,
): Promise<void> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(sourceDir, entry.name);
    const dest = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(dest, { recursive: true });
      await copyRecursive(src, dest, substitutions, scaffoldRoot, result, onSkip);
      continue;
    }
    const relativePath = path.relative(scaffoldRoot, dest).replace(/\\/g, '/');
    if (await pathExists(dest)) {
      result.skipped.push(relativePath);
      onSkip?.(relativePath);
      continue;
    }
    let content = await fs.readFile(src, 'utf8');
    for (const [key, value] of Object.entries(substitutions)) {
      content = content.replaceAll(`{{${key}}}`, value);
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content, 'utf8');
    result.written.push(relativePath);
  }
}
