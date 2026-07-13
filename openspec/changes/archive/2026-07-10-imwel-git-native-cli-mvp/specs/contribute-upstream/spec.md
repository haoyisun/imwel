## ADDED Requirements

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

### Requirement: Reverse-rendering before contribution
Before committing a push, the CLI SHALL reverse-render each candidate (an edited managed artifact, or a proposed new one) into canonical `agents.md`-flavored content plus `targetOverrides`, using the relevant adapter's `parseExisting`.

#### Scenario: Reverse-rendering an edited Cursor rule
- **WHEN** a managed rule artifact rendered for Cursor has local edits and is included in a push
- **THEN** the CLI SHALL convert the edited `.mdc` file back into canonical Markdown plus Cursor `targetOverrides` before writing it into the template repository's project directory

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
