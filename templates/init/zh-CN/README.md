# {{name}}

使用 [imwel](https://github.com/haoyisun/imwel) 管理的 AI 编程规则、技能与 agent 说明模板仓库。

## 目录结构

- `.imwel/manifest.yaml` — 声明项目与约定
- `AGENTS.md` — 面向作者的 AI 指引（先读 manifest）
- `.cursor/` — Cursor rules、skills 与 Slash 命令（`/imwel-author`、`/imwel-lint`）
- `example-project/rules/` — 规则制品（`type=rule`）
- `example-project/skills/` — 技能包（`type=skill`）
- `example-project/agents.md` — agent 说明（`type=agents`）

## 用 AI 增改 Artifact（作者主路径）

1. 克隆本仓库并在 Cursor 中打开。
2. 运行 `/imwel-author` 检测上下文并加载 template-author 配置包。
3. 按 `.imwel/manifest.yaml` 声明的路径增改 Artifact。
4. 开 PR 前运行 `imwel lint`（或 `/imwel-lint`）。

消费侧的 `imwel propose` / `imwel push` 仍可用于从绑定项目回馈上游 — 但不是默认作者工作流。

## 贡献变更

1. 优先直接在本模板仓中编辑（分支 + PR）。
2. 在绑定的消费目录中，可用 `imwel push` / `imwel propose` 以分支 + PR 提交反向渲染后的 canonical 内容。
3. 在模板仓根用 `imwel lint` 校验结构。

## 添加新项目

在 `.imwel/manifest.yaml` 的 `projects` 下添加具有唯一 `name` 与 `path` 的条目。
