# 如何在 CI 中运行 imwel

想让模板 lint 挡住构建，或让消费者绑定在 CI 里自动同步——又不想被交互提示卡住流水线？

**你将得到：** 完全非交互的 `imwel` 调用，能塞进一个 CI 步骤。`-y` / `--yes` 只跳过**确认**——绝不替你做选择，所以你把流水线需要的显式 flag 传全，得到可复现的运行。

## 前置

- 在 runner 里[安装 imwel](./install.md)（或用 `npx @culock/imwel@latest …`）
- 系统 `PATH` 上有 `git`，且 runner 能访问凭据（HTTPS token 或 deploy key）

## `--yes` 纪律

`-y` / `--yes` 跳过确认提示。它**不会**替你选工具、远端、项目或 artifact。CI 里必须显式传选择：

```bash
imwel init -y --tools cursor,claude-code --remote org-standards --branch main \
  --project my-app --no-optional
```

缺哪个选择，imwel 就非零退出——绝不猜。于是配错的流水线会大声失败，而非静默通过。

## 模板侧：在 CI 强制 lint

**适用场景：** 你维护模板仓，希望每个 PR 合并前都过 `imwel lint`。

### GitHub Actions

```yaml
# .github/workflows/imwel-lint.yml
name: imwel lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx @culock/imwel@latest lint --strict
```

`--strict` 连警告也判失败，风格漂移也能抓到。本地 pre-commit 钩子与 `setup-hooks` 见 [Lint 与发布](./lint-and-publish.md)。

### GitLab CI

```yaml
# .gitlab-ci.yml
imwel-lint:
  image: node:20
  script:
    - npx @culock/imwel@latest lint --strict
```

## 消费侧：在 CI 自动同步

**适用场景：** 消费仓想按计划或构建前刷新渲染出的规则——无需任何人手跑 `imwel sync`。

```bash
imwel sync --yes
```

`--yes` 无确认地应用上游更新。若上游已动且发生合并冲突，`sync` 留下标准 `<<<<<<<` / `=======` / `>>>>>>>` 标记并非零退出——CI 让 job 失败，由人工解决（绝不静默自动解决）。解决后：

```bash
imwel sync --continue --yes
```

### 脚本化绑定状态

`imwel binding show --json` 输出稳定的 `schemaVersion: 1` JSON 视图——适合 CI 步骤在动手前检查绑定了哪些工具/项目：

```bash
imwel binding show --json | jq '.binding.tools'
```

输出只含远端别名，绝不含带凭据的 URL——可安全打印到日志。

## 环境变量

| 变量 | 在 CI 的作用 |
|------|--------------|
| `IMWEL_FETCH_THROTTLE_MS` | 覆盖被动 fetch 节流（默认 2h）。CI 通常要新鲜数据：`sync` / `status` / `propose` 始终强制刷新，故此变量只影响普通命令。 |
| `NO_COLOR` | 禁用 ANSI 颜色（任意值，含空值）。让 CI 日志更干净。 |

## 预期结果

- 模板 PR 在 `imwel lint --strict` 发现问题时让 CI 失败
- 消费者 CI 非交互同步上游更新，冲突时大声失败
- 没有任何提示能卡住流水线

## 排错

| 问题 | 处理 |
|------|------|
| CI 卡在提示上 | 缺选择 flag——补 `--tools` / `--remote` / `--project` / `-y`。`--yes` 本身不会替你选。 |
| `sync` 非零退出且带冲突标记 | 手工解决标记，推送解决结果，再 `imwel sync --continue --yes`。imwel 绝不自动解决。 |
| 本地 lint 过、CI 不过 | CI 用了 `--strict`；推送前本地跑 `imwel lint --strict`。 |
| `binding show --json` 为空 | 本目录无绑定——先 `imwel init`，或把步骤指向已绑定目录。 |

## 关联

- [Lint 与发布](./lint-and-publish.md)
- [同步与处理漂移](./sync-and-drift.md)
- [管理远端](./manage-remotes.md)
- [命令 — 非交互 / CI](../reference/commands.md)
