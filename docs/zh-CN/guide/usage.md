# 快速走查

> **快速上手。** 本页并排给出两条泳道的最小、可复制命令序列。逐步轨道请follow[消费者路径](../consume/quickstart.md)或[作者路径](../author/quickstart.md)。不熟悉术语?见[术语词表](../concepts/glossary.md)。

imwel 有两条彼此独立的生命周期。按你的角色选择对应泳道。

## 作者泳道 —— 你发布规则

```bash
imwel template init                 # 生成模板仓骨架（manifest + 示例 project）
# 编辑 .imwel/manifest.yaml 与你的 rules/skills/agents.md
imwel lint                          # 发布前校验（CI 用 imwel lint --strict）
git init && git add . && git commit -m "initial template"
git remote add origin <git-host-url>
git push -u origin main             # ← 发布靠普通 git，不是 imwel 命令
# 维护：编辑 artifact → imwel lint → git commit → git push
```

逐步：[编写模板](../author/quickstart.md) → [Lint 与质量条](../author/lint.md) → [发布与维护](../author/publish.md)。

## 消费者泳道 —— 你安装他人的规则

```bash
imwel remote add <template-repo-url> # 别名由 URL 推导（可添加多个远程）
cd your-project
imwel init                          # 选工具/branch、只读模块 + 一个可写项目
imwel modules                       # 之后增删/冻结模块（切换 → diff → 二次确认）
imwel tools                         # 之后增删 AI 工具，无需换绑
imwel binding show                  # 离线查看本地 binding/tracking
imwel sync                          # 拉取上游更新（带漂移预览）
# 漂移：imwel status → imwel sync / imwel rollback
imwel propose                       # 选择一个目标，新增/取消贡献追踪
imwel push                          # 推送项目编辑与显式追踪的贡献
```

> **贡献流程：** 运行 `imwel propose`，选择一个远程 project/module，再切换追踪。已有追踪会预勾选；二次确认只应用显示的新增/移除记录，绝不改动本地文件。project tracking 在匹配的 sync 后转入 binding；module tracking 持续到你主动取消。`imwel push` 记录 Git branch/commit，并跳过未变化贡献。也可传路径：`imwel propose <file>`。选项细节见 [命令参考 — propose](./commands.md#imwel-propose-file)。

> **调整工具：** 使用 `imwel tools`，不要为此完整重跑 `imwel init` 换绑。增加工具会把当前完整 binding 渲染到新工具，但不重写现有工具输出；移除工具默认保留文件并转为非受管，删除须另行明确选择。选项细节见[命令参考 — tools](./commands.md#imwel-tools)。

> **查看本地状态：** 用 `imwel binding show` 快速、离线地查看 binding 管理了什么，以及 contribution tracking 授权了什么。加 `--details` 查看归属和 `present`/`missing` 路径；用 `--json` 获取稳定、带版本号的机器视图。此命令绝不 fetch 或写入；需要远程漂移和规则健康时仍使用 `imwel status`。选项细节见[命令参考 — binding show](./commands.md#imwel-binding-show)。

逐步：[安装模板](../consume/quickstart.md) → [同步、漂移与回滚](../consume/sync-and-drift.md) → [回馈上游](../consume/contribute-back.md)。

> **易被忽略：** 作者是用普通 `git` 把模板仓推送到 Git 宿主来**发布**的——没有 `imwel publish`。
> imwel 命令负责本地的创作/校验与消费者侧；Git 宿主才是分发与治理层。

## 从代码库起步规则

还没有模板?imwel 能归并散落规则、生成项目指纹,并用第一方 skill 起草规则 —— 见[从代码库起草规则](../author/from-codebase.md)。

已经在各工具里攒了规则、想据此得到可分享的模板仓?运行 `imwel template init --from-project` 把**你自己的**制品(排除 imwel 与其它工具的文件)收割成骨架,再用 `/imwel-create-template` skill 精修 —— 见 [`imwel template init --from-project`](./commands.md#imwel-template-init-from-project)。

## 故障排查

| 现象 | 处理 |
|------|------|
| `no git binary found on PATH` | 安装 Git 后重跑 `imwel doctor`。 |
| 在模板仓里 `imwel status` 报了假的"干净"结果 | 你在模板仓而非消费绑定——改用 `imwel lint`。 |
| `imwel init`、`imwel modules` 或 `imwel tools` 报告将覆盖非受管文件 | 检查列出的具体路径。仅当模板确实应替换它们时确认；CI 中也应先审查打印计划，再用 `--yes` 重跑。 |
| 本地误删了受管文件 | 运行 `imwel sync`。它会把缺失路径列为恢复项，并在重新创建前请求确认。 |
| `imwel push` 跳过缺失文件 | binding 文件请运行 `imwel sync`。追踪贡献缺失时，交互 push 可取消追踪或停止以补回；非交互 push 保留追踪并返回非零。 |
| `imwel sync` 留下冲突标记 | 手工解决 `<<<<<<<`/`=======`/`>>>>>>>` 标记,再 `imwel sync --continue`。 |
| CI 中命令需要输入 | 传入所需选择 flag（`--tools`、`--remote`、`--branch`、`--project`）与 `-y`。 |
| 第一方 skill 文件出现在 `imwel status` 中 | 不应如此——第一方 skill 是非受管的。请用最新版本重跑 `imwel skill install`。 |

## 下一步

- 消费者? → [安装模板](../consume/quickstart.md)
- 作者? → [编写模板](../author/quickstart.md)
- 每个命令的选项与退出码 → [命令](./commands.md)
