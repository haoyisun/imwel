import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkRuleHealth } from './rule-health.js';

const existsNone = () => false;
const existsAll = () => true;

describe('checkRuleHealth', () => {
  it('flags empty / placeholder-only rules', () => {
    const files = [
      { path: 'rules/a.md', content: '---\ndescription: x\n---\n# Title\n<!-- comment -->\n' },
      { path: 'rules/b.md', content: '# Heading\n\nReal guidance here.\n' },
    ];
    const issues = checkRuleHealth(files, existsAll);
    assert.deepEqual(
      issues.filter((i) => i.code === 'rule.empty').map((i) => i.path),
      ['rules/a.md'],
    );
  });

  it('flags dead @import references', () => {
    const files = [{ path: 'rules/a.md', content: '# R\n\nUse this.\n@./shared/missing.md\n' }];
    const issues = checkRuleHealth(files, existsNone);
    const dead = issues.filter((i) => i.code === 'rule.deadImport');
    assert.equal(dead.length, 1);
    assert.equal(dead[0]!.ref, './shared/missing.md');
  });

  it('flags orphan path references', () => {
    const files = [
      { path: 'rules/a.md', content: '# R\n\nEdit `src/gone.ts` before running.\n' },
    ];
    const issues = checkRuleHealth(files, existsNone);
    const orphan = issues.filter((i) => i.code === 'rule.orphanRef');
    assert.equal(orphan.length, 1);
    assert.equal(orphan[0]!.ref, 'src/gone.ts');
  });

  it('does not flag commands, URLs, or globs as orphan refs', () => {
    const files = [
      {
        path: 'rules/a.md',
        content:
          '# R\n\nRun `npm install`, see `https://example.com`, lint `src/**/*.ts`, use `--strict`.\n',
      },
    ];
    const issues = checkRuleHealth(files, existsNone);
    assert.equal(issues.filter((i) => i.code === 'rule.orphanRef').length, 0);
  });

  it('does not flag existing references', () => {
    const files = [{ path: 'rules/a.md', content: '# R\n\nEdit `src/here.ts`.\n' }];
    const issues = checkRuleHealth(files, existsAll);
    assert.equal(issues.length, 0);
  });
});
