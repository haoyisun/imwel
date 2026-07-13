## Purpose

Provide a shared adapter interface so each AI coding tool can render and reverse-parse Artifacts, keeping canonical rule content as AGENTS.md-compatible Markdown with per-target overlays.

## Requirements

### Requirement: Shared adapter interface
Every render target SHALL be implemented as a module exposing `detect(projectDir)`, `render(artifact, targetOverrides)`, and `parseExisting(files)`. Core sync/push logic SHALL depend only on this interface, never on a target-specific code path outside its adapter module.

#### Scenario: Adding a target without touching core logic
- **WHEN** a new adapter module implementing the shared interface is registered
- **THEN** `imwel init`/`sync`/`push` SHALL be able to use it without any change to their own implementation

### Requirement: Cursor adapter renders rule artifacts to `.mdc` files
The Cursor adapter SHALL render `type=rule` Artifacts to `.cursor/rules/*.mdc`, translating the Artifact's `targetOverrides` for Cursor (glob scope, `alwaysApply`/Auto/Agent-Requested activation mode) into the corresponding `.mdc` frontmatter.

#### Scenario: Rendering a rule with a glob override
- **WHEN** an Artifact's Cursor `targetOverrides` specifies a glob scope
- **THEN** the rendered `.mdc` file's frontmatter SHALL include that glob scope

### Requirement: Claude Code adapter renders rule and skill artifacts
The Claude Code adapter SHALL render `type=rule` Artifacts into `CLAUDE.md` and `type=skill` Artifacts into `.claude/skills/<name>/SKILL.md` (plus any accompanying bundle files).

#### Scenario: Rendering a skill bundle
- **WHEN** a `type=skill` Artifact with multiple files is installed with Claude Code selected as a target
- **THEN** all files of the bundle SHALL be written under `.claude/skills/<name>/`

### Requirement: `agents.md` baseline with per-target overlays
The canonical stored content for a `type=rule` Artifact SHALL be plain, AGENTS.md-compatible Markdown. Any tool-specific enrichment SHALL be represented as a separate `targetOverrides` structure keyed by target, expanded only when rendering for that specific target, and SHALL NOT be embedded into the canonical content itself.

#### Scenario: Canonical content has no tool-specific syntax
- **WHEN** a `type=rule` Artifact's canonical content is inspected
- **THEN** it SHALL contain plain Markdown with no Cursor-specific frontmatter or Claude-specific import syntax

### Requirement: Reverse-rendering via `parseExisting`
Each adapter's `parseExisting` SHALL parse an on-disk rendered file (or file set) back into canonical content plus a `targetOverrides` structure, and SHALL be used both for detecting local edits (comparing its output against the last-synced canonical content) and for the reverse-render step of `imwel push`/`imwel propose`.

#### Scenario: Round-trip fidelity
- **WHEN** an Artifact is rendered by an adapter and then immediately parsed back via that adapter's `parseExisting`
- **THEN** the resulting canonical content and `targetOverrides` SHALL be equivalent to the original Artifact's content and overrides
