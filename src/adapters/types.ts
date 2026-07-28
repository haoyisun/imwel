import type { Artifact, ArtifactType } from '../core/artifact-types.js';

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

/**
 * A first-party imwel command-pack member: a thin slash-command entry that
 * points the AI tool at its backing skill. Only tools with a native command
 * mechanism render these; others fall back to installing the backing skill.
 */
export interface FirstPartyCommand {
  /** Command name, e.g. `imwel-extract` (invoked as `/imwel-extract`). */
  name: string;
  /** Backing skill directory name the command loads, e.g. `imwel-extract`. */
  skillName: string;
  /** One-line intent shown in the command body. */
  intent: string;
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
  /**
   * Whether this tool has a native slash-command mechanism. When false/absent,
   * the command pack installs only the backing skill for this tool.
   */
  supportsCommands?: boolean;
  /** Render a first-party command thin entry into this tool's command dir. */
  renderCommand?(command: FirstPartyCommand): RenderedFile[];
}
