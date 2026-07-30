# 如何 Lint 与发布模板

想确认模板能干净安装，并用可重复的方式发布更新，让团队 `imwel sync`？

**你将得到：** 以 `imwel lint` 为质量门；发布仍是宿主上的普通 `git push` / PR——imwel 不另造 publish 命令。

## 前置

- 模板根目录（`.imwel/manifest.yaml`，无消费者 `binding.yaml`）
- 已完成[建立模板仓库](./create-template-repo.md)

## 步骤

### 1. 本地 lint

```bash
cd my-templates
imwel lint
```

CI 风格：

```bash
imwel lint --strict
```

### 2. 提交时 lint 自动化（可选）

`imwel template init` 可脚手架（默认开启；可拒绝跳过）：

- `.githooks/pre-commit` 跑 `imwel lint`
- CI 工作流（`.github/workflows/imwel-lint.yml` 或 `.gitlab-ci.yml`）跑 `imwel lint --strict`

若脚手架时跳过了该提示，可在模板仓根事后补装：

```bash
imwel template setup-hooks
```

会写入相同文件，再**单独**询问是否本地激活（`git config core.hooksPath .githooks`，默认 yes）。非交互：`imwel template setup-hooks -y` 在有 `.git` 时自动激活；`--no-activate` 跳过本机配置，`--no-ci` 跳过 CI，`--prepare` 额外写最小 `package.json`。详见 [命令 — template setup-hooks](../reference/commands.md#imwel-template-setup-hooks)。

Git 默认不会启用 clone 来的 hooks。每台机器 clone 之后：

```bash
git config core.hooksPath .githooks
```

若脚手架写了 `package.json` 的 `prepare`，`npm install` 会替你执行。`imwel lint` 在检测到 `.githooks/` 且未设置 `core.hooksPath` 时也可自动激活（用 `--no-auto-activate-hooks` 退出）。

### 3. 发布更新

```bash
git checkout -b improve-rules
# 编辑 Artifact…
imwel lint
git add .
git commit -m "improve rules"
git push -u origin HEAD
```

开 PR/MR。合并后消费者执行 `imwel sync`。

## 预期结果

- 合并前 lint 错误为零
- 宿主默认分支有新提交
- 消费者可通过 `imwel status` / `imwel sync` 看到更新

## 排错

| 问题 | 处理 |
|------|------|
| 在消费者目录跑 lint | 换到模板根，否则会被指引离开。 |
| hooks 从不触发 | 在本 clone 再设一次 `core.hooksPath`；确认存在 `.githooks/pre-commit`。 |
| hook 里找不到 `imwel` | hook 会警告并以 0 退出——安装 imwel 或在 CI 用 `npx`。 |

## 关联

- [添加 rule](./add-rule.md)
- [建立模板仓库](./create-template-repo.md)
- [命令 — lint / template setup-hooks](../reference/commands.md)
