## Purpose

Provide Cursor always-apply and path-scoped rules plus a documentation checklist skill so AI agents working on the imwel codebase consistently follow AGENTS.md constraints without replacing that file as the canonical source.

## Requirements

### Requirement: Cursor always-apply core guardrails
The repository SHALL provide a Cursor rule with `alwaysApply: true` that states the non-negotiable development constraints for the imwel codebase in a short, executable form (derived from `AGENTS.md`), including at minimum: no backend/platform scope creep; Git as the database; source code in English; CLI user-facing strings via locale tables; KISS/YAGNI; and safety defaults for file writes and network operations.

#### Scenario: New agent session without manually attaching AGENTS.md
- **WHEN** a Cursor Agent session starts in this repository without the user explicitly attaching `AGENTS.md`
- **THEN** the always-apply core rule SHALL still be available to the agent as project guidance

#### Scenario: Core rule stays short
- **WHEN** a contributor reviews the always-apply core rule file
- **THEN** it SHALL be a concise bullet/constraint list that references `AGENTS.md` for full rationale rather than duplicating the entire document

### Requirement: Path-scoped Cursor rules
The repository SHALL provide additional Cursor rules scoped by `globs` for OpenSpec planning artifacts, CLI command/locale sources, and user-facing documentation/templates, so that locale, planning-language, and bilingual-docs obligations apply when those files are in scope.

#### Scenario: Editing OpenSpec planning files
- **WHEN** an agent works under `openspec/**`
- **THEN** guidance SHALL require Simplified Chinese for planning artifacts created after `imwel-git-native-cli-mvp`, without requiring translation of the archived English MVP change

#### Scenario: Editing CLI user-facing strings
- **WHEN** an agent modifies files under `src/commands/**` or `src/locales/**` (or the CLI entrypoint)
- **THEN** guidance SHALL forbid hardcoding user-visible CLI strings and require routing them through the locale string tables

#### Scenario: Editing documentation
- **WHEN** an agent changes English user-facing docs (`docs/en/**`, `README.md`, or scaffold templates)
- **THEN** guidance SHALL require updating the `zh-CN` counterpart in the same change or explicitly marking the translation as pending

### Requirement: Change documentation checklist skill
The repository SHALL provide a project Agent Skill that lists the documentation surfaces a change must update or explicitly defer when the change alters user-facing behavior, CLI strings, architecture constraints, or scaffold templates.

#### Scenario: Completing a feature change
- **WHEN** an agent finishes implementing an OpenSpec change that affects CLI behavior or docs
- **THEN** the checklist skill SHALL instruct the agent to verify bilingual README/docs, locale tables if strings changed, `templates/init` if scaffolds changed, `AGENTS.md` if architecture constraints changed, and CHANGELOG when that file exists

### Requirement: AGENTS.md remains canonical with cross-references
`AGENTS.md` SHALL remain the tool-agnostic canonical instruction document and SHALL include a short cross-reference explaining that Cursor loads `.cursor/rules` for enforcement while other tools should read `AGENTS.md`, without replacing `AGENTS.md` content with a full copy of the rule files.

#### Scenario: Contributor opens AGENTS.md
- **WHEN** a human or agent reads `AGENTS.md` after this change
- **THEN** they SHALL find a brief section pointing to `.cursor/rules` and the documentation checklist skill without losing the existing architecture and convention sections
