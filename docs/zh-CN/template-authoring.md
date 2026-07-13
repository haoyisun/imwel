# 编写模板

如何开发与维护 imwel **模板仓库**。

## 上下文检测

从任意子目录向上查找 `.imwel/` 并判定：

| 类型 | 信号 |
|------|------|
| `template` | 含 `projects` 的 `manifest.yaml`，无 `binding.yaml` |
| `consumer` | `binding.yaml`，无 `manifest.yaml` |
| `neither` | 无标记 |
| `ambiguous` | 同一 `.imwel/` 下两者皆有 |

Slash 命令 `/imwel-author` 与 `imwel lint` 共用此检测。错误或歧义上下文必须说明 — 不得静默套用错误配置包。

## Lint 质量条

```bash
imwel lint
imwel lint --strict   # CI：警告也失败
```

- **Errors** — 装坏类（无效 manifest、项目 path 缺失、skill 缺 `SKILL.md`、路径逃逸）。
- **Warnings** — 风格 / 最佳实践（skill `description` 缺失、过短/过长、或不可触发；对齐 agentskills / Cursor 指导）。

仅在**模板仓**根运行完整 lint。在消费侧绑定目录，CLI 会指引到模板仓，而不会报告假成功。

## Cursor 优先的作者 UX

`imwel template init` 会脚手架生成：

- 根级 `AGENTS.md`（先读 manifest）
- `.cursor/rules`、`.cursor/skills`（template-author 与 consumer 配置包）
- `.cursor/commands/imwel-author.md` 与 `imwel-lint.md`

主循环：`/imwel-author` → 编辑 Artifact → `imwel lint` → 宿主 PR/MR。

## 其他 AI 工具

检测与 `imwel lint` 与工具无关。Claude Code（或其他工具）后续可增加 `.claude/` skills；仍应 shell 出 `imwel lint`，而不是复制一套规则。

## 消费侧回馈路径

在绑定项目中用 `imwel propose` / `imwel push` 回馈上游。这不是维护模板本身的默认作者工作流。

## 相关

- [示例模板](./guide/example-template) — 脚手架布局与 `templates/init`
- [Manifest](./guide/manifest) — conventions 与 `optional`
- [命令](./guide/commands) — `lint`、`template init`、`propose`、`push`
- [CONTRIBUTING.zh-CN.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.zh-CN.md) — 向 imwel CLI 本身贡献
