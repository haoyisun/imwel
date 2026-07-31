# imwel

Git 原生 CLI，用于分发 AI 编程规则、技能与 agent 说明——**无后端、无数据库、无托管平台**。

一套模板仓，多种 AI 工具。像管代码一样同步；回推走正常 PR。

## 从这里开始

大约五分钟，你可以脚手架一个本地模板，并在 Cursor 或 Claude Code 的原生路径上看到规则落盘。

**[5 分钟快速上手 →](./tutorials/quick-start.md)**

## 你想做什么？

| 我想… | 去这里 |
|-------|--------|
| 安装 Node / Git / CLI | [安装](./how-to/install.md) |
| 从已有代码库起草 rule / skill | [从代码库起草规则](./how-to/draft-rules-from-codebase.md) |
| 把已审阅草稿写进 AI 工具试用 | [归并已有规则](./how-to/adopt-existing-rules.md) |
| 为团队发布规则 | [建立模板仓库](./how-to/create-template-repo.md) |
| 在 Cursor 里用团队模板 | [为 Cursor 消费渲染](./how-to/consume-for-cursor.md) |
| 在 Claude Code 里用团队模板 | [为 Claude Code 消费渲染](./how-to/consume-for-claude-code.md) |
| 经 PR 把本地改动回推上游 | [经 PR 回推上游](./how-to/push-via-pr.md) |
| 使用 imwel 内置 skill（extract / adopt / audit / create-template） | [使用第一方 skill](./how-to/use-first-party-skills.md) |
| 登记或配置模板远端 | [管理远端](./how-to/manage-remotes.md) |
| 在 CI 中运行 imwel（lint / 自动同步） | [在 CI 中使用](./how-to/use-in-ci.md) |
| 搞清作者与消费者的区别 | [作者与消费者](./explanation/author-vs-consumer.md) |

## 参考

| 页面 | 内容 |
|------|------|
| [命令](./reference/commands.md) | 全量 CLI 旗标 |
| [Manifest](./reference/manifest.md) | `.imwel/manifest.yaml` |
| [绑定](./reference/binding.md) | `.imwel/binding.yaml` 与 `pending-proposals.yaml` |
| [支持的工具](./reference/supported-tools.md) | 适配器与典型落盘路径 |
| [架构](./explanation/architecture.md) | Git 即库、安全默认 |
| [术语词表](./explanation/glossary.md) | 模板仓、Artifact、绑定、漂移… |

仓库 [README](https://github.com/haoyisun/imwel) · [贡献指南](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.zh-CN.md)
