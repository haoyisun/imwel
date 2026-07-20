# Example template

There is no separate hosted “demo monorepo” required to learn the layout. The **canonical minimal example** is the scaffold shipped with the CLI:

- Source trees: [`templates/init/en/`](https://github.com/haoyisun/imwel/tree/main/templates/init/en) and [`templates/init/zh-CN/`](https://github.com/haoyisun/imwel/tree/main/templates/init/zh-CN)
- Generate a working copy: `imwel template init` (or `npx @culock/imwel@latest template init`)

A standalone public “example template org repo” URL is optional; until you publish your own, treat the scaffold as the reference.

## Generate a template repo

```bash
npx @culock/imwel@latest template init --dir ./my-templates --name my-templates --locale en -y
cd my-templates
imwel lint
```

Then push the directory to your Git host and register it for consumers:

```bash
imwel remote add my-templates git@github.com:you/my-templates.git
```

## Minimal directory tree

```
my-templates/
  .imwel/
    manifest.yaml
  AGENTS.md                          # author-facing guidance
  README.md
  CONTRIBUTING.md
  .cursor/
    commands/
      imwel-author.md                # /imwel-author
      imwel-lint.md                  # /imwel-lint
    rules/
      imwel-template-author.mdc
    skills/
      imwel-template-author/
      imwel-consumer/
  example-project/
    agents.md
    rules/
      example-rule.md
    skills/
      example-skill/
        SKILL.md
```

## Manifest fragment

```yaml
conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md

projects:
  - name: example-project
    path: example-project
    optional:
      - skills/example-skill
```

See [Manifest](./manifest) for field semantics.

## What to do next

1. Edit or add Artifacts under the project path.
2. In Cursor, run `/imwel-author` (context-aware pack) and validate with `imwel lint`.
3. Open a branch + PR/MR on the Git host.
4. From a consumer project: `imwel remote add` → `imwel init` → `imwel sync`.

Full author workflow: [Template authoring](../template-authoring).
