---
name: imwel-template-author
description: "Use when authoring or editing Artifacts inside an imwel template repository (manifest.yaml present). Guides reading the manifest, adding rules/skills, running imwel lint, and opening a host PR."
---

# Template-author pack

## Preconditions

1. Confirm context: nearest `.imwel/` has `manifest.yaml` with `projects` and no `binding.yaml`.
2. If context is consumer / neither / ambiguous, stop and follow the `/imwel-author` command guidance — do **not** apply this pack.

## Workflow

1. **Read** `.imwel/manifest.yaml` (conventions + project `path` / `optional`).
2. **Add or edit** under the correct project path only:
   - Rules: `<project>/<rulesDir>/*.md` (AGENTS.md-flavored Markdown)
   - Skills: `<project>/<skillsDir>/<name>/SKILL.md` with YAML frontmatter `name` and a triggerable `description` (say when to use the skill)
   - Agents: `<project>/<agentsFile>`
3. **Validate**: run `imwel lint` (and `--strict` for CI). Fix errors before continuing; treat warnings seriously.
4. **Contribute**: commit on a feature branch and open a PR/MR on the Git host. Do not invent a parallel versioning or ACL system.

## Do not

- Invent a competing Artifact dialect or custom schema language.
- Write consumer `binding.yaml` into the template root.
- Skip lint and assume the install will work for consumers.
