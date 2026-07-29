# 如何从代码库起草规则

想基于这个仓库的真实形态冷启动一套 AI 编码规则——先审阅，再变成团队 canon？

**你将得到：** 确定性指纹（`imwel scan`）、`.imwel/drafts/` 中的 AI 辅助草稿，以及本地 adopt 或收割进模板的路径。不会静默晋升为受管 Artifact。

## 前置

- [安装 imwel](./install.md)
- 可运行 slash 命令的 AI 工具（先 `imwel skill install`），或愿意手改草稿 Markdown

## 步骤

### 1. 指纹（终端）

```bash
cd your-app
imwel scan
```

写入 `.imwel/fingerprint.yaml`。

### 2. 安装第一方 skill（一次）

```bash
imwel skill install
```

### 3. 提取草稿（工具内）

在 Cursor（或其他支持的工具）中运行 `/imwel-extract`。草稿落在 `.imwel/drafts/<box>/`。

### 4. 审阅后本地采纳

```bash
imwel adopt --from <box>
```

见[归并已有规则](./adopt-existing-rules.md)。

### 5. 可选 — 收割进模板

```bash
imwel template init --from-project --dir ./my-templates
```

然后 lint、用普通 Git 提交发布（[Lint 与发布](./lint-and-publish.md)）。

## 预期结果

- 存在指纹文件
- 草稿盒含可审阅 Markdown
- adopt 后的文件在工具路径上，在纳入模板前为**未托管**

## 排错

| 问题 | 处理 |
|------|------|
| 没有 slash 命令 | 重跑 `imwel skill install --tools cursor`（或你的工具 id）。 |
| scan history 为 `none` | 提交历史过浅/过少——无 overlay 时指纹仍可用。 |

## 关联

- [归并已有规则](./adopt-existing-rules.md)
- [工具内 skill](../reference/in-tool-skills.md)
- [命令 — scan / adopt](../reference/commands.md)
