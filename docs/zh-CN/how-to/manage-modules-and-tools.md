# 如何管理模块与工具

想增加只读标准包、去掉某个工具，或冻结模块——又不想拆掉整个绑定？

**你将得到：** 对本目录安装内容与渲染目标工具的增量更新。

## 前置

- 已有 `.imwel/binding.yaml`（来自 `imwel init`）

## 步骤

### 变更 AI 工具

```bash
imwel tools
```

切换工具（例如在 `cursor` 旁加 `claude-code`）。应用前确认文件 diff。

### 变更只读模块

```bash
imwel modules
```

增删或冻结模块（`role: shared`）。每个目录仍最多绑定**一个**可写 project。

### 离线查看绑定

```bash
imwel binding show
```

## 预期结果

- 绑定反映新的工具/模块集合
- 确认应用后（若上游有更新再 `imwel sync`）磁盘受管文件一致

## 排错

| 问题 | 处理 |
|------|------|
| 无法 push 模块改动 | 模块偏拉取——用[经 PR 回推](./push-via-pr.md) / `propose`，或改模板仓。 |
| 多工具路径冲突 | 两工具内容不一致时可能跳过该路径——选主导工具或对齐内容。 |

## 关联

- [同步与处理漂移](./sync-and-drift.md)
- [Manifest — roles](../reference/manifest.md)
