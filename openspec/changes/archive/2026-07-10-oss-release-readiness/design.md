## Context

MVP（`imwel-git-native-cli-mvp`）已归档，七项产品能力规格已在 `openspec/specs/`。仓库已有 MIT `LICENSE`、基础 CI（`npm run ci`）、双语 README 与极简 VitePress docs，但缺少开源社区与 npm 发包所需的门面资产：无根级 CONTRIBUTING / CHANGELOG / SECURITY、无 Issue/PR 模板、`package.json` 缺少 `repository`/`homepage`/`bugs`/`keywords`，且 README、docs、`templates/init` 中仍大量使用 `github.com/your-org/imwel` 占位。

本变更只做「仓库治理 + 发布就绪」，不改 CLI 运行时。真实 GitHub remote 尚未写入本地 `.git/config`；实现时以最终绑定的 `owner/repo` 替换所有占位 URL。

## Goals / Non-Goals

**Goals:**
- 让外部贡献者能按文档完成 fork → 开发 → PR，并知道如何报告安全问题。
- 让 npm 包页具备可发现元数据，且发布过程可重复、可检查。
- 清除用户可见文档与脚手架中的 `your-org` 占位，双语保持同步。
- 用一份能力规格 `oss-release` 覆盖上述门面与发布约定，便于归档进主 specs。

**Non-Goals:**
- 不实现新产品功能（`author`、`--yes`、新 adapter、`lint` 等属其他变更）。
- 不修改 `src/` 下 CLI 行为或既有七项产品能力的需求语义。
- 不引入后端、账号系统或自定义权限模型。
- 不强制在本变更内完成首次真实 `npm publish`（只要求清单/工作流就绪；是否立刻发包由维护者决定）。
- 不建设完整文档站内容树（仅修门面链接与占位；深度文档属后续）。

## Decisions

### 1. 单一能力 `oss-release`，不拆多 capability
贡献指南、changelog、安全政策、GitHub 模板、package 元数据、占位清理、发布清单同属「开源/发包就绪」横切面，拆成多个 capability 只会增加归档噪音且无独立演进需求。
- *备选*：拆 `oss-docs` / `npm-publish` → 拒绝；当前无分轨维护理由。

### 2. 文档双语策略：根级成对文件 + 顶栏互链
- `CONTRIBUTING.md`（英文 canonical）+ `CONTRIBUTING.zh-CN.md`，互相链接（对齐 README 约定）。
- `CHANGELOG.md`、`SECURITY.md` 以英文为主（全球 OSS / npm 惯例）；`SECURITY.md` 可含简短中文摘要或指向中文贡献指南中的「安全」小节，避免维护两份易漂移的安全政策全文。
- README / docs / `templates/init` 的占位替换必须 en 与 zh-CN 同变更完成。

### 3. GitHub URL 单一来源约定
引入常量式约定：所有用户可见链接使用同一 `owner/repo`（实现时写入真实值，例如维护者的 GitHub 路径）。替换范围至少包括：
- `README.md` / `README.zh-CN.md` 示例 remote
- `docs/en/index.md` / `docs/zh-CN/index.md`
- `templates/init/en|zh-CN/README.md` 与 `manifest.yaml` 注释中的文档 URL
- `package.json` 的 `repository.url` / `homepage` / `bugs.url`

不在代码里做运行时 URL 配置；本变更是静态文件替换。

### 4. `package.json` 元数据最小完备集
必填：`repository`（type+url）、`homepage`、`bugs.url`、`keywords`（如 `cli`、`ai`、`cursor`、`claude-code`、`git`、`agents`）。
可选：`author`（若维护者身份已公开）。不为此引入新依赖或改 `files`/`bin` 发布面（除非发现明显遗漏且与发包相关）。

### 5. GitHub 模板：Issue 两类 + PR 一份
- `.github/ISSUE_TEMPLATE/bug_report.yml`（或 `.md`）与 `feature_request.yml`
- `.github/pull_request_template.md`：要求摘要、测试计划、文档/i18n 勾选（与 AGENTS 双语义务对齐）
- 不强制 CODEOWNERS / Discussion 模板（YAGNI）；需要时后续再加。

### 6. 发布：清单优先，工作流可选且保守
- 根级或 `docs/` 旁提供 **Release checklist**（可放在 `CONTRIBUTING` 的「Releasing」节，或独立 `docs/en/releasing.md` + zh-CN；倾向放进 CONTRIBUTING 以减少文件数）。
- 清单步骤至少：`npm run ci` → 更新 CHANGELOG → bump `package.json` version → git tag → `npm publish`（或 CI 代发）。
- 可选 `.github/workflows/publish.yml`：`workflow_dispatch` 和/或 `push` tags `v*`；使用 npm Trusted Publishing 或 `NPM_TOKEN` secret。默认不在 `main` 每次 push 自动发包。
- *备选*：仅文档清单、无 Actions → 可接受为 MVP；若实现成本低则加上手动触发工作流。

### 7. CHANGELOG 格式
采用 [Keep a Changelog](https://keepachangelog.com/) + SemVer 标题。首个条目可为 `## [Unreleased]` 与/或 `## [0.1.0]` 概括 MVP 能力，避免空文件。

## Risks / Trade-offs

- **[Risk]** 真实 `owner/repo` 未定时写错链接 → **Mitigation**：tasks 第一步确认 remote/公开 URL；若暂未公开，用明确 TODO 阻塞 publish 工作流中的 URL，但不得留下 `your-org`。
- **[Risk]** SECURITY 渠道无人值守 → **Mitigation**：写明首选 GitHub Security Advisories（若启用）或维护者邮箱；无后端不意味着无供应链风险（依赖/发布凭证）。
- **[Risk]** 自动 publish 误发 → **Mitigation**：仅 tag 或 `workflow_dispatch`；禁止对每个 main commit 发布。
- **[Trade-off]** SECURITY/CHANGELOG 仅英文 → 接受；降低漂移，CONTRIBUTING 中文版可指向它们。

## Migration Plan

1. 确认并固定公开仓库 URL。
2. 添加社区/安全/changelog/贡献文档与 GitHub 模板。
3. 补全 `package.json` 元数据；全文替换 `your-org` 占位。
4. 写入发布清单；按需添加 publish workflow。
5. 回滚：删除新增文件并还原元数据/链接即可；无数据迁移、无用户本地状态影响。

## Open Questions

- 公开仓库的最终 `owner/repo` 字符串（实现前必须确定）。
- 是否在本变更启用 GitHub Private Vulnerability Reporting / Security Advisories（倾向：在 SECURITY.md 写启用后的路径，并在 GitHub 设置中打开）。
- publish workflow 是否本变更必做，还是「清单必做、workflow 可选」→ **倾向清单必做；workflow 若密钥/Trusted Publisher 未就绪可先提交 workflow 文件但文档标明需配置 secret**。
