# How to run imwel in CI

Want template lint to fail the build, or consumer bindings to auto-sync in CI — without an interactive prompt blocking the pipeline?

**What you get:** fully non-interactive `imwel` invocations that fit a CI step. `-y` / `--yes` skips **confirmations only** — it never invents selections, so you pass the explicit flags a pipeline needs and get reproducible runs.

## Prerequisites

- [Install imwel](./install.md) in the runner (or use `npx @culock/imwel@latest …`)
- System `git` on `PATH` with credentials available to the runner (HTTPS token or deploy key)

## The `--yes` discipline

`-y` / `--yes` skips confirmation prompts. It does **not** pick tools, remotes, projects, or artifacts for you. In CI you must pass the selections explicitly:

```bash
imwel init -y --tools cursor,claude-code --remote org-standards --branch main \
  --project my-app --no-optional
```

If a selection is missing, imwel exits non-zero instead of guessing — so a misconfigured pipeline fails loudly, not silently.

## Template-side: enforce lint in CI

**Use this when** you maintain the template repo and want every PR to pass `imwel lint` before merge.

### GitHub Actions

```yaml
# .github/workflows/imwel-lint.yml
name: imwel lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx @culock/imwel@latest lint --strict
```

`--strict` fails on warnings as well as errors, so style drift gets caught too. For the local pre-commit hook and `setup-hooks`, see [Lint and publish](./lint-and-publish.md).

### GitLab CI

```yaml
# .gitlab-ci.yml
imwel-lint:
  image: node:20
  script:
    - npx @culock/imwel@latest lint --strict
```

## Consumer-side: auto-sync in CI

**Use this when** a consumer repo wants its rendered rules refreshed on a schedule or before build — without anyone running `imwel sync` by hand.

```bash
imwel sync --yes
```

`--yes` applies the upstream update without a confirmation prompt. If upstream moved and a merge conflict occurs, `sync` leaves standard `<<<<<<<` / `=======` / `>>>>>>>` markers and exits non-zero — CI fails the job so a human resolves them (never a silent auto-resolve). After resolving:

```bash
imwel sync --continue --yes
```

### Scripting against binding state

`imwel binding show --json` emits a stable `schemaVersion: 1` JSON view — useful for a CI step that checks which tools/projects are bound before acting:

```bash
imwel binding show --json | jq '.binding.tools'
```

Only remote aliases appear in output, never credential-bearing URLs — safe to print in logs.

## Environment variables

| Variable | What it does in CI |
|----------|-------------------|
| `IMWEL_FETCH_THROTTLE_MS` | Override the passive fetch throttle (default 2h). In CI you usually want fresh data: `sync` / `status` / `propose` always force-refresh regardless, so this only affects ordinary commands. |
| `NO_COLOR` | Disable ANSI color (any value, including empty). Keeps CI logs clean. |

## Expected result

- Template PRs fail CI when `imwel lint --strict` finds issues
- Consumer CI syncs upstream updates non-interactively, or fails loudly on conflict
- No prompt ever blocks the pipeline

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CI hangs on a prompt | A selection flag is missing — add `--tools` / `--remote` / `--project` / `-y` as needed. `--yes` alone won't invent them. |
| `sync` exits non-zero with conflict markers | Resolve markers by hand, push the resolution, then `imwel sync --continue --yes`. imwel never auto-resolves. |
| Lint passes locally but fails in CI | CI uses `--strict`; run `imwel lint --strict` locally before pushing. |
| `binding show --json` empty | No binding in this directory — run `imwel init` first, or point the step at a bound directory. |

## Related

- [Lint and publish](./lint-and-publish.md)
- [Sync and handle drift](./sync-and-drift.md)
- [Manage remotes](./manage-remotes.md)
- [Commands — non-interactive / CI](../reference/commands.md)
