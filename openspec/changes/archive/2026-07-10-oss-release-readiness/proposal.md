## Why

MVP 功能已落地并归档，但仓库尚不具备可对外开源与 npm 正式发包的「门面」质量：缺少 CONTRIBUTING / CHANGELOG / SECURITY、`package.json` 发布元数据不完整、GitHub Issue/PR 模板缺失、文档与脚手架中仍残留 `your-org` 占位符，也没有可重复执行的版本发布清单或工作流。现在补齐这些，是为了让外部贡献者与 npm 用户能信任、发现并参与本项目，而不引入任何新产品功能。

## What Changes

- 新增面向贡献者的双语文档：`CONTRIBUTING.md` + `CONTRIBUTING.zh-CN.md`（开发环境、分支/PR 约定、测试与 i18n 检查、文档双语义务）。
- 新增 `CHANGELOG.md`（Keep a Changelog 风格），记录已发布与未发布变更；首版可从 MVP 起笔。
- 补全 `package.json` 发布元数据：`repository`、`homepage`、`bugs`、`keywords`（及必要时 `author`/`funding` 等），使 npm 页面与 GitHub 发现可用。
- 新增 GitHub 社区模板：Issue（bug / feature）、Pull Request template；可选 CODEOWNERS 或简单的讨论指引（不强制）。
- 新增 `SECURITY.md`：安全漏洞报告渠道与响应预期（无后端，范围以 CLI/供应链为主）。
- 改进双语文档：README / docs 站点去掉或替换 `your-org` 占位；脚手架 `templates/init/**` 中的文档链接同步修正；docs 首页与 README 交叉链接保持一致。
- 新增发布就绪材料：版本 bump + changelog + `npm publish` 的检查清单；可选 GitHub Actions 发布工作流（tag 触发或手动 `workflow_dispatch`），与现有 CI 互补、不替代。
- 明确本变更**不**实现产品功能（如 `author`、`--yes`、新 adapter 等），**不**改动 CLI 运行时行为与既有能力规格的需求语义。

## Capabilities

### New Capabilities
- `oss-release`: 开源与 npm 发布就绪——贡献指南、变更日志、安全政策、GitHub 社区模板、`package.json` 元数据、占位符清理、双语文档门面，以及版本化 npm 发布的检查清单/工作流约定。

### Modified Capabilities
（无 — 不改变 `openspec/specs/` 下既有七项产品能力的需求；仅仓库治理与发布门面）

## Impact

- 新增/编辑仓库根与 `.github/` 下的文档与模板文件；可能新增 `.github/workflows/publish.yml`（或等价发布工作流）。
- 编辑 `package.json` 元数据字段；不新增运行时依赖。
- 编辑 `README.md` / `README.zh-CN.md`、`docs/en/`、`docs/zh-CN/`、`templates/init/en|zh-CN/` 中的占位 URL 与文档交叉引用。
- 不影响：`src/` CLI 逻辑、既有产品命令行为、`openspec/specs/` 下七项能力的需求条文。
- 前置假设：仓库将绑定真实 GitHub remote（替换所有 `your-org/imwel`）；具体 org/repo 名在实现时写入，设计中给出占位替换规则。
