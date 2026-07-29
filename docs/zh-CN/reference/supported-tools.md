# 支持的工具

imwel 内置 **适配器**，把 canonical Artifact 渲染成各 AI 编程工具的落盘布局。没有插件市场——新目标通过上游 PR 合入（[贡献适配器](../how-to/add-adapter.md)）。

## 主要目标（详）

| 工具 id | 典型规则 / agents 路径 | 典型 skills |
|---------|------------------------|-------------|
| `cursor` | `.cursor/rules/<slug>.mdc` | `.cursor/skills/<name>/…` |
| `claude-code` | `CLAUDE.md` 中的块 | `.claude/skills/<name>/…` |

## 其他内置适配器 id

`codex`、`windsurf`、`gemini-cli`、`copilot`、`cline`、`continue`、`aider`、`kiro`、`opencode`、`trae`、`qoder`、`zcode`

路径族不同（带 frontmatter 的规则目录、扁平目录、单文件 upsert 块、GitHub instructions 等）。Skill 走保真阶梯（原生 skills 目录 → 按需规则 → prompts → 始终合并并警告）。

向 `imwel init --tools` / `imwel tools` 传入逗号分隔的 id。

## 另见

- [为 Cursor 消费渲染](../how-to/consume-for-cursor.md)
- [为 Claude Code 消费渲染](../how-to/consume-for-claude-code.md)
- [架构](../explanation/architecture.md)
