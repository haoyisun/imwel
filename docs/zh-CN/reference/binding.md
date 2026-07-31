# 绑定参考

imwel 的消费端由 `.imwel/` 下两个本地文件记录：

- `binding.yaml` —— 本目录**已安装并托管**的内容
- `pending-proposals.yaml` —— 本目录**被授权回推上游**的内容

两者都由 imwel 命令维护，通常无需手编。本页记录其结构，方便你阅读它们（及 `imwel binding show` / `--json`）。

> **模板**侧请见 [Manifest](./manifest.md)。

## `.imwel/binding.yaml`

```yaml
remote: team                          # `imwel remote add` 登记的别名
branch: main                          # 跟踪的模板分支
projects:                             # 至多一个可写（linked）+ 任意多个只读（subscribed）
  - name: app                         # manifest 项目名
    mode: linked                      # linked = 可写；subscribed = 只读 module
  - name: shared-lib
    mode: subscribed
    frozen: true                     # subscribed module：sync 跳过，保留本地副本
tools:                               # 接收渲染产物的 AI 工具 id
  - cursor
  - claude-code
lastSyncedCommit: 1a2b3c4d            # 上次成功 sync 记录的远程提交
lastSyncedHistoryCommit: 9e8f7a6b     # 上次 sync 时 .imwel/history/ 的提交
artifacts:                           # 受管 Artifact（每个 canonical Artifact 一条）
  - sourcePath: rules/app.md         # 模板项目内的 canonical 路径
    project: app                     # 来源 manifest 项目
    type: rule                       # rule | skill | agents
    optional: false                  # 安装时是否可选
    localEdit: false                # imwel 检测到本地手改（相对 history）
    installedPaths:                  # 各工具的落盘渲染产物
      cursor:
        - .cursor/rules/app.mdc
      claude-code:
        - .claude/rules/app.md
    targetOverrides:                 # 可选的按工具渲染 overlay
      cursor:
        description: App 编码规则
```

### 字段

| 字段 | 含义 |
|------|------|
| `remote` | 经 `imwel remote add` 登记的别名。绝不存裸 URL。 |
| `branch` | 本绑定跟踪的模板分支。 |
| `projects[]` | 绑定的项目。`mode: linked` 为可写项目（至多一个）；`mode: subscribed` 为只读 module。 |
| `projects[].frozen` | 仅 subscribed module——为 true 时 `sync` 跳过它、保留本地副本。 |
| `tools[]` | 接收渲染产物的工具 id（如 `cursor`、`claude-code`、`codex`、`trae`）。 |
| `lastSyncedCommit` | 上次成功 `sync` 记录的远程提交 SHA——用于漂移比较。 |
| `lastSyncedHistoryCommit` | 上次 sync 时 `.imwel/history/` 的提交——用于回滚。 |
| `artifacts[]` | 每个受管 canonical Artifact 一条。 |
| `artifacts[].sourcePath` | 模板项目内的 canonical 路径（POSIX、项目相对）。 |
| `artifacts[].project` | 该 artifact 来源的 manifest 项目。 |
| `artifacts[].type` | `rule`、`skill` 或 `agents`。 |
| `artifacts[].optional` | 安装时是否为可选 Artifact。 |
| `artifacts[].localEdit` | 落盘渲染文件与 `.imwel/history/` 不一致时为 true。 |
| `artifacts[].installedPaths` | 按工具 id 列出渲染产物。`sync`/`status`/`push` 据此寻址。 |
| `artifacts[].targetOverrides` | 可选的按工具 overlay，渲染时展开。 |

### 旧版结构

旧绑定用单个 `project: <name>` 字符串而非 `projects[]`。imwel 读取时归一化为 `projects: [{ name, mode: 'linked' }]`，旧绑定无需迁移即可继续工作。

## `.imwel/pending-proposals.yaml`

贡献跟踪——本目录可回推上游的本地来源。与绑定分离；移除记录绝不删除或编辑本地 Artifact。

```yaml
version: 2
proposals:
  - localPath: .cursor/rules/arkts-hooks.mdc   # 工具原生源文件
    sourceFiles: [.cursor/rules/arkts-hooks.mdc]
    sourceId: cursor:arkts-hooks                # 适配器发现 slug
    remote: team                                # 目标远端别名
    project: app                                # 目标 manifest 项目
    targetRole: project                         # project | shared
    type: rule
    canonicalPath: rules/arkts-hooks.md         # 推导出的模板内目标路径
    optional: false
    tool: cursor                                # 反向渲染的源工具适配器
    baseBranch: main                            # 跟踪确认时记录的基线分支
    baseCommit: 1a2b3c4d                        # 远程更新比较的基线提交
    pushed:                                     # 成功 push 后出现
      branch: update-arkts-hooks
      commit: 5f6e7d8c
```

### 字段

| 字段 | 含义 |
|------|------|
| `version` | 结构版本（当前 `2`）。 |
| `proposals[].localPath` | 被跟踪的工具原生源文件。 |
| `proposals[].sourceFiles` | 贡献该 artifact 的全部源文件。 |
| `proposals[].sourceId` | 适配器发现 slug；区分同一共享文件里的多个逻辑 artifact。 |
| `proposals[].remote` / `project` | 单一目标远端 + manifest 项目。 |
| `proposals[].targetRole` | `project`（可写）或 `shared`（只读 module）。 |
| `proposals[].type` | `rule`、`skill` 或 `agents`。 |
| `proposals[].canonicalPath` | 推导出的模板项目内目标路径。 |
| `proposals[].optional` | 目标 artifact 是否可选。 |
| `proposals[].tool` | 反向渲染（把工具原生文件转回 canonical 形态）所用的源工具适配器。 |
| `proposals[].baseBranch` / `baseCommit` | 跟踪确认时记录的基线；`status` 据此比较目标分支。 |
| `proposals[].pushed` | 成功 `push` 后：Git 分支与提交 SHA。 |

### 生命周期

- **项目跟踪** push 后保留，待同一 canonical Artifact 被 `sync` 装进项目绑定后由 sync 移除。
- **Module 跟踪** 在 push/sync 间持久存在，直到你在 `imwel propose` 中取消勾选。

## 关联

- [命令 — binding show / propose / push](./commands.md)
- [Manifest（模板侧）](./manifest.md)
- [同步与处理漂移](../how-to/sync-and-drift.md) · [经 PR 回推上游](../how-to/push-via-pr.md)
