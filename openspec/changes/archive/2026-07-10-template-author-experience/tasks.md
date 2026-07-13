## 1. 仓库类型检测

- [x] 1.1 实现共享 `detectImwelContext(cwd)`（向上查找 `.imwel/`，判定 `template` / `consumer` / `neither` / `ambiguous`，返回所用根路径）
- [x] 1.2 为检测补充单元测试：四种结果、嵌套祖先、同层同时存在 manifest+binding

## 2. `imwel lint` 引擎与 CLI

- [x] 2.1 实现模板仓 lint：manifest 可解析与 `projects`/`path` 有效性；skill 缺 `SKILL.md`；路径越出约定 → **error**
- [x] 2.2 实现风格/最佳实践检查（description 可触发性、长度等，对齐 Cursor/agentskills 指导）→ **warning**；支持 `--strict`
- [x] 2.3 注册 `imwel lint` 命令：打印逐步检查进度、可操作错误信息；`neither`/`ambiguous`/非模板根非 0 退出；`consumer` 打印「请在模板仓运行」指引且非 0（不做满量模板校验）；默认 warning 不失败
- [x] 2.4 将 lint/detect 相关用户可见字符串写入 `src/locales/en.ts` 与 `zh-CN.ts`（禁止硬编码）
- [x] 2.5 为 lint 的 error/warning/`--strict`/错误上下文补充测试

## 3. 脚手架注入作者向 AI 资产

- [x] 3.1 在 `templates/init/en/` 与 `templates/init/zh-CN/` 增加根级作者向 `AGENTS.md`（先读 manifest、约定路径、PR 走宿主）
- [x] 3.2 在两套 locale 脚手架中增加 `.cursor/rules`（短约束：manifest 优先、勿发明方言）
- [x] 3.3 增加 `.cursor/skills` 与 `.cursor/commands`：主入口 `/imwel-author`（检测上下文 → 加载 template/consumer pack → 引导任务）；可选 `/imwel-lint` 薄封装调用 `imwel lint`
- [x] 3.4 确认 `imwel template init` 复制逻辑包含上述新文件，且不破坏现有示例 project / README / CONTRIBUTING
- [x] 3.5 对目标目录已存在的同名 `.cursor`/`AGENTS.md` 采用跳过或确认策略（与 design 一致），并有简短日志

## 4. 配置包内容（template vs consumer）

- [x] 4.1 编写 template-author pack 文案：先读 manifest、按 conventions 增改、验收跑 lint、贡献用模板仓自身分支+PR
- [x] 4.2 编写 consumer pack 文案：`sync`/`status`/drift、回馈用 `propose`/`push`、禁止当模板仓改 manifest
- [x] 4.3 在 neither/ambiguous 桩中写明检测结果与下一步（init / 打开模板仓根等），禁止静默套错包

## 5. 文档

- [x] 5.1 更新 `README.md` 与 `README.zh-CN.md`：作者主路径=克隆模板仓+Slash Commands；CLI lint 为引擎；propose/push 为消费侧回馈
- [x] 5.2 更新 `docs/en` 与 `docs/zh-CN` 对应页面（或新增作者工作流短页）：检测、lint 质量条、Cursor 优先与其他工具后续路径
- [x] 5.3 在脚手架 `README`/`CONTRIBUTING`（en + zh-CN）中增加「如何用 AI/Slash 在本仓增改 Artifact」短节

## 6. 可选与收尾

- [x] 6.1 （可选，tasks 过胖则跳过）薄 `imwel new skill|rule`：仅在 `template` 上下文生成约定内骨架，验收仍靠 `imwel lint` — **SKIPPED**（Slash Command / skill 指引已覆盖骨架生成；验收靠 `imwel lint`）
- [x] 6.2 扩展 `imwel doctor` 或 lint 帮助文本，交叉引用作者工作流（保持简短）
- [x] 6.3 运行 `npm run ci`；必要时补 e2e：`template init` 后目录含作者资产且 `imwel lint` 对干净骨架通过
- [x] 6.4 核对未引入后端/新 Git 实现/竞争 Artifact 方言；源码标识与注释为英文
