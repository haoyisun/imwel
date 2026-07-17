---
name: imwel-extract
description: Use this skill when the user wants to draft project-fit AI coding rules or skills for a codebase that has few or none yet. It reads the deterministic project fingerprint produced by `imwel scan`, targeted-reads the key files it points to, and drafts rule/skill artifacts into an isolated review folder — it never edits managed artifacts directly.
---

# imwel-extract — draft project-fit rules from a scan fingerprint

You help the user bootstrap AI coding rules/skills for **this** project. imwel has already
done the cheap, deterministic part (scanning). Your job is the semantic part: read the map,
look where it points, and draft high-quality, project-specific rules.

## When to use

Use this when the project has little or no existing rule coverage and the user wants a
starting set of rules/skills tailored to their actual codebase — not generic boilerplate.

## Inputs

- `.imwel/fingerprint.yaml` — the deterministic scan output. If it is missing, tell the user
  to run `imwel scan` first, then continue.
- The files the fingerprint points to (manifests, tooling configs, top-level dirs, DB schema,
  existing scattered rule files).

## Procedure

1. **Read the fingerprint.** Parse `.imwel/fingerprint.yaml`. Note the dominant languages,
   the manifest/build files, the test/lint/format/CI configs, top-level directory layout,
   DB schema/migration files, and any existing scattered rule-file locations.
2. **Targeted reads only.** Do NOT scan the whole repo. Open only what the fingerprint points
   to: the manifest(s) for stack/scripts, the lint/format config for style rules, the test
   config for how tests are run, a couple of representative source files per dominant language,
   and any existing rule files (to avoid duplicating or contradicting them).
3. **Infer conventions, not guesses.** Base each rule on concrete evidence you read (a lint
   rule that is enabled, a script in the manifest, an actual directory convention). If you are
   unsure, leave a `TODO(verify)` marker rather than inventing a convention.
4. **Draft into an isolated folder.** Write drafts under `.imwel/drafts/` (create it if needed):
   - Rules: `.imwel/drafts/rules/<slug>.md` — agents.md-flavored Markdown. Keep each rule
     focused and actionable; explain the *why* when non-obvious.
   - Skills: `.imwel/drafts/skills/<slug>/SKILL.md` — include a triggerable frontmatter
     `description` that says *when* to use the skill.
5. **Summarize.** List what you drafted and the evidence behind each item, and flag anything
   that needs the user's confirmation.

## Guardrails

- **Drafts are proposals, not managed artifacts.** Everything goes under `.imwel/drafts/`.
  Never edit files already managed by imwel, and never write outside `.imwel/drafts/`.
- **No fabrication.** Prefer fewer, well-grounded rules over many speculative ones.
- **Hand back to imwel.** After the user reviews the drafts, they consolidate/publish them via
  `imwel adopt` (or register individually with `imwel propose`) — do not attempt to wire them
  into the sync pipeline yourself.
