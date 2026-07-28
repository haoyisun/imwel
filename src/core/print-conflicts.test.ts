import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PathConflict } from '../adapters/strategies/dedupe.js';
import { printPathConflicts } from './print-conflicts.js';

function captureStderr(fn: () => void): string {
  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };
  try {
    fn();
  } finally {
    console.error = original;
  }
  return lines.join('\n');
}

describe('printPathConflicts', () => {
  it('names both source projects for a cross-project conflict', () => {
    const conflicts: PathConflict[] = [
      {
        path: '.cursor/rules/security.mdc',
        key: '.cursor/rules/security.mdc',
        adapterIds: ['cursor'],
        projects: ['python-std', 'code-std'],
      },
    ];
    const output = captureStderr(() => printPathConflicts(conflicts));
    assert.match(output, /python-std/);
    assert.match(output, /code-std/);
    assert.match(output, /security\.mdc/);
  });

  it('falls back to the tool-only message for a single-project conflict', () => {
    const conflicts: PathConflict[] = [
      {
        path: 'CLAUDE.md',
        key: 'CLAUDE.md',
        adapterIds: ['claude-code'],
        projects: ['app'],
      },
    ];
    const output = captureStderr(() => printPathConflicts(conflicts));
    assert.match(output, /claude-code/);
    assert.ok(!/python-std/.test(output));
  });
});
