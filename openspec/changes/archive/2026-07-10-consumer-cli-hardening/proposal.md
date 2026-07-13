## Why

MVP 消费侧 CLI 已能完成 init/sync/push/propose/rollback，但若干已知缺口阻碍 CI/自动化与正确性：确认提示无法跳过、rollback 只 checkout 旧路径而留下事后新增文件、全局 fetch 节流环境变量未接线、push 反向渲染只读 `tools[0]`、propose 不校验 manifest 约定路径。现在补齐这些，才能让消费侧在自动化场景下可用，并避免多工具绑定与回滚语义上的静默错误。

## What Changes

- 为 `init` / `sync` / `push` / `propose`（及同类需确认的消费侧命令）增加非交互模式：`--yes` 跳过确认，并用配套 flags/环境变量提供原先交互提示所需的全部输入；缺参时失败并给出可操作错误，而非挂起等待 stdin。
- 修正 `imwel rollback`：恢复到历史点后，**删除**该恢复点之后才出现在工作区、且属于 imwel 管理路径集合中的文件（不仅 `git checkout` 旧路径）。
- 接线全局环境变量 `IMWEL_FETCH_THROTTLE_MS`，覆盖被动检查与缓存 fetch 的默认节流间隔（默认仍为 4 小时）；**每远程独立节流配置仍延期**，本变更不实现。
- 修正 `imwel push` 多工具往返：对绑定中的**每一个**目标工具分别 `parseExisting` 并合并 `targetOverrides`，不再仅使用 `binding.tools[0]`。
- `imwel propose` 在登记候选前，按目标远程 manifest 的 conventions/paths 校验本地文件路径与类型是否合法；不合法则拒绝登记并说明原因。
- **不包含**模板作者 / Slash Command 工作（属 `template-author-experience`）。

## Capabilities

### New Capabilities
- `cli-noninteractive`：消费侧命令在 CI/脚本下的非交互契约——`--yes`、必填 flags、缺参失败语义，以及与现有交互提示的关系。

### Modified Capabilities
- `sync-engine`：rollback 须使工作区与所选历史提交在管理制品路径上完全一致（含删除事后新增文件）；被动/缓存 fetch 节流须尊重 `IMWEL_FETCH_THROTTLE_MS`。
- `contribute-upstream`：push 反向渲染覆盖全部绑定工具；propose 须按 manifest conventions 校验路径后再登记。
- `project-binding`：`imwel init` 在提供完整非交互参数时可跳过引导式提示并完成绑定（与 `cli-noninteractive` 配合）。

## Impact

- **CLI 入口**（`src/cli.ts` 与各 `src/commands/*`）：新增/贯通 `--yes` 与 init/propose 等 flags；用户可见字符串走 `src/locales/`。
- **核心逻辑**：`src/core/history.ts`（rollback 删除多余文件）、`src/core/push.ts`（多工具 parse）、`src/core/passive-check.ts` / `remote-cache.ts`（读 `IMWEL_FETCH_THROTTLE_MS`）、`src/commands/propose.ts` / manifest 校验。
- **不改**：Git=DB、无后端、默认 branch+PR、不引入 isomorphic-git；不实现每远程节流配置 UI/字段；不改模板作者体验。
- **文档**：英文 + zh-CN 同步补充非交互 flags、环境变量与 rollback/push 行为说明（实现阶段按文档义务清单更新）。
