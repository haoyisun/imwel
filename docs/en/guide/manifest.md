# Manifest reference

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

### Per-project conventions override

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

imwel does **not** invent a competing rule dialect. Tool-specific fields belong in adapter `targetOverrides` at render time — see [Adapters](../contribute/adapters).

## Validation tips

- Run `imwel lint` in the template root (errors = install-breaking; warnings = style; `--strict` fails on warnings).
- Author workflow details: [Template authoring](../template-authoring).
- Generate a starting tree with `imwel template init` — see [Example template](./example-template).
