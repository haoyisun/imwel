# Lint & quality bar

> **Author path · Step 2 of 3** — Prerequisites: [Author a template](./quickstart.md).

Validate a template repository before publishing. Run lint only in a **template** root (a `.imwel/manifest.yaml`, no `binding.yaml`).

## Run lint

```bash
imwel lint
imwel lint --strict   # CI: warnings fail too
```

- **Errors** — install-breaking (invalid manifest, missing project path, skill without `SKILL.md`, path escape; also two projects that declare a same-named rule/skill with **differing content** — `project.artifactNameCollision` — installing both would collide on the rendered path; lint names the projects and suggests renaming one to `<project>-<basename>`).
- **Warnings** — style / best practice (rule/skill `description` missing, too short/long, or not triggerable per agentskills / Cursor guidance; a project that does not declare a [`role`](../guide/manifest.md#project-roles-modules-vs-projects) — it silently defaults to a writable project; a `role: shared` module that ships an `agents` file — modules do not install it, so move that content into rule/skill artifacts).

> **Naming convention:** if a `role: shared` module may be co-installed with other modules or a writable project, prefix its source artifacts with the module name (`<module>-<rule>.md`, `<module>-<skill-dir>`) to avoid same-name render-path collisions. Two same-named artifacts with **identical** content are fine — render dedupes them silently; only differing content is flagged.

In a consumer binding, the CLI points you to the template repo instead of reporting a fake clean result. Full flags: [`imwel lint`](../guide/commands.md#imwel-lint).

## Commit-time lint automation (optional)

To catch issues before they land in a PR, `imwel template init` scaffolds lint automation into the new template repo **on by default** (decline to skip):

- a committed `.githooks/pre-commit` hook that runs `imwel lint` on every commit, and
- a CI workflow (`.github/workflows/imwel-lint.yml` when `gh` is detected, or `.gitlab-ci.yml` when `glab` is detected) that runs `imwel lint --strict` on pull requests / pushes to the default branch.

When you accept the default, imwel also activates the hook locally (`git config core.hooksPath .githooks`) and appends an activation note to `CONTRIBUTING.md`. `imwel template init --from-project` offers the same default-on choice (files written, no local activation since the generated dir has no `.git` yet).

The hook degrades gracefully — if `imwel` is not on PATH it prints a warning and exits `0`, so a missing imwel never blocks a commit on another machine or in CI. Git deliberately does not run hooks that come from a clone (a security measure), so each contributor activates the hook once after cloning. imwel makes this near-automatic via two paths:

- **Auto-activation on `imwel lint`**: when `imwel lint` detects a template repo that ships `.githooks/` but has not set `core.hooksPath`, it activates it for you and prints the result. Pass `--no-auto-activate-hooks` to opt out (the old passive hint is printed instead).
- **`prepare` script (optional, scaffold-time)**: `imwel template init` offers to write a minimal `package.json` whose `prepare` script runs `git config core.hooksPath .githooks`. Because npm runs `prepare` automatically after `npm install`, a contributor who clones and runs `npm install` gets the hook activated with no extra step and no dependency (no husky/lefthook).

If neither path applies, the fallback is still the one-liner:

```bash
git config core.hooksPath .githooks
```

imwel does not install husky/lefthook and never auto-activates hooks on `git clone` itself — that is Git's behavior, not imwel's to override.

## Context detection

From any subdirectory, imwel walks up for `.imwel/` and classifies the location:

| Kind | Signal |
|------|--------|
| `template` | `manifest.yaml` with `projects`, no `binding.yaml` |
| `consumer` | `binding.yaml`, no `manifest.yaml` |
| `neither` | no markers |
| `ambiguous` | both files in the same `.imwel/` |

The `/imwel-author` Slash Command and `imwel lint` share this detection. A wrong or ambiguous context is always explained — imwel never silently applies the wrong pack.

## Next

- Publish and maintain your template → [Publish & maintain](./publish.md)
- Rule metadata that lint checks → [Rule metadata overlay](../guide/manifest.md#rule-metadata-overlay)
