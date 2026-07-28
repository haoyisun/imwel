import { parseFrontmatter } from './frontmatter.js';

/**
 * Where an artifact discovered in a tool directory came from.
 * - `MINE`: installed by imwel itself (command pack / first-party skills).
 * - `FOREIGN`: installed by another known tool (e.g. openspec).
 * - `USER`: the user's own project rules — the only class consumer operations
 *   (adopt / template init --from-project / propose) act on.
 */
export type Provenance = 'MINE' | 'FOREIGN' | 'USER';

export interface ProvenanceResult {
  provenance: Provenance;
  /** Locale key explaining the decision, for user-facing "why excluded" output. */
  reasonKey: string;
}

export interface ArtifactRef {
  /** Path as seen in the tool directory (used for namespace detection). */
  path: string;
  /** File content, if available, to read the `generatedBy` frontmatter marker. */
  content?: string;
}

interface ForeignSignature {
  id: string;
  /** Namespace prefixes (file/dir names) that mark this tool's artifacts. */
  namespaces: string[];
}

/**
 * Built-in third-party signatures. Intentionally small and extensible; when a
 * signature is uncertain we bias toward `USER` (see classifyProvenance).
 */
const FOREIGN_SIGNATURES: ForeignSignature[] = [
  { id: 'openspec', namespaces: ['openspec-'] },
];

function baseName(p: string): string {
  const norm = p.replace(/\\/g, '/').replace(/\/$/, '');
  return norm.split('/').pop() ?? norm;
}

function segments(p: string): string[] {
  return p.replace(/\\/g, '/').split('/').filter(Boolean);
}

function hasSegmentPrefix(p: string, prefix: string): boolean {
  return segments(p).some((seg) => seg.startsWith(prefix));
}

/**
 * Classify a discovered artifact by source. Deterministic, offline, no LLM.
 * imwel's own artifacts are detected by either the `generatedBy: imwel`
 * frontmatter marker OR the `imwel-*` namespace (double identification, so a
 * hand-stripped frontmatter still falls back to the namespace).
 */
export function classifyProvenance(ref: ArtifactRef): ProvenanceResult {
  const name = baseName(ref.path);
  const generatedBy = readGeneratedBy(ref.content);

  if (generatedBy === 'imwel') {
    return { provenance: 'MINE', reasonKey: 'provenance.reason.mine.marker' };
  }
  if (name.startsWith('imwel-') || hasSegmentPrefix(ref.path, 'imwel-')) {
    return { provenance: 'MINE', reasonKey: 'provenance.reason.mine.namespace' };
  }

  if (generatedBy && generatedBy !== 'imwel') {
    return { provenance: 'FOREIGN', reasonKey: 'provenance.reason.foreign.marker' };
  }
  for (const sig of FOREIGN_SIGNATURES) {
    if (sig.namespaces.some((ns) => name.startsWith(ns) || hasSegmentPrefix(ref.path, ns))) {
      return { provenance: 'FOREIGN', reasonKey: 'provenance.reason.foreign.namespace' };
    }
  }

  // Uncertain → bias toward USER (rather rely on the user to skip it later than
  // silently drop their own content).
  return { provenance: 'USER', reasonKey: 'provenance.reason.user' };
}

function readGeneratedBy(content?: string): string | undefined {
  if (!content) {
    return undefined;
  }
  const value = parseFrontmatter(content).frontmatter.generatedBy;
  return typeof value === 'string' ? value.trim().toLowerCase() : undefined;
}

/** Keep only USER-classified refs; the target set for consumer operations. */
export function filterUserArtifacts<T extends ArtifactRef>(refs: T[]): {
  user: T[];
  excluded: { ref: T; result: ProvenanceResult }[];
} {
  const user: T[] = [];
  const excluded: { ref: T; result: ProvenanceResult }[] = [];
  for (const ref of refs) {
    const result = classifyProvenance(ref);
    if (result.provenance === 'USER') {
      user.push(ref);
    } else {
      excluded.push({ ref, result });
    }
  }
  return { user, excluded };
}
