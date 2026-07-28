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
        sourceArtifacts: [],
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
        sourceArtifacts: [],
      },
    ];
    const output = captureStderr(() => printPathConflicts(conflicts));
    assert.match(output, /claude-code/);
    assert.ok(!/python-std/.test(output));
  });

  it('gives an actionable rename hint when source artifact paths are known (rule)', () => {
    const conflicts: PathConflict[] = [
      {
        path: '.cursor/rules/coding-style.mdc',
        key: '.cursor/rules/coding-style.mdc',
        adapterIds: ['cursor'],
        projects: ['python-std', 'code-std'],
        sourceArtifacts: [
          { project: 'python-std', sourcePath: 'rules/coding-style.md' },
          { project: 'code-std', sourcePath: 'rules/coding-style.md' },
        ],
      },
    ];
    const output = captureStderr(() => printPathConflicts(conflicts));
    assert.match(output, /python-std/);
    assert.match(output, /rules\/coding-style\.md/);
    assert.match(output, /python-std-coding-style\.md/);
  });

  it('gives an actionable rename hint for a skill dir', () => {
    const conflicts: PathConflict[] = [
      {
        path: '.cursor/skills/shared-skill/SKILL.md',
        key: '.cursor/skills/shared-skill/SKILL.md',
        adapterIds: ['cursor'],
        projects: ['example-project', 'python-std'],
        sourceArtifacts: [
          { project: 'example-project', sourcePath: 'skills/shared-skill' },
        ],
      },
    ];
    const output = captureStderr(() => printPathConflicts(conflicts));
    assert.match(output, /skills\/shared-skill/);
    assert.match(output, /example-project-shared-skill/);
  });

  it('omits the rename hint when source artifact paths are absent', () => {
    const conflicts: PathConflict[] = [
      {
        path: '.cursor/rules/security.mdc',
        key: '.cursor/rules/security.mdc',
        adapterIds: ['cursor'],
        projects: ['python-std', 'code-std'],
        sourceArtifacts: [],
      },
    ];
    const output = captureStderr(() => printPathConflicts(conflicts));
    assert.match(output, /python-std/);
    assert.match(output, /code-std/);
    assert.doesNotMatch(output, /Suggestion:/);
  });
});
