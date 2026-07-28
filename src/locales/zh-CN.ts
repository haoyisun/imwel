import type { LocaleKey } from './en.js';

export const zhCN: Partial<Record<LocaleKey, string>> = {
  'app.name': 'imwel',
  'app.description': '用于分发 AI 编程规则与技能的 Git 原生 CLI',

  'common.yes': '是',
  'common.no': '否',
  'common.cancelled': '已取消。',
  'common.done': '完成。',
  'common.error': '错误：{message}',
  'common.notFound': '未找到：{name}',

  'cli.missingFlags':
    '非交互模式缺少必填参数：{flags}。请显式提供；--yes 仅跳过确认，不会自动选择。',
  'cli.nonInteractiveConfirmRequired': '非交互模式需要 --yes 以确认此变更。',

  'doctor.title': '检查 imwel 运行环境',
  'doctor.gitOk': '已找到 Git {version}',
  'doctor.gitMissing': 'PATH 中未找到 git — 请安装 Git 后重新运行 `imwel doctor`',
  'doctor.gitTooOld': 'Git {found} 低于要求的 {required}',
  'doctor.nodeOk': '已找到 Node.js {version}',
  'doctor.homeOk': '全局配置目录：{path}',
  'doctor.authorHint':
    '编写模板？在 Cursor 中打开模板仓并使用 /imwel-author；用 `imwel lint` 做验收。',
  'doctor.allOk': '所有检查已通过。',

  'lint.title': '正在检查 imwel 模板仓库',
  'lint.detecting': '正在检测仓库上下文...',
  'lint.checking': '正在检查模板：{root}...',
  'lint.clean': '未发现问题。',
  'lint.summary': '发现 {errors} 个错误、{warnings} 个警告。',
  'lint.strictFailed': '严格模式：警告也视为失败。',
  'lint.issue.error': '错误 [{code}]：{message}{loc}',
  'lint.issue.warning': '警告 [{code}]：{message}{loc}',
  'lint.wrongContext.neither':
    '未找到 imwel 模板仓库。请打开含 `.imwel/manifest.yaml` 的模板仓根目录，或运行 `imwel template init`。',
  'lint.wrongContext.consumer':
    '当前目录是消费侧绑定（{root}）。完整模板 lint 须在模板仓根运行 — 请克隆模板仓后在该目录执行 `imwel lint`。',
  'lint.wrongContext.ambiguous':
    '在 {root} 检测到歧义布局：同时存在 `manifest.yaml` 与 `binding.yaml`。请先修正布局（不要在模板仓根保留消费侧 binding）再 lint。',

  'remote.add.usage': '添加模板仓库远程源',
  'remote.add.success': '已添加远程 "{alias}" → {url}',
  'remote.add.exists': '远程别名已存在：{alias}',
  'remote.add.duplicateUrl':
    '该 URL 已注册在远程别名 "{alias}" 下：{url}。请直接使用该别名，或用 `imwel remote set {alias}` 调整其选项。',
  'remote.add.cloning': '正在克隆远程 "{alias}"...',
  'remote.add.derivedAlias': '使用本地别名“{alias}”（由 URL 推导；可用 --as 覆盖）。',
  'remote.add.needUrl':
    '请提供仓库 URL：`imwel remote add <url>`（自动推导别名）或 `imwel remote add <alias> <url>`。',
  'remote.list.title': '已配置的远程：',
  'remote.list.empty': '尚未配置远程。请运行 `imwel remote add`。',
  'remote.list.entry': '{alias}：{url}（分支：{branch}，directPush：{directPush}）',
  'remote.remove.confirm': '删除远程 "{alias}" 及其缓存？',
  'remote.remove.boundWarning':
    '警告：仍有 {count} 个本地绑定引用 "{alias}"，在重新绑定前将无法同步。',
  'remote.remove.success': '已删除远程 "{alias}"',
  'remote.set.success': '已更新远程 "{alias}"',
  'remote.prompt.alias': '远程别名',
  'remote.prompt.url': '仓库 URL',
  'remote.prompt.directPush': '允许直接推送到绑定分支？',

  'template.init.title': '初始化新的模板仓库',
  'template.init.prompt.dir': '目标目录',
  'template.init.prompt.name': '仓库名称',
  'template.init.prompt.locale': '脚手架内容语言',
  'template.init.prompt.git': '初始化 Git 仓库并创建首次提交？',
  'template.init.prompt.remote': '使用 {cli} 创建远程仓库？',
  'template.init.prompt.lintAutomation':
    '是否设置提交时自动 lint（提交进仓的 pre-commit hook + 运行 `imwel lint` 的 CI workflow）？',
  'template.init.lintAutomation.done':
    '已设置 lint 自动化：pre-commit hook 位于 .githooks/pre-commit{ci}，已本地激活 core.hooksPath。',
  'template.init.lintAutomation.doneNoCi':
    '已设置 lint 自动化：pre-commit hook 位于 .githooks/pre-commit（未检测到托管 CLI —— 跳过 CI workflow），已本地激活 core.hooksPath。',
  'template.init.lintAutomation.hookSkipped':
    '已存在 .githooks/pre-commit —— 未覆盖。',
  'template.init.lintAutomation.contributing': '已在 CONTRIBUTING.md 追加激活说明。',
  'template.init.success': '模板仓库已生成于 {path}',
  'template.init.exists': '目录非空：{path}',
  'template.fromProject.title': '正在基于本项目已有的 AI 工具制品生成模板仓...',
  'template.fromProject.excluded': '已排除 {count} 个非用户制品（imwel / 第三方工具）：',
  'template.fromProject.conflict':
    '“{slug}” 在多个工具间存在冲突：{tools}。内容不一致，已跳过——发布前请手动解决。',
  'template.fromProject.empty': '未发现可收割的用户制品，未生成任何内容。',
  'template.fromProject.success': '已生成含 {count} 个制品的模板骨架于 {path}。',
  'template.fromProject.nextSteps':
    '下一步：在 {path} 运行 `imwel lint` 校验，然后在 AI 工具中用 /imwel-create-template skill 拆分 project、指定 role、并生成 README/CONTRIBUTING。',
  'template.fromProject.lintAutomation.done':
    'lint 自动化文件已写入 {path}（pre-commit hook{ci}）。未本地激活 —— 在该目录运行 `git init` 后再运行 `git config core.hooksPath .githooks` 激活。',
  'template.fromProject.lintAutomation.doneNoCi':
    'lint 自动化文件已写入 {path}（pre-commit hook；未检测到托管 CLI —— 跳过 CI workflow）。在该目录运行 `git init` 后再运行 `git config core.hooksPath .githooks` 激活。',
  'template.init.skipExisting': '已跳过已存在文件（未覆盖）：{path}',

  'lint.hookActivation.hint':
    '本模板仓包含 .githooks/，但 core.hooksPath 未设置。运行 `git config core.hooksPath .githooks` 以激活提交时 lint。',
  'lintAutomation.contributingNote':
    '## 提交时 lint（可选）\n\n本仓包含一个运行 `imwel lint` 的 `.githooks/pre-commit` hook。克隆后请一次性激活：\n\n```bash\ngit config core.hooksPath .githooks\n```\n\nCI workflow 也会在 Pull Request 上运行 `imwel lint --strict`。',

  'init.title': '将当前目录绑定到模板项目',
  'init.alreadyBound': '此目录已绑定到远程 "{remote}" / 项目 "{project}"。',
  'init.rebindConfirm': '重新绑定到其他远程、分支或项目？',
  'init.prompt.tools': '选择目标 AI 编程工具',
  'init.prompt.remote': '选择远程',
  'init.prompt.branch': '选择分支',
  'init.prompt.project': '选择可写项目（至多一个）',
  'init.prompt.project.none': '（不绑定项目，仅安装模块）',
  'init.prompt.modules': '选择要安装的只读模块',
  'init.prompt.optional': '选择要安装的可选制品',
  'init.confirm': '执行 {count} 项计划文件写入并更新绑定？',
  'init.prompt.syncNow': '重新绑定后立即同步？',
  'init.success': '已初始化项目 "{project}"（分支 "{branch}"）的绑定。',
  'init.successModulesOnly': '已初始化绑定，模块 "{modules}"（分支 "{branch}"）。',
  'init.noRemotes': '尚未配置远程。请先运行 `imwel remote add`。',
  'init.autoRemote': '已自动选用唯一配置的远程：{alias}',
  'init.noTools': '未检测到或未选择支持的工具。',
  'init.noSelection': '请至少选择一个模块或一个可写项目进行安装。',
  'init.fetching': '正在获取远程 "{alias}"...',
  'init.unknownTools': '未知工具 id：{tools}。支持：{supported}。',
  'init.unknownRemote': '未找到远程：{alias}',
  'init.unknownBranch': '未找到分支：{branch}',
  'init.unknownProject': 'manifest 中未找到项目：{project}',
  'init.unknownModule': 'manifest 中未找到模块（或其 role 不是 shared）：{module}',
  'init.tooManyWritable': '至多只能绑定一个可写项目（role: project）。收到：{projects}。',
  'init.notWritable': '项目 "{project}" 是只读模块，不是可写项目。请用 --module。',
  'init.rebindRequiresYes': '目录已有 imwel 绑定。请加上 --yes 以覆盖。',

  'select.diff.title': '将应用的变更：',
  'select.diff.added': '  + {name}',
  'select.diff.removed': '  - {name}',
  'select.diff.none': '未选择任何变更。',
  'select.confirm': '应用这些变更？',
  'select.installed': '{name}（已安装）',

  'writeSafety.plan.title': '计划写入文件：',
  'writeSafety.plan.absent': '  + {path}（新文件）',
  'writeSafety.plan.managed-clean': '  ~ {path}（受管且本地未修改）',
  'writeSafety.plan.managed-dirty': '  ! {path}（受管但有本地修改；将覆盖）',
  'writeSafety.plan.unmanaged-identical': '  = {path}（非受管内容兼容；将接管）',
  'writeSafety.plan.unmanaged-different': '  ! {path}（非受管内容不同；将覆盖）',
  'writeSafety.confirm': '覆盖 {count} 个冲突文件：{paths}？',
  'writeSafety.action.apply': '确认执行',
  'writeSafety.action.back': '返回修改选择',
  'writeSafety.action.cancel': '取消',
  'writeSafety.nonInteractive':
    '未提供 --yes，拒绝覆盖冲突文件：{paths}。请检查计划，并仅在确认这些具体覆盖后加 --yes 重试。',

  'modules.title': '管理已安装的模块',
  'modules.noBinding': '当前目录无 imwel 绑定。请先运行 `imwel init`。',
  'modules.none': '此模板分支未声明任何只读模块（role: shared）。',
  'modules.prompt.select': '模块（空格切换；已安装项已勾选）',
  'modules.applied': '模块已更新：+{added} / -{removed}。',
  'modules.noChange': '没有模块变更。',
  'modules.fetching': '正在获取远程 "{alias}"...',
  'modules.syncHint': '运行 `imwel sync` 以拉取已安装模块的最新内容。',

  'tools.title': '管理绑定的 AI 编程工具',
  'tools.description': '无需重新绑定项目即可增加或移除 AI 编程工具',
  'tools.help.yes': '显式选择后跳过确认',
  'tools.help.add': '要增加的工具 id，逗号分隔',
  'tools.help.remove': '要移除的工具 id，逗号分隔',
  'tools.help.deleteOutput': '删除已移除工具不再被引用的受管输出',
  'tools.noBinding': '当前目录无 imwel 绑定。请先运行 `imwel init`。',
  'tools.prompt.select': '工具（空格切换；已安装项已勾选）',
  'tools.prompt.removedOutput': '如何处理已移除工具的输出？',
  'tools.prompt.keep': '保留文件并停止管理（默认）',
  'tools.prompt.delete': '仅删除不再受管的精确记录路径',
  'tools.flagsRequired': '请指定 --add <csv> 和/或 --remove <csv>；--yes 仅跳过确认。',
  'tools.unknown': '未知工具 id：{tools}。支持：{supported}。',
  'tools.overlap': '同一工具不能同时增加和移除：{tools}。',
  'tools.empty': '绑定中必须至少保留一个工具。未应用任何变更。',
  'tools.deleteNeedsRemove': '--delete-output 要求至少移除一个工具。',
  'tools.noChange': '没有工具变更。',
  'tools.fetching': '正在获取远程 "{alias}" 以规划工具输出...',
  'tools.remoteDrift':
    '远程分支自上次同步后已有变化。新增工具将使用当前远程内容；现有工具输出未被同步。',
  'tools.plan.title': '计划的工具变更：',
  'tools.plan.add': '  + 工具 {tool}',
  'tools.plan.remove': '  - 工具 {tool}',
  'tools.plan.keep': '  = 保留 {path}（转为非受管）',
  'tools.plan.delete': '  - 删除 {path}',
  'tools.plan.shared': '  = 保留 {path}（仍被剩余 binding 引用）',
  'tools.confirm':
    '应用工具 +{added}/-{removed}，保留 {kept} 个原输出，并删除 {deleted} 个输出（{paths}）？',
  'tools.none': '无',
  'tools.applied': '工具已更新：+{added} / -{removed}；保留 {kept} 个原输出，删除 {deleted} 个。',

  'sync.title': '从远程同步制品',
  'sync.fetching': '正在获取远程 "{alias}"...',
  'sync.noBinding': '当前目录无 imwel 绑定。请先运行 `imwel init`。',
  'sync.upToDate': '已是最新。',
  'sync.plan.title': '计划变更：',
  'sync.plan.added': '  + {path}',
  'sync.plan.modified': '  ~ {path}',
  'sync.plan.removed': '  - {path}',
  'sync.plan.restore': '  ↻ {path}（项目“{project}”缺失的受管文件；将恢复）',
  'sync.confirm': '将 {count} 项变更应用到本地文件？',
  'sync.conflicts':
    '以下文件存在冲突：{paths}。请解决冲突标记后运行 `imwel sync --continue`。',
  'sync.success': '同步完成，提交 {sha}。',
  'sync.continue': '正在完成冲突解决后的同步...',
  'sync.pendingNone': '没有待继续的同步。',
  'sync.moduleDrift.prompt':
    '只读模块 "{module}" 有本地修改（{paths}）。模块是只读的（pull-only）——请选择：',
  'sync.moduleDrift.discard': '丢弃本地修改，拉取上游',
  'sync.moduleDrift.freeze': '冻结模块（停止同步，保留本地副本）',
  'sync.moduleDrift.uninstall': '卸载模块（删除其文件）',
  'sync.moduleDrift.frozen': '已冻结模块 "{module}" —— 保留了你的本地副本。',
  'sync.moduleDrift.uninstalled': '已卸载模块 "{module}"。',
  'sync.moduleDrift.discarded': '已丢弃模块 "{module}" 的本地修改。',

  'status.title': 'imwel 状态',
  'status.noBinding': '当前目录无 imwel 绑定。',
  'status.remote': '远程：{remote} / {branch}',
  'status.project': '可写项目：{project}',
  'status.modules': '模块（只读）：{modules}',
  'status.moduleFrozen': '{name}（已冻结）',
  'status.tools': '工具：{tools}',
  'status.lastSynced': '上次同步提交：{sha}',
  'status.remoteUpdated': '远程有可用更新。',
  'status.localEdited': '检测到本地手工修改：{paths}',
  'status.clean': '未检测到漂移。',

  'binding.description': '纯本地查看绑定与贡献追踪，不访问网络',
  'binding.help.json': '输出稳定、带版本号的 JSON 视图',
  'binding.section.binding': '绑定（Binding）',
  'binding.section.contribution': '贡献追踪（Contribution tracking）',
  'binding.none': '  无。运行 `imwel init` 创建绑定。',
  'binding.noState': '本地没有绑定或贡献追踪。请先运行 `imwel init` 或 `imwel propose`。',
  'binding.remote': '  远程：{remote} / {branch}',
  'binding.linkedProject': '  关联项目：{project}',
  'binding.linkedProject.none': '  关联项目：无',
  'binding.modules': '  订阅模块：{modules}',
  'binding.modules.none': '  订阅模块：无',
  'binding.moduleFrozen': '{name}（已冻结）',
  'binding.tools': '  工具：{tools}',
  'binding.syncRemote': '  上次同步的远程提交：{sha}',
  'binding.syncHistory': '  上次同步的历史提交：{sha}',
  'binding.artifactCount': '  受管制品：{count}',
  'binding.projectGroup.linked': '{project}（关联）',
  'binding.projectGroup.subscribed': '{project}（已订阅）',
  'binding.projectGroup.subscribedFrozen': '{project}（已订阅，已冻结）',
  'binding.enum.type.rule': '规则',
  'binding.enum.type.skill': '技能',
  'binding.enum.type.agents': 'Agents',
  'binding.enum.requirement.required': '必选',
  'binding.enum.requirement.optional': '可选',
  'binding.enum.status.pending': '待推送',
  'binding.enum.status.pushed': '已推送',
  'binding.enum.role.project': '可写项目',
  'binding.enum.role.shared': '共享模块',
  'binding.enum.missing': '! 缺失',
  'binding.tree.project': '  {label}',
  'binding.tree.target': '  {target}',
  'binding.tree.type': '  {branch} {type}',
  'binding.tree.artifact':
    '  {indent}{branch} {path}（{type} · {requirement}）→ {tools}',
  'binding.contribution.none': '  无。',
  'binding.contribution.explanation': '  这些记录授权贡献，不代表已安装的绑定状态。',
  'binding.contributionCount': '  已追踪贡献：{count}',
  'binding.tree.contribution':
    '  {indent}{branch} {path}（{type} · {requirement}）→ {tool} · {status} · {role}',
  'binding.tree.contributionSource': '来源：{path}{missing}',
  'binding.tree.contributionPush': '最近推送：{branch} @ {commit}',
  'binding.tree.detail': '  {indent}{branch} {detail}',
  'binding.missingArtifacts.one': '有 1 个安装路径缺失——运行 `imwel sync` 恢复。',
  'binding.missingArtifacts.many': '有 {count} 个安装路径缺失——运行 `imwel sync` 恢复。',
  'binding.missingContributions.one':
    '有 1 个贡献来源缺失——请使用 `imwel propose` 管理其追踪。',
  'binding.missingContributions.many':
    '有 {count} 个贡献来源缺失——请使用 `imwel propose` 管理其追踪。',

  'health.title': '规则健康：',
  'health.clean': '  所有受管规则均健康。',
  'health.rule.empty': '  [空壳] {path} 无实质内容（空文件或仅占位）',
  'health.rule.deadImport': '  [死链导入] {path} 导入了不存在的路径：{ref}',
  'health.rule.orphanRef': '  [孤儿引用] {path} 引用了不存在的路径：{ref}',

  'rollback.title': '回滚到先前的安装状态',
  'rollback.noHistory': '未找到历史提交。',
  'rollback.prompt': '选择要恢复的历史提交',
  'rollback.success': '已恢复到提交 {sha}。',
  'rollback.delete.title': '以下管理文件不在该提交中，将被删除：',
  'rollback.delete.entry': '  - {path}',
  'rollback.delete.confirm': '删除 {count} 个管理文件以匹配恢复点？',
  'rollback.unknownCommit': '未找到历史提交：{sha}',

  'push.title': '将本地变更推送到上游',
  'push.noBinding': '当前目录无 imwel 绑定。',
  'push.noCandidates': '没有可推送的已编辑制品或待提议项。',
  'push.prompt.select': '选择要推送的制品',
  'push.prompt.message': '提交说明',
  'push.fetching': '正在获取最新上游状态...',
  'push.success': '已推送分支 "{branch}"。',
  'push.compareUrl': '打开比较链接：{url}',
  'push.prompt.pr': '使用 {cli} 创建 Pull Request？',
  'push.prCreated': 'Pull Request：{url}',
  'push.directPush': '已直接提交到 {branch}（已启用 directPush）。',
  'push.canonicalConflict':
    '制品 "{path}" 在多个工具间的规范正文不一致（{tools}）。请先对齐渲染文件后再重试。',
  'push.skipped.title': '在创建 Git 分支、提交或推送前已跳过以下输入：',
  'push.skipped.bindingMissing':
    '  - {source}：受管本地文件缺失（{paths}），本次不会推送。请运行 `imwel sync` 恢复。',
  'push.skipped.proposalMissing':
    '  - {source}：proposal 来源缺失（{paths}），追踪记录已保留。请补回文件后重试；待 contribution tracking 可用后也可取消该追踪。',
  'push.valid.title': '有效推送候选：',
  'push.valid.entry': '  + {path}',
  'push.confirm': '推送 {count} 个有效制品，并跳过 {skipped} 个缺失项？',
  'push.missing.prompt': '贡献追踪来源缺失。要移除这些追踪，还是取消 push 并补回文件？',
  'push.missing.remove': '移除缺失来源的追踪并继续',
  'push.missing.cancel': '取消 push，先补回文件',
  'push.missing.nonInteractive':
    '已跳过缺失的贡献来源并保留追踪。请补回后重试，或交互运行 `imwel propose` 取消追踪。',
  'push.moduleContribution': '已授权的模块贡献（必须显式选择）',

  'propose.title': '管理贡献追踪',
  'propose.usage': '将本地制品追踪到一个上游贡献目标',
  'propose.prompt.remote': '目标远程',
  'propose.prompt.project': '目标项目',
  'propose.prompt.type': '制品类型',
  'propose.prompt.optional': '作为可选制品？',
  'propose.prompt.tool': '用于反向渲染的源工具适配器',
  'propose.success': '已开始追踪 {path} 的贡献。',
  'propose.fileMissing': '文件不存在：{path}',
  'propose.pathInvalid':
    '路径 "{path}" 不符合类型 "{type}" 的 manifest 约定（期望位于/等于 "{expected}"）。',
  'propose.unknownType': '未知制品类型：{type}。请使用 rule、skill 或 agents。',
  'propose.unknownTool': '未知工具 id：{tool}',
  'propose.multiselect.needsInteractive':
    '交互式 `imwel propose`（不带文件）需要 TTY。请改为传文件路径并带选择类 flags。',
  'propose.multiselect.none': '你的工具里没有可提议的用户制品。',
  'propose.multiselect.none.actionable':
    '在工具的发现路径中未找到用户编写的制品（例如 Cursor 规则的 `.cursor/rules/*.mdc`）。请在受支持的发现路径下创建文件，或用 `imwel propose <path>` 直接提议指定文件。',
  'propose.multiselect.prompt': '选择要登记为 proposal 的制品（空格勾选/取消）',
  'propose.multiselect.excluded':
    '已排除：{provenance} 个非用户制品、{binding} 个可写项目受管制品、{target} 个已归属其它目标、{conflict} 个跨工具冲突。',
  'propose.multiselect.conflict':
    '无法追踪 {path}：多个工具的 canonical 内容冲突（{tools}）。',
  'propose.multiselect.tracked': '[已追踪]',
  'propose.multiselect.untracked': '[未追踪]',
  'propose.multiselect.summary': '将登记 {count} 个制品为 pending proposal：',
  'propose.multiselect.confirm': '确认登记为 pending proposal？（不执行任何 Git 操作）',
  'propose.multiselect.done': '贡献追踪已更新：+{added} / -{removed}。本地文件未改动。',

  'passive.driftNotice': '检测到漂移 — 运行 `imwel status` 或 `imwel sync` 查看详情。',

  'adopt.title': '将已 review 的草稿箱渲染进你的 AI 编码工具',
  'adopt.scanning': '正在扫描现有的工具原生规则与技能……',
  'adopt.noneFound': '未发现可归并的现有工具规则或技能。',
  'adopt.plan': '发现 {sources} 份来源文件 → {artifacts} 条 Artifact，{conflicts} 处冲突。',
  'adopt.conflict':
    '冲突：{type} "{slug}" 在多个工具间内容不一致（{tools}）。来源：{sources}。已跳过。',
  'adopt.conflict.hint':
    '请对齐这些冲突来源文件（或只保留其一），然后重新运行 `imwel adopt`。',
  'adopt.confirm': '将 {count} 条归并后的 Artifact 写入 {dir}？',
  'adopt.written': '  + {path}',
  'adopt.success': '已归并 {count} 条 Artifact 到 {dir}。',
  'adopt.nextSteps':
    '请先查看，再运行 `imwel template init` 发布为模板，或 `imwel init` + `imwel propose` 反馈到远端。',
  'adopt.allConflicts':
    '未写入任何内容 — 所有发现的规则在工具间均存在冲突。请解决冲突后重试。',
  'adopt.drafts.scanning': '正在收集 AI 草稿……',
  'adopt.drafts.none': '在 {dir} 未发现可采纳的草稿。',
  'adopt.drafts.plan': '发现 {artifacts} 份草稿 · {issues} 处健康问题。',
  'adopt.drafts.confirm': '将 {count} 份草稿采纳到 {dir}？',
  'adopt.drafts.confirmIssues':
    '将 {count} 份草稿采纳到 {dir}？上方发现 {issues} 处健康问题 —— 请先 review 再继续。',
  'adopt.drafts.confirmRender': '将 {count} 份草稿渲染进工具（{tools}）作为非受管文件？',
  'adopt.drafts.confirmRenderIssues':
    '将 {count} 份草稿渲染进工具（{tools}）？上方发现 {issues} 处健康问题 —— 请先 review 再继续。',
  'adopt.render.success': '已把 {count} 份草稿渲染进：{tools}（非受管，不被 sync 跟踪）。',
  'adopt.render.nextSteps':
    '规则已在你的工具中生效。要打包成模板仓请运行 `imwel template init --from-project`；要贡献到远程用 `imwel propose`。',
  'adopt.selectBox': '选择要采纳的草稿箱',
  'adopt.multipleBoxes':
    '发现多个草稿箱。请用 `imwel adopt --from .imwel/drafts/<box>` 指定其一。草稿箱：{boxes}',
  'adopt.needTools': '未解析到目标工具（无 --tools、无 binding、未检测到）。请传 `--tools <ids>`。',

  'scan.title': '生成项目指纹（确定性，无 LLM）',
  'scan.scanning': '正在扫描项目文件与配置……',
  'scan.summary':
    '语言：{languages} 种（最多 {topLang}）· 清单文件：{manifests} · 现有规则文件：{rules}',
  'scan.history.summary':
    'Git 历史：已分析 {commits} 个提交（{confidence}）· 热点：{hotspots} · 共变：{coChanges}',
  'scan.history.lowConfidence':
    '  （提交较少 — 历史信号置信度低，请当作线索而非结论）',
  'scan.history.none':
    'Git 历史：未检测到 — 仅使用文件树信号。运行 `git init` 并提交可获得更丰富的信号。',
  'scan.written': '指纹已写入 {path}',

  'skill.install.title': '安装 imwel 第一方 skill',
  'skill.install.none': '当前 imwel 安装未随包提供任何第一方 skill。',
  'skill.install.prompt.tools': '选择要安装 skill 的工具',
  'skill.install.binding.reuse': '使用当前 binding 中的工具（{tools}）？',
  'skill.install.binding.invalidTools':
    '当前 binding 包含不受支持的工具 id：{tools}。请改从受支持的工具中选择。',
  'skill.install.plan': '将安装 {skills} 个 skill → {files} 个文件到：{tools}',
  'skill.install.confirm': '写入这些第一方 skill 文件（非受管，不被 sync 跟踪）？',
  'skill.install.written': '  + {path}',
  'skill.install.success': '已安装 {count} 个第一方 skill。',
  'skill.install.nextSteps':
    '如尚未运行请先 `imwel scan`，然后在你的 AI 工具中调用 `imwel-extract` skill，将草稿起草到 `.imwel/drafts/`。',
  'commandPack.skillOnly': '这些工具没有 slash 命令机制——只安装了配套 skill：{tools}',

  'init.prompt.commandPack': '将 imwel 命令包（extract/audit/...）安装进：{tools}？',
  'init.commandPack.skipped': '已跳过命令包。稍后可用 `imwel skill install --tools <ids>` 安装。',
  'init.commandPack.failed':
    '命令包安装失败（{error}）。绑定仍然有效；稍后可用 `imwel skill install` 安装。',

  'provenance.reason.mine.marker': '由 imwel 安装（generatedBy: imwel）',
  'provenance.reason.mine.namespace': '由 imwel 安装（imwel-* 命名空间）',
  'provenance.reason.foreign.marker': '由其它工具安装（generatedBy 标记）',
  'provenance.reason.foreign.namespace': '由已知第三方工具安装',
  'provenance.reason.user': '你自己的项目制品',

  'adapter.pathConflict':
    '路径 "{path}" 的渲染结果冲突（工具：{tools}）。内容不一致，该路径未写入。',
  'adapter.pathConflict.hint':
    '请为该共享文件选定一个主导目标（或对齐 targetOverrides）后重试。',
  'adapter.pathConflict.sources':
    '路径 "{path}" 在以下 project 间渲染冲突：{sources}。内容不一致，该路径未写入。请检查这些 project 是否有意使用相同的制品名；如果不是，请重命名其中一个源文件后重试。{renameHint}',
  'adapter.pathConflict.renameHint':
    '建议：在 project "{project}" 中，将 "{from}" 重命名为 "{to}"。',
  'adapter.skill.r4Warning':
    '警告：该工具没有按需 skills 通道 — 技能已并入常驻说明（always-on）。',
  'adapter.codex.skillsHint':
    '已将 Codex skills 写入 .agents/skills/。请在 ~/.codex/config.toml 中设置 `[features] skills = true` 并重启 Codex。',

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

  'artifact.type.rule': '规则',
  'artifact.type.skill': '技能',
  'artifact.type.agents': 'Agents',
};
