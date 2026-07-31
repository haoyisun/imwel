# In-tool skills & commands

imwel ships a small **command pack** — first-party skills you install into your AI coding tools and
invoke *inside the tool's chat* (for example `/imwel-extract` in Cursor or Claude Code). This page
covers what each member does and how to invoke it. For the CLI commands they wrap (`imwel scan`,
`imwel adopt`, `imwel template init`), see [Commands](./commands.md).

## Install the pack

```bash
imwel skill install --tools cursor,claude-code   # or omit --tools to pick interactively
```

`imwel init` can also install the pack (opt-in prompt, or `--command-pack` / `--no-command-pack`).

- The pack installs **skills only** (e.g. `.cursor/skills/imwel-*`, `.claude/skills/imwel-*`).
  Tools that surface skills in `/` (Cursor, Claude Code) let you invoke them as `/imwel-*`; other
  tools still match them by description.
- Re-running install **removes legacy thin command files** (`.cursor/commands/imwel-*.md`,
  `.claude/commands/imwel-*.md`) for pack members so they do not duplicate the skill in the slash
  menu. Author scaffold commands such as `/imwel-author` are left alone.
- All pack files are **unmanaged**: they carry a `generatedBy: imwel` marker under the `imwel-*`
  namespace and are never tracked by `sync`/`status`/`push`.

## Members

### `imwel-extract` — draft rules from your codebase

Invoke it (e.g. `/imwel-extract`) when a project has few or no rules and you want a project-fit
starting set. It ensures a fingerprint (running `imwel scan` itself if missing), targeted-reads the
files the fingerprint points to, and drafts rules/skills into a **named draft box**
`.imwel/drafts/<topic>-<timestamp>/`. It ends with a three-part handoff: the box location, a review
prompt, and the next step (`imwel adopt --from <box>`).

### `imwel-audit` — audit rules for drift

Invoke it to check whether existing rules still match the code. It reads current rules plus
fingerprint-pointed code and writes actionable findings to `.imwel/audit/` (rule ↔ code mismatch,
rule ↔ rule conflict, missing rules). Explicit invocation only — it never hooks your tool session.

### `imwel-adopt` — activate a reviewed draft box

Invoke it (e.g. `/imwel-adopt`) after reviewing a draft box to **render that batch into your tools**.
It is a thin wrapper around `imwel adopt --from <box>`: it locates draft boxes, runs the command,
and explains the health-gate/conflict results. Rendered files are unmanaged. It never renders or
rewrites drafts itself.

### `imwel-create-template` — bootstrap a template repo

Invoke it (e.g. `/imwel-create-template`) to turn the rules already in this project into a shareable
template repo. It runs `imwel template init --from-project` (harvesting only your own artifacts) and
then guides splitting projects, assigning roles, and writing manifest/README.

## The draft → activate loop

```
imwel scan (or auto-run by imwel-extract)
  → run /imwel-extract in your AI tool        # drafts into .imwel/drafts/<box>/
  → review the named draft box
  → /imwel-adopt (or imwel adopt --from <box>) # renders into your tools — LOCAL ACTIVATION
```

Two distinct directions after review:

- **Local activation** — `imwel adopt --from <box>` renders the batch into your tools so the rules
  are active now. The rendered files are **unmanaged**.
- **Packaging / upstream** — `imwel template init --from-project` generates a publishable template
  repo from your artifacts; `imwel propose` selects one remote target and manages contribution
  tracking, then `imwel push` sends the selected changes. Project tracking graduates after a
  matching sync; module tracking remains until explicitly cancelled.
