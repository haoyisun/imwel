## Purpose

Define template-author experience: offline repo-context detection (`template` / `consumer` / `neither` / `ambiguous`), Slash Command–first author UX with template vs consumer config packs, deterministic `imwel lint` as the validation engine, and Cursor-first delivery with a tool-agnostic lint path for other AI tools later.

## Requirements

### Requirement: 为作者 UX 检测仓库上下文
系统 SHALL 提供确定性、离线的上下文检测，将当前工作目录的 imwel 角色判定为以下之一：`template`（含 `.imwel/manifest.yaml` 的模板仓布局）、`consumer`（含 `.imwel/binding.yaml` 的本地绑定）、`neither`、或 `ambiguous`（信号冲突）；检测须按设计沿祖先目录查找 `.imwel/` 标记。

#### Scenario: 检测为模板仓库
- **WHEN** 用户处于某目录树中，且最近一层 `.imwel/` 含有可读的、声明了 `projects` 的 `manifest.yaml`，且同层不含 `binding.yaml`
- **THEN** 检测 SHALL 返回 `template`，并 SHALL 暴露用于判定的模板仓库根路径

#### Scenario: 检测为消费项目
- **WHEN** 用户处于某目录树中，且最近一层 `.imwel/` 含有 `binding.yaml`，且同层不含 `manifest.yaml`
- **THEN** 检测 SHALL 返回 `consumer`

#### Scenario: 既非模板也非消费
- **WHEN** 任何祖先目录均不存在 `.imwel/manifest.yaml` 或 `.imwel/binding.yaml`
- **THEN** 检测 SHALL 返回 `neither`，且 SHALL NOT 臆造默认角色

#### Scenario: 布局歧义
- **WHEN** 最近一层 `.imwel/` 目录同时包含 `manifest.yaml` 与 `binding.yaml`
- **THEN** 检测 SHALL 返回 `ambiguous`，且 SHALL NOT 静默套用 template-author 或 consumer 配置包

### Requirement: 以 Slash Command 为主的作者 UX 与配置包
imwel SHALL 以 Cursor Slash Command 桩及 companion skills/rules 作为主要作者 UX，并根据检测结果选择 **template-author** 配置包或 **consumer** 配置包；日常作者工作 SHALL NOT 依赖庞大的 `imwel author *` CLI 命令族。

#### Scenario: 在模板仓中调用 Slash Command
- **WHEN** 用户在检测为 `template` 的上下文中调用主 imwel 作者 Slash Command
- **THEN** 所加载指引 SHALL 要求智能体先读 `.imwel/manifest.yaml`，按 manifest 约定与路径增改 Artifact，并运行适用于模板作者的验收检查

#### Scenario: 在消费项目中调用 Slash Command
- **WHEN** 用户在检测为 `consumer` 的上下文中调用主 imwel 作者 Slash Command
- **THEN** 所加载指引 SHALL 强调消费侧流程（`sync`/`status`、drift，以及用 `propose`/`push` 回馈上游），且 SHALL NOT 将消费目录当作模板仓去编辑 `manifest.yaml`

#### Scenario: 上下文为 neither 或 ambiguous 时调用 Slash Command
- **WHEN** 检测返回 `neither` 或 `ambiguous`
- **THEN** Slash Command 指引 SHALL 说明检测结果与具体下一步（例如打开模板仓根、运行 `imwel template init`、或运行 `imwel init`），且 SHALL NOT 静默套用错误配置包

### Requirement: CLI lint 作为确定性校验引擎
CLI SHALL 提供 `imwel lint`（名称在帮助文本中保持稳定），用于校验模板仓的「装坏」类问题与最佳实践警告；既可供直接使用，也可由 Slash Command 调用；SHALL NOT 发明超出 agentskills.io / Cursor `SKILL.md` 与 imwel manifest 约定之外的 Artifact 方言。

#### Scenario: Lint 将装坏问题报告为 error
- **WHEN** 用户对存在无效 manifest、skill 目录缺少 `SKILL.md`、或 Artifact 路径越出已声明约定的模板仓运行 `imwel lint`
- **THEN** CLI SHALL 将这些报告为 error，打印可操作信息，并以非零退出码退出

#### Scenario: Lint 将风格与最佳实践报告为 warning
- **WHEN** 用户对结构合法但未通过风格/最佳实践检查（例如 skill description 不可触发或长度不当）的模板仓运行 `imwel lint`
- **THEN** CLI SHALL 将这些报告为 warning；在无 error 时，默认 SHALL 以成功退出码退出

#### Scenario: CI 使用严格模式
- **WHEN** 用户运行 `imwel lint --strict` 且仅存在 warning
- **THEN** CLI SHALL 以非零退出码退出

#### Scenario: 错误上下文下 lint 不得假成功
- **WHEN** 用户在检测为 `neither`（或其它不可 lint 的非模板根）的上下文中运行 `imwel lint`
- **THEN** CLI SHALL 说明未找到模板仓库，并以非零退出码退出，而非报告「干净」的模板 lint

#### Scenario: 消费上下文下的最小 lint 行为
- **WHEN** 用户在检测为 `consumer` 的上下文中运行 `imwel lint`
- **THEN** CLI SHALL 说明完整模板 lint 应在模板仓根运行（可附带简短下一步），且 SHALL NOT 将该消费目录当作模板仓做满量结构校验并报告假成功

### Requirement: 可选的薄 CLI 脚手架辅助镜像 Slash 流程
若实现包含薄的 `imwel new`（或等价）辅助，则其 SHALL 仅在检测为模板仓的上下文中创建符合约定的骨架文件，并将校验留给 `imwel lint`；若本变更省略该辅助，则 Slash Command / skill 指引仍 SHALL 能够生成骨架并以 `imwel lint` 作为验收。

#### Scenario: 在模板仓中新建 skill 骨架
- **WHEN** 用户在 `template` 上下文中通过受支持的作者路径（Slash Command 和/或薄 CLI 辅助）创建新 skill
- **THEN** 所创建文件 SHALL 遵循生效的 `skillsDir` 约定并包含 `SKILL.md`，且后续 `imwel lint` SHALL 作为结构合法性的验收检查

### Requirement: 作者主路径为克隆模板仓本地开发
本能力交付的文档与作者指引 SHALL 明确：模板作者的主工作流是克隆模板仓库并在其中开发；消费侧的 `imwel propose` / `imwel push` 仍是回馈路径——不是默认作者工作流。

#### Scenario: 变更后读者阅读项目文档
- **WHEN** 用户阅读更新后的 README 或文档中的作者相关章节
- **THEN** 其 SHALL 能找到对「克隆并本地开发」主路径的明确陈述，以及对消费侧 propose/push 不同角色的说明

### Requirement: Cursor 优先并为其他工具预留路径
作者向 Slash Commands 与 companion 配置包 SHALL 以 Cursor 为先交付；检测与 `imwel lint` SHALL 保持工具无关，以便后续 AI 工具可增加各自的 skills/配置包而无需改动校验引擎。

#### Scenario: 非 Cursor 用户运行 lint
- **WHEN** 未使用 Cursor 的用户在有效模板仓中运行 `imwel lint`
- **THEN** CLI SHALL 执行相同的结构校验，且不要求存在 Cursor 专用文件
