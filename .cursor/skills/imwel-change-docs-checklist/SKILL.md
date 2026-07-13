---
name: imwel-change-docs-checklist
description: >-
  Run after finishing an OpenSpec implementation or any change that affects
  CLI behavior, user-facing docs, locale strings, scaffold templates, or
  architecture constraints. Use when verifying documentation surfaces before
  marking tasks done, archiving a change, or opening a PR. Not for creating
  OpenSpec proposals (use openspec-* skills instead).
---

# imwel change documentation checklist

Use this skill **after** implementation work, not instead of OpenSpec planning.

For proposing / continuing / applying / archiving OpenSpec changes, use the existing `.cursor/skills/openspec-*` skills. Do **not** re-scaffold proposal/design/tasks here.

## When to run

- An OpenSpec change that alters CLI behavior, messages, or flags is otherwise "done"
- README, docs site, or `templates/init` content changed
- Architecture rules in `AGENTS.md` (or always-apply Cursor rules) need updating
- Preparing to archive a change or open a PR

## Checklist

Work through each item. Skip only with an explicit reason (e.g. "no string changes").

1. **Bilingual README**
   - [ ] `README.md` updated if user-facing overview/commands changed
   - [ ] `README.zh-CN.md` updated in the same change, or marked pending with a TODO
   - [ ] Top-of-file cross-links between the two still present

2. **Docs site (`docs/`)**
   - [ ] English pages under `docs/en/` updated when behavior/docs changed
   - [ ] `docs/zh-CN/` counterpart updated or explicitly TODO
   - [ ] No English-only silent drift

3. **CLI locale tables**
   - [ ] If any user-visible string changed: keys added/updated in `src/locales/en.ts` **and** `src/locales/zh-CN.ts`
   - [ ] `npm run check:i18n` would pass

4. **Scaffold templates**
   - [ ] If `imwel template init` output should change: update `templates/init/en/` and `templates/init/zh-CN/` in parallel

5. **Architecture canonical docs**
   - [ ] If product/architecture constraints changed: update `AGENTS.md`
   - [ ] If hard constraints changed: sync the short list in `.cursor/rules/imwel-core.mdc` (do not paste full AGENTS.md into the rule)

6. **CHANGELOG**
   - [ ] If `CHANGELOG.md` exists in the repo: add an entry for user-visible changes
   - [ ] If it does not exist yet: skip (owned by `oss-release-readiness` / release work) unless this change is creating it

7. **OpenSpec tasks**
   - [ ] Relevant doc/i18n/scaffold tasks in the change's `tasks.md` are checked off
   - [ ] Do not invent a second planning workflow — stay on the current OpenSpec change

## Done criteria

All applicable boxes checked or explicitly deferred with a written TODO in the change artifacts or PR description.
