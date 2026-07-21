# 架构

imwel 是一个 **npm 分发的 CLI**。没有 imwel 服务器、数据库或托管 ACL。内容由 Git 存储；权限与评审由 Git 宿主（GitHub / GitLab / Gitea 等）提供。

## Git 即数据库

内容身份、版本与历史来自 Git 对象（blob / tree / commit SHA）与提交图。当 `git` 已能回答时，imwel **不会**发明并行的内容哈希、版本号或 changelog 格式。

模板仓库是声明了 `.imwel/manifest.yaml` 的普通 Git 仓。消费者不通过自定义内容存储交互 — 一律经系统 `git` 执行 `fetch` / `clone`（沿用 SSH 密钥、凭据助手与 `.gitconfig`）。

## 绑定按目录，而非按仓库

本地绑定位于你执行 `imwel init` 的那个项目目录下的 `.imwel/binding.yaml`。绑定粒度不是「整个 Git 仓库」。

在 monorepo 中，需要在每个要消费模板的子项目目录分别执行 `imwel init`。没有特殊的 monorepo 模式。

## 本地 history 仓

已安装 Artifact 的状态记录在 `.imwel/history/` 下真实的隐藏 Git 仓库中，用于：

- 用普通 Git 语义做 diff 与 rollback
- 本地手改与上游更新冲突时做三路合并
- 冲突以标准标记（`<<<<<<<` / `=======` / `>>>>>>>`）呈现，由用户手工解决 — **从不**静默自动解决

`imwel rollback` 恢复到某个 history 提交，并删除该点之后新增的管理文件；从不删除未管理文件。

## 渲染流水线与适配器

1. 按 manifest 的 `conventions`（rules / skills / agents 路径）发现模板项目中的 Artifact。
2. 对每个选中的 AI 工具调用对应**适配器**：`render` 写出工具原生文件；`parseExisting` 读回以做漂移检测与 `push` / `propose`。
3. core 负责安全（哪些路径可写）与 Git 操作；适配器不得在 core 里做目标特判。

当前内置适配器包括 **Cursor**、**Claude Code**，以及另外十二个目标（`trae`、`qoder`、`codex`、`opencode`、`zcode`、`gemini-cli`、`windsurf`、`continue`、`cline`、`kiro`、`copilot`、`aider`）。落盘约定按族划分（frontmatter 规则目录、扁平规则目录、单 Markdown upsert-block、GitHub instructions）。技能走保真阶梯（原生 skills 目录 → 按需规则 → prompts → 并入常驻并警告）。多个已选工具对同一路径渲染出不同内容时，imwel 跳过该路径并要求选定主导目标。新增目标仍通过上游 PR 注册适配器 — 见 [适配器](../contribute/adapters.md)。

规则类 Artifact 的规范正文是 **agents.md 风 Markdown**。工具特有增强放在小型 `targetOverrides` 覆盖层，仅在该目标的 `render` 时展开。

## 漂移检查

漂移 / 更新检查是**节流**的，并与任何 AI 工具的会话生命周期解耦：

- CLI 调用时的被动检查（默认间隔 4 小时；可用 `IMWEL_FETCH_THROTTLE_MS` 覆盖）
- 显式 `imwel status` / `imwel sync`（始终强制刷新）

imwel 从不挂钩、拦截或阻塞 AI 编程工具自身的会话。没有后台守护进程。

## 上游治理

向上游推送默认走 **分支 + PR/MR**，而不是直接提交到共享跟踪分支。直推仅作为按远程显式 opt-in（`imwel remote add … --direct-push` / `imwel remote set …`）。

谁可以改模板仓由 Git 宿主的权限与分支保护决定 — 不是 imwel 内的 ACL 代码。

## 安全默认

- 未经显式用户动作（`init`、确认后的 `sync`、`propose`），不写未管理文件。
- 不静默覆盖本地手改 Artifact — 先检测漂移；再确认或合并。
- 除显式命令或节流被动检查外，不做网络 fetch / push。

## 下一步

- 上文用到的核心术语 → [术语词表](../concepts/glossary.md)
- Manifest 字段 → [Manifest 参考](./manifest.md)
- 完整 CLI 参考 → [命令](./commands.md)
- 仓库 [AGENTS.md](https://github.com/haoyisun/imwel/blob/main/AGENTS.md)（贡献者架构约束）
