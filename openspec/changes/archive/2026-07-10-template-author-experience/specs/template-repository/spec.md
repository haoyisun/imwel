## ADDED Requirements

### Requirement: 脚手架注入面向模板作者的 AI 资产
`imwel template init` SHALL 在生成的骨架中包含面向作者的 AI 指引资产，使在新模板仓中打开的 AI 编码工具被引导先读 `.imwel/manifest.yaml`，并在增改 Artifact 时遵循 imwel 模板约定。脚手架至少 SHALL 包含根级作者向 `AGENTS.md`，以及与 `template-authoring` 能力一致的 Cursor 向桩（`.cursor/` 下的 rules 和/或 skills 和/或 Slash Command 桩）。

#### Scenario: 脚手架包含作者 AGENTS.md 与 Cursor 桩
- **WHEN** 用户运行 `imwel template init` 且脚手架成功完成
- **THEN** 目标目录 SHALL 包含根级 `AGENTS.md`（指示先读 manifest），并 SHALL 包含可用于 Cursor 的 `.cursor/` 作者向桩（rules 和/或 skills 和/或 commands）

#### Scenario: 脚手架 locale 仍适用于用户可读文档
- **WHEN** 用户在 `imwel template init` 中选择受支持的 locale
- **THEN** 面向用户的 locale 文件（manifest 注释、README、CONTRIBUTING）SHALL 继续按该 locale 生成，且该 locale 的脚手架树中 SHALL 存在作者向 AI 资产（或经文档说明的共享桩被复制进树），不得省略作者资产注入

#### Scenario: 既有示例 Artifact 仍然保留
- **WHEN** 用户接受 `imwel template init` 的默认提示
- **THEN** 骨架 SHALL 仍包含既有脚手架要求的带注释 manifest、示例 project 的 sample rule/skill/`agents.md`、以及 README/CONTRIBUTING，并在此之外增加新的作者向资产

#### Scenario: 目标已存在同名作者资产时不静默覆盖
- **WHEN** 目标目录中已存在同名的根级 `AGENTS.md` 或 `.cursor/` 作者向路径，且用户未显式确认覆盖
- **THEN** CLI SHALL 跳过或提示确认（与 design 一致），SHALL NOT 静默覆盖已有文件，并 SHALL 打印简短日志说明跳过或等待确认的路径
