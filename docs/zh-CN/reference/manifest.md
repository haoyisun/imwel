# Manifest 参考

> **参考 · 面向模板作者。** 消费者无需编辑本页 —— 见[消费者路径](../how-to/consume-for-cursor.md)。初次接触?从[编写模板](../how-to/create-template-repo.md)开始。

模板仓库在 **`.imwel/manifest.yaml`** 中声明 project 与目录约定。imwel 的读取规则与 `src/core/manifest.ts` 一致（默认值、校验、按 project 覆盖）。

## 位置

```
<template-repo-root>/
  .imwel/
    manifest.yaml
```

`imwel lint` 与上下文检测期望的是**模板**根目录：有 `manifest.yaml`、无 `binding.yaml`。不要在模板根放入消费侧的 `binding.yaml`。

## Schema

### 根级字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `conventions` | 否（会套用默认） | 发现 Artifact 时的默认目录 / 文件名 |
| `projects` | **是**（非空数组） | 一个或多个可安装的 project |

### `conventions`

| 字段 | 默认 | 说明 |
|------|------|------|
| `rulesDir` | `rules` | 各 project 路径下 `rule` Artifact 目录 |
| `skillsDir` | `skills` | `skill` Artifact 目录（每个 skill 是含 `SKILL.md` 的文件夹） |
| `agentsFile` | `agents.md` | 项目级 agents 说明文件名 |

若省略或部分省略 `conventions`，缺失键使用上表默认值。

### `projects[]`

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | **是** | `imwel init` / 绑定使用的 project id |
| `path` | **是** | 相对模板仓根的目录 |
| `role` | 否 | `shared`（只读模块）或 `project`（可写项目）。缺省为 `project`。见下文。 |
| `optional` | 否 | 安装时可选的 Artifact **源路径**列表（相对该 project 的 path） |
| `conventions` | 否 | 仅对本 project 覆盖根级 `conventions` 的部分字段 |

某 project 的解析结果 = 根级 `conventions` 与该 project 的 `conventions` 合并（同名键以 project 为准）。

### 项目角色：模块 vs 项目

`role` 让作者声明**该 project 期望如何被消费**：

- **`role: project`**（默认）—— *可写项目*：团队绑定它、在本地编辑其 Artifact，并可用 `imwel push` 回推改动。一个消费目录**至多绑定一个**可写项目。
- **`role: shared`** —— *只读模块*：可复用的标准或组件（如 Python 风格包、Vue 3 约定包），可被多个项目安装并保持同步，但**不**回推本地改动。一个消费者可在其唯一可写项目之外安装**任意数量**的模块。

只读这一约束是**客户端侧**的 —— imwel 只是拒绝对模块 Artifact 执行 `imwel push`。它**不是**访问控制机制；谁能真正写入模板仓，由你的 Git 宿主权限与分支保护治理。通过 `imwel propose`（一次有意的、经审阅的 PR/MR）仍可回馈模块。

> **模块不提供项目级 `agents` 文件。** `agentsFile`（默认 `agents.md`）渲染到消费者**项目根**的单实例说明文件（`AGENTS.md` 等），归那唯一的可写项目所有。模块与可写项目及其他模块**组合**安装，若各自都带 agents 会在此根文件处冲突。因此安装模块时其 `agents` 文件会被**跳过**（`rule` / `skill` 有独立路径,可干净组合,不受影响）；`imwel lint` 会对携带 agents 文件的 `shared` 模块给出 `module.agentsIgnored` warning。请把这类内容放进 rule/skill。

无效的 `role` 值会导致 `imwel lint` / manifest 校验失败。

```yaml
projects:
  - name: python-standards
    path: modules/python
    role: shared            # 可复用、pull-only 的模块
  - name: vue3-standards
    path: modules/vue3
    role: shared
  - name: checkout-service
    path: projects/checkout
    role: project           # 团队拥有的可写项目
```

### optional 与必需 Artifact

- **未**列入 `optional` 的 Artifact 视为**必需** — `imwel init` / sync 时默认安装。
- 列入 `optional` 的路径在安装时供用户选择是否包含（非交互可用 `--optional <csv>` / `--no-optional`）。

`optional` 中的路径使用正斜杠，且相对 project 目录（例如 `skills/example-skill`）。

## 示例

最小脚手架（与 `templates/init/zh-CN/.imwel/manifest.yaml` 同形）：

```yaml
conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md

projects:
  - name: example-project
    path: example-project
    optional:
      - skills/example-skill
```

### 多个 project

一个模板仓库**可以声明多个 project** — 例如 monorepo 式模板，为 `backend` 与 `frontend` 各自提供一套规则/技能包。`projects` 是列表，每个 project 一个条目即可。

每个消费目录**至多绑定一个可写项目**（`role: project`，通过 `imwel init --project <name>`），外加任意数量的**只读模块**（`role: shared`，通过 `imwel init --module <csv>` 或 `imwel modules`）（见 [命令](./commands.md#imwel-init)）。要拥有第二个可写项目，在另一个目录再次运行 `imwel init`。绑定是按目录的，因此 monorepo 可将多个子目录分别映射到同一模板仓的多个 project。

每个 project 还可按键覆盖根级 `conventions`：

```yaml
conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md

projects:
  - name: backend
    path: projects/backend
  - name: frontend
    path: projects/frontend
    conventions:
      rulesDir: ai-rules
      agentsFile: AGENTS.md
```

## Artifact 如何被发现

在已解析的 conventions 下：

| 类型 | 位置 | 说明 |
|------|------|------|
| `rule` | `<path>/<rulesDir>/*.md` | 规范正文：agents.md 风 Markdown |
| `skill` | `<path>/<skillsDir>/<name>/SKILL.md` | Cursor / agentskills 风格 frontmatter |
| `agents` | `<path>/<agentsFile>` | 项目级 agent 说明 |

imwel **不会**发明第二种规则内容方言。工具特有字段属于适配器 `targetOverrides`，在渲染时展开 — 见 [适配器](../how-to/add-adapter.md)。

## 规则元数据 overlay

`rule` 源文件**可以**以一小段 YAML frontmatter overlay 开头。imwel 会将其解析为语义 overrides、**从规范正文中剥离**，并在渲染时翻译成各目标工具的原生格式（正文因此保持纯 agents.md 风 Markdown）。

```markdown
---
description: 修改 API handler 时使用，保持错误处理一致。
globs: ["src/api/**/*.ts"]
# alwaysApply: true
---

# API 错误处理

...规则正文...
```

| 字段 | 作用 |
|------|------|
| `description` | 规则何时/为何适用。缺失时工具会退化为文件名 slug，故 `imwel lint` 会对缺失给 warning。 |
| `globs` | 将规则按路径挂载到匹配文件。 |
| `alwaysApply` | `true` 表示常驻规则。 |

### 触发意图（三选一）

| 意图 | 写法 | 含义 |
|------|------|------|
| **always-on** | `alwaysApply: true` | 始终生效。 |
| **glob-attached** | 设置 `globs` | 对匹配文件生效。 |
| **agent-requested** | 既不设 `globs` 也不设 `alwaysApply: true` | 仅靠 `description` 由模型主动调用。 |

优先级：作者的 overlay 是跨工具**默认**；消费者对某工具的本地修改（经 `parseExisting` 反解）优先于它，因此除非消费者已覆盖该工具，作者默认的变更会在再次 sync 时继续传播。

skill 本就带原生 `SKILL.md` frontmatter `description`；当 skill 因目标工具无原生 skills 目录而被渲染为按需规则时，该 description 会传播进生成的规则 frontmatter。

## 校验建议

- 在模板根运行 `imwel lint`（error = 装坏类；warning = 风格；`--strict` 时 warning 也失败）。

## 下一步

- 校验你的 manifest 与规则 → [Lint 与质量条](../how-to/lint-and-publish.md)
- 生成起始树与目录布局 → [编写模板](../how-to/create-template-repo.md)
- Artifact 如何按工具渲染 → [适配器](../how-to/add-adapter.md)
