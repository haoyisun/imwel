# Draft rules from your codebase

> **Author path** — Cold start & rule freshness. Prerequisites: [Install & prerequisites](../getting-started/install.md). Useful whether or not you already have a template repo.

You have a real project and want AI coding rules for it. imwel gives you two surfaces to do that, and this page walks the workflow end to end.

## Two surfaces you'll use

| Surface | Where | What |
|---------|-------|------|
| **imwel CLI** | your terminal | `imwel scan`, `imwel skill install`, `imwel adopt`, `imwel template init` |
| **Slash commands** | your AI tool's chat | `/imwel-extract`, `/imwel-audit`, `/imwel-adopt`, `/imwel-create-template` |

The slash commands are thin wrappers installed by `imwel skill install` — they call the CLI commands for you from inside the AI tool's chat. Use whichever surface you prefer; the steps below label each one `(terminal)` or `(slash command)`.

All first-party pack files and the rules rendered by `imwel adopt` are **unmanaged**: written to disk but never tracked by `sync` / `status` / `push`.

## The workflow at a glance

```
imwel scan (terminal)            # fingerprint the project
  → /imwel-extract (slash)       # draft rules into .imwel/drafts/<box>/
  → review the draft box
  → imwel adopt --from <box>     # local activation (terminal)
                                 # or /imwel-adopt (slash)
```

Two entry points:

- **A. Cold start** — your project has few or no rules. Walk the full loop above.
- **B. Already have scattered rules** — skip drafting; harvest them straight into a template repo with `imwel template init --from-project`.

## A. Cold-start: draft rules from scratch

### 1. Fingerprint the project (terminal)

```bash
imwel scan            # writes .imwel/fingerprint.yaml
```

A deterministic, LLM-free map of the project (language mix, manifest/build files, test/lint/CI configs, where scattered tool-rule files live). When the project is a Git repo, `scan` adds an optional `history` overlay — change hotspots and co-changes — that degrades gracefully from `normal` to `low` to `none` depending on commit count. `scan` prints which level applied. See [`imwel scan`](../guide/commands.md#imwel-scan).

### 2. Install the first-party skills (terminal, once)

```bash
imwel skill install   # installs /imwel-extract and /imwel-audit
```

Installs imwel's command pack into your tools: a `/imwel-*` slash command plus its backing skill for tools with a command mechanism, skill-only otherwise. See [`imwel skill install`](../guide/commands.md#imwel-skill-install) and [In-tool skills & commands](../guide/in-tool-skills.md).

### 3. Draft rules in your AI tool (slash command)

```
/imwel-extract
```

Reads the fingerprint (running `imwel scan` itself if missing), targeted-reads the files it points to, and drafts project-fit rules into a **named draft box** `.imwel/drafts/<topic>-<timestamp>/`. It ends with a three-part handoff: the box location, a review prompt, and the next step. See [In-tool skills & commands](../guide/in-tool-skills.md).

### 4. Review the draft box

Open `.imwel/drafts/<box>/`, read the drafts, edit or delete what you don't want. Nothing is rendered into your tools yet.

### 5. Activate reviewed drafts

Two directions, each available from both surfaces:

| Direction | Terminal | Slash command |
|-----------|----------|---------------|
| **Local activation** — render the batch into your tools now | `imwel adopt --from <box>` | `/imwel-adopt` |
| **Packaging / upstream** — turn your artifacts into a publishable template repo | `imwel template init --from-project` | `/imwel-create-template` |

`imwel adopt` runs a deterministic health gate (empty rules, dead imports, orphan path references) before writing; the issue count is shown and nothing is written silently. See [`imwel adopt`](../guide/commands.md#imwel-adopt) and [`imwel template init --from-project`](../guide/commands.md#imwel-template-init-from-project).

## B. Already have scattered rules: harvest into a template repo

If your project already has rules spread across tool directories (or you've just drafted and adopted them), turn them into a shareable template repo in one step:

```bash
imwel template init --from-project      # harvests your own artifacts into a skeleton
```

It harvests only **your** artifacts — imwel's own command pack and other tools' installed files (e.g. openspec) are excluded via artifact provenance and printed as skipped. The skeleton lands in `.imwel/generated-templates/<topic>-<timestamp>/` (or `--dir`), with `.imwel/manifest.yaml`, the harvested `rules`/`skills`/`agents.md`, and scaffolded `/imwel-author` + `/imwel-lint`. For the semantic organization — splitting projects, assigning roles, writing README — invoke `/imwel-create-template` in your AI tool, then validate with `imwel lint` in the generated dir.

## Keep rules fresh

As the codebase evolves, re-run the loop:

```
imwel scan → /imwel-extract (draft new rules) → review → imwel adopt
/imwel-audit (audit existing rules for drift) → fix in source → re-adopt
```

`/imwel-audit` checks rule↔code mismatch, rule↔rule conflict, and missing rules (a hotspot with no rule is a strong missing-rule signal), writing findings to `.imwel/audit/`. Explicit invocation only — imwel never hooks your AI tool's session. See [In-tool skills & commands](../guide/in-tool-skills.md).

## Next

- Turn adopted artifacts into a template → [Author a template](./quickstart.md)
- Publish & maintain → [Publish & maintain](./publish.md)
- Validate before publishing → [Lint & quality bar](./lint.md)
