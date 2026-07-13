## Purpose

Bind a local project directory to a remote template repository project via `.imwel`, through guided init and optional rebind, with per-directory (not per-repository) scope.

## Requirements

### Requirement: Per-directory initialization
`imwel init` SHALL operate on the current working directory only, creating a `.imwel` binding file scoped to that directory. Running it in a different directory of the same repository (e.g. another package in a monorepo) SHALL create an independent binding with no shared state beyond what is common to both via the remote/manifest.

#### Scenario: Binding a single package in a monorepo
- **WHEN** a user runs `imwel init` inside `apps/web` of a monorepo and separately inside `apps/api`
- **THEN** the CLI SHALL create two independent `.imwel` files, each bound to its own manifest project, with no monorepo-specific coordination between them

### Requirement: Guided init flow
`imwel init` SHALL guide the user through, in order: selecting one or more target AI coding tools, selecting a configured remote, selecting a branch on that remote, selecting a project declared in that branch's manifest, and selecting which optional artifacts (if any) to install.

#### Scenario: Completing the guided flow
- **WHEN** a user completes all prompts of `imwel init` with valid selections
- **THEN** the CLI SHALL install the resulting required and selected-optional artifacts, adapted for every selected tool, and SHALL write a `.imwel` file recording the full selection

#### Scenario: Re-running init on an already-bound directory
- **WHEN** a user runs `imwel init` in a directory that already has a `.imwel` file
- **THEN** the CLI SHALL report the existing binding and SHALL NOT overwrite it without explicit confirmation

### Requirement: Non-interactive init with explicit selections
当调用方通过命令行提供与引导式流程等价的全部选择（目标工具集合、remote、branch、manifest project、optional 制品策略），`imwel init` SHALL 在不打开交互式选择提示的情况下完成绑定与安装。若当前目录已存在 `.imwel` 绑定，CLI SHALL 仅在调用方显式确认覆盖（`--yes` 或等价确认 flag）后覆盖；否则 SHALL 拒绝覆盖并保持原绑定不变。非交互参数不完整时的失败语义见 `cli-noninteractive`。

#### Scenario: Init with full non-interactive selections
- **WHEN** 用户在未绑定目录运行带完整选择参数的 `imwel init`（无需再回答选择类提示）
- **THEN** CLI SHALL 安装所需与所选 optional 制品（适配每一个所选工具），并写入记录完整选择的 `.imwel` 文件

#### Scenario: Non-interactive re-init requires explicit overwrite confirmation
- **WHEN** 用户在已有 `.imwel` 的目录以非交互方式运行 `imwel init` 并提供完整选择参数，但未带覆盖确认
- **THEN** CLI SHALL 报告已有绑定，SHALL NOT 覆盖 `.imwel` 或重装制品，并以非零退出码退出

### Requirement: Local binding file content
The `.imwel` file SHALL record the remote alias, branch, manifest project name, the last-synced commit SHA, the set of selected target tools, and, per installed artifact, its source path, its installed (rendered) path(s), whether it is optional, and whether it currently has local edits.

#### Scenario: Binding file reflects installed artifacts
- **WHEN** `imwel init` finishes installing artifacts
- **THEN** the `.imwel` file SHALL list every installed artifact with its source path and installed path(s)

### Requirement: Changing an existing binding
A user SHALL be able to change the remote, branch, or project a directory is bound to via a rebind command, and the CLI SHALL offer to sync immediately after a rebind rather than syncing automatically.

#### Scenario: Rebinding to a different branch
- **WHEN** a user changes the bound branch for an already-initialized directory
- **THEN** the CLI SHALL update the `.imwel` file's branch field and SHALL prompt "sync now?" rather than syncing without asking
