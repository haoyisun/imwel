## ADDED Requirements

### Requirement: Propose validates against manifest conventions
在将候选写入本地 pending 登记之前，`imwel propose` SHALL 读取目标 remote 的 manifest，解析目标 project 的 effective conventions（`rulesDir`、`skillsDir`、`agentsFile` 等），并校验所给本地文件路径与所选制品类型是否符合该约定。校验失败时 CLI SHALL 拒绝登记，打印说明违反了哪条约定，且 SHALL NOT 写入 pending proposal。校验通过后的行为仍与既有「只登记、不执行 Git」语义一致。

#### Scenario: Propose rejects path outside conventions
- **WHEN** 用户对目标 project 运行 `imwel propose`，所选 type 为 rule，但文件路径不在该 project effective `rulesDir` 约定之下
- **THEN** CLI SHALL 拒绝登记并说明路径不符合 manifest conventions，且本地 pending proposals 不变

#### Scenario: Propose accepts path matching conventions
- **WHEN** 用户提出的文件路径与所选 type 匹配目标 project 的 effective conventions，并完成其余必填输入
- **THEN** CLI SHALL 登记该候选且 SHALL NOT 创建 branch、commit 或 push

## MODIFIED Requirements

### Requirement: Reverse-rendering before contribution
在提交 push 之前，CLI SHALL 使用相关 adapter 的 `parseExisting`，将每个候选（已编辑的托管制品，或 propose 的新制品）反向渲染为规范的 `agents.md` 风格内容以及 `targetOverrides`。对于已绑定多个目标工具的托管制品，CLI SHALL 对**每一个**在该制品上有安装路径的绑定工具分别调用对应 adapter 的 `parseExisting`，并将各工具的 `targetOverrides` 合并进候选；SHALL NOT 仅使用 `binding.tools` 中的第一个工具。若多个工具解析出的 canonical 正文不一致，CLI SHALL 失败并报告不一致，SHALL NOT 静默选用其中一份正文。

#### Scenario: Reverse-rendering an edited Cursor rule
- **WHEN** 为 Cursor 渲染的托管 rule 制品存在本地编辑且被纳入 push
- **THEN** CLI SHALL 在写入模板仓库项目目录之前，将编辑后的 `.mdc` 转回规范 Markdown 以及 Cursor 的 `targetOverrides`

#### Scenario: Reverse-rendering covers all bound tools
- **WHEN** 某托管制品同时为 Cursor 与另一绑定工具安装了渲染文件，且至少一侧有本地编辑并被纳入 push
- **THEN** CLI SHALL 对两个工具都执行 `parseExisting`，并在写入模板仓前保留两者的 `targetOverrides`

#### Scenario: Conflicting canonical content across tools fails the push
- **WHEN** 同一制品在两个绑定工具上的渲染文件经 `parseExisting` 得到的 canonical 正文不同
- **THEN** CLI SHALL 以非零退出码失败并说明冲突，且 SHALL NOT 推送该候选
