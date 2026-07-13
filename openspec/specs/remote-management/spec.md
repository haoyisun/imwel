## Purpose

Manage aliased Git remotes in global config, maintain local cache clones, refresh them before content-dependent commands, and control per-remote direct-push opt-in.

## Requirements

### Requirement: Adding an aliased remote
The CLI SHALL let a user register a Git repository URL under a user-chosen alias via `imwel remote add <alias> <url>`, and SHALL reject an attempt to reuse an alias that already exists.

#### Scenario: Adding a new remote
- **WHEN** a user runs `imwel remote add org-standards git@github.com:acme/imwel-templates.git`
- **THEN** the CLI SHALL persist the alias-to-URL mapping in the global config and create a local cache clone under `~/.imwel/cache/org-standards/`

#### Scenario: Alias collision
- **WHEN** a user runs `imwel remote add` with an alias that already exists
- **THEN** the CLI SHALL reject the command and SHALL NOT overwrite the existing mapping

### Requirement: Listing configured remotes
`imwel remote list` SHALL display every configured alias together with its URL and default branch.

#### Scenario: Listing remotes
- **WHEN** a user runs `imwel remote list` after adding one or more remotes
- **THEN** the CLI SHALL print each alias, its URL, and its default branch

### Requirement: Removing a remote
`imwel remote remove <alias>` SHALL remove the alias's configuration entry and its local cache clone.

#### Scenario: Removing a remote
- **WHEN** a user runs `imwel remote remove org-standards`
- **THEN** the CLI SHALL delete the alias's entry from the global config and remove its local cache directory

#### Scenario: Removing a remote still used by local bindings
- **WHEN** a user removes a remote alias that at least one local `.imwel` binding still references
- **THEN** the CLI SHALL warn that the binding(s) will fail to sync until re-bound, and SHALL proceed only after confirmation

### Requirement: Local cache refresh
The CLI SHALL refresh a remote's local cache clone via a `git fetch` before any command that needs up-to-date remote content (`imwel init`, `imwel sync`, `imwel status`, `imwel push`), subject to the throttling behavior defined in the sync-engine capability.

#### Scenario: Cache refreshed before init
- **WHEN** a user runs `imwel init` and selects a remote
- **THEN** the CLI SHALL fetch that remote's cache before presenting its branches/projects

### Requirement: Per-remote direct-push opt-in
A remote SHALL default to requiring branch + PR/MR for contributions. A user MAY explicitly enable direct-push-to-bound-branch behavior for a specific remote via `imwel remote add --direct-push` or `imwel remote set <alias> --direct-push`.

#### Scenario: Default remote requires branch+PR
- **WHEN** a remote is added without the `--direct-push` flag
- **THEN** `imwel push` against that remote SHALL always create a branch and SHALL NOT commit directly to the bound branch

#### Scenario: Remote explicitly opted into direct push
- **WHEN** a remote was added with `--direct-push`
- **THEN** `imwel push` against that remote MAY commit directly to the bound branch without creating a separate branch
