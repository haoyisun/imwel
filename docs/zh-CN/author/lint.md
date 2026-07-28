# Lint 与质量条

> **作者路径 · 第 2/3 步** —— 前置：[编写模板](./quickstart.md)。

发布前校验模板仓库。仅在**模板**根运行 lint（有 `.imwel/manifest.yaml`、无 `binding.yaml`）。

## 运行 lint

```bash
imwel lint
imwel lint --strict   # CI：警告也失败
```

- **Errors** —— 装坏类（无效 manifest、项目 path 缺失、skill 缺 `SKILL.md`、路径逃逸；另含两个 project 声明了同名 rule/skill 且**内容不同** —— `project.artifactNameCollision` —— 同时安装两者会在渲染路径上撞车；lint 会点名涉及的 project 并建议将其中一个重命名为 `<project>-<basename>`）。
- **Warnings** —— 风格 / 最佳实践（规则/skill `description` 缺失、过短/过长、或不可触发,对齐 agentskills / Cursor 指导;project 未声明 [`role`](../guide/manifest.md#项目角色-模块-vs-项目) —— 会静默默认为可写项目;`role: shared` 模块携带了 `agents` 文件 —— 模块不会安装它,应把该内容移入 rule/skill artifact）。

> **命名约定：** 若 `role: shared` 模块可能与其他模块或可写项目并存安装，建议以模块名前缀命名其源制品（`<module>-<rule>.md`、`<module>-<skill目录名>`），从源头避免同名渲染路径撞车。两个同名且**内容相同**的制品无妨 —— 渲染会静默去重；仅内容不同才被标记。

在消费侧绑定目录,CLI 会指引到模板仓,而不会报告假成功。完整选项见 [`imwel lint`](../guide/commands.md#imwel-lint)。

## 提交时 lint 自动化（可选）

为在 PR 落地前拦截问题,`imwel template init` 提供（opt-in）在新模板仓中脚手架 lint 自动化:

- 一个提交进仓的 `.githooks/pre-commit` hook,每次提交运行 `imwel lint`,以及
- 一个 CI workflow（检测到 `gh` 写 `.github/workflows/imwel-lint.yml`,检测到 `glab` 写 `.gitlab-ci.yml`）,在 PR / 推送到默认分支时运行 `imwel lint --strict`。

选择启用时,imwel 还会本地激活 hook（`git config core.hooksPath .githooks`）并向 `CONTRIBUTING.md` 追加激活说明。`imwel template init --from-project` 提供相同 opt-in（仅写文件,不本地激活,因为生成目录尚无 `.git`）。

hook 优雅降级 —— 若 `imwel` 不在 PATH,会打印警告并以 `0` 退出,缺失 imwel 绝不阻塞其它机器或 CI 的提交。全新克隆后,每位贡献者需一次性激活:

```bash
git config core.hooksPath .githooks
```

`imwel lint` 还会在检测到模板仓包含 `.githooks/` 但 `core.hooksPath` 未激活时打印被动提示。imwel 不安装 husky/lefthook,也不在 `clone` 时自动激活 hook —— 激活是每位贡献者一次性、opt-in 的动作。

## 上下文检测

从任意子目录向上查找 `.imwel/` 并判定位置：

| 类型 | 信号 |
|------|------|
| `template` | 含 `projects` 的 `manifest.yaml`,无 `binding.yaml` |
| `consumer` | `binding.yaml`,无 `manifest.yaml` |
| `neither` | 无标记 |
| `ambiguous` | 同一 `.imwel/` 下两者皆有 |

Slash 命令 `/imwel-author` 与 `imwel lint` 共用此检测。错误或歧义上下文必定被说明 —— imwel 从不静默套用错误配置包。

## 下一步

- 发布并维护你的模板 → [发布与维护](./publish.md)
- lint 检查的规则元数据 → [规则元数据 overlay](../guide/manifest.md#规则元数据-overlay)
