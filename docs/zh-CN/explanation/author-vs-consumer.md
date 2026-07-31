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

## Artifact 来源与归属

imwel 看到磁盘上的文件时，需要先知道**它是谁的**，才会动手。每个可渲染文件带四个来源标签之一：

| 标签 | 含义 | imwel 如何对待 |
|------|------|----------------|
| `USER` | 你自己写的（工具原生规则，或你 adopt 的草稿） | 可 `propose` / `push` / 被 `--from-project` 收割 |
| `MINE` | 由**你的**绑定安装并托管 | 被 `sync`/`status` 跟踪；可作为绑定自有编辑推送 |
| `FOREIGN` | 由**别的**工具/绑定安装，不是你的 | 不碰——绝不覆盖、绝不由你推送 |
| `generatedBy: imwel` | imwel 自身命令包（`imwel-*` skill） | 未托管；`sync`/`status`/`push` 跳过 |

### 为何重要

- **`imwel propose` 排除 `MINE` / `FOREIGN`**——你只 propose 自己真正写的（`USER`），不会误推别人的受管安装或外来工具文件。
- **`imwel template init --from-project` 只收 `USER`**——排除 imwel 自身命令包和其他工具的已装产物，并打印排除项及原因。于是生成的模板骨架只含你的规则，不会把 imwel 自己也复制进去。
- **`imwel adopt` 的写入是未托管的**——adopt 的草稿以 `USER` 风格落盘、不进绑定，所以本地试草稿永远不会破坏团队状态。

经验法则：imwel 绝不静默覆盖或推送它没写、也没被要求托管的文件。来源标签就是强制这一点的那层标记。
