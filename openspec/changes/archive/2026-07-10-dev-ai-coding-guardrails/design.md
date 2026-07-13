## Context

imwel 仓库以 `AGENTS.md` 为工具无关的 canonical 开发说明，并用 OpenSpec（`.cursor/skills/openspec-*`）管理变更。实践中 Cursor Agent 经常不加载 `AGENTS.md`，导致源码语言、i18n、架构禁令、文档双语等约束被违反。路线图已确定严格先做本仓库 guardrails（R0），再做开源发包与产品功能。

本变更只触及「开发本仓库时的 AI 指引」，不改变 CLI 产品行为。

## Goals / Non-Goals

**Goals:**
- 用 Cursor `.mdc` rules 把硬约束稳定注入会话（`alwaysApply` + 路径 `globs`）。
- 用 skills 固化多步流程：尤其是「变更结束时的文档更新清单」。
- 保持 `AGENTS.md` 为单一长文 canonical；rules/skills 短、可执行，并交叉引用，避免三处全文复制。
- 把已达成的产品/流程共识（无后端、OpenSpec 中文规划、迭代文档义务）写进可加载资产。

**Non-Goals:**
- 不实现 `imwel author`、Slash Command 分发、模板仓作者体验（属 R3）。
- 不改造 OpenSpec CLI 本身。
- 不强制 Claude Code / 其他工具的等价配置（可在 docs 中说明「Cursor 优先」；其他工具仍可读 `AGENTS.md`）。
- 不把整份 `AGENTS.md` 拆碎删除。

## Decisions

### 1. Rule 分层：alwaysApply 短禁令 + globs 局部约定
- `imwel-core.mdc`（`alwaysApply: true`）：从 `AGENTS.md` 提炼 15–25 条硬约束（Git=DB、无后端、源码英文、CLI 字符串走 locales、KISS、安全默认、命令动词族）。
- `openspec-planning.mdc`（`globs: openspec/**`）：MVP 之后规划产物用简体中文；不回翻已归档英文 MVP。
- `cli-i18n.mdc`（`globs: src/locales/**, src/commands/**, src/cli.ts`）：禁止用户可见字符串硬编码。
- `docs-bilingual.mdc`（`globs: docs/**, README*.md, templates/init/**`）：改英文文档须同步 zh-CN 或显式 TODO。
- *备选*：仅依赖 `AGENTS.md`。已证伪，故拒绝。

### 2. Skill 管流程，Rule 管禁令
- 新增 `imwel-change-docs-checklist` skill：列出每次功能/行为变更结束时必须核对的文档面（README 双语、docs/en+zh-CN、CHANGELOG（若已存在）、`templates/init` 说明、架构变则更新 `AGENTS.md`）。
- 可选 `imwel-implement-change`：实现 OpenSpec change 时的步骤（读 tasks → 遵守 core rule → `npm run ci` → 跑文档清单 → 不擅自 commit）。
- 现有 `openspec-*` skills 保留；新 skill 通过 description 触发条件与之区分，不复制 OpenSpec 脚手架步骤。

### 3. AGENTS.md 只加交叉引用与「文档义务」短节
不把 rules 全文贴进 `AGENTS.md`。增加一小节说明：Cursor 开发者应依赖 `.cursor/rules`；其他工具读本文件；迭代时文档义务见 checklist skill。

### 4. 路线图共识写入 core rule（短条目）
- 作者主路径与 Slash Command 属后续 `template-author-experience`，本变更不实现。
- 新 CLI 动词须与现有族协调。
- 不引入后端/平台。

## Risks / Trade-offs

- **[Risk]** `alwaysApply` 过长挤占上下文 → **Mitigation**：core rule 严格短句列表，细节留在 `AGENTS.md`。
- **[Risk]** rules 与 `AGENTS.md` 漂移 → **Mitigation**：`AGENTS.md` 改架构条款时，tasks/checklist 要求同步核对 core rule；不维护第三份长文。
- **[Trade-off]** 仅优化 Cursor → 接受；本仓库当前主力工具是 Cursor；`AGENTS.md` 仍覆盖其他 Agent。

## Migration Plan

1. 新增 `.cursor/rules/*.mdc` 与 skills。
2. 小幅更新 `AGENTS.md`。
3. 无需数据迁移；无运行时发布。回滚即删除新增文件并还原 `AGENTS.md` 小节。

## Open Questions

- `imwel-implement-change` 是否在本变更必做，还是仅 docs-checklist 即可（倾向：checklist 必做，implement skill 可选若 tasks 过胖则砍）。
- core rule 是否用中文写（开发者偏好）还是英文（与源码政策一致）→ **倾向英文**，与「源码/标识英文」一致，且 Cursor 对英文 rule 更稳；规划相关 globs rule 可用中文（对齐 OpenSpec 规划语言）。
