# 为 imwel 做贡献

[English](CONTRIBUTING.md)

感谢参与贡献。imwel 是通过 npm 分发的 Git 原生 CLI（无后端）。较大改动前请阅读 [`AGENTS.md`](AGENTS.md) 中的架构约束。

## 开发环境

```bash
git clone https://github.com/haoyisun/imwel.git
cd imwel
npm install
npm run build
npm run ci
```

常用脚本：

| 脚本 | 用途 |
|------|------|
| `npm run build` | 编译 TypeScript 到 `dist/` |
| `npm test` | 单元测试 |
| `npm run check:i18n` | 检查 `en` / `zh-CN` 文案键一致 |
| `npm run ci` | `build` + `check:i18n` + `test` |
| `npm run e2e` | 端到端走查 |
| `npm run dev -- <cmd>` | 用 `tsx` 运行 CLI（如 `npm run dev -- doctor`） |

要求：Node.js `>=18.18`，系统 `PATH` 上有 `git`。

## Pull Request

1. 分支尽量聚焦，一个 PR 解决一类问题。
2. 在本仓库工作流中，功能/行为变更优先走 OpenSpec（`.cursor/skills/openspec-*`）。
3. 填写 PR 模板（摘要、测试计划、文档/i18n 核对）。
4. 不要提交密钥（`.env`、token、凭证等）。

## CLI 文案与文档

- **用户可见 CLI 字符串**（提示、错误、帮助）必须走 `src/locales/`（`en` + `zh-CN`），禁止在命令处理里硬编码。
- **用户可见文档**：英文为 canonical；同变更更新 `zh-CN`，或留下可跟踪的 TODO。保持 `README.md` ↔ `README.zh-CN.md` 互链。
- 行为/文档变更结束后，按 `.cursor/skills/imwel-change-docs-checklist/` 核对。

## 发布（Releasing）

维护者向 npm 发布带版本号的包。**不要**在每次推送到 `main` 时自动发包。

检查清单（按顺序）：

1. 确认 `main` 通过：`npm run ci`（相关时再跑 `npm run e2e`）。
2. 更新 [`CHANGELOG.md`](CHANGELOG.md)（将 `Unreleased` 内容移入新版本节）。
3. 按 SemVer 修改 `package.json` 的 `version`。
4. 提交、推送，并打 annotated tag：`vX.Y.Z`（如 `v0.1.0`）。
5. 发布：
   - 本地：`npm publish`（需 npm 登录），或
   - CI：推送 `v*` tag，或在 **Actions → Publish to npm → Run workflow** 手动触发（见 [`.github/workflows/publish.yml`](.github/workflows/publish.yml)）。需要仓库 secret `NPM_TOKEN`（或在 npm 配置 Trusted Publisher）。

在配置好 `NPM_TOKEN` / Trusted Publisher 之前，可按清单打 tag 后在本地执行 `npm publish`。

## 安全

见 [`SECURITY.md`](SECURITY.md)。未公开的漏洞请勿只开公开 Issue。
