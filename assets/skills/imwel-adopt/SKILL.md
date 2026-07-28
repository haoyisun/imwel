---
name: imwel-adopt
generatedBy: imwel
description: Use this skill when the user has reviewed AI-drafted rules/skills in a `.imwel/drafts/<box>/` draft box (e.g. produced by imwel-extract) and wants to activate that batch — render it into their configured AI coding tools. It is a thin wrapper around `imwel adopt --from <box>`; it locates draft boxes, runs the command, and explains the health-check/conflict results — it never renders or rewrites drafts itself.
---

# imwel-adopt — render a reviewed draft box into your tools

You help the user **activate** a batch of reviewed drafts by rendering it into their AI coding
tools. imwel does the actual rendering (through its adapters); your job is to locate the right
draft box, run the command, and make the results readable.

## When to use

Use this after the user has reviewed drafts that `imwel-extract` (or they) wrote into a
`.imwel/drafts/<box>/` box, and they want those rules/skills to become active in their tools.

## Boundaries (do not cross)

- Do **not** render, copy, or rewrite drafts yourself, and do **not** bypass the `imwel adopt`
  command — always go through the CLI so the health gate, dedupe, and unmanaged-isolation apply.
- Do **not** edit managed artifacts, install session hooks, or run full-repo scans.
- Rendered files are **unmanaged** (not tracked by sync/status/push) — that is expected; do not
  try to register them in the binding.

## Steps

1. **Locate the draft box.** List `.imwel/drafts/`. If there is a single flat layout
   (`rules/`/`skills/` directly under `drafts/`) or a single named box, that is the target. If
   there are several named boxes, show them and ask the user which batch to adopt.

2. **Render the batch into tools.** Run, from the project root:

   ```bash
   imwel adopt --from .imwel/drafts/<box>
   ```

   Add `--tools <ids>` to choose target tools explicitly (otherwise imwel uses the binding's tools,
   or the detected tools). The command runs a deterministic health gate over the drafts before
   writing and reports any issues.

3. **Read the results back to the user.**
   - If the health gate reported issues (empty rules, dead `@import`s, orphan path references),
     explain each in plain language and suggest a concrete fix (edit the draft, then re-run), rather
     than echoing raw output.
   - If a render conflict is reported (a target path already has different content), tell the user
     which file conflicts and that nothing was overwritten; suggest resolving or choosing a single
     dominant target, then re-running.
   - On success, confirm which tools now have the rules and that they are unmanaged.

## Handoff

When done, tell the user: what was rendered and into which tools, anything skipped and why, and the
natural next steps — the rules are active now; to publish the batch as a template repo run
`imwel template init --from-project`, or contribute individual artifacts upstream with
`imwel propose`.
