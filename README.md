# imwel

[简体中文](README.zh-CN.md)

**imwel** is a Git-native CLI for distributing AI coding rules, skills, and agent instructions across teams and tools — with no backend, no database, and no hosted platform.

New here? Read the end-to-end [Usage guide](docs/en/guide/usage.md) (or the [command reference](docs/en/guide/commands.md)).

## Quickstart

```bash
npx @culock/imwel@latest template init
imwel remote add git@github.com:example/imwel-templates.git   # alias derived from the URL
cd your-project
imwel init                                                    # single remote is auto-selected
imwel sync
```

## Commands

| Command | Description |
|---------|-------------|
| `imwel doctor` | Check Git and environment prerequisites |
| `imwel lint` | Lint a template repository (errors = install-breaking; warnings = style; `--strict` fails on warnings) |
| `imwel remote add/list/remove/set` | Manage template repository remotes |
| `imwel template init` | Scaffold a new template repository (includes author `AGENTS.md` + Cursor slash commands) |
| `imwel adopt` | Consolidate existing scattered tool rules into canonical artifacts under `.imwel/adopted/` (no binding/remote required); `--from` adopts reviewed AI drafts from `.imwel/drafts/` through a deterministic quality gate |
| `imwel scan` | Deterministically fingerprint the project into `.imwel/fingerprint.yaml` (languages, tooling, existing rule locations, plus a Git-history overlay of change hotspots/co-changes when available) — no LLM |
| `imwel skill install` | Install imwel's first-party skills (`imwel-extract`, `imwel-audit`) into selected tools (unmanaged; not tracked by sync) |
| `imwel init` | Bind the current directory to a template repo — at most one writable project (`role: project`) plus any number of read-only modules (`role: shared`) |
| `imwel modules` | Add, remove, or freeze read-only modules for the current binding |
| `imwel tools` | Add or remove AI coding tools without changing the current remote/project/modules; removed outputs are kept by default |
| `imwel sync` | Pull upstream artifact updates (skips frozen modules; never silently overwrites read-only module edits) |
| `imwel status` | Report remote and local drift, plus deterministic rule-health checks (empty rules, dead imports, orphan path references) |
| `imwel binding show` | Inspect local binding and contribution tracking offline (`--details` / stable `--json`) |
| `imwel rollback` | Restore a prior installed state (deletes managed files added after that point) |
| `imwel push` | Push project edits and explicitly tracked contributions (branch + PR by default) |
| `imwel propose [file]` | Add/remove single-target contribution tracking; tool paths map to canonical paths |

## Authoring templates

The primary author path is **clone the template repository and develop in it** — not `propose`/`push` from a consumer project.

1. `imwel template init` (or clone an existing template repo).
2. Open the repo in Cursor and run `/imwel-author` (scaffolded under `.cursor/commands/`).
3. Edit Artifacts per `.imwel/manifest.yaml`, then validate with `imwel lint`.
4. Open a branch + PR/MR on the Git host.

`imwel propose` / `imwel push` remain the **consumer** feedback path for feeding local edits upstream from a bound project.

## Non-interactive / CI usage

`--yes` / `-y` skips confirmation prompts only — it does **not** invent selection answers. Selection inputs must be passed as flags. Missing required flags in non-interactive mode exits with code 1.

```bash
# Init (full flags)
imwel init -y --tools cursor,claude-code --remote org-standards --branch main \
  --project my-app --no-optional

# Sync / push / rollback / propose
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
| `IMWEL_FETCH_THROTTLE_MS` | Override the global passive fetch throttle (default 4h). Invalid values fall back to the default. Per-remote throttle is not supported yet. `sync` / `status` always force-refresh. |

## Architecture

- Template repositories are ordinary Git repos with `.imwel/manifest.yaml`
- Local bindings live in `.imwel/binding.yaml` per directory
- Install history is tracked in `.imwel/history/` as a separate Git repo
- Render adapters: **Cursor**, **Claude Code**, plus `trae`, `qoder`, `codex`, `opencode`, `zcode`, `gemini-cli`, `windsurf`, `continue`, `cline`, `kiro`, `copilot`, `aider` (see [adapters docs](docs/en/contribute/adapters.md))

## Development

```bash
npm install
npm run build
npm test
npm run dev -- doctor
```

## Documentation

Docs site source: [docs/](docs/). Local preview / build:

```bash
npm run docs:dev
npm run docs:build
```

| Guide | Path |
|-------|------|
| Overview & choose your path | [docs/en/index.md](docs/en/index.md) |
| Quick walkthrough (both lanes) | [docs/en/guide/usage.md](docs/en/guide/usage.md) |
| Consumer path (install a template) | [docs/en/consume/quickstart.md](docs/en/consume/quickstart.md) |
| Author path (author a template) | [docs/en/author/quickstart.md](docs/en/author/quickstart.md) |
| Commands | [docs/en/guide/commands.md](docs/en/guide/commands.md) |
| Manifest | [docs/en/guide/manifest.md](docs/en/guide/manifest.md) |
| Architecture | [docs/en/guide/architecture.md](docs/en/guide/architecture.md) |
| Glossary | [docs/en/concepts/glossary.md](docs/en/concepts/glossary.md) |
| Adapters (contribute) | [docs/en/contribute/adapters.md](docs/en/contribute/adapters.md) |

简体中文：平行路径见 [`docs/zh-CN/`](docs/zh-CN/)。

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) ([简体中文](CONTRIBUTING.zh-CN.md)).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT
