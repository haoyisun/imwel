# {{name}}

Template repository for AI coding rules, skills, and agent instructions, managed with [imwel](https://github.com/haoyisun/imwel).

## Layout

- `.imwel/manifest.yaml` — declares projects and conventions
- `AGENTS.md` — author-oriented guidance for AI tools (read the manifest first)
- `.cursor/` — Cursor rules, skills, and slash commands (`/imwel-author`, `/imwel-lint`)
- `example-project/rules/` — rule artifacts (`type=rule`)
- `example-project/skills/` — skill bundles (`type=skill`)
- `example-project/agents.md` — agents instructions (`type=agents`)

## Authoring with AI (primary path)

1. Clone this repository and open it in Cursor.
2. Run `/imwel-author` to detect context and load the template-author pack.
3. Add or edit Artifacts under the paths declared in `.imwel/manifest.yaml`.
4. Run `imwel lint` (or `/imwel-lint`) before opening a PR on the Git host.

Consumer-side `imwel propose` / `imwel push` remain available for feeding changes from a bound project — they are not the default author workflow.

## Contributing changes

1. Prefer editing directly in this template repo (branch + PR).
2. From a bound consumer directory, use `imwel push` / `imwel propose` to open a branch + PR with reverse-rendered canonical content.
3. Validate structure with `imwel lint` in the template root.

## Adding a new project

Add an entry under `projects` in `.imwel/manifest.yaml` with a unique `name` and `path`.
