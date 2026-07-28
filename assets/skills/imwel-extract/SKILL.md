---
name: imwel-extract
generatedBy: imwel
description: Use this skill when the user wants to draft project-fit AI coding rules or skills for a codebase that has few or none yet. It reads the deterministic project fingerprint produced by `imwel scan` (including its Git-history overlay), targeted-reads the key files it points to, and drafts rule/skill artifacts into an isolated review folder — it never edits managed artifacts directly.
---

# imwel-extract — draft project-fit rules from a scan fingerprint

You help the user bootstrap AI coding rules/skills for **this** project. imwel has already
done the cheap, deterministic part (scanning). Your job is the semantic part: read the map,
look where it points, and draft high-quality, project-specific rules.

## When to use

Use this when the project has little or no existing rule coverage and the user wants a
starting set of rules/skills tailored to their actual codebase — not generic boilerplate.

## Inputs

- `.imwel/fingerprint.yaml` — the deterministic scan output. **If it is missing, run `imwel scan`
  yourself** (it is a fast, deterministic, read-only CLI command) and continue in the same session —
  do not stop and ask the user to run it manually. If it already exists, reuse it by default (only
  re-run `imwel scan` when the user explicitly asks to refresh).
- The files the fingerprint points to (manifests, tooling configs, top-level dirs, DB schema,
  existing scattered rule files).

## Procedure

1. **Ensure a fingerprint, then read it.** If `.imwel/fingerprint.yaml` is missing, run
   `imwel scan` yourself first. Parse it. Note the dominant languages,
   the manifest/build files, the test/lint/format/CI configs, top-level directory layout,
   DB schema/migration files, and any existing scattered rule-file locations. In your final
   summary, note whether you reused an existing fingerprint or generated a fresh one.
2. **Use the Git-history overlay to prioritize.** If `history.available` is true, treat it as
   a candidate list, not a conclusion:
   - **Hotspots** (`history.hotspots`) — the files/areas that change most often are the highest
     value places to have a rule. Start your reading there.
   - **Co-changes** (`history.coChanges`) — files that keep changing together hint at a
     cross-file convention or coupling worth capturing in a rule.
   - **Confidence** — if `history.available` is false or `history.confidence` is `low` (new or
     shallow repo), fall back to the file-tree signals only and say so in your summary; never
     treat low-confidence frequency as proof of a convention.
3. **Targeted reads only.** Do NOT scan the whole repo. Open only what the fingerprint points
   to (and the hotspots above): the manifest(s) for stack/scripts, the lint/format config for
   style rules, the test config for how tests are run, a couple of representative source files
   per dominant language, and any existing rule files (to avoid duplicating or contradicting
   them). Frequency is a pointer; the evidence for a rule is what you actually read.
4. **Infer conventions, not guesses.** Base each rule on concrete evidence you read (a lint
   rule that is enabled, a script in the manifest, an actual directory convention, a hotspot's
   real code). If you are unsure, leave a `TODO(verify)` marker rather than inventing one.
5. **Draft into a uniquely-named draft box**, following the Authoring standard below. Pick a box
   name of the form `<topic>-<timestamp>` (a short topic slug for this batch plus a timestamp, e.g.
   `api-conventions-20260724-1830`) so repeated runs never collide, and write this batch under
   `.imwel/drafts/<box>/` (create it if needed):
   - Rules: `.imwel/drafts/<box>/rules/<slug>.md` — agents.md-flavored Markdown, with a small
     frontmatter metadata overlay (see "Rule metadata" below). Keep the body plain Markdown.
   - Skills: `.imwel/drafts/<box>/skills/<slug>/SKILL.md` — with a triggerable frontmatter
     `description`. Put large or rarely-needed detail in linked `reference/*.md` files rather
     than in the SKILL.md body.
6. **Summarize and self-check.** List what you drafted and the evidence behind each item
   (cite hotspots where relevant). Then run the Self-check below and list any item that does
   not yet meet the standard, so the user can confirm or strengthen it.
7. **Hand off (three parts).** End with a prominent, three-part handoff — not buried in a
   footnote:
   1. **Location** — the exact draft box path (`.imwel/drafts/<box>/`) and the files in it.
   2. **Review** — ask the user to review each draft, noting the evidence/source you cited.
   3. **Next step** — once they are happy, run `imwel adopt --from .imwel/drafts/<box>` (or invoke
      the `imwel-adopt` skill) to render this batch into their tools and make it active; to package
      a batch into a publishable template repo, use `imwel template init --from-project`.

## Authoring standard

Drafts must follow these, because a rule/skill that a tool cannot load or trust is worse than
none:

- **Progressive disclosure (skills).** frontmatter `description` says precisely *when* to use
  the skill; the SKILL.md body stays short and holds only the common path; push bulky or
  rarely-needed detail into linked `reference/*.md`, not the body.
- **Precise, triggerable description.** The description names concrete situations/triggers, not
  a vague one-liner. Bad: "Helps with the database." Good: "Use when adding or changing a Prisma
  model or migration under `prisma/`."
- **Short, focused rules with examples.** Each rule covers one concern and is actionable. Where
  a convention has a clear right/wrong form, include a **do / don't** pair, and state the
  non-obvious *why*. Prefer several small rules over one long, vague rule.
- **Rule metadata (frontmatter overlay).** Each rule draft starts with a small YAML frontmatter
  overlay so tools can trigger it reliably (without it, the rule degrades to a filename slug):
  - `description` — always required; a precise, triggerable one-liner saying *when/why* the rule
    applies (same bar as a skill description).
  - Choose exactly one trigger intent:
    - **always-on** — set `alwaysApply: true` (only for a rule that must always be active).
    - **glob-attached** — set `globs: ["<path glob>"]` when the rule is specific to certain files.
    - **agent-requested** — set neither `globs` nor `alwaysApply: true`; the model invokes it by
      `description` alone.
  - Keep metadata in frontmatter only; the rule body stays plain agents.md-flavored Markdown.
- **Evidence over guesses.** Every rule traces to something you read. Mark anything uncertain
  with `TODO(verify)`; prefer fewer, well-grounded rules over many speculative ones.

## Self-check (run before handing back)

- Does each skill draft have a precise, triggerable `description` and a concise body?
- Is each rule short, single-concern, and (where applicable) accompanied by a do/don't example?
- Does each rule have a precise `description`, and a correct trigger intent (path-specific rules
  set `globs`; only truly always-on rules set `alwaysApply: true`)?
- Is every rule backed by evidence you actually read, with guesses marked `TODO(verify)`?
- Did you keep everything inside this batch's `.imwel/drafts/<box>/` and leave managed artifacts untouched?

## Guardrails

- **Drafts are proposals, not managed artifacts.** Everything goes under this batch's
  `.imwel/drafts/<box>/`. Never edit files already managed by imwel, and never write outside
  `.imwel/drafts/`.
- **No fabrication.** Prefer fewer, well-grounded rules over many speculative ones.
- **No session hooks, no full scans.** This runs only when invoked; never install session
  hooks or background watchers, and always go through the fingerprint for targeted reads.
- **Hand back to imwel.** After the user reviews the drafts, they render them into their tools via
  `imwel adopt --from .imwel/drafts/<box>` (or the `imwel-adopt` skill), register individual
  artifacts with `imwel propose`, or package a template with `imwel template init --from-project` —
  do not attempt to wire them into the sync pipeline yourself.
