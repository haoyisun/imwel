# Contributing to imwel

[简体中文](CONTRIBUTING.zh-CN.md)

Thanks for contributing. imwel is an npm-distributed, Git-native CLI (no backend). Please read [`AGENTS.md`](AGENTS.md) for architecture constraints before large changes.

## Development setup

```bash
git clone https://github.com/haoyisun/imwel.git
cd imwel
npm install
npm run build
npm run ci
```

Useful scripts:

| Script | Purpose |
|--------|---------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run unit tests |
| `npm run check:i18n` | Ensure `en` / `zh-CN` locale key parity |
| `npm run ci` | `build` + `check:i18n` + `test` |
| `npm run e2e` | End-to-end walkthrough |
| `npm run dev -- <cmd>` | Run CLI via `tsx` (e.g. `npm run dev -- doctor`) |

Requirements: Node.js `>=18.18`, system `git` on `PATH`.

## Pull requests

1. Prefer a focused branch and one concern per PR.
2. Use OpenSpec (`.cursor/skills/openspec-*`) for feature/behavior changes when working in this repo’s workflow.
3. Fill out the PR template (summary, test plan, docs/i18n checks).
4. Do not commit secrets (`.env`, tokens, credentials).

## CLI strings and docs

- **User-facing CLI strings** (prompts, errors, help) must go through `src/locales/` (`en` + `zh-CN`). Never hardcode them in command handlers.
- **User-facing docs**: English is canonical; update `zh-CN` in the same change or mark a tracked TODO. Keep `README.md` ↔ `README.zh-CN.md` cross-links.
- After behavior/docs changes, follow `.cursor/skills/imwel-change-docs-checklist/`.

## Releasing

Maintainers publish versioned packages to npm. **Do not** publish on every push to `main`.

Checklist (in order):

1. Ensure `main` is green: `npm run ci` (and `npm run e2e` when relevant).
2. Update [`CHANGELOG.md`](CHANGELOG.md) (move `Unreleased` notes into the new version section).
3. Bump `version` in `package.json` (SemVer).
4. Commit, push, and create an annotated git tag: `vX.Y.Z` (e.g. `v0.1.0`).
5. Publish:
   - Locally: `npm publish` (requires npm auth), or
   - CI: push the `v*` tag or run **Actions → Publish to npm → Run workflow** (see [`.github/workflows/publish.yml`](.github/workflows/publish.yml)). Requires repository secret `NPM_TOKEN` (or Trusted Publisher configured on npm).

Until `NPM_TOKEN` / Trusted Publisher is configured, use the checklist with a local `npm publish` after tagging.

## Security

See [`SECURITY.md`](SECURITY.md). Do not file public issues for undisclosed vulnerabilities.
