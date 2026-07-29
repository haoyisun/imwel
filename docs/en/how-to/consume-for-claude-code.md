# How to consume a template for Claude Code

Want the same team Artifacts rendered for **Claude Code** — rules/agents into `CLAUDE.md` blocks and skills under `.claude/skills/` — without maintaining a second copy?

**What you get:** a binding that keeps Claude Code’s on-disk layout aligned with the Git template.

## Prerequisites

- [Install imwel](./install.md)
- Template remote URL (or local path remote from [Quick Start](../tutorials/quick-start.md))
- Working directory = consumer app (has or will have `.imwel/binding.yaml`)

## Steps

### 1. Register the remote (once per machine)

```bash
imwel remote add git@github.com:YOUR_ORG/my-templates.git
```

### 2. Bind and render for Claude Code

```bash
cd your-app
imwel init --tools claude-code
```

Non-interactive:

```bash
imwel init -y --remote my-templates --branch main --project example-project --tools claude-code
```

### 3. Verify

```bash
# Rule / agents content lands as upserted blocks:
head -n 40 CLAUDE.md
# Skills (if selected):
ls .claude/skills
imwel status
```

## Expected result

- `CLAUDE.md` contains imwel-managed blocks for installed rules/agents
- Optional skills exist under `.claude/skills/<name>/`
- Binding records `claude-code` as a tool

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `CLAUDE.md` unchanged | Ensure the template project ships rules/agents; empty optional-only installs may add little. Re-run `imwel sync`. |
| Conflict with hand-written `CLAUDE.md` | imwel uses block upsert — resolve markers if sync reports conflicts; see [Sync and handle drift](./sync-and-drift.md). |
| Also need Cursor | `imwel tools` to add `cursor` alongside Claude Code. |

## Related

- [Consume for Cursor](./consume-for-cursor.md)
- [Push via PR](./push-via-pr.md)
- [Supported tools](../reference/supported-tools.md)
