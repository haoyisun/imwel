# Usage guide

This is the task-oriented, end-to-end guide to using imwel. It walks you from install to daily
workflows. For the exhaustive per-flag reference, see [Commands](./commands).

## What imwel is

imwel is a **Git-native CLI** that distributes AI coding rules, skills, and agent instructions
across teams and tools. There is no backend, no database, and no hosted platform:

- **Git is the database** — content identity, versioning, and history come from Git objects.
- **The Git host is governance** — permissions and review happen via GitHub/GitLab/Gitea PRs.
- A **template repository** is any ordinary Git repo that follows imwel's manifest convention and
  holds Artifacts (rules, skills, `agents.md` content).

See [Architecture](./architecture) for the full rationale.

## Install & prerequisites

You need Node.js ≥ 18.18 and the system `git` binary on your PATH.

```bash
# One-off, no install:
npx imwel@latest <command>

# Or install globally:
npm install -g imwel
imwel doctor   # verify git + environment prerequisites
```

Run `imwel doctor` first if anything looks off — it reports missing prerequisites with a concrete
next step.

## Core concepts

| Concept | Meaning |
|---------|---------|
| **Template repo** | A Git repo with `.imwel/manifest.yaml` listing one or more *projects* and their Artifacts. |
| **Artifact** | A rule (`agents.md`-flavored Markdown), a skill (a `SKILL.md` bundle), or agent instructions. |
| **Binding** | A consumer directory's `.imwel/binding.yaml` linking it to one project in one remote template repo. |
| **Adapter** | A per-tool renderer (Cursor, Claude Code, Codex, …) that writes Artifacts into that tool's native format. |
| **Drift** | Divergence between the remote template, your last sync, and your on-disk files — detected via Git. |

## Consumer workflow (using a team's rules)

You are a developer who wants your team's rules installed into your AI tools.

1. **Register the template remote** (once per machine):

```bash
imwel remote add org-standards git@github.com:example/imwel-templates.git
```

2. **Bind your project and install Artifacts:**

```bash
cd your-project
imwel init            # pick tools, remote, branch, project interactively
```

`imwel init` renders the selected project's Artifacts into each chosen tool's native location and
records a binding. It also creates a hidden history repo under `.imwel/history/`.

3. **Pull upstream updates:**

```bash
imwel sync            # preview added/removed/modified files, then confirm
```

Non-overlapping local edits and upstream changes are merged automatically; overlapping changes get
standard Git conflict markers for you to resolve, then `imwel sync --continue`.

4. **Check state at any time:**

```bash
imwel status          # remote vs local drift + deterministic rule-health checks
```

5. **Undo an unwanted update:**

```bash
imwel rollback        # restore a prior state from .imwel/history/
```

6. **Contribute local edits back:**

```bash
imwel push            # reverse-render local tool files → canonical, open a branch + PR/MR
imwel propose <file>  # register a brand-new artifact for the next push
```

Upstream contribution defaults to **branch + PR/MR**, never a direct commit to a shared branch.

## Template author workflow (publishing rules)

You maintain the rules your team consumes.

1. **Scaffold a template repo:**

```bash
imwel template init   # manifest, example project, author AGENTS.md, Cursor slash commands
```

2. **Edit Artifacts** under the paths declared in `.imwel/manifest.yaml`
   (see [Manifest](./manifest) and [Example template](./example-template)).

3. **Validate before publishing:**

```bash
imwel lint            # errors = install-breaking; warnings = style/best-practice
imwel lint --strict   # fail on warnings too (good for CI)
```

See [Template authoring](/en/template-authoring) for the full authoring reference.

## Cold start & keeping rules fresh

Even without a template, imwel helps you bootstrap and maintain rules.

- **Adopt scattered rules** you already have across tools into canonical artifacts:

```bash
imwel adopt           # consolidates .cursor/rules, CLAUDE.md, AGENTS.md, … into .imwel/adopted/
```

- **Fingerprint the project** (deterministic, no LLM) as a map for AI rule authoring:

```bash
imwel scan            # writes .imwel/fingerprint.yaml
```

  When the project is a Git repository, `scan` also mines a **Git-history overlay** into the
  fingerprint's optional `history` section: change **hotspots** (files that change most often) and
  **co-changes** (files that keep changing together) — the places most worth writing rules about.
  This layer is additive and degrades gracefully:

  - **Full** — a repo with enough commits: complete history signals (`confidence: normal`).
  - **Low-confidence** — a new or shallow repo with few commits: signals present but marked
    `confidence: low` (treat as hints, not facts).
  - **None** — no `.git` or no commits: history is skipped (`available: false`), the file-tree
    fingerprint is still produced, and `scan` suggests running `git init` for richer signals.

  `scan` prints which level applied. History mining is read-only, shells out to your system `git`,
  and never runs unless you invoke `imwel scan` — it is not tied to any AI tool session.

- **Install imwel's first-party skills** into your tools, then invoke them in your AI tool:

```bash
imwel skill install   # installs imwel-extract and imwel-audit (unmanaged)
```

  - `imwel-extract` drafts project-fit rules from the fingerprint into `.imwel/drafts/`. It uses
    the Git-history overlay (change hotspots as rule candidates, co-changes as cross-file hints)
    and follows an authoring standard — progressive disclosure, short rules with do/don't
    examples, precise triggerable descriptions — then self-checks the drafts before handing back.
  - `imwel-audit` audits existing rules for semantic drift (rule↔code, rule↔rule, missing rules)
    into `.imwel/audit/`. A hotspot with no rule is treated as a strong missing-rule signal; when
    history is unavailable/low-confidence it falls back to pure rule↔code / rule↔rule analysis.

- **Rule health** is reported automatically by `imwel status` (empty rules, dead imports, orphan
  path references) and by `imwel lint` (empty/placeholder rules).

- **Adopt reviewed AI drafts** from `.imwel/drafts/` (written by `imwel-extract`) into canonical
  artifacts, with a deterministic quality gate applied before writing:

```bash
imwel adopt --from            # adopts .imwel/drafts (or --from <dir> to override)
```

  Rule-health checks (empty rules, dead imports, orphan path references) run over the drafts and
  their count is shown in the confirmation prompt — nothing is written silently. In a
  non-interactive shell you must pass `-y` to confirm.

The typical maintenance loop: `imwel scan` → run `imwel-extract`/`imwel-audit` in your AI tool →
review the drafts → `imwel adopt --from` (or `imwel propose`) → `imwel push`.

## Troubleshooting

| Symptom | What to do |
|---------|-----------|
| `no git binary found on PATH` | Install Git, then re-run `imwel doctor`. |
| `imwel status` reports a fake clean result in a template repo | You are in a template repo, not a consumer binding — use `imwel lint` instead. |
| `imwel sync` left conflict markers | Resolve the `<<<<<<<`/`=======`/`>>>>>>>` markers by hand, then `imwel sync --continue`. |
| A command needs input in CI | Pass the required selection flags (e.g. `--tools`, `--remote`, `--branch`, `--project`) and `-y`. |
| First-party skill files show up in `imwel status` | They should not — first-party skills are unmanaged. Re-run `imwel skill install` from the latest version if you see tracking. |

For every command's exact flags and exit codes, see [Commands](./commands).
