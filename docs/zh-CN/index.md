# imwel

用于在团队与多种 AI 编程工具之间分发规则、技能与 agent 说明的 Git 原生 CLI — **无后端、无数据库、无托管平台**。

模板仓库就是普通 Git 仓库。imwel 将本地项目目录绑定到远程模板仓中的某个 project，把 Artifact 渲染为各工具原生格式（Cursor、Claude Code 等），用 Git 检测漂移，并通过分支 + PR/MR 向上游提案。不熟悉这些术语?见[术语词表](./concepts/glossary.md)。

## 30 秒快速开始

```bash
# 消费团队规则：
imwel remote add git@github.com:example/imwel-templates.git   # 别名由 URL 推导
cd your-project
imwel init && imwel sync
```

需要常驻命令时可全局安装：`npm install -g @culock/imwel`（命令名仍是 `imwel`）。或用 `npx @culock/imwel@latest <command>` 一次性运行。

## 选择你的路径

imwel 有两条彼此独立的生命周期。按你的角色选择其一 —— 每条都是有序、逐步的轨道：

| 我想…… | 从这里开始 |
|--------|-----------|
| 在我的 AI 工具里**使用**团队规则 | [消费者路径 → 安装模板](./consume/quickstart.md) |
| 为他人**发布**规则 | [作者路径 → 编写模板](./author/quickstart.md) |

想先看一屏概览?见[快速走查](./guide/usage.md)（两条泳道、最小命令）。

## 参考与概念

| 页面 | 你会找到 |
|------|----------|
| [命令](./guide/commands.md) | 完整 CLI 参考（`doctor`、`lint`、`init`、`sync`、`push` 等） |
| [Manifest](./guide/manifest.md) | `.imwel/manifest.yaml` 字段、conventions、规则元数据 overlay |
| [架构](./guide/architecture.md) | Git 即数据库、按目录绑定、history 仓、安全默认 |
| [术语词表](./concepts/glossary.md) | 核心术语：模板仓、Artifact、绑定、适配器、漂移…… |
| [适配器](./contribute/adapters.md) | 如何通过上游 PR 新增渲染目标（不是插件系统） |

## 下一步

- 新消费者? → [安装模板](./consume/quickstart.md)
- 新作者? → [编写模板](./author/quickstart.md)
- 仓库 [README](https://github.com/haoyisun/imwel/blob/main/README.zh-CN.md) · [贡献指南](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.zh-CN.md) · [安全](https://github.com/haoyisun/imwel/blob/main/SECURITY.md)
