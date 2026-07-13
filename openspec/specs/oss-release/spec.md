## Purpose

Define repository-level open-source release readiness: bilingual contribution docs, changelog, security policy, GitHub templates, npm package metadata, placeholder cleanup, and a versioned publish checklist — without changing CLI product behavior.

## Requirements

### Requirement: 双语贡献指南
仓库根目录 SHALL 提供英文 `CONTRIBUTING.md` 与简体中文 `CONTRIBUTING.zh-CN.md`，二者互相链接；内容至少覆盖：开发环境搭建、常用脚本（`build`/`test`/`ci`/`check:i18n`）、分支与 PR 约定、CLI 用户可见字符串须走 locales、用户可见文档的双语义务，以及指向发布流程的说明。

#### Scenario: 贡献者打开英文贡献指南
- **WHEN** 贡献者打开仓库根目录的 `CONTRIBUTING.md`
- **THEN** 文件 SHALL 存在，SHALL 链接到 `CONTRIBUTING.zh-CN.md`，并 SHALL 说明如何本地运行 `npm run ci`

#### Scenario: 贡献者打开中文贡献指南
- **WHEN** 贡献者打开 `CONTRIBUTING.zh-CN.md`
- **THEN** 文件 SHALL 存在，SHALL 链接到 `CONTRIBUTING.md`，并 SHALL 包含与英文版对等的开发与 PR 要点（允许表述差异，不得遗漏关键义务）

### Requirement: 变更日志
仓库 SHALL 提供根级 `CHANGELOG.md`，采用 Keep a Changelog 风格与 SemVer 版本标题，并至少包含 `Unreleased` 节或已发布版本节之一，使读者能看到项目变更记录的起点。

#### Scenario: 读者查看变更历史
- **WHEN** 用户或贡献者打开 `CHANGELOG.md`
- **THEN** 文件 SHALL 存在且包含至少一个版本或 `Unreleased` 标题节

#### Scenario: 准备一次发布
- **WHEN** 维护者按发布清单准备新版本
- **THEN** 清单 SHALL 要求在 bump 版本与打 tag 之前更新 `CHANGELOG.md`

### Requirement: 安全政策
仓库 SHALL 提供根级 `SECURITY.md`，说明如何负责任地报告安全问题（优先 GitHub Security Advisories / Private Vulnerability Reporting，或明确的维护者联系方式），并说明本项目为无后端 CLI、关注点包含依赖与发布供应链。

#### Scenario: 发现潜在漏洞的报告者
- **WHEN** 报告者打开 `SECURITY.md`
- **THEN** 文件 SHALL 给出可执行的报告渠道，且 SHALL NOT 引导将漏洞细节发到公开 Issue 作为唯一途径

### Requirement: GitHub Issue 与 PR 模板
仓库 SHALL 在 `.github/` 下提供至少一种 bug 报告模板、一种功能请求模板，以及一份 Pull Request 模板；PR 模板 SHALL 要求摘要与测试计划，并提示核对文档/i18n 相关义务。

#### Scenario: 新建 Bug Issue
- **WHEN** 贡献者在 GitHub 上新建 Issue 并选择 bug 模板
- **THEN** 模板 SHALL 引导填写复现步骤、期望行为与环境信息（如 OS、Node、imwel 版本）

#### Scenario: 打开 Pull Request
- **WHEN** 贡献者创建指向默认分支的 PR
- **THEN** PR 描述 SHALL 预填模板内容，包含摘要与测试计划相关小节

### Requirement: npm 包元数据完备
`package.json` SHALL 包含足以支撑 npm 发现与 GitHub 关联的元数据：`repository`（含 type 与 url）、`homepage`、`bugs`（含 url）、以及非空的 `keywords` 数组；这些 URL SHALL 指向本项目的真实公开仓库，不得使用 `your-org` 占位。

#### Scenario: 检查 package.json 发布元数据
- **WHEN** 维护者或 CI 检查 `package.json`
- **THEN** `repository`、`homepage`、`bugs.url` 与 `keywords` SHALL 均已设置，且 URL 中 SHALL NOT 包含 `your-org`

### Requirement: 清除用户可见的 your-org 占位
所有面向用户的文档与脚手架中的 GitHub 链接/示例（至少包括根级双语 README、`docs/en` 与 `docs/zh-CN`、`templates/init/en` 与 `templates/init/zh-CN` 下的 README 与 manifest 注释）SHALL 使用真实的 `owner/repo`，SHALL NOT 保留 `your-org` 占位字符串。

#### Scenario: 全文检索占位符
- **WHEN** 在仓库中搜索字符串 `your-org`（排除本 OpenSpec 变更规划目录与归档历史若需保留原文）
- **THEN** 用户可见的 README、docs 与 `templates/init` 路径下 SHALL 无匹配项

#### Scenario: 脚手架生成的模板仓 README
- **WHEN** 用户运行 `imwel template init` 并查看生成的 README
- **THEN** 其中指向 imwel 项目的链接 SHALL 使用真实仓库 URL 而非 `your-org`

### Requirement: 版本化 npm 发布清单
仓库 SHALL 提供可遵循的发布检查清单（位于 CONTRIBUTING 的 Releasing 节，或成对的 en/zh-CN 文档页），步骤至少包括：运行 `npm run ci`、更新 `CHANGELOG.md`、bump `package.json` 的 `version`、创建 git tag、执行 `npm publish`（或通过已配置的 CI 发布）。

#### Scenario: 维护者准备发布
- **WHEN** 维护者打开发布检查清单
- **THEN** 清单 SHALL 按顺序列出上述步骤，并 SHALL 说明默认不在每次 `main` 推送时自动发包

#### Scenario: 可选的发布工作流
- **WHEN** 本变更包含 GitHub Actions 发布工作流
- **THEN** 该工作流 SHALL 仅由手动 `workflow_dispatch` 和/或推送版本 tag 触发，SHALL NOT 在每次默认分支 push 时发布

### Requirement: 不改变 CLI 产品行为
本能力的实现 SHALL 仅涉及仓库文档、元数据、GitHub 模板与发布流程资产；SHALL NOT 修改 `src/` 下 CLI 命令的用户可见行为，也 SHALL NOT 变更既有七项产品能力规格的需求语义。

#### Scenario: 实现完成后的行为回归边界
- **WHEN** 本变更的全部 tasks 完成
- **THEN** 既有 CLI 命令的行为与 `openspec/specs/` 下七项产品能力的需求条文 SHALL 保持不变（除文档中示例 URL 等非行为文本外）
