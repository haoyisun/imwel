# Quick walkthrough

> **Getting started.** This page shows both lanes side by side as minimal, copy-pasteable sequences. For the step-by-step tracks, follow the [Consumer path](../consume/quickstart.md) or [Author path](../author/quickstart.md). New to the terms? See the [Glossary](../concepts/glossary.md).

imwel has two distinct lifecycles. Pick the lane that matches your role.

## Author lane — you publish rules

```bash
imwel template init                 # scaffold a template repo (manifest + example project)
# edit .imwel/manifest.yaml and your rules/skills/agents.md
imwel lint                          # validate before publishing (imwel lint --strict in CI)
git init && git add . && git commit -m "initial template"
git remote add origin <git-host-url>
git push -u origin main             # ← publishing is plain git, NOT an imwel command
# maintenance: edit artifacts → imwel lint → git commit → git push
```

Step-by-step: [Author a template](../author/quickstart.md) → [Lint & quality bar](../author/lint.md) → [Publish & maintain](../author/publish.md).

## Consumer lane — you install someone's rules

```bash
imwel remote add <template-repo-url> # alias is derived from the URL (add several if needed)
cd your-project
imwel init                          # pick tools/branch, read-only modules + one writable project
imwel modules                       # add/remove/freeze modules later (toggle → diff → confirm)
imwel tools                         # add/remove AI tools later without rebinding
imwel binding show                  # inspect local binding/tracking offline
imwel sync                          # pull upstream updates (with drift preview)
# drift: imwel status → imwel sync / imwel rollback
imwel propose                       # choose one target; add/remove contribution tracking
imwel push                          # push project edits + explicitly tracked contributions
```

> **Contribution workflow:** run `imwel propose`, choose one remote project/module, then toggle
> tracking. Existing tracking is preselected; the second confirmation applies only the shown
> added/removed records and never touches local files. Project tracking graduates into binding
> after a matching sync; module tracking persists until you cancel it. `imwel push` records Git
> branch/commit state and skips unchanged contributions. Or pass a path:
> `imwel propose <file>`. Flag detail: [Commands — propose](./commands.md#imwel-propose-file).

> **Changing tools:** use `imwel tools`, not a full `imwel init` rebind. Adding a tool renders the
> complete current binding into that tool without rewriting existing-tool outputs. Removing a tool
> keeps its files as unmanaged by default; deletion is a separate, explicit choice. Flag detail:
> [Commands — tools](./commands.md#imwel-tools).

> **Inspecting local state:** use `imwel binding show` for a fast, offline summary of what the
> binding manages and what contribution tracking authorizes. Add `--details` for ownership and
> `present`/`missing` paths, or `--json` for the stable versioned machine view. This never fetches
> or writes; use `imwel status` separately when you need remote drift and rule health. Flag detail:
> [Commands — binding show](./commands.md#imwel-binding-show).

Step-by-step: [Install a template](../consume/quickstart.md) → [Sync, drift & rollback](../consume/sync-and-drift.md) → [Contribute changes back](../consume/contribute-back.md).

> **Easy to miss:** an author *publishes* by pushing the template repo to a Git host with ordinary
> `git` — there is no `imwel publish`. imwel commands cover authoring/validation locally and the
> consumer side; the Git host is the distribution and governance layer.

## Bootstrapping rules from a codebase

No template yet? imwel can consolidate scattered rules, fingerprint a project, and draft rules with its first-party skills — see [Draft rules from your codebase](../author/from-codebase.md).

Already have rules across your tools and want a shareable template repo out of them? Run `imwel template init --from-project` to harvest **your own** artifacts (imwel's and other tools' files are excluded) into a skeleton, then refine it with the `/imwel-create-template` skill — see [`imwel template init --from-project`](./commands.md#imwel-template-init-from-project).

## Troubleshooting

| Symptom | What to do |
|---------|-----------|
| `no git binary found on PATH` | Install Git, then re-run `imwel doctor`. |
| `imwel status` reports a fake clean result in a template repo | You are in a template repo, not a consumer binding — use `imwel lint` instead. |
| `imwel init`, `imwel modules`, or `imwel tools` reports an unmanaged overwrite | Review the exact paths. Confirm only if the template should replace them; in CI, re-run with `--yes` only after reviewing the printed plan. |
| A managed file was deleted locally | Run `imwel sync`. It lists the missing path as a restoration and asks before recreating it. |
| `imwel push` skips a missing file | For a binding file, run `imwel sync`. For tracked contributions, interactive push can cancel tracking or stop so you can restore the file; non-interactive push retains tracking and exits non-zero. |
| `imwel sync` left conflict markers | Resolve the `<<<<<<<`/`=======`/`>>>>>>>` markers by hand, then `imwel sync --continue`. |
| A command needs input in CI | Pass the required selection flags (`--tools`, `--remote`, `--branch`, `--project`) and `-y`. |
| First-party skill files show up in `imwel status` | They should not — first-party skills are unmanaged. Re-run `imwel skill install` from the latest version. |

## Next

- Consumer? → [Install a template](../consume/quickstart.md)
- Author? → [Author a template](../author/quickstart.md)
- Every command's flags and exit codes → [Commands](./commands.md)
