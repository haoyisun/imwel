/** Default passive/cache fetch interval: 2 hours. */
export const DEFAULT_FETCH_THROTTLE_MS = 2 * 60 * 60 * 1000;

/**
 * Resolve the global fetch throttle from `IMWEL_FETCH_THROTTLE_MS`.
 * Per-remote throttle configuration is deferred — only this process-level env is supported.
 * Invalid or non-positive values fall back to {@link DEFAULT_FETCH_THROTTLE_MS}.
 */
export function resolveFetchThrottleMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.IMWEL_FETCH_THROTTLE_MS;
  if (raw === undefined || raw === '') {
    return DEFAULT_FETCH_THROTTLE_MS;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_FETCH_THROTTLE_MS;
  }
  return n;
}
