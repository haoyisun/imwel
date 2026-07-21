# Sync, drift & rollback

> **Consumer path · Step 2 of 3** — Prerequisites: [Install a template](./quickstart.md).

Once bound, keep your installed Artifacts aligned with upstream and recover cleanly when something drifts. [Drift](../concepts/glossary.md) is the divergence between the remote template, your last sync, and your on-disk files — detected via Git.

## Pull upstream updates

```bash
imwel sync            # preview added/removed/modified files, then confirm
```

Non-overlapping local edits and upstream changes are merged automatically; overlapping changes get standard Git conflict markers (`<<<<<<<` / `=======` / `>>>>>>>`) for you to resolve by hand, then:

```bash
imwel sync --continue
```

## Check state at any time

```bash
imwel status          # remote vs local drift + deterministic rule-health checks
```

`imwel status` always force-refreshes and additionally runs advisory **rule-health** checks (empty rules, dead imports, orphan path references) — hints, never blockers. See [`imwel status`](../guide/commands.md#imwel-status).

## Undo an unwanted update

```bash
imwel rollback        # restore a prior state from .imwel/history/
```

Rollback restores a prior history commit and **deletes managed files added after that point** — it never touches unmanaged files. See [`imwel rollback`](../guide/commands.md#imwel-rollback).

## Troubleshooting

| Symptom | What to do |
|---------|-----------|
| `imwel sync` left conflict markers | Resolve the `<<<<<<<`/`=======`/`>>>>>>>` markers by hand, then `imwel sync --continue`. |
| `imwel status` reports a fake clean result in a template repo | You are in a template repo, not a consumer binding — use `imwel lint` instead. |
| A command needs input in CI | Pass the required selection flags (`--tools`, `--remote`, `--branch`, `--project`) and `-y`. |

## Next

- Send your local improvements upstream → [Contribute changes back](./contribute-back.md)
