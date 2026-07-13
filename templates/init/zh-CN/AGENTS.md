# AGENTS.md — 模板作者指南

本仓库是 **imwel 模板仓库**。在此工作的 AI 编码智能体必须遵循本指南。

## 第一步（始终）

1. 在创建或编辑任何 Artifact 之前，先阅读 `.imwel/manifest.yaml`。
2. 遵守 `conventions`（`rulesDir`、`skillsDir`、`agentsFile`）以及各项目的 `path`。
3. **不要**发明竞争的规则/技能方言 — 规则使用 AGENTS.md 风格 Markdown；技能使用 Cursor / agentskills 的 `SKILL.md`。

## Artifact 布局

| 类型 | 位置 | 说明 |
|------|------|------|
| `rule` | `<project>/<rulesDir>/*.md` | AGENTS.md 风格 Markdown |
| `skill` | `<project>/<skillsDir>/<name>/SKILL.md` | 须含 YAML frontmatter：`name` + `description` |
| `agents` | `<project>/<agentsFile>` | 项目级 agent 说明 |

## 作者工作流

1. 克隆本模板仓并在其中开发（这是作者主路径）。
2. 按 manifest 中的项目路径增改 Artifact。
3. 开 PR 前运行 `imwel lint`（CI 可用 `imwel lint --strict`）。
4. 通过 Git 宿主上的 **分支 + PR/MR** 贡献 — 宿主即治理层；不要绕过分支保护。

## Cursor 辅助

- Slash 命令 `/imwel-author` — 检测上下文并加载 template-author 配置包。
- Slash 命令 `/imwel-lint` — 运行 `imwel lint`。
- Companion skills 位于 `.cursor/skills/`。

## 不是本仓时

若处于**消费项目**（`.imwel/binding.yaml`），不要从那里编辑本模板的 `manifest.yaml`。本地用 `imwel sync` / `status`，回馈上游用 `imwel propose` / `imwel push`。
