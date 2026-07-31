# Author vs consumer

imwel has two lifecycles. Mixing them up is the most common source of “wrong directory” confusion.

## Consumer

You work in an **application** (or package) directory. You want team rules on disk for Cursor, Claude Code, etc.

- State file: `.imwel/binding.yaml`
- Day-to-day: `init` → `sync` / `status` → optional `propose` / `push`
- You do **not** edit the remote template’s `manifest.yaml` in place from here

Start: [Consume for Cursor](../how-to/consume-for-cursor.md) or [Quick Start](../tutorials/quick-start.md).

## Author

You maintain the **template repository** — the Git source of truth.

- State file: `.imwel/manifest.yaml` (and **no** consumer binding at the template root)
- Day-to-day: edit Artifacts → `imwel lint` → commit → PR on the Git host
- Publishing is plain Git, not an imwel “publish” command

Start: [Create a template repo](../how-to/create-template-repo.md).

## Why both

Teams need one place to review rules like code (author), and many checkouts that render those rules into divergent tool formats (consumer). imwel is the thin distribution layer between them — Git remains the database and the host remains governance.

## Monorepos

Bindings are **per directory**. Run `imwel init` in each sub-project that should consume a template project. There is no special monorepo mode.

## Artifact provenance & ownership

When imwel looks at a file on disk, it needs to know **who owns it** before it will touch it. Every renderable file carries one of four provenance tags:

| Tag | Meaning | What imwel does with it |
|-----|---------|--------------------------|
| `USER` | Authored by you (your tool-native rule, or a draft you adopted) | Eligible for `propose` / `push` / `--from-project` harvest |
| `MINE` | Installed and managed by *your* binding | Tracked by `sync`/`status`; pushable as a binding-owned edit |
| `FOREIGN` | Installed by a *different* tool/binding, not yours | Left alone — never overwritten, never pushed by you |
| `generatedBy: imwel` | imwel's own command pack (`imwel-*` skills) | Unmanaged; skipped by `sync`/`status`/`push` |

### Why this matters

- **`imwel propose` excludes `MINE` / `FOREIGN`** — you only propose artifacts you actually authored (`USER`), so you can't accidentally push someone else's managed install or a foreign tool's file.
- **`imwel template init --from-project` harvests only `USER`** — it excludes imwel's own command pack and other tools' installed artifacts, and prints what it excluded and why. So the generated template skeleton contains only your rules, not a copy of imwel itself.
- **`imwel adopt` writes are unmanaged** — adopted drafts land as `USER`-style files that don't enter the binding, so trying drafts locally can never corrupt team state.

The rule of thumb: imwel never silently overwrites or pushes a file it didn't author or wasn't asked to manage. Provenance is the label that enforces that.
