# Contributing to {{name}}

## Artifact types

| Type | Location | Description |
|------|----------|-------------|
| `rule` | `<project>/rules/*.md` | AGENTS.md-flavored Markdown rules |
| `skill` | `<project>/skills/<name>/` | Skill bundles with `SKILL.md` |
| `agents` | `<project>/agents.md` | Project-level agent instructions |

## Authoring with AI / Slash Commands

1. Open this template repo in Cursor and run `/imwel-author`.
2. Follow the template-author pack: read `.imwel/manifest.yaml`, edit under the correct project path, then run `imwel lint`.
3. Open a pull request on the Git host. Do not invent a competing Artifact dialect.

## Workflow

1. Changes are reviewed via pull requests on the Git host.
2. Consumers run `imwel sync` to pull approved updates.
3. Local edits in bound projects are pushed back with `imwel push` (never direct commits to shared branches by default).

## Optional artifacts

List artifact paths under `optional` in the manifest project entry to prompt users at install time.
