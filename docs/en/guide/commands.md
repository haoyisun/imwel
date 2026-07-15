# Commands

All commands below are implemented in the current CLI. Global option: `--lang <locale>` (`en`, `zh-CN`).

## Overview

| Command | Purpose |
|---------|---------|
| `imwel doctor` | Check Git and environment prerequisites |
| `imwel lint` | Lint a **template** repository |
| `imwel remote add/list/remove/set` | Manage template remotes |
| `imwel template init` | Scaffold a new template repository |
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
- **Warnings** — style / best practice (skill `description` quality, …).

In a consumer binding, the CLI directs you to the template repo instead of reporting a fake clean result. See [Template authoring](../template-authoring).

## `imwel remote`

| Subcommand | Description |
|------------|-------------|
| `add <alias> <url>` | Register a template remote |
| `list` | List remotes |
| `remove <alias>` | Remove a remote (`-y` / `--yes` skips confirmation) |
| `set <alias>` | Update remote options |

| Flag | Description |
|------|-------------|
| `--direct-push` (on `add`) | Allow direct push to the bound branch (opt-in; not the default) |
| `--direct-push [value]` (on `set`) | Enable or disable direct push |

Default upstream path remains **branch + PR/MR**.

## `imwel template init`

Scaffolds a new template repository (manifest, example project, author `AGENTS.md`, Cursor slash commands / skills).

| Flag | Description |
|------|-------------|
| `--dir <path>` | Target directory |
| `--locale <locale>` | Scaffold locale (`en`, `zh-CN`, …) |
| `--name <name>` | Repository name |
| `-y` / `--yes` | Skip confirmation prompts (non-interactive defaults) |

## `imwel init`

Binds the current directory to one project inside one remote template repository and installs Artifacts for selected tools.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip confirmation prompts (**does not** invent selections) |
| `--tools <csv>` | Comma-separated target tool ids (e.g. `cursor,claude-code,codex,trae`) |
| `--remote <alias>` | Remote alias |
| `--branch <name>` | Branch name |
| `--project <name>` | Manifest project name |
| `--optional <csv>` | Optional Artifact source paths to install |
| `--no-optional` | Install no optional Artifacts |

Non-interactive mode requires selection flags; missing required flags exit with code **1**.

## `imwel sync`

Fetches upstream and applies Artifact updates (with conflict handling via the history repo).

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip apply confirmation |
| `--continue` | Continue after manual conflict resolution |

Always force-refreshes remote state (not subject to the passive fetch throttle).

## `imwel status`

Reports remote vs local drift. Always force-refreshes.

## `imwel rollback`

Restores a prior install recorded under `.imwel/history/`.

| Flag | Description |
|------|-------------|
| `-y` / `--yes` | Skip confirmation |
| `--to <sha>` | History commit SHA to restore |

After restore, imwel **deletes managed files that were added after that history point**. Unmanaged files are never deleted.

## `imwel push`

Reverse-renders local tool files back to canonical Artifacts and opens an upstream proposal (branch + PR/MR by default). Reverse-renders **every** bound tool that has installed paths; conflicting canonical content fails the push.

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

## Related

- [Architecture](./architecture) — safety defaults and Git model
- [CONTRIBUTING.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.md) — developing the CLI itself
- npm publish / release notes — see repository README and GitHub Releases when publishing
