# 命令

下列命令均为当前 CLI 已实现能力。全局选项：`--lang <locale>`（`en`、`zh-CN`）。

## 总览

| 命令 | 用途 |
|------|------|
| `imwel doctor` | 检查 Git 与运行环境 |
| `imwel lint` | 检查**模板**仓库 |
| `imwel remote add/list/remove/set` | 管理模板远程源 |
| `imwel template init` | 脚手架生成新模板仓库 |
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
- **Warnings** — 风格 / 最佳实践（skill `description` 质量等）。

在消费侧 binding 目录中，CLI 会引导你到模板仓，而不是假装检查通过。见 [模板编写](../template-authoring)。

## `imwel remote`

| 子命令 | 说明 |
|--------|------|
| `add <alias> <url>` | 注册模板远程 |
| `list` | 列出远程 |
| `remove <alias>` | 移除远程（`-y` / `--yes` 跳过确认） |
| `set <alias>` | 更新远程选项 |

| 选项 | 说明 |
|------|------|
| `--direct-push`（`add`） | 允许直推绑定分支（opt-in；非默认） |
| `--direct-push [value]`（`set`） | 启用或关闭直推 |

默认上游路径仍是 **分支 + PR/MR**。

## `imwel template init`

脚手架生成新模板仓库（manifest、示例 project、作者向 `AGENTS.md`、Cursor Slash Commands / skills）。

| 选项 | 说明 |
|------|------|
| `--dir <path>` | 目标目录 |
| `--locale <locale>` | 脚手架语言（`en`、`zh-CN` 等） |
| `--name <name>` | 仓库名 |
| `-y` / `--yes` | 跳过确认（非交互默认） |

## `imwel init`

将当前目录绑定到某远程模板仓中的一个 project，并为所选工具安装 Artifact。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过确认（**不会**自动填选择） |
| `--tools <csv>` | 逗号分隔的工具 id（如 `cursor,claude-code`） |
| `--remote <alias>` | 远程别名 |
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

报告远程与本地漂移。始终强制刷新。

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

## 相关

- [架构](./architecture) — 安全默认与 Git 模型
- [CONTRIBUTING.zh-CN.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.zh-CN.md) — 开发 CLI 本身
- npm 发布说明 — 见仓库 README 与 GitHub Releases
