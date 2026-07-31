# 如何添加 skill

想在模板里放一个可复用的 agent skill（SKILL.md bundle），让消费者落到各工具的 skills 目录？

**你将得到：** 项目 `skillsDir` 下的 skill 文件夹；可选在 manifest 里标为 `optional`，安装时由用户勾选。

## 前置

- 含 `.imwel/manifest.yaml` 的模板仓
- 熟悉 Cursor / agentskills.io 的 `SKILL.md`（YAML 里需要 `name` + 可触发的 `description`）

## 步骤

### 1. 创建 skill 包

```bash
mkdir -p example-project/skills/review-pr
```

```bash
cat > example-project/skills/review-pr/SKILL.md <<'EOF'
---
name: review-pr
description: 审查 pull request 的风险、缺测与 API 兼容性时使用。
---

# 审查 PR

1. 概括改动。
2. 列出风险与缺失测试。
3. 给出具体后续建议。
EOF
```

需要时在 `SKILL.md` 旁追加其他文件，会随 bundle 一起分发。

### 2. 在 manifest 登记（若为可选）

可选安装时写入：

```yaml
projects:
  - name: example-project
    path: example-project
    role: project
    optional:
      - skills/review-pr
```

未列入 `optional` 的 skill 为必装，默认安装。

### 3. Lint

```bash
imwel lint
```

### 4. 分支 + PR 提交

```bash
git checkout -b add-review-pr-skill
git add example-project/skills/review-pr .imwel/manifest.yaml
git commit -m "add review-pr skill"
git push -u origin HEAD
```

## 预期结果

- Lint 通过
- 消费者 `init` / `sync` 后出现如 `.cursor/skills/review-pr/SKILL.md` 或 `.claude/skills/review-pr/SKILL.md`（取决于所选工具）
- 附属文件（如 `references/*.md`、`evals/*.md`）随 `SKILL.md` 一起分发，并保留相对目录结构

## 往返：分层 skill 的收割与回推

分层 skill 包可完整跑通「消费者 → 模板 → 消费者」往返：

- `imwel template init --from-project` 会收割 skill 目录下的全部文件（不只是 `SKILL.md`），保留 `references/`、`evals/` 等子目录结构到生成的模板仓。
- `imwel push` / `imwel propose` 把全部附属文件回写到模板仓 `skills/<slug>/<relativePath>` 下。确认提示会列出每个 skill 为 `SKILL.md + N 个附属文件`，让你清楚将改变什么。
- 在降级（非原生 skills）目标上，附属文件会被合并进 `SKILL.md` 正文——只有原生 skills 工具（Cursor、Claude Code、Trae、Qoder、Codex、OpenCode、Zcode）保留目录 bundle。

## 排错

| 问题 | 处理 |
|------|------|
| Lint：缺少 `SKILL.md` | 每个 skill 目录根下必须有 `SKILL.md`。 |
| `description` 质量警告 | 写清「何时触发」，不要只写模糊标签。 |
| sync 后没有 skill | 确认安装时勾选了可选 skill；必要时重跑 `imwel init` / `imwel modules`。 |

## 关联

- [添加 rule](./add-rule.md)
- [Lint 与发布](./lint-and-publish.md)
- [Manifest](../reference/manifest.md)
