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
  'template.init.skipExisting': 'Skipped existing file (not overwritten): {path}',

  'init.title': 'Bind this directory to a template project',
  'init.alreadyBound': 'This directory is already bound to remote "{remote}" / project "{project}".',
  'init.rebindConfirm': 'Rebind to a different remote, branch, or project?',
  'init.prompt.tools': 'Select target AI coding tools',
  'init.prompt.remote': 'Select remote',
  'init.prompt.branch': 'Select branch',
  'init.prompt.project': 'Select the writable project (at most one)',
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

  'modules.title': 'Manage installed modules',
  'modules.noBinding': 'No imwel binding in this directory. Run `imwel init` first.',
  'modules.none': 'This template branch declares no shared modules (role: shared).',
  'modules.prompt.select': 'Modules (space to toggle; installed are checked)',
  'modules.applied': 'Modules updated: +{added} / -{removed}.',
  'modules.noChange': 'No module changes.',
  'modules.fetching': 'Fetching remote "{alias}"...',
  'modules.syncHint': 'Run `imwel sync` to pull the latest content for installed modules.',

  'sync.title': 'Sync artifacts from remote',
  'sync.fetching': 'Fetching remote "{alias}"...',
  'sync.noBinding': 'No imwel binding in this directory. Run `imwel init` first.',
  'sync.upToDate': 'Already up to date.',
  'sync.plan.title': 'Planned changes:',
  'sync.plan.added': '  + {path}',
  'sync.plan.modified': '  ~ {path}',
  'sync.plan.removed': '  - {path}',
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
  'push.confirm': 'Push {count} artifact(s) upstream?',

  'propose.title': 'Register a new artifact for push',
  'propose.usage': 'Register local file as a new artifact candidate',
  'propose.prompt.remote': 'Target remote',
  'propose.prompt.project': 'Target project',
  'propose.prompt.type': 'Artifact type',
  'propose.prompt.optional': 'Treat as optional artifact?',
  'propose.prompt.tool': 'Source tool adapter for reverse-render',
  'propose.success': 'Registered {path} for next `imwel push`.',
  'propose.fileMissing': 'File not found: {path}',
  'propose.pathInvalid':
    'Path "{path}" does not match manifest conventions for type "{type}" (expected under/as "{expected}").',
  'propose.unknownType': 'Unknown artifact type: {type}. Use rule, skill, or agents.',
  'propose.unknownTool': 'Unknown tool id: {tool}',

  'passive.driftNotice': 'Drift detected — run `imwel status` or `imwel sync` for details.',

  'adopt.title': 'Consolidate existing tool rules into canonical artifacts',
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

  'adapter.pathConflict':
    'Render conflict for "{path}" from tools: {tools}. Contents differ; nothing was written for this path.',
  'adapter.pathConflict.hint':
    'Pick a single dominant target for that shared file (or align overrides), then re-run.',
  'adapter.pathConflict.sources':
    'Render conflict for "{path}" across sources: {sources}. Contents differ; nothing was written. A writable project should usually win over a read-only module — align them, then re-run.',
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
