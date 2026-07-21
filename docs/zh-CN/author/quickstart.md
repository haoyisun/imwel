# 编写模板

> **作者路径 · 第 1/3 步** —— 前置：[安装与前置](../getting-started/install.md)。要消费规则?见[消费者路径](../consume/quickstart.md)。

你维护团队消费的规则。模板仓库就是任何遵循 imwel [manifest](../concepts/glossary.md) 约定的普通 Git 仓库。

## 脚手架生成模板仓

```bash
# 未安装时用 npx 一次性运行：
npx @culock/imwel@latest template init --dir ./my-templates --name my-templates --locale zh-CN -y
cd my-templates
```

已全局安装 imwel（`npm install -g @culock/imwel`）？直接用命令即可，无需 `npx`：

```bash
imwel template init --dir ./my-templates --name my-templates --locale zh-CN -y
```

`template init` 默认以目录名作为名字,仅当你选择创建远程仓时才询问名字 —— 见 [`imwel template init`](../guide/commands.md#imwel-template-init)。规范的最小示例就随 CLI 分发：源码树见 [`templates/init/en/`](https://github.com/haoyisun/imwel/tree/main/templates/init/en) 与 [`templates/init/zh-CN/`](https://github.com/haoyisun/imwel/tree/main/templates/init/zh-CN)。

## 最小目录树

```
my-templates/
  .imwel/
    manifest.yaml
  AGENTS.md                          # 面向作者的指引
  README.md
  CONTRIBUTING.md
  .cursor/
    commands/
      imwel-author.md                # /imwel-author
      imwel-lint.md                  # /imwel-lint
    rules/
      imwel-template-author.mdc
    skills/
      imwel-template-author/
      imwel-consumer/
  example-project/
    agents.md
    rules/
      example-rule.md
    skills/
      example-skill/
        SKILL.md
```

脚手架只带一个 `example-project`,但 manifest 里的 `projects` 是列表 —— 可声明多个条目,从一个模板仓服务多个 project（如 `backend` + `frontend`）。字段语义与多 project 示例见 [Manifest 参考](../guide/manifest.md#多个-project)。

## 编辑 Artifact

1. 在 project 路径下（`example-project/`）编辑或新增 Artifact。
2. 为每条规则写上 frontmatter `description`（必要时加 `globs` / `alwaysApply`）—— 即[规则元数据 overlay](../guide/manifest.md#规则元数据-overlay) —— 让它在各工具中以正确的触发方式渲染,而不是退化成文件名。
3. 在 Cursor 中运行 `/imwel-author`,加载按上下文的作者配置包。

## 关联远程并发布给团队

模板仓就是普通 Git 仓库，所以**发布靠普通 `git`**——imwel 没有 `publish` 命令，GitHub / GitLab 等 Git 宿主就是分发与治理层。最小流程：

```bash
git init && git add . && git commit -m "initial template"
git remote add origin <git-host-url>   # 你在 GitHub/GitLab 上创建的空仓库地址
git push -u origin main
```

之后团队里的消费者用 `imwel remote add <git-host-url>` 注册它。关联远程、首次推送、日常维护循环（编辑 → `imwel lint` → `git push`）以及让消费者注册的完整说明见 [发布与维护](./publish.md)。

> 提示：`imwel template init` 在脚手架阶段可选地经 `gh` / `glab` 直接帮你创建远程仓；否则按上面手动关联并推送。

## 下一步

- 发布前校验 → [Lint 与质量条](./lint.md)
- 发布到 Git 宿主供团队使用 → [发布与维护](./publish.md)
- Manifest 字段与规则 overlay → [Manifest 参考](../guide/manifest.md)
- 从已有代码库起草规则 → [从代码库起草规则](./from-codebase.md)
