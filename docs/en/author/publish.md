# Publish & maintain

> **Author path · Step 3 of 3** — Prerequisites: [Author a template](./quickstart.md), [Lint & quality bar](./lint.md).

## Publishing is plain Git

There is **no `imwel publish`**. You publish a template by pushing the repo to a Git host with ordinary `git` — the Git host is the distribution and governance layer.

```bash
git init && git add . && git commit -m "initial template"
git remote add origin <git-host-url>
git push -u origin main             # ← publishing is plain git
```

`imwel template init` can optionally create the remote repo for you (via `gh` / `glab`) during scaffolding; otherwise create it on your Git host and push as above.

## Let consumers register it

Consumers then add your repo as a remote and bind their projects:

```bash
imwel remote add <git-host-url>     # on the consumer's machine
```

See the [Consumer path](../consume/quickstart.md) for their side.

## Maintenance loop

```
edit artifacts → imwel lint → git commit → git push
```

Consumers pick up changes on their next `imwel sync`. Governance (who may merge) is controlled by your Git host's permissions and branch protection, not by imwel.

## Cursor-first author UX

`imwel template init` scaffolds a root `AGENTS.md`, `.cursor/rules` + `.cursor/skills` (template-author and consumer packs), and `.cursor/commands/imwel-author.md` / `imwel-lint.md`. Primary loop: `/imwel-author` → edit Artifacts → `imwel lint` → host PR/MR. Detection and `imwel lint` are tool-agnostic — Claude Code (or others) can add `.claude/` skills later, but should still shell out to `imwel lint` rather than duplicating rules.

## Next

- Draft rules from an existing codebase → [Draft rules from your codebase](./from-codebase.md)
- Manifest reference → [Manifest](../guide/manifest.md)
- Contribute a new render target → [Adapters](../contribute/adapters.md)
