# 术语词表

贯穿全文档的核心术语。每条链接到该概念被深入使用的位置。

| 术语 | 含义 |
|------|------|
| **模板仓（Template repo）** | 含 `.imwel/manifest.yaml`、列出一个或多个 *project* 及其 Artifact 的普通 Git 仓库。没有特殊服务器 —— 见[架构](../guide/architecture.md#git-即数据库)。 |
| **Artifact** | 共享内容的单元：**规则**（agents.md 风 Markdown）、**技能**（`SKILL.md` bundle）或 **agents** 说明。见 [Manifest → 发现](../guide/manifest.md#artifact-如何被发现)。 |
| **Project** | 模板仓内一个具名、可安装的单元（manifest 中的 `name` + `path`）。一个消费目录绑定到一个 project。见 [Manifest → projects](../guide/manifest.md#projects)。 |
| **绑定（Binding）** | 消费目录的 `.imwel/binding.yaml`，把它关联到某远程模板仓中的一个 project。绑定按目录、而非按仓库 —— 见[架构 → 绑定](../guide/architecture.md)。 |
| **适配器（Adapter）** | 每个工具（Cursor、Claude Code、Codex……）的渲染器，把 Artifact 写成该工具原生格式并可读回。见[适配器](../contribute/adapters.md)。 |
| **约定（Convention）** | manifest 中用于发现 Artifact 的目录/文件名（`rulesDir`、`skillsDir`、`agentsFile`），可按 project 覆盖。见 [Manifest → conventions](../guide/manifest.md#conventions)。 |
| **Overlay** | 规则顶部一小段 YAML frontmatter（`description` / `globs` / `alwaysApply`），imwel 在渲染时翻译成各工具的原生元数据。见[规则元数据 overlay](../guide/manifest.md#规则元数据-overlay)。 |
| **漂移（Drift）** | 远程模板、上次同步与本地磁盘文件之间的偏离 —— 经 Git 检测。见[同步、漂移与回滚](../consume/sync-and-drift.md)。 |
| **history 仓** | `.imwel/history/` 下真实的隐藏 Git 仓，记录已安装状态,用于 diff、回滚与三路合并。见[架构 → history 仓](../guide/architecture.md#本地-history-仓)。 |
| **草稿（Draft）** | 由 `imwel-extract` 写到 `.imwel/drafts/` 的 AI 生成规则/技能,供人工 review 后再采纳。见[从代码库起草规则](../author/from-codebase.md)。 |

## 下一步

- 消费者工作流 → [安装模板](../consume/quickstart.md)
- 作者工作流 → [编写模板](../author/quickstart.md)
- 这些术语背后的模型 → [架构](../guide/architecture.md)
