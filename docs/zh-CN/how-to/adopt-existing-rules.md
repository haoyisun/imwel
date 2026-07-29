# 如何采纳已审阅的草稿规则

想把 `/imwel-extract`（或 `.imwel/drafts/` 下的草稿盒）写进 AI 工具，先在本地试用？

**你将得到：** 从已审阅草稿盒渲染出的工具原生文件。这些写入是**未托管**的——在纳入真正的模板工作流之前，不会被 `sync` / `status` / `push` 跟踪。

## 前置

- 已有 extract 流程产出的草稿盒（见[从代码库起草规则](./draft-rules-from-codebase.md)）
- 项目目录中目标工具已安装/可检测

## 步骤

### 1. 审阅草稿盒

打开 `.imwel/drafts/<box>/`，改到你信任为止。

### 2. 采纳进工具

```bash
imwel adopt --from <box>
```

按提示操作（旗标见[命令](../reference/commands.md)）。

### 3. 决定长期归属

- 继续本地迭代，再用 `imwel template init --from-project` 收割进模板，**或**
- 把认可的 Artifact 拷进已有模板仓并开普通 PR

## 预期结果

- 磁盘上出现来自草稿盒的工具原生规则/技能文件
- `imwel status` 不把它们当作受管模板 Artifact

## 排错

| 问题 | 处理 |
|------|------|
| 没有草稿盒 | 先走 `imwel scan` + extract。 |
| 以为 adopt 能替代 sync | Adopt 用于草稿/本地激活——团队持续分发仍靠模板 + `init` / `sync`。 |

## 关联

- [从代码库起草规则](./draft-rules-from-codebase.md)
- [建立模板仓库](./create-template-repo.md)
- [工具内 skill](../reference/in-tool-skills.md)
