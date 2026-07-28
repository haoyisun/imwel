# 从代码库起草规则

> **作者路径** —— 冷启动与规则保鲜。前置：[安装与前置](../getting-started/install.md)。无论你是否已有模板仓,都适用。

即便没有模板,imwel 也能帮你从真实项目起步与维护规则。

## 收编你已有的规则

已经在各工具里攒了规则？用下方的 [`imwel template init --from-project`](#从当前项目生成模板仓)一步把它们变成可分享的模板仓。它只收割你自己的制品，跳过 imwel 与其它工具的文件。

## 生成项目指纹

为 AI 起草规则构建一份确定性、无 LLM 的项目地图：

```bash
imwel scan            # 写出 .imwel/fingerprint.yaml
```

当项目是 Git 仓库时,`scan` 还会把一层 **Git 历史信号**挖进指纹的可选 `history` 段：变更**热点**（改动最频繁的文件）与**共变**（总是一起改动的文件）—— 这些正是最值得写成规则的地方。该层是叠加的,且优雅降级：

- **满血** —— 提交足够多的仓库：完整历史信号（`confidence: normal`）。
- **低置信** —— 新仓或浅克隆、提交很少：有信号但标记 `confidence: low`（当作线索,而非结论）。
- **兜底** —— 无 `.git` 或无提交：跳过历史（`available: false`）,仍产出文件树指纹,并提示可运行 `git init`。

`scan` 会打印当前处于哪一级。历史挖掘是只读的,shell out 到系统 `git`,且仅在你运行 `imwel scan` 时触发 —— 不与任何 AI 工具会话绑定。见 [`imwel scan`](../guide/commands.md#imwel-scan)。

## 用第一方 skill 起草与审计

把 imwel 自带的 skill 安装到工具,再在 AI 工具中调用：

```bash
imwel skill install   # 安装 imwel-extract 与 imwel-audit（非受管）
```

- `imwel-extract` 借指纹把贴合项目的规则草稿写到命名草稿箱 `.imwel/drafts/<主题>-<时间戳>/`（指纹缺失时它会自行运行 `imwel scan`）。它会利用 Git 历史信号（热点作规则候选、共变作跨文件线索）,遵循创作标准，并以三段式交接收尾（草稿箱位置、review 提示、下一步 `imwel adopt --from <box>`）。
- `imwel-audit` 审计现有规则的语义脱节（规则↔代码、规则↔规则、缺失规则）到 `.imwel/audit/`。高频热点却无规则覆盖是强"缺失规则"信号；历史不可用/低置信时退回纯规则↔代码、规则↔规则判断。

第一方 skill 是**非受管**的：写入磁盘,但从不被绑定、历史或 `sync`/`status`/`push` 跟踪。

## 激活 review 过的草稿

`imwel-extract` 把每批写进命名草稿箱 `.imwel/drafts/<主题>-<时间戳>/`。review 完某箱后，把它渲染进工具：

```bash
imwel adopt --from .imwel/drafts/<box>    # 把该批渲染进工具（非受管）
```

写入前先跑确定性质量闸（空壳规则、死链导入、孤儿路径引用），问题数显示在确认里 —— 绝不静默写入（非交互且有问题时拒绝）。渲染的文件是**非受管**的（不被 sync/status/push 跟踪）。你也可在 AI 工具里调用 `imwel-adopt` skill（包装本命令）。见 [`imwel adopt`](../guide/commands.md#imwel-adopt) 与[工具内 skill 与命令](../guide/in-tool-skills.md)。

## 从当前项目生成模板仓

当项目里已经有了你想要的规则（已采纳，或本就散落在各工具里），一步把它们变成可分享的模板仓库：

```bash
imwel template init --from-project      # 把你自己的制品收割成骨架
```

它只收割**你的**制品—— imwel 自己的命令包和其它工具装的文件（如 openspec）会经制品来源识别排除并打印为已跳过。骨架落在唯一的 `.imwel/generated-templates/<主题>-<时间戳>/` 目录（或 `--dir`），含 `.imwel/manifest.yaml`、收割到的 `rules`/`skills`/`agents.md`，以及脚手架的 `/imwel-author` + `/imwel-lint`。语义组织——拆 project、指定 role、写 README——请在 AI 工具中调用 `/imwel-create-template` skill，然后在生成目录跑 `imwel lint` 校验。见 [`imwel template init --from-project`](../guide/commands.md#imwel-template-init-from-project)。

## 维护闭环

```
imwel scan（或由 imwel-extract 自动运行）→ 在 AI 工具中跑 imwel-extract / imwel-audit →
review 命名草稿箱 → imwel adopt --from <box>   # 本地激活
```

review 后有两个方向：**本地激活**（`imwel adopt` 渲染进工具，非受管）与**打包/上游**（`imwel template init --from-project` 生成模板，或 `imwel propose` + `imwel push` 贡献远程）。

## 下一步

- 把采纳的制品变成模板 → [编写模板](./quickstart.md)
- 发布与维护 → [发布与维护](./publish.md)
