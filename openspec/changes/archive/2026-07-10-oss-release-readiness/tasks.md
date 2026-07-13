## 1. 确定公开仓库身份

- [x] 1.1 确认并记录真实的 GitHub `owner/repo`（及 HTTPS URL），作为本变更所有链接与 `package.json` 元数据的唯一来源
- [x] 1.2 若本地尚未配置 `origin`，在实现说明或 PR 描述中注明最终 URL，确保不会写入 `your-org`

## 2. 贡献、安全与变更日志

- [x] 2.1 新增根级 `CONTRIBUTING.md`（英文）：环境搭建、`npm run ci` / `check:i18n`、PR 约定、locales 与双语文档义务、链接到中文版
- [x] 2.2 新增根级 `CONTRIBUTING.zh-CN.md`：与英文版对等要点，并互链
- [x] 2.3 在 CONTRIBUTING（或成对 docs 页）中写入 **Releasing** 发布检查清单：`npm run ci` → 更新 CHANGELOG → bump version → tag → `npm publish`/CI；明确不在每次 main push 自动发包
- [x] 2.4 新增根级 `CHANGELOG.md`（Keep a Changelog + SemVer），包含 `Unreleased` 和/或 `0.1.0` MVP 摘要
- [x] 2.5 新增根级 `SECURITY.md`：负责任披露渠道（Security Advisories / 维护者联系方式），说明无后端 CLI 与供应链关注点

## 3. GitHub 社区模板

- [x] 3.1 新增 bug 报告 Issue 模板（`.github/ISSUE_TEMPLATE/`），含复现步骤、期望行为、环境字段
- [x] 3.2 新增功能请求 Issue 模板
- [x] 3.3 新增 `.github/pull_request_template.md`：摘要、测试计划、文档/i18n 核对提示

## 4. package.json 元数据

- [x] 4.1 为 `package.json` 添加 `repository`、`homepage`、`bugs.url`、非空 `keywords`（使用 1.1 的真实 URL）
- [x] 4.2 按需补充 `author` 等字段；不改动运行时依赖与无关发布面

## 5. 清除 your-org 占位并改进文档门面

- [x] 5.1 替换 `README.md` 与 `README.zh-CN.md` 中的 `your-org` 示例/链接
- [x] 5.2 替换 `docs/en/index.md` 与 `docs/zh-CN/index.md` 中的占位链接；保持双语一致
- [x] 5.3 替换 `templates/init/en` 与 `templates/init/zh-CN` 下 README、manifest 注释中的 `your-org` 文档 URL
- [x] 5.4 在用户可见路径（README、docs、`templates/init`）全文确认无 `your-org` 残留

## 6. 发布工作流（可选但推荐）

- [x] 6.1 若密钥/Trusted Publisher 可行：新增 `.github/workflows/publish.yml`，仅 `workflow_dispatch` 和/或 `v*` tag 触发；文档中说明所需 secret
- [x] 6.2 若暂不可配置发布凭证：跳过 6.1，但保留 CONTRIBUTING 中的清单，并在 PR/任务备注中标明后续启用条件

## 7. 验证

- [x] 7.1 确认未修改 `src/` CLI 行为代码（本变更仅文档/元数据/模板/工作流）
- [x] 7.2 确认 `openspec/specs/` 下既有七项产品能力文件未被改写需求语义
- [x] 7.3 抽查：CONTRIBUTING 互链、SECURITY 渠道、CHANGELOG 非空、`package.json` 元数据、GitHub 模板、占位符清理均满足 `oss-release` spec
- [x] 7.4 运行 `npm run ci` 确认现有构建/测试/i18n 检查仍通过
