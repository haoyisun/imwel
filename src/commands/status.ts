import { readBinding } from '../core/binding.js';
import { computeDrift } from '../core/drift.js';
import { remoteCacheDir } from '../core/paths.js';
import { ensureRemoteCache, checkoutBranch } from '../core/remote-cache.js';
import { t } from '../locales/index.js';

export async function runStatus(): Promise<number> {
  console.log(t('status.title'));
  const projectDir = process.cwd();
  const binding = await readBinding(projectDir);
  if (!binding) {
    console.log(t('status.noBinding'));
    return 1;
  }
  console.log(t('status.remote', { remote: binding.remote, branch: binding.branch }));
  console.log(t('status.project', { project: binding.project }));
  console.log(t('status.tools', { tools: binding.tools.join(', ') }));
  console.log(t('status.lastSynced', { sha: binding.lastSyncedCommit.slice(0, 8) }));

  const cacheDir = remoteCacheDir(binding.remote);
  await ensureRemoteCache(binding.remote, { force: true });
  await checkoutBranch(cacheDir, binding.branch);
  const drift = await computeDrift(projectDir, binding, cacheDir, true);

  if (drift.remoteUpdated) {
    console.log(t('status.remoteUpdated'));
  }
  if (drift.localEdited) {
    console.log(t('status.localEdited', { paths: drift.dirtyPaths.join(', ') }));
  }
  if (!drift.remoteUpdated && !drift.localEdited) {
    console.log(t('status.clean'));
  }
  return 0;
}
