---
name: imwel-consumer
description: "Use when working in an imwel-bound consumer project (binding.yaml present). Covers sync, status, drift, and feeding changes upstream with propose/push — not editing the remote template manifest in place."
---

# Consumer pack

## Preconditions

1. Confirm context: nearest `.imwel/` has `binding.yaml` and no `manifest.yaml`.
2. If context is template / neither / ambiguous, stop and follow `/imwel-author` — do **not** apply this pack.

## Workflow

1. **Stay current**: `imwel status` for drift; `imwel sync` to pull approved upstream updates.
2. **Local edits**: edit rendered/managed files carefully; imwel detects drift and will not silently overwrite without confirmation.
3. **Feed upstream**:
   - Existing managed Artifacts → `imwel push` (branch + PR by default)
   - New local files → `imwel propose <file>` then `imwel push`
4. **Do not** treat this directory as the template repo: do not edit a remote `manifest.yaml` here or invent template layout under the consumer tree.

## Authoring templates

To author template content, clone the template repository and use `/imwel-author` there with `imwel lint`.
