# How to manage template remotes

Want to register the team template repo, give it a memorable alias, or let a personal remote accept direct pushes — without editing the binding by hand?

**What you get:** a small set of `imwel remote` commands that keep template-repo URLs and their local aliases in `~/.imwel/config.yaml`. `imwel init` and `imwel push` read these aliases, so you never paste a URL twice or risk pushing to the wrong repo.

## Prerequisites

- [Install imwel](./install.md)
- The URL of at least one template repository (HTTPS or SSH, whatever your Git credentials already handle)

## Steps

### 1. Register a remote

```bash
imwel remote add git@github.com:YOUR_ORG/team-standards.git
```

Pass only a URL and imwel derives the alias from the repo name (`team-standards` here). It prints the chosen alias so you can reference it next.

Prefer your own alias? Two equivalent forms:

```bash
imwel remote add team git@github.com:YOUR_ORG/team-standards.git   # alias first
imwel remote add git@github.com:YOUR_ORG/team-standards.git --as team  # alias flag
```

**What you get from an alias:** `imwel init --remote team` and `imwel push` refer to a short, stable name — if the URL ever moves, you fix it in one place with `remote set`, and every binding keeps working.

### 2. List remotes

```bash
imwel remote list
```

Shows each alias, its URL (normalized), and whether direct push is allowed. Only aliases are displayed — never credential-bearing secrets.

### 3. Remove a remote

```bash
imwel remote remove team
```

`-y` / `--yes` skips the confirmation. Removing a remote does **not** delete any binding or local file — it only drops the alias from your global list.

### 4. Toggle direct push (opt-in, per remote)

By default every remote pushes via **branch + PR/MR** — the Git host's branch protection governs review. For a single-user personal remote you may opt into direct push:

```bash
imwel remote set team --direct-push true   # allow direct push to the bound branch
imwel remote set team --direct-push false  # back to branch + PR (default)
```

**Why this is opt-in:** direct push bypasses PR review, so it stays off by default to protect shared branches. Turn it on only for remotes where you are the sole writer.

## Expected result

- `imwel remote list` shows your registered aliases
- `imwel init --remote <alias>` binds a directory without you re-typing the URL
- Push defaults to branch + PR; direct push only where you explicitly allowed it

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `add` rejected: URL already registered under another alias | Use the existing alias it reports, or `remote remove` the old one first. imwel dedupes by normalized URL to prevent double mappings. |
| `add` seems to hang | It shows a spinner during the clone/fetch that builds the local cache. On a large repo the first fetch can take a bit. |
| `init` says remote not found | Run `imwel remote list`; the alias is case-sensitive and must match. |
| Direct push still opens a PR | `--direct-push` is per-remote; set it on the remote you actually push to, not a different one. |

## Related

- [Consume for Cursor](./consume-for-cursor.md) · [Claude Code](./consume-for-claude-code.md)
- [Push via PR](./push-via-pr.md)
- [Commands — remote](../reference/commands.md)
