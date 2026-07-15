import type { Artifact } from '../core/artifact-types.js';

export type MergeMode = 'replace' | 'upsert-block' | 'ensure-yaml-list';

export interface RenderedFile {
  path: string;
  content: string;
  merge?: MergeMode;
  blockId?: string;
  /** Locale key for a warning to print after render (e.g. R4 skill downgrade). */
  warningLocaleKey?: string;
}

export interface ParsedExisting {
  canonicalContent: string;
  targetOverrides?: Record<string, unknown>;
}

export interface Adapter {
  id: string;
  detect(projectDir: string): Promise<boolean>;
  render(artifact: Artifact, targetOverrides?: Record<string, unknown>): RenderedFile[];
  parseExisting(files: { path: string; content: string }[]): ParsedExisting;
}
