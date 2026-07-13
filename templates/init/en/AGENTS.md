# AGENTS.md — template author guide

This repository is an **imwel template repository**. AI coding agents working here must follow this guide.

## First step (always)

1. Read `.imwel/manifest.yaml` before creating or editing any Artifact.
2. Respect `conventions` (`rulesDir`, `skillsDir`, `agentsFile`) and each project's `path`.
3. Do **not** invent a competing rule/skill dialect — use AGENTS.md-flavored Markdown for rules and Cursor/agentskills `SKILL.md` for skills.

## Artifact layout

| Type | Location | Notes |
|------|----------|-------|
| `rule` | `<project>/<rulesDir>/*.md` | AGENTS.md-flavored Markdown |
| `skill` | `<project>/<skillsDir>/<name>/SKILL.md` | YAML frontmatter `name` + `description` required |
| `agents` | `<project>/<agentsFile>` | Project-level agent instructions |

## Author workflow

1. Clone this template repo and work in it (this is the primary author path).
2. Add or edit Artifacts under the correct project path from the manifest.
3. Run `imwel lint` (and `imwel lint --strict` in CI) before opening a PR.
4. Contribute via a **branch + pull/merge request on the Git host** — the host is governance; do not bypass branch protection.

## Cursor helpers

- Slash command `/imwel-author` — detect context and load the template-author pack.
- Slash command `/imwel-lint` — run `imwel lint`.
- Companion skills under `.cursor/skills/`.

## Not this repo

If you are in a **consumer** project (`.imwel/binding.yaml`), do not edit this template's `manifest.yaml` from there. Use `imwel sync` / `status` locally and `imwel propose` / `imwel push` to feed changes upstream.
