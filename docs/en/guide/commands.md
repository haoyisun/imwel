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
| `imwel tools` | Add or remove AI coding tools without rebinding |
| `imwel sync` | Pull upstream Artifact updates |
| `imwel status` | Report remote and local drift |
| `imwel binding show` | Inspect local binding and contribution tracking offline |
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
| `--no-auto-activate-hooks` | Do not auto-activate `.githooks/` when detected and `core.hooksPath` is unset (prints a hint instead) |

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

`add` rejects a URL that (after normalizing a trailing `.git`/slash and host case) already matches an existing remote's URL under a different alias — it reports the existing alias instead of registering a second mapping. It also shows a spinner for the duration of the clone/fetch that creates the local cache, so the command never appears to hang silently.

Default upstream path remains **branch + PR/MR**.

## `imwel template init`

Scaffolds a new template repository (manifest, example project, author `AGENTS.md`, Cursor slash commands / skills).

| Flag | Description |
|------|-------------|
| `--dir <path>` | Target directory (output dir when `--from-project`) |
| `--locale <locale>` | Scaffold locale (`en`, `zh-CN`, …) |
| `--name <name>` | Repository name (defaults to the directory name; only asked interactively when you opt into creating a remote repo) |
| `--from-project` | Generate a template repo from the current project's existing tool artifacts (see below) |
| `--topic <slug>` | Topic slug for the generated dir name (with `--from-project`) |
| `-y` / `--yes` | Skip confirmation prompts (non-interactive defaults) |

Interactively (after the optional git bootstrap), `imwel template init` offers to scaffold **commit-time lint automation** into the new repo — **on by default** (decline to skip): a committed `.githooks/pre-commit` hook running `imwel lint`, a CI workflow (`.github/workflows/imwel-lint.yml` when `gh` is detected, or `.gitlab-ci.yml` when `glab` is), local `core.hooksPath` activation, and a `CONTRIBUTING.md` activation note. It then offers an optional minimal `package.json` whose `prepare` script auto-activates the hook after a contributor's `npm install` (zero dependency). Accept the default to get all of them; decline to leave the scaffold unchanged. See [Lint & quality bar → Commit-time lint automation](../author/lint.md#commit-time-lint-automation-optional).

### `imwel template init --from-project`

Cold-start a template repository **from a project that already has AI coding rules** scattered across its tool directories (or freshly drafted+adopted). It harvests your **own** artifacts across all adapters, then generates a structurally valid template skeleton into a unique dir (default `.imwel/generated-templates/<topic>-<timestamp>/`, or `--dir`), so repeated runs never overwrite each other.

- Uses **artifact provenance** to harvest only `USER` artifacts — it **excludes** imwel's own command pack (`imwel-*` / `generatedBy: imwel`) and other tools' installed artifacts (e.g. openspec), and prints what was excluded and why.
- Cross-tool content conflicts are reported and skipped (resolve by hand before publishing).
- The skeleton contains `.imwel/manifest.yaml` (one `project`), the harvested `rules/`/`skills/`/`agents.md`, and scaffolded author commands (`/imwel-author`, `/imwel-lint`).
- The deterministic CLI stops at the skeleton; the **semantic** organization (splitting projects, assigning roles, writing README/CONTRIBUTING) is done by the `/imwel-create-template` skill in your AI tool. Validate with `imwel lint` in the generated dir; publishing stays plain `git`.

## `imwel adopt`

Renders a **reviewed draft box** (e.g. one produced by the `imwel-extract` skill) into your AI coding tools' native locations, making those rules/skills active. This is the **local activation** step of the draft loop — it does not produce a canonical staging copy (packaging a template is now [`imwel template init --from-project`](#imwel-template-init-from-project)).

- Runs a deterministic **health gate** (empty rules, dead imports, orphan path references) over the drafts before writing; the issue count is shown in the confirmation and nothing is written silently (non-interactive shells with issues are refused).
- Rendered files are **unmanaged**: not written to the binding, not committed to `.imwel/history/`, never tracked by `status`/`sync`/`push`.
- Render **path conflicts** are reported via the standard dedupe path and never overwrite existing files.

Draft-box resolution:
- `--from <path>` selects a specific box directory (containing `rules/`/`skills/`).
- Bare `imwel adopt` (or `--from`) looks under `.imwel/drafts/`: the flat legacy layout (`rules/`/`skills/` directly) is adopted as-is; with named per-batch boxes, interactive mode lists them to pick, and non-interactive mode requires an explicit `--from .imwel/drafts/<box>`.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip the write confirmation (does not bypass the health gate refusal) |
| `--tools <csv>` | Render target tool ids (default: the binding's tools, else detected tools) |
| `--from [box]` | Draft box to adopt (default `.imwel/drafts`; a path selects a named box) |

In your AI tool you can also invoke the `imwel-adopt` skill, which wraps this command — see [In-tool skills & commands](./in-tool-skills.md). After adopting, the rules are active; to publish them run `imwel template init --from-project`, or feed a remote with `imwel propose`.

## `imwel scan`

Deterministically fingerprints the project (no LLM, no network, read-only) into `.imwel/fingerprint.yaml`. The fingerprint is a **map of where to look**, not conclusions: language mix (by extension count), manifest/build files, test/lint/format/CI configs, top-level directories, DB schema/migration files, and the locations of scattered tool-native rule files (via the same discovery adapters as `imwel adopt`).

It only inspects file names and paths — never file contents — and skips heavy directories (`node_modules`, `.git`, `dist`, …). Output is stably sorted and reproducible (apart from the timestamp).

| Flag | Description |
|------|-------------|
| `--out <path>` | Output path (default `.imwel/fingerprint.yaml`) |

The fingerprint is **not** a managed artifact — it never participates in `sync`/drift. It is meant to be fed to your AI coding tool (or the first-party `imwel-extract` skill below) to draft project-fit rules.

## `imwel skill install`

Installs imwel's own **first-party command pack** (shipped with the npm package) into your selected tools: a slash command **plus** its backing skill for each member, delivered the way openspec delivers its commands. Tools with a native command mechanism (Cursor `.cursor/commands`, Claude Code `.claude/commands`) get both a `/imwel-*` thin command and the backing skill; tools without one degrade to **skill-only** (the command is skipped and reported). Members:

- `imwel-extract` — drafts project-fit rules/skills from scratch using the scan fingerprint.
- `imwel-audit` — audits existing rules for semantic drift (rule ↔ code mismatch, rule ↔ rule conflict, missing rules) and writes actionable suggestions to `.imwel/audit/`.

| Flag | Description |
|------|-------------|
| `--tools <csv>` | Target tool ids (required in non-interactive mode) |
| `-y` / `--yes` | Skip the write confirmation |

In an interactive session inside a bound directory with valid entries in `binding.tools`, the
command first offers to reuse those tools (default: yes). Decline to open the normal tool
multiselect with them preselected. An empty tool list opens the multiselect directly with nothing
preselected. If the binding contains an unsupported tool id, imwel warns which id is invalid and
opens the multiselect directly with the remaining valid tools preselected. An explicit `--tools`
selection and non-interactive behavior are unchanged.

Command-pack files are **unmanaged**: they carry a `generatedBy: imwel` marker, live under the `imwel-*` namespace, are written to disk but not registered in your binding, not committed to `.imwel/history/`, and never tracked by `status`/`sync`/`push`. `imwel init` can install the pack too — opt-in via a prompt, or `--command-pack` / `--no-command-pack`.

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
| `--command-pack` | Install the imwel command pack (extract/audit/...) into the selected tools |
| `--no-command-pack` | Skip installing the command pack |

After a successful bind, `imwel init` offers to install the first-party command pack into your selected tools (interactive prompt, or forced by `--command-pack` / skipped by `--no-command-pack`). This step never blocks the bind: if you skip it or it fails, the binding stays valid and you can install later with `imwel skill install`.

At least one of `--project` or `--module` must select something. Re-running `imwel init` on a bound directory **rebinds**: the whole selection (tools, modules, writable project) is replaced. Before init or rebind writes, imwel lists every render target and classifies existing files. The final interactive prompt always offers **confirm and apply**, **go back to change selections**, or **cancel**. Going back restarts at tool selection with all prior choices preselected; cancelling leaves rendered files, history, and the binding unchanged. A different unmanaged file (for example, your own `.cursor/rules/coding-style.mdc`) is never silently replaced: the same final prompt names the conflicting paths, while non-interactive mode exits with code **1** unless `--yes` authorizes the listed overwrites. Shared-file targets such as managed blocks in `AGENTS.md` preserve content outside imwel's block.

## `imwel tools`

Adjusts only the AI coding tools in the current binding. It does not change the remote, branch, writable project, modules, frozen flags, optional Artifact selections, or the separately installed first-party command pack. At least one tool must remain.

Interactive mode puts installed tools first and preselects them, then uses the same toggle → diff → confirmation flow as `init` and `modules`.

| Flag | Description |
|------|-------------|
| `--add <csv>` | Tool ids to add |
| `--remove <csv>` | Tool ids to stop managing |
| `--delete-output` | Delete exact recorded outputs for removed tools when no remaining managed reference uses the path |
| `-y` / `--yes` | Skip confirmations after explicit `--add` / `--remove` selections |

Adding a tool force-refreshes the bound branch, rediscovers all non-frozen bound projects with their existing optional selections, and renders them together to catch cross-project conflicts. Only the new tool's outputs are written; existing tool outputs are not synced or rewritten. A conflicting unmanaged target follows the same explicit file-safety plan as `init`.

Removing a tool defaults to **keep**: its `installedPaths` entries are removed from the binding and history, but the files stay on disk as unmanaged files. Deletion requires the separate `--delete-output` choice. Even then, imwel deletes only exact recorded paths with no reference from a remaining tool or Artifact; it never clears a whole tool directory.

```bash
imwel tools --add claude-code -y
imwel tools --remove cursor -y                  # keep former Cursor files
imwel tools --remove cursor --delete-output -y  # delete only unreferenced recorded paths
```

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

Before writing, a newly-added module is rendered together with every project that remains bound (the writable project plus other still-installed modules), the same way `imwel init`/`imwel sync` do — so a **cross-project render-path conflict** (e.g. two modules both defining a same-named rule with different content) is caught here instead of being silently overwritten and only surfacing on the next `imwel sync`. On such a conflict, the whole invocation aborts atomically: nothing is written and the binding is unchanged, even if the same call also requested a `--remove`/`--freeze`/`--unfreeze`. Resolve the naming collision in the template repo (rename or consolidate), then re-run.

Module installation uses the same existing-file plan as `imwel init`. If a new module would replace a different unmanaged file, confirm the exact path interactively or pass `--yes` after reviewing the plan; otherwise the entire module operation stops before changing files, history, or binding state.

## `imwel sync`

Fetches upstream and applies Artifact updates (with conflict handling via the history repo). Walks every bound project; **frozen** modules are skipped.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip apply confirmation |
| `--continue` | Continue after manual conflict resolution |

Always force-refreshes remote state (not subject to the passive fetch throttle).

**Read-only module drift.** Modules are pull-only, so imwel never silently overwrites local edits to a module's files. When a subscribed module has local edits, `imwel sync` asks you to choose per module: **discard** local edits and take upstream, **freeze** the module (stop syncing, keep your local copy), or **uninstall** it. Non-interactive `--yes` defaults to **freeze** — it never destroys local edits without consent.

**Missing managed files.** Deleting a path recorded by the binding and local history does not uninstall it. `imwel sync` lists the path as a restoration, then re-renders it from the currently bound upstream Artifact only after confirmation. In non-interactive mode, pass `--yes`; without it, no file, history, or binding state changes.

Before any interactive sync writes files or changes module state, it asks for final confirmation. When the run includes module-drift choices, the prompt offers **confirm and apply**, **go back to change selections**, or **cancel**; going back restarts at the first module-drift choice with prior choices preselected. If the run only contains remote updates or missing-file restorations, there is no earlier choice to revise, so the prompt offers **confirm and apply** or **cancel** only. Cancelling leaves local files, history, and the recorded sync SHA unchanged.

## `imwel status`

Reports remote vs local drift. Always force-refreshes. After drift, it runs a **rule health** check over the managed rendered files and lists any issues (this never changes the exit code):

- **empty** — rule has no meaningful content (empty or placeholder-only).
- **dead-import** — a `@path` import points to a missing file.
- **orphan-ref** — a backtick path (e.g. `` `src/foo.ts` ``) references a file that no longer exists.

The checks are deterministic and conservative (no LLM, globs/URLs/commands are ignored) — advisory hints, not blockers.

### How to read the output

`imwel status` prints information in this order:

1. **Binding summary**
   - `Remote: <remote> / <branch>` identifies the remote alias and branch being checked.
   - `Writable project: <project>` appears when the binding has a linked, writable project.
   - `Modules (read-only): <modules>` appears when the binding has subscribed modules. A frozen module is marked `(frozen)` and remains at its locally pinned version during sync.
   - `Tools: <tools>` lists the AI coding tools receiving the rendered Artifacts.
   - `Last synced commit: <sha>` is the first eight characters of the remote commit recorded by the last successful sync.
2. **Drift result**
   - `Remote has updates available.` means the branch now points to a different commit than the recorded last-synced commit. Run `imwel sync` to preview and apply the upstream changes.
   - `Local hand-edits detected: <paths>` means the listed managed paths differ from the state recorded in local history. Review those edits and decide whether to keep, contribute, or discard them before reconciling with `imwel sync`.
   - `No drift detected.` appears only when the remote commit is unchanged and no managed path has local edits. No action is needed.

   Remote updates and local edits are independent, so the first two lines can appear together. The clean line appears only when neither condition applies.
3. **Rule health**
   - `[empty]` means a managed rule is empty or contains only placeholder text. Add substantive guidance or remove the rule from the template.
   - `[dead-import]` means an `@path` import cannot be resolved. Correct the import or restore the referenced file.
   - `[orphan-ref]` means a backtick path points to a missing file. Update or remove the reference, or restore the file if it should still exist.

   These findings are advisory: they do not block the command or change its exit code. If no issue is found, status prints `All managed rules look healthy.`

Use `imwel binding show` for a quick, offline view of locally recorded binding and contribution-tracking state. It reads local metadata and checks path existence without fetching or running rule health. Use `imwel status` when you need to know whether to sync: it always force-refreshes the remote and then checks drift and rule health.

## `imwel binding show`

Reads only local metadata and path existence. It never fetches, contacts Git, initializes history, changes tracking, or writes files. Unlike `imwel status`, it does not report remote drift or rule health.

The output has separate **Binding** and **Contribution tracking** sections:

- Binding means installed, managed state. After the summary, the default tree lists the linked project first, subscribed modules alphabetically, and Artifact types in `rule` → `skill` → `agents` order. Leaves show canonical path, localized type and requirement labels, installed tools, and a localized missing marker where needed.
- Contribution tracking authorizes local sources for a future upstream proposal. Its tree groups records by target remote/project and then type. It is not proof that those sources are installed or managed by the binding. An Artifact can correctly appear in both sections.

```text
Binding
  Remote: team / main
  Linked project: app
  ...
  app (linked)
  └─ rule
     └─ rules/app.md (rule · required) → claude-code, cursor
  shared (subscribed, frozen)
  └─ rule
     └─ rules/shared.md (rule · required) → cursor ! missing

Contribution tracking
  ...
  team/shared
  └─ rule
     └─ rules/shared.md (rule · required) → cursor · pushed · shared
        └─ Source: .cursor/rules/shared.mdc ! missing
```

| Flag | Description |
|------|-------------|
| `--json` | Output only the unchanged stable `schemaVersion: 1` JSON view |

Only remote aliases are displayed, never credential-bearing URLs. Paths are project-relative POSIX paths, and file contents are never read for output. Missing installed paths are counted individually in a stdout warning pointing to `imwel sync`; missing contribution sources produce a stdout warning pointing to `imwel propose`. Tool ids and paths are never translated, and `--json` retains its machine enum values. The command still works when only contribution tracking exists. If neither local state exists, it prints the appropriate setup hint without creating `.imwel`.

## `imwel rollback`

Restores a prior install recorded under `.imwel/history/`.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip confirmation |
| `--to <sha>` | History commit SHA to restore |

After restore, imwel **deletes managed files that were added after that history point**. Unmanaged files are never deleted.

## `imwel push`

Reverse-renders local tool files back to canonical Artifacts and opens an upstream proposal (branch + PR/MR by default). Writable-project edits are included normally. A subscribed-module edit is eligible only when persistent contribution tracking for that module Artifact exists, and it appears as a separate candidate that must be selected explicitly.

Before creating a branch or commit, push checks every local input. A missing binding-owned file is skipped (never treated as an upstream deletion) with an `imwel sync` recovery hint. For a missing contribution source, interactive push offers to remove tracking or cancel so you can restore it; non-interactive push skips it, retains tracking, and exits non-zero. Successful items record the pushed Git branch and commit SHA. Unselected or failed records are unchanged, and content already represented by that Git commit is not pushed again.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip confirmation |
| `--all` | Select all push candidates |
| `--message <msg>` | Commit message |

## `imwel propose [file]`

Manages contribution tracking for one remote project or module at a time. Tracking is configuration: removing it never deletes or edits the local Artifact.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip confirmation |
| `--remote <alias>` | Target remote |
| `--project <name>` | Target manifest project |
| `--type <type>` | `rule`, `skill`, or `agents` |
| `--optional` / `--required` | Optional vs required Artifact |
| `--tool <id>` | Source tool adapter for reverse-render |

### Interactive multiselect (no file)

Run `imwel propose` **without a file**. First choose the remote. After fetching its manifest, imwel checks every project for eligible candidates and checks the selected remote for pending contribution tracking whose target project is still in that manifest. If both are empty, it exits before the project prompt and explains where tool-native files are normally discovered (for example, `.cursor/rules/*.mdc`) and how to use `imwel propose <path>` for a specific file. If any project has a candidate or manageable pending tracking, target project/module selection continues as before; stale tracking for a deleted or renamed project does not open a selector that cannot manage it.

After target selection, imwel lists existing tracking first and preselects it, followed by eligible unbound `USER` Artifacts. Space toggles tracking; Enter shows added/removed changes; a second confirmation applies them without any Git or local-file operation. Linked-project managed Artifacts, `MINE`/`FOREIGN` files, items owned by another target, and conflicting cross-tool representations are excluded with a summary. File-based and non-interactive flows are unchanged.

Tool-native paths are reverse-parsed before tracking. For example, `.cursor/rules/arkts-hooks.mdc` is recorded as the local source while its target path is derived as `rules/arkts-hooks.md` from manifest conventions.

Project tracking remains after push, then `sync` removes it only after the same canonical Artifact is installed into the project binding. Module tracking is persistent across push and sync until you deselect it in `propose`.

## Non-interactive / CI

`-y` / `--yes` skips **confirmation** prompts only. It never invents answers for selection prompts — pass `--tools`, `--remote`, `--project`, `--to`, `--all`, etc. explicitly.

```bash
imwel init -y --tools cursor,claude-code --remote org-standards --branch main \
  --project my-app --no-optional

imwel tools --add codex --remove cursor -y
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
| `NO_COLOR` | Disable ANSI color when the variable is present with any value, including an empty value. Semantic icons remain in the output. |

## Next

- Consumer workflow → [Install a template](../consume/quickstart.md)
- Author workflow → [Author a template](../author/quickstart.md)
- Safety defaults and Git model → [Architecture](./architecture.md)
- Developing the CLI itself → [CONTRIBUTING.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.md)
