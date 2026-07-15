# imwel

[English](README.md)

**imwel** 是一个 Git 原生的 CLI，用于在团队与多种 AI 编程工具之间分发规则、技能与 agent 说明 — 无需后端、数据库或托管平台。

## 快速开始

```bash
npx imwel@latest template init
imwel remote add org-standards git@github.com:example/imwel-templates.git
cd your-project
imwel init
imwel sync
```

## 命令

| 命令 | 说明 |
|------|------|
| `imwel doctor` | 检查 Git 与运行环境 |
| `imwel lint` | 检查模板仓库（error=装坏类；warning=风格；`--strict` 时 warning 也失败） |
| `imwel remote add/list/remove/set` | 管理模板仓库远程源 |
| `imwel template init` | 脚手架生成新模板仓库（含作者向 `AGENTS.md` 与 Cursor Slash Commands） |
| `imwel init` | 将当前目录绑定到模板项目 |
| `imwel sync` | 拉取上游制品更新 |
| `imwel status` | 报告远程与本地漂移 |
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
| 架构 | [docs/zh-CN/guide/architecture.md](docs/zh-CN/guide/architecture.md) |
| Manifest | [docs/zh-CN/guide/manifest.md](docs/zh-CN/guide/manifest.md) |
| 命令 | [docs/zh-CN/guide/commands.md](docs/zh-CN/guide/commands.md) |
| 示例模板 | [docs/zh-CN/guide/example-template.md](docs/zh-CN/guide/example-template.md) |
| 模板编写 | [docs/zh-CN/template-authoring.md](docs/zh-CN/template-authoring.md) |
| 适配器（贡献） | [docs/zh-CN/contribute/adapters.md](docs/zh-CN/contribute/adapters.md) |

English (canonical)：平行路径见 [`docs/en/`](docs/en/)。

## 贡献

见 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md)（[English](CONTRIBUTING.md)）。

## 安全

见 [SECURITY.md](SECURITY.md)。

## 许可证

MIT
