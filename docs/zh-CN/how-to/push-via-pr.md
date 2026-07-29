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

非交互示意：

```bash
imwel push --yes --all --message "chore: update artifacts"
```

### 4. 在 Git 宿主上完成 PR

按分支保护完成评审。同事用 `imwel sync` 拉取。

## 预期结果

- 上游分支含 canonical Artifact 更新
- 未直推共享默认分支（除非该远程 `directPush: true`）

## 排错

| 问题 | 处理 |
|------|------|
| 模块 Artifact 推送被拒 | 模块默认只读——用 `imwel propose` 做有意贡献，或在模板仓内改。 |
| 反向渲染冲突 | 多工具对同一 Artifact 内容不一致——先对齐磁盘内容再 push。 |
| 需要直推（仅个人远程） | `imwel remote set <alias> --direct-push`——绝不要作为团队默认。 |

## 关联

- [同步与处理漂移](./sync-and-drift.md)
- [作者与消费者](../explanation/author-vs-consumer.md)
- [命令 — push / propose](../reference/commands.md)
