# Commands

All commands below are implemented in the current CLI. Global option: `--lang <locale>` (`en`, `zh-CN`).

## Overview

| Command | Purpose |
|---------|---------|
| `imwel doctor` | Check Git and environment prerequisites |
| `imwel lint` | Lint a **template** repository |
| `imwel remote add/list/remove/set` | Manage template remotes |
| `imwel template init` | Scaffold a new template repository |
| `imwel adopt` | Consolidate existing scattered tool rules into canonical artifacts |
| `imwel init` | Bind the current directory to a template project |
| `imwel sync` | Pull upstream Artifact updates |
| `imwel status` | Report remote and local drift |
| `imwel rollback` | Restore a prior installed state |
| `imwel push` | Propose local edits upstream (branch + PR by default) |
| `imwel propose <file>` | Register a new Artifact for the next push |

## `imwel doctor`

Checks that system `git` is on `PATH` and other environment prerequisites are met. Run this first on a new machine.

## `imwel lint`

Validates a **template** repository (expects `.imwel/manifest.yaml`, not a consumer binding).

| Flag | Description |
|------|-------------|
| `--strict` | Fail on warnings as well as errors |

- **Errors** — install-breaking (invalid manifest, missing project path, skill without `SKILL.md`, path escape, …).
- **Warnings** — style / best practice (skill `description` quality, **empty/placeholder rules**, …).

> Template-side lint only flags **empty/placeholder** rules. Orphan-reference and dead-import checks are skipped here because template rules reference the *consumer's* files (absent in the template repo); those run consumer-side in `imwel status`.

In a consumer binding, the CLI directs you to the template repo instead of reporting a fake clean result. See [Lint & quality bar](../author/lint.md).

## `imwel remote`

| Subcommand | Description |
|------------|-------------|
| `add <url>` | Register a template remote; the local alias is derived from the URL |
| `add <alias> <url>` | Register a template remote with an explicit alias (backward-compatible) |
| `list` | List remotes |
| `remove <alias>` | Remove a remote (`-y` / `--yes` skips confirmation) |
| `set <alias>` | Update remote options |

| Flag | Description |
|------|-------------|
| `--as <alias>` (on `add`) | Override the alias derived from the URL (single-URL form) |
| `--direct-push` (on `add`) | Allow direct push to the bound branch (opt-in; not the default) |
| `--direct-push [value]` (on `set`) | Enable or disable direct push |

When you pass only a URL, imwel derives the alias from the repo name (falling back to `owner-repo`, then a numeric suffix on collision) and prints the chosen alias.

Default upstream path remains **branch + PR/MR**.

## `imwel template init`

Scaffolds a new template repository (manifest, example project, author `AGENTS.md`, Cursor slash commands / skills).

| Flag | Description |
|------|-------------|
| `--dir <path>` | Target directory |
| `--locale <locale>` | Scaffold locale (`en`, `zh-CN`, …) |
| `--name <name>` | Repository name (defaults to the directory name; only asked interactively when you opt into creating a remote repo) |
| `-y` / `--yes` | Skip confirmation prompts (non-interactive defaults) |

## `imwel adopt`

Scans the current project for existing tool-native rule/skill files across all 14 adapters (`.cursor/rules`, `CLAUDE.md`, `.trae/rules`, `AGENTS.md`, `.github/copilot-instructions.md`, `CONVENTIONS.md`, …), reverse-parses them into canonical Artifacts, and writes them under `.imwel/adopted/`. Solves the cold-start problem and consolidates rules that drifted apart across tools.

- **Identical content** across tools is merged into one canonical Artifact (silent dedupe).
- **Conflicting content** is reported per artifact and **skipped** — nothing is overwritten; resolve and re-run.
- Runs **without a binding or remote**; only reads the scanned files (never modifies them).

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip the write confirmation (does not invent conflict resolutions) |
| `--out <path>` | Output directory (default `.imwel/adopted`) |
| `--tools <csv>` | Limit consolidation to specific tool ids |

After adopting, review the artifacts, then run `imwel template init` to publish them as a template, or `imwel init` + `imwel propose` to feed a remote.

## `imwel scan`

Deterministically fingerprints the project (no LLM, no network, read-only) into `.imwel/fingerprint.yaml`. The fingerprint is a **map of where to look**, not conclusions: language mix (by extension count), manifest/build files, test/lint/format/CI configs, top-level directories, DB schema/migration files, and the locations of scattered tool-native rule files (via the same discovery adapters as `imwel adopt`).

It only inspects file names and paths — never file contents — and skips heavy directories (`node_modules`, `.git`, `dist`, …). Output is stably sorted and reproducible (apart from the timestamp).

| Flag | Description |
|------|-------------|
| `--out <path>` | Output path (default `.imwel/fingerprint.yaml`) |

The fingerprint is **not** a managed artifact — it never participates in `sync`/drift. It is meant to be fed to your AI coding tool (or the first-party `imwel-extract` skill below) to draft project-fit rules.

## `imwel skill install`

Installs imwel's own **first-party** skills (shipped with the npm package) into your selected tools, rendering them through the same adapters as template artifacts (skill fidelity ladder + dedupe). Bundled skills:

- `imwel-extract` — drafts project-fit rules/skills from scratch using the scan fingerprint.
- `imwel-audit` — audits existing rules for semantic drift (rule ↔ code mismatch, rule ↔ rule conflict, missing rules) and writes actionable suggestions to `.imwel/audit/`.

| Flag | Description |
|------|-------------|
| `--tools <csv>` | Target tool ids (required in non-interactive mode) |
| `-y` / `--yes` | Skip the write confirmation |

First-party skills are **unmanaged**: they are written to disk but not registered in your binding, not committed to `.imwel/history/`, and never tracked by `status`/`sync`/`push`.

Workflow: run `imwel scan`, then `imwel skill install`, then invoke a skill inside your AI tool:

- `imwel-extract` reads `.imwel/fingerprint.yaml`, targeted-reads the key files, and drafts rules/skills into `.imwel/drafts/`.
- `imwel-audit` reads your current rules plus the fingerprint-pointed code and writes drift findings + suggested wording into `.imwel/audit/`.

Both only write to isolated review folders — you then consolidate with `imwel adopt` or register with `imwel propose`. Audits are explicit skill invocations; imwel never hooks your AI tool's session.

## `imwel init`

Binds the current directory to one remote template repository and installs Artifacts for selected tools. A binding can hold **at most one writable project** (`role: project`) plus any number of **read-only modules** (`role: shared`) — see [Manifest › project roles](./manifest.md#project-roles-modules-vs-projects). Interactive selection uses a toggle → diff → second-confirm flow for tools and modules.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip confirmation prompts (**does not** invent selections) |
| `--tools <csv>` | Comma-separated target tool ids (e.g. `cursor,claude-code,codex,trae`) |
| `--remote <alias>` | Remote alias (auto-selected when only one remote is configured, so it can be omitted) |
| `--branch <name>` | Branch name |
| `--project <name>` | Writable project name (`role: project`; **at most one**) |
| `--module <csv>` | Read-only module names (`role: shared`) to install |
| `--optional <csv>` | Optional Artifact source paths to install |
| `--no-optional` | Install no optional Artifacts |

At least one of `--project` or `--module` must select something. Re-running `imwel init` on a bound directory **rebinds**: the whole selection (tools, modules, writable project) is replaced, so local edits to previously-installed Artifacts are overwritten. Non-interactive mode requires selection flags; missing required flags exit with code **1**.

## `imwel modules`

Adjusts the read-only modules installed in the current binding without touching the writable project. Interactive mode lists every module the branch declares (`role: shared`), pre-checks the installed ones, and applies changes only after a diff + second confirmation.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip confirmation prompts (**does not** invent selections) |
| `--add <csv>` | Module names to install |
| `--remove <csv>` | Module names to uninstall (removes their rendered files) |
| `--freeze <csv>` | Installed module names to freeze (stop syncing, keep the local copy) |
| `--unfreeze <csv>` | Installed module names to unfreeze |

Newly added modules install their **required** Artifacts only; run `imwel sync` afterwards to pull the latest content. To add a module's optional Artifacts, rebind via `imwel init`.

## `imwel sync`

Fetches upstream and applies Artifact updates (with conflict handling via the history repo). Walks every bound project; **frozen** modules are skipped.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip apply confirmation |
| `--continue` | Continue after manual conflict resolution |

Always force-refreshes remote state (not subject to the passive fetch throttle).

**Read-only module drift.** Modules are pull-only, so imwel never silently overwrites local edits to a module's files. When a subscribed module has local edits, `imwel sync` asks you to choose per module: **discard** local edits and take upstream, **freeze** the module (stop syncing, keep your local copy), or **uninstall** it. Non-interactive `--yes` defaults to **freeze** — it never destroys local edits without consent.

## `imwel status`

Reports remote vs local drift. Always force-refreshes. After drift, it runs a **rule health** check over the managed rendered files and lists any issues (this never changes the exit code):

- **empty** — rule has no meaningful content (empty or placeholder-only).
- **dead-import** — a `@path` import points to a missing file.
- **orphan-ref** — a backtick path (e.g. `` `src/foo.ts` ``) references a file that no longer exists.

The checks are deterministic and conservative (no LLM, globs/URLs/commands are ignored) — advisory hints, not blockers.

## `imwel rollback`

Restores a prior install recorded under `.imwel/history/`.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip confirmation |
| `--to <sha>` | History commit SHA to restore |

After restore, imwel **deletes managed files that were added after that history point**. Unmanaged files are never deleted.

## `imwel push`

Reverse-renders local tool files back to canonical Artifacts and opens an upstream proposal (branch + PR/MR by default). Reverse-renders **every** bound tool that has installed paths; conflicting canonical content fails the push. Only artifacts from the **writable project** are eligible — local edits to read-only modules are never pushed. To contribute back to a module deliberately, use [`imwel propose`](#imwel-propose-file) against that module (a reviewed PR/MR), which is allowed.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip confirmation |
| `--all` | Select all push candidates |
| `--message <msg>` | Commit message |

## `imwel propose <file>`

Registers a new Artifact path for the next `push` (validates against manifest conventions).

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip confirmation |
| `--remote <alias>` | Target remote |
| `--project <name>` | Target manifest project |
| `--type <type>` | `rule`, `skill`, or `agents` |
| `--optional` / `--required` | Optional vs required Artifact |
| `--tool <id>` | Source tool adapter for reverse-render |

## Non-interactive / CI

`-y` / `--yes` skips **confirmation** prompts only. It never invents answers for selection prompts — pass `--tools`, `--remote`, `--project`, `--to`, `--all`, etc. explicitly.

```bash
imwel init -y --tools cursor,claude-code --remote org-standards --branch main \
  --project my-app --no-optional

imwel sync --yes
imwel push --yes --all --message "chore: update artifacts"
imwel rollback --yes --to <history-sha>
imwel propose rules/new-rule.md -y --remote org-standards --project my-app \
  --type rule --required --tool cursor
```

## Environment

| Variable | Description |
|----------|-------------|
| `IMWEL_FETCH_THROTTLE_MS` | Override global passive fetch throttle (default 4h). Invalid values fall back to default. Per-remote throttle is not supported. `sync` / `status` always force-refresh. |

## Next

- Consumer workflow → [Install a template](../consume/quickstart.md)
- Author workflow → [Author a template](../author/quickstart.md)
- Safety defaults and Git model → [Architecture](./architecture.md)
- Developing the CLI itself → [CONTRIBUTING.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.md)
