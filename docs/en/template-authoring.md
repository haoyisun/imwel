# Authoring templates

How to develop and maintain an imwel **template repository**.

## Context detection

From any subdirectory, imwel walks up for `.imwel/` and classifies:

| Kind | Signal |
|------|--------|
| `template` | `manifest.yaml` with `projects`, no `binding.yaml` |
| `consumer` | `binding.yaml`, no `manifest.yaml` |
| `neither` | no markers |
| `ambiguous` | both files in the same `.imwel/` |

Slash Command `/imwel-author` and `imwel lint` share this detection. Wrong or ambiguous context must be explained — never silently apply the wrong pack.

## Lint quality bar

```bash
imwel lint
imwel lint --strict   # CI: warnings fail too
```

- **Errors** — install-breaking (invalid manifest, missing project path, skill without `SKILL.md`, path escape).
- **Warnings** — style / best practice (skill `description` missing, too short/long, or not triggerable per agentskills / Cursor guidance).

Run lint only in a **template** root. In a consumer binding, the CLI points you to the template repo instead of reporting a fake clean result.

## Cursor-first author UX

`imwel template init` scaffolds:

- Root `AGENTS.md` (read manifest first)
- `.cursor/rules`, `.cursor/skills` (template-author + consumer packs)
- `.cursor/commands/imwel-author.md` and `imwel-lint.md`

Primary loop: `/imwel-author` → edit Artifacts → `imwel lint` → host PR/MR.

## Other AI tools

Detection and `imwel lint` are tool-agnostic. Claude Code (or others) can add `.claude/` skills later; they should still shell out to `imwel lint` rather than duplicating rules.

## Consumer feedback path

From a bound project, use `imwel propose` / `imwel push` to feed changes upstream. That is not the default author workflow for maintaining the template itself.

## Related

- [Example template](./guide/example-template) — scaffold layout and `templates/init`
- [Manifest](./guide/manifest) — conventions and `optional`
- [Commands](./guide/commands) — `lint`, `template init`, `propose`, `push`
- [CONTRIBUTING.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.md) — contributing to the imwel CLI itself
