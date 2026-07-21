# 同步、漂移与回滚

> **消费者路径 · 第 2/3 步** —— 前置：[安装模板](./quickstart.md)。

绑定之后,让已安装的 Artifact 与上游保持一致,并在发生偏离时干净地恢复。[漂移](../concepts/glossary.md)是远程模板、上次同步与本地磁盘文件之间的偏离——经 Git 检测。

## 拉取上游更新

```bash
imwel sync            # 预览新增/删除/修改的文件，再确认
```

不重叠的本地改动与上游改动会自动合并；重叠处写入标准 Git 冲突标记（`<<<<<<<` / `=======` / `>>>>>>>`）供你手工解决,然后：

```bash
imwel sync --continue
```

## 随时查看状态

```bash
imwel status          # 远程与本地漂移 + 确定性规则健康检查
```

`imwel status` 始终强制刷新,并额外运行建议性的**规则健康**检查（空壳规则、死链导入、孤儿路径引用）—— 只是线索,不阻断。见 [`imwel status`](../guide/commands.md#imwel-status)。

## 撤销不想要的更新

```bash
imwel rollback        # 从 .imwel/history/ 恢复到先前状态
```

回滚会恢复到某个 history 提交,并**删除该点之后新增的管理文件**——从不动未管理文件。见 [`imwel rollback`](../guide/commands.md#imwel-rollback)。

## 故障排查

| 现象 | 处理 |
|------|------|
| `imwel sync` 留下冲突标记 | 手工解决 `<<<<<<<`/`=======`/`>>>>>>>` 标记,再 `imwel sync --continue`。 |
| 在模板仓里 `imwel status` 报了假的"干净"结果 | 你在模板仓而非消费绑定——改用 `imwel lint`。 |
| CI 中命令需要输入 | 传入所需选择 flag（`--tools`、`--remote`、`--branch`、`--project`）与 `-y`。 |

## 下一步

- 把本地改进反馈上游 → [回馈上游](./contribute-back.md)
