# 工具内 skill 与命令

imwel 附带一个小小的**命令包**——第一方 skill，装进 AI 编码工具后在对话框里调用（例如 Cursor /
Claude Code 里的 `/imwel-extract`）。本页讲每个成员做什么、怎么调用。它们包装的 CLI 命令
（`imwel scan`、`imwel adopt`、`imwel template init`）见[命令](./commands.md)。

## 安装命令包

```bash
imwel skill install --tools cursor,claude-code   # 省略 --tools 则交互选择
```

`imwel init` 也能安装（opt-in 提示，或 `--command-pack` / `--no-command-pack`）。

- 命令包**只安装 skill**（如 `.cursor/skills/imwel-*`、`.claude/skills/imwel-*`）。会把 skill 挂到
  `/` 的工具（Cursor、Claude Code）可用 `/imwel-*` 显式调用；其它工具仍可按 description 匹配。
- 重新安装时会**清理旧版薄命令文件**（`.cursor/commands/imwel-*.md`、`.claude/commands/imwel-*.md`
  中的命令包成员），避免与 skill 在 slash 菜单里重复。作者脚手架命令（如 `/imwel-author`）不会动。
- 所有命令包文件都是**非受管**的：带 `generatedBy: imwel` 标记、位于 `imwel-*` 命名空间，永不被
  `sync`/`status`/`push` 跟踪。

## 成员

### `imwel-extract` —— 从代码库起草规则

当项目规则很少或没有、想要一套贴合项目的起点时调用（如 `/imwel-extract`）。它会先确保有指纹（缺失时
自行运行 `imwel scan`），定向读指纹指向的文件，把 rule/skill 起草到**命名草稿箱**
`.imwel/drafts/<主题>-<时间戳>/`。收尾是三段式交接：草稿箱位置、review 提示、下一步
（`imwel adopt --from <box>`）。

### `imwel-audit` —— 审计规则漂移

调用它检查现有规则是否仍与代码相符。它读现有规则 + 指纹指向的代码，把可执行发现写入 `.imwel/audit/`
（规则↔代码不符、规则↔规则矛盾、缺失规则）。仅显式调用——绝不 hook 你的工具会话。

### `imwel-adopt` —— 激活已 review 的草稿箱

review 完某草稿箱后调用（如 `/imwel-adopt`）以**把该批渲染进工具**。它是 `imwel adopt --from <box>`
的薄包装：定位草稿箱、运行命令、解读健康闸/冲突结果。渲染的文件是非受管的。它自身绝不渲染或改写草稿。

### `imwel-create-template` —— 冷启动模板仓

调用它（如 `/imwel-create-template`）把本项目已有的规则变成可分享的模板仓。它运行
`imwel template init --from-project`（只收割你自己的制品），再引导拆 project、指定 role、写
manifest/README。

## 起草 → 激活循环

```
imwel scan（或由 imwel-extract 自动运行）
  → 在 AI 工具里运行 /imwel-extract          # 起草到 .imwel/drafts/<box>/
  → review 命名草稿箱
  → /imwel-adopt（或 imwel adopt --from <box>）# 渲染进工具 —— 本地激活
```

review 后有两个不同方向：

- **本地激活** —— `imwel adopt --from <box>` 把该批渲染进工具，规则立即生效。渲染的文件是**非受管**的。
- **打包 / 上游** —— `imwel template init --from-project` 从你的制品生成可发布模板仓；
  `imwel propose` 选择一个远程目标并管理贡献追踪，再由 `imwel push` 发送所选改动。
  project tracking 在匹配 sync 后转正；module tracking 持续到显式取消。
