# Architecture

imwel is an **npm-distributed CLI**. There is no imwel server, database, or hosted ACL layer. Git stores content; the Git host (GitHub / GitLab / Gitea / …) provides permissions and review.

## Git is the database

Content identity, versioning, and history come from Git objects (blob / tree / commit SHAs) and the commit graph. imwel does **not** invent a parallel content-hash, version number, or changelog format when `git` already answers.

Template repositories are ordinary Git repos that declare projects in `.imwel/manifest.yaml`. Consumers never talk to a custom content store — they `fetch` / `clone` through system `git` (SSH keys, credential helpers, and `.gitconfig` as usual).

## Bindings are per directory

A local binding lives in `.imwel/binding.yaml` **inside the project directory you ran `imwel init` in**. Bindings are not “per Git repository.”

In a monorepo, run `imwel init` independently in each sub-project directory that should consume a template project. There is no special monorepo mode.

## Local history repo

Installed Artifact states are recorded in a real, hidden Git repository under `.imwel/history/`. That gives:

- Diffs and rollback via normal Git semantics
- Three-way merge when local edits collide with upstream updates
- Conflict markers (`<<<<<<<` / `=======` / `>>>>>>>`) for the user to resolve by hand — **never** silent auto-resolve

`imwel rollback` restores a prior history commit and deletes managed files that were added after that point. It never deletes unmanaged files.

## Render pipeline and adapters

1. Discover Artifacts from the template project using manifest `conventions` (rules / skills / agents paths).
2. For each selected AI tool, call that tool’s **adapter**: `render` writes tool-native files; `parseExisting` reads them back for drift and `push` / `propose`.
3. Core owns safety (what may be written) and Git operations; adapters must not special-case targets inside core.

Built-in adapters today: **Cursor** (`.cursor/rules/*.mdc`, …) and **Claude Code** (`CLAUDE.md` blocks, `.claude/skills/`, …). Adding a new target is an upstream PR that registers another adapter — see [Adapters](../contribute/adapters).

Canonical rule content is **agents.md-flavored Markdown**. Tool-specific enrichments live in a small `targetOverrides` overlay and expand only at render time for that target.

## Drift checks

Drift / update checks are **throttled** and decoupled from any AI tool’s chat session:

- Passive check on CLI invocation (default interval 4 hours; override with `IMWEL_FETCH_THROTTLE_MS`)
- Explicit `imwel status` / `imwel sync` (always force-refresh)

imwel never hooks into, intercepts, or blocks an AI coding tool’s own session lifecycle. There are no background daemons.

## Upstream governance

Pushing changes upstream defaults to **branch + PR/MR**, not a direct commit to a shared tracked branch. Direct push exists only as an explicit per-remote opt-in (`imwel remote add … --direct-push` / `imwel remote set …`).

Who may edit a template repo is controlled by the Git host’s permissions and branch protection — not by ACL code inside imwel.

## Safety defaults

- Do not write unmanaged files without an explicit user action (`init`, confirmed `sync`, `propose`).
- Do not silently overwrite locally hand-edited Artifacts — detect drift first; confirm or merge.
- No network fetch / push except explicit commands or the throttled passive check.

## Related docs

- [Manifest reference](./manifest)
- [Commands](./commands)
- [Template authoring](../template-authoring)
- Repository [AGENTS.md](https://github.com/haoyisun/imwel/blob/main/AGENTS.md) (project constraints for contributors)
