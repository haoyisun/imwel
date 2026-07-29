# How to consume a template for Cursor

Want your team’s shared rules and skills written into **Cursor’s native paths** (`.cursor/rules/*.mdc`, `.cursor/skills/…`) without copy-paste?

**What you get:** a per-directory binding plus rendered Cursor files, kept in sync with the template via Git.

## Prerequisites

- [Install imwel](./install.md)
- A template repository URL you can fetch (or finish [Quick Start](../tutorials/quick-start.md) with a local path remote)
- You are in the **consumer** project directory (the app you code in — not the template root)

## Steps

### 1. Register the template remote (once per machine)

```bash
imwel remote add git@github.com:YOUR_ORG/my-templates.git
```

Or with an explicit alias:

```bash
imwel remote add org-standards git@github.com:YOUR_ORG/my-templates.git
```

### 2. Bind and render for Cursor

```bash
cd your-app
imwel init --tools cursor
```

Interactive prompts pick remote, branch, read-only modules, and one writable project. Non-interactive example:

```bash
imwel init -y --remote org-standards --branch main --project example-project --tools cursor
```

### 3. Verify

```bash
ls .cursor/rules
imwel status
```

## Expected result

- `.imwel/binding.yaml` lists `cursor` under tools
- Rule files appear as `.cursor/rules/<slug>.mdc`
- Skills (if installed) appear under `.cursor/skills/<name>/`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No `.cursor/rules` after init | Confirm `--tools cursor` (or you selected Cursor in the UI) and that the project has rules in the manifest. |
| Wrong project selected | Re-run `imwel init` or adjust with `imwel modules` / binding flows — see [Manage modules and tools](./manage-modules-and-tools.md). |
| Need Claude Code too | Add the tool without rebinding: `imwel tools` (or see [Consume for Claude Code](./consume-for-claude-code.md)). |

## Related

- [Sync and handle drift](./sync-and-drift.md)
- [Push via PR](./push-via-pr.md)
- [Supported tools](../reference/supported-tools.md)
