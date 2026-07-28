import { t } from '../locales/index.js';
import { error } from './cli-output.js';

/** True when stdin is a TTY (interactive prompts are possible). */
export function isInteractiveStdin(): boolean {
  return Boolean(process.stdin.isTTY);
}

/**
 * Return flag names whose values are missing (undefined / null / empty string).
 * Boolean `false` is treated as present.
 */
export function collectMissingFlags(required: Record<string, unknown>): string[] {
  return Object.entries(required)
    .filter(([, value]) => value === undefined || value === null || value === '')
    .map(([flag]) => flag);
}

/** Localized error listing missing non-interactive flags. */
export function formatMissingFlagsError(flags: string[]): string {
  return t('cli.missingFlags', { flags: flags.join(', ') });
}

/**
 * If any required flag is missing, print a localized error and return exit code 1.
 * Otherwise return null (caller continues).
 */
export function exitIfMissingFlags(required: Record<string, unknown>): number | null {
  const missing = collectMissingFlags(required);
  if (missing.length === 0) {
    return null;
  }
  error(formatMissingFlagsError(missing));
  return 1;
}

export function parseCsv(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
