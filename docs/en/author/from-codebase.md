# Draft rules from your codebase

> **Author path** — Cold start & rule freshness. Prerequisites: [Install & prerequisites](../getting-started/install.md). Useful whether or not you already have a template repo.

Even without a template, imwel helps you bootstrap and maintain rules from a real project.

## Consolidate scattered rules

Pull rules you already have across tools into canonical Artifacts:

```bash
imwel adopt           # consolidates .cursor/rules, CLAUDE.md, AGENTS.md, … into .imwel/adopted/
```

Identical content across tools is merged; cross-tool conflicts are reported and skipped (nothing is overwritten). Runs without a binding or remote. See [`imwel adopt`](../guide/commands.md#imwel-adopt).

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

## Adopt reviewed drafts

```bash
imwel adopt --from            # adopts .imwel/drafts (or --from <dir> to override)
```

A deterministic quality gate (empty rules, dead imports, orphan path references) runs over the drafts and its issue count is shown in the confirmation prompt — nothing is written silently. Non-interactive shells require `-y`.

## The maintenance loop

```
imwel scan → run imwel-extract / imwel-audit in your AI tool → review drafts →
imwel adopt --from (or imwel propose) → imwel push
```

## Next

- Turn adopted artifacts into a template → [Author a template](./quickstart.md)
- Publish & maintain → [Publish & maintain](./publish.md)
