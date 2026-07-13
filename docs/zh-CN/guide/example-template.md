# 示例模板

学习布局不需要单独托管的「演示 monorepo」。**规范的最小示例**就是 CLI 自带的脚手架：

- 源码树：[`templates/init/en/`](https://github.com/haoyisun/imwel/tree/main/templates/init/en) 与 [`templates/init/zh-CN/`](https://github.com/haoyisun/imwel/tree/main/templates/init/zh-CN)
- 生成可工作副本：`imwel template init`（或 `npx imwel@latest template init`）

独立公开的「示例模板组织仓」URL 是可选的；在你发布自己的模板之前，以脚手架为对照即可。

## 生成模板仓

```bash
npx imwel@latest template init --dir ./my-templates --name my-templates --locale zh-CN -y
cd my-templates
imwel lint
```

然后把目录推到 Git 宿主，并供消费者注册：

```bash
imwel remote add my-templates git@github.com:you/my-templates.git
```

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

## Manifest 片段

```yaml
conventions:
  rulesDir: rules
  skillsDir: skills
  agentsFile: agents.md

projects:
  - name: example-project
    path: example-project
    optional:
      - skills/example-skill
```

字段语义见 [Manifest](./manifest)。

## 接下来做什么

1. 在 project 路径下编辑或新增 Artifact。
2. 在 Cursor 中运行 `/imwel-author`（按上下文加载配置包），并用 `imwel lint` 验收。
3. 在 Git 宿主上开分支 + PR/MR。
4. 在消费项目：`imwel remote add` → `imwel init` → `imwel sync`。

完整作者工作流见 [模板编写](../template-authoring)。
