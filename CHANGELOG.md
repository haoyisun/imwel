# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

## [0.1.0] - 2026-07-10

### Added

- Initial Git-native CLI MVP: `doctor`, `remote`, `template init`, `init`, `sync`, `status`, `rollback`, `push`, `propose`.
- Cursor and Claude Code render adapters.
- CLI interface locales: English and Simplified Chinese.
- Local binding (`.imwel/binding.yaml`) and hidden history Git repo under `.imwel/history/`.
- Throttled passive remote checks; branch + PR upstream contribution by default.

[Unreleased]: https://github.com/haoyisun/imwel/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/haoyisun/imwel/releases/tag/v0.1.0
