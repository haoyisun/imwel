## 1. 非交互基础设施与 locales

- [x] 1.1 在 `src/cli.ts` 为 `init` / `sync` / `push` / `propose` / `rollback` 增加 `--yes`/`-y`，并将选项传入对应 command handler
- [x] 1.2 为非交互必填参数增加 flags（建议：`init` 的 `--tools`、`--remote`、`--branch`、`--project`、`--optional`/`--no-optional`；`propose` 的 `--remote`、`--project`、`--type`、`--optional`、`--tool`；`rollback` 的 `--to <sha>`；`push` 的候选选择策略如 `--all`）
- [x] 1.3 在 `src/locales/en.ts` 与 `zh-CN.ts` 增加缺参、将删除文件摘要、多工具 canonical 冲突、propose 路径校验失败等用户可见字符串
- [x] 1.4 抽取小的「非交互缺参则失败」辅助（仅在第二处调用点出现后再抽），统一非零退出与错误文案

## 2. init / sync / push / propose / rollback 非交互路径

- [x] 2.1 实现 `imwel init`：完整 flags 时跳过选择提示；已有绑定须 `--yes` 才覆盖；缺参失败
- [x] 2.2 实现 `imwel sync --yes`：跳过应用确认；有未解决冲突时仍失败并提示 continue 流程
- [x] 2.3 实现 `imwel push` 非交互：在提供候选选择策略与 `--yes` 时跳过确认；默认不自动创建 PR（只打印 compare URL）
- [x] 2.4 实现 `imwel propose` 非交互：必填 flags 齐全才登记；缺参失败
- [x] 2.5 实现 `imwel rollback --to <sha> --yes`：跳过提交选择与删除确认

## 3. Rollback 删除多余管理文件

- [x] 3.1 扩展 `restoreToCommit`（或并列辅助）：对比目标 history 提交与当前管理路径，checkout 恢复后删除「管理集合内但不在该提交中」的文件
- [x] 3.2 删除前打印路径摘要；交互确认或尊重 `--yes`
- [x] 3.3 rollback 后收敛 `.imwel`（history 指针；若制品集合缩小则更新 `artifacts` / installed paths 与磁盘一致）
- [x] 3.4 验收：未管理文件不被删除；恢复点之后 sync 新增的管理文件被删除

## 4. 全局 fetch 节流环境变量

- [x] 4.1 在 `remote-cache.ts` / `passive-check.ts`（或单一读配置点）解析 `IMWEL_FETCH_THROTTLE_MS`：有效正整数则覆盖默认 4h，非法则回退默认
- [x] 4.2 确认 `sync`/`status` 的 force 刷新仍不受节流影响
- [x] 4.3 不实现每远程节流配置；必要时在代码注释或 docs 注明延期

## 5. Push 多工具反向渲染

- [x] 5.1 修改 `collectEditCandidates`：遍历制品上所有有 `installedPaths` 的绑定工具并分别 `parseExisting`
- [x] 5.2 合并各工具 `targetOverrides`；多工具 canonical 正文不一致时失败并本地化报错
- [x] 5.3 验收：仅 `tools[0]` 有脏文件、或非首工具有脏文件时均能正确纳入 push

## 6. Propose 的 manifest 路径校验

- [x] 6.1 在登记前读取目标 remote manifest，用 `resolveConventions` 得到 effective conventions
- [x] 6.2 按 type 校验本地路径是否落在 `rulesDir` / `skillsDir` / `agentsFile` 等约定内；失败则拒绝登记
- [x] 6.3 校验通过后保持「只写 pending、不 Git」语义；与非交互 flags 共用同一校验路径

## 7. 测试与文档

- [x] 7.1 为 rollback 删文件、多工具 parse、throttle env、propose 校验、非交互缺参/成功路径补充单元或集成测试
- [x] 7.2 更新英文 README/docs 中消费侧非交互用法、`IMWEL_FETCH_THROTTLE_MS`、rollback/push 行为说明
- [x] 7.3 同步更新 zh-CN 对应文档（或显式标记待译 TODO，不得让英文静默超前）
