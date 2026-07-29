# 如何添加 rule

想在共享模板里加一条编码规则，让每个消费者的 AI 工具拿到同一约束？

**你将得到：** 一份 canonical rule（agents.md 风 Markdown + 可选 overlay），可由 imwel 渲染为 Cursor `.mdc`、Claude Code `CLAUDE.md` 块等。

## 前置

- 当前在**模板仓库**内（存在 `.imwel/manifest.yaml`）
- 已从 manifest 确认项目 `path`（如 `example-project`）

## 步骤

### 1. 读 manifest

```bash
cat .imwel/manifest.yaml
```

确认 `conventions.rulesDir`（默认 `rules`）与目标项目的 `path`。

### 2. 新增规则文件

创建 `<project-path>/<rulesDir>/<name>.md`。示例：

```bash
cat > example-project/rules/no-silent-catch.md <<'EOF'
---
description: 修改错误处理时使用——避免空 catch，优先显式处理。
# globs: ["**/*.{ts,js}"]
# alwaysApply: false
---

# 禁止静默 catch

- 不要留空的 `catch` 块。
- 记录日志或带上下文地重新抛出。
EOF
```

顶部 YAML 是可选 **overlay**。imwel 会从 canonical 正文剥离它，并在渲染时映射到各工具原生元数据。

### 3. Lint

```bash
imwel lint
```

### 4. 分支提交并开 PR（作者路径）

```bash
git checkout -b add-no-silent-catch
git add example-project/rules/no-silent-catch.md
git commit -m "add no-silent-catch rule"
git push -u origin HEAD
```

在 Git 宿主上开 PR/MR。

### 5. 在消费者侧预览（可选）

PR 合并后（或对着本地模板远程）：

```bash
imwel sync
```

## 预期结果

- `imwel lint` 接受新文件
- sync 后消费者工具路径下出现对应文件（如 `.cursor/rules/no-silent-catch.mdc`）

## 排错

| 问题 | 处理 |
|------|------|
| Lint：空/占位规则 | 正文写真实指导；一行 stub 过不了质量条。 |
| init 时看不到该规则 | 文件须在项目的 `rulesDir` 下；核对 manifest 的 `path`。 |
| Overlay 未生效 | frontmatter 放在文件最顶；未知键可能不映射——只用 `description` / `globs` / `alwaysApply`。 |

## 关联

- [添加 skill](./add-skill.md)
- [为 Cursor 消费渲染](./consume-for-cursor.md)
- [Manifest](../reference/manifest.md)
