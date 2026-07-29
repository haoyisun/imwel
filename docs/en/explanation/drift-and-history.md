# Drift and the history repo

## What “drift” means

Drift is divergence between:

1. the remote template commit you care about,
2. the last installed state imwel recorded, and
3. the files currently on disk in the consumer directory.

imwel detects that with Git — it does not invent a parallel content-hash scheme.

## Why a hidden history repo

Under `.imwel/history/` imwel keeps a **real Git repository** of installed states. That gives:

- diffs and `imwel rollback` with normal Git semantics
- three-way merge when local edits and upstream updates overlap
- standard conflict markers for humans — **never** silent auto-resolve

## Why checks are throttled

Passive remote notices on ordinary CLI commands (default every few hours) only report that a **remote branch tip moved**. They do not sync files, do not inspect local edits, and never hook an AI tool’s chat session. Explicit `imwel status` / `imwel sync` always refresh.

## Operational guide

You want the steps, not the rationale → [Sync and handle drift](../how-to/sync-and-drift.md).
