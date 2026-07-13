## 1. VitePress 站点骨架

- [x] 1.1 扩展 `docs/.vitepress/config.ts`：为 `root`（en）与 `zh-CN` 配置平行的 `nav`/`sidebar`（架构、manifest、命令、示例模板、适配器贡献）
- [x] 1.2 在 `package.json` 增加 `docs:dev` / `docs:build`（或同等）脚本，确认本地可预览与构建
- [x] 1.3 更新 `docs/en/index.md` 与 `docs/zh-CN/index.md`：产品定位、快速开始、链向深度页

## 2. 核心指南页（英文 canonical）

- [x] 2.1 撰写 `docs/en/guide/architecture.md`（Git=DB、绑定粒度、history 仓、适配器角色、安全默认）
- [x] 2.2 撰写 `docs/en/guide/manifest.md`（字段表、示例 YAML、conventions/optional，对照 `src/core/manifest.ts` 与 `template-repository` 规格）
- [x] 2.3 撰写 `docs/en/guide/commands.md`（已实现命令参考；未实现能力不得写成可用）
- [x] 2.4 撰写 `docs/en/guide/example-template.md`（链接策略 / `templates/init` / 最小目录树；示例 URL 未定则占位）

## 3. 适配器扩展文档

- [x] 3.1 撰写 `docs/en/contribute/adapters.md`：Adapter 接口、类型边界、静态注册步骤、非插件说明、round-trip 与实现清单
- [x] 3.2 对照 `src/adapters/types.ts`、`index.ts` 与 `render-adapters` 规格核对文档，消除语义漂移
- [x] 3.3 按「文档优先」决策树评估是否需要极薄 `exports`/类型导出；若需要则仅导出已有适配器相关类型并在文档标注用途；若不需要则在 tasks 备注中记录「仅文档」结论
  - **结论（仅文档）：** 不增加 `package.json` `exports` 指向 `./adapters`。发布面保持 CLI（`bin` + `dist` + `templates`）；公开 `exports` 会扩大 npm 表面且易被当成应用 SDK。贡献者从仓库 `src/adapters/types.ts` 引用类型即可。已在 `docs/en/contribute/adapters.md` 与 zh-CN 对应页写明。

## 4. zh-CN 同步

- [x] 4.1 为第 2–3 节全部英文页创建平行 `docs/zh-CN/...` 译文（或页顶「待翻译」+ 英文链接，优先完整译文）
- [x] 4.2 核对两侧侧栏标签与内部链接在各自 locale 下可解析

## 5. 依赖占位与交叉引用

- [x] 5.1 在相关页面为 `oss-release-readiness`（安装/发布/贡献入口）添加交叉引用或待对齐标注，不虚构未落地流程
  - **已落地现状：** 文档交叉引用仓库 README、CONTRIBUTING、SECURITY、npm 安装与 Releases；不再使用「待对齐」占位。
- [x] 5.2 在相关页面为 `template-author-experience`（作者 Slash/lint 路径）添加交叉引用或待对齐标注，不把未实现 CLI 写成已有命令
  - **已落地现状：** `imwel lint`、`/imwel-author`、`template init` AI 资产、上下文检测均按当前实现写入 commands / template-authoring / example-template。
- [x] 5.3 视需要轻量更新根 `README.md` / `README.zh-CN.md` 的 Documentation 链接，指向新文档入口（不在此实现 author/CLI 硬化）

## 6. 验收

- [x] 6.1 本地 `docs:build`（或同等）成功，抽查 en/zh-CN 必达页可访问
- [x] 6.2 确认未改动内置适配器行为与消费侧 sync/push 逻辑；若有薄导出，跑现有测试仍通过
- [x] 6.3 对照 `docs-site` 与 `adapter-extensibility` 规格场景做一次清单勾选，确认本变更范围内无未标注的空洞承诺
