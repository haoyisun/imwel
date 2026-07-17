import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathExists } from './fs-utils.js';
import type { Artifact, BundleFile } from './artifact-types.js';

/**
 * Resolve the bundled first-party skills directory. Assets live at the package
 * root (`assets/skills`) and are shipped via `package.json` `files`; this module
 * runs from `dist/core` (installed) or `src/core` (dev), both two levels below root.
 */
export function firstPartySkillsDir(): string {
  return fileURLToPath(new URL('../../assets/skills', import.meta.url));
}

/** Load all bundled first-party skills as canonical Artifacts. */
export async function loadFirstPartySkills(): Promise<Artifact[]> {
  const dir = firstPartySkillsDir();
  if (!(await pathExists(dir))) {
    throw new Error(
      `First-party skill assets not found at ${dir}. The imwel installation may be incomplete; reinstall the package.`,
    );
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const artifacts: Artifact[] = [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const skillDir = path.join(dir, entry.name);
    const bundleFiles = await readBundleFiles(skillDir, skillDir);
    const skillMd = bundleFiles.find((f) => f.relativePath === 'SKILL.md');
    if (!skillMd) {
      continue;
    }
    artifacts.push({
      sourcePath: entry.name,
      type: 'skill',
      optional: false,
      canonicalContent: skillMd.content,
      bundleFiles,
    });
  }
  return artifacts;
}

async function readBundleFiles(root: string, dir: string): Promise<BundleFile[]> {
  const out: BundleFile[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await readBundleFiles(root, abs)));
    } else if (entry.isFile()) {
      out.push({
        relativePath: path.relative(root, abs).split(path.sep).join('/'),
        content: await fs.readFile(abs, 'utf8'),
      });
    }
  }
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
