# How to create a template repository

Want one Git repo your team treats as the source of truth for AI rules and skills — without building a platform?

**What you get:** an ordinary Git repo with `.imwel/manifest.yaml`, an example project.

> [!IMPORTANT]
> Recommend choice lint hooks so every clone keeps the quality bar.

## Prerequisites

- [Install imwel](./install.md) (or use `npx`)
- A place to push the repo (GitHub / GitLab / Gitea / …) when you are ready to share

## Steps

### 1. Scaffold

```bash
npx @culock/imwel@latest template init --dir ./my-templates --name my-templates --locale en
```

Follow prompts. Defaults are fine for a first repo. When asked about lint automation, accept if you want a `.githooks/pre-commit` that runs `imwel lint` (recommended for teams).

Non-interactive:

```bash
npx @culock/imwel@latest template init --dir ./my-templates --name my-templates --locale en -y
```

### 2. Inspect the layout

```
my-templates/
  .imwel/manifest.yaml
  example-project/
    agents.md
    rules/example-rule.md
    skills/example-skill/SKILL.md
  AGENTS.md
  README.md
```

### 3. Commit and publish with plain Git

```bash
cd my-templates
git init -b main
git add .
git commit -m "initial template"
git remote add origin git@github.com:YOUR_ORG/my-templates.git
git push -u origin main
```

Publishing is **not** an imwel command — it is normal `git push`.

## Expected result

- `imwel lint` inside the template root exits clean (or only style warnings)
- Teammates can `imwel remote add` your URL and run `imwel init`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `imwel lint` says this is not a template | Run it at the template root (has `manifest.yaml`, no consumer `binding.yaml`). |
| Scaffold locale wrong | Re-run with `--locale zh-CN` or `en`. |
| Hooks do not run after clone | See recommended follow-up below. |

## Recommended after clone (hooks)

If `template init` created `.githooks/` (or `package.json` with a `prepare` script), each new machine still needs hooks activated once:

```bash
git config core.hooksPath .githooks
```

If the scaffold added `"prepare": "git config core.hooksPath .githooks"`, `npm install` in the template repo does this for you.

## Related

- [Add a rule](./add-rule.md) · [Add a skill](./add-skill.md)
- [Lint and publish](./lint-and-publish.md)
- [Manifest reference](../reference/manifest.md)
