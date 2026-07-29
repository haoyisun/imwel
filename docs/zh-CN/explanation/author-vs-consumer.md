# 作者与消费者

imwel 有两条生命周期。搞混目录，是「跑错地方」类问题的最常见来源。

## 消费者

你在**应用**（或包）目录工作，希望团队规则落盘到 Cursor、Claude Code 等。

- 状态文件：`.imwel/binding.yaml`
- 日常：`init` → `sync` / `status` → 可选 `propose` / `push`
- **不要**在这里就地改远程模板的 `manifest.yaml`

入口：[为 Cursor 消费渲染](../how-to/consume-for-cursor.md) 或[快速上手](../tutorials/quick-start.md)。

## 作者

你维护**模板仓库**——Git 上的真相源。

- 状态文件：`.imwel/manifest.yaml`（模板根**没有**消费者 binding）
- 日常：改 Artifact → `imwel lint` → commit → 宿主上的 PR
- 发布是普通 Git，不是 imwel 的「publish」命令

入口：[建立模板仓库](../how-to/create-template-repo.md)。

## 为何要两条

团队需要一个像代码一样评审规则的地方（作者），以及许多把规则渲染进各工具格式的检出（消费者）。imwel 是二者之间的薄分发层——Git 仍是数据库，宿主仍是治理。

## Monorepo

绑定是**按目录**的。每个需要消费模板的子项目各自跑 `imwel init`。没有特殊 monorepo 模式。
