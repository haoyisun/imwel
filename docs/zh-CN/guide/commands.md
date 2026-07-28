# 命令

下列命令均为当前 CLI 已实现能力。全局选项：`--lang <locale>`（`en`、`zh-CN`）。

## 总览

| 命令 | 用途 |
|------|------|
| `imwel doctor` | 检查 Git 与运行环境 |
| `imwel lint` | 检查**模板**仓库 |
| `imwel remote add/list/remove/set` | 管理模板远程源 |
| `imwel template init` | 脚手架生成新模板仓库 |
| `imwel adopt` | 将项目中散落的工具规则归并为 canonical Artifact |
| `imwel init` | 将当前目录绑定到模板 project |
| `imwel tools` | 无需换绑即可增加或移除 AI 编程工具 |
| `imwel sync` | 拉取上游 Artifact 更新 |
| `imwel status` | 报告远程与本地漂移 |
| `imwel binding show` | 离线查看本地绑定与贡献追踪 |
| `imwel rollback` | 恢复到先前的安装状态 |
| `imwel push` | 将本地编辑推送到上游（默认分支 + PR） |
| `imwel propose <file>` | 登记新 Artifact 供下次 push |

## `imwel doctor`

检查系统 `git` 是否在 `PATH` 上以及其他环境前提。新机器建议先跑。

## `imwel lint`

校验**模板**仓库（期望 `.imwel/manifest.yaml`，而非消费侧 binding）。

| 选项 | 说明 |
|------|------|
| `--strict` | warning 与 error 一并失败 |
| `--no-auto-activate-hooks` | 检测到 `.githooks/` 且 `core.hooksPath` 未设时不自动激活（改为打印提示） |

- **Errors** — 装坏类（无效 manifest、项目 path 缺失、skill 缺 `SKILL.md`、路径逃逸等）。
- **Warnings** — 风格 / 最佳实践（skill `description` 质量、**空壳/占位规则**等）。

> 模板侧 lint 只检测**空壳/占位**规则；孤儿引用、死链 import 在此跳过——模板规则引用的是**消费项目**的文件（模板仓中不存在），这两类检查在消费侧 `imwel status` 运行。

在消费侧 binding 目录中，CLI 会引导你到模板仓，而不是假装检查通过。见 [Lint 与质量条](../author/lint.md)。

## `imwel remote`

| 子命令 | 说明 |
|--------|------|
| `add <url>` | 注册模板远程；本地别名由 URL 推导 |
| `add <alias> <url>` | 以显式别名注册模板远程（向后兼容） |
| `list` | 列出远程 |
| `remove <alias>` | 移除远程（`-y` / `--yes` 跳过确认） |
| `set <alias>` | 更新远程选项 |

| 选项 | 说明 |
|------|------|
| `--as <alias>`（`add`） | 覆盖由 URL 推导的别名（单 URL 形式） |
| `--direct-push`（`add`） | 允许直推绑定分支（opt-in；非默认） |
| `--direct-push [value]`（`set`） | 启用或关闭直推 |

仅传 URL 时，imwel 会以仓库名推导别名（冲突时回退为 `owner-repo`，再退化为数字后缀），并打印所选别名。

`add` 会拒绝一个（归一化去除末尾 `.git`/斜杠、host 大小写不敏感后）与某已存在远程 URL 相同、但使用不同别名的注册请求 —— 并提示该已存在的别名，而不是注册第二份映射。它还会在克隆/拉取以创建本地缓存期间显示 spinner，避免命令看起来像卡死。

默认上游路径仍是 **分支 + PR/MR**。

## `imwel template init`

脚手架生成新模板仓库（manifest、示例 project、作者向 `AGENTS.md`、Cursor Slash Commands / skills）。

| 选项 | 说明 |
|------|------|
| `--dir <path>` | 目标目录（`--from-project` 时为输出目录） |
| `--locale <locale>` | 脚手架语言（`en`、`zh-CN` 等） |
| `--name <name>` | 仓库名（默认取目录名；仅当你选择创建远程仓时才交互询问） |
| `--from-project` | 基于当前项目已有的 AI 工具制品生成模板仓（见下） |
| `--topic <slug>` | 生成目录名的主题 slug（配合 `--from-project`） |
| `-y` / `--yes` | 跳过确认（非交互默认） |

交互式下（在可选的 git 初始化之后），`imwel template init` 会提供在新仓中脚手架**提交时 lint 自动化** —— **默认开启**（选择不启用则跳过）：一个提交进仓、运行 `imwel lint` 的 `.githooks/pre-commit` hook、一个 CI workflow（检测到 `gh` 写 `.github/workflows/imwel-lint.yml`，检测到 `glab` 写 `.gitlab-ci.yml`）、本地 `core.hooksPath` 激活，以及 `CONTRIBUTING.md` 激活说明。随后还可选生成一个最小 `package.json`，其 `prepare` 脚本会在贡献者 `npm install` 后自动激活 hook（零依赖）。接受默认即全部写入；选择不启用则脚手架保持原样。见 [Lint 与质量条 → 提交时 lint 自动化](../author/lint.md#提交时-lint-自动化可选)。

### `imwel template init --from-project`

从一个**已经积累了 AI 编码规则**（散落在各工具目录，或刚 extract+adopt 完）的项目冷启动出模板仓。它跨所有适配器收割你**自己**的制品，生成一个结构合法的模板骨架到唯一目录（默认 `.imwel/generated-templates/<主题>-<时间戳>/`，或用 `--dir`），多次运行互不覆盖。

- 借**制品来源识别**只收割 `USER` 制品——**排除** imwel 自己的命令包（`imwel-*` / `generatedBy: imwel`）和其它工具装的制品（如 openspec），并打印哪些被排除、为什么。
- 跨工具内容冲突会被报告并跳过（发布前请手动解决）。
- 骨架含 `.imwel/manifest.yaml`（一个 `project`）、收割到的 `rules/`/`skills/`/`agents.md`，以及脚手架作者命令（`/imwel-author`、`/imwel-lint`）。
- 确定性 CLI 只做到骨架；**语义**组织（拆 project、指定 role、写 README/CONTRIBUTING）由 AI 工具里的 `/imwel-create-template` skill 完成。在生成目录运行 `imwel lint` 校验；发布仍走普通 `git`。

## `imwel adopt`

把**已 review 的草稿箱**（如 `imwel-extract` skill 产出的那批）渲染进你的 AI 编码工具原生位置，使这些 rule/skill 生效。这是草稿循环里的**本地激活**步骤——不再产出 canonical 暂存副本（打包模板现在走 [`imwel template init --from-project`](#imwel-template-init-from-project)）。

- 写入前对草稿运行确定性**健康闸**（空规则、死链、孤儿路径引用）；问题数会显示在确认里，绝不静默写入（非交互且有问题时拒绝）。
- 渲染的文件是**非受管**的：不写 binding、不提交到 `.imwel/history/`、不被 `status`/`sync`/`push` 跟踪。
- 渲染**路径冲突**走标准去重上报，绝不覆盖已有文件。

草稿箱解析：
- `--from <path>` 指向某具体草稿箱目录（内含 `rules/`/`skills/`）。
- 裸 `imwel adopt`（或 `--from`）在 `.imwel/drafts/` 下查找：旧平铺布局（直接含 `rules/`/`skills/`）直接采纳；含命名批次草稿箱时，交互模式列出供选择，非交互模式要求显式 `--from .imwel/drafts/<box>`。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过写入确认（不会绕过健康闸拒绝） |
| `--tools <csv>` | 渲染目标工具 id（默认：binding 的工具，否则检测到的工具） |
| `--from [box]` | 要采纳的草稿箱（默认 `.imwel/drafts`；传路径选某命名箱） |

在 AI 工具里也可调用 `imwel-adopt` skill（包装本命令）——见[工具内 skill 与命令](./in-tool-skills.md)。采纳后规则即生效；要发布运行 `imwel template init --from-project`，或用 `imwel propose` 反馈到远端。

## `imwel scan`

确定性地生成项目指纹（无 LLM、无网络、只读）到 `.imwel/fingerprint.yaml`。指纹是一张"该看哪里"的地图，而非结论：语言构成（按扩展名计数）、清单/构建文件、测试/lint/format/CI 配置、顶层目录、DB schema/迁移文件，以及散落的工具原生规则文件位置（复用与 `imwel adopt` 相同的发现适配器）。

它只检查文件名与路径——从不读取文件正文——并跳过重目录（`node_modules`、`.git`、`dist` 等）。输出稳定排序、可复现（时间戳除外）。

| 选项 | 说明 |
|------|------|
| `--out <path>` | 输出路径（默认 `.imwel/fingerprint.yaml`） |

指纹**不是**受管制品——不参与 `sync`/漂移。它用于喂给你的 AI 编码工具（或下方第一方 `imwel-extract` skill）来起草贴合本项目的规则。

## `imwel skill install`

把 imwel 自带的**第一方命令包**（随 npm 包分发）安装进你所选的工具：每个成员都是 slash 命令**加**其配套 skill，交付方式与 openspec 分发命令一致。有命令机制的工具（Cursor `.cursor/commands`、Claude Code `.claude/commands`）会同时得到 `/imwel-*` 薄命令与配套 skill；没有命令机制的工具**降级为只装 skill**（跳过命令并提示）。成员：

- `imwel-extract` —— 借 scan 指纹从零起草贴合本项目的 rule/skill。
- `imwel-audit` —— 审计现有规则的语义脱节（规则↔代码不符、规则↔规则矛盾、缺失规则），把可执行建议写入 `.imwel/audit/`。

| 选项 | 说明 |
|------|------|
| `--tools <csv>` | 目标工具 id（非交互模式必填） |
| `-y` / `--yes` | 跳过写入确认 |

在已有 binding 的目录中交互运行且 `binding.tools` 含有效工具时，命令会先询问是否复用（默认“是”）。
选择“否”才进入原有工具多选，并预选 binding 中的工具；空工具列表会直接进入多选且不预选。
如果 binding 包含已不受支持的工具 id，imwel 会指出失效 id，直接进入多选，并只预选剩余的有效工具。
显式传入 `--tools` 以及非交互模式的行为均不改变。

命令包文件是**非受管**的：带 `generatedBy: imwel` 标记、位于 `imwel-*` 命名空间，写入磁盘但不登记进 binding、不提交到 `.imwel/history/`，也不被 `status`/`sync`/`push` 跟踪。`imwel init` 也能安装命令包——通过提示 opt-in，或用 `--command-pack` / `--no-command-pack`。

工作流：先 `imwel scan`，再 `imwel skill install`，然后在你的 AI 工具中调用 skill：

- `imwel-extract` 读取 `.imwel/fingerprint.yaml`、定向读关键文件，把草稿起草到 `.imwel/drafts/`。
- `imwel-audit` 读取现有规则 + 指纹指向的代码，把脱节发现与建议措辞写入 `.imwel/audit/`。

两者都只写隔离的 review 目录——之后用 `imwel adopt` 归并或 `imwel propose` 登记。审计是显式的 skill 调用；imwel 绝不 hook 你的 AI 工具会话。

## `imwel init`

将当前目录绑定到某远程模板仓，并为所选工具安装 Artifact。一个绑定**至多一个可写项目**（`role: project`）外加任意数量的**只读模块**（`role: shared`）—— 见 [Manifest › 项目角色](./manifest.md#项目角色-模块-vs-项目)。交互选择对工具与模块采用「切换 → diff → 二次确认」流程。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过确认（**不会**自动填选择） |
| `--tools <csv>` | 逗号分隔的工具 id（如 `cursor,claude-code,codex,trae`） |
| `--remote <alias>` | 远程别名（仅配置一个远程时自动选用，可省略） |
| `--branch <name>` | 分支名 |
| `--project <name>` | 可写项目名（`role: project`；**至多一个**） |
| `--module <csv>` | 要安装的只读模块名（`role: shared`） |
| `--optional <csv>` | 要安装的 optional Artifact 源路径 |
| `--no-optional` | 不安装任何 optional Artifact |
| `--command-pack` | 把 imwel 命令包（extract/audit/...）安装进所选工具 |
| `--no-command-pack` | 跳过命令包安装 |

绑定成功后，`imwel init` 会询问是否把第一方命令包安装进所选工具（交互提示，或用 `--command-pack` 强制 / `--no-command-pack` 跳过）。这一步绝不阻断绑定：跳过或失败时绑定仍有效，可稍后用 `imwel skill install` 安装。

`--project` 与 `--module` 至少要选中其一。在已绑定目录上重跑 `imwel init` 即**换绑**：整套选择（工具、模块、可写项目）会被替换。init 或换绑写入前，imwel 会列出并分类每个渲染目标。最后一个交互提示始终提供**确认执行**、**返回修改选择**、**取消**三项；返回会从工具选择重新开始，并预选之前的全部选择，取消则保持渲染文件、history 与 binding 不变。不同内容的非受管文件（例如你自己的 `.cursor/rules/coding-style.mdc`）绝不会被静默替换：同一个最终提示会列出冲突路径；非交互模式除非用 `--yes` 授权计划中列出的覆盖，否则以退出码 **1** 中止。`AGENTS.md` 中的受管块等共享文件写入会保留 imwel 块之外的内容。

## `imwel tools`

只调整当前 binding 中的 AI 编程工具，不改变 remote、branch、可写 project、modules、冻结状态、optional Artifact 选择，也不改动单独安装的第一方命令包。binding 中必须至少保留一个工具。

交互模式把已安装工具排在最前并预勾选，采用与 `init`、`modules` 相同的「切换 → diff → 确认」流程。

| 选项 | 说明 |
|------|------|
| `--add <csv>` | 要增加的工具 id |
| `--remove <csv>` | 要停止管理的工具 id |
| `--delete-output` | 删除已移除工具的精确记录输出，但仅限不再被其它受管引用使用的路径 |
| `-y` / `--yes` | 在显式传入 `--add` / `--remove` 后跳过确认 |

增加工具时，imwel 强制刷新绑定分支，按既有 optional 选择重新发现所有未冻结的绑定 project，并统一渲染以检查跨 project 冲突。只写新增工具的输出；现有工具输出不会同步或重写。若目标位置已有不同的非受管文件，则沿用与 `init` 相同的显式文件安全计划。

移除工具默认 **keep**：从 binding 与 history 中移除该工具的 `installedPaths`，但磁盘文件保留并转为非受管。删除必须另加 `--delete-output`；即使明确删除，imwel 也只删除不再被剩余工具或 Artifact 引用的精确记录路径，绝不会清空整个工具目录。

```bash
imwel tools --add claude-code -y
imwel tools --remove cursor -y                  # 保留原 Cursor 文件
imwel tools --remove cursor --delete-output -y  # 只删无引用的记录路径
```

## `imwel modules`

在不动可写项目的前提下，调整当前绑定安装的只读模块。交互模式会列出该分支声明的所有模块（`role: shared`），预勾选已安装项，并在展示 diff + 二次确认后才应用变更。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过确认（**不会**自动填选择） |
| `--add <csv>` | 要安装的模块名 |
| `--remove <csv>` | 要卸载的模块名（会删除其渲染文件） |
| `--freeze <csv>` | 要冻结的已安装模块名（停止同步，保留本地副本） |
| `--unfreeze <csv>` | 要解冻的已安装模块名 |

新增模块只装它的**必需** Artifact；之后运行 `imwel sync` 拉取最新内容。要装某模块的可选 Artifact，请通过 `imwel init` 换绑。

写入前，新增模块会与当前仍会保留绑定的其它 project（可写项目 + 未移除的其它已装模块）一起渲染——做法与 `imwel init`/`imwel sync` 一致——因此**跨 project 渲染路径冲突**（如两个模块都定义了同名但内容不同的规则）会在这里就被捉到，而不是被静默覆盖、直到下一次 `imwel sync` 才暴露。发生这类冲突时，整条调用**原子性中止**：什么都不写入，binding 保持不变，即便同一次调用还请求了 `--remove`/`--freeze`/`--unfreeze`。请到模板仓侧解决命名撞车（改名或合并）后再重跑。

模块安装也使用与 `imwel init` 相同的既有文件计划。新增模块若会替换不同内容的非受管文件，请在交互模式确认具体路径，或检查计划后传 `--yes`；否则整次模块操作会在修改文件、history 或 binding 前停止。

## `imwel sync`

拉取上游并应用 Artifact 更新（冲突经 history 仓处理）。会遍历每个已绑定项目；**已冻结**的模块被跳过。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过应用确认 |
| `--continue` | 手工解决冲突后继续 |

始终强制刷新远程状态（不受被动 fetch 节流约束）。

**只读模块漂移。** 模块是 pull-only 的，imwel 绝不静默覆盖对模块文件的本地修改。当某个已订阅模块存在本地修改时，`imwel sync` 会按模块让你选择：**丢弃**本地修改并拉取上游、**冻结**模块（停止同步、保留本地副本）、或**卸载**它。非交互 `--yes` 默认**冻结** —— 绝不在未经同意时销毁本地修改。

**缺失受管文件。** 删除 binding 与本地 history 已记录的路径不等于卸载。`imwel sync` 会先把该路径列为恢复项，确认后才从当前绑定的上游 Artifact 重新渲染。非交互模式需传 `--yes`；未确认时文件、history 与 binding 均不改变。

交互式 sync 在写文件或改变模块状态前都会请求最终确认。本轮存在模块漂移选择时，提示提供**确认执行**、**返回修改选择**、**取消**三项；返回会从第一个模块漂移选择重新开始，并预选之前的选择。若本轮仅有远端更新或缺失文件恢复，没有更早的选择可修改，提示只提供**确认执行**与**取消**。取消不会改变本地文件、history 或已记录的同步 SHA。

## `imwel status`

报告远程与本地漂移。始终强制刷新。漂移报告之后，会对受管的已渲染文件运行**规则健康**检查并列出问题（不改变退出码）：

- **空壳** — 规则无实质内容（空文件或仅占位）。
- **死链导入** — `@path` 导入指向不存在的文件。
- **孤儿引用** — 反引号路径（如 `` `src/foo.ts` ``）指向已不存在的文件。

检查是确定性且保守的（无 LLM，忽略 glob/URL/命令），仅作提示，不阻断。

### 如何阅读输出

`imwel status` 按以下顺序输出信息：

1. **Binding 摘要**
   - `远程：<remote> / <branch>` 标明正在检查的远程别名和分支。
   - Binding 包含关联的可写项目时，会显示 `可写项目：<project>`。
   - Binding 包含已订阅模块时，会显示 `模块（只读）：<modules>`。已冻结模块带有 `（已冻结）` 标记，并会在同步时保持本地固定版本。
   - `工具：<tools>` 列出接收渲染后 Artifact 的 AI 编程工具。
   - `上次同步提交：<sha>` 是上次成功同步所记录远程提交的前八个字符。
2. **漂移结果**
   - `远程有可用更新。` 表示分支当前指向的提交不同于所记录的上次同步提交。运行 `imwel sync` 预览并应用上游变更。
   - `检测到本地手工修改：<paths>` 表示列出的受管路径与本地 history 中记录的状态不同。先检查这些编辑，决定保留、贡献还是丢弃，再用 `imwel sync` 协调变更。
   - `未检测到漂移。` 仅在远程提交未变且受管路径均无本地编辑时显示。此时无需操作。

   远程更新与本地编辑相互独立，因此前两行可以同时出现。只有两种情况都不存在时，才会显示无漂移行。
3. **规则健康**
   - `[空壳]` 表示受管规则为空或只含占位文字。请补充实质性指导，或从模板中移除该规则。
   - `[死链导入]` 表示某个 `@path` 导入无法解析。请修正导入，或恢复被引用文件。
   - `[孤儿引用]` 表示反引号路径指向不存在的文件。请更新或移除引用；如果文件本应存在，则将其恢复。

   这些发现仅作提示：不会阻断命令，也不会改变退出码。若未发现问题，status 会显示 `所有受管规则均健康。`

需要快速离线查看本地记录的 binding 和贡献追踪状态时，使用 `imwel binding show`。它只读取本地元数据并检查路径是否存在，不 fetch，也不运行规则健康检查。需要判断是否应该同步时，使用 `imwel status`：它始终强制刷新远程，随后检查漂移和规则健康。

## `imwel binding show`

只读取本地元数据并检查路径是否存在。它不会 fetch、联系 Git、初始化 history、修改追踪或写入文件。与 `imwel status` 不同，它不报告远程漂移或规则健康。

输出严格分成 **Binding** 与 **Contribution tracking** 两部分：

- Binding 表示已安装、受管的状态。摘要之后的默认树形清单先列关联项目，再按字母序列出订阅模块；Artifact 类型固定按 `rule` → `skill` → `agents` 排列。叶子显示 canonical path、本地化后的类型与必选/可选状态、安装工具，并在需要时标记 `! 缺失`。
- Contribution tracking 表示允许将本地来源贡献到上游。其树按目标远程/project、再按类型分组；这不代表来源已由 binding 安装或管理。同一 Artifact 同时出现在两部分是正确的。

```text
绑定（Binding）
  远程：team / main
  关联项目：app
  ...
  app（关联）
  └─ 规则
     └─ rules/app.md（规则 · 必选）→ claude-code, cursor
  shared（已订阅，已冻结）
  └─ 规则
     └─ rules/shared.md（规则 · 必选）→ cursor ! 缺失

贡献追踪（Contribution tracking）
  ...
  team/shared
  └─ 规则
     └─ rules/shared.md（规则 · 必选）→ cursor · 已推送 · 共享模块
        └─ 来源：.cursor/rules/shared.mdc ! 缺失
```

| 选项 | 说明 |
|------|------|
| `--json` | 仅输出字段不变的稳定 `schemaVersion: 1` JSON 视图 |

命令只显示远程别名，绝不显示可能携带凭据的 URL；路径统一为项目相对 POSIX 格式，也不会读取文件正文用于输出。缺失的安装路径会逐路径计数，并在 stdout 给出指向 `imwel sync` 的警告；贡献来源缺失时也在 stdout 给出带数量的 `imwel propose` 警告。工具 ID 与路径不翻译，`--json` 继续保留机器枚举值。只有 contribution tracking、没有 binding 时仍可查看；两者都没有时给出初始化提示，且不创建 `.imwel`。

## `imwel rollback`

恢复 `.imwel/history/` 中记录的某次安装。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过确认 |
| `--to <sha>` | 要恢复的 history 提交 SHA |

恢复后，imwel 会**删除该 history 点之后新增的管理文件**。从不删除未管理文件。

## `imwel push`

将本地工具文件反向渲染为 canonical Artifact，并向上游提案（默认分支 + PR/MR）。可写项目编辑按常规进入候选。只有存在该模块 Artifact 的长期贡献追踪时，订阅模块编辑才有资格贡献，并会作为单独候选要求显式选择。

创建分支或提交前，push 会检查所有本地输入。缺失的 binding 受管文件会被跳过（绝不推断为删除上游），并提示用 `imwel sync` 恢复。贡献来源缺失时，交互 push 可移除追踪或取消以便补回；非交互 push 会跳过、保留追踪并返回非零。成功项会记录 Git 分支与 commit SHA；未选择或失败记录保持不变，已由该 Git commit 表示的未变内容不会重复推送。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过确认 |
| `--all` | 选择全部 push 候选 |
| `--message <msg>` | 提交说明 |

## `imwel propose [file]`

每次为一个远程 project 或 module 管理贡献追踪。追踪只是配置；移除追踪绝不会删除或修改本地 Artifact。

| 选项 | 说明 |
|------|------|
| `-y` / `--yes` | 跳过确认 |
| `--remote <alias>` | 目标远程 |
| `--project <name>` | 目标 manifest project |
| `--type <type>` | `rule`、`skill` 或 `agents` |
| `--optional` / `--required` | optional 或必需 Artifact |
| `--tool <id>` | 反向渲染所用源工具适配器 |

### 交互多选（不带文件）

不带文件运行 `imwel propose`：先选择 remote。获取其 manifest 后，imwel 会检查每个 project 的候选，并检查所选 remote 是否有目标 project 仍存在于该 manifest 的待处理贡献追踪。若两者都为空，命令会在 project 提示前退出，并说明工具原生文件通常位于哪些发现路径（例如 `.cursor/rules/*.mdc`），以及如何用 `imwel propose <path>` 直接提议指定文件。只要任一 project 有候选，或存在选择器可管理的待处理追踪，就会像以前一样继续选择目标 project/module；指向已删除或重命名 project 的 stale tracking 不会打开一个无法管理它的选择器。

选择目标后，列表把现有追踪放在最前并预勾选，再列出符合条件、未绑定的 `USER` Artifact。空格切换追踪，回车显示新增/移除 diff，二次确认后应用；整个过程不执行 Git，也不修改本地文件。可写项目受管 Artifact、`MINE`/`FOREIGN` 文件、已归属其它目标的项及跨工具冲突会被排除并汇总。带文件流程与非交互流程保持不变。

追踪前会反向解析工具原生路径。例如 `.cursor/rules/arkts-hooks.mdc` 保留为本地来源，同时按 manifest conventions 派生目标路径 `rules/arkts-hooks.md`。

project tracking 在 push 后仍保留，只有后续 `sync` 把同一 canonical Artifact 成功安装进 project binding 后才自动移除。module tracking 跨 push 与 sync 持久保留，直到你在 `propose` 中取消勾选。

## 非交互 / CI

`-y` / `--yes` **只**跳过确认提示，不会为选择类提示编造答案 — 请显式传入 `--tools`、`--remote`、`--project`、`--to`、`--all` 等。

```bash
imwel init -y --tools cursor,claude-code --remote org-standards --branch main \
  --project my-app --no-optional

imwel tools --add codex --remove cursor -y
imwel sync --yes
imwel push --yes --all --message "chore: update artifacts"
imwel rollback --yes --to <history-sha>
imwel propose rules/new-rule.md -y --remote org-standards --project my-app \
  --type rule --required --tool cursor
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `IMWEL_FETCH_THROTTLE_MS` | 覆盖全局被动 fetch 节流（默认 4 小时）。非法值回退默认。尚不支持按远程独立节流。`sync` / `status` 始终强制刷新。 |
| `NO_COLOR` | 只要该变量存在，无论取值为何（包括空值），都会禁用 ANSI 颜色；输出中的语义图标仍会保留。 |

## 下一步

- 消费者工作流 → [安装模板](../consume/quickstart.md)
- 作者工作流 → [编写模板](../author/quickstart.md)
- 安全默认与 Git 模型 → [架构](./architecture.md)
- 开发 CLI 本身 → [CONTRIBUTING.zh-CN.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.zh-CN.md)
