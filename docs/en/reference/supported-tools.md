# Supported tools

imwel ships built-in **adapters** that render canonical Artifacts into each AI coding tool’s on-disk layout. There is no plugin marketplace — new targets land via upstream PR ([Add an adapter](../how-to/add-adapter.md)).

## Primary targets (detail)

| Tool id | Typical rule / agents paths | Typical skills |
|---------|----------------------------|----------------|
| `cursor` | `.cursor/rules/<slug>.mdc` | `.cursor/skills/<name>/…` |
| `claude-code` | Blocks in `CLAUDE.md` | `.claude/skills/<name>/…` |

## Other built-in adapter ids

`codex`, `windsurf`, `gemini-cli`, `copilot`, `cline`, `continue`, `aider`, `kiro`, `opencode`, `trae`, `qoder`, `zcode`

Path families differ (frontmatter rule dirs, flat dirs, single-file upsert blocks, GitHub instructions). Skills follow a fidelity ladder (native skills dirs → on-demand rules → prompts → always-on merge with a warning).

Pass ids to `imwel init --tools` / `imwel tools` as a comma-separated list.

## See also

- [Consume for Cursor](../how-to/consume-for-cursor.md)
- [Consume for Claude Code](../how-to/consume-for-claude-code.md)
- [Architecture](../explanation/architecture.md)
