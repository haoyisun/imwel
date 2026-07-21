# 从代码库起草规则

> **作者路径** —— 冷启动与规则保鲜。前置：[安装与前置](../getting-started/install.md)。无论你是否已有模板仓,都适用。

即便没有模板,imwel 也能帮你从真实项目起步与维护规则。

## 归并散落规则

把你已经散落在各工具里的规则拉进 canonical Artifact：

```bash
imwel adopt           # 把 .cursor/rules、CLAUDE.md、AGENTS.md…… 归并到 .imwel/adopted/
```

跨工具相同内容会被合并；跨工具冲突会被报告并跳过（不覆盖任何内容）。无需绑定或远程即可运行。见 [`imwel adopt`](../guide/commands.md#imwel-adopt)。

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

- `imwel-extract` 借指纹把贴合项目的规则草稿写到 `.imwel/drafts/`。它会利用 Git 历史信号（热点作规则候选、共变作跨文件线索）,并遵循创作标准 —— 渐进式披露、带 do/don't 示例的短规则、精确可触发的描述 —— 收尾前对草稿自检。
- `imwel-audit` 审计现有规则的语义脱节（规则↔代码、规则↔规则、缺失规则）到 `.imwel/audit/`。高频热点却无规则覆盖是强"缺失规则"信号；历史不可用/低置信时退回纯规则↔代码、规则↔规则判断。

第一方 skill 是**非受管**的：写入磁盘,但从不被绑定、历史或 `sync`/`status`/`push` 跟踪。

## 采纳 review 过的草稿

```bash
imwel adopt --from            # 采纳 .imwel/drafts（可用 --from <dir> 覆盖目录）
```

一道确定性质量闸（空壳规则、死链导入、孤儿路径引用）会先在草稿上运行,问题数会显示在确认提示里 —— 绝不静默写入。非交互 shell 下需加 `-y`。

## 维护闭环

```
imwel scan → 在 AI 工具中跑 imwel-extract / imwel-audit → review 草稿 →
imwel adopt --from（或 imwel propose）→ imwel push
```

## 下一步

- 把采纳的制品变成模板 → [编写模板](./quickstart.md)
- 发布与维护 → [发布与维护](./publish.md)
