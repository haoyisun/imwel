# Quick Start (5 minutes)

Get from zero to **rules on disk in an AI coding tool** — no team remote required. This is the only first-session goal.

You will: scaffold a local template → bind a consumer directory → see Cursor or Claude Code native files appear.

## Before you start

- Node.js ≥ 18.18
- System `git` on your `PATH`

Check once:

```bash
npx @culock/imwel@latest doctor
```

## 1. Scaffold a local template

```bash
npx @culock/imwel@latest template init --dir ./my-templates --name my-templates --locale en -y
```

You should see a repo with `.imwel/manifest.yaml` and `example-project/`.

## 2. Turn it into a Git remote (local path)

imwel fetches template remotes with system `git`. A local absolute path works — no GitHub required for this first win.

```bash
cd ./my-templates
git init -b main
git add .
git commit -m "initial template"
cd ..
npx @culock/imwel@latest remote add my-templates "$(pwd)/my-templates"
```

Windows PowerShell (replace with your real path):

```powershell
cd .\my-templates
git init -b main
git add .
git commit -m "initial template"
cd ..
npx @culock/imwel@latest remote add my-templates "D:/path/to/my-templates"
```

## 3. Create a consumer project directory

```bash
mkdir my-app
cd my-app
git init
```

## 4. Bind and render (pick one tool)

**Cursor:**

```bash
npx @culock/imwel@latest init -y --remote my-templates --branch main --project example-project --tools cursor
```

**Claude Code:**

```bash
npx @culock/imwel@latest init -y --remote my-templates --branch main --project example-project --tools claude-code
```

If your template’s default branch is not `main`, pass the branch `git` actually created (often `master` on older Git).

## 5. Confirm the files landed

| Tool | Open these paths |
|------|------------------|
| Cursor | `.cursor/rules/example-rule.mdc` (and optionally `.cursor/skills/…` if you installed the optional skill) |
| Claude Code | `CLAUDE.md` (rule blocks) and optionally `.claude/skills/…` |

You should see the example rule content from the template, written in that tool’s native layout.

## Expected result

- `.imwel/binding.yaml` exists in `my-app/`
- At least one tool-native rule file is on disk
- `npx @culock/imwel@latest status` runs without asking you to init again

You just distributed a Git-native Artifact into a real AI tool path — that is the aha moment.

## Notes

- Local hand-edits are never silently overwritten later; drift is detected first. See [Sync and handle drift](../how-to/sync-and-drift.md).
- This loop used a **local path** remote so you do not need a GitHub repo for the first win. For a team remote, see [Consume for Cursor](../how-to/consume-for-cursor.md).

## Next (pick one)

| Goal | Guide |
|------|--------|
| Add your own rule to the template | [Add a rule](../how-to/add-rule.md) |
| Point a real project at a team template | [Consume for Cursor](../how-to/consume-for-cursor.md) or [Claude Code](../how-to/consume-for-claude-code.md) |
| Send edits upstream via PR | [Push via PR](../how-to/push-via-pr.md) |
