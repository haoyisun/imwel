# imwel

[![npm version](https://img.shields.io/npm/v/@culock/imwel.svg)](https://www.npmjs.com/package/@culock/imwel)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@culock/imwel.svg)](https://www.npmjs.com/package/@culock/imwel)

[English](README.md)

团队 AI 编码规则的唯一真相源 —— 从一个普通 Git 仓分发到每个工具。无后端、无数据库、无平台。

团队里一半人用 Cursor、一半人用 Claude Code，还有人刚换了 Codex。每种工具的规则格式和存放位置都不一样，于是共享的编码规范只要有人改一个文件就开始漂移。

imwel 解决这个问题。它把规范收在一个 Git 仓里，渲染成各工具的原生格式，并通过正常的 PR 把改动回推上游。

## 快速开始

**使用团队规则**（最常见）：

```bash
npm install -g @culock/imwel
imwel remote add git@github.com:your-org/rules.git
cd your-project
imwel init && imwel sync
```

不想全局安装？每条命令都用 `npx @culock/imwel@latest <command>` 即可。

**为他人编写规则** —— 脚手架生成全新模板仓，开始编写：

```bash
npx @culock/imwel@latest template init
```

然后看[建立模板仓库](docs/zh-CN/how-to/create-template-repo.md)。

无需账号、无需注册、无需部署平台。imwel 卸载干净 —— 删掉 `.imwel/` 目录即可。规则始终留在你自己的 Git 仓里。

## 核心命令

| 命令 | 作用 |
|------|------|
| `imwel init` | 把当前目录绑定到模板仓（一个可写项目 + 任意数量只读共享模块） |
| `imwel sync` | 拉取上游最新规则 —— 跳过已冻结模块，绝不静默覆盖本地手改 |
| `imwel status` | 查看上游、上次同步与本地文件之间的漂移 |
| `imwel push` | 把本地改动以分支 + PR 的形式回推上游 |
| `imwel remote add` | 注册一个要拉取的模板仓库 |
| `imwel template init` | 脚手架生成全新模板仓（含作者指南 + Cursor slash 命令） |
| `imwel doctor` | 检查 Git 与运行环境是否就绪 |

完整参考，含 `adopt`、`scan`、`modules`、`tools`、`rollback`、`propose`、`lint` → 见[命令参考](docs/zh-CN/reference/commands.md)。

## 为什么是 Git 原生

你的团队本来就在 Git 里 —— 分支、评审、SSH 密钥、分支保护。imwel 复用这一切，而不是让你再接入一个新平台。

- **Git 即数据库。** 版本与历史来自 Git 本身，imwel 不另建并行的内容存储。
- **Git 宿主即治理。** 谁能改规则由 GitHub/GitLab/Gitea 的权限与 PR 决定 —— 不是 imwel 里的权限系统。
- **本地手改安全。** `.imwel/history/` 下的隐藏 Git 仓记录每次安装。漂移表现为普通 Git diff，冲突以标准合并标记呈现、由你手工解决。任何东西都不会被静默覆盖。
- **无后台守护进程。** 远程模板检查在你调用 imwel 时运行（默认节流为每 2 小时一次），不会由本地编辑触发，也从不挂钩进 AI 工具自身的会话。

## 编写模板

作者主路径是**克隆模板仓并在其中编辑** —— 不是在消费项目里用 `propose`/`push`。

1. `imwel template init`（或克隆已有模板仓）。
2. 在 Cursor 中打开并运行 `/imwel-author`。
3. 按 `.imwel/manifest.yaml` 编辑 artifact，再用 `imwel lint` 校验。
4. 在 Git 宿主上开分支 + PR。

`imwel propose` / `imwel push` 是**消费侧**路径 —— 从已绑定项目把本地改动回馈上游。

## 非交互 / CI

`--yes` / `-y` 只跳过确认提示。选择类输入必须以 flags 提供；非交互模式下缺少必填 flags 以退出码 1 失败。

```bash
imwel init -y --tools cursor,claude-code --remote org-standards --branch main \
  --project my-app --no-optional
imwel sync --yes
imwel push --yes --all --message "chore: update artifacts"
imwel rollback --yes --to <history-sha>
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `IMWEL_FETCH_THROTTLE_MS` | 覆盖被动 fetch 节流间隔（默认 2 小时）。`sync` / `status` / `propose` 始终强制刷新。 |

## 架构

- 模板仓就是带 `.imwel/manifest.yaml` 的普通 Git 仓。
- 每个消费目录有自己的 `.imwel/binding.yaml` —— 按目录而非按仓库。monorepo 在每个子项目目录分别 `imwel init` 即可。
- 安装历史记录在 `.imwel/history/` 下独立的隐藏 Git 仓中。
- 渲染适配器（14 个）：**Cursor**、**Claude Code**，以及 `codex`、`windsurf`、`gemini-cli`、`copilot`、`cline`、`continue`、`aider`、`kiro`、`opencode`、`trae`、`qoder`、`zcode` —— 见[贡献适配器](docs/zh-CN/how-to/add-adapter.md)与[支持的工具](docs/zh-CN/reference/supported-tools.md)。

## 文档

```bash
npm run docs:dev      # 本地预览
npm run docs:build    # 构建站点
```

文档按 [Diátaxis](https://diataxis.fr/)（教程 / 操作指南 / 参考 / 解释）组织：

| 指南 | 路径 |
|------|------|
| 概览 | [docs/zh-CN/index.md](docs/zh-CN/index.md) |
| 5 分钟快速上手 | [docs/zh-CN/tutorials/quick-start.md](docs/zh-CN/tutorials/quick-start.md) |
| 建立模板仓库 | [docs/zh-CN/how-to/create-template-repo.md](docs/zh-CN/how-to/create-template-repo.md) |
| 为 Cursor 消费渲染 | [docs/zh-CN/how-to/consume-for-cursor.md](docs/zh-CN/how-to/consume-for-cursor.md) |
| 为 Claude Code 消费渲染 | [docs/zh-CN/how-to/consume-for-claude-code.md](docs/zh-CN/how-to/consume-for-claude-code.md) |
| 经 PR 回推上游 | [docs/zh-CN/how-to/push-via-pr.md](docs/zh-CN/how-to/push-via-pr.md) |
| 命令 | [docs/zh-CN/reference/commands.md](docs/zh-CN/reference/commands.md) |
| Manifest | [docs/zh-CN/reference/manifest.md](docs/zh-CN/reference/manifest.md) |
| 架构 | [docs/zh-CN/explanation/architecture.md](docs/zh-CN/explanation/architecture.md) |
| 术语词表 | [docs/zh-CN/explanation/glossary.md](docs/zh-CN/explanation/glossary.md) |

## 开发

```bash
npm install
npm run build
npm test
npm run dev -- doctor
```

## 参与进来

- 在 GitHub 上 Star [imwel](https://github.com/haoyisun/imwel) —— 如果它替你团队省了一次复制粘贴，也帮别人发现它。
- 缺你用的 AI 工具？[提个 issue](https://github.com/haoyisun/imwel/issues) 或通过 PR [贡献适配器](docs/zh-CN/how-to/add-adapter.md)。
- 遇到 bug 或有疑问？[提个 issue](https://github.com/haoyisun/imwel/issues)。

## 贡献

见 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md)（[English](CONTRIBUTING.md)）。

## 安全

见 [SECURITY.md](SECURITY.md)。

## 许可证

MIT
