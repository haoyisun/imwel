---
name: imwel-create-template
generatedBy: imwel
description: Use this skill when the user wants to turn the AI coding rules/skills already scattered across THIS project's tool directories into a shareable imwel template repository. It runs `imwel template init --from-project` to deterministically harvest the user's own artifacts (excluding imwel's and other tools' installed files) into a skeleton, then guides splitting projects, assigning roles, and writing manifest/README — it never invents a content store or edits managed files.
---

# imwel-create-template — bootstrap a template repo from this project

You help the user package the AI coding rules/skills **already present in this
project** (across `.cursor/`, `.claude/`, `CLAUDE.md`, `AGENTS.md`, `.trae/`, …)
into a proper, shareable imwel **template repository**. imwel does the cheap,
deterministic part (harvesting + skeleton); your job is the semantic
organization.

## When to use

Use this when a team has no template repo yet but has accumulated rules in their
tools (or just ran `imwel-extract` + `imwel adopt`), and wants a structured,
Git-shareable template repo out of what they already have.

## Boundaries (do not cross)

- Do **not** invent a content store, versioning, or permission model — the
  template repo is an ordinary Git repository; publishing is plain `git`.
- Only act on the user's **own** artifacts. The deterministic step already
  excludes imwel's own command pack (`imwel-*` / `generatedBy: imwel`) and other
  tools' artifacts (e.g. openspec). Do not re-add them.
- Do **not** hand-write files that bypass the CLI's harvest — always run the
  command below first, then refine its output.

## Steps

1. Run the deterministic harvest + skeleton generation from the project root:

   ```bash
   imwel template init --from-project
   ```

   Optionally pass `--topic <slug>` (names the output dir) or `--dir <path>`
   (explicit output). The command prints the generated directory
   (`.imwel/generated-templates/<topic>-<timestamp>/` by default), which artifacts
   were harvested, and which files were excluded and why.

2. Read the generated skeleton. It contains a minimal `.imwel/manifest.yaml`
   (one `project` named `harvested`), the harvested `rules/`, `skills/`, and
   `agents.md`, plus scaffolded author commands (`/imwel-author`, `/imwel-lint`).

3. Refine the skeleton into a well-structured template, following this project's
   existing template-repo conventions:
   - Split the single `harvested` project into coherent projects/modules where it
     makes sense (e.g. a shared standards module vs. a writable project); set each
     `role` (`shared` vs `project`) deliberately.
   - Ensure every rule has a precise, triggerable frontmatter `description`
     (and `globs` when path-scoped); keep bodies short with do/don't examples.
   - Write a `README`/`CONTRIBUTING` describing what the template provides and how
     to consume it.

4. Validate: run `imwel lint` inside the generated directory and fix reported
   issues. Publishing is up to the user via ordinary `git` (init, commit, push).

## Handoff

When done, tell the user: the generated directory path, what you reorganized
(projects/roles), what still needs their judgement, and the exact next commands
(`imwel lint`, then `git init && git add . && git commit`).
