import type { Artifact, ArtifactType, BundleFile } from '../core/artifact-types.js';

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
  /**
   * For `type=skill` Artifacts rendered as a directory bundle (fidelity ladder R1),
   * the full set of files in the skill's rendered directory (the `SKILL.md` plus
   * accompanying files such as `references/*.md`), keyed by path relative to the
   * skill directory. Omitted for degraded (R2–R5) targets and for non-skill types.
   */
  bundleFiles?: BundleFile[];
}

/**
 * One logical artifact discovered on disk during consolidation (`adopt`).
 * `files` are the (possibly synthesized) inputs to feed `parseExisting`;
 * `sourceFiles` are the real disk paths for reporting and the read-only guarantee.
 */
export interface DiscoveredArtifact {
  slug: string;
  type: ArtifactType;
  files: { path: string; content: string }[];
  sourceFiles: string[];
}

export interface Adapter {
  id: string;
  detect(projectDir: string): Promise<boolean>;
  render(artifact: Artifact, targetOverrides?: Record<string, unknown>): RenderedFile[];
  parseExisting(files: { path: string; content: string }[]): ParsedExisting;
  /**
   * Discover this tool's existing rule/skill files on disk and group them into
   * logical artifacts. Only finds and groups — parsing stays in `parseExisting`.
   * Optional: adapters without a discovery strategy are skipped by `adopt`.
   */
  discoverExisting?(projectDir: string): Promise<DiscoveredArtifact[]>;
}
