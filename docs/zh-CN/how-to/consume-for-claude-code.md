# 如何为 Claude Code 消费模板

想把同一套团队 Artifact 渲染给 **Claude Code**——规则/agents 进 `CLAUDE.md` 块、skill 进 `.claude/skills/`——而不另维护一份副本？

**你将得到：** 一份绑定，让 Claude Code 落盘布局与 Git 模板对齐。

## 前置

- [安装 imwel](./install.md)
- 模板远程 URL（或[快速上手](../tutorials/quick-start.md) 的本地路径远程）
- 工作目录 = 消费应用（将有或已有 `.imwel/binding.yaml`）

## 步骤

### 1. 注册远程（每台机器一次）

```bash
imwel remote add git@github.com:YOUR_ORG/my-templates.git
```

### 2. 绑定并为 Claude Code 渲染

```bash
cd your-app
imwel init --tools claude-code
```

非交互：

```bash
imwel init -y --remote my-templates --branch main --project example-project --tools claude-code
```

### 3. 验证

```bash
head -n 40 CLAUDE.md
ls .claude/skills
imwel status
```

## 预期结果

- `CLAUDE.md` 含 imwel 管理的规则/agents 块
- 可选 skill 在 `.claude/skills/<name>/`
- 绑定记录了 `claude-code`

## 排错

| 问题 | 处理 |
|------|------|
| `CLAUDE.md` 没变化 | 确认模板有 rules/agents；仅可选且未选可能几乎无输出。再跑 `imwel sync`。 |
| 与手写 `CLAUDE.md` 冲突 | imwel 用块 upsert——有冲突标记时按[同步与处理漂移](./sync-and-drift.md)处理。 |
| 还要 Cursor | `imwel tools` 追加 `cursor`。 |

## 关联

- [为 Cursor 消费渲染](./consume-for-cursor.md)
- [经 PR 回推上游](./push-via-pr.md)
- [支持的工具](../reference/supported-tools.md)
