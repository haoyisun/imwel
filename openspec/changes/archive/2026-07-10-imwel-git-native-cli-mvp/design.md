## Context

This is the first implemented slice of imwel, replacing an earlier withdrawn proposal that assumed a hosted platform (backend + database + web dashboard). Competitive research and design discussion converged on a simpler, Git-native architecture: any Git repository can be a template repository as long as it follows imwel's manifest convention; the Git host (GitHub/GitLab/Gitea) supplies access control, review workflow, and version history for free. imwel's own binding conventions and coding rules are already fixed in this repo's `AGENTS.md` and must be treated as constraints on this design, not re-derived here.

## Goals / Non-Goals

**Goals:**
- Ship a single npm-installable CLI with zero backend service, zero database.
- Let one or more Git repositories serve as the source of truth for rule/skill/`agents.md` Artifacts, organized as named "projects" inside a `.imwel/manifest.yaml`.
- Support exactly two render targets end-to-end for this change: Cursor and Claude Code, behind a plugin-shaped adapter interface that makes adding more targets later a non-breaking addition.
- Make drift detection, diff preview, history, and rollback all derive from Git itself (commit SHAs, `git diff`, a hidden local Git repo) rather than custom data structures.
- Support a full bidirectional loop: pull updates down (`imwel sync`) and propose local changes/new Artifacts upstream (`imwel push`/`imwel propose`) through a branch + PR/MR, never a direct commit to a shared branch by default.
- Make the CLI's own interface localizable (English default, Simplified Chinese first additional locale) independently of the localized scaffold templates used by `imwel template init`.

**Non-Goals:**
- Any hosted platform, multi-tenant service, or persistent server-side state.
- Usage-visibility across projects/teams (which projects use which version) — this requires a phone-home mechanism that does not exist in a backend-less design; explicitly deferred.
- Render adapters beyond Cursor and Claude Code.
- A background daemon or any hook into an AI coding tool's own session lifecycle for update checks.
- Automatic conflict resolution beyond what Git's own three-way merge produces — unresolved conflicts always require manual resolution.

## Decisions

### 1. Template repository = ordinary Git repo + `.imwel/manifest.yaml`
The manifest declares `conventions` (default `rulesDir`/`skillsDir`/`agentsFile` names, per-project overridable) and a `projects` list, each with a `name`, a `path` (relative directory inside the repo), and an `optional` list of artifact paths that prompt the user at install/sync time instead of installing automatically.
- *Alternative considered*: one repo = one project (no `projects` list). Rejected — the user explicitly wants one repo to serve multiple projects, and a flat list is the simplest structure that supports it without inventing a second manifest file per project.

### 2. Local bindings are per-directory, not per-repository (monorepo support "for free")
`imwel init` is run inside whichever local directory should be bound (a whole repo, or one package inside a monorepo) and writes a `.imwel` file scoped to that directory only. A monorepo with three packages simply ends up with three independent `.imwel` files; there is no monorepo-aware code path.
- *Alternative considered*: a root-level `.imwel` enumerating all sub-project bindings. Rejected — it duplicates information already implicit in "where did the user run `imwel init`", and it would require imwel to understand monorepo layouts (npm/pnpm workspaces, Go modules, etc.) which is out of scope.

### 3. Identity and versioning come from Git, not a custom fingerprint
An Artifact's "version" is simply "the manifest's project directory as of commit X" in the template repo. Drift detection compares recorded commit SHAs (not custom content hashes) via `git fetch` + `git diff <oldSha>..<newSha> -- <projectPath>`. Local-edit detection rehashes on-disk rendered files only to notice *that* something changed, using Git's own `git hash-object`, not a bespoke algorithm.
- *Alternative considered*: a custom tree-hash fingerprint computed by imwel (as in the earlier withdrawn platform design). Rejected here — with Git as the actual source of truth, Git's own object model already provides content addressing; adding a parallel one would be redundant.

### 4. Render adapters implement one shared interface
Each target tool (Cursor, Claude Code) is a module implementing `detect(projectDir): boolean`, `render(artifact, targetOverrides): FileWrite[]`, and `parseExisting(files): { canonicalContent, targetOverrides }`. `parseExisting` is used both for local-edit/drift detection and as the reverse-render step for `imwel push`/`imwel propose` — one implementation, two call sites, per this repo's `AGENTS.md`.
- *Alternative considered*: separate "read" and "write" modules per tool. Rejected — splitting the read/write logic for the same file format across two files increases the chance they silently drift apart; one adapter module per tool is the more cohesive unit.

### 5. `rule` Artifacts are canonically `agents.md`-flavored Markdown; tool enrichments are an overlay
Canonical content for `type=rule` Artifacts is plain Markdown compatible with the AGENTS.md convention. Cursor-specific frontmatter (globs, `alwaysApply`/Auto/Agent-Requested mode) and Claude Code-specific `@path` imports are stored as a small structured `targetOverrides` object alongside the canonical content and only expanded at render time for that specific adapter.
- *Alternative considered*: store each tool's fully-rendered output as the "source of truth" and diff those directly. Rejected — it would mean N sources of truth (one per tool) that can drift from each other; a single canonical content plus per-target overlays keeps exactly one thing to edit and review in a PR.

### 6. Local state and history live in a real, hidden Git repository
`.imwel/` (inside the bound local directory) holds `binding.yaml` (the recorded remote/branch/project/tools/artifacts — referred to as "the local `.imwel` file" in the specs) and `history/`, a separate Git repository — never the host project's own `.git` — initialized the first time `imwel init` runs. Every successful `imwel sync` commits the newly rendered files into `history/`. Rollback (`imwel rollback`) is `git checkout`/`git revert` inside that repository. Conflicts (local edits + upstream update both diverged from the last-synced commit) are resolved with a three-way merge using the last-synced commit as merge base, surfaced as standard conflict markers when they don't resolve cleanly.
- *Alternative considered*: a custom append-only JSON history log with a bespoke diff/merge algorithm. Rejected per this repo's `AGENTS.md` — Git's merge machinery is a proven primitive; reimplementing it is high-risk, low-reward.

### 7. Push/propose always prefers branch + PR/MR; direct push is an explicit opt-in
`imwel push` fetches the latest upstream state first (to avoid an already-stale base), creates a new branch off the current HEAD of the bound branch, reverse-renders local changes into canonical content via the adapter's `parseExisting`, commits, and pushes that branch. By default it then prints the Git host's compare/PR-creation URL; if the `gh` or `glab` CLI is detected and authenticated, it offers to run the PR/MR creation command directly. A per-remote `directPush` flag (set explicitly via `imwel remote add --direct-push` or `imwel remote set`) is the only way to skip branch/PR and commit straight to the bound branch — off by default even for remotes the user can push to directly.
- *Alternative considered*: always require the GitHub/GitLab API (via a token) to open PRs automatically. Rejected as the default — it adds an auth setup step for something a plain `git push` + printed URL already solves with zero extra configuration; API-based auto-PR is offered opportunistically only when `gh`/`glab` is already present and authenticated.

### 8. `imwel propose <file>` only *registers* intent; `imwel push` does the actual Git work
`propose` inspects a not-yet-managed local file, asks which remote/project/type/optional-or-required it should become, and records that intent (locally) so the next `imwel push` includes it alongside any locally-edited already-managed Artifacts. This keeps exactly one code path responsible for "talk to Git and open a PR."
- *Alternative considered*: have `propose` push immediately. Rejected — batching through `push` means a user proposing multiple new Artifacts in one session ends up with one clean PR instead of several, and keeps the mental model "propose = stage, push = commit+PR" consistent with familiar Git vocabulary.

### 9. Drift checks are throttled and never hook into an AI tool's session
A passive check (`git fetch`, cheap) runs on any `imwel` subcommand invocation, gated by a per-remote timestamp file so it runs at most once per a configurable interval (default 4 hours). `imwel sync`/`imwel status` always force a fresh check regardless of the throttle. No daemon, no OS-level scheduled task is installed by default.
- *Alternative considered*: hook into supported AI tools' session start. Rejected per this repo's `AGENTS.md` — no stable, uniform hook exists across the target tools, and it risks interrupting developer flow.

### 10. CLI interface localization is a plain per-locale string-table module
`src/locales/<locale>/strings.ts` (or equivalent) exports a flat key→string map; a small lookup helper resolves the active locale (explicit `--lang` flag → `LANG`/`LC_ALL` env var → English fallback) and falls back to English key-by-key if a given string is missing in a non-English locale, so partial translations never produce blank output.
- *Alternative considered*: adopt a full i18n framework (i18next, etc.) immediately. Rejected for this stage — the string surface is small enough that a flat map with a fallback rule is sufscient and keeps the dependency footprint minimal; can be revisited if the string surface grows substantially.

## Risks / Trade-offs

- **[Risk]** Without any central component, there is no way to know "how many projects/teams use this template repo" — usage-visibility from the earlier platform design is fully lost. → **Mitigation**: explicitly a non-goal for this change; if it matters later, it would require an opt-in, privacy-respecting phone-home added as a separate, clearly-scoped future change — not designed around here.
- **[Risk]** Relying on the system `git` binary means behavior can vary slightly across Git versions/platforms (especially Windows path/line-ending handling). → **Mitigation**: pin a minimum supported Git version in `README.md`/preflight check (`imwel doctor`), and always normalize line endings before hashing/diffing content, consistent with the general normalization principle from prior design discussion.
- **[Risk]** Two independent per-locale surfaces (CLI interface strings vs. scaffold template files) could be confused by contributors. → **Mitigation**: this distinction is called out explicitly in this repo's `AGENTS.md`; keep the two under clearly different directories (`src/locales/` vs `templates/init/<locale>/`).
- **[Trade-off]** Limiting render targets to Cursor + Claude Code for this change means the "many tools" value proposition isn't fully demonstrated yet. Accepted deliberately — breadth is cheaper to add later via the adapter interface (Decision 4) than depth is to retrofit.
- **[Risk]** `imwel push`'s reverse-render (`parseExisting`) must faithfully round-trip tool-specific enrichments back into `targetOverrides`, or repeated push/sync cycles could lose information. → **Mitigation**: cover round-trip fidelity with adapter-level tests (render → parseExisting → render produces identical output) as part of the adapter interface contract, not left as an implicit assumption.

## Migration Plan

Greenfield build; no migration from the withdrawn platform proposal (no code or data existed for it). Suggested rollout: (1) build `template init` + `remote add` + `init` + `sync` for the Cursor adapter only against one real internal template repo; (2) add the Claude Code adapter to validate the interface isn't Cursor-shaped; (3) add `push`/`propose`; (4) add CLI i18n once the interface strings have stabilized enough that translating them isn't wasted churn.

## Open Questions

- Exact throttle interval and whether it should be configurable per-remote or only globally — default to global for this change, revisit if real usage shows a need for per-remote overrides.
- Whether `imwel template init` should default to creating a single example project or demonstrate the multi-project manifest shape from the start — leaning toward a single example project to keep the generated scaffold easy to understand, with multi-project documented in the docs site rather than shown by default.
- Minimum supported Git version to document/enforce via `imwel doctor` — to be determined during implementation based on which `git diff`/`git merge-file` flags are relied upon.
