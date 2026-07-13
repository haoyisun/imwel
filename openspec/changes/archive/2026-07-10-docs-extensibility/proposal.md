## Why

MVP 已具备 CLI 与双语文档站点骨架，但 VitePress 目前几乎只有首页占位：缺少命令参考、manifest 模式说明、架构总览，以及第三方如何新增渲染适配器的贡献指南。开源与模板作者体验推进后，外部贡献者与模板维护者会首先依赖文档理解系统边界与扩展点；现在补齐「文档深度 + 适配器可扩展面（文档优先）」才能让 imwel 可被独立理解与扩展，而无需阅读全部源码。

## What Changes

- 深化 VitePress 文档站点（`en` + `zh-CN` 同步）：命令参考、manifest schema、架构总览、第三方适配器 how-to。
- 定义面向贡献者的**公开扩展面**：以文档形式完整说明 `Adapter` 接口（`detect` / `render` / `parseExisting`）与注册约定；若实现阶段确有需要，可增加极薄的类型/入口导出，**优先文档、最小代码**。
- 提供示例/演示模板仓库的指引或链接策略（可指向官方示例仓、脚手架产物说明，或文档内嵌最小示例布局），便于读者对照实践。
- 规划上自洽；内容完整度**概念上依赖**并行路线图项 `oss-release-readiness`（发布/安装/贡献入口文案）与 `template-author-experience`（作者工作流与脚手架说明），本变更不实现这两项的功能，仅在文档中预留交叉引用与「待对齐」标注策略。
- **不**实现作者功能（lint/Slash Commands 等）、**不**做 CLI 硬化；本变更以文档与可选极薄导出为主。

## Capabilities

### New Capabilities
- `docs-site`：VitePress 文档信息架构、双语页面义务、命令/manifest/架构/示例模板指引等内容要求与验收场景。
- `adapter-extensibility`：第三方新增渲染适配器的公开契约（接口文档、注册步骤、round-trip 期望、可选薄导出），与现有内置 Cursor/Claude Code 适配器并存且不改变其行为语义。

### Modified Capabilities
（无 — 不修改 `render-adapters` 等既有产品能力的需求条文；扩展面以新能力规格描述贡献者路径，内置适配器行为保持不变。）

## Impact

- **文档**：`docs/`（VitePress 配置、侧栏、`en/` 与 `zh-CN/` 页面）；英文为 canonical，zh-CN 须同步或显式标注待译。
- **代码（可选、最小）**：可能从 `src/adapters/types.ts`（及既有 `index` 导出）暴露类型供外部参考；不引入插件运行时、不新增动态加载适配器机制、不改 sync/push 核心逻辑。
- **依赖关系（内容）**：命令表与发布说明可与 `oss-release-readiness` 对齐；模板作者路径可与 `template-author-experience` 交叉链接——实现本变更时可先写稳定架构/接口页，对尚未落地的作者/发布细节使用 TODO 或「见相关变更」占位。
- **不改**：CLI 命令语义、Git=DB 架构、无后端原则、消费侧 `init`/`sync`/`push`/`propose` 行为。
