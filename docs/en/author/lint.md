# Lint & quality bar

> **Author path · Step 2 of 3** — Prerequisites: [Author a template](./quickstart.md).

Validate a template repository before publishing. Run lint only in a **template** root (a `.imwel/manifest.yaml`, no `binding.yaml`).

## Run lint

```bash
imwel lint
imwel lint --strict   # CI: warnings fail too
```

- **Errors** — install-breaking (invalid manifest, missing project path, skill without `SKILL.md`, path escape).
- **Warnings** — style / best practice (rule/skill `description` missing, too short/long, or not triggerable per agentskills / Cursor guidance).

In a consumer binding, the CLI points you to the template repo instead of reporting a fake clean result. Full flags: [`imwel lint`](../guide/commands.md#imwel-lint).

## Context detection

From any subdirectory, imwel walks up for `.imwel/` and classifies the location:

| Kind | Signal |
|------|--------|
| `template` | `manifest.yaml` with `projects`, no `binding.yaml` |
| `consumer` | `binding.yaml`, no `manifest.yaml` |
| `neither` | no markers |
| `ambiguous` | both files in the same `.imwel/` |

The `/imwel-author` Slash Command and `imwel lint` share this detection. A wrong or ambiguous context is always explained — imwel never silently applies the wrong pack.

## Next

- Publish and maintain your template → [Publish & maintain](./publish.md)
- Rule metadata that lint checks → [Rule metadata overlay](../guide/manifest.md#rule-metadata-overlay)
