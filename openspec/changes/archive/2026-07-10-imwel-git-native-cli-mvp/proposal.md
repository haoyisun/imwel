## Why

Teams using multiple AI coding tools (Cursor, Claude Code, Codex, Qoder, Trae, ...) need one governed source of truth for rules/skills/agent instructions, but building a hosted platform (accounts, database, permissions, versioning) to achieve this is unnecessary complexity: a Git repository, plus the access control, review workflow, and version history that any Git host (GitHub/GitLab/Gitea) already provides, is sufficient. imwel should be a single npm-installable CLI that treats one or more Git repositories as the source of truth for AI-coding Artifacts (rules, skills, `agents.md` content), renders them into each target tool's native format, detects drift against the upstream repo and against local hand-edits using Git itself, and lets contributions flow back upstream through the Git host's normal branch/PR review — with zero backend service to build, deploy, or operate.

## What Changes

- Introduce the **imwel CLI**, distributed via npm (`npm install -g imwel`, `npx imwel@latest ...`), with no accompanying backend service or database.
- Introduce **remote management**: `imwel remote add/list/remove` binds one or more Git repositories under a user-chosen alias, cached locally under `~/.imwel/cache/<alias>/`.
- Introduce the **template repository convention**: a `.imwel/manifest.yaml` at a bound repo's root declares one or more named "projects" (artifact bundles), per-project directory conventions for rules/skills/`agents.md`, and which artifacts are optional (prompted at install time) versus required.
- Introduce `imwel template init`: scaffolds a new template repository (manifest with inline explanatory comments, an example project, README/CONTRIBUTING) in a locale the user chooses, optionally creating the local Git repo and a remote repository via `gh`/`glab` if available.
- Introduce `imwel init`: run inside any local project directory (including a single package within a monorepo) to select target AI coding tools, a bound remote + branch, a project within that branch's manifest, and which optional artifacts to install; writes a local `.imwel` file recording the binding and the installed-artifact manifest.
- Introduce **render adapters** for Cursor and Claude Code (first two targets only), built against a shared adapter interface (`detect`/`render`/`parseExisting`) so further tools can be added later without touching core logic. `rule`-type Artifact content is canonically `agents.md`-flavored Markdown; tool-specific enrichments are layered as metadata expanded only at render time.
- Introduce `imwel sync`/`imwel status`: fetches the bound remote, computes drift purely via `git diff` between the last-synced commit and the remote's current commit (and between last-synced and on-disk state for local edits), previews the change set before applying anything, and — on confirmation — renders files and commits the new state into a hidden local history repository (`.imwel/history/`). Both a throttled passive check (on any CLI invocation) and explicit on-demand checks are supported; no background daemon and no hook into any AI tool's own session lifecycle.
- Introduce **conflict handling**: when local edits and an upstream update have both diverged from the last-synced state, resolve via a standard three-way merge (Git merge machinery), surfacing unresolved conflicts as ordinary conflict markers for the user to resolve by hand.
- Introduce **rollback**: `imwel rollback` reverts to a prior recorded state using the hidden history repository — no bespoke history data structure.
- Introduce **contribute-upstream workflow**: `imwel push` detects locally-edited, already-managed Artifacts and prepares a branch + PR/MR (never a direct commit to a shared branch, except an explicit opt-in `--direct-push` per personal remote); `imwel propose <file>` registers a not-yet-managed local file as a candidate new Artifact for a chosen remote/project, feeding into the same `imwel push` flow.
- Introduce **CLI interface localization**: all interactive prompts/messages route through a per-locale string table (English default/fallback, Simplified Chinese as the first additionally maintained locale), independent from the per-locale scaffold templates used by `imwel template init`.
- Explicitly out of scope for this change (deferred): any hosted platform/backend, organization-wide usage-visibility dashboards, a component marketplace, prompts reference library, project scaffolding/code-generation templates, render adapters beyond Cursor and Claude Code, and automatic (daemon-based) update notifications.

## Capabilities

### New Capabilities
- `remote-management`: add/list/remove aliased Git remotes and maintain their local cache clones.
- `template-repository`: the `.imwel/manifest.yaml` convention (projects, directory conventions, optional artifacts) and the `imwel template init` scaffolding command.
- `project-binding`: `imwel init` flow and the local `.imwel` binding file, scoped per local directory (monorepo-friendly by construction).
- `render-adapters`: the Cursor and Claude Code adapters, the shared adapter interface, and the `agents.md`-baseline + `targetOverrides` content model for `rule`-type Artifacts.
- `sync-engine`: `imwel sync`/`imwel status`, Git-diff-based drift detection, diff preview before apply, the hidden local history repository, rollback, and three-way-merge conflict resolution.
- `contribute-upstream`: `imwel push`/`imwel propose`, reverse-rendering to canonical content, branch+PR/MR preparation, and the direct-push safety default.
- `cli-i18n`: the CLI's own interface string-table localization and locale detection/fallback behavior.

### Modified Capabilities
(none — this is the first implemented slice of imwel; the earlier platform-based proposal was withdrawn before any specs were archived)

## Impact

- No existing production system is affected — this is the first code in the repository.
- Establishes the CLI's package structure (`src/adapters/`, `src/locales/`, `templates/init/<locale>/`) and coding conventions as already fixed in this repo's `AGENTS.md`.
- Establishes the on-disk conventions (`~/.imwel/`, `.imwel/manifest.yaml`, per-project `.imwel` binding file, `.imwel/history/`) that all future capabilities (additional render adapters, richer manifest features, docs-site tooling) will extend.
- Requires the user to have the system `git` binary installed and configured (SSH keys/credentials); the CLI does not bundle or replace Git.
