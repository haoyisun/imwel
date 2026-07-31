# 如何经 PR 回推上游

想把本地对规则/技能的改进像代码一样走分支 + PR/MR 评审，而不是直接覆盖共享模板分支？

**你将得到：** 从工具原生文件反向渲染回 canonical Artifact、推送新分支，以及 compare / PR URL。直推到跟踪分支仅在该远程显式开启 `directPush` 时可用。

## 前置

- 消费者绑定含**可写 project**（不能只有只读模块）
- 有权限向模板宿主推送分支
- 可选：`PATH` 上有 `gh` 或 `glab` 以便 CLI 创建 PR

## 步骤

### 1. 在消费者侧改动

编辑如 `.cursor/rules/` 或 `CLAUDE.md`，或新增稍后要跟踪的 Artifact。

### 2. 需要时登记贡献目标

**新建**本地 Artifact，或有意改订阅模块时：

```bash
imwel propose
```

选择一个远程 project/module 并切换跟踪。或传路径：

```bash
imwel propose path/to/new-rule.md -y --remote org-standards --project example-project
```

### 3. 推送

```bash
imwel push
```

默认：创建 `imwel-push-…` 分支并推送，打印 compare URL；可选择用 `gh`/`glab` 开 PR。

push 只会列出相对远程模板（或上次成功 push 记录）仍有实质差异的制品；已合入且无新本地改动的 skill/rule **不会**再出现。若过滤后只剩 1 条，交互模式会跳过多选，改为一次确认是否推送该路径。

非交互示意：

```bash
imwel push --yes --all --message "chore: update artifacts"
```

可以只在**一个**已绑定工具里改（例如 Cursor）。push 会以相对 `.imwel/history` 有 dirty 路径的工具为作者来源反解——其它工具上的干净旧副本不会挡住推送。PR 合并后，你或同事再 `imwel sync`，其它工具才会更新。

若多个工具都有未提交且互相冲突的编辑，指定一侧为准：

```bash
imwel push --from cursor
```

交互式 push 也可提示你选择主导的作者工具。

### 4. 在 Git 宿主上完成 PR

按分支保护完成评审。

### 5. sync 收尾

```bash
imwel sync
```

合并后 sync 会把制品装进 binding。**项目**贡献追踪会毕业（从列表移除）；**模块**追踪保留（长期授权），但会刷新远程基线，避免被动「模板有更新」反复打扰。之后可以继续写下一条制品，不必再勾选旧的那条。

## 预期结果

- 上游分支含 canonical Artifact 更新（skill 为 `skills/<slug>/SKILL.md` 及附属文件）
- 未直推共享默认分支（除非该远程 `directPush: true`）
- push **不会**改写其它工具的本地文件；它们在下次 `imwel sync` 时收敛
- sync 后项目贡献离开追踪列表；没有新 diff 时 push 保持安静

## 排错

| 问题 | 处理 |
|------|------|
| 模块 Artifact 推送被拒 | 模块默认只读——用 `imwel propose` 做有意贡献，或在模板仓内改。 |
| 多个 dirty 工具反解冲突 | 你改过的几侧内容不一致——用 `imwel push --from <tool>`，或先对齐这些 dirty 副本。干净工具会被忽略。 |
| push 后其它工具仍是旧内容 | 预期行为——push 不改写它们。合并 PR 后执行 `imwel sync`。 |
| 已合并的制品仍出现在 push | 合并后先 `imwel sync`；与远程 tip 等价的内容会被过滤。 |
| sync 后仍被动提示 proposals 有更新 | sync 会刷新保留追踪的基线——合并后跑一次 sync 即可。 |
| 需要直推（仅个人远程） | `imwel remote set <alias> --direct-push`——绝不要作为团队默认。 |

## 关联

- [同步与处理漂移](./sync-and-drift.md)
- [作者与消费者](../explanation/author-vs-consumer.md)
- [命令 — push / propose](../reference/commands.md)
