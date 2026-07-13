export type ArtifactType = 'rule' | 'skill' | 'agents';

export interface BundleFile {
  relativePath: string;
  content: string;
}

export interface Artifact {
  sourcePath: string;
  type: ArtifactType;
  optional: boolean;
  canonicalContent: string;
  bundleFiles?: BundleFile[];
  targetOverrides?: Record<string, unknown>;
}
