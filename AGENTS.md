# AGENTS.md — imwel

This file is the canonical source of instructions for any AI coding agent (or human) working on the **imwel** repository itself. imwel is a tool for distributing AI-coding rules/skills/configs via Git; this project practices what it builds — this file plays the same role for imwel's own codebase that imwel helps teams manage for *their* codebases.

## Cursor rules vs this file

- **This file (`AGENTS.md`)** is the tool-agnostic canonical document (humans, Cursor, Claude Code, and other agents).
- **Cursor** additionally loads short, enforceable project rules under `.cursor/rules/` (`imwel-core.mdc` always applies; path-scoped rules cover OpenSpec planning, CLI i18n, and bilingual docs). Those rules summarize hard constraints — they must not replace or fully duplicate this file.
- After a change that affects user-facing behavior, docs, locales, scaffolds, or architecture, run the project skill `.cursor/skills/imwel-change-docs-checklist/` (or follow its checklist) before calling the work done. OpenSpec create/apply/archive flows stay in `.cursor/skills/openspec-*`.

## What imwel is (so generated code matches the intent)

imwel is an **npm-distributed CLI**, with no backend, no database, and no hosted platform. A "template repository" is any ordinary Git repository that follows imwel's manifest convention and holds Artifacts (rules, skills, `agents.md` content). imwel's job is to:

1. Bind a local project directory to one project inside one (of possibly several) remote template repositories.
2. Render that project's Artifacts into the native config format of one or more AI coding tools (Cursor, Claude Code, ...).
3. Detect drift (remote updated / local hand-edited) using Git as the mechanism, not a bespoke diffing/versioning system.
4. Let a user push local edits or newly authored Artifacts back to the template repository via a branch + PR/MR — never a direct commit to a shared branch.

If a proposed change reintroduces a server, database, user-account system, or a custom versioning/permission model to replace something Git or a Git host (GitHub/GitLab/Gitea/...) already provides, stop and flag it — that is very likely scope creep, not a requirement.

## Non-negotiable architecture rules

- **Git is the database.** Content identity, versioning, and history come from Git objects (blob/tree/commit SHAs) and commit graphs. Never invent a separate content-hash, version number, or changelog format when a `git` command already produces the answer.
- **The Git host is the governance layer.** Who can edit a template repo/branch is controlled by GitHub/GitLab/Gitea permissions and branch protection, not by any access-control code inside imwel. Review of proposed changes happens via that host's normal PR/MR flow.
- **`.imwel` bindings are per-directory, not per-repository.** A monorepo is handled by running `imwel init` in each sub-project directory independently; there is no special monorepo mode or configuration branch in the code.
- **`agents.md`-flavored Markdown is the canonical content format for `rule`-type Artifacts.** Tool-specific enrichments (Cursor `.mdc` frontmatter, Claude Code `@path` imports, etc.) are stored as a small structured overlay on the Artifact and only expanded at render time for that specific target — never invent a competing rule-content dialect.
- **Local history, diffing, and rollback are implemented with a real, hidden Git repository** (under the project's `.imwel/` directory), not a bespoke history table or custom diff/patch format. Conflicts between local edits and upstream updates are resolved with standard Git three-way merge, surfaced as standard `<<<<<<<`/`=======`/`>>>>>>>` conflict markers for the user to resolve by hand — never auto-resolve silently and never build a custom "pick A or B" merge UI.
- **Drift/update checks are throttled and fully decoupled from any AI coding tool's session lifecycle.** They may run passively on CLI invocation (throttled, e.g. default 4h, configurable) or on explicit commands (`imwel status`, `imwel sync`). They must never hook into, intercept, or block an AI tool's own chat/agent session.
- **Pushing changes upstream defaults to branch + PR/MR, never a direct commit to a shared/tracked branch.** A direct-push mode may exist only as an explicit, per-remote opt-in (e.g. for a single-user personal remote) and must never be the default.
- **Git operations shell out to the system `git` binary.** Do not add a JS-native Git implementation (e.g. isomorphic-git) as a dependency — shelling out reuses the user's existing SSH keys, credential helpers, and `.gitconfig`, and gives access to Git's own diff/merge algorithms for free.

## Tech stack (do not substitute without updating this file)

- **Language/runtime:** TypeScript on Node.js. Distributed via npm (`npm install -g imwel`, `npx imwel@latest ...`).
- **CLI interaction:** an interactive-prompts library (multi-select/single-select flows) — keep this as the one library used throughout, don't mix multiple prompt libraries.
- **Git access:** child-process calls to the system `git` binary. No embedded Git implementation.
- **Project shape:** a single npm package for v1. Do not introduce monorepo tooling (Nx/Turborepo/workspaces) unless a second independently-versioned deployable is actually added — there is no platform/backend package to justify one today.

## Code conventions

- **All source code — identifiers, comments, commit messages, code-level docstrings — is written in English, with no exceptions.** This maximizes the pool of potential global contributors to the project; it is not a style preference, it is a project policy.
- **User-facing CLI strings (prompts, messages, errors, help text) must never be hardcoded inline.** Route them through a lightweight per-locale string table (`src/locales/<locale>/...`). English is the default/fallback locale; `zh-CN` is the first officially maintained additional locale. Do not pull in a heavyweight i18n framework for this — a plain key→string lookup module is sufficient at this project's size.
- **Generated content that will live inside an *end user's own* template repository** (scaffolded `manifest.yaml` comments, generated `README.md`/`CONTRIBUTING.md` from `imwel template init`) **is a separate concern from the CLI's own interface i18n above.** These are maintained as discrete, per-locale template files (e.g. `templates/init/en/...`, `templates/init/zh-CN/...`), selected by the user at scaffold time (flag or interactive prompt), defaulting to the detected system locale (`LANG`/`LC_ALL`) and falling back to English. Do not build a shared runtime string-substitution system for this — the file count is small enough that maintaining parallel per-locale template files is simpler and easier to review.

## Code simplicity: KISS & YAGNI

- **Prefer the simplest implementation that satisfies the current spec's scenarios — nothing more.** Do not add configuration options, abstraction layers, or extension points for a future need that no current `specs/`/`tasks.md` entry actually requires.
- **A simple feature should not require hundreds of lines or multiple files/classes.** If a command handler, adapter method, or utility function is ballooning far past what its requirement/scenario implies, stop and re-check the design before continuing — that is a signal the approach is wrong, not that the feature is inherently complex.
- **Extract a shared helper only at the second real call site, not preemptively.** Speculative "reusable" utilities written before there are two concrete callers tend to guess the wrong shape; duplication for a single caller is cheaper than a wrong abstraction.
- **Comments explain the non-obvious "why" (a trade-off, a constraint, a reason something looks weird), never the obvious "what".** A comment restating what the next line of code already says clearly should be deleted, not written.
- **Favor small, composable functions over deep inheritance/indirection.** Straight-line, readable code that a new contributor can follow top-to-bottom beats a "clever" layered design, even if the layered version feels more "extensible" — extensibility that isn't used yet is a cost, not a benefit (YAGNI).
- When in doubt between "handle this edge case now" and "this isn't in scope, leave a `// TODO` and move on", prefer the latter unless the edge case is explicitly covered by a spec scenario.

## Project structure conventions

- `src/adapters/` — one module per AI-coding-tool render target (Cursor, Claude Code, ...), each implementing the shared adapter interface: `detect(projectDir)`, `render(artifactVersion)`, `parseExisting(files)`. `parseExisting` is used both for drift detection (reading what's on disk) and for the reverse-render step needed by `imwel push`/`imwel propose` — implement it once, use it for both.
- `templates/init/<locale>/` — the scaffold templates used by `imwel template init`, one directory per supported locale.
- `src/locales/<locale>/` — the CLI's own interface string tables.
- `docs/` — the documentation site source (see Documentation conventions below). Not part of the published npm package.
- No `apps/`, `packages/schema`, or any other multi-package/platform-shaped directory — this project has no backend to house.

## Documentation conventions

- The documentation site is built with an i18n-capable static site generator (VitePress or Docusaurus) with locale folders (`en/`, `zh-CN/`, ...) scaffolded from the first commit, even before every page has a translation.
- **English is the canonical/default version** of the README and the docs site (this is what most of the global OSS audience and GitHub discovery will see first). **Simplified Chinese (`zh-CN`) is the first-priority maintained translation** and should be kept in sync with English, not left to drift.
- Any change that adds or edits user-facing documentation should update the English version and either update the `zh-CN` translation in the same change, or explicitly flag the `zh-CN` page as pending translation — English must never silently get ahead without at least a tracked TODO.
- The top of `README.md` must link to `README.zh-CN.md` (and vice versa) so readers can switch immediately.
- **Iteration documentation duty:** when a change alters CLI behavior, user-visible strings, scaffold templates, or architecture constraints, the implementer must verify the documentation surfaces listed in `.cursor/skills/imwel-change-docs-checklist/` (bilingual README/docs, locale tables, `templates/init` if needed, this file if architecture changed, and `CHANGELOG.md` when that file exists) before marking the change complete.

## Planning artifact language

OpenSpec planning artifacts (`proposal.md`, `design.md`, `specs/**/spec.md`, `tasks.md`) for changes created **after** `imwel-git-native-cli-mvp` should be written in **Simplified Chinese**, reflecting the language this project's design discussions happen in. `imwel-git-native-cli-mvp` itself stays in English as already written — do not translate it retroactively. This is independent of the source-code-must-be-English rule above: planning artifacts are team communication about *what/why*, not code that ships to a global contributor base.

## CLI user experience & execution transparency

imwel is a CLI, not a GUI, but it still runs on behalf of a user who should never be left guessing what is happening. This matters as much as correctness:

- **Every multi-step or network-touching command (`init`, `sync`, `push`, `template init`, the passive throttled check) must print what it is doing as it happens** — which remote is being fetched, which files are being compared, what step is currently running — not just a final "done" or a silent success. A user should be able to tell, from the output alone, what imwel just did without needing `--verbose`.
- **Any prompt that confirms a state-changing action must describe exactly what will change**, not a generic "Are you sure? (y/N)". E.g. "This will overwrite 2 local edits and add 1 new file — continue?" rather than "Proceed?".
- **Long-running Git operations (clone, fetch) show a spinner or progress indicator**, never an apparently-frozen terminal.
- **Error messages are actionable**: state what went wrong and the concrete next step (e.g. "no `git` binary found on PATH — install Git and re-run `imwel doctor`"), not a raw stack trace by default. A `--verbose`/`--debug` flag may reveal the full trace for troubleshooting.
- **Command naming stays consistent with the verbs already established** by this project's specs (`init`, `sync`, `status`, `push`, `propose`, `rollback`, `remote`, `template`) — new commands should read naturally alongside these, not introduce a clashing vocabulary.
- These expectations apply equally regardless of the CLI's resolved interface locale (see `cli-i18n`) — transparency is not something to cut when localizing.

## Safety defaults to preserve in any implementation

- Never write to a file that is not present in the current project's recorded managed-artifacts list without an explicit user action (`imwel init`, `imwel sync` confirmation, `imwel propose`).
- Never silently overwrite a locally hand-edited Artifact — always detect drift and require explicit confirmation or a merge step first.
- Never perform a network fetch/push without being triggered by an explicit command or a throttled passive check — no background daemons, no untriggered polling.
