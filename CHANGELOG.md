# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Modules & multi-project bindings: a consumer directory can now install any number of **read-only modules** (`role: shared` in the manifest — reusable standards like a Python or Vue 3 pack) alongside **at most one writable project** (`role: project`). Authors declare intent via the new optional `role` field; a missing role defaults to `project` (backward-compatible). `imwel init` groups the selection (tools, modules, writable project) behind a unified toggle → diff → second-confirm flow, and legacy single-project bindings are auto-normalized on read. New `imwel modules` command adds/removes/freezes modules incrementally. `imwel sync` walks every bound project, skips **frozen** modules, and — because modules are pull-only — never silently overwrites local edits to a module: it prompts to **discard / freeze / uninstall** (non-interactive `--yes` defaults to freeze). `imwel push` only pushes the writable project's edits; contributing back to a module is done deliberately via `imwel propose` (a reviewed PR/MR). Cross-source path conflicts are reported with their source projects. Docs (bilingual: manifest roles, `imwel init`/`imwel modules`/`imwel sync`, consumer quickstart with rebinding/multi-remote risk notes) updated.
- Rule metadata overlay (authoring side): a `rule` source file may carry a small YAML frontmatter overlay (`description` / `globs` / `alwaysApply`, plus an optional `imwel:` tool-specific block). imwel parses it into semantic overrides and strips it from the canonical body, so rules render with the right description/glob/trigger in every tool instead of degrading to the filename slug. The author overlay is the cross-tool default; a consumer's per-tool edit still takes precedence. The `imwel-extract` skill contract and the scaffolded example rule now author this overlay, and `docs/**/guide/manifest.md` documents the schema and the three trigger intents (always-on / glob-attached / agent-requested).
- Skill description propagation: when a skill is rendered as an on-demand rule for a tool without a native skills directory (cline/windsurf/kiro, …), its `SKILL.md` `description` now propagates into the generated rule frontmatter instead of falling back to the filename slug.
- `imwel adopt --from`: adopt reviewed AI drafts from `.imwel/drafts/` (written by `imwel-extract`) into canonical artifacts, closing the draft→adopt loop. Reuses the existing consolidation/write path and runs the deterministic rule-health gate (empty rules, dead imports, orphan path references) over the drafts before writing — the issue count is surfaced in the confirmation prompt and nothing is written silently (non-interactive shells require `-y`). Existing tool-native `imwel adopt` behavior is unchanged.
- `imwel-extract` / `imwel-audit` authoring-quality upgrade: both first-party skills now consume the `imwel scan` Git-history overlay (hotspots as rule candidates / strong missing-rule signals, co-changes as cross-file hints) with graceful fallback when history is unavailable or low-confidence, and follow an explicit authoring standard — progressive disclosure, short rules with do/don't examples, precise triggerable descriptions, evidence over guesses — plus a pre-handoff self-check. Boundaries unchanged (isolated `.imwel/drafts/` and `.imwel/audit/`, no session hooks, no full scans).
- `imwel scan` Git-history overlay: when the project is a Git repository, the fingerprint gains an optional `history` section with change **hotspots** and **co-change** pairs (with evidence counts) mined from recent commits — the highest-value places for rule authoring. Read-only, shells out to system `git`, deterministic, and degrades gracefully across three levels (full / low-confidence for new-or-shallow repos / none when there is no `.git` or no commits); `scan` prints which level applied. Never tied to any AI tool session.

- Task-oriented bilingual Usage guide (`docs/en/guide/usage.md` + `docs/zh-CN/guide/usage.md`) covering install, core concepts, consumer and template-author workflows, cold-start/rule-freshness, and troubleshooting; linked from the docs nav/sidebar and both READMEs. Added a `usage-doc-sync` Cursor rule and a docs-checklist item requiring the guide to stay in sync with user-visible changes.

- `imwel-audit` first-party skill: AI-driven semantic rule audit that flags rule↔code mismatches, rule↔rule conflicts, and missing rules using the scan fingerprint for targeted reads, writing actionable suggestions to `.imwel/audit/` (explicit invocation; never hooks the AI tool session). Installed via `imwel skill install`.
- `imwel skill install`: install imwel's first-party skills (starting with `imwel-extract`) into selected tools via the existing render adapters; first-party assets are unmanaged (not registered in the binding, history, or tracked by sync/status/push). `imwel-extract` reads the `imwel scan` fingerprint and drafts project-fit rules/skills into `.imwel/drafts/` for review.
- `imwel scan`: deterministic, LLM-free project fingerprint written to `.imwel/fingerprint.yaml` (language mix, manifests, test/lint/format/CI configs, top-level dirs, DB schema files, scattered rule-file locations) — a low-cost map for downstream AI rule authoring; inspects file names/paths only (never contents) and skips heavy directories.
- Rule health checks: deterministic, LLM-free static checks (empty/placeholder rules, dead `@import`s, orphan path references) surfaced by `imwel status` (consumer-side, advisory) and `imwel lint` (template-side, empty-only, warning level).
- `imwel adopt`: consolidate existing scattered tool-native rules/skills (`.cursor/rules`, `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, …) into canonical artifacts under `.imwel/adopted/` — reverse-parses across all 14 adapters via a new `Adapter.discoverExisting`, merges identical content, surfaces cross-tool conflicts without overwriting, and runs without a binding/remote (cold start).
- Twelve additional render adapters: `trae`, `qoder`, `codex`, `opencode`, `zcode`, `gemini-cli`, `windsurf`, `continue`, `cline`, `kiro`, `copilot`, `aider` (shared strategy helpers, skill fidelity ladder R1–R4, AGENTS.md path dedupe/conflict handling).
- Documentation site depth (VitePress): bilingual Guide (architecture, manifest, commands, example template, template authoring) and Contribute (adapters) pages; `docs:dev` / `docs:build` scripts.
- Template author experience: `imwel lint`, repository context detection (`template` / `consumer` / `neither` / `ambiguous`), and Cursor slash-command / skill / rule packs scaffolded by `imwel template init`.
- Open-source release readiness: CONTRIBUTING (en/zh-CN), SECURITY, GitHub Issue/PR templates, npm package metadata, publish workflow.

### Changed

- Documentation information architecture overhaul: the docs site is reorganized by **purpose + audience** (Diátaxis-lite) instead of one flat guide list. New grouped sidebar — Getting started / Consumer path / Author path / Reference / Concepts / Contribute — with a "choose your path" landing page, per-page breadcrumbs and a consistent "Next" hand-off on every page, a new Glossary, and single-source getting-started commands. Consumer and author workflows are now ordered step-by-step tracks (`consume/**`, `author/**`); the former `example-template` and `template-authoring` pages are retired into the Author path with redirect stubs. Fully bilingual (en canonical + zh-CN mirrored).
- Onboarding UX: `imwel remote add` now accepts a single URL and derives the local alias from it (`imwel remote add <url>`), with `--as <alias>` to override; the `add <alias> <url>` form still works. `imwel init` auto-selects the remote when only one is configured (no `--remote` needed). `imwel template init` no longer prompts for a name up front — it defaults to the directory name and only asks when you opt into creating a remote repo. The bilingual Usage guide gains a two-lane (author / consumer) quick walkthrough that makes explicit that publishing a template is plain `git push` (there is no `imwel publish`).
- `imwel lint` now warns when a rule has no frontmatter `description` (`rule.descriptionMissing`) or a non-triggerable one (`rule.descriptionNotTriggerable`), at warning level for parity with the existing skill description checks (`--strict` fails on them).

## [0.1.0] - 2026-07-10

### Added

- Initial Git-native CLI MVP: `doctor`, `remote`, `template init`, `init`, `sync`, `status`, `rollback`, `push`, `propose`.
- Cursor and Claude Code render adapters.
- CLI interface locales: English and Simplified Chinese.
- Local binding (`.imwel/binding.yaml`) and hidden history Git repo under `.imwel/history/`.
- Throttled passive remote checks; branch + PR upstream contribution by default.

[Unreleased]: https://github.com/haoyisun/imwel/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/haoyisun/imwel/releases/tag/v0.1.0
