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

Push only lists Artifacts that still differ from the remote template (or from the last successful push commit). Already-merged skills/rules with no new local edits do **not** appear. If exactly one candidate remains, interactive push skips the multi-select and asks once to confirm that single path.

Non-interactive sketch:

```bash
imwel push --yes --all --message "chore: update artifacts"
```

You can edit in **one** bound tool (for example Cursor). Push authors reverse-render from tools that have dirty paths relative to `.imwel/history` — clean copies in other tools do not block the push. Other tools refresh after the PR merges and you (or teammates) run `imwel sync`.

If several tools all have dirty, conflicting edits, pick a winner:

```bash
imwel push --from cursor
```

Interactive push can also ask which authoring tool should win.

### 4. Open / merge the PR on the Git host

Complete review under normal branch protection.

### 5. Sync to finish the loop

```bash
imwel sync
```

After merge, sync installs the Artifact into binding. **Project** contribution tracking is removed (graduated). **Module** tracking stays (ongoing authorization) but its remote baseline refreshes so passive “template updates” notices stop nagging. Then you can author the next Artifact without re-selecting the old one.

## Expected result

- Upstream branch contains canonical Artifact updates (skills as `skills/<slug>/SKILL.md` + companions)
- No direct commit to the shared default branch (unless that remote has `directPush: true`)
- Push does **not** rewrite other tools' local files; they converge on the next `imwel sync`
- After sync, project contributions leave the tracking list; push stays quiet until you have a real diff

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Push refused for module Artifacts | Modules are read-only for normal push — use `imwel propose` for a deliberate contribution, or edit in the template repo. |
| Conflicting reverse-render among dirty tools | Several tools you edited disagree — run `imwel push --from <tool>`, or align those dirty copies. Clean tools are ignored. |
| Other tools still show old content after push | Expected — push does not rewrite them. Merge the PR, then `imwel sync`. |
| Still see an already-merged Artifact in push | Run `imwel sync` after merge; unchanged content matching the remote tip is filtered out. |
| Passive “remote updates (proposals)” after sync | Sync refreshes retained proposal baselines — run sync once after merge. |
| Need direct push (personal remote only) | `imwel remote set <alias> --direct-push` — never the team default. |

## Related

- [Sync and handle drift](./sync-and-drift.md)
- [Author vs consumer](../explanation/author-vs-consumer.md)
- [Commands — push / propose](../reference/commands.md)
