# 如何管理模板远端

想登记团队模板仓、给它一个好记的别名，或让个人远端接受直推——而不用手编绑定？

**你将得到：** 一组 `imwel remote` 命令，把模板仓 URL 及其本地别名存进 `~/.imwel/config.yaml`。`imwel init` 与 `imwel push` 读这些别名，于是你不必重复粘贴 URL，也不会推错仓库。

## 前置

- [安装 imwel](./install.md)
- 至少一个模板仓库的 URL（HTTPS 或 SSH，随你 Git 凭证已支持的）

## 步骤

### 1. 登记远端

```bash
imwel remote add git@github.com:YOUR_ORG/team-standards.git
```

只传 URL，imwel 按仓库名派生别名（此处 `team-standards`），并打印所选别名供你后续引用。

想用自定义别名？两种等价写法：

```bash
imwel remote add team git@github.com:YOUR_ORG/team-standards.git   # 别名在前
imwel remote add git@github.com:YOUR_ORG/team-standards.git --as team  # 别名用 flag
```

**别名的好处：** `imwel init --remote team` 与 `imwel push` 引用一个简短稳定的名字——万一 URL 迁移，用 `remote set` 一处修复，所有绑定照常工作。

### 2. 列出远端

```bash
imwel remote list
```

显示每个别名、规范化后的 URL、是否允许直推。只显示别名——绝不显示带凭据的密钥。

### 3. 移除远端

```bash
imwel remote remove team
```

`-y` / `--yes` 跳过确认。移除远端**不会**删除任何绑定或本地文件——只从全局列表删掉别名。

### 4. 切换直推（按远端 opt-in）

默认每个远端都走 **branch + PR/MR**——由 Git host 的分支保护管控评审。对单人个人远端，你可 opt-in 直推：

```bash
imwel remote set team --direct-push true   # 允许直推到绑定分支
imwel remote set team --direct-push false  # 回到 branch + PR（默认）
```

**为何默认关闭：** 直推绕过 PR 评审，默认关闭以保护共享分支。仅在你独写的远端上开启。

## 预期结果

- `imwel remote list` 列出已登记别名
- `imwel init --remote <别名>` 绑定目录时无需重输 URL
- 推送默认 branch + PR；直推仅在你显式允许的远端生效

## 排错

| 问题 | 处理 |
|------|------|
| `add` 被拒：URL 已登记在另一别名下 | 用它报告的既有别名，或先 `remote remove` 旧的。imwel 按规范化 URL 去重，防止重复映射。 |
| `add` 像是卡住 | 它在构建本地缓存的 clone/fetch 期间显示 spinner。大仓首次 fetch 可能稍久。 |
| `init` 提示找不到远端 | 跑 `imwel remote list`；别名区分大小写，需一致。 |
| 开了直推仍开 PR | `--direct-push` 是按远端的；要在你实际推送的那个远端上设置，不是别的。 |

## 关联

- [为 Cursor 消费渲染](./consume-for-cursor.md) · [Claude Code](./consume-for-claude-code.md)
- [经 PR 回推上游](./push-via-pr.md)
- [命令 — remote](../reference/commands.md)
