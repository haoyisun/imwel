## ADDED Requirements

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
