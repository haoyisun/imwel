## ADDED Requirements

### Requirement: 公开文档化 Adapter 接口
项目须在文档中完整说明面向第三方贡献者的渲染适配器公开契约，包括 `Adapter` 的 `id`、`detect(projectDir)`、`render(artifact, targetOverrides?)`、`parseExisting(files)`，以及 `RenderedFile`、`ParsedExisting` 与规范 Artifact 内容边界（`type=rule` 的规范正文为 agents.md 兼容 Markdown；工具特有信息进入 `targetOverrides`）。

#### Scenario: 贡献者无需通读全部源码即可理解接口
- **WHEN** 贡献者阅读适配器 how-to 文档
- **THEN** 文档须列出上述方法的职责、输入输出含义，以及规范内容与 per-target overlay 的分离原则

#### Scenario: 与内置适配器语义一致
- **WHEN** 文档描述 round-trip 与 overlay 规则
- **THEN** 其语义须与现有 `render-adapters` 主规格及 `src/adapters/types.ts` 一致，且不得引入第二种规则内容方言

### Requirement: 静态注册的贡献路径（非运行时插件）
v1 的第三方适配器扩展路径须文档化为：在仓库 `src/adapters/` 新增实现模块，并将其加入静态 `adapters` 注册表（经上游 PR 合入），而不是终端用户侧的动态插件加载或适配器市场。

#### Scenario: how-to 明确注册步骤
- **WHEN** 贡献者遵循适配器 how-to 添加新目标
- **THEN** 文档须给出新增模块并在 `src/adapters/index.ts`（或同等静态注册点）登记的步骤，使 `init`/`sync`/`push` 能通过共享接口使用该适配器而无需改 core 中的目标特判

#### Scenario: 明确非插件模型
- **WHEN** 贡献者阅读扩展面概述
- **THEN** 文档须明确说明 v1 不支持从用户目录动态发现/加载适配器，扩展通过贡献上游代码完成

### Requirement: Round-trip 与实现清单
适配器贡献文档须要求新适配器满足 render → `parseExisting` 的往返等价期望，并提供实现清单（detect 启发式、路径约定、merge/upsert 若适用、测试建议），以便评审与自测。

#### Scenario: 文档陈述 round-trip 期望
- **WHEN** 贡献者阅读验收标准部分
- **THEN** 文档须说明：对同一 Artifact 先 `render` 再 `parseExisting` 后，规范内容与 `targetOverrides` 须与原始等价（在适配器所支持的字段范围内）

#### Scenario: 清单可执行
- **WHEN** 贡献者按文档清单实现适配器
- **THEN** 清单须至少覆盖：实现三方法、静态注册、避免在 core 增加目标分支、以及添加往返测试的建议

### Requirement: 可选的极薄类型导出
若仅靠文档引用源码路径不足以让外部 TypeScript 贡献者稳定引用类型，项目可增加极薄的包导出（例如导出已有 `Adapter` / `RenderedFile` / `ParsedExisting` 类型），但不得借此引入插件注册 API、运行时扩展点或大型公共 SDK 表面。

#### Scenario: 默认文档优先
- **WHEN** 实现本变更且现有源码与文档已足够说明接口
- **THEN** 允许不新增任何应用功能代码，仅交付文档

#### Scenario: 需要导出时保持最小
- **WHEN** 决定增加 npm `exports` 或类型 re-export
- **THEN** 导出范围须限于已有适配器类型（及必要的直接依赖类型），且文档须标注其用途为贡献者参考而非通用应用 SDK

### Requirement: 不改变内置适配器行为
本能力的交付不得改变 Cursor 与 Claude Code 内置适配器的既有渲染/解析行为，也不得修改消费侧 sync/push 对适配器接口的调用语义。

#### Scenario: 回归内置目标
- **WHEN** 本变更仅增加文档与可选薄导出
- **THEN** 现有 Cursor / Claude Code 相关测试与用户可见渲染结果须保持有效，无需为「可扩展性」改写其行为
