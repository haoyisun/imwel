# imwel

[English](README.md)

**imwel** 是一个 Git 原生的 CLI，用于在团队与多种 AI 编程工具之间分发规则、技能与 agent 说明 — 无需后端、数据库或托管平台。

初次使用？请阅读端到端[使用说明](docs/zh-CN/guide/usage.md)（或[命令参考](docs/zh-CN/guide/commands.md)）。

## 快速开始

```bash
npx @culock/imwel@latest template init
imwel remote add git@github.com:example/imwel-templates.git   # 别名由 URL 推导
cd your-project
imwel init                                                    # 单个远程会自动选用
imwel sync
```

## 命令

| 命令 | 说明 |
|------|------|
| `imwel doctor` | 检查 Git 与运行环境 |
| `imwel lint` | 检查模板仓库（error=装坏类；warning=风格；`--strict` 时 warning 也失败） |
| `imwel remote add/list/remove/set` | 管理模板仓库远程源 |
| `imwel template init` | 脚手架生成新模板仓库（含作者向 `AGENTS.md` 与 Cursor Slash Commands） |
| `imwel adopt` | 将项目中散落的工具规则归并为 canonical Artifact 到 `.imwel/adopted/`（无需 binding/remote）；`--from` 经确定性质量闸采纳 `.imwel/drafts/` 中 review 过的 AI 草稿 |
| `imwel scan` | 确定性地生成项目指纹到 `.imwel/fingerprint.yaml`（语言、工具链、现有规则位置，Git 仓库时附带变更热点/共变的历史信号）—— 无 LLM |
| `imwel skill install` | 将 imwel 第一方 skill（`imwel-extract`、`imwel-audit`）安装进所选工具（非受管，不被 sync 跟踪） |
| `imwel init` | 将当前目录绑定到模板仓 —— 至多一个可写项目（`role: project`）外加任意数量的只读模块（`role: shared`） |
| `imwel modules` | 为当前绑定增删/冻结只读模块 |
| `imwel sync` | 拉取上游制品更新（跳过已冻结模块；绝不静默覆盖只读模块的本地修改） |
| `imwel status` | 报告远程与本地漂移，并附确定性规则健康检查（空壳规则、死链导入、孤儿路径引用） |
| `imwel rollback` | 恢复到先前的安装状态（会删除该点之后新增的管理文件） |
| `imwel push` | 将本地编辑推送到上游（默认分支 + PR；对所有绑定工具反向渲染） |
| `imwel propose <file>` | 登记新制品供下次 push 使用（校验 manifest 约定） |

## 编写模板

作者主路径是**克隆模板仓库并在其中开发** — 不是在消费项目里用 `propose`/`push`。

1. `imwel template init`（或克隆已有模板仓）。
2. 在 Cursor 中打开仓库并运行 `/imwel-author`（脚手架写入 `.cursor/commands/`）。
3. 按 `.imwel/manifest.yaml` 编辑 Artifact，再用 `imwel lint` 验收。
4. 在 Git 宿主上开分支 + PR/MR。

`imwel propose` / `imwel push` 仍是**消费侧**从绑定项目回馈上游的路径。

## 非交互 / CI 用法

`--yes` / `-y` **只**跳过确认提示，不会自动填入选择类答案。选择类输入必须通过 flags 提供。非交互模式下缺少必填参数时以退出码 1 失败。

```bash
# Init（完整 flags）
imwel init -y --tools cursor,claude-code --remote org-standards --branch main \
  --project my-app --no-optional

# Sync / push / rollback / propose
imwel sync --yes
imwel push --yes --all --message "chore: update artifacts"
imwel rollback --yes --to <history-sha>
imwel propose rules/new-rule.md -y --remote org-standards --project my-app \
  --type rule --required --tool cursor
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `IMWEL_FETCH_THROTTLE_MS` | 覆盖全局被动 fetch 节流间隔（默认 4 小时）。非法值回退默认。每远程独立节流尚未支持。`sync` / `status` 始终强制刷新。 |

## 架构

- 模板仓库是带有 `.imwel/manifest.yaml` 的普通 Git 仓库
- 本地绑定位于每个目录的 `.imwel/binding.yaml`
- 安装历史记录在 `.imwel/history/` 独立 Git 仓库中
- 渲染适配器：**Cursor**、**Claude Code**，以及 `trae`、`qoder`、`codex`、`opencode`、`zcode`、`gemini-cli`、`windsurf`、`continue`、`cline`、`kiro`、`copilot`、`aider`（详见 [适配器文档](docs/zh-CN/contribute/adapters.md)）

## 开发

```bash
npm install
npm run build
npm test
npm run dev -- doctor
```

## 文档

文档站点源码：[docs/](docs/)。本地预览 / 构建：

```bash
npm run docs:dev
npm run docs:build
```

| 指南 | 路径 |
|------|------|
| 概览与选择路径 | [docs/zh-CN/index.md](docs/zh-CN/index.md) |
| 快速走查（两条泳道） | [docs/zh-CN/guide/usage.md](docs/zh-CN/guide/usage.md) |
| 消费者路径（安装模板） | [docs/zh-CN/consume/quickstart.md](docs/zh-CN/consume/quickstart.md) |
| 作者路径（编写模板） | [docs/zh-CN/author/quickstart.md](docs/zh-CN/author/quickstart.md) |
| 命令 | [docs/zh-CN/guide/commands.md](docs/zh-CN/guide/commands.md) |
| Manifest | [docs/zh-CN/guide/manifest.md](docs/zh-CN/guide/manifest.md) |
| 架构 | [docs/zh-CN/guide/architecture.md](docs/zh-CN/guide/architecture.md) |
| 术语词表 | [docs/zh-CN/concepts/glossary.md](docs/zh-CN/concepts/glossary.md) |
| 适配器（贡献） | [docs/zh-CN/contribute/adapters.md](docs/zh-CN/contribute/adapters.md) |

English (canonical)：平行路径见 [`docs/en/`](docs/en/)。

## 贡献

见 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md)（[English](CONTRIBUTING.md)）。

## 安全

见 [SECURITY.md](SECURITY.md)。

## 许可证

MIT
