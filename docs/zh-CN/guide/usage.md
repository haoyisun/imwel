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
imwel sync                          # 拉取上游更新（带漂移预览）
# 漂移：imwel status → imwel sync / imwel rollback
imwel push                          # 把可写项目的本地改动以分支 + PR/MR 反馈上游
```

逐步：[安装模板](../consume/quickstart.md) → [同步、漂移与回滚](../consume/sync-and-drift.md) → [回馈上游](../consume/contribute-back.md)。

> **易被忽略：** 作者是用普通 `git` 把模板仓推送到 Git 宿主来**发布**的——没有 `imwel publish`。
> imwel 命令负责本地的创作/校验与消费者侧；Git 宿主才是分发与治理层。

## 从代码库起步规则

还没有模板?imwel 能归并散落规则、生成项目指纹,并用第一方 skill 起草规则 —— 见[从代码库起草规则](../author/from-codebase.md)。

## 故障排查

| 现象 | 处理 |
|------|------|
| `no git binary found on PATH` | 安装 Git 后重跑 `imwel doctor`。 |
| 在模板仓里 `imwel status` 报了假的"干净"结果 | 你在模板仓而非消费绑定——改用 `imwel lint`。 |
| `imwel sync` 留下冲突标记 | 手工解决 `<<<<<<<`/`=======`/`>>>>>>>` 标记,再 `imwel sync --continue`。 |
| CI 中命令需要输入 | 传入所需选择 flag（`--tools`、`--remote`、`--branch`、`--project`）与 `-y`。 |
| 第一方 skill 文件出现在 `imwel status` 中 | 不应如此——第一方 skill 是非受管的。请用最新版本重跑 `imwel skill install`。 |

## 下一步

- 消费者? → [安装模板](../consume/quickstart.md)
- 作者? → [编写模板](../author/quickstart.md)
- 每个命令的选项与退出码 → [命令](./commands.md)
