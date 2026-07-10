# imwel

[简体中文](README.zh-CN.md)

**imwel** is a Git-native CLI for distributing AI coding rules, skills, and agent instructions across teams and tools — with no backend, no database, and no hosted platform.

## Quickstart

```bash
npx imwel@latest template init
imwel remote add org-standards git@github.com:your-org/imwel-templates.git
cd your-project
imwel init
imwel sync
```

## Commands

| Command | Description |
|---------|-------------|
| `imwel doctor` | Check Git and environment prerequisites |
| `imwel remote add/list/remove/set` | Manage template repository remotes |
| `imwel template init` | Scaffold a new template repository |
| `imwel init` | Bind the current directory to a template project |
| `imwel sync` | Pull upstream artifact updates |
| `imwel status` | Report remote and local drift |
| `imwel rollback` | Restore a prior installed state |
| `imwel push` | Propose local edits upstream (branch + PR by default) |
| `imwel propose <file>` | Register a new artifact for the next push |

## Architecture

- Template repositories are ordinary Git repos with `.imwel/manifest.yaml`
- Local bindings live in `.imwel/binding.yaml` per directory
- Install history is tracked in `.imwel/history/` as a separate Git repo
- Render adapters: **Cursor** (`.cursor/rules/*.mdc`) and **Claude Code** (`CLAUDE.md` blocks, `.claude/skills/`)

## Development

```bash
npm install
npm run build
npm test
npm run dev -- doctor
```

## Documentation

See [docs/](docs/) for the documentation site source.

## License

MIT
