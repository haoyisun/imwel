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
