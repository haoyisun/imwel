# 从代码库起草规则

> **作者路径** —— 冷启动与规则保鲜。前置：[安装与前置](../getting-started/install.md)。无论你是否已有模板仓，都适用。

你有一个真实项目，想为它配 AI 编程规则。imwel 提供两个操作表面，本页端到端走一遍整个流程。

## 你会用到两个表面

| 表面 | 在哪里 | 是什么 |
|------|--------|--------|
| **imwel CLI** | 终端 | `imwel scan`、`imwel skill install`、`imwel adopt`、`imwel template init` |
| **Slash 命令** | AI 工具聊天 | `/imwel-extract`、`/imwel-audit`、`/imwel-adopt`、`/imwel-create-template` |

Slash 命令是 `imwel skill install` 装入的薄包装 —— 它们在 AI 工具聊天里替你调用 CLI 命令。哪个表面顺手用哪个；下面的步骤给每一步标注了 `(终端)` 或 `(slash 命令)`。

所有第一方命令包文件以及 `imwel adopt` 渲染出的规则都是**非受管**的：写入磁盘，但从不被 `sync` / `status` / `push` 跟踪。

## 流程一览

```
imwel scan (终端)                # 给项目建指纹
  → /imwel-extract (slash)       # 把规则草稿写进 .imwel/drafts/<box>/
  → review 命名草稿箱
  → imwel adopt --from <box>     # 本地激活（终端）
                                 # 或 /imwel-adopt (slash)
```

两个入口：

- **A. 冷启动** —— 项目几乎没有规则。走完整循环。
- **B. 已有散落规则** —— 跳过起草，用 `imwel template init --from-project` 直接收编成模板仓。

## A. 冷启动：从零起草规则

### 1. 给项目建指纹（终端）

```bash
imwel scan            # 写出 .imwel/fingerprint.yaml
```

一份确定性、无 LLM 的项目地图（语言构成、manifest/build 文件、测试/lint/CI 配置、散落的工具规则文件位置）。当项目是 Git 仓库时，`scan` 会加一层可选的 `history` 信号 —— 变更热点与共变 —— 按提交数量从 `normal` 到 `low` 到 `none` 优雅降级。`scan` 会打印当前处于哪一级。见 [`imwel scan`](../guide/commands.md#imwel-scan)。

### 2. 安装第一方 skill（终端，一次性）

```bash
imwel skill install   # 安装 /imwel-extract 与 /imwel-audit
```

把 imwel 的命令包装进你的工具：有命令机制的工具得到 `/imwel-*` slash 命令加背后的 skill，没有的工具只装 skill。见 [`imwel skill install`](../guide/commands.md#imwel-skill-install) 与[工具内 skill 与命令](../guide/in-tool-skills.md)。

### 3. 在 AI 工具里起草规则（slash 命令）

```
/imwel-extract
```

读取指纹（缺失时自行运行 `imwel scan`），按指纹定向读取关键文件，把贴合项目的规则草稿写进**命名草稿箱** `.imwel/drafts/<主题>-<时间戳>/`。以三段式交接收尾：草稿箱位置、review 提示、下一步。见[工具内 skill 与命令](../guide/in-tool-skills.md)。

### 4. review 草稿箱

打开 `.imwel/drafts/<box>/`，读草稿，删掉或改掉不想要的。此刻还没有任何东西被渲染进你的工具。

### 5. 激活 review 过的草稿

两个方向，每个方向都能从两个表面进入：

| 方向 | 终端 | Slash 命令 |
|------|------|-----------|
| **本地激活** —— 立刻把该批渲染进你的工具 | `imwel adopt --from <box>` | `/imwel-adopt` |
| **打包/上游** —— 把你的制品变成可发布的模板仓 | `imwel template init --from-project` | `/imwel-create-template` |

`imwel adopt` 写入前先跑确定性健康闸（空壳规则、死链导入、孤儿路径引用），问题数会显示出来，绝不静默写入。见 [`imwel adopt`](../guide/commands.md#imwel-adopt) 与 [`imwel template init --from-project`](../guide/commands.md#imwel-template-init-from-project)。

## B. 已有散落规则：收编成模板仓

如果项目里已经有了规则（散落在各工具目录，或你刚起草+采纳完），一步把它们变成可分享的模板仓：

```bash
imwel template init --from-project      # 把你自己的制品收割成骨架
```

它只收割**你的**制品 —— imwel 自己的命令包和其它工具装的文件（如 openspec）会经制品来源识别排除并打印为已跳过。骨架落在 `.imwel/generated-templates/<主题>-<时间戳>/`（或 `--dir`），含 `.imwel/manifest.yaml`、收割到的 `rules`/`skills`/`agents.md`，以及脚手架的 `/imwel-author` + `/imwel-lint`。语义组织 —— 拆 project、指定 role、写 README —— 请在 AI 工具中调用 `/imwel-create-template`，然后在生成目录跑 `imwel lint` 校验。

## 保持规则新鲜

随着代码库演进，重复跑这个循环：

```
imwel scan → /imwel-extract（起草新规则）→ review → imwel adopt
/imwel-audit（审计现有规则的脱节）→ 在源头修复 → 重新 adopt
```

`/imwel-audit` 检查规则↔代码不一致、规则↔规则冲突、缺失规则（高频热点却无规则覆盖是强"缺失规则"信号），把结论写进 `.imwel/audit/`。仅显式调用 —— imwel 绝不挂钩你的 AI 工具会话。见[工具内 skill 与命令](../guide/in-tool-skills.md)。

## 下一步

- 把采纳的制品变成模板 → [编写模板](./quickstart.md)
- 发布与维护 → [发布与维护](./publish.md)
- 发布前校验 → [Lint 与质量条](./lint.md)
