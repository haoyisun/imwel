# How to lint and publish a template

Want confidence that the template installs cleanly, and a repeatable way to ship updates the team can `imwel sync`?

**What you get:** `imwel lint` as the quality gate; publishing stays plain `git push` / PR on your host — imwel does not invent a separate publish command.

## Prerequisites

- Template root (`.imwel/manifest.yaml`, no consumer `binding.yaml`)
- [Create a template repo](./create-template-repo.md) already done

## Steps

### 1. Lint locally

```bash
cd my-templates
imwel lint
```

CI-style:

```bash
imwel lint --strict
```

### 2. Commit-time lint automation (optional)

`imwel template init` can scaffold (on by default; decline to skip):

- `.githooks/pre-commit` running `imwel lint`
- CI workflow (`.github/workflows/imwel-lint.yml` or `.gitlab-ci.yml`) with `imwel lint --strict`

Git does not enable cloned hooks by default. After clone on each machine:

```bash
git config core.hooksPath .githooks
```

If the scaffold added a `package.json` `prepare` script, `npm install` runs that line for you. `imwel lint` can also auto-activate hooks when it detects `.githooks/` and unset `core.hooksPath` (opt out with `--no-auto-activate-hooks`).

### 3. Publish updates

```bash
git checkout -b improve-rules
# edit Artifacts…
imwel lint
git add .
git commit -m "improve rules"
git push -u origin HEAD
```

Open a PR/MR. After merge, consumers run `imwel sync`.

## Expected result

- Lint errors are zero before merge
- Default branch on the host has the new commit
- Consumers see updates via `imwel status` / `imwel sync`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Lint in a consumer directory | Change to the template root, or you will be redirected. |
| Hooks never fire | Set `core.hooksPath` again on this clone; confirm `.githooks/pre-commit` exists. |
| `imwel` missing on PATH in hook | Hook warns and exits 0 — install imwel or use `npx` in CI. |

## Related

- [Add a rule](./add-rule.md)
- [Create a template repo](./create-template-repo.md)
- [Commands — lint](../reference/commands.md)
