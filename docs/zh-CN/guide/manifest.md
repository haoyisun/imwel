# Manifest 参考

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
| `optional` | 否 | 安装时可选的 Artifact **源路径**列表（相对该 project 的 path） |
| `conventions` | 否 | 仅对本 project 覆盖根级 `conventions` 的部分字段 |

某 project 的解析结果 = 根级 `conventions` 与该 project 的 `conventions` 合并（同名键以 project 为准）。

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

### 按 project 覆盖 conventions

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

imwel **不会**发明第二种规则内容方言。工具特有字段属于适配器 `targetOverrides`，在渲染时展开 — 见 [适配器](../contribute/adapters)。

## 校验建议

- 在模板根运行 `imwel lint`（error = 装坏类；warning = 风格；`--strict` 时 warning 也失败）。
- 作者工作流详见 [模板编写](../template-authoring)。
- 用 `imwel template init` 生成起始树 — 见 [示例模板](./example-template)。
