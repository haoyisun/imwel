# How to manage modules and tools

Want to add a read-only standards pack, drop a tool, or freeze a module — without throwing away the whole binding?

**What you get:** incremental updates to what this directory installs and which AI tools receive renders.

## Prerequisites

- Existing `.imwel/binding.yaml` from `imwel init`

## Steps

### Change AI tools

```bash
imwel tools
```

Toggle tools (e.g. add `claude-code` beside `cursor`). Confirm the file diff before applying.

### Change read-only modules

```bash
imwel modules
```

Add, remove, or freeze modules (`role: shared` projects). You still bind **at most one** writable project per directory.

### Inspect without network

```bash
imwel binding show
```

## Expected result

- Binding reflects the new tool/module set
- On-disk managed files match after the confirmed apply (and a follow-up `imwel sync` if upstream moved)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Cannot push module edits | Modules are pull-oriented — contribute with [Push via PR](./push-via-pr.md) / `propose`, or edit the template repo. |
| Path collision across tools | imwel may skip a path when two tools disagree — pick a dominant tool or align content. |

## Related

- [Sync and handle drift](./sync-and-drift.md)
- [Manifest — roles](../reference/manifest.md)
