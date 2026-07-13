# 贡献渲染适配器

如何为 imwel 新增一个 AI 编程工具的**渲染目标**。

> **v1 不是插件系统。** 第三方适配器通过向上游提交 PR 实现：在 `src/adapters/` 新增模块，并加入静态 `adapters` 数组。终端用户不能把适配器丢进家目录就让 imwel 动态加载。没有适配器市场，也没有 `registerAdapter()` 运行时 API。

类型定义在 `src/adapters/types.ts`。注册在 `src/adapters/index.ts`。本页是**公开贡献契约**；imwel **不会**为适配器单独发布 npm SDK 导出（见下方决策说明）。

## Adapter 接口

```ts
export type MergeMode = 'replace' | 'upsert-block';

export interface RenderedFile {
  path: string;
  content: string;
  merge?: MergeMode;
  blockId?: string;
}

export interface ParsedExisting {
  canonicalContent: string;
  targetOverrides?: Record<string, unknown>;
}

export interface Adapter {
  id: string;
  detect(projectDir: string): Promise<boolean>;
  render(artifact: Artifact, targetOverrides?: Record<string, unknown>): RenderedFile[];
  parseExisting(files: { path: string; content: string }[]): ParsedExisting;
}
```

（`Artifact` 定义于 `src/core/artifact-types.ts`。）

### 方法职责

| 成员 | 职责 |
|------|------|
| `id` | 稳定的工具 id（如 `cursor`、`claude-code`）。用于 `--tools` / 绑定。 |
| `detect(projectDir)` | 启发式：该目录是否已在使用此工具？用于 `init` 建议。 |
| `render(artifact, targetOverrides?)` | 为 Artifact 写出一个或多个工具原生文件。路径相对项目目录。 |
| `parseExisting(files)` | render 的逆操作：从磁盘文件恢复规范正文 + `targetOverrides`（漂移与 `push` / `propose`）。 |

### 内容边界

- 当 `type === 'rule'` 时，**规范**正文是 agents.md 风 Markdown。**不要**发明第二种规则方言。
- 工具特有增强（Cursor frontmatter、Claude 块 id 等）属于 `targetOverrides`，仅在该目标的 `render` 中展开。
- `RenderedFile.merge`：
  - 省略或 `replace` — 整文件替换
  - `upsert-block` — 在共享文件中插入/更新具名块（`blockId`）（例如 `CLAUDE.md`）

core 决定*是否*可写某路径；适配器只描述*如何*渲染/解析。

## 静态注册步骤

1. 新增 `src/adapters/<your-tool>.ts` 并实现 `Adapter`。
2. 导出适配器实例（与 `cursor.ts` / `claude-code.ts` 相同模式）。
3. 在 `src/adapters/index.ts` 注册：

```ts
import { cursorAdapter } from './cursor.js';
import { claudeCodeAdapter } from './claude-code.js';
import { yourToolAdapter } from './your-tool.js';
import type { Adapter } from './types.js';

export const adapters: Adapter[] = [
  cursorAdapter,
  claudeCodeAdapter,
  yourToolAdapter,
];
```

4. 确保 `init` / `sync` / `push` 通过 `getAdapter` / 共享 `adapters` 列表使用它 — **不要**在 core 增加目标特判分支。
5. 开 PR。见 [CONTRIBUTING.zh-CN.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.zh-CN.md)。

## Round-trip 期望

对适配器支持的 Artifact：

1. `files = adapter.render(artifact, artifact.targetOverrides)`
2. `parsed = adapter.parseExisting(files.map(…))`
3. 在适配器支持的字段范围内，`parsed.canonicalContent` 与 `parsed.targetOverrides` 须与原始等价。

请添加断言该往返的单元测试。现有 Cursor / Claude Code 测试可作为参照。

## 实现清单

- [ ] 实现 `detect`、`render`、`parseExisting`
- [ ] 选定稳定 `id` 与消费项目下的路径约定
- [ ] 仅在更新共享多 Artifact 文件时使用 `merge` / `blockId`
- [ ] 规则规范正文保持 agents.md 风 Markdown；工具附加信息放进 `targetOverrides`
- [ ] 在 `src/adapters/index.ts` 静态注册
- [ ] **不要**在 core 的 sync/push 逻辑中增加按目标分支
- [ ] 添加 round-trip（以及 detect）测试
- [ ] 除非修 bug 并经评审，**不要**改变现有 Cursor / Claude Code 适配器行为

## 类型导出决策

**仅文档（不为 `./adapters` 增加 npm `exports`）。** 已发布包仍是 CLI（`bin` + `dist` + `templates`）。为适配器类型增加公开 `exports` 会扩大 npm 表面，而当前没有真实的 SDK 消费者，也容易被误解为稳定应用 API。贡献者开发 PR 时应从仓库源码引用类型（`src/adapters/types.ts`）。若未来需要发布类型，保持导出极薄，并标明用途为贡献者参考 — 而非通用应用 SDK。

## 相关

- [架构](../guide/architecture) — 适配器在流水线中的位置
- 内置实现：`src/adapters/cursor.ts`、`src/adapters/claude-code.ts`
