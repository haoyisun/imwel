# Lint 与质量条

> **作者路径 · 第 2/3 步** —— 前置：[编写模板](./quickstart.md)。

发布前校验模板仓库。仅在**模板**根运行 lint（有 `.imwel/manifest.yaml`、无 `binding.yaml`）。

## 运行 lint

```bash
imwel lint
imwel lint --strict   # CI：警告也失败
```

- **Errors** —— 装坏类（无效 manifest、项目 path 缺失、skill 缺 `SKILL.md`、路径逃逸）。
- **Warnings** —— 风格 / 最佳实践（规则/skill `description` 缺失、过短/过长、或不可触发,对齐 agentskills / Cursor 指导;project 未声明 [`role`](../guide/manifest.md#项目角色-模块-vs-项目) —— 会静默默认为可写项目）。

在消费侧绑定目录,CLI 会指引到模板仓,而不会报告假成功。完整选项见 [`imwel lint`](../guide/commands.md#imwel-lint)。

## 上下文检测

从任意子目录向上查找 `.imwel/` 并判定位置：

| 类型 | 信号 |
|------|------|
| `template` | 含 `projects` 的 `manifest.yaml`,无 `binding.yaml` |
| `consumer` | `binding.yaml`,无 `manifest.yaml` |
| `neither` | 无标记 |
| `ambiguous` | 同一 `.imwel/` 下两者皆有 |

Slash 命令 `/imwel-author` 与 `imwel lint` 共用此检测。错误或歧义上下文必定被说明 —— imwel 从不静默套用错误配置包。

## 下一步

- 发布并维护你的模板 → [发布与维护](./publish.md)
- lint 检查的规则元数据 → [规则元数据 overlay](../guide/manifest.md#规则元数据-overlay)
