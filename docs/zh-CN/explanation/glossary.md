# 术语词表

贯穿全文档的核心术语。每条链接到该概念被深入使用的位置。

| 术语 | 含义 |
|------|------|
| **模板仓（Template repo）** | 含 `.imwel/manifest.yaml`、列出一个或多个 *project* 及其 Artifact 的普通 Git 仓库。没有特殊服务器 —— 见[架构](../explanation/architecture.md#git-即数据库)。 |
| **Artifact** | 共享内容的单元：**规则**（agents.md 风 Markdown）、**技能**（`SKILL.md` bundle）或 **agents** 说明。见 [Manifest → 发现](../reference/manifest.md#artifact-如何被发现)。 |
| **Project（项目）** | 模板仓内一个具名、可安装的单元（manifest 中的 `name` + `path`）。当 `role: project` 时为**可写项目**，消费者可编辑并回推；一个消费目录至多绑定一个。见 [Manifest → 项目角色](../reference/manifest.md#项目角色-模块-vs-项目)。 |
| **模块（Module）** | 声明为 `role: shared` 的 project：可复用的**只读**单元（如某语言/框架标准包），消费者安装并保持同步，但不回推本地改动。可在唯一可写项目之外安装任意数量。见 [Manifest → 项目角色](../reference/manifest.md#项目角色-模块-vs-项目)。 |
| **绑定（Binding）** | 消费目录的 `.imwel/binding.yaml`，把它关联到某远程模板仓 —— 至多一个可写项目外加任意数量的只读模块。绑定按目录、而非按仓库 —— 见[架构 → 绑定](../explanation/architecture.md)。 |
| **适配器（Adapter）** | 每个工具（Cursor、Claude Code、Codex……）的渲染器，把 Artifact 写成该工具原生格式并可读回。见[适配器](../how-to/add-adapter.md)。 |
| **约定（Convention）** | manifest 中用于发现 Artifact 的目录/文件名（`rulesDir`、`skillsDir`、`agentsFile`），可按 project 覆盖。见 [Manifest → conventions](../reference/manifest.md#conventions)。 |
| **Overlay** | 规则顶部一小段 YAML frontmatter（`description` / `globs` / `alwaysApply`），imwel 在渲染时翻译成各工具的原生元数据。见[规则元数据 overlay](../reference/manifest.md#规则元数据-overlay)。 |
| **漂移（Drift）** | 远程模板、上次同步与本地磁盘文件之间的偏离 —— 经 Git 检测。见[同步、漂移与回滚](../how-to/sync-and-drift.md)。 |
| **history 仓** | `.imwel/history/` 下真实的隐藏 Git 仓，记录已安装状态,用于 diff、回滚与三路合并。见[架构 → history 仓](../explanation/architecture.md#本地-history-仓)。 |
| **草稿（Draft）** | 由 `imwel-extract` 写到 `.imwel/drafts/` 的 AI 生成规则/技能,供人工 review 后再采纳。见[从代码库起草规则](../how-to/draft-rules-from-codebase.md)。 |

## 下一步

- 消费者工作流 → [安装模板](../how-to/consume-for-cursor.md)
- 作者工作流 → [编写模板](../how-to/create-template-repo.md)
- 这些术语背后的模型 → [架构](../explanation/architecture.md)
