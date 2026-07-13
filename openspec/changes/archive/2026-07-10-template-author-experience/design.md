## Context

MVP 已具备模板仓约定（`.imwel/manifest.yaml`）、消费侧绑定（`.imwel/binding.yaml`）、`template init` 脚手架，以及消费侧 `propose`/`push`。作者侧仍缺：在模板仓内用 AI 正确增改 Artifact 的引导、可阻断「装坏」的 lint，以及脚手架注入的作者向 Cursor 资产。

产品共识：作者主路径是**克隆模板仓本地开发**；AI UX 以 **Slash Commands + companion skills/rules** 为主；CLI 做确定性校验/脚手架引擎。架构约束见 `AGENTS.md`：无后端、Git=DB、agents.md 规范为 rule 规范、源码英文、CLI 字符串走 locales、KISS/YAGNI。

本变更同时触及：新能力 `template-authoring`，以及修改 `template-repository` 的脚手架内容。

## Goals / Non-Goals

**Goals:**
- 提供可靠的**仓库类型检测**（模板仓 / 消费项目 / 既非也非或歧义），并据此选择不同配置包（流程、规范、验收检查）。
- Cursor 优先交付 Slash Commands + skills/rules；CLI 提供 `lint`（及可选轻量 `new`）与扩展后的 `doctor`，供 Slash Command 调用或人类直接使用。
- Lint 质量条：error 阻断装坏；warning 管风格；`--strict` 供 CI。对齐 agentskills.io / Cursor `SKILL.md`，不发明竞争方言。
- `imwel template init` 注入作者向 `AGENTS.md` 与 `.cursor` 资产，使 AI **先读 manifest**。
- 文档明确作者主路径 vs 消费侧 `propose`/`push`。

**Non-Goals:**
- 不以庞大的 `imwel author *` 命令族作为主产品面（允许少量确定性 CLI 辅助）。
- 不把作者主路径改成「在消费项目里 propose/push」。
- 不实现 Claude Code / 其他工具的完整等价 Slash Command 包（仅预留路径与文档说明）。
- 不引入后端、自定义版本号、或替代 Git 的校验/发布系统。
- 不自动静默修复用户 Artifact 内容；lint 只报告，scaffold/`new` 只生成约定内骨架。

## Decisions

### 1. 仓库类型检测算法（确定性、无网络）

从**当前工作目录**向上查找（与现有「绑定按目录」一致），在候选根上判定：

| 信号 | 含义 |
|------|------|
| 存在 `.imwel/manifest.yaml` 且可解析为含 `projects` 的模板布局 | **template** |
| 存在 `.imwel/binding.yaml`（消费侧本地绑定） | **consumer** |
| 两者皆无 | **neither** |
| 同一目录树同时出现两者（例如误把绑定写进模板仓根，或嵌套歧义） | **ambiguous** |

规则：
1. 优先在「最近的含 `.imwel/` 的祖先」上判定；若该层同时有 `manifest.yaml` 与 `binding.yaml` → **ambiguous**。
2. 若最近层只有 binding → **consumer**；只有 manifest → **template**。
3. 若向上既无 binding 也无 manifest → **neither**。
4. 检测**不**访问网络、不修改磁盘；结果供 Slash Command / skills 与 CLI（`lint`/`doctor`）共用同一核心函数（如 `detectImwelContext(cwd)`）。

歧义与 neither 时：Slash Command 须向用户说明并给出下一步（例如「运行 `imwel template init`」或「在模板仓根打开」或「运行 `imwel init` 绑定」），**不得**静默套用错误配置包。

*备选*：仅看 cwd、不向上查找。拒绝——与 monorepo 子目录工作方式不一致。

### 2. Slash Command 为主 UX，CLI 为确定性引擎

**分工：**
- **Slash Commands**（Cursor）：编排多步作者流程（新建 skill/rule、改 manifest、跑验收、写 PR 说明等）；按检测结果加载对应 companion skill/rule 包。
- **CLI**：`imwel lint`（及可选 `imwel new <type>`）、扩展 `imwel doctor`——纯确定性、可脚本化、可被 Slash Command 通过 shell 调用；输出机器可读摘要（至少 exit code：0=无 error；非 0=有 error；warning 默认不失败，`--strict` 时 warning 也失败）。

**不**新增面向日常作者的 `imwel author create-skill` 等厚命令层；若需要脚手架，用薄的 `imwel new` 或由 Slash Command 写文件 + 再 `lint`。

*备选*：仅 CLI `imwel author` 族。拒绝——与已定「AI Coding UX 优先」不符，且重复 Cursor 已擅长的交互。

### 3. 配置包：template vs consumer（Cursor 优先）

两套逻辑包（内容短、可执行，细节引用约定文档）：

| 包 | 触发 | 内容要点 |
|----|------|----------|
| **template-author pack** | 检测为 template | 先读 `.imwel/manifest.yaml`；按 `conventions` 与 project `path` 增改；skill 须有 `SKILL.md`；rule 用 agents.md 风 Markdown；改完跑 `imwel lint`；贡献走模板仓自身 Git 分支 + PR（宿主治理） |
| **consumer pack** | 检测为 consumer | 强调 `sync`/`status`、本地编辑与 drift；回馈上游用 `propose`/`push`；**不要**把消费目录当成模板仓改 manifest |

Slash Command 入口（须稳定写入 docs 与脚手架）：
- **`/imwel-author`（主入口）**：检测类型 → 加载对应 pack → 引导当前任务。
- 可选薄封装：`/imwel-lint`（内部 shell 出 `imwel lint`）；新建 skill/rule 由主入口 + companion skill 编排，不必再拆多个命令除非实现时证明必要。

### 4. 资产落点：脚手架写入用户仓 vs npm 包内

| 资产 | 落点 | 理由 |
|------|------|------|
| 模板仓 `AGENTS.md`（作者向：先读 manifest、目录约定、PR 流程） | **`templates/init/<locale>/` 注入** | 随用户模板仓版本化；作者可改 |
| 模板仓 `.cursor/rules`、`.cursor/skills`、`.cursor/commands`（Slash 桩） | **脚手架注入**（locale 平行文件或共享英文桩 + 中文说明） | AI 在用户仓内直接加载；不依赖全局 imwel 安装路径 |
| lint / detect 实现 | **imwel npm 包 `src/`** | 确定性逻辑只维护一份 |
| 可选：包内 `packs/cursor/...` 作为脚手架源拷贝 | **npm `files` 发布**（若与 `templates/init` 重复则只保留一处源，scaffold 时复制） | 避免两处漂移：优先 **单一源** 在 `templates/init` 或 `packs/`，`template init` 复制到目标；KISS 倾向直接放在 `templates/init/<locale>/` |

原则：**用户模板仓内的 AI 资产随 Git 演进**；**校验引擎随 imwel CLI 版本演进**。不要求模板仓 pin 某版 imwel 才能「被 AI 读懂」，但 lint 规则以当前安装的 CLI 为准。

### 5. Lint 规则分层（对齐既有方言，不另起炉灶）

**Error（默认失败 exit ≠ 0）：**
- manifest 缺失/YAML 无效/缺 `projects` 或 project `path` 不可用
- 约定路径外的「声称」Artifact，或 skill 目录缺少 `SKILL.md`
- 引用路径逃出 project 目录 / 明显破坏安装的结构错误

**Warning（默认不失败；`--strict` 失败）：**
- skill description 不像可触发描述、过长/过短等最佳实践（对齐 Cursor / agentskills.io 指导，不自创字段）
- 风格类：空示例、README 缺失等（保持少量，避免 lint 噪音）

`imwel lint` 在 **template** 上下文对仓库根运行；在 **consumer** 上下文可做绑定完整性检查（轻量）或提示「完整模板 lint 请在模板仓运行」——实现选更简单的一种并在 spec 中写清。

*备选*：自定义 Artifact schema 语言。拒绝——违反「不发明竞争方言」。

### 6. 脚手架扩展（修改 `template-repository`）

在现有 skeleton（manifest、示例 project、README/CONTRIBUTING）之上增加：
- 根级作者向 `AGENTS.md`（强调先读 manifest）
- `.cursor/rules`（短：manifest 优先、路径约定、勿发明方言）
- `.cursor/skills` 与/或 `.cursor/commands` Slash 桩（调用 `imwel lint`、引导 new skill/rule）

Locale：与现有 `templates/init/en` 与 `zh-CN` 平行维护；AI 指令类文件可用英文为主（工具更稳），用户可读 README 仍按 locale——在 tasks 中明确，避免双语义务含糊。

### 7. 其他工具的后续路径

本变更只交付 Cursor 包。设计预留：
- 检测与 lint **工具无关**（CLI 核心）。
- 文档一节「Adapter for author UX」：未来可为 Claude Code 增加 `.claude/` 等价 skills；Slash Command 是 Cursor 特有层，其他工具用 skills + CLI 即可。

不在本变更实现第二工具包。

## Risks / Trade-offs

- **[Risk]** 脚手架注入的 `.cursor` 与用户已有 Cursor 配置冲突 → **Mitigation**：仅在 `template init` 新目录写入；文档说明合并策略；不覆盖已存在文件除非用户确认（实现时对已存在路径跳过或提示）。
- **[Risk]** Slash Command 与 CLI 行为漂移 → **Mitigation**：Command/skill 只编排并 shell 出 `imwel lint`/`new`，业务规则不写两份。
- **[Risk]** 向上查找导致在「模板仓内的消费子目录」误判 → **Mitigation**：ambiguous 规则 + 文档；检测结果打印所用根路径，便于用户纠正。
- **[Trade-off]** Cursor 优先、其他工具稍后 → 接受；引擎仍通用。
- **[Trade-off]** 不把 author 做成厚 CLI → 接受；换来 AI UX 一致与更少命令面。

## Migration Plan

1. 实现 `detectImwelContext` + `imwel lint`（+ 可选 `new`）与 locales。
2. 扩展 `templates/init/<locale>/` 作者资产；更新 `template init` 复制逻辑。
3. 更新 README/docs 双语作者工作流。
4. 既有模板仓：文档说明可手动拷贝脚手架中的 `.cursor`/`AGENTS.md` 或重新 init 到新目录后迁移；**不**做自动远程改写。
5. 回滚：移除 lint/new 命令与脚手架新增文件即可；不影响已绑定消费项目的 sync 数据模型。

## Open Questions

（本变更内已拍板，保留备忘以免实现时回摆：）

- **Slash Command 主入口名**：采用 `/imwel-author`（Cursor commands 文件名与之对齐）；可选薄封装 `/imwel-lint`。若 Cursor 命名约束冲突，实现时微调文件名但 docs 与桩文案须一致。
- **`imwel new`**：本变更**非必做**；优先 lint + 脚手架注入 + Slash/skill 生成骨架。tasks 中标为可选，过胖则跳过。
- **consumer 下 `lint`**：最小实现——检测类型后打印「请在模板仓根运行完整 lint」指引并以非零退出（或明确「非模板上下文」）；不对消费目录做满量模板结构校验。不在本变更做 binding 深度校验。
