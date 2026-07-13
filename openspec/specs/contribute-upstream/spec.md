## Purpose

Detect local edits and new artifact candidates, reverse-render them to canonical form, and contribute them upstream via branch + PR/MR by default (with optional direct-push on opted-in remotes).

## Requirements

### Requirement: Detecting locally-edited managed artifacts as push candidates
`imwel push` SHALL detect every currently-managed Artifact whose on-disk rendered files differ from the last-synced state and SHALL present them as candidates for contribution.

#### Scenario: Selecting edited artifacts to push
- **WHEN** a user runs `imwel push` and two managed artifacts have local edits
- **THEN** the CLI SHALL list both as selectable candidates and SHALL only act on the ones the user selects

### Requirement: Proposing a new, not-yet-managed artifact
`imwel propose <file>` SHALL let a user register a local file that is not currently managed by imwel as a candidate new Artifact, capturing its target remote, project, type, and whether it should be required or optional, without performing any Git operation itself.

#### Scenario: Registering a new artifact candidate
- **WHEN** a user runs `imwel propose .cursor/rules/graphql-conventions.mdc` and completes the prompts
- **THEN** the CLI SHALL record the candidate locally and SHALL NOT create a branch, commit, or push until `imwel push` is run

### Requirement: Propose validates against manifest conventions
在将候选写入本地 pending 登记之前，`imwel propose` SHALL 读取目标 remote 的 manifest，解析目标 project 的 effective conventions（`rulesDir`、`skillsDir`、`agentsFile` 等），并校验所给本地文件路径与所选制品类型是否符合该约定。校验失败时 CLI SHALL 拒绝登记，打印说明违反了哪条约定，且 SHALL NOT 写入 pending proposal。校验通过后的行为仍与既有「只登记、不执行 Git」语义一致。

#### Scenario: Propose rejects path outside conventions
- **WHEN** 用户对目标 project 运行 `imwel propose`，所选 type 为 rule，但文件路径不在该 project effective `rulesDir` 约定之下
- **THEN** CLI SHALL 拒绝登记并说明路径不符合 manifest conventions，且本地 pending proposals 不变

#### Scenario: Propose accepts path matching conventions
- **WHEN** 用户提出的文件路径与所选 type 匹配目标 project 的 effective conventions，并完成其余必填输入
- **THEN** CLI SHALL 登记该候选且 SHALL NOT 创建 branch、commit 或 push

### Requirement: Reverse-rendering before contribution
在提交 push 之前，CLI SHALL 使用相关 adapter 的 `parseExisting`，将每个候选（已编辑的托管制品，或 propose 的新制品）反向渲染为规范的 `agents.md` 风格内容以及 `targetOverrides`。对于已绑定多个目标工具的托管制品，CLI SHALL 对**每一个**在该制品上有安装路径的绑定工具分别调用对应 adapter 的 `parseExisting`，并将各工具的 `targetOverrides` 合并进候选；SHALL NOT 仅使用 `binding.tools` 中的第一个工具。若多个工具解析出的 canonical 正文不一致，CLI SHALL 失败并报告不一致，SHALL NOT 静默选用其中一份正文。

#### Scenario: Reverse-rendering an edited Cursor rule
- **WHEN** 为 Cursor 渲染的托管 rule 制品存在本地编辑且被纳入 push
- **THEN** CLI SHALL 在写入模板仓库项目目录之前，将编辑后的 `.mdc` 转回规范 Markdown 以及 Cursor 的 `targetOverrides`

#### Scenario: Reverse-rendering covers all bound tools
- **WHEN** 某托管制品同时为 Cursor 与另一绑定工具安装了渲染文件，且至少一侧有本地编辑并被纳入 push
- **THEN** CLI SHALL 对两个工具都执行 `parseExisting`，并在写入模板仓前保留两者的 `targetOverrides`

#### Scenario: Conflicting canonical content across tools fails the push
- **WHEN** 同一制品在两个绑定工具上的渲染文件经 `parseExisting` 得到的 canonical 正文不同
- **THEN** CLI SHALL 以非零退出码失败并说明冲突，且 SHALL NOT 推送该候选

### Requirement: Branch-and-PR is the default contribution path
`imwel push` SHALL fetch the latest state of the bound branch, create a new branch from it, commit the reverse-rendered changes, and push that branch, unless the remote has `directPush` explicitly enabled.

#### Scenario: Default push creates a branch
- **WHEN** `imwel push` runs against a remote without `directPush` enabled
- **THEN** the CLI SHALL create and push a new branch and SHALL NOT commit directly to the bound branch

#### Scenario: Direct push on an opted-in remote
- **WHEN** `imwel push` runs against a remote with `directPush` enabled
- **THEN** the CLI MAY commit directly to the bound branch

### Requirement: PR/MR creation assistance
After pushing a branch, the CLI SHALL print the Git host's compare/PR-creation URL, and, if `gh` or `glab` is detected and authenticated, SHALL offer to create the PR/MR directly.

#### Scenario: No hosting CLI available
- **WHEN** neither `gh` nor `glab` is available or authenticated
- **THEN** the CLI SHALL print the compare URL and SHALL NOT fail the push

#### Scenario: Hosting CLI available
- **WHEN** `gh` is available and authenticated
- **THEN** the CLI SHALL offer to run the PR-creation command on the user's behalf, proceeding only after confirmation

### Requirement: Push rebases onto the latest upstream state before committing
If the bound branch has advanced since the candidate's last-synced state, `imwel push` SHALL reconcile the candidate's change against the latest upstream state using the same three-way merge mechanism as `imwel sync`, before creating the outgoing branch.

#### Scenario: Upstream advanced with no overlapping change
- **WHEN** the upstream project directory changed in a way that does not overlap the pushed candidate's change
- **THEN** the CLI SHALL rebase the candidate onto the latest state automatically before pushing

#### Scenario: Upstream advanced with an overlapping change
- **WHEN** the upstream change overlaps the pushed candidate's change
- **THEN** the CLI SHALL surface standard conflict markers and SHALL NOT push until the user resolves them and confirms
