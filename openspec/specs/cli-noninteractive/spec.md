## Purpose

Define the non-interactive contract for consumer-side CLI commands in CI/scripts: `--yes` to skip confirmations, explicit flags for selection inputs, fail-fast on missing required inputs, and conflict handling that never auto-resolves.

## Requirements

### Requirement: Non-interactive confirmation via --yes
对于会提示用户确认状态变更的消费侧命令（至少包括 `imwel init`、`imwel sync`、`imwel push`、`imwel propose`、`imwel rollback`），CLI SHALL 接受 `--yes`（及短选项 `-y`，若该命令已暴露短选项）以跳过确认提示，并视为用户已确认命令输出中描述的即将发生的变更。`--yes` SHALL NOT 自行填入原先交互式**选择**类提示的答案（例如选哪个 remote/project）。

#### Scenario: Sync applies update without confirmation prompt
- **WHEN** 用户以非交互方式运行 `imwel sync --yes` 且存在可应用的远程更新、且无未解决冲突
- **THEN** CLI SHALL 在打印将变更的文件摘要后直接应用更新，且 SHALL NOT 等待确认提示

#### Scenario: Yes alone does not invent init selections
- **WHEN** 用户仅运行 `imwel init --yes` 且未提供完成绑定所需的选择类参数
- **THEN** CLI SHALL 以非零退出码失败，并说明缺少哪些参数，且 SHALL NOT 挂起等待交互式选择

### Requirement: Flags supply interactive selections
当 stdin 不可用或用户以非交互方式调用需要选择类输入的命令时，CLI SHALL 通过显式命令行 flags（实现阶段确定具体旗标名）提供与引导式提示等价的全部必填输入。在非交互模式下缺少任一必填输入时，CLI SHALL 失败并打印可操作的错误信息，SHALL NOT 从 stdin 读取。

#### Scenario: Init succeeds with full flags
- **WHEN** 用户提供完成 `imwel init` 所需的全部非交互参数（目标工具、remote、branch、project，以及 optional 制品策略）并带 `--yes`（若目标目录已有绑定则用于确认覆盖）
- **THEN** CLI SHALL 完成绑定与安装且不打开交互式选择提示

#### Scenario: Propose fails when required flags missing
- **WHEN** 用户在非交互环境下运行 `imwel propose <file>` 但未提供目标 remote、project、type、optional 与源 tool 等必填参数
- **THEN** CLI SHALL 以非零退出码退出，并列出缺少的参数，且 SHALL NOT 登记候选

### Requirement: Non-interactive rollback target
`imwel rollback` 在非交互模式下 SHALL 要求通过 flag 指定要恢复的 history 提交（例如 SHA），SHALL NOT 打开交互式提交列表。未指定目标时 SHALL 失败。

#### Scenario: Rollback to explicit commit with --yes
- **WHEN** 用户运行带目标提交 flag 与 `--yes` 的 `imwel rollback`
- **THEN** CLI SHALL 恢复到该提交对应的管理制品状态（含删除多余文件，见 sync-engine），且 SHALL NOT 提示选择提交

#### Scenario: Non-interactive rollback without target fails
- **WHEN** 用户在非交互模式下运行 `imwel rollback --yes` 但未指定目标提交
- **THEN** CLI SHALL 以非零退出码失败并说明如何指定目标提交

### Requirement: Conflict blocks non-interactive sync
当 `imwel sync` 需要用户手动解决三路合并冲突时，非交互模式（含 `--yes`）SHALL NOT 自动消解冲突或跳过冲突文件；CLI SHALL 以非零退出码失败，并指示用户解决冲突后使用既有的 continue 流程。

#### Scenario: Sync --yes stops on unresolved conflicts
- **WHEN** 用户运行 `imwel sync --yes` 且三路合并产生未解决冲突
- **THEN** CLI SHALL 写入标准冲突标记（与交互模式相同），SHALL NOT 将 sync 标为完成，并以非零退出码退出
