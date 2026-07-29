# imwel

[![npm version](https://img.shields.io/npm/v/@culock/imwel.svg)](https://www.npmjs.com/package/@culock/imwel)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@culock/imwel.svg)](https://www.npmjs.com/package/@culock/imwel)

[简体中文](README.zh-CN.md)

One source of truth for your team's AI coding rules — distributed to every tool from a plain Git repo. No backend, no database, no platform.

Half your team is on Cursor, half on Claude Code, someone just switched to Codex. Each tool stores its rules in a different format and place, so your shared coding standard drifts the moment anyone edits a file.

imwel fixes that. It keeps the standard in one Git repo, renders it into each tool's native format, and pushes edits back through normal PRs.

## Quickstart

**Use your team's rules** (most common):

```bash
npm install -g @culock/imwel
imwel remote add git@github.com:your-org/rules.git
cd your-project
imwel init && imwel sync
```

Prefer no global install? Run every command as `npx @culock/imwel@latest <command>`.

**Author rules for others** — scaffold a fresh template repo and start writing:

```bash
npx @culock/imwel@latest template init
```

Then follow [Create a template repo](docs/en/how-to/create-template-repo.md).

No account, no signup, no platform to deploy. imwel removes cleanly — just delete the `.imwel/` directory. Your rules stay in your own Git repo.

## Core commands

| Command | What it does |
|---------|--------------|
| `imwel init` | Bind this directory to a template repo (one writable project + any number of read-only shared modules) |
| `imwel sync` | Pull the latest rules from upstream — skips frozen modules, never silently overwrites your local edits |
| `imwel status` | Show what's drifted between upstream, your last sync, and your local files |
| `imwel push` | Send your local edits back upstream as a branch + PR |
| `imwel remote add` | Register a template repository to pull from |
| `imwel template init` | Scaffold a brand-new template repo (with author guide + Cursor slash commands) |
| `imwel doctor` | Check that Git and your environment are ready |

Full reference, including `adopt`, `scan`, `modules`, `tools`, `rollback`, `propose`, `lint` → see the [command reference](docs/en/reference/commands.md).

## Why Git-native

Your team already lives in Git — branches, reviews, SSH keys, branch protection. imwel reuses all of it instead of making you adopt a new platform.

- **Git is the database.** Versioning and history come from Git itself; imwel adds no parallel content store.
- **Your Git host is governance.** Who can edit rules is controlled by GitHub/GitLab/Gitea permissions and PRs — not by an access-control system inside imwel.
- **Local edits are safe.** A hidden Git repo under `.imwel/history/` tracks every install. Drift shows up as a normal Git diff; conflicts surface as standard merge markers you resolve by hand. Nothing is ever silently overwritten.
- **No background daemons.** Remote template checks run when you invoke imwel (throttled to once per 2h by default), never because of local edits or by hooking into your AI tool's session.

## Authoring templates

The main author path is to **clone the template repo and edit there** — not to `propose`/`push` from a consumer project.

1. `imwel template init` (or clone an existing template repo).
2. Open it in Cursor and run `/imwel-author`.
3. Edit artifacts per `.imwel/manifest.yaml`, then validate with `imwel lint`.
4. Open a branch + PR on your Git host.

`imwel propose` / `imwel push` are the **consumer** path — feeding local edits back upstream from a bound project.

## Non-interactive / CI

`--yes` / `-y` only skips confirmation prompts. Selections must be passed as flags; missing required flags exit with code 1.

```bash
imwel init -y --tools cursor,claude-code --remote org-standards --branch main \
  --project my-app --no-optional
imwel sync --yes
imwel push --yes --all --message "chore: update artifacts"
imwel rollback --yes --to <history-sha>
```

## Environment

| Variable | Description |
|----------|-------------|
| `IMWEL_FETCH_THROTTLE_MS` | Override the passive fetch throttle (default 2h). `sync` / `status` / `propose` always force-refresh. |

## Architecture

- Template repos are ordinary Git repos carrying a `.imwel/manifest.yaml`.
- Each consuming directory gets its own `.imwel/binding.yaml` — per-directory, not per-repo. Monorepos just run `imwel init` in each sub-project.
- Install history lives in a separate hidden Git repo at `.imwel/history/`.
- Render adapters (14): **Cursor**, **Claude Code**, plus `codex`, `windsurf`, `gemini-cli`, `copilot`, `cline`, `continue`, `aider`, `kiro`, `opencode`, `trae`, `qoder`, `zcode` — see [Add an adapter](docs/en/how-to/add-adapter.md) and [Supported tools](docs/en/reference/supported-tools.md).

## Documentation

```bash
npm run docs:dev      # local preview
npm run docs:build    # build the site
```

Docs follow [Diátaxis](https://diataxis.fr/) (Tutorials / How-to / Reference / Explanation):

| Guide | Path |
|-------|------|
| Overview | [docs/en/index.md](docs/en/index.md) |
| Quick Start (5 min) | [docs/en/tutorials/quick-start.md](docs/en/tutorials/quick-start.md) |
| Create a template repo | [docs/en/how-to/create-template-repo.md](docs/en/how-to/create-template-repo.md) |
| Consume for Cursor | [docs/en/how-to/consume-for-cursor.md](docs/en/how-to/consume-for-cursor.md) |
| Consume for Claude Code | [docs/en/how-to/consume-for-claude-code.md](docs/en/how-to/consume-for-claude-code.md) |
| Push via PR | [docs/en/how-to/push-via-pr.md](docs/en/how-to/push-via-pr.md) |
| Commands | [docs/en/reference/commands.md](docs/en/reference/commands.md) |
| Manifest | [docs/en/reference/manifest.md](docs/en/reference/manifest.md) |
| Architecture | [docs/en/explanation/architecture.md](docs/en/explanation/architecture.md) |
| Glossary | [docs/en/explanation/glossary.md](docs/en/explanation/glossary.md) |

## Development

```bash
npm install
npm run build
npm test
npm run dev -- doctor
```

## Get involved

- Star [imwel on GitHub](https://github.com/haoyisun/imwel) — if it saves your team a copy-paste cycle, help others find it too.
- Missing your AI tool? [Open an issue](https://github.com/haoyisun/imwel/issues) or [contribute an adapter](docs/en/how-to/add-adapter.md) via PR.
- Hit a bug or have a question? [Open an issue](https://github.com/haoyisun/imwel/issues).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) ([简体中文](CONTRIBUTING.zh-CN.md)).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT
