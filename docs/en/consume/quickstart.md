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

## 2. Bind your project and install Artifacts

```bash
cd your-project
imwel init            # pick tools, branch, project interactively
```

If you have only one remote configured, `imwel init` selects it automatically (no `--remote` needed); with several, you pick interactively or pass `--remote <alias>`.

`imwel init` renders the selected project's Artifacts into each chosen tool's native location (see [Adapters](../contribute/adapters.md)), records a [binding](../concepts/glossary.md), and creates a hidden history repo under `.imwel/history/`.

For CI / non-interactive use, pass the selection flags explicitly — see [Non-interactive / CI](../guide/commands.md#non-interactive-ci).

## Next

- Keep your rules current and undo bad updates → [Sync, drift & rollback](./sync-and-drift.md)
- Full flag reference → [`imwel init`](../guide/commands.md#imwel-init)
