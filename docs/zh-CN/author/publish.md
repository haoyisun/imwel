# 发布与维护

> **作者路径 · 第 3/3 步** —— 前置：[编写模板](./quickstart.md)、[Lint 与质量条](./lint.md)。

## 发布靠普通 Git

**没有 `imwel publish`**。你是用普通 `git` 把模板仓推送到 Git 宿主来发布的 —— Git 宿主才是分发与治理层。

```bash
git init && git add . && git commit -m "initial template"
git remote add origin <git-host-url>
git push -u origin main             # ← 发布靠普通 git
```

`imwel template init` 在脚手架时可选地为你创建远程仓（经 `gh` / `glab`）；否则在你的 Git 宿主上建仓并按上面推送。

## 让消费者注册它

消费者随后把你的仓库添加为远程并绑定项目：

```bash
imwel remote add <git-host-url>     # 在消费者机器上
```

消费者一侧见[消费者路径](../consume/quickstart.md)。

## 维护循环

```
编辑 artifact → imwel lint → git commit → git push
```

消费者会在下次 `imwel sync` 时拿到变更。治理（谁能合并）由你的 Git 宿主权限与分支保护控制,而非 imwel。

## Cursor 优先的作者 UX

`imwel template init` 会脚手架生成根级 `AGENTS.md`、`.cursor/rules` + `.cursor/skills`（template-author 与 consumer 配置包）、`.cursor/commands/imwel-author.md` / `imwel-lint.md`。主循环：`/imwel-author` → 编辑 Artifact → `imwel lint` → 宿主 PR/MR。检测与 `imwel lint` 与工具无关 —— Claude Code（或其他工具）后续可增加 `.claude/` skills,但仍应 shell out `imwel lint`,而不是复制一套规则。

## 下一步

- 从已有代码库起草规则 → [从代码库起草规则](./from-codebase.md)
- Manifest 参考 → [Manifest](../guide/manifest.md)
- 贡献一个新渲染目标 → [适配器](../contribute/adapters.md)
