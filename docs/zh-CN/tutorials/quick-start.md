# 5 分钟快速上手

从零走到 **AI 编程工具磁盘上出现规则文件**——不需要团队已有远程仓。首会话只做这一件事。

你将完成：脚手架本地模板 → 绑定消费目录 → 看到 Cursor 或 Claude Code 的原生文件。

## 开始之前

- Node.js ≥ 18.18
- 系统 `PATH` 上有 `git`

先检查一次：

```bash
npx @culock/imwel@latest doctor
```

## 1. 脚手架本地模板

```bash
npx @culock/imwel@latest template init --dir ./my-templates --name my-templates --locale zh-CN -y
```

应出现带 `.imwel/manifest.yaml` 与 `example-project/` 的目录。

## 2. 把它变成 Git 远程（本地路径）

imwel 用系统 `git` 拉取模板远程。本地绝对路径即可——首胜不需要 GitHub。

```bash
cd ./my-templates
git init -b main
git add .
git commit -m "initial template"
cd ..
npx @culock/imwel@latest remote add my-templates "$(pwd)/my-templates"
```

Windows PowerShell（换成你的真实路径）：

```powershell
cd .\my-templates
git init -b main
git add .
git commit -m "initial template"
cd ..
npx @culock/imwel@latest remote add my-templates "D:/path/to/my-templates"
```

## 3. 创建消费项目目录

```bash
mkdir my-app
cd my-app
git init
```

## 4. 绑定并渲染（只选一个工具）

**Cursor：**

```bash
npx @culock/imwel@latest init -y --remote my-templates --branch main --project example-project --tools cursor
```

**Claude Code：**

```bash
npx @culock/imwel@latest init -y --remote my-templates --branch main --project example-project --tools claude-code
```

若默认分支不是 `main`，改成 `git` 实际创建的分支名（旧版 Git 常见为 `master`）。

## 5. 确认文件已落盘

| 工具 | 打开这些路径 |
|------|----------------|
| Cursor | `.cursor/rules/example-rule.mdc`（若安装了可选 skill，还有 `.cursor/skills/…`） |
| Claude Code | `CLAUDE.md`（规则块），以及可选的 `.claude/skills/…` |

应能看到模板里的示例规则内容，并以该工具原生布局写出。

## 预期结果

- `my-app/` 下存在 `.imwel/binding.yaml`
- 磁盘上至少有一个工具原生规则文件
- 再跑 `npx @culock/imwel@latest status` 时不会再要求你 init

你刚刚把一份 Git 原生 Artifact 分发到了真实的 AI 工具路径——这就是 aha 时刻。

## 注意事项

- 之后本地手改不会被静默覆盖；会先检测漂移。见[同步与处理漂移](../how-to/sync-and-drift.md)。
- 本流程用**本地路径**远程，首胜不依赖 GitHub。团队远程见[为 Cursor 消费渲染](../how-to/consume-for-cursor.md)。
## 下一步（三选一）

| 目标 | 指南 |
|------|------|
| 在模板里加自己的 rule | [添加 rule](../how-to/add-rule.md) |
| 把真实项目绑到团队模板 | [为 Cursor 消费渲染](../how-to/consume-for-cursor.md) 或 [Claude Code](../how-to/consume-for-claude-code.md) |
| 经 PR 回推上游 | [经 PR 回推上游](../how-to/push-via-pr.md) |
