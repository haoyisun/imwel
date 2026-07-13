# 参与贡献 {{name}}

## 制品类型

| 类型 | 位置 | 说明 |
|------|------|------|
| `rule` | `<project>/rules/*.md` | AGENTS.md 风格 Markdown 规则 |
| `skill` | `<project>/skills/<name>/` | 含 `SKILL.md` 的技能包 |
| `agents` | `<project>/agents.md` | 项目级 agent 说明 |

## 用 AI / Slash Commands 增改

1. 在 Cursor 中打开本模板仓并运行 `/imwel-author`。
2. 遵循 template-author 配置包：先读 `.imwel/manifest.yaml`，在正确项目路径下编辑，再运行 `imwel lint`。
3. 在 Git 宿主上开 Pull Request。不要发明竞争的 Artifact 方言。

## 工作流

1. 变更通过 Git 托管平台的 Pull Request 进行评审。
2. 使用方运行 `imwel sync` 拉取已批准的更新。
3. 绑定项目中的本地编辑通过 `imwel push` 回传（默认不直接提交到共享分支）。

## 可选制品

在 manifest 项目条目的 `optional` 下列出制品路径，安装时会提示用户是否包含。
