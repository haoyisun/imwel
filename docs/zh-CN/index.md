# imwel

用于在团队与多种 AI 编程工具之间分发规则、技能与 agent 说明的 Git 原生 CLI — **无后端、无数据库、无托管平台**。

模板仓库就是普通 Git 仓库。imwel 将本地项目目录绑定到远程模板仓中的某个 project，把 Artifact 渲染为各工具原生格式（Cursor、Claude Code 等），用 Git 检测漂移，并通过分支 + PR/MR 向上游提案。

## 快速开始

```bash
# 1. 脚手架（或克隆）模板仓库
npx @culock/imwel@latest template init

# 2. 注册为远程源（任意将要消费它的机器）
imwel remote add org-standards git@github.com:example/imwel-templates.git

# 3. 绑定消费项目并安装 Artifact
cd your-project
imwel init
imwel sync
```

需要全局命令时可：`npm install -g @culock/imwel`（命令名仍是 `imwel`）。本地开发见 [CONTRIBUTING.zh-CN.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.zh-CN.md)；安全披露见 [SECURITY.md](https://github.com/haoyisun/imwel/blob/main/SECURITY.md)。

## 指南

| 页面 | 你会学到 |
|------|----------|
| [架构](./guide/architecture) | Git 即数据库、按目录绑定、history 仓、安全默认 |
| [Manifest](./guide/manifest) | `.imwel/manifest.yaml` 字段、conventions、optional |
| [命令](./guide/commands) | 完整 CLI 参考（`doctor`、`lint`、`init`、`sync`、`push` 等） |
| [示例模板](./guide/example-template) | `templates/init` 与 `imwel template init` |
| [模板编写](./template-authoring) | 作者工作流：`/imwel-author`、`imwel lint`、宿主 PR/MR |

## 贡献

| 页面 | 你会学到 |
|------|----------|
| [适配器](./contribute/adapters) | 如何通过上游 PR 新增渲染目标（不是插件系统） |

## 消费侧说明

- 非交互：`init` / `sync` / `push` / `propose` / `rollback` 支持 `-y` / `--yes`。选择类输入必须显式传 flags。`--yes` 不会自动填选择。
- `IMWEL_FETCH_THROTTLE_MS` 可覆盖全局被动 fetch 间隔（默认 4 小时）。`sync` / `status` 始终强制刷新。
- `imwel rollback` 恢复历史，并**删除**恢复点之后新增的管理文件（从不删除未管理文件）。
- `imwel push` 对每个有安装路径的绑定工具做反向渲染。

## 相关链接

- 仓库 [README](https://github.com/haoyisun/imwel/blob/main/README.zh-CN.md)
- [贡献指南](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.zh-CN.md)
