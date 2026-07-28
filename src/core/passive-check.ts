import { listRemotes } from './config.js';
import { computeDrift } from './drift.js';
import { readBinding } from './binding.js';
import { remoteCacheDir } from './paths.js';
import { ensureRemoteCache } from './remote-cache.js';
import { resolveFetchThrottleMs } from './throttle.js';
import { t } from '../locales/index.js';
import { info } from './cli-output.js';

export async function runPassiveCheckIfDue(
  projectDir = process.cwd(),
  throttleMs = resolveFetchThrottleMs(),
): Promise<void> {
  const binding = await readBinding(projectDir);
  if (!binding) {
    const remotes = await listRemotes();
    for (const alias of Object.keys(remotes)) {
      try {
        await ensureRemoteCache(alias, { throttleMs });
      } catch {
        // non-blocking
      }
    }
    return;
  }
  try {
    const cacheDir = remoteCacheDir(binding.remote);
    await ensureRemoteCache(binding.remote, { throttleMs });
    const drift = await computeDrift(projectDir, binding, cacheDir, false);
    if (drift.remoteUpdated || drift.localEdited) {
      info(t('passive.driftNotice'));
    }
  } catch {
    // non-blocking passive check
  }
}
