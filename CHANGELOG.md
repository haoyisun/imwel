# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
