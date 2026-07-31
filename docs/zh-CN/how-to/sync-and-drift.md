# 如何同步与处理漂移

想拉上游模板更新，又不想丢掉（或被静默覆盖）本地手改？

**你将得到：** 显式的 sync 预览、需要时的 Git 合并/冲突标记，以及从隐藏 history 仓回滚——绝不会悄悄覆盖。

## 前置

- 已有消费者绑定（`.imwel/binding.yaml`），见[为 Cursor 消费渲染](./consume-for-cursor.md) 或 [Claude Code](./consume-for-claude-code.md)

## 步骤

### 1. 查看状态

```bash
imwel status
```

始终强制刷新绑定（及待处理 propose）相关远程。

### 2. 拉取上游

```bash
imwel sync
```

查看增删改列表后确认。非交互：

```bash
imwel sync --yes
```

### 3. 若出现冲突标记

手工编辑去掉 `<<<<<<<` / `=======` / `>>>>>>>`，然后：

```bash
imwel sync --continue
```

### 4. 撤销一次糟糕的 sync（可选）

```bash
imwel rollback
```

恢复 `.imwel/history/` 中的先前提交，并删除之后新增的**受管**文件——从不碰未托管文件。

## 预期结果

- 工具原生文件与模板一致（外加已合并的本地改动）
- `imwel status` 干净，或清楚列出剩余漂移
- 已与 binding 匹配的项目贡献追踪会毕业（移除）；保留的模块追踪会刷新基线，避免被动「proposal 更新」在 tip 未再前进时反复提示

## 被动远程提示

普通 CLI 命令可能提示远程分支 tip 已移动（默认节流约 **2 小时**）。该提示只比较**远程提交**——不会同步文件，也不表示本地手改被覆盖。成功 sync 后，保留的 proposal 基线会随 binding tip 前进。可用 `IMWEL_FETCH_THROTTLE_MS` 覆盖间隔。

## 修复规则健康发现

`imwel status` 还会对受管的渲染文件跑一次确定性规则健康检查。发现为建议性（绝不改变退出码）。按如下修复：

| 发现 | 含义 | 修复 |
|------|------|------|
| `[empty]` | 某受管规则为空或仅占位 | 补实质内容，或从模板中移除该规则 |
| `[dead-import]` | 某个 `@path` import 无法解析 | 修正 import 路径，或恢复被引用文件 |
| `[orphan-ref]` | 某反引号路径（如 `` `src/foo.ts` ``）指向已缺失文件 | 更新或移除引用，或恢复该文件 |

若需更深语义核查（规则↔代码不匹配、规则↔规则冲突、缺失规则），运行 `/imwel-audit`——见[使用第一方 skill](./use-first-party-skills.md)。

## 排错

| 问题 | 处理 |
|------|------|
| sync 留下冲突标记 | 手工解决 → `imwel sync --continue`。 |
| 在模板仓里 status「很干净」 | 你不在消费者绑定里——那里用 `imwel lint`。 |
| CI 需要选择 | 传 `--tools`、`--remote`、`--branch`、`--project` 与 `-y`。 |

## 关联

- [经 PR 回推上游](./push-via-pr.md)
- [漂移与 history（为什么）](../explanation/drift-and-history.md)
- [命令](../reference/commands.md)
