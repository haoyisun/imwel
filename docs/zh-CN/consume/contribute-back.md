# 回馈上游

> **消费者路径 · 第 3/3 步** —— 前置：[安装模板](./quickstart.md)、[同步、漂移与回滚](./sync-and-drift.md)。

当你在本地改进了某条规则,把它送回上游让整个团队受益。上游贡献默认走**分支 + PR/MR**,绝不直接提交到共享分支。

## 推送本地改动

```bash
imwel push            # 反向渲染本地工具文件 → canonical，开分支 + PR/MR
```

`imwel push` 会对**每个**有安装路径的绑定工具做反向渲染回 canonical Artifact；canonical 内容冲突会使 push 失败,从而不发送任何有歧义的内容。见 [`imwel push`](../guide/commands.md#imwel-push)。

## 追踪贡献目标

```bash
imwel propose         # 选择一个 project/module，再新增或取消追踪
```

当你在本地新写规则/技能，或明确希望贡献订阅模块的编辑时，使用 `imwel propose`。已有追踪会预勾选；取消勾选只移除追踪记录。project tracking 会在 sync 安装匹配的上游 Artifact 后移除，module tracking 则持续到你主动取消。见 [`imwel propose`](../guide/commands.md#imwel-propose-file)。

> 这是**消费侧回馈路径**,与维护模板仓本身不同——后者见[作者路径](../author/quickstart.md)。

## 下一步

- 想改为维护自己的模板? → [作者路径](../author/quickstart.md)
- 完整选项参考 → [命令](../guide/commands.md)
