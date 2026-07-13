## Purpose

Define the template repository manifest convention, optional artifact declaration, and `imwel template init` scaffolding (including locale selection, optional Git/hosting bootstrap, and author-facing AI assets injected into new template repos).

## Requirements

### Requirement: Manifest declares projects and directory conventions
A template repository SHALL declare its structure in a `.imwel/manifest.yaml` file at its root, containing a `conventions` section (default `rulesDir`, `skillsDir`, `agentsFile` names) and a `projects` list, where each project has a `name` and a `path` relative to the repository root, and MAY override `conventions` for itself.

#### Scenario: Reading a valid manifest
- **WHEN** the CLI reads a template repository whose `.imwel/manifest.yaml` declares two projects with different `rulesDir` overrides
- **THEN** the CLI SHALL resolve each project's effective conventions using its own override where present and the repository-level default otherwise

#### Scenario: Missing manifest
- **WHEN** the CLI attempts to use a repository that has no `.imwel/manifest.yaml`
- **THEN** the CLI SHALL report that the repository is not a valid imwel template repository and SHALL NOT proceed with binding

### Requirement: Optional artifacts are declared per project
A project entry in the manifest MAY declare an `optional` list of artifact paths. Artifacts not listed as optional SHALL be treated as required.

#### Scenario: Installing with optional artifacts present
- **WHEN** a project's manifest entry declares one artifact path under `optional`
- **THEN** the CLI SHALL prompt the user to include or exclude that artifact at install/sync time, while installing all non-optional artifacts automatically

### Requirement: Scaffolding a new template repository
`imwel template init` SHALL generate a new template repository skeleton containing a commented `.imwel/manifest.yaml`, an example project directory with a sample rule, a sample skill, and a sample `agents.md`, and a `README.md`/`CONTRIBUTING.md` describing how to add artifacts and how the push/propose contribution flow works.

#### Scenario: Scaffolding with default settings
- **WHEN** a user runs `imwel template init` and accepts the default prompts
- **THEN** the CLI SHALL write the full skeleton described above to the target directory without requiring any manual file creation

### Requirement: Scaffold content locale selection
`imwel template init` SHALL let the user choose the locale for generated comments and documentation (manifest comments, README, CONTRIBUTING), defaulting to the detected system locale and falling back to English if the detected locale has no matching scaffold template.

#### Scenario: Selecting a supported locale
- **WHEN** a user selects Simplified Chinese during `imwel template init`
- **THEN** the generated manifest comments and README/CONTRIBUTING content SHALL be written in Simplified Chinese

#### Scenario: Unsupported detected locale falls back to English
- **WHEN** the user's detected system locale has no corresponding scaffold template
- **THEN** the CLI SHALL generate the scaffold in English and SHALL NOT error out

### Requirement: Optional Git and hosting bootstrap during scaffold
`imwel template init` SHALL offer to initialize a local Git repository and create an initial commit, and, if the `gh` or `glab` CLI is detected and authenticated, SHALL offer to create the corresponding remote repository and push.

#### Scenario: Accepting Git bootstrap
- **WHEN** a user accepts the "initialize git and commit" prompt
- **THEN** the CLI SHALL run `git init` and create an initial commit containing the generated skeleton

#### Scenario: No hosting CLI available
- **WHEN** neither `gh` nor `glab` is available or authenticated
- **THEN** the CLI SHALL skip the remote-repository-creation offer without error and SHALL still complete local scaffolding

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
