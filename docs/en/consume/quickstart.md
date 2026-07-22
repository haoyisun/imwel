# Install a template

> **Consumer path · Step 1 of 3** — Prerequisites: [Install & prerequisites](../getting-started/install.md). For authoring rules instead, see the [Author path](../author/quickstart.md).

You are a developer who wants your team's rules installed into your AI tools. This page is the canonical getting-started sequence for consumers.

## 1. Register the template remote

Do this once per machine. Pass just the URL — imwel derives a local alias from it:

```bash
imwel remote add git@github.com:example/imwel-templates.git   # alias derived (e.g. "imwel-templates")
```

Prefer an explicit alias? Use the two-argument form or `--as`:

```bash
imwel remote add org-standards git@github.com:example/imwel-templates.git
# or: imwel remote add git@github.com:example/imwel-templates.git --as org-standards
```

See [`imwel remote`](../guide/commands.md#imwel-remote) for all subcommands.

You can register **several** remotes (e.g. one company-wide standards repo and one team repo); each `imwel remote add` just adds another alias. A binding, however, points at exactly one remote — `imwel init` picks which one.

## 2. Bind your project and install Artifacts

```bash
cd your-project
imwel init            # pick tools, branch, modules + writable project interactively
```

If you have only one remote configured, `imwel init` selects it automatically (no `--remote` needed); with several, you pick interactively or pass `--remote <alias>`.

A binding can install two kinds of things from the remote:

- **Read-only modules** (`role: shared`) — reusable standards (e.g. a Python or Vue 3 pack) you install and keep in sync but don't push edits back to. Install any number of them.
- **One writable project** (`role: project`) — your own project's Artifacts, which you can edit and push back with `imwel push`. At most one per directory.

Selection uses a toggle list (space to check/uncheck) that shows an added/removed diff and asks for a second confirmation before applying. `imwel init` renders the selected Artifacts into each chosen tool's native location (see [Adapters](../contribute/adapters.md)), records a [binding](../concepts/glossary.md), and creates a hidden history repo under `.imwel/history/`.

For CI / non-interactive use, pass the selection flags explicitly (`--module`, `--project`) — see [Non-interactive / CI](../guide/commands.md#non-interactive-ci).

## 3. Adjust modules later

Add, remove, or freeze modules without re-binding the whole directory:

```bash
imwel modules         # toggle installed/available modules, review the diff, confirm
```

Removing a module deletes its rendered files. If you've hand-edited a module's files, `imwel sync` won't silently overwrite them — it asks you to **discard**, **freeze** (keep your copy, stop syncing), or **uninstall** that module.

> **Rebinding is a full overwrite.** Re-running `imwel init` on a bound directory replaces the entire selection (tools, modules, writable project). Local edits to previously-installed Artifacts are overwritten. Push anything you want to keep first (`imwel push` / `imwel propose`), or use `imwel modules` for incremental module changes instead.

## Next

- Keep your rules current and undo bad updates → [Sync, drift & rollback](./sync-and-drift.md)
- Full flag reference → [`imwel init`](../guide/commands.md#imwel-init)
