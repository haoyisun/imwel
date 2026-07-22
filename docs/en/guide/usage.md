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
imwel sync                          # pull upstream updates (with drift preview)
# drift: imwel status → imwel sync / imwel rollback
imwel push                          # send writable-project edits back as a branch + PR/MR
```

Step-by-step: [Install a template](../consume/quickstart.md) → [Sync, drift & rollback](../consume/sync-and-drift.md) → [Contribute changes back](../consume/contribute-back.md).

> **Easy to miss:** an author *publishes* by pushing the template repo to a Git host with ordinary
> `git` — there is no `imwel publish`. imwel commands cover authoring/validation locally and the
> consumer side; the Git host is the distribution and governance layer.

## Bootstrapping rules from a codebase

No template yet? imwel can consolidate scattered rules, fingerprint a project, and draft rules with its first-party skills — see [Draft rules from your codebase](../author/from-codebase.md).

## Troubleshooting

| Symptom | What to do |
|---------|-----------|
| `no git binary found on PATH` | Install Git, then re-run `imwel doctor`. |
| `imwel status` reports a fake clean result in a template repo | You are in a template repo, not a consumer binding — use `imwel lint` instead. |
| `imwel sync` left conflict markers | Resolve the `<<<<<<<`/`=======`/`>>>>>>>` markers by hand, then `imwel sync --continue`. |
| A command needs input in CI | Pass the required selection flags (`--tools`, `--remote`, `--branch`, `--project`) and `-y`. |
| First-party skill files show up in `imwel status` | They should not — first-party skills are unmanaged. Re-run `imwel skill install` from the latest version. |

## Next

- Consumer? → [Install a template](../consume/quickstart.md)
- Author? → [Author a template](../author/quickstart.md)
- Every command's flags and exit codes → [Commands](./commands.md)
