export const en = {
  'app.name': 'imwel',
  'app.description': 'Git-native CLI for AI coding rules and skills',

  'common.yes': 'Yes',
  'common.no': 'No',
  'common.cancelled': 'Cancelled.',
  'common.done': 'Done.',
  'common.error': 'Error: {message}',
  'common.notFound': 'Not found: {name}',

  'cli.missingFlags':
    'Missing required flag(s) for non-interactive mode: {flags}. Provide them explicitly; --yes only skips confirmations.',
  'cli.nonInteractiveConfirmRequired':
    'Non-interactive mode requires --yes to confirm this change.',

  'doctor.title': 'Checking imwel prerequisites',
  'doctor.gitOk': 'Git {version} found',
  'doctor.gitMissing': 'No git binary found on PATH — install Git and re-run `imwel doctor`',
  'doctor.gitTooOld': 'Git {found} is older than required {required}',
  'doctor.nodeOk': 'Node.js {version} found',
  'doctor.homeOk': 'Global config directory: {path}',
  'doctor.authorHint':
    'Authoring templates? Open the template repo in Cursor and use /imwel-author; validate with `imwel lint`.',
  'doctor.allOk': 'All checks passed.',

  'lint.title': 'Linting imwel template repository',
  'lint.detecting': 'Detecting repository context...',
  'lint.checking': 'Checking template at {root}...',
  'lint.clean': 'No issues found.',
  'lint.summary': 'Found {errors} error(s) and {warnings} warning(s).',
  'lint.strictFailed': 'Strict mode: warnings are treated as failures.',
  'lint.issue.error': 'error [{code}]: {message}{loc}',
  'lint.issue.warning': 'warning [{code}]: {message}{loc}',
  'lint.wrongContext.neither':
    'No imwel template repository found. Open a template repo root (with `.imwel/manifest.yaml`) or run `imwel template init`.',
  'lint.wrongContext.consumer':
    'This directory is a consumer binding ({root}). Full template lint must run in the template repository root — clone the template repo and run `imwel lint` there.',
  'lint.wrongContext.ambiguous':
    'Ambiguous imwel layout at {root}: both `manifest.yaml` and `binding.yaml` are present. Fix the layout before linting (do not keep a consumer binding in a template root).',

  'remote.add.usage': 'Add a template repository remote',
  'remote.add.success': 'Added remote "{alias}" → {url}',
  'remote.add.exists': 'Remote alias already exists: {alias}',
  'remote.add.duplicateUrl':
    'This URL is already registered under remote alias "{alias}": {url}. Use that alias, or `imwel remote set {alias}` to change its options.',
  'remote.add.cloning': 'Cloning remote "{alias}"...',
  'remote.add.derivedAlias': 'Using local alias "{alias}" (derived from the URL; override with --as).',
  'remote.add.needUrl':
    'Provide a repository URL: `imwel remote add <url>` (alias derived) or `imwel remote add <alias> <url>`.',
  'remote.list.title': 'Configured remotes:',
  'remote.list.empty': 'No remotes configured. Run `imwel remote add`.',
  'remote.list.entry': '{alias}: {url} (branch: {branch}, directPush: {directPush})',
  'remote.remove.confirm': 'Remove remote "{alias}" and its cache?',
  'remote.remove.boundWarning':
    'Warning: {count} local binding(s) still reference "{alias}". They will fail to sync until re-bound.',
  'remote.remove.success': 'Removed remote "{alias}"',
  'remote.set.success': 'Updated remote "{alias}"',
  'remote.prompt.alias': 'Remote alias',
  'remote.prompt.url': 'Repository URL',
  'remote.prompt.directPush': 'Enable direct push to bound branch?',

  'template.init.title': 'Initialize a new template repository',
  'template.init.prompt.dir': 'Target directory',
  'template.init.prompt.name': 'Repository name',
  'template.init.prompt.locale': 'Scaffold content locale',
  'template.init.prompt.git': 'Initialize git repository and create initial commit?',
  'template.init.prompt.remote': 'Create remote repository with {cli}?',
  'template.init.success': 'Template repository scaffolded at {path}',
  'template.init.exists': 'Directory is not empty: {path}',
  'template.fromProject.title': 'Generating a template repository from this project\'s existing tool artifacts...',
  'template.fromProject.excluded': 'Excluded {count} non-user artifact(s) (imwel / third-party tooling):',
  'template.fromProject.conflict':
    'Cross-tool conflict for "{slug}" across tools: {tools}. Contents differ; skipped — resolve by hand before publishing.',
  'template.fromProject.empty':
    'No user-owned tool artifacts found to harvest. Nothing was generated.',
  'template.fromProject.success':
    'Generated a template skeleton with {count} artifact(s) at {path}.',
  'template.fromProject.nextSteps':
    'Next: run `imwel lint` in {path} to validate, then use the /imwel-create-template skill in your AI tool to split projects, assign roles, and write README/CONTRIBUTING.',
  'template.init.skipExisting': 'Skipped existing file (not overwritten): {path}',

  'init.title': 'Bind this directory to a template project',
  'init.alreadyBound': 'This directory is already bound to remote "{remote}" / project "{project}".',
  'init.rebindConfirm': 'Rebind to a different remote, branch, or project?',
  'init.prompt.tools': 'Select target AI coding tools',
  'init.prompt.remote': 'Select remote',
  'init.prompt.branch': 'Select branch',
  'init.prompt.project': 'Select the writable project (at most one)',
  'init.prompt.project.none': '(skip — modules only)',
  'init.prompt.modules': 'Select read-only modules to install',
  'init.prompt.optional': 'Select optional artifacts to install',
  'init.prompt.syncNow': 'Sync now after rebind?',
  'init.success': 'Initialized binding for project "{project}" on branch "{branch}".',
  'init.successModulesOnly': 'Initialized binding with module(s) "{modules}" on branch "{branch}".',
  'init.noRemotes': 'No remotes configured. Run `imwel remote add` first.',
  'init.autoRemote': 'Using the only configured remote: {alias}',
  'init.noTools': 'No supported tools detected or selected.',
  'init.noSelection': 'Select at least one module or a writable project to install.',
  'init.fetching': 'Fetching remote "{alias}"...',
  'init.unknownTools': 'Unknown tool id(s): {tools}. Supported: {supported}.',
  'init.unknownRemote': 'Remote not found: {alias}',
  'init.unknownBranch': 'Branch not found: {branch}',
  'init.unknownProject': 'Project not found in manifest: {project}',
  'init.unknownModule': 'Module not found in manifest (or not role: shared): {module}',
  'init.tooManyWritable':
    'At most one writable project (role: project) can be bound. Got: {projects}.',
  'init.notWritable': 'Project "{project}" is a shared module, not a writable project. Use --module.',
  'init.rebindRequiresYes':
    'Directory already has an imwel binding. Re-run with --yes to overwrite.',

  'select.diff.title': 'Changes to apply:',
  'select.diff.added': '  + {name}',
  'select.diff.removed': '  - {name}',
  'select.diff.none': 'No changes selected.',
  'select.confirm': 'Apply these changes?',
  'select.installed': '{name} (installed)',

  'writeSafety.plan.title': 'Planned file writes:',
  'writeSafety.plan.absent': '  + {path} (new file)',
  'writeSafety.plan.managed-clean': '  ~ {path} (managed, unchanged locally)',
  'writeSafety.plan.managed-dirty': '  ! {path} (managed with local edits; will overwrite)',
  'writeSafety.plan.unmanaged-identical': '  = {path} (unmanaged content is compatible; will adopt)',
  'writeSafety.plan.unmanaged-different': '  ! {path} (unmanaged content differs; will overwrite)',
  'writeSafety.confirm': 'Overwrite {count} conflicting file(s): {paths}?',
  'writeSafety.nonInteractive':
    'Refusing to overwrite conflicting file(s) without --yes: {paths}. Review the plan and re-run with --yes to authorize these exact overwrites.',

  'modules.title': 'Manage installed modules',
  'modules.noBinding': 'No imwel binding in this directory. Run `imwel init` first.',
  'modules.none': 'This template branch declares no shared modules (role: shared).',
  'modules.prompt.select': 'Modules (space to toggle; installed are checked)',
  'modules.applied': 'Modules updated: +{added} / -{removed}.',
  'modules.noChange': 'No module changes.',
  'modules.fetching': 'Fetching remote "{alias}"...',
  'modules.syncHint': 'Run `imwel sync` to pull the latest content for installed modules.',

  'tools.title': 'Manage bound AI coding tools',
  'tools.description': 'Add or remove AI coding tools without rebinding the project',
  'tools.help.yes': 'Skip confirmations after explicit selections',
  'tools.help.add': 'Comma-separated tool ids to add',
  'tools.help.remove': 'Comma-separated tool ids to remove',
  'tools.help.deleteOutput': 'Delete unreferenced managed outputs for removed tools',
  'tools.noBinding': 'No imwel binding in this directory. Run `imwel init` first.',
  'tools.prompt.select': 'Tools (space to toggle; installed are checked)',
  'tools.prompt.removedOutput': 'What should happen to outputs from removed tools?',
  'tools.prompt.keep': 'Keep files and stop managing them (default)',
  'tools.prompt.delete': 'Delete exact recorded paths that are no longer managed',
  'tools.flagsRequired':
    'Specify --add <csv> and/or --remove <csv>; --yes only skips confirmations.',
  'tools.unknown': 'Unknown tool id(s): {tools}. Supported: {supported}.',
  'tools.overlap': 'A tool cannot be both added and removed: {tools}.',
  'tools.empty': 'At least one tool must remain bound. No changes were applied.',
  'tools.deleteNeedsRemove': '--delete-output requires at least one tool to be removed.',
  'tools.noChange': 'No tool changes.',
  'tools.fetching': 'Fetching remote "{alias}" before planning tool outputs...',
  'tools.remoteDrift':
    'The remote branch has changed since the last sync. New tool outputs use current remote content; existing tool outputs were not synced.',
  'tools.plan.title': 'Planned tool changes:',
  'tools.plan.add': '  + tool {tool}',
  'tools.plan.remove': '  - tool {tool}',
  'tools.plan.keep': '  = keep {path} (becomes unmanaged)',
  'tools.plan.delete': '  - delete {path}',
  'tools.plan.shared': '  = keep {path} (still referenced by the remaining binding)',
  'tools.confirm':
    'Apply +{added}/-{removed} tools, keep {kept} former output(s), and delete {deleted} output(s) ({paths})?',
  'tools.none': 'none',
  'tools.applied':
    'Tools updated: +{added} / -{removed}; kept {kept} former output(s), deleted {deleted}.',

  'sync.title': 'Sync artifacts from remote',
  'sync.fetching': 'Fetching remote "{alias}"...',
  'sync.noBinding': 'No imwel binding in this directory. Run `imwel init` first.',
  'sync.upToDate': 'Already up to date.',
  'sync.plan.title': 'Planned changes:',
  'sync.plan.added': '  + {path}',
  'sync.plan.modified': '  ~ {path}',
  'sync.plan.removed': '  - {path}',
  'sync.plan.restore': '  ↻ {path} (missing managed file from project "{project}"; will restore)',
  'sync.confirm': 'Apply {count} change(s) to local files?',
  'sync.conflicts': 'Conflicts detected in: {paths}. Resolve markers and run `imwel sync --continue`.',
  'sync.success': 'Sync complete at commit {sha}.',
  'sync.continue': 'Finalizing sync after conflict resolution...',
  'sync.pendingNone': 'No pending sync to continue.',
  'sync.moduleDrift.prompt':
    'Read-only module "{module}" has local edits ({paths}). Modules are pull-only — choose:',
  'sync.moduleDrift.discard': 'Discard local edits and take upstream',
  'sync.moduleDrift.freeze': 'Freeze module (stop syncing, keep local copy)',
  'sync.moduleDrift.uninstall': 'Uninstall module (remove its files)',
  'sync.moduleDrift.frozen': 'Froze module "{module}" — kept your local copy.',
  'sync.moduleDrift.uninstalled': 'Uninstalled module "{module}".',
  'sync.moduleDrift.discarded': 'Discarded local edits for module "{module}".',

  'status.title': 'imwel status',
  'status.noBinding': 'No imwel binding in this directory.',
  'status.remote': 'Remote: {remote} / {branch}',
  'status.project': 'Writable project: {project}',
  'status.modules': 'Modules (read-only): {modules}',
  'status.moduleFrozen': '{name} (frozen)',
  'status.tools': 'Tools: {tools}',
  'status.lastSynced': 'Last synced commit: {sha}',
  'status.remoteUpdated': 'Remote has updates available.',
  'status.localEdited': 'Local hand-edits detected: {paths}',
  'status.clean': 'No drift detected.',

  'binding.description': 'Inspect local binding and contribution tracking without network access',
  'binding.help.details': 'Show managed artifacts and tracked contribution paths',
  'binding.help.json': 'Output the stable versioned JSON view',
  'binding.section.binding': 'Binding',
  'binding.section.contribution': 'Contribution tracking',
  'binding.none': '  None. Run `imwel init` to create a binding.',
  'binding.noState':
    'No local binding or contribution tracking exists. Run `imwel init` or `imwel propose` first.',
  'binding.remote': '  Remote: {remote} / {branch}',
  'binding.linkedProject': '  Linked project: {project}',
  'binding.linkedProject.none': '  Linked project: none',
  'binding.modules': '  Subscribed modules: {modules}',
  'binding.modules.none': '  Subscribed modules: none',
  'binding.moduleFrozen': '{name} (frozen)',
  'binding.tools': '  Tools: {tools}',
  'binding.syncRemote': '  Last synced remote commit: {sha}',
  'binding.syncHistory': '  Last synced history commit: {sha}',
  'binding.artifactCount': '  Managed artifacts: {count}',
  'binding.artifact':
    '  - {path} [{type}, {requirement}] — {role} project "{project}"',
  'binding.installedPath': '      {tool}: {path} [{status}]',
  'binding.syncHint': '  Missing managed paths are read-only here. Run `imwel sync` to restore them.',
  'binding.contribution.none': '  None.',
  'binding.contribution.explanation':
    '  These records authorize contributions; they are not installed binding state.',
  'binding.contributionCount': '  Tracked contributions: {count}',
  'binding.contribution':
    '  - {path} [{type}, {requirement}, {status}] → {remote}/{project} ({role})',
  'binding.contributionTool': '      Source tool: {tool}',
  'binding.contributionSource': '      Source: {path} [{status}]',
  'binding.contributionPush': '      Latest push: {branch} @ {commit}',
  'binding.proposeHint':
    '  Missing contribution sources are read-only here. Manage their tracking with `imwel propose`.',

  'health.title': 'Rule health:',
  'health.clean': '  All managed rules look healthy.',
  'health.rule.empty': '  [empty] {path} has no meaningful content (empty or placeholder-only)',
  'health.rule.deadImport': '  [dead-import] {path} imports missing path: {ref}',
  'health.rule.orphanRef': '  [orphan-ref] {path} references missing path: {ref}',

  'rollback.title': 'Rollback to a prior installed state',
  'rollback.noHistory': 'No history commits found.',
  'rollback.prompt': 'Select a history commit to restore',
  'rollback.success': 'Restored to commit {sha}.',
  'rollback.delete.title': 'The following managed files are not in that commit and will be deleted:',
  'rollback.delete.entry': '  - {path}',
  'rollback.delete.confirm': 'Delete {count} managed file(s) to match the restore point?',
  'rollback.unknownCommit': 'History commit not found: {sha}',

  'push.title': 'Push local changes upstream',
  'push.noBinding': 'No imwel binding in this directory.',
  'push.noCandidates': 'No edited artifacts or pending proposals to push.',
  'push.prompt.select': 'Select artifacts to push',
  'push.prompt.message': 'Commit message',
  'push.fetching': 'Fetching latest upstream state...',
  'push.success': 'Pushed branch "{branch}".',
  'push.compareUrl': 'Open compare URL: {url}',
  'push.prompt.pr': 'Create pull request with {cli}?',
  'push.prCreated': 'Pull request: {url}',
  'push.directPush': 'Committed directly to {branch} (directPush enabled).',
  'push.canonicalConflict':
    'Canonical content differs across tools for "{path}" ({tools}). Align the rendered files, then retry.',
  'push.skipped.title': 'Inputs skipped before any Git branch, commit, or push:',
  'push.skipped.bindingMissing':
    '  - {source}: managed local file missing ({paths}); it will not be pushed. Run `imwel sync` to restore it.',
  'push.skipped.proposalMissing':
    '  - {source}: proposal source missing ({paths}); tracking is retained. Restore the file and retry, or cancel its tracking when contribution tracking is available.',
  'push.valid.title': 'Valid push candidates:',
  'push.valid.entry': '  + {path}',
  'push.confirm': 'Push {count} valid artifact(s) upstream and skip {skipped} missing item(s)?',
  'push.missing.prompt':
    'Tracked contribution sources are missing. Remove their tracking, or cancel push and restore the files?',
  'push.missing.remove': 'Remove tracking for the missing sources and continue',
  'push.missing.cancel': 'Cancel push so I can restore the files',
  'push.missing.nonInteractive':
    'Missing contribution sources were skipped and tracking was retained. Restore them and retry, or run interactive `imwel propose` to cancel tracking.',
  'push.moduleContribution': 'tracked module contribution (explicit selection required)',

  'propose.title': 'Manage contribution tracking',
  'propose.usage': 'Track local artifacts for contribution to one upstream target',
  'propose.prompt.remote': 'Target remote',
  'propose.prompt.project': 'Target project',
  'propose.prompt.type': 'Artifact type',
  'propose.prompt.optional': 'Treat as optional artifact?',
  'propose.prompt.tool': 'Source tool adapter for reverse-render',
  'propose.success': 'Now tracking {path} for contribution.',
  'propose.fileMissing': 'File not found: {path}',
  'propose.pathInvalid':
    'Path "{path}" does not match manifest conventions for type "{type}" (expected under/as "{expected}").',
  'propose.unknownType': 'Unknown artifact type: {type}. Use rule, skill, or agents.',
  'propose.unknownTool': 'Unknown tool id: {tool}',
  'propose.multiselect.needsInteractive':
    'Interactive `imwel propose` (no file) needs a TTY. Pass a file path with the selection flags instead.',
  'propose.multiselect.none': 'No user-owned artifacts found in your tools to propose.',
  'propose.multiselect.prompt': 'Select artifacts to register as proposals (space to toggle)',
  'propose.multiselect.excluded':
    'Excluded: {provenance} non-user, {binding} linked-project managed, {target} assigned elsewhere, {conflict} cross-tool conflict(s).',
  'propose.multiselect.conflict':
    'Cannot track {path}: canonical content conflicts across tools ({tools}).',
  'propose.multiselect.tracked': '[tracked]',
  'propose.multiselect.untracked': '[untracked]',
  'propose.multiselect.summary': 'Will register {count} artifact(s) as pending proposals:',
  'propose.multiselect.confirm': 'Register these as pending proposals? (no Git actions)',
  'propose.multiselect.done':
    'Contribution tracking updated: +{added} / -{removed}. Local files were not changed.',

  'passive.driftNotice': 'Drift detected — run `imwel status` or `imwel sync` for details.',

  'adopt.title': 'Render a reviewed draft box into your AI coding tools',
  'adopt.scanning': 'Scanning for existing tool-native rules and skills...',
  'adopt.noneFound': 'No existing tool rules or skills found to consolidate.',
  'adopt.plan':
    'Found {sources} source file(s) → {artifacts} artifact(s), {conflicts} conflict(s).',
  'adopt.conflict':
    'Conflict: {type} "{slug}" differs across tools ({tools}). Sources: {sources}. Skipped.',
  'adopt.conflict.hint':
    'Align the conflicting source files (or drop all but one), then re-run `imwel adopt`.',
  'adopt.confirm': 'Write {count} consolidated artifact(s) to {dir}?',
  'adopt.written': '  + {path}',
  'adopt.success': 'Consolidated {count} artifact(s) into {dir}.',
  'adopt.nextSteps':
    'Review them, then run `imwel template init` to publish as a template, or `imwel init` + `imwel propose` to feed a remote.',
  'adopt.allConflicts':
    'Nothing written — all discovered rules conflict across tools. Resolve conflicts and re-run.',
  'adopt.drafts.scanning': 'Collecting AI drafts...',
  'adopt.drafts.none': 'No adoptable drafts found in {dir}.',
  'adopt.drafts.plan': 'Found {artifacts} draft(s) · {issues} health issue(s).',
  'adopt.drafts.confirm': 'Adopt {count} draft(s) into {dir}?',
  'adopt.drafts.confirmIssues':
    'Adopt {count} draft(s) into {dir}? {issues} health issue(s) found above — review before continuing.',
  'adopt.drafts.confirmRender':
    'Render {count} draft(s) into tools ({tools}) as unmanaged files?',
  'adopt.drafts.confirmRenderIssues':
    'Render {count} draft(s) into tools ({tools})? {issues} health issue(s) found above — review before continuing.',
  'adopt.render.success': 'Rendered {count} draft(s) into: {tools} (unmanaged, not tracked by sync).',
  'adopt.render.nextSteps':
    'The rules are now active in your tools. To publish them as a template repo, run `imwel template init --from-project`; to contribute to a remote, use `imwel propose`.',
  'adopt.selectBox': 'Select a draft box to adopt',
  'adopt.multipleBoxes':
    'Multiple draft boxes found. Specify one with `imwel adopt --from .imwel/drafts/<box>`. Boxes: {boxes}',
  'adopt.needTools':
    'No target tools resolved (no --tools, no binding, none detected). Pass `--tools <ids>`.',

  'scan.title': 'Fingerprint the project (deterministic, no LLM)',
  'scan.scanning': 'Scanning project files and configuration...',
  'scan.summary':
    'Languages: {languages} (top {topLang}) · manifests: {manifests} · existing rule files: {rules}',
  'scan.history.summary':
    'Git history: {commits} commit(s) analyzed ({confidence}) · hotspots: {hotspots} · co-changes: {coChanges}',
  'scan.history.lowConfidence':
    '  (few commits — history signals are low-confidence; treat them as hints, not facts)',
  'scan.history.none':
    'Git history: not detected — file-tree signals only. Run `git init` and commit for richer signals.',
  'scan.written': 'Fingerprint written to {path}',

  'skill.install.title': 'Install imwel first-party skills',
  'skill.install.none': 'No first-party skills are bundled with this imwel installation.',
  'skill.install.prompt.tools': 'Select tools to install the skill(s) into',
  'skill.install.plan': 'Installing {skills} skill(s) → {files} file(s) into: {tools}',
  'skill.install.confirm': 'Write these first-party skill files (unmanaged, not tracked by sync)?',
  'skill.install.written': '  + {path}',
  'skill.install.success': 'Installed {count} first-party skill(s).',
  'skill.install.nextSteps':
    'Run `imwel scan` first if you have not, then invoke the `imwel-extract` skill in your AI tool to draft rules into `.imwel/drafts/`.',
  'commandPack.skillOnly':
    'These tools have no slash-command mechanism — installed the backing skill only: {tools}',

  'init.prompt.commandPack': 'Install the imwel command pack (extract/audit/...) into: {tools}?',
  'init.commandPack.skipped':
    'Skipped the command pack. Install it later with `imwel skill install --tools <ids>`.',
  'init.commandPack.failed':
    'Command pack install failed ({error}). The binding is still valid; install later with `imwel skill install`.',

  'provenance.reason.mine.marker': 'installed by imwel (generatedBy: imwel)',
  'provenance.reason.mine.namespace': 'installed by imwel (imwel-* namespace)',
  'provenance.reason.foreign.marker': 'installed by another tool (generatedBy marker)',
  'provenance.reason.foreign.namespace': 'installed by a known third-party tool',
  'provenance.reason.user': 'your own project artifact',

  'adapter.pathConflict':
    'Render conflict for "{path}" from tools: {tools}. Contents differ; nothing was written for this path.',
  'adapter.pathConflict.hint':
    'Pick a single dominant target for that shared file (or align overrides), then re-run.',
  'adapter.pathConflict.sources':
    'Render conflict for "{path}" across projects: {sources}. Contents differ; nothing was written for this path. Check whether these projects intentionally reuse the same artifact name; if not, rename one of the source files, then re-run.',
  'adapter.skill.r4Warning':
    'Warning: this tool has no on-demand skills channel — the skill was merged as always-on instructions.',
  'adapter.codex.skillsHint':
    'Codex skills were written under .agents/skills/. Enable them in ~/.codex/config.toml with `[features] skills = true`, then restart Codex.',

  'tool.cursor': 'Cursor',
  'tool.claude-code': 'Claude Code',
  'tool.trae': 'Trae',
  'tool.qoder': 'Qoder',
  'tool.codex': 'Codex',
  'tool.opencode': 'OpenCode',
  'tool.zcode': 'ZCode',
  'tool.gemini-cli': 'Gemini CLI',
  'tool.windsurf': 'Windsurf',
  'tool.continue': 'Continue',
  'tool.cline': 'Cline',
  'tool.kiro': 'Kiro',
  'tool.copilot': 'GitHub Copilot',
  'tool.aider': 'Aider',

  'artifact.type.rule': 'Rule',
  'artifact.type.skill': 'Skill',
  'artifact.type.agents': 'Agents',
} as const;

export type LocaleKey = keyof typeof en;
