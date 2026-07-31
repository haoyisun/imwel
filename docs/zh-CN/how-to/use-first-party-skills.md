# 如何使用 imwel 内置 skill

已装好 imwel，但想让 AI 自己起草、激活、审计、打包你的规则——而不是手动一步步跑 CLI？

**你将得到：** 四个在你 AI 工具内调用的第一方 skill（`/imwel-extract`、`/imwel-adopt`、`/imwel-audit`、`/imwel-create-template`），组合成完整的"起草 → 激活 → 审计 → 发布"闭环。每个 skill 只写进隔离的审阅目录；在你点头之前，没有任何东西变成团队的共享标准。

## 前置

- [安装 imwel](./install.md)
- 一次性安装命令包（仅 skill，未托管）：

```bash
imwel skill install
```

- 一个支持以 `/` 触发 skill 的 AI 工具（Cursor、Claude Code）。其他工具仍按 `description` 匹配。

## 四个 skill 速览

| Skill | 何时用 | 写入位置 | 是否托管 |
|-------|--------|----------|----------|
| `/imwel-extract` | 项目几乎没有规则，想要基于真实代码形态的起步集 | `.imwel/drafts/<box>/` | 否（供审阅草稿） |
| `/imwel-adopt` | 已审阅草稿盒，想让规则立刻在工具里生效 | 工具原生路径（`.cursor/rules/*` 等） | 否（未托管） |
| `/imwel-audit` | 已有规则，但怀疑与代码脱节 | `.imwel/audit/` | 否（建议性发现） |
| `/imwel-create-template` | 本地规则稳定，想发布给团队 | 新模板仓骨架 | 否（供你组织的骨架） |

四者只写隔离审阅目录或未托管的工具路径——在你显式跑 `sync` / `push` 之前，绝不触碰绑定、`.imwel/history/` 或远程模板。

---

## 1. `/imwel-extract` —— 从代码库起草规则

**适用场景：** 项目几乎没有 AI 编码规则，想要一套贴合本仓真实形态的起步集——而非通用模板。

它会确保指纹存在（若 `.imwel/fingerprint.yaml` 缺失则自动跑 `imwel scan`），按指纹指向定向读取关键文件，把规则/skill 草稿写进**具名草稿盒**。

**在 AI 工具对话里调用：**

```
/imwel-extract
```

**最小产出** —— 带主题与时间戳的草稿盒，重复运行互不覆盖：

```
.imwel/drafts/
└── node-cli-20260731-1042/
    ├── rules/
    │   ├── error-handling.md
    │   └── testing.md
    └── skills/
        └── review-pr/SKILL.md
```

skill 结尾给出三段式交接：草稿盒位置、审阅提示、下一步（`imwel adopt --from <box>`）。你始终掌控——草稿在 adopt 之前并不生效。

---

## 2. `/imwel-adopt` —— 激活已审阅草稿盒

**适用场景：** 你已审阅（并改过）一个草稿盒，想把规则渲染进 AI 工具原生位置、立刻生效。

它是 `imwel adopt --from <box>` 的薄封装：定位草稿盒、跑命令、解释健康门/冲突结果。它本身不渲染或改写草稿。

**审阅后调用：**

```
/imwel-adopt
```

或等价 CLI（适合 CI 或脚本）：

```bash
imwel adopt --from .imwel/drafts/node-cli-20260731-1042
```

**最小结果** —— 文件落到各工具原生路径，开始驱动 AI：

```
.cursor/rules/error-handling.mdc
.cursor/rules/testing.mdc
.claude/rules/error-handling.md
```

**这意味什么：** 渲染产物是**未托管**的——不写入绑定、不进 `.imwel/history/`、不被 `status` / `sync` / `push` 跟踪。所以本地试草稿零风险；在你打包之前团队模板不被触碰。

---

## 3. `/imwel-audit` —— 审计既有规则的漂移

**适用场景：** 你已有规则（托管或手写），但怀疑与代码脱节——某规则引用了已删文件、两条规则互相矛盾、或新出现的模式没有规则覆盖。

它读取当前规则及指纹指向的代码，把可执行的发现写进 `.imwel/audit/`。仅显式调用——绝不挂钩你的 AI 工具会话。

**调用：**

```
/imwel-audit
```

**最小发现文件**（`.imwel/audit/20260731-1055.md`）—— 三类发现：

```markdown
## 规则 ↔ 代码不匹配
- `rules/error-handling.md` 要求"所有 async 路由包 try/catch"，
  但 `src/routes/users.ts` 导出的是裸 async handler。

## 规则 ↔ 规则冲突
- `rules/testing.md` 要求 Vitest；`skills/review-pr/SKILL.md` 却引用 Jest。

## 缺失规则
- 新目录 `src/db/migrations/`（指纹检出）没有任何规则覆盖。
```

### 与 `imwel status` 的区别

| 检查 | 方式 | 抓什么 |
|------|------|--------|
| `imwel status` 规则健康 | 确定性、无 LLM | `empty`、`dead-import`、`orphan-ref`（语法/路径） |
| `/imwel-audit` | 语义、LLM 辅助 | 规则↔代码不匹配、规则↔规则冲突、缺失规则（语义） |

日常用 `imwel status` 做廉价的语法检查；需要更深语义核查时跑 `/imwel-audit`。

---

## 4. `/imwel-create-template` —— 把本仓规则变成可发布模板

**适用场景：** 本地规则已稳定（起草、adopt、迭代过），想发布成团队都能 `imwel init` 的模板仓。

它跑 `imwel template init --from-project`（**只收割你自己的 `USER` artifact**——排除 imwel 自身命令包和其他工具的已装产物），再指导**语义**组织：拆分 project、分配 role、写 manifest/README。

**调用：**

```
/imwel-create-template
```

**最小骨架**（写入唯一目录，重复运行不冲突）：

```
.imwel/generated-templates/<topic>-20260731-1100/
├── .imwel/manifest.yaml
├── rules/
├── skills/
├── agents.md
└── .cursor/commands/imwel-author.md
```

**为何如此分工：** CLI 止步于确定性骨架；判断题（哪些规则归哪个 project、什么是共享 module vs 可写 project、README 怎么写）交给 skill。在生成目录里跑 `imwel lint` 校验；发布仍是普通 `git`。

---

## 组合使用 —— 闭环

四个 skill 设计上可串起来。按你当前所处阶段选模式：

### A. 冷启动（尚无规则）

```
imwel scan
  → /imwel-extract          # 草稿写进 .imwel/drafts/<box>/
  → 审阅草稿盒
  → /imwel-adopt            # 渲染进工具 —— 本地激活
```

### B. 审计既有规则

```
/imwel-audit               # 发现写进 .imwel/audit/
  → 修规则（或 /imwel-extract 补缺）
  → /imwel-adopt            # 重新渲染修正后的批次
```

### C. 本地迭代

```
/imwel-adopt                # 试一批草稿
  → 在真实工作里用
  → 调整，再 /imwel-adopt
  → 稳定后进入 D
```

### D. 发布回去

按 canonical 归属选一条：

```
# 新建可分享模板仓：
/imwel-create-template     # → imwel lint → git push

# 或喂给已有远程：
imwel propose <file>       # 登记贡献跟踪
imwel push                 # 默认 branch + PR
```

## 预期结果

- 草稿、审计、骨架都在隔离的 `.imwel/` 子目录——可审阅、绝不自动晋升
- adopt 的规则在工具里生效，但保持**未托管**，直到你打包或 propose
- 团队模板仓只在你显式 `git push` / `imwel push` 时被触碰

## 排错

| 问题 | 处理 |
|------|------|
| 没有 `/imwel-*` slash 命令 | 重跑 `imwel skill install --tools cursor`（或你的工具 id）。 |
| `/imwel-extract` 提示指纹缺失 | 它会自动跑 `imwel scan`；若失败，手动跑 `imwel scan` 后再调用。 |
| `/imwel-adopt` 因健康问题被拒 | 按提示打开草稿文件，修 empty/dead-import/orphan-ref，再调用。 |
| `/imwel-create-template` 排除了我的文件 | 它只收 `USER` artifact；imwel 自身命令包和其他工具的安装产物按设计排除——请到各自源头编辑。 |

## 关联

- [工具内 skill（参考）](../reference/in-tool-skills.md)
- [从代码库起草规则（CLI 视角）](./draft-rules-from-codebase.md)
- [归并已有规则（CLI 视角）](./adopt-existing-rules.md)
- [建立模板仓库（CLI 视角）](./create-template-repo.md)
- [命令 — scan / adopt / skill](../reference/commands.md)
