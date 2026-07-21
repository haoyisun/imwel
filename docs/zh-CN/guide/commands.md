# 命令

下列命令均为当前 CLI 已实现能力。全局选项：`--lang <locale>`（`en`、`zh-CN`）。

## 总览

| 命令 | 用途 |
|------|------|
| `imwel doctor` | 检查 Git 与运行环境 |
| `imwel lint` | 检查**模板**仓库 |
| `imwel remote add/list/remove/set` | 管理模板远程源 |
| `imwel template init` | 脚手架生成新模板仓库 |
| `imwel adopt` | 将项目中散落的工具规则归并为 canonical Artifact |
| `imwel init` | 将当前目录绑定到模板 project |
| `imwel sync` | 拉取上游 Artifact 更新 |
| `imwel status` | 报告远程与本地漂移 |
| `imwel rollback` | 恢复到先前的安装状态 |
| `imwel push` | 将本地编辑推送到上游（默认分支 + PR） |
| `imwel propose <file>` | 登记新 Artifact 供下次 push |

## `imwel doctor`

检查系统 `git` 是否在 `PATH` 上以及其他环境前提。新机器建议先跑。

## `imwel lint`

校验**模板**仓库（期望 `.imwel/manifest.yaml`，而非消费侧 binding）。

| 选项 | 说明 |
|------|------|
| `--strict` | warning 与 error 一并失败 |

- **Errors** — 装坏类（无效 manifest、项目 path 缺失、skill 缺 `SKILL.md`、路径逃逸等）。
- **Warnings** — 风格 / 最佳实践（skill `description` 质量、**空壳/占位规则**等）。

> 模板侧 lint 只检测**空壳/占位**规则；孤儿引用、死链 import 在此跳过——模板规则引用的是**消费项目**的文件（模板仓中不存在），这两类检查在消费侧 `imwel status` 运行。

在消费侧 binding 目录中，CLI 会引导你到模板仓，而不是假装检查通过。见 [Lint 与质量条](../author/lint.md)。

## `imwel remote`

| 子命令 | 说明 |
|--------|------|
| `add <url>` | 注册模板远程；本地别名由 URL 推导 |
| `add <alias> <url>` | 以显式别名注册模板远程（向后兼容） |
| `list` | 列出远程 |
| `remove <alias>` | 移除远程（`-y` / `--yes` 跳过确认） |
| `set <alias>` | 更新远程选项 |

| 选项 | 说明 |
|------|------|
| `--as <alias>`（`add`） | 覆盖由 URL 推导的别名（单 URL 形式） |
| `--direct-push`（`add`） | 允许直推绑定分支（opt-in；非默认） |
| `--direct-push [value]`（`set`） | 启用或关闭直推 |

仅传 URL 时，imwel 会以仓库名推导别名（冲突时回退为 `owner-repo`，再退化为数字后缀），并打印所选别名。

默认上游路径仍是 **分支 + PR/MR**。

## `imwel template init`

脚手架生成新模板仓库（manifest、示例 project、作者向 `AGENTS.md`、Cursor Slash Commands / skills）。

| 选项 | 说明 |
|------|------|
| `--dir <path>` | 目标目录 |
| `--locale <locale>` | 脚手架语言（`en`、`zh-CN` 等） |
| `--name <name>` | 仓库名（默认取目录名；仅当你选择创建远程仓时才交互询问） |
| `-y` / `--yes` | 跳过确认（非交互默认） |

## `imwel adopt`

扫描当前项目中已存在的工具原生规则/技能文件（覆盖全部 14 个适配器：`.cursor/rules`、`CLAUDE.md`、`.trae/rules`、`AGENTS.md`、`.github/copilot-instructions.md`、`CONVENTIONS.md` 等），反向解析为 canonical Artifact 并写入 `.imwel/adopted/`。用于消除冷启动，并把在各工具间漂移的规则收编为单一真相。

- 跨工具**内容一致**→合并为一份 canonical Artifact（静默去重）。
- 跨工具**内容冲突**→逐条上报并**跳过**，绝不覆盖；请对齐后重新运行。
- **无需 binding 或 remote** 即可运行；只读扫描，不修改被扫描文件。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过写入确认（不会臆造冲突裁决） |
| `--out <path>` | 产物输出目录（默认 `.imwel/adopted`） |
| `--tools <csv>` | 仅归并指定工具 id |

归并完成后请先查看产物，再运行 `imwel template init` 发布为模板，或 `imwel init` + `imwel propose` 反馈到远端。

## `imwel scan`

确定性地生成项目指纹（无 LLM、无网络、只读）到 `.imwel/fingerprint.yaml`。指纹是一张"该看哪里"的地图，而非结论：语言构成（按扩展名计数）、清单/构建文件、测试/lint/format/CI 配置、顶层目录、DB schema/迁移文件，以及散落的工具原生规则文件位置（复用与 `imwel adopt` 相同的发现适配器）。

它只检查文件名与路径——从不读取文件正文——并跳过重目录（`node_modules`、`.git`、`dist` 等）。输出稳定排序、可复现（时间戳除外）。

| 选项 | 说明 |
|------|------|
| `--out <path>` | 输出路径（默认 `.imwel/fingerprint.yaml`） |

指纹**不是**受管制品——不参与 `sync`/漂移。它用于喂给你的 AI 编码工具（或下方第一方 `imwel-extract` skill）来起草贴合本项目的规则。

## `imwel skill install`

把 imwel 自带的**第一方** skill（随 npm 包分发）安装进你所选的工具，经与模板 Artifact 相同的适配器渲染（skill 降级阶梯 + 去重）。自带 skill：

- `imwel-extract` —— 借 scan 指纹从零起草贴合本项目的 rule/skill。
- `imwel-audit` —— 审计现有规则的语义脱节（规则↔代码不符、规则↔规则矛盾、缺失规则），把可执行建议写入 `.imwel/audit/`。

| 选项 | 说明 |
|------|------|
| `--tools <csv>` | 目标工具 id（非交互模式必填） |
| `-y` / `--yes` | 跳过写入确认 |

第一方 skill 是**非受管**的：写入磁盘但不登记进 binding、不提交到 `.imwel/history/`，也不被 `status`/`sync`/`push` 跟踪。

工作流：先 `imwel scan`，再 `imwel skill install`，然后在你的 AI 工具中调用 skill：

- `imwel-extract` 读取 `.imwel/fingerprint.yaml`、定向读关键文件，把草稿起草到 `.imwel/drafts/`。
- `imwel-audit` 读取现有规则 + 指纹指向的代码，把脱节发现与建议措辞写入 `.imwel/audit/`。

两者都只写隔离的 review 目录——之后用 `imwel adopt` 归并或 `imwel propose` 登记。审计是显式的 skill 调用；imwel 绝不 hook 你的 AI 工具会话。

## `imwel init`

将当前目录绑定到某远程模板仓中的一个 project，并为所选工具安装 Artifact。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过确认（**不会**自动填选择） |
| `--tools <csv>` | 逗号分隔的工具 id（如 `cursor,claude-code,codex,trae`） |
| `--remote <alias>` | 远程别名（仅配置一个远程时自动选用，可省略） |
| `--branch <name>` | 分支名 |
| `--project <name>` | manifest project 名 |
| `--optional <csv>` | 要安装的 optional Artifact 源路径 |
| `--no-optional` | 不安装任何 optional Artifact |

非交互模式必须提供选择类 flags；缺必填参数时以退出码 **1** 失败。

## `imwel sync`

拉取上游并应用 Artifact 更新（冲突经 history 仓处理）。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过应用确认 |
| `--continue` | 手工解决冲突后继续 |

始终强制刷新远程状态（不受被动 fetch 节流约束）。

## `imwel status`

报告远程与本地漂移。始终强制刷新。漂移报告之后，会对受管的已渲染文件运行**规则健康**检查并列出问题（不改变退出码）：

- **空壳** — 规则无实质内容（空文件或仅占位）。
- **死链导入** — `@path` 导入指向不存在的文件。
- **孤儿引用** — 反引号路径（如 `` `src/foo.ts` ``）指向已不存在的文件。

检查是确定性且保守的（无 LLM，忽略 glob/URL/命令），仅作提示，不阻断。

## `imwel rollback`

恢复 `.imwel/history/` 中记录的某次安装。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过确认 |
| `--to <sha>` | 要恢复的 history 提交 SHA |

恢复后，imwel 会**删除该 history 点之后新增的管理文件**。从不删除未管理文件。

## `imwel push`

将本地工具文件反向渲染为规范 Artifact，并向上游提案（默认分支 + PR/MR）。对每个有安装路径的绑定工具做反向渲染；规范正文冲突时推送失败。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过确认 |
| `--all` | 选择全部 push 候选 |
| `--message <msg>` | 提交说明 |

## `imwel propose <file>`

登记新 Artifact 路径供下次 `push`（按 manifest 约定校验）。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过确认 |
| `--remote <alias>` | 目标远程 |
| `--project <name>` | 目标 manifest project |
| `--type <type>` | `rule`、`skill` 或 `agents` |
| `--optional` / `--required` | optional 或必需 Artifact |
| `--tool <id>` | 反向渲染所用源工具适配器 |

## 非交互 / CI

`-y` / `--yes` **只**跳过确认提示，不会为选择类提示编造答案 — 请显式传入 `--tools`、`--remote`、`--project`、`--to`、`--all` 等。

```bash
imwel init -y --tools cursor,claude-code --remote org-standards --branch main \
  --project my-app --no-optional

imwel sync --yes
imwel push --yes --all --message "chore: update artifacts"
imwel rollback --yes --to <history-sha>
imwel propose rules/new-rule.md -y --remote org-standards --project my-app \
  --type rule --required --tool cursor
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `IMWEL_FETCH_THROTTLE_MS` | 覆盖全局被动 fetch 节流（默认 4 小时）。非法值回退默认。尚不支持按远程独立节流。`sync` / `status` 始终强制刷新。 |

## 下一步

- 消费者工作流 → [安装模板](../consume/quickstart.md)
- 作者工作流 → [编写模板](../author/quickstart.md)
- 安全默认与 Git 模型 → [架构](./architecture.md)
- 开发 CLI 本身 → [CONTRIBUTING.zh-CN.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.zh-CN.md)
