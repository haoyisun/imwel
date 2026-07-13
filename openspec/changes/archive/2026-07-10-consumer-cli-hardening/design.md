## Context

MVP 消费侧已落地：`.imwel` 绑定、history 仓、sync 三路合并、push/propose、被动节流检查。已知缺口来自实现与规格的落差，而非新产品方向：

- `cli.ts` 仅在 `remote remove` 上有 `--yes`；`init`/`sync`/`push`/`propose` 仍依赖 `@clack/prompts`，CI 会挂起。
- `restoreToCommit` 对绑定路径做 `git checkout <commit> -- <paths>`，事后新增且仍在管理路径集合中的文件不会被删掉。
- `ensureRemoteCache` / `runPassiveCheckIfDue` 使用硬编码 `DEFAULT_THROTTLE_MS`（4h），未读 `IMWEL_FETCH_THROTTLE_MS`。
- `collectEditCandidates` 固定 `binding.tools[0]`，多工具绑定时丢失其他工具的本地编辑与 overrides。
- `propose` 只检查文件存在，不对照目标项目的 manifest conventions。

约束不变：Git 为数据库、shell 出系统 `git`、字符串走 locales、KISS/YAGNI、默认 branch+PR。

## Goals / Non-Goals

**Goals:**

- 消费侧关键命令可在无 TTY 下确定性完成（或确定性失败）。
- rollback 后，管理制品路径集合与所选 history 提交一致（含删除多余文件）。
- 全局 fetch 节流可通过环境变量覆盖。
- push 对全部绑定工具做反向渲染并合并 `targetOverrides`。
- propose 按 manifest 约定拒绝非法路径/类型。

**Non-Goals:**

- 模板作者体验、Slash Commands、`imwel lint` / `imwel new`（`template-author-experience`）。
- 每远程独立节流配置（config 字段 / `imwel remote set --throttle`）——仅文档/规格注明延期。
- 新的交互式「选 A 或 B」合并 UI；冲突仍用标准 Git 标记。
- 改变默认贡献路径（仍为 branch+PR）。
- 引入新的 prompt 库或 isomorphic-git。

## Decisions

### 1. 新增能力 `cli-noninteractive`，而非把 flags 散写进每个既有 capability

**选择：** 用独立 capability 描述「非交互契约」（`--yes`、必填 flags、缺参退出码），`project-binding` / `contribute-upstream` / `sync-engine` 只补充与各自领域相关的行为变更。

**理由：** 非交互是横切关注点；集中一处避免四个 delta 重复「缺参须失败」条文。既有 capability 仍描述领域语义（绑定什么、推什么、回滚什么）。

**备选：** 只改四个既有 specs、不加新 capability —— 可行但交叉引用与 CI 验收场景会重复。

### 2. `--yes` 只跳过确认，不发明答案

**选择：**

- `--yes`：跳过「是否继续 / 是否覆盖 / 是否创建 PR」类确认，视为用户已确认当前将发生的变更说明中的动作。
- 原先交互式**选择**（remote、branch、project、tools、optional artifacts、propose 的 type/remote 等）必须由显式 flags（或等价环境变量，若实现阶段证明有必要）提供；`--yes`  alone 不足以跑完 `init`/`propose`。
- 非交互且缺必填参数：以非零退出码失败，打印可操作错误（缺哪些 flag），不读 stdin。

**理由：** 与常见 CLI（`apt -y`、`gh`）一致；避免 `--yes` 静默选「第一个选项」造成危险默认。

**备选：** `--yes` 自动选默认项 —— 拒绝，因 init 的默认项不明确且易绑错项目。

### 3. init / propose 的最小 flag 面（KISS）

**选择：** 本变更只规定**必须能表达完整绑定/登记**的最小集合，具体 flag 名在实现时与 commander 对齐，规格用行为描述而非锁死每个长选项名（tasks 中列出建议名）：

- `init`：目标 tools、remote、branch、project、optional 制品选择（可「全部 optional / 全部不要 / 显式列表」）、以及已有绑定时的覆盖确认（`--yes`）。
- `sync`：应用更新确认（`--yes`）；冲突未解决时仍失败（非交互不能替用户消冲突）。
- `push`：候选全选或显式列表 + 确认（`--yes`）；PR 创建在非交互下默认只打印 compare URL，除非另有显式「创建 PR」flag（可选，YAGNI：若实现成本低可加，否则保持只打印 URL）。
- `propose`：remote、project、type、optional、源 tool + `--yes`（若有确认步）。

**理由：** 规格约束行为；flag 拼写留给 tasks/实现，避免规划阶段过度设计 CLI 表面。

### 4. Rollback：以 history 树为真源，删除「多出来的」管理文件

**选择：**

1. 从 binding 收集当前管理安装路径集合 `P`（与今日 `collectInstalledPaths` 同类）。
2. 对所选 history 提交，列出该提交中存在的、且落在 `P` 所覆盖的制品根/路径约定下的文件集合 `H`（实现可用 `git ls-tree` / checkout 到临时对比，保持 shell-out git）。
3. `checkout` 恢复 `H` 中的路径内容。
4. 删除工作区中属于「imwel 管理、且在当前 binding 安装路径语义下」但不在 `H` 中的文件（即恢复点之后 sync 新增、或本地仍登记但历史点没有的路径）。
5. 更新 `.imwel` 中与 history 相关的记录（如 `lastSyncedHistoryCommit`），与现行为一致并按需修正 binding 中已不存在的 artifact 条目（若历史点更旧导致制品集合缩小——实现时应使 binding 与恢复后磁盘一致；细节见 Risks）。

**理由：** 用户期望 rollback = 「回到那次安装长什么样」，不是「旧文件变回去、新文件留着」。

**备选：** 全目录 `git restore --source=commit .` 于 history 工作树再拷贝 —— 更重；当前 history 仓布局若已支持，可作为实现细节，对外语义不变。

### 5. `IMWEL_FETCH_THROTTLE_MS`：进程级覆盖默认值

**选择：** 在解析节流间隔时：`Number(process.env.IMWEL_FETCH_THROTTLE_MS)` 若为有限正数则用之，否则 `DEFAULT_THROTTLE_MS`（4h）。`sync`/`status` 的 `force` 刷新不受此值影响（仍每次 fetch）。非法值（非数字、≤0）回退默认并可选 warning（KISS：可静默回退，tasks 定一种）。

**延期：** 每远程 `throttleMs` 配置字段与 CLI —— 规格在 sync-engine 中用 ADDED 场景注明「全局 env 已支持；per-remote 仍不要求」。

**理由：** 满足测试/CI 缩短等待的需求，零配置文件改动。

### 6. Push 多工具：按工具 parse，合并 overrides，canonical 一致性检查

**选择：**

- 对每个 dirty artifact，遍历 `binding.tools` 中对该 artifact 有 `installedPaths` 的工具。
- 每个工具调用对应 adapter 的 `parseExisting`。
- `targetOverrides` 合并为 `{ [toolId]: overrides }`。
- **canonicalContent**：若多工具解析出的 canonical 正文不一致，非交互下失败；交互下报错并要求用户先对齐（不自动「选第一个」）。MVP 硬化优先正确性。

**理由：** 多工具绑定的权威内容应是同一份 agents.md 方言正文；分歧说明用户只改了一侧渲染产物。

**备选：** 仅以 `tools[0]` 的 canonical 为准、其余只收 overrides —— 保留今日 bug 的变体，拒绝。

### 7. Propose 校验：对照目标项目 effective conventions

**选择：** 在写入 pending proposal 之前：

- 解析目标 remote 的 manifest（可 force fetch 或使用缓存；与 push 前刷新策略对齐，非交互同样透明打印步骤）。
- 用 `resolveConventions` 得到项目的 `rulesDir` / `skillsDir` / `agentsFile` 等。
- 按用户选择的 `type` 检查：本地路径（或拟写入模板仓的相对 source 路径）是否落在约定目录/文件名规则内；越界或类型与路径不匹配则拒绝。
- 不在此步创建 Git 对象（保持 propose 只登记的语义）。

**理由：** 与 template-repository 的 conventions 单一真源一致，避免 push 时才发现路径非法。

## Risks / Trade-offs

- **[Risk] 非交互 flag 面膨胀** → Mitigation：最小必填集合；可选行为用后续变更扩展；不为此引入配置 DSL。
- **[Risk] Rollback 删除用户仍想保留的「新」文件** → Mitigation：删除前打印将删除的路径摘要；交互确认或 `--yes`；只删管理路径集合内文件，从不碰未管理文件。
- **[Risk] 多工具 canonical 冲突导致 push 变严** → Mitigation：明确错误信息指出哪些工具正文不一致；这是正确性修复而非回归。
- **[Risk] 缩短 `IMWEL_FETCH_THROTTLE_MS` 导致频繁 fetch** → Mitigation：文档说明；默认仍 4h；非法值回退默认。
- **[Risk] binding 与更旧 history 的 artifact 列表不一致** → Mitigation：rollback 后按恢复结果收敛 binding（去掉已不存在的 installed 条目或标记）；tasks 中单列验收。

## Migration Plan

- 纯行为增强与 bugfix；无数据迁移格式变更。
- 已有 `.imwel` / history 仓无需升级步骤。
- 依赖脚本的用户可逐步加 flags；不加则行为与今日交互模式相同。
- 文档（en + zh-CN）在实现同一变更中更新非交互用法与 env。

## Open Questions

- Push 非交互下是否需要 `--create-pr`：倾向本变更不做，仅打印 URL（与「无 hosting CLI 则只打印」一致）；若实现时 `gh` 调用已很容易，可作可选 flag，不阻塞规格。
- Rollback 是否允许通过 flag 指定 history SHA（跳过 select）：对 CI 有用，建议作为 `cli-noninteractive` 的 ADDED 场景纳入（`--to <sha>` 或等价）；若时间紧可交互仍 select、非交互必填 SHA。
