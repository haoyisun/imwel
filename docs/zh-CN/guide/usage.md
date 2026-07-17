# 使用说明

这是 imwel 的**面向任务、端到端**使用说明，带你从安装走到日常工作流。每个命令的完整选项参考见
[命令](./commands)。

## imwel 是什么

imwel 是一个 **Git 原生 CLI**，用于在团队与多种 AI 编程工具之间分发规则、技能与 agent 说明。无后端、无数据库、无托管平台：

- **Git 即数据库** —— 内容标识、版本与历史都来自 Git 对象。
- **Git 主机即治理层** —— 权限与评审通过 GitHub/GitLab/Gitea 的 PR 完成。
- **模板仓**是任何遵循 imwel manifest 约定、持有 Artifact（规则、技能、`agents.md` 内容）的普通 Git 仓库。

完整理念见[架构](./architecture)。

## 安装与前置

需要 Node.js ≥ 18.18，以及 PATH 上的系统 `git`。

```bash
# 免安装一次性运行：
npx imwel@latest <command>

# 或全局安装：
npm install -g imwel
imwel doctor   # 校验 git 与环境前置
```

若有异常先跑 `imwel doctor` —— 它会报告缺失的前置并给出可执行的下一步。

## 核心概念

| 概念 | 含义 |
|------|------|
| **模板仓** | 含 `.imwel/manifest.yaml` 的 Git 仓库，列出一个或多个 *project* 及其 Artifact。 |
| **Artifact** | 规则（`agents.md` 风格 Markdown）、技能（`SKILL.md` bundle）或 agent 说明。 |
| **绑定** | 消费目录的 `.imwel/binding.yaml`，把它关联到某远程模板仓中的一个 project。 |
| **适配器** | 每个工具（Cursor、Claude Code、Codex……）的渲染器，把 Artifact 写成该工具的原生格式。 |
| **漂移** | 远程模板、上次同步、本地磁盘文件之间的偏离——经 Git 检测。 |

## 消费侧工作流（使用团队规则）

你是想把团队规则装进自己 AI 工具的开发者。

1. **注册模板 remote**（每台机器一次）：

```bash
imwel remote add org-standards git@github.com:example/imwel-templates.git
```

2. **绑定项目并安装 Artifact：**

```bash
cd your-project
imwel init            # 交互式选择工具、remote、branch、project
```

`imwel init` 会把所选 project 的 Artifact 渲染到每个所选工具的原生位置并记录绑定，同时在
`.imwel/history/` 下创建隐藏历史仓。

3. **拉取上游更新：**

```bash
imwel sync            # 预览新增/删除/修改的文件，再确认
```

不重叠的本地改动与上游改动会自动合并；重叠处写入标准 Git 冲突标记供你手工解决，再
`imwel sync --continue`。

4. **随时查看状态：**

```bash
imwel status          # 远程与本地漂移 + 确定性规则健康检查
```

5. **撤销不想要的更新：**

```bash
imwel rollback        # 从 .imwel/history/ 恢复到先前状态
```

6. **把本地改动反馈上游：**

```bash
imwel push            # 反向渲染本地工具文件 → canonical，开分支 + PR/MR
imwel propose <file>  # 为下次 push 登记一个全新 artifact
```

上游贡献默认走**分支 + PR/MR**，绝不直接提交到共享分支。

## 模板作者工作流（发布规则）

你维护团队消费的规则。

1. **脚手架生成模板仓：**

```bash
imwel template init   # manifest、示例 project、作者 AGENTS.md、Cursor slash command
```

2. **编辑 Artifact**（位于 `.imwel/manifest.yaml` 声明的路径下，见[Manifest](./manifest)与[示例模板](./example-template)）。

3. **发布前校验：**

```bash
imwel lint            # error = 会装坏；warning = 风格/最佳实践
imwel lint --strict   # warning 也失败（适合 CI）
```

完整编写参考见[模板编写](/zh-CN/template-authoring)。

## 冷启动与规则保鲜

即便没有模板，imwel 也能帮你起步与维护规则。

- **归并散落规则**为 canonical artifact：

```bash
imwel adopt           # 把 .cursor/rules、CLAUDE.md、AGENTS.md…… 归并到 .imwel/adopted/
```

- **生成项目指纹**（确定性、无 LLM），作为 AI 起草规则的地图：

```bash
imwel scan            # 写出 .imwel/fingerprint.yaml
```

- **安装 imwel 第一方 skill** 到工具，再在 AI 工具中调用：

```bash
imwel skill install   # 安装 imwel-extract 与 imwel-audit（非受管）
```

  - `imwel-extract` 借指纹把贴合项目的规则草稿写到 `.imwel/drafts/`。
  - `imwel-audit` 审计现有规则的语义脱节（规则↔代码、规则↔规则、缺失规则）到 `.imwel/audit/`。

- **规则健康**由 `imwel status`（空壳规则、死链导入、孤儿路径引用）与 `imwel lint`（空壳/占位规则）自动报告。

典型维护闭环：`imwel scan` → 在 AI 工具中跑 `imwel-extract`/`imwel-audit` → review 草稿 →
`imwel adopt` 或 `imwel propose` → `imwel push`。

## 故障排查

| 现象 | 处理 |
|------|------|
| `no git binary found on PATH` | 安装 Git 后重跑 `imwel doctor`。 |
| 在模板仓里 `imwel status` 报了个假的"干净"结果 | 你在模板仓而非消费绑定——改用 `imwel lint`。 |
| `imwel sync` 留下冲突标记 | 手工解决 `<<<<<<<`/`=======`/`>>>>>>>` 标记，再 `imwel sync --continue`。 |
| CI 中命令需要输入 | 传入所需选择 flag（如 `--tools`、`--remote`、`--branch`、`--project`）与 `-y`。 |
| 第一方 skill 文件出现在 `imwel status` 中 | 不应如此——第一方 skill 是非受管的。若被跟踪，请用最新版本重跑 `imwel skill install`。 |

每个命令的精确选项与退出码见[命令](./commands)。
