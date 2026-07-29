# How to push changes upstream via PR

Want local rule/skill improvements reviewed like code — on a branch + PR/MR — instead of overwriting the shared template branch?

**What you get:** reverse-render from tool-native files back to canonical Artifacts, a pushed branch, and a compare / PR URL. Direct push to the tracked branch exists only if you explicitly enabled `directPush` on that remote.

## Prerequisites

- Consumer binding with a **writable project** (not only read-only modules)
- Permission to push a branch to the template host
- Optional: `gh` or `glab` on `PATH` if you want CLI-created PRs

## Steps

### 1. Edit in the consumer (tool-native or after sync)

Change files under e.g. `.cursor/rules/` or `CLAUDE.md`, or add a new Artifact you will track.

### 2. Track a new contribution target (when needed)

For a **new** local Artifact, or deliberate edits to a subscribed module:

```bash
imwel propose
```

Pick one remote project/module and toggle tracking. Or pass a path:

```bash
imwel propose path/to/new-rule.md -y --remote org-standards --project example-project
```

### 3. Push

```bash
imwel push
```

Default behavior: create branch `imwel-push-…`, push it, print a compare URL; you may be offered to create a PR with `gh`/`glab`.

Non-interactive sketch:

```bash
imwel push --yes --all --message "chore: update artifacts"
```

### 4. Open / merge the PR on the Git host

Complete review under normal branch protection. Teammates pick up the change with `imwel sync`.

## Expected result

- Upstream branch contains canonical Artifact updates
- No direct commit to the shared default branch (unless that remote has `directPush: true`)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Push refused for module Artifacts | Modules are read-only for normal push — use `imwel propose` for a deliberate contribution, or edit in the template repo. |
| Conflicting reverse-render | Same Artifact differs across tools — resolve on disk so canonical content is unambiguous, then push again. |
| Need direct push (personal remote only) | `imwel remote set <alias> --direct-push` — never the team default. |

## Related

- [Sync and handle drift](./sync-and-drift.md)
- [Author vs consumer](../explanation/author-vs-consumer.md)
- [Commands — push / propose](../reference/commands.md)
