# 如何为 Cursor 消费模板

想把团队共享的规则/技能写进 **Cursor 原生路径**（`.cursor/rules/*.mdc`、`.cursor/skills/…`），而不再手工复制？

**你将得到：** 按目录的绑定，以及渲染好的 Cursor 文件，通过 Git 与模板保持同步。

## 前置

- [安装 imwel](./install.md)
- 可 fetch 的模板仓 URL（或先完成[快速上手](../tutorials/quick-start.md) 的本地路径远程）
- 当前在**消费**项目目录（写业务代码的目录，不是模板根）

## 步骤

### 1. 注册模板远程（每台机器一次）

```bash
imwel remote add git@github.com:YOUR_ORG/my-templates.git
```

或指定别名：

```bash
imwel remote add org-standards git@github.com:YOUR_ORG/my-templates.git
```

### 2. 绑定并为 Cursor 渲染

```bash
cd your-app
imwel init --tools cursor
```

交互选择远程、分支、只读模块与一个可写 project。非交互示例：

```bash
imwel init -y --remote org-standards --branch main --project example-project --tools cursor
```

### 3. 验证

```bash
ls .cursor/rules
imwel status
```

## 预期结果

- `.imwel/binding.yaml` 的 tools 含 `cursor`
- 规则出现在 `.cursor/rules/<slug>.mdc`
- 若安装了 skill，出现在 `.cursor/skills/<name>/`

## 排错

| 问题 | 处理 |
|------|------|
| init 后没有 `.cursor/rules` | 确认选了 `cursor`，且模板项目里确有 rules。 |
| 选错了 project | 重跑 `imwel init`，或见[管理模块与工具](./manage-modules-and-tools.md)。 |
| 还要 Claude Code | 用 `imwel tools` 追加，或见[为 Claude Code 消费渲染](./consume-for-claude-code.md)。 |

## 关联

- [同步与处理漂移](./sync-and-drift.md)
- [经 PR 回推上游](./push-via-pr.md)
- [支持的工具](../reference/supported-tools.md)
