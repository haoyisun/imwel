## 1. Cursor always-apply core rule

- [x] 1.1 Create `.cursor/rules/imwel-core.mdc` with `alwaysApply: true` and a short English constraint list derived from `AGENTS.md` (architecture bans, English source, i18n routing, KISS/YAGNI, safety defaults, command vocabulary note)
- [x] 1.2 Cross-reference full rationale to `AGENTS.md`; do not paste the entire AGENTS.md body into the rule

## 2. Path-scoped rules

- [x] 2.1 Create `.cursor/rules/openspec-planning.mdc` with globs for `openspec/**` (Simplified Chinese planning artifacts after MVP; do not retro-translate archived English MVP)
- [x] 2.2 Create `.cursor/rules/cli-i18n.mdc` with globs for `src/commands/**`, `src/locales/**`, and `src/cli.ts` (no hardcoded user-facing strings)
- [x] 2.3 Create `.cursor/rules/docs-bilingual.mdc` with globs for `docs/**`, `README*.md`, and `templates/init/**` (en + zh-CN sync or explicit TODO)

## 3. Documentation checklist skill

- [x] 3.1 Create `.cursor/skills/imwel-change-docs-checklist/SKILL.md` with trigger-oriented description and a checklist covering bilingual README/docs, locale tables, scaffold templates, AGENTS.md (if architecture changed), and CHANGELOG when present
- [x] 3.2 Ensure the skill does not duplicate OpenSpec scaffold steps already covered by `openspec-*` skills; reference them instead

## 4. AGENTS.md cross-reference

- [x] 4.1 Add a short section to `AGENTS.md` explaining Cursor `.cursor/rules` vs canonical `AGENTS.md`, and pointing to the docs checklist skill
- [x] 4.2 Add a brief “iteration documentation duty” bullet consistent with the checklist skill (no full duplication)

## 5. Verification

- [x] 5.1 Spot-check that rule frontmatter (`alwaysApply` / `globs` / `description`) is valid for Cursor
- [x] 5.2 Confirm no CLI runtime code under `src/` was changed except if a rule glob path reference requires a comment-free docs-only touch (prefer zero `src/` edits)
- [x] 5.3 Mark optional `imwel-implement-change` skill as out of scope for this change unless 3.x finishes early with spare capacity (default: skip)
