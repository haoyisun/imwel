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
