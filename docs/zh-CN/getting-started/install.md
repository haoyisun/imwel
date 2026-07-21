# 安装与前置

> **快速上手** —— [消费者路径](../consume/quickstart.md)与[作者路径](../author/quickstart.md)共享本页。

## 前置

需要 **Node.js ≥ 18.18** 与 `PATH` 上的系统 **`git`**。imwel 会 shell out 到你现有的 `git`（SSH 密钥、凭据助手与 `.gitconfig` 均照常生效）。

## 安装

```bash
# 免安装一次性运行：
npx @culock/imwel@latest <command>

# 或全局安装（命令名仍是 `imwel`）：
npm install -g @culock/imwel
```

## 校验

```bash
imwel doctor   # 校验 git 与环境前置
```

新机器上或遇到异常时先跑 `imwel doctor` —— 它会报告缺失的前置并给出可执行的下一步（例如"PATH 上找不到 `git` —— 安装 Git 后重跑"）。

## 下一步

- 要消费团队规则? → [安装模板](../consume/quickstart.md)
- 要发布自己的规则? → [编写模板](../author/quickstart.md)
- 想并排看两条最小命令序列? → [快速走查](../guide/usage.md)
