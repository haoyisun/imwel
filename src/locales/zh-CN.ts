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
  'template.init.success': '模板仓库已生成于 {path}',
  'template.init.exists': '目录非空：{path}',
  'template.init.skipExisting': '已跳过已存在文件（未覆盖）：{path}',

  'init.title': '将当前目录绑定到模板项目',
  'init.alreadyBound': '此目录已绑定到远程 "{remote}" / 项目 "{project}"。',
  'init.rebindConfirm': '重新绑定到其他远程、分支或项目？',
  'init.prompt.tools': '选择目标 AI 编程工具',
  'init.prompt.remote': '选择远程',
  'init.prompt.branch': '选择分支',
  'init.prompt.project': '选择 manifest 项目',
  'init.prompt.optional': '选择要安装的可选制品',
  'init.prompt.syncNow': '重新绑定后立即同步？',
  'init.success': '已初始化项目 "{project}"（分支 "{branch}"）的绑定。',
  'init.noRemotes': '尚未配置远程。请先运行 `imwel remote add`。',
  'init.autoRemote': '已自动选用唯一配置的远程：{alias}',
  'init.noTools': '未检测到或未选择支持的工具。',
  'init.fetching': '正在获取远程 "{alias}"...',
  'init.unknownTools': '未知工具 id：{tools}。支持：{supported}。',
  'init.unknownRemote': '未找到远程：{alias}',
  'init.unknownBranch': '未找到分支：{branch}',
  'init.unknownProject': 'manifest 中未找到项目：{project}',
  'init.rebindRequiresYes': '目录已有 imwel 绑定。请加上 --yes 以覆盖。',

  'sync.title': '从远程同步制品',
  'sync.fetching': '正在获取远程 "{alias}"...',
  'sync.noBinding': '当前目录无 imwel 绑定。请先运行 `imwel init`。',
  'sync.upToDate': '已是最新。',
  'sync.plan.title': '计划变更：',
  'sync.plan.added': '  + {path}',
  'sync.plan.modified': '  ~ {path}',
  'sync.plan.removed': '  - {path}',
  'sync.confirm': '将 {count} 项变更应用到本地文件？',
  'sync.conflicts':
    '以下文件存在冲突：{paths}。请解决冲突标记后运行 `imwel sync --continue`。',
  'sync.success': '同步完成，提交 {sha}。',
  'sync.continue': '正在完成冲突解决后的同步...',
  'sync.pendingNone': '没有待继续的同步。',

  'status.title': 'imwel 状态',
  'status.noBinding': '当前目录无 imwel 绑定。',
  'status.remote': '远程：{remote} / {branch}',
  'status.project': '项目：{project}',
  'status.tools': '工具：{tools}',
  'status.lastSynced': '上次同步提交：{sha}',
  'status.remoteUpdated': '远程有可用更新。',
  'status.localEdited': '检测到本地手工修改：{paths}',
  'status.clean': '未检测到漂移。',

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
  'push.confirm': '将 {count} 个制品推送到上游？',

  'propose.title': '登记新制品以供推送',
  'propose.usage': '将本地文件登记为新制品候选',
  'propose.prompt.remote': '目标远程',
  'propose.prompt.project': '目标项目',
  'propose.prompt.type': '制品类型',
  'propose.prompt.optional': '作为可选制品？',
  'propose.prompt.tool': '用于反向渲染的源工具适配器',
  'propose.success': '已登记 {path}，下次运行 `imwel push` 时推送。',
  'propose.fileMissing': '文件不存在：{path}',
  'propose.pathInvalid':
    '路径 "{path}" 不符合类型 "{type}" 的 manifest 约定（期望位于/等于 "{expected}"）。',
  'propose.unknownType': '未知制品类型：{type}。请使用 rule、skill 或 agents。',
  'propose.unknownTool': '未知工具 id：{tool}',

  'passive.driftNotice': '检测到漂移 — 运行 `imwel status` 或 `imwel sync` 查看详情。',

  'adopt.title': '将现有工具规则归并为 canonical Artifact',
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
  'skill.install.plan': '将安装 {skills} 个 skill → {files} 个文件到：{tools}',
  'skill.install.confirm': '写入这些第一方 skill 文件（非受管，不被 sync 跟踪）？',
  'skill.install.written': '  + {path}',
  'skill.install.success': '已安装 {count} 个第一方 skill。',
  'skill.install.nextSteps':
    '如尚未运行请先 `imwel scan`，然后在你的 AI 工具中调用 `imwel-extract` skill，将草稿起草到 `.imwel/drafts/`。',

  'adapter.pathConflict':
    '路径 "{path}" 的渲染结果冲突（工具：{tools}）。内容不一致，该路径未写入。',
  'adapter.pathConflict.hint':
    '请为该共享文件选定一个主导目标（或对齐 targetOverrides）后重试。',
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
