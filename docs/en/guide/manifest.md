# Manifest reference

> **Reference · for template authors.** Consumers don't edit this — see the [Consumer path](../consume/quickstart.md). New here? Start at [Author a template](../author/quickstart.md).

Template repositories declare projects and directory conventions in **`.imwel/manifest.yaml`**. imwel reads this file with the same rules as `src/core/manifest.ts` (defaults, validation, per-project overrides).

## Location

```
<template-repo-root>/
  .imwel/
    manifest.yaml
```

`imwel lint` and context detection expect a **template** root: `manifest.yaml` present, `binding.yaml` absent. Do not put a consumer `binding.yaml` in the template root.

## Schema

### Root fields

| Field | Required | Description |
|-------|----------|-------------|
| `conventions` | No (defaults applied) | Default directory / file names for discovering Artifacts |
| `projects` | **Yes** (non-empty array) | One or more installable projects |

### `conventions`

| Field | Default | Description |
|-------|---------|-------------|
| `rulesDir` | `rules` | Directory under each project path for `rule` Artifacts |
| `skillsDir` | `skills` | Directory for `skill` Artifacts (each skill is a folder with `SKILL.md`) |
| `agentsFile` | `agents.md` | Project-level agents instructions filename |

If `conventions` is omitted or partial, missing keys use the defaults above.

### `projects[]`

| Field | Required | Description |
|-------|----------|-------------|
| `name` | **Yes** | Project id used by `imwel init` / binding |
| `path` | **Yes** | Directory relative to the template repo root |
| `optional` | No | List of Artifact **source paths** (relative to the project path) that are optional at install time |
| `conventions` | No | Partial override of root `conventions` for this project only |

Resolved conventions for a project = root `conventions` merged with that project’s `conventions` override (project wins per key).

### Optional vs required Artifacts

- Artifacts **not** listed in `optional` are **required** — they install by default on `imwel init` / sync.
- Paths listed in `optional` are offered at install time; the user chooses whether to include them (`--optional <csv>` / `--no-optional` in non-interactive mode).

Paths in `optional` use forward slashes and are relative to the project directory (e.g. `skills/example-skill`).

## Example

Minimal scaffold (same shape as `templates/init/en/.imwel/manifest.yaml`):

```yaml
conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md

projects:
  - name: example-project
    path: example-project
    optional:
      - skills/example-skill
```

### Multiple projects

A single template repository **can declare several projects** — for example a monorepo-style template that ships a separate rules/skills pack for a `backend` and a `frontend`. `projects` is a list, so add one entry per project.

Each consumer directory binds to **exactly one** project via `imwel init --project <name>` (see [Commands](./commands.md#imwel-init)); to consume a second project, run `imwel init` again in another directory. Bindings are per-directory, so a monorepo maps multiple sub-directories to multiple projects in the same template repo.

Each project may also override root `conventions` per key:

```yaml
conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md

projects:
  - name: backend
    path: projects/backend
  - name: frontend
    path: projects/frontend
    conventions:
      rulesDir: ai-rules
      agentsFile: AGENTS.md
```

## How Artifacts are discovered

Given resolved conventions for a project:

| Type | Location | Notes |
|------|----------|-------|
| `rule` | `<path>/<rulesDir>/*.md` | Canonical body: agents.md-flavored Markdown |
| `skill` | `<path>/<skillsDir>/<name>/SKILL.md` | Cursor / agentskills-style frontmatter |
| `agents` | `<path>/<agentsFile>` | Project-level agent instructions |

imwel does **not** invent a competing rule dialect. Tool-specific fields belong in adapter `targetOverrides` at render time — see [Adapters](../contribute/adapters.md).

## Rule metadata overlay

A `rule` source file **may** start with a small YAML frontmatter overlay. imwel parses it into semantic overrides, **strips it from the canonical body**, and translates it into each target tool's native format at render time (so the body stays plain agents.md-flavored Markdown).

```markdown
---
description: Use when editing API handlers to keep error handling consistent.
globs: ["src/api/**/*.ts"]
# alwaysApply: true
---

# API error handling

...rule body...
```

| Field | Purpose |
|-------|---------|
| `description` | When/why the rule applies. Without it, tools fall back to the filename slug, so `imwel lint` warns when it is missing. |
| `globs` | Path-attach the rule to matching files. |
| `alwaysApply` | `true` for an always-on rule. |

### Trigger intent (pick one)

| Intent | How to express it | Meaning |
|--------|-------------------|---------|
| **always-on** | `alwaysApply: true` | Always active. |
| **glob-attached** | set `globs` | Active for matching files. |
| **agent-requested** | neither `globs` nor `alwaysApply: true` | The model invokes it by `description` alone. |

Precedence: an author's overlay is the cross-tool **default**; a consumer's per-tool edit (recovered via `parseExisting`) takes precedence over it, so author-default changes keep propagating on re-sync unless a consumer has overridden that tool.

Skills already carry a native `SKILL.md` frontmatter `description`; when a skill is rendered as an on-demand rule for a tool without a native skills directory, that description propagates into the generated rule frontmatter.

## Validation tips

- Run `imwel lint` in the template root (errors = install-breaking; warnings = style; `--strict` fails on warnings).

## Next

- Validate your manifest and rules → [Lint & quality bar](../author/lint.md)
- Generate a starting tree and directory layout → [Author a template](../author/quickstart.md)
- How Artifacts render per tool → [Adapters](../contribute/adapters.md)
