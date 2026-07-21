# Contribute changes back

> **Consumer path · Step 3 of 3** — Prerequisites: [Install a template](./quickstart.md), [Sync, drift & rollback](./sync-and-drift.md).

When you improve a rule locally, send it upstream so the whole team benefits. Upstream contribution defaults to **branch + PR/MR**, never a direct commit to a shared branch.

## Push local edits

```bash
imwel push            # reverse-render local tool files → canonical, open a branch + PR/MR
```

`imwel push` reverse-renders **every** bound tool that has installed paths back into canonical Artifacts; conflicting canonical content fails the push so nothing ambiguous is sent. See [`imwel push`](../guide/commands.md#imwel-push).

## Register a brand-new artifact

```bash
imwel propose <file>  # register a new artifact for the next push
```

Use `imwel propose` when you authored a wholly new rule/skill locally and want it included in the next push. See [`imwel propose`](../guide/commands.md#imwel-propose-file).

> This is the **consumer feedback path**, distinct from maintaining a template repo itself — for that, see the [Author path](../author/quickstart.md).

## Next

- Maintain your own template instead? → [Author path](../author/quickstart.md)
- Full flag reference → [Commands](../guide/commands.md)
