## Context

MVP 已交付 CLI 核心与 VitePress 双语文档骨架（`docs/.vitepress/config.ts`、`docs/en/index.md`、`docs/zh-CN/index.md`），但站点几乎只有首页占位，侧栏与深度页面缺失。适配器接口已存在于 `src/adapters/types.ts`（`detect` / `render` / `parseExisting`），并通过 `src/adapters/index.ts` 静态注册 Cursor 与 Claude Code；`render-adapters` 规格描述的是**产品内置行为**，尚未面向第三方贡献者写成可跟做的扩展指南。

并行路线图中，`oss-release-readiness` 负责发包/安装/贡献入口，`template-author-experience` 负责作者工作流与脚手架 AI 资产——二者会影响文档中「如何安装」「如何写模板」等段落的最终措辞，但本变更规划自洽：以架构、命令参考、manifest、适配器扩展面等**稳定内容**为主，对尚未落地的段落采用交叉引用或待对齐标注。

约束：无后端、Git=DB、文档英文 canonical + zh-CN 同步、KISS/YAGNI、本变更不实现 author 功能与 CLI 硬化。

## Goals / Non-Goals

**Goals:**
- 建立可导航的 VitePress 信息架构（en + zh-CN），覆盖命令参考、manifest schema、架构总览、适配器 how-to、示例模板指引。
- 以文档定义第三方新增渲染适配器的公开契约；仅在确有必要时增加极薄类型/入口导出。
- 明确与 `oss-release-readiness`、`template-author-experience` 的内容依赖与占位策略，使本变更可独立实现与验收。

**Non-Goals:**
- 不实现动态插件加载、适配器市场、或运行时从用户目录发现适配器。
- 不实现 `imwel lint`、Slash Commands、作者脚手架扩展（属 `template-author-experience`）。
- 不做 CLI 硬化、发布流水线、npm 发包流程（属 `oss-release-readiness` / `consumer-cli-hardening`）。
- 不改写内置 Cursor/Claude Code 适配器行为，不修改 `render-adapters` 既有需求条文。
- 不引入重型文档工具链之外的依赖（保持 VitePress）。

## Decisions

### 1. 文档信息架构（双语平行）

在 `docs/en/` 与 `docs/zh-CN/` 下采用平行路径（文件名一致，便于对照与侧栏配置）：

| 路径（相对 locale 根） | 内容 |
|------------------------|------|
| `index.md` | 产品定位、快速开始、指向深度页 |
| `guide/architecture.md` | Git=DB、绑定、history 仓、渲染流水线、安全默认 |
| `guide/manifest.md` | `.imwel/manifest.yaml` 字段、conventions、projects、optional |
| `guide/commands.md` | 命令参考表 + 各命令用途/前置条件（与 README 对齐并可更深） |
| `guide/example-template.md` | 示例/演示模板仓指引或链接策略 |
| `contribute/adapters.md` | 第三方适配器 how-to（接口、注册、round-trip、清单） |

VitePress `config.ts` 为 `root`（en）与 `zh-CN` 配置相同结构的 `sidebar` / `nav`。英文为 canonical；改英文页时须同变更更新 zh-CN 或在 zh-CN 页顶标注「待翻译」并链到英文。

*备选*：单语站点 + 机器翻译。拒绝——与项目文档双语义务不符。

### 2. 命令参考的内容来源与依赖占位

命令列表以当前 CLI 已实现命令为准（`doctor`、`remote`、`template init`、`init`、`sync`、`status`、`rollback`、`push`、`propose` 等）。描述须与帮助文案语义一致，但不要求本变更改 locales。

对依赖其他变更的段落：
- 安装/发布/贡献 PR 流程细节 → 交叉引用 `oss-release-readiness` 落地后的 README/CONTRIBUTING；未落地前写「以仓库 README 为准」或简短 TODO。
- 模板作者 Slash / lint 流程 → 交叉引用 `template-author-experience`；未落地前在 `example-template` / 架构页用「作者主路径见后续文档」占位，**不**虚构未实现命令。

*备选*：等两个依赖变更全部完成再写文档。拒绝——架构与适配器页可独立交付，阻塞成本过高。

### 3. Manifest schema 文档形态

以**可读参考**为主（字段表 + 示例 YAML + 与 `template-repository` 规格一致的语义），不引入 JSON Schema 运行时校验或单独 schema 包（YAGNI）。示例须说明：
- 根级 `conventions`（`rulesDir` / `skillsDir` / `agentsFile`）
- `projects[]` 的 `name` / `path` / 可选 `conventions` 覆盖 / 可选 `optional` 列表
- 与发现 Artifact 规则的关系（目录约定，而非另起内容方言）

实现时可从 `src/core/manifest.ts` 类型与现有 `templates/init` 示例核对，避免文档与代码漂移。

### 4. 适配器扩展面：文档优先，可选薄导出

**公开契约（文档必须写清）：**
- `Adapter`：`id`、`detect(projectDir)`、`render(artifact, targetOverrides?)`、`parseExisting(files)`
- 相关类型：`RenderedFile`（含可选 `merge` / `blockId`）、`ParsedExisting`、`Artifact` 的规范内容边界（rule 为 agents.md 风 Markdown；工具特有信息进 `targetOverrides`）
- 注册方式（v1）：在 `src/adapters/` 新增模块，并加入 `src/adapters/index.ts` 的静态 `adapters` 数组（贡献者通过 PR 合入主包——**不是**终端用户侧加载插件）
- 验收期望：round-trip（render → parseExisting 等价）、不触碰 core 中的目标特判、安全默认（不写未管理文件等）仍由 core 负责

**可选代码（仅当文档无法单独满足「可引用类型」时）：**
- 确认 `package.json` 的 `exports` / 类型导出是否已足够；若 npm 包目前只暴露 CLI bin，可增加极薄 `exports` 指向已有 `dist/adapters/types.js`（或 re-export），**不**新增插件 API、不新增 `registerAdapter()` 运行时。

*备选*：完整插件系统（用户目录动态 import）。拒绝——超出范围，且违背 KISS；第三方扩展在 v1 走上游 PR。

### 5. 示例/演示模板仓库策略

采用**链接 + 最小内嵌说明**，避免在 docs 仓内维护第二份完整模板树：

1. 优先链接：官方示例模板仓 URL（若 `oss-release-readiness` 尚未公布，用占位 URL + TODO，或指向本仓库 `templates/init/<locale>/` 作为「脚手架即最小示例」）。
2. 文档页内嵌：一份最小目录树与 `manifest.yaml` 片段，说明 projects/conventions/optional，并指向 `imwel template init`。
3. 不在本变更中新建独立 monorepo 示例应用；不把演示仓做成 imwel 的后端或托管服务。

*备选*：在 `examples/` 下复制整仓。可后续再做；本变更默认链接策略以降低双份维护。

### 6. 与现有规格的关系

- `docs-site`、`adapter-extensibility` 为**新能力**规格，描述文档站点与贡献者扩展路径的需求。
- 不提交对 `render-adapters` / `template-repository` 的 MODIFIED delta：内置行为与 manifest 约定不变；文档引用这些规格作为真相来源。

## Risks / Trade-offs

- [依赖变更未完成导致文档空洞] → 稳定页先写满；依赖页用交叉引用/TODO；验收区分「本变更必达页」与「对齐后补全」。
- [文档与代码漂移] → 命令/manifest/Adapter 页以源码与主规格为核对清单；tasks 含人工对照项。
- [贡献者误以为支持用户侧插件] → how-to 开篇明确「v1 = 上游 PR 静态注册」，非动态插件。
- [双语工作量大] → 平行路径 + 允许单页「待翻译」标注，禁止英文静默超前无标记。
- [薄 exports 被当成稳定公共 SDK] → 文档标注「贡献者参考类型，非通用应用 SDK」；避免大面积 public API 表面。

## Migration Plan

- 纯文档（+ 可选 exports）变更：无数据迁移；用户无破坏性 CLI 行为变化。
- 发布：随常规文档站点构建/部署流程（若站点尚未托管，以仓库内 `docs/` 可 `vitepress build` 为验收）。
- 回滚：还原 `docs/` 与可选 `package.json` exports 即可。

## Open Questions

- 官方示例模板仓的最终 GitHub URL 是否在 `oss-release-readiness` 中确定？（未定时用 `templates/init` + TODO。）
- npm 包是否需要正式 `exports` 字段暴露适配器类型，或仅文档引用源码路径即可？（实现时按「文档不够再加薄导出」决策树执行。）
- VitePress 是否在本变更中加入 `npm run docs:dev` / `docs:build` script？（建议加入，便于贡献者本地预览；属文档工具链最小配套。）
