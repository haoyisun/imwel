# 如何建立模板仓库

想要一个团队当作 AI 规则/技能唯一真相源的普通 Git 仓——又不想自建平台？

**你将得到：** 含 `.imwel/manifest.yaml` 与示例项目的模板仓。

> [!IMPORTANT]
> 推荐选择 lint 钩子，让每次 clone 仍能守住质量条。

## 前置

- [安装 imwel](./install.md)（或使用 `npx`）
- 准备好分享时推送的宿主（GitHub / GitLab / Gitea / …）

## 步骤

### 1. 脚手架

```bash
npx @culock/imwel@latest template init --dir ./my-templates --name my-templates --locale zh-CN
```

按提示操作即可。若问到 lint 自动化，建议接受：会写入 `.githooks/pre-commit` 跑 `imwel lint`。

非交互：

```bash
npx @culock/imwel@latest template init --dir ./my-templates --name my-templates --locale zh-CN -y
```

### 2. 看一眼目录

```
my-templates/
  .imwel/manifest.yaml
  example-project/
    agents.md
    rules/example-rule.md
    skills/example-skill/SKILL.md
  AGENTS.md
  README.md
```

### 3. 用普通 Git 提交并发布

```bash
cd my-templates
git init -b main
git add .
git commit -m "initial template"
git remote add origin git@github.com:YOUR_ORG/my-templates.git
git push -u origin main
```

发布**不是** imwel 命令——就是正常的 `git push`。

## 预期结果

- 在模板根目录跑 `imwel lint` 可通过（或仅有风格类警告）
- 同事可 `imwel remote add` 你的 URL 并执行 `imwel init`

## 排错

| 问题 | 处理 |
|------|------|
| lint 说这里不是模板 | 在模板根跑（有 `manifest.yaml`，没有消费者 `binding.yaml`）。 |
| 脚手架语言不对 | 用 `--locale en` 或 `zh-CN` 重跑。 |
| clone 后钩子不跑 | 见下方推荐操作。 |

## 推荐：clone 后激活 hooks

若 `template init` 生成了 `.githooks/`（或带 `prepare` 的 `package.json`），每台新机器仍需执行命令激活一次：

```bash
git config core.hooksPath .githooks
```

若脚手架写了 `"prepare": "git config core.hooksPath .githooks"`，在模板仓里执行 `npm install` 即可自动完成。

## 关联

- [添加 rule](./add-rule.md) · [添加 skill](./add-skill.md)
- [Lint 与发布](./lint-and-publish.md)
- [Manifest 参考](../reference/manifest.md)
