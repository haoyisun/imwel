# Author a template

> **Author path · Step 1 of 3** — Prerequisites: [Install & prerequisites](../getting-started/install.md). Consuming rules instead? See the [Consumer path](../consume/quickstart.md).

You maintain the rules your team consumes. A template repository is any ordinary Git repo that follows imwel's [manifest](../concepts/glossary.md) convention.

## Scaffold a template repo

```bash
# Not installed? Run it once with npx:
npx @culock/imwel@latest template init --dir ./my-templates --name my-templates --locale en -y
cd my-templates
```

Already installed imwel globally (`npm install -g @culock/imwel`)? Just call the command — no `npx` needed:

```bash
imwel template init --dir ./my-templates --name my-templates --locale en -y
```

`template init` defaults the name to the directory name and only asks for a name when you opt into creating a remote repo — see [`imwel template init`](../guide/commands.md#imwel-template-init). The canonical minimal example ships with the CLI: source trees at [`templates/init/en/`](https://github.com/haoyisun/imwel/tree/main/templates/init/en) and [`templates/init/zh-CN/`](https://github.com/haoyisun/imwel/tree/main/templates/init/zh-CN).

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

The scaffold ships a single `example-project`, but `projects` in the manifest is a list — declare more entries to serve several projects (e.g. `backend` + `frontend`) from one template repo. Field semantics and the multi-project example live in the [Manifest reference](../guide/manifest.md#multiple-projects).

## Edit your Artifacts

1. Edit or add Artifacts under the project path (`example-project/`).
2. Give each rule a frontmatter `description` (and `globs` / `alwaysApply` when relevant) — the [rule metadata overlay](../guide/manifest.md#rule-metadata-overlay) — so it renders with the right trigger in every tool instead of degrading to the filename.
3. In Cursor, run `/imwel-author` for the context-aware author pack.

## Connect a remote and publish for your team

A template repo is an ordinary Git repo, so **publishing is plain `git`** — there is no `imwel publish` command; your Git host (GitHub / GitLab / …) is the distribution and governance layer. The minimal flow:

```bash
git init && git add . && git commit -m "initial template"
git remote add origin <git-host-url>   # the empty repo you created on GitHub/GitLab
git push -u origin main
```

Consumers on your team then register it with `imwel remote add <git-host-url>`. The full walkthrough — connecting a remote, the first push, the maintenance loop (edit → `imwel lint` → `git push`), and how consumers register it — lives in [Publish & maintain](./publish.md).

> Tip: `imwel template init` can optionally create the remote repo for you via `gh` / `glab` during scaffolding; otherwise connect and push manually as above.

## Next

- Validate before publishing → [Lint & quality bar](./lint.md)
- Publish to your Git host for the team → [Publish & maintain](./publish.md)
- Manifest fields and rule overlay → [Manifest reference](../guide/manifest.md)
- Draft rules from an existing codebase → [Draft rules from your codebase](./from-codebase.md)
