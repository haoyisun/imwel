## Purpose

Detect remote and local drift via Git, preview and apply updates with confirmation, resolve conflicts with three-way merge, support rollback through a local history repository, and run throttled passive checks without hooking AI tool sessions.

## Requirements

### Requirement: Local history repository
The first successful `imwel init` in a directory SHALL initialize a separate Git repository at `.imwel/history/` (independent of the host project's own `.git`), and every successful `imwel sync` SHALL commit the newly rendered files into it.

#### Scenario: History initialized on first init
- **WHEN** `imwel init` completes for the first time in a directory
- **THEN** `.imwel/history/` SHALL exist as an initialized Git repository containing the initially installed files as its first commit

### Requirement: Drift detection via Git comparison
Before rendering anything, `imwel sync`/`imwel status` SHALL fetch the bound remote and compare the last-synced commit SHA recorded in `.imwel` against the remote branch's current commit SHA, and SHALL separately compare the on-disk rendered files against what `.imwel/history/` last committed, to determine whether the remote has updated, the local files have been hand-edited, or both.

#### Scenario: Remote updated, no local edits
- **WHEN** the remote branch's current commit SHA differs from the recorded last-synced SHA, and on-disk files match the last history commit
- **THEN** the CLI SHALL report an available update without reporting any local-edit conflict

#### Scenario: Local edits, no remote update
- **WHEN** on-disk files no longer match the last history commit, and the remote branch's commit SHA is unchanged
- **THEN** the CLI SHALL report local drift without reporting a remote update

### Requirement: Diff preview before applying changes
`imwel sync` SHALL present a summary of added, removed, and modified artifact files (derived from `git diff` between the last-synced and current remote commit, scoped to the bound project's path) before writing any file, and SHALL require explicit user confirmation before applying it.

#### Scenario: Previewing an update
- **WHEN** `imwel sync` detects a remote update
- **THEN** the CLI SHALL display which artifact files were added, removed, or modified before prompting to confirm the sync

#### Scenario: Declining the update
- **WHEN** a user declines the confirmation prompt
- **THEN** the CLI SHALL leave all local files and the recorded last-synced SHA unchanged

### Requirement: Three-way merge on conflicting drift
When both the remote and the on-disk files have diverged from the last history commit, `imwel sync` SHALL perform a three-way merge using the last history commit as the merge base, automatically merging non-overlapping changes and writing standard conflict markers for overlapping changes.

#### Scenario: Non-overlapping changes merge automatically
- **WHEN** the remote update and the local edit touch different, non-overlapping parts of the same file
- **THEN** the CLI SHALL merge both changes automatically and record the result as the new local state without requiring manual resolution

#### Scenario: Overlapping changes require manual resolution
- **WHEN** the remote update and the local edit touch the same lines of a file
- **THEN** the CLI SHALL write standard conflict markers into that file and SHALL NOT mark the sync as complete until the user resolves them and confirms

### Requirement: Rollback
`imwel rollback` SHALL 让用户将制品文件恢复为 `.imwel/history/` 中先前记录的某一状态。恢复完成后，当前工作区中由 imwel 管理的制品文件集合 SHALL 与该历史提交中的对应集合一致：既有路径的内容被恢复，且在恢复点之后才出现、但仍属于当前管理安装路径语义下的文件 SHALL 被删除。CLI SHALL 在删除前向用户展示将删除的路径摘要，并要求确认（或在非交互模式下由 `--yes` 确认，见 `cli-noninteractive`）。未纳入 imwel 管理的文件 SHALL NOT 被删除。

#### Scenario: Rolling back after an unwanted sync
- **WHEN** 用户运行 `imwel rollback` 并选择一个先前记录的状态
- **THEN** CLI SHALL 将制品文件恢复为与该状态一致，并相应更新 `.imwel`

#### Scenario: Rollback removes files added after the restore point
- **WHEN** 用户回滚到某次 history 提交，且当前工作区存在该提交中不存在、但属于 imwel 管理安装路径的文件（例如之后一次 sync 新装的制品）
- **THEN** CLI SHALL 删除这些多余文件，使管理制品树与所选 history 提交一致

#### Scenario: Rollback does not delete unmanaged files
- **WHEN** 用户回滚且工作区存在从未由 imwel 管理的文件
- **THEN** CLI SHALL 保留这些未管理文件不变

### Requirement: Throttled passive drift check
在任意 `imwel` 子命令调用时，CLI SHALL 对每个 remote 至多按可配置间隔（默认 4 小时）执行一次轻量被动 fetch-and-compare 检查，并在检测到漂移时通知用户，且 SHALL NOT 阻塞或改变所调用子命令自身的行为。`imwel sync` 与 `imwel status` SHALL 始终执行新鲜检查，不受该节流约束。全局默认间隔 SHALL 可通过环境变量 `IMWEL_FETCH_THROTTLE_MS` 覆盖（值为正整数毫秒）；未设置或非法时 SHALL 使用默认 4 小时。每远程独立节流配置不在本需求范围内（延期）。

#### Scenario: Passive check skipped within throttle window
- **WHEN** 用户在某 remote 上次被动检查之后、未满所配置间隔内再次运行任意 `imwel` 子命令
- **THEN** CLI SHALL 跳过对该 remote 的被动检查

#### Scenario: Passive check does not block the invoked command
- **WHEN** 被动检查运行并检测到漂移
- **THEN** CLI SHALL 打印非阻塞提示，并仍执行原先调用的子命令

#### Scenario: Global throttle from IMWEL_FETCH_THROTTLE_MS
- **WHEN** 环境变量 `IMWEL_FETCH_THROTTLE_MS` 设为有效的正整数（例如 `60000`），且距该 remote 上次被动检查已超过该毫秒数但未超过默认 4 小时
- **THEN** CLI SHALL 按该环境变量的间隔允许再次执行被动 fetch 检查（而非仍等待 4 小时）

### Requirement: No AI-tool session hooks
The CLI SHALL NOT register itself into, intercept, or depend on the session lifecycle of any AI coding tool to trigger drift checks.

#### Scenario: No session hook installed
- **WHEN** imwel is installed and initialized in a project
- **THEN** no configuration is written that hooks into Cursor's, Claude Code's, or any other tool's own session/chat lifecycle
