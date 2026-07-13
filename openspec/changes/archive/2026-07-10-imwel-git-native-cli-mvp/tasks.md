## 1. Project Setup

- [x] 1.1 Scaffold the npm package (TypeScript, Node.js), single package per this repo's `AGENTS.md` (no monorepo tooling)
- [x] 1.2 Add the interactive-prompts library and standardize its use across all commands
- [x] 1.3 Add a thin wrapper around shelling out to the system `git` binary (never an embedded JS Git implementation), with a preflight `imwel doctor` check for a minimum supported Git version
- [x] 1.4 Set up `~/.imwel/` global config file handling (create-on-first-run, read/write helpers)

## 2. Remote Management

- [x] 2.1 Implement `imwel remote add <alias> <url> [--direct-push]`, rejecting alias collisions
- [x] 2.2 Implement local cache clone creation under `~/.imwel/cache/<alias>/` on add
- [x] 2.3 Implement `imwel remote list`
- [x] 2.4 Implement `imwel remote remove <alias>`, warning if local `.imwel` bindings still reference it
- [x] 2.5 Implement `imwel remote set <alias> --direct-push` to toggle the direct-push opt-in after creation
- [x] 2.6 Implement the shared cache-refresh helper (`git fetch`) used by init/sync/push, respecting the throttle from Section 8

## 3. Template Repository Manifest

- [x] 3.1 Define and validate the `.imwel/manifest.yaml` schema: `conventions`, `projects[].name/path/optional`, per-project convention overrides
- [x] 3.2 Implement manifest resolution (effective conventions per project, merging repo-level defaults with per-project overrides)
- [x] 3.3 Add clear error reporting when a repository has no manifest or an invalid one

## 4. Template Repository Scaffolding (`imwel template init`)

- [x] 4.1 Build the scaffold generator: manifest with inline comments, one example project (rule + skill + `agents.md`), README, CONTRIBUTING
- [x] 4.2 Implement per-locale scaffold templates under `templates/init/<locale>/`, starting with `en` and `zh-CN`
- [x] 4.3 Implement locale selection (explicit choice, default to detected system locale, fallback to English)
- [x] 4.4 Implement optional `git init` + initial commit during scaffold
- [x] 4.5 Implement optional remote repository creation + push via `gh`/`glab` CLI detection, skipping gracefully when unavailable

## 5. Render Adapter Interface

- [x] 5.1 Define the shared adapter interface (`detect`, `render`, `parseExisting`) and the Artifact/`targetOverrides` data shapes
- [x] 5.2 Implement the Cursor adapter: render `type=rule` to `.cursor/rules/*.mdc` with glob/activation-mode overrides; implement `parseExisting` for round-trip
- [x] 5.3 Add adapter contract tests: render → parseExisting → render produces equivalent output (round-trip fidelity)

## 6. Project Binding (`imwel init`)

- [x] 6.1 Implement the guided flow: select tools → select remote → select branch → select manifest project → select optional artifacts
- [x] 6.2 Implement artifact installation across all selected adapters for the chosen project
- [x] 6.3 Write the local `.imwel` binding file (remote/branch/project, last-synced SHA, selected tools, per-artifact source/installed-path/optional/local-edit fields)
- [x] 6.4 Guard against re-running `imwel init` on an already-bound directory without confirmation
- [x] 6.5 Implement the rebind command (change remote/branch/project) with an explicit "sync now?" prompt instead of auto-syncing

## 7. Local History and Sync Engine

- [x] 7.1 Initialize `.imwel/history/` as its own Git repository on first `imwel init`, committing the initial installed state
- [x] 7.2 Implement drift detection: compare recorded last-synced SHA vs. remote branch SHA, and on-disk files vs. last history commit
- [x] 7.3 Implement `imwel status` (read-only reporting of both kinds of drift)
- [x] 7.4 Implement diff preview for `imwel sync` using `git diff` scoped to the bound project's path, listing added/removed/modified artifact files
- [x] 7.5 Implement the confirm-before-apply flow; on confirmation, render files and commit the new state into `.imwel/history/`
- [x] 7.6 Implement the throttled passive check (default 4h, per remote) triggered on any CLI invocation, non-blocking; ensure `sync`/`status` always force a fresh check
- [x] 7.7 Implement `imwel rollback` using `.imwel/history/`'s commit log

## 8. Conflict Resolution (Three-Way Merge)

- [x] 8.1 Implement three-way merge using the last history commit as merge base when both remote and local have diverged
- [x] 8.2 Auto-apply non-overlapping merges; write standard conflict markers for overlapping changes
- [x] 8.3 Implement `imwel sync --continue` to finalize a sync after manual conflict resolution
- [x] 8.4 Add tests covering non-overlapping auto-merge and overlapping conflict-marker scenarios

## 9. Claude Code Adapter

- [x] 9.1 Implement rendering `type=rule` to `CLAUDE.md` and `type=skill` to `.claude/skills/<name>/SKILL.md` (+ bundle files)
- [x] 9.2 Implement `parseExisting` for Claude Code content; add round-trip fidelity tests
- [x] 9.3 Validate the adapter interface required no changes to core init/sync/push logic (confirms Decision 4 in design.md)

## 10. Contribute Upstream (`imwel push` / `imwel propose`)

- [x] 10.1 Implement local-edit detection for already-managed artifacts as push candidates
- [x] 10.2 Implement `imwel propose <file>` to register a not-yet-managed local file as a new-artifact candidate (remote/project/type/optional, no Git operations)
- [x] 10.3 Implement reverse-rendering of push candidates via each adapter's `parseExisting`
- [x] 10.4 Implement fetch-latest + rebase-onto-latest-upstream before committing, reusing the three-way-merge mechanism from Section 8
- [x] 10.5 Implement branch creation + commit + push as the default path; implement direct-push-to-bound-branch only when the remote has `directPush` enabled
- [x] 10.6 Implement compare-URL printing after push; implement `gh`/`glab` detection and optional automatic PR/MR creation
- [x] 10.7 Add tests: default remote never commits directly, opted-in remote can, conflicting upstream changes block the push until resolved

## 11. CLI Interface Localization

- [x] 11.1 Implement the per-locale string-table modules under `src/locales/<locale>/`, starting with `en` and `zh-CN`
- [x] 11.2 Implement locale resolution: `--lang` flag → `LANG`/`LC_ALL` env var → English fallback, with per-key fallback to English for missing translations
- [x] 11.3 Migrate all existing hardcoded interface strings in commands built so far (Sections 2–10) to the string-table lookup
- [x] 11.4 Add a lint/check step that fails CI if a new hardcoded user-facing string literal is introduced outside the locale modules

## 12. Documentation and Project Polish

- [x] 12.1 Write `README.md` (English, canonical) and `README.zh-CN.md`, cross-linked at the top of each
- [x] 12.2 Scaffold the docs site (VitePress or Docusaurus) with `en/` and `zh-CN/` locale folders from the first commit
- [x] 12.3 Document the quickstart flow (`npx imwel@latest template init` → `remote add` → `init` → `sync`) prominently in the README
- [x] 12.4 Cross-check this change's implementation against `AGENTS.md`'s architecture rules and tech stack section; update `AGENTS.md` only if a genuinely new constraint was discovered during implementation

## 13. End-to-End Validation

- [x] 13.1 Walk through the full loop against one real template repository: `template init` → `remote add` → `init` (Cursor only) → edit upstream → `sync` shows diff → confirm → artifact updated
- [x] 13.2 Repeat the walkthrough with Claude Code selected instead of/alongside Cursor, including a `type=skill` artifact
- [x] 13.3 Simulate a local hand-edit plus an upstream update to validate the three-way-merge and conflict-marker flow end-to-end
- [x] 13.4 Walk through `imwel propose` on a new local rule followed by `imwel push`, verifying a branch is created and a compare URL (or PR, if `gh` available) is produced
- [x] 13.5 Verify `imwel rollback` restores a prior state after an unwanted sync
- [x] 13.6 Record any gaps found during the walkthrough as follow-up items rather than expanding this change's scope

### Follow-up items (13.6 — out of scope for this change)

- Add a non-interactive `--yes` / fixture mode for automated E2E tests of interactive `init`/`sync`/`push` CLI flows (core logic is covered by `npm run e2e`).
- `imwel rollback` does not remove files added after the restored commit (documented limitation).
- Per-remote throttle override (design open question) — only global `IMWEL_FETCH_THROTTLE_MS` env var today.

### E2E walkthrough (2026-07-10)

Automated via `npm run e2e` (`scripts/e2e-walkthrough.mjs`) — **15/15 checks passed**.

Bugs found and fixed during the walkthrough:
- `IMWEL_HOME` env var now respected (isolated test/home dirs).
- Skill artifact `bundleDir` path resolution (`artifacts.ts`).
- Optional skill matching by directory root, not only `SKILL.md` path.
- Sync merge false-positives on Windows — use history-repo `git diff` (`listDirtyPaths`) instead of raw string compare.
- `restoreToCommit()` default `paths=[]` for full-tree restore.
