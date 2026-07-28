# Draft rules from your codebase

> **Author path** — Cold start & rule freshness. Prerequisites: [Install & prerequisites](../getting-started/install.md). Useful whether or not you already have a template repo.

Even without a template, imwel helps you bootstrap and maintain rules from a real project.

## Harvest rules you already have

Already have rules scattered across your tools? Turn them into a shareable template repo in one step with [`imwel template init --from-project`](#generate-a-template-repo-from-this-project) (below). It harvests only your own artifacts and skips imwel's and other tools' files.

## Fingerprint the project

Build a deterministic, LLM-free map of the project for AI rule authoring:

```bash
imwel scan            # writes .imwel/fingerprint.yaml
```

When the project is a Git repository, `scan` also mines a **Git-history overlay** into the fingerprint's optional `history` section: change **hotspots** (files that change most often) and **co-changes** (files that keep changing together) — the places most worth writing rules about. This layer is additive and degrades gracefully:

- **Full** — a repo with enough commits: complete history signals (`confidence: normal`).
- **Low-confidence** — a new or shallow repo with few commits: signals present but marked `confidence: low` (hints, not facts).
- **None** — no `.git` or no commits: history is skipped (`available: false`), the file-tree fingerprint is still produced, and `scan` suggests running `git init`.

`scan` prints which level applied. History mining is read-only, shells out to system `git`, and runs only when you invoke `imwel scan` — it is not tied to any AI tool session. See [`imwel scan`](../guide/commands.md#imwel-scan).

## Draft & audit with first-party skills

Install imwel's own skills into your tools, then invoke them inside your AI tool:

```bash
imwel skill install   # installs imwel-extract and imwel-audit (unmanaged)
```

- `imwel-extract` drafts project-fit rules from the fingerprint into `.imwel/drafts/`. It uses the Git-history overlay (hotspots as rule candidates, co-changes as cross-file hints) and follows an authoring standard — progressive disclosure, short rules with do/don't examples, precise triggerable descriptions — then self-checks before handing back.
- `imwel-audit` audits existing rules for semantic drift (rule↔code, rule↔rule, missing rules) into `.imwel/audit/`. A hotspot with no rule is a strong missing-rule signal; when history is unavailable/low-confidence it falls back to pure rule↔code / rule↔rule analysis.

First-party skills are **unmanaged**: written to disk but never tracked by the binding, history, or `sync`/`status`/`push`.

## Activate reviewed drafts

`imwel-extract` writes each batch into a named draft box `.imwel/drafts/<topic>-<timestamp>/`. Once you have reviewed a box, render it into your tools:

```bash
imwel adopt --from .imwel/drafts/<box>    # renders the batch into your tools (unmanaged)
```

A deterministic quality gate (empty rules, dead imports, orphan path references) runs first and its issue count is shown in the confirmation — nothing is written silently (non-interactive shells with issues are refused). The rendered files are **unmanaged** (not tracked by sync/status/push). You can also invoke the `imwel-adopt` skill inside your AI tool, which wraps this command. See [`imwel adopt`](../guide/commands.md#imwel-adopt) and [In-tool skills & commands](../guide/in-tool-skills.md).

## Generate a template repo from this project

Once your project has the rules you want (adopted, or already scattered across tools), turn them into a shareable template repository in one step:

```bash
imwel template init --from-project      # harvests your own artifacts into a skeleton
```

It harvests only **your** artifacts — imwel's own command pack and other tools' installed files (e.g. openspec) are excluded via artifact provenance and printed as skipped. The skeleton lands in a unique `.imwel/generated-templates/<topic>-<timestamp>/` dir (or `--dir`), with `.imwel/manifest.yaml`, the harvested `rules`/`skills`/`agents.md`, and scaffolded `/imwel-author` + `/imwel-lint`. For the semantic organization — splitting projects, assigning roles, writing README — invoke the `/imwel-create-template` skill in your AI tool, then validate with `imwel lint` in the generated dir. See [`imwel template init --from-project`](../guide/commands.md#imwel-template-init-from-project).

## The maintenance loop

```
imwel scan (or auto-run by imwel-extract) → run imwel-extract / imwel-audit in your AI tool →
review the named draft box → imwel adopt --from <box>   # local activation
```

Two directions after review: **local activation** (`imwel adopt` renders into your tools, unmanaged) vs. **packaging / upstream** (`imwel template init --from-project` to publish a template, or `imwel propose` + `imwel push` to contribute to a remote).

## Next

- Turn adopted artifacts into a template → [Author a template](./quickstart.md)
- Publish & maintain → [Publish & maintain](./publish.md)
