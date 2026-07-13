# imwel

Git-native CLI for distributing AI coding rules, skills, and agent instructions — **no backend, no database, no hosted platform**.

Template repositories are ordinary Git repos. imwel binds a local project directory to one project inside a remote template repo, renders Artifacts into tool-native formats (Cursor, Claude Code, …), detects drift with Git, and proposes upstream changes via branch + PR/MR.

## Quickstart

```bash
# 1. Scaffold (or clone) a template repository
npx imwel@latest template init

# 2. Register it as a remote (from any machine that will consume it)
imwel remote add org-standards git@github.com:example/imwel-templates.git

# 3. Bind a consumer project and install Artifacts
cd your-project
imwel init
imwel sync
```

Install from npm when you need a global binary: `npm install -g imwel`. See [CONTRIBUTING.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.md) for local development and [SECURITY.md](https://github.com/haoyisun/imwel/blob/main/SECURITY.md) for reporting vulnerabilities.

## Guides

| Page | What you will learn |
|------|---------------------|
| [Architecture](./guide/architecture) | Git as the database, per-directory bindings, history repo, safety defaults |
| [Manifest](./guide/manifest) | `.imwel/manifest.yaml` fields, conventions, optional Artifacts |
| [Commands](./guide/commands) | Full CLI reference (`doctor`, `lint`, `init`, `sync`, `push`, …) |
| [Example template](./guide/example-template) | Scaffold layout under `templates/init` and `imwel template init` |
| [Template authoring](./template-authoring) | Author workflow: `/imwel-author`, `imwel lint`, host PR/MR |

## Contribute

| Page | What you will learn |
|------|---------------------|
| [Adapters](./contribute/adapters) | How to add a render target via upstream PR (not a plugin system) |

## Consumer notes

- Non-interactive: `init` / `sync` / `push` / `propose` / `rollback` accept `-y` / `--yes`. Selection inputs need explicit flags. `--yes` never invents selections.
- `IMWEL_FETCH_THROTTLE_MS` overrides the global passive fetch interval (default 4h). `sync` / `status` always force-refresh.
- `imwel rollback` restores history and **deletes** managed files added after the restore point (never unmanaged files).
- `imwel push` reverse-renders **every** bound tool that has installed paths.

## Related

- Repository [README](https://github.com/haoyisun/imwel)
- [Contributing](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.md)
