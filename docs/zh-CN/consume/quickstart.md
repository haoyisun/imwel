# 安装模板

> **消费者路径 · 第 1/3 步** —— 前置：[安装与前置](../getting-started/install.md)。若要编写规则,见[作者路径](../author/quickstart.md)。

你是想把团队规则装进自己 AI 工具的开发者。本页是消费者的规范上手序列。

## 1. 注册模板 remote

每台机器一次。只传 URL,imwel 会由它推导本地别名：

```bash
imwel remote add git@github.com:example/imwel-templates.git   # 别名自动推导（如 "imwel-templates"）
```

想用显式别名?用两参数形式或 `--as`：

```bash
imwel remote add org-standards git@github.com:example/imwel-templates.git
# 或：imwel remote add git@github.com:example/imwel-templates.git --as org-standards
```

全部子命令见 [`imwel remote`](../guide/commands.md#imwel-remote)。

你可以注册**多个**远程（例如一个公司级标准仓、一个团队仓）；每次 `imwel remote add` 只是再加一个别名。但一个绑定只指向一个远程 —— 由 `imwel init` 选定。

## 2. 绑定项目并安装 Artifact

```bash
cd your-project
imwel init            # 交互式选择工具、branch、只读模块 + 可写项目
```

若只配置了一个远程,`imwel init` 会自动选用它（无需 `--remote`）；配置多个时交互选择或传 `--remote <alias>`。

一个绑定可从远程安装两类内容：

- **只读模块**（`role: shared`）—— 可复用的标准（如 Python 或 Vue 3 包），你安装并保持同步，但不回推改动。可安装任意数量。
- **一个可写项目**（`role: project`）—— 你自己项目的 Artifact，可编辑并用 `imwel push` 回推。每个目录至多一个。

选择使用切换列表（空格勾选/取消），应用前会展示新增/移除 diff 并要求二次确认。`imwel init` 会把所选 Artifact 渲染到每个所选工具的原生位置（见[适配器](../contribute/adapters.md)）,记录[绑定](../concepts/glossary.md),并在 `.imwel/history/` 下创建隐藏历史仓。

CI / 非交互场景请显式传选择 flag（`--module`、`--project`）—— 见[非交互 / CI](../guide/commands.md#非交互-ci)。

## 3. 之后调整模块

无需整目录换绑即可增删/冻结模块：

```bash
imwel modules         # 切换已装/可装模块，查看 diff，确认
```

移除模块会删除其渲染文件。若你手工改过某模块的文件，`imwel sync` 不会静默覆盖 —— 它会让你选择**丢弃**、**冻结**（保留副本、停止同步）或**卸载**该模块。

> **换绑是整体覆盖。** 在已绑定目录上重跑 `imwel init` 会替换整套选择（工具、模块、可写项目），对既有 Artifact 的本地修改会被覆盖。请先推送你想保留的内容（`imwel push` / `imwel propose`），或改用 `imwel modules` 做增量模块调整。

## 下一步

- 保持规则最新、撤销坏更新 → [同步、漂移与回滚](./sync-and-drift.md)
- 完整选项参考 → [`imwel init`](../guide/commands.md#imwel-init)
