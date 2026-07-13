## ADDED Requirements

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
`imwel rollback` SHALL let a user restore the artifact files to a previously recorded state in `.imwel/history/`.

#### Scenario: Rolling back after an unwanted sync
- **WHEN** a user runs `imwel rollback` and selects a prior recorded state
- **THEN** the CLI SHALL restore the artifact files to match that state and update `.imwel` accordingly

### Requirement: Throttled passive drift check
On any `imwel` subcommand invocation, the CLI SHALL perform a lightweight passive fetch-and-compare check at most once per a configurable interval (default 4 hours), tracked per remote, and SHALL notify the user of detected drift without blocking or altering the invoked subcommand's own behavior. `imwel sync` and `imwel status` SHALL always perform a fresh check regardless of this throttle.

#### Scenario: Passive check skipped within throttle window
- **WHEN** a user runs any `imwel` subcommand less than the configured interval after the last passive check for that remote
- **THEN** the CLI SHALL skip the passive check for that remote

#### Scenario: Passive check does not block the invoked command
- **WHEN** the passive check runs and detects drift
- **THEN** the CLI SHALL print a non-blocking notice and SHALL still execute the originally invoked subcommand

### Requirement: No AI-tool session hooks
The CLI SHALL NOT register itself into, intercept, or depend on the session lifecycle of any AI coding tool to trigger drift checks.

#### Scenario: No session hook installed
- **WHEN** imwel is installed and initialized in a project
- **THEN** no configuration is written that hooks into Cursor's, Claude Code's, or any other tool's own session/chat lifecycle
