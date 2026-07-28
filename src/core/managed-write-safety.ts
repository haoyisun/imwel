import type { Binding } from './binding.js';
import { collectInstalledPaths, readFileAtCommit } from './history.js';
import {
  inspectRenderedFiles,
  type InspectedRenderedFile,
  type RenderedFileWrite,
} from './apply-files.js';

export async function inspectBindingRenderedFiles(
  projectDir: string,
  files: RenderedFileWrite[],
  binding: Binding | null,
): Promise<InspectedRenderedFile[]> {
  const managedPaths = new Set(binding ? collectInstalledPaths(binding) : []);
  const historyCommit = binding?.lastSyncedHistoryCommit;
  return inspectRenderedFiles(projectDir, files, {
    managedPaths,
    historyContent: historyCommit
      ? (targetPath) => readFileAtCommit(projectDir, historyCommit, targetPath)
      : undefined,
  });
}

export function overwriteRisks(files: InspectedRenderedFile[]): InspectedRenderedFile[] {
  return files.filter(
    (file) => file.status === 'unmanaged-different' || file.status === 'managed-dirty',
  );
}
