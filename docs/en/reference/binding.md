# Binding reference

The consumer side of imwel is recorded in two local files under `.imwel/`:

- `binding.yaml` — what this directory has **installed and manages**
- `pending-proposals.yaml` — what this directory is **authorized to contribute upstream**

Both are maintained by imwel commands; you normally never hand-edit them. This page documents their shape so you can read them (and `imwel binding show` / `--json`) with confidence.

> For the **template** side, see [Manifest](./manifest.md).

## `.imwel/binding.yaml`

```yaml
remote: team                          # alias from `imwel remote add`
branch: main                          # tracked template branch
projects:                             # at most one writable (linked) + any number of read-only (subscribed)
  - name: app                         # manifest project name
    mode: linked                      # linked = writable; subscribed = read-only module
  - name: shared-lib
    mode: subscribed
    frozen: true                     # subscribed module: skip sync, keep local copy
tools:                               # AI tool ids receiving rendered Artifacts
  - cursor
  - claude-code
lastSyncedCommit: 1a2b3c4d            # remote commit recorded by last successful sync
lastSyncedHistoryCommit: 9e8f7a6b     # .imwel/history/ commit at last sync
artifacts:                           # managed Artifacts (one entry per canonical Artifact)
  - sourcePath: rules/app.md         # canonical path inside the template project
    project: app                     # which manifest project it comes from
    type: rule                       # rule | skill | agents
    optional: false                  # required vs optional at install time
    localEdit: false                # imwel detected a local hand-edit vs history
    installedPaths:                  # on-disk rendered outputs, per tool
      cursor:
        - .cursor/rules/app.mdc
      claude-code:
        - .claude/rules/app.md
    targetOverrides:                 # optional per-tool render overlay
      cursor:
        description: App coding rules
```

### Fields

| Field | Meaning |
|-------|---------|
| `remote` | Alias registered via `imwel remote add`. Never a raw URL. |
| `branch` | Template branch this binding tracks. |
| `projects[]` | Bound projects. `mode: linked` is the writable project (at most one); `mode: subscribed` is a read-only module. |
| `projects[].frozen` | Subscribed module only — when true, `sync` skips it and keeps your local copy. |
| `tools[]` | Tool ids receiving rendered Artifacts (e.g. `cursor`, `claude-code`, `codex`, `trae`). |
| `lastSyncedCommit` | Remote commit SHA recorded by the last successful `sync` — used for drift comparison. |
| `lastSyncedHistoryCommit` | `.imwel/history/` commit at last sync — used for rollback. |
| `artifacts[]` | One entry per managed canonical Artifact. |
| `artifacts[].sourcePath` | Canonical path inside the template project (POSIX, project-relative). |
| `artifacts[].project` | Manifest project this artifact originates from. |
| `artifacts[].type` | `rule`, `skill`, or `agents`. |
| `artifacts[].optional` | Whether it was an optional Artifact at install time. |
| `artifacts[].localEdit` | True when the on-disk rendered file diverges from `.imwel/history/`. |
| `artifacts[].installedPaths` | Rendered outputs per tool id. `sync`/`status`/`push` key off these. |
| `artifacts[].targetOverrides` | Optional per-tool overlay expanded at render time. |

### Legacy shape

Older bindings used a single `project: <name>` string instead of `projects[]`. imwel normalizes it on read into `projects: [{ name, mode: 'linked' }]`, so legacy bindings keep working without migration.

## `.imwel/pending-proposals.yaml`

Contribution tracking — the local sources this directory may push upstream. Separate from the binding; removing a record never deletes or edits the local Artifact.

```yaml
version: 2
proposals:
  - localPath: .cursor/rules/arkts-hooks.mdc   # tool-native source file
    sourceFiles: [.cursor/rules/arkts-hooks.mdc]
    sourceId: cursor:arkts-hooks                # adapter discovery slug
    remote: team                                # target remote alias
    project: app                                # target manifest project
    targetRole: project                         # project | shared
    type: rule
    canonicalPath: rules/arkts-hooks.md         # derived target path in template
    optional: false
    tool: cursor                                # source tool adapter for reverse-render
    baseBranch: main                            # baseline branch (added when tracking confirmed)
    baseCommit: 1a2b3c4d                        # baseline commit for remote-update comparison
    pushed:                                     # present after a successful push
      branch: update-arkts-hooks
      commit: 5f6e7d8c
```

### Fields

| Field | Meaning |
|-------|---------|
| `version` | Schema version (currently `2`). |
| `proposals[].localPath` | Tool-native source file being tracked. |
| `proposals[].sourceFiles` | All source files contributing to this artifact. |
| `proposals[].sourceId` | Adapter discovery slug; distinguishes multiple logical artifacts in one shared file. |
| `proposals[].remote` / `project` | Single target remote + manifest project. |
| `proposals[].targetRole` | `project` (writable) or `shared` (read-only module). |
| `proposals[].type` | `rule`, `skill`, or `agents`. |
| `proposals[].canonicalPath` | Derived target path inside the template project. |
| `proposals[].optional` | Whether the target artifact is optional. |
| `proposals[].tool` | Source tool adapter used to convert tool-native files back to canonical form (reverse-render). |
| `proposals[].baseBranch` / `baseCommit` | Baseline recorded when tracking is confirmed; `status` compares the target branch against it. |
| `proposals[].pushed` | After a successful `push`: the Git branch and commit SHA. |

### Lifecycle

- **Project tracking** remains after push, then `sync` removes it once the same canonical Artifact is installed into the project binding.
- **Module tracking** is persistent across push and sync until you deselect it in `imwel propose`.

## Related

- [Commands — binding show / propose / push](./commands.md)
- [Manifest (template side)](./manifest.md)
- [Sync and drift](../how-to/sync-and-drift.md) · [Push via PR](../how-to/push-via-pr.md)
