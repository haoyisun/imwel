---
name: imwel-audit
description: Use this skill when the user wants to audit whether a project's existing AI coding rules still match the codebase. It reads the current rules plus, guided by the `imwel scan` fingerprint, the relevant code, and flags semantic rot — rules that contradict the code, rules that contradict each other, and conventions that have no rule yet. It writes actionable suggestions to a review folder and never edits managed rules directly.
---

# imwel-audit — audit rules for semantic drift against the code

Deterministic checks (`imwel status` / `imwel lint`) already catch empty rules, dead imports,
and orphan path references. Your job is the semantic layer they cannot reach: does each rule
still *mean* something true about this codebase?

## When to use

Use this when a project already has rules and the user wants to know which ones have drifted
out of sync with the actual code, conflict with each other, or leave new conventions uncovered.

## Inputs

- The project's current rules — canonical rules under the imwel rules directory and/or the
  tool-native rendered rule files (e.g. `.cursor/rules/`, `CLAUDE.md`).
- `.imwel/fingerprint.yaml` — the deterministic scan output. If it is missing, tell the user to
  run `imwel scan` first, then continue.
- The code the fingerprint points to (dominant languages, tooling configs, key directories).

## Procedure

1. **Read the rules.** Collect every current rule and note the concrete claim each one makes
   (a pattern to follow, a library to use, a directory convention, a workflow step).
2. **Read the fingerprint, then targeted-read code.** Do NOT scan the whole repo. Use the
   fingerprint to open only what a claim depends on — the manifest/lint/test config for
   tooling claims, representative source files for pattern claims, the relevant directory for
   layout claims.
3. **Flag three kinds of semantic drift**, each backed by evidence you actually read:
   - **Rule ↔ code mismatch** — the rule states X, the code does Y (cite the file/line).
   - **Rule ↔ rule conflict** — two rules give contradictory guidance (cite both).
   - **Missing rule** — a clear, repeated convention in the code that no rule covers.
4. **Write actionable suggestions to an isolated folder.** Create `.imwel/audit/` if needed and
   write a report (e.g. `.imwel/audit/report.md`). For each finding include: which rule is
   affected, the drift type, the evidence, and a concrete suggested wording (or a proposed new
   rule). Mark anything uncertain with `TODO(verify)`.
5. **Summarize** the findings and hand back to imwel.

## Guardrails

- **Explicit, one-shot.** This runs only when invoked. Never install session hooks or background
  watchers, and never tie audits to the AI tool's chat lifecycle.
- **Suggestions, not edits.** Write only under `.imwel/audit/`. Never edit managed rules directly
  and never rewrite rules automatically.
- **Evidence over guesses.** Every finding must cite what you read; prefer fewer, grounded
  findings over speculation.
- **No full scans.** Always go through the fingerprint for targeted reads to keep cost bounded.
- **Hand back to imwel.** After the user reviews `.imwel/audit/`, they apply changes via
  `imwel adopt` (or `imwel propose`) and push upstream — you do not wire changes into sync.
