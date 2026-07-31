# How to sync and handle drift

Want upstream template updates without losing (or silently overwriting) your local hand-edits?

**What you get:** an explicit sync preview, Git-based merge/conflict markers when needed, and rollback from the hidden history repo — never a quiet clobber.

## Prerequisites

- A consumer binding (`.imwel/binding.yaml`) from [Consume for Cursor](./consume-for-cursor.md) or [Claude Code](./consume-for-claude-code.md)

## Steps

### 1. See current state

```bash
imwel status
```

Always force-refreshes remotes for the binding (and pending proposals).

### 2. Pull upstream updates

```bash
imwel sync
```

Review the added / removed / modified list, then confirm. Non-interactive:

```bash
imwel sync --yes
```

### 3. If you see conflict markers

Edit the files, remove `<<<<<<<` / `=======` / `>>>>>>>`, then:

```bash
imwel sync --continue
```

### 4. Undo a bad sync (optional)

```bash
imwel rollback
```

Restores a prior `.imwel/history/` commit and deletes **managed** files added after that point — never unmanaged files.

## Expected result

- Tool-native files match the template (plus any merged local edits)
- `imwel status` is clean, or clearly lists remaining drift

## Passive remote notices

Ordinary CLI commands may mention that a remote branch moved (default throttle **2 hours**). That notice compares **remote commits only** — it does not sync files and does not mean your local edits were overwritten. Override with `IMWEL_FETCH_THROTTLE_MS`.

## Fix rule health findings

`imwel status` also runs a deterministic rule-health check over managed rendered files. Findings are advisory (they never change the exit code). Fix each as below:

| Finding | What it means | Fix |
|---------|---------------|-----|
| `[empty]` | A managed rule is empty or placeholder-only | Add substantive guidance, or remove the rule from the template |
| `[dead-import]` | An `@path` import cannot be resolved | Correct the import path, or restore the referenced file |
| `[orphan-ref]` | A backtick path (e.g. `` `src/foo.ts` ``) points to a missing file | Update or remove the reference, or restore the file if it should still exist |

For a deeper, semantic pass (rule↔code mismatch, rule↔rule conflict, missing rules), run `/imwel-audit` — see [Use first-party skills](./use-first-party-skills.md).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Sync left conflict markers | Resolve by hand → `imwel sync --continue`. |
| Status “clean” in a template repo | You are not in a consumer binding — use `imwel lint` there. |
| CI needs a selection | Pass `--tools`, `--remote`, `--branch`, `--project`, and `-y`. |

## Related

- [Push via PR](./push-via-pr.md)
- [Drift and history (why)](../explanation/drift-and-history.md)
- [Commands](../reference/commands.md)
