# 安装模板

> **消费者路径 · 第 1/3 步** —— 前置：[安装与前置](../getting-started/install.md)。若要编写规则,见[作者路径](../author/quickstart.md)。

你是想把团队规则装进自己 AI 工具的开发者。本页是消费者的规范上手序列。

## 1. 注册模板 remote

每台机器一次。只传 URL,imwel 会由它推导本地别名：

```bash
imwel remote add git@github.com:example/imwel-templates.git   # 别名自动推导（如 "imwel-templates"）
```

想用显式别名?用两参数形式或 `--as`：

```bash
imwel remote add org-standards git@github.com:example/imwel-templates.git
# 或：imwel remote add git@github.com:example/imwel-templates.git --as org-standards
```

全部子命令见 [`imwel remote`](../guide/commands.md#imwel-remote)。

## 2. 绑定项目并安装 Artifact

```bash
cd your-project
imwel init            # 交互式选择工具、branch、project
```

若只配置了一个远程,`imwel init` 会自动选用它（无需 `--remote`）；配置多个时交互选择或传 `--remote <alias>`。

`imwel init` 会把所选 project 的 Artifact 渲染到每个所选工具的原生位置（见[适配器](../contribute/adapters.md)）,记录[绑定](../concepts/glossary.md),并在 `.imwel/history/` 下创建隐藏历史仓。

CI / 非交互场景请显式传选择 flag —— 见[非交互 / CI](../guide/commands.md#非交互-ci)。

## 下一步

- 保持规则最新、撤销坏更新 → [同步、漂移与回滚](./sync-and-drift.md)
- 完整选项参考 → [`imwel init`](../guide/commands.md#imwel-init)
