import fs from 'node:fs/promises';
import path from 'node:path';
import { pathExists } from './fs-utils.js';
import { readYamlFile } from './yaml-file.js';

export type ImwelContextKind = 'template' | 'consumer' | 'neither' | 'ambiguous';

export interface ImwelContext {
  kind: ImwelContextKind;
  /** Absolute path to the directory that contains `.imwel/` when a signal was found. */
  root: string | null;
}

interface ManifestShape {
  projects?: unknown;
}

/**
 * Walk ancestors from `cwd` and classify the nearest `.imwel/` that carries
 * a template manifest and/or consumer binding. Offline and read-only.
 */
export async function detectImwelContext(cwd: string): Promise<ImwelContext> {
  let current = path.resolve(cwd);

  for (;;) {
    const imwelDir = path.join(current, '.imwel');
    if (await pathExists(imwelDir)) {
      const manifestPath = path.join(imwelDir, 'manifest.yaml');
      const bindingPath = path.join(imwelDir, 'binding.yaml');
      const hasManifestFile = await pathExists(manifestPath);
      const hasBinding = await pathExists(bindingPath);

      if (hasManifestFile || hasBinding) {
        if (hasManifestFile && hasBinding) {
          return { kind: 'ambiguous', root: current };
        }
        if (hasBinding) {
          return { kind: 'consumer', root: current };
        }
        if (await isValidTemplateManifest(manifestPath)) {
          return { kind: 'template', root: current };
        }
        // Broken or incomplete manifest at this layer — do not invent a role.
        return { kind: 'neither', root: current };
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return { kind: 'neither', root: null };
}

async function isValidTemplateManifest(manifestPath: string): Promise<boolean> {
  try {
    const raw = await readYamlFile<ManifestShape>(manifestPath);
    if (!raw || !Array.isArray(raw.projects) || raw.projects.length === 0) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** True when `dir` is a directory (not a file). */
export async function isDirectory(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
