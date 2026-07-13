## Why

模板仓库的作者体验目前几乎空白：`imwel template init` 只生成 manifest 与示例 Artifact，没有引导 AI/人类「如何在模板仓内正确增改 rules/skills」；消费侧的 `propose`/`push` 也不是作者主路径。团队已确认作者应在克隆的模板仓内开发，并以 Slash Commands + companion skills/rules 作为 AI Coding 主入口。现在补齐「仓库类型检测 → 选对配置包 → lint/脚手架」闭环，才能让模板仓可维护、可安装、可被 AI 正确协作。

## What Changes

- 新增**仓库类型检测**：区分模板仓（根目录 `.imwel/manifest.yaml` / imwel 模板布局）、消费项目（`.imwel/binding.yaml` 等本地绑定）、以及既非也非/歧义；检测结果驱动不同的开发流程、规范与验收检查配置包。
- 以 **Cursor Slash Commands + companion skills/rules** 作为模板作者（及消费侧相关）的主 UX；CLI 提供确定性引擎（如 `imwel doctor` 扩展、`imwel lint`、轻量 `imwel new`/脚手架辅助），供 Slash Command 调用或镜像，**不**以庞大的 `imwel author *` 命令族作为主产品面。
- 新增**模板仓 lint**：错误阻断「装坏」类问题（无效 manifest、缺 `SKILL.md`、路径越出约定等）；警告覆盖风格/最佳实践（触发式 description、长度等）；可选 `--strict` 供 CI。对齐 agentskills.io / Cursor `SKILL.md` 约定，不发明竞争方言。
- 扩展 `imwel template init` 脚手架：注入 `AGENTS.md`、`.cursor` rules/skills（及 Slash Command 桩），使在模板仓内打开的 AI **先读 manifest**，再按作者流程工作。
- 文档（README / docs 双语）说明：作者主路径 = 克隆模板仓 + Slash Commands；`propose`/`push` 仍为消费侧回馈路径，非作者默认工作流。

## Capabilities

### New Capabilities
- `template-authoring`：仓库类型检测、Slash Command / skills / rules 配置包（模板仓 vs 消费项目）、作者开发流程与验收检查、CLI lint/new 等确定性辅助，以及 Cursor 优先、其他工具后续扩展的路径。

### Modified Capabilities
- `template-repository`：`imwel template init` 脚手架须注入面向模板作者的 AI 资产（`AGENTS.md`、`.cursor` rules/skills/slash-command 桩等），使新模板仓开箱即可被 AI 按作者流程协作。

## Impact

- **CLI**：可能新增/扩展 `imwel lint`、轻量 scaffold/`new` 辅助，并扩展 `doctor` 与模板相关检查；用户可见字符串走 `src/locales/`。
- **脚手架**：`templates/init/<locale>/` 增加作者向 AI 资产；与现有示例 Artifact 并存。
- **npm 包**：Cursor 配置包可部分随脚手架写入用户模板仓，部分作为 imwel 包内可复制/可引用资产（见 design）；不引入后端或新依赖栈。
- **不改**：Git=DB、无平台、消费侧 `init`/`sync`/`push`/`propose` 的核心语义；不把作者主路径改成「在消费项目里 propose」。
- **文档**：英文 + zh-CN 同步更新作者工作流说明。
