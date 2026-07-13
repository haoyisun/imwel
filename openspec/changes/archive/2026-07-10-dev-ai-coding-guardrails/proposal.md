## Why

本仓库已有 `AGENTS.md` 与 OpenSpec skills，但 Cursor Agent 并不保证每轮会话都加载 `AGENTS.md`，导致架构禁令、i18n、KISS、文档双语义务等规范经常被忽略。同时，路线图讨论中形成的迭代流程（OpenSpec 中文规划、每变更文档清单、产品边界）仍只存在于对话里，尚未固化为可被 Agent 稳定加载的 rules/skills。现在先做本仓库的 AI Coding guardrails，是为后续所有变更（开源发包、CLI 打磨、author 体验）提供稳定的开发约束。

## What Changes

- 新增 `.cursor/rules/*.mdc`：将 `AGENTS.md` 中的硬约束提炼为短、可执行的 Cursor rules（`alwaysApply` + 按路径 `globs`），解决「有时不读 AGENTS.md」的问题。
- 新增/增强 `.cursor/skills/`：覆盖「功能迭代结束时的文档更新清单」以及（可选）「按 OpenSpec 实现变更时的标准步骤」；与现有 `openspec-*` skills 互补，不重复。
- 在 `AGENTS.md` 中增加简短交叉引用：说明 Cursor 以 `.cursor/rules` 为强制提醒、`AGENTS.md` 仍为工具无关的 canonical，避免三处长文复制。
- 明确本变更**不**修改 CLI 运行时行为、不新增 npm 命令、不改用户模板仓库约定。

## Capabilities

### New Capabilities
- `dev-ai-guardrails`: 本仓库面向 Cursor（及其他可读 `.cursor/` 的工具）的 AI Coding 规范与迭代流程——rules 分层、skills 流程、与 `AGENTS.md`/OpenSpec 的关系，以及每次变更应更新的文档义务。

### Modified Capabilities
（无 — 不改变已归档 MVP 的产品能力需求）

## Impact

- 新增目录与文件：`.cursor/rules/`、可能新增的 `.cursor/skills/<name>/`。
- 可能小幅编辑：`AGENTS.md`（交叉引用与「迭代文档义务」条目）。
- 不影响：`src/` CLI 逻辑、`templates/init/`、已发布的用户可见行为、`openspec/specs/` 下既有产品能力规格。
- 受益方：后续在本仓库用 Cursor 开发的贡献者与 Agent；为 R1–R4 变更提供一致约束。
