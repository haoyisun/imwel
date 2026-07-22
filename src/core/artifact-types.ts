export type ArtifactType = 'rule' | 'skill' | 'agents';

export interface BundleFile {
  relativePath: string;
  content: string;
}

export interface Artifact {
  sourcePath: string;
  /** Manifest project this artifact was discovered from. */
  project?: string;
  type: ArtifactType;
  optional: boolean;
  canonicalContent: string;
  bundleFiles?: BundleFile[];
  targetOverrides?: Record<string, unknown>;
}
