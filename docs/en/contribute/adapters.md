# Contributing render adapters

How to add a new AI-coding-tool **render target** to imwel.

> **v1 is not a plugin system.** Third-party adapters ship by opening an upstream pull request that adds a module under `src/adapters/` and registers it in the static `adapters` array. Terminal users cannot drop an adapter into a home directory and have imwel load it dynamically. There is no adapter marketplace and no `registerAdapter()` runtime API.

Types live in `src/adapters/types.ts`. Registration lives in `src/adapters/index.ts`. This page is the **public contributor contract**; imwel does **not** publish a separate npm SDK export for adapters (see decision note below).

## Adapter interface

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

(`Artifact` is defined in `src/core/artifact-types.ts`.)

### Method responsibilities

| Member | Responsibility |
|--------|----------------|
| `id` | Stable tool id (e.g. `cursor`, `claude-code`). Used in `--tools` / bindings. |
| `detect(projectDir)` | Heuristic: is this tool already in use in the directory? Used during `init` suggestions. |
| `render(artifact, targetOverrides?)` | Emit one or more tool-native files for the Artifact. Paths are relative to the project directory. |
| `parseExisting(files)` | Inverse of render: recover canonical content + `targetOverrides` from on-disk files (drift + `push` / `propose`). |

### Content boundary

- For `type === 'rule'`, **canonical** body is agents.md-flavored Markdown. Do **not** invent a second rule dialect.
- Tool-specific enrichments (Cursor frontmatter, Claude block ids, …) belong in `targetOverrides` and are expanded only in `render` for that target.
- `RenderedFile.merge`:
  - omit or `replace` — whole-file replace
  - `upsert-block` — insert/update a named block (`blockId`) inside a shared file (e.g. `CLAUDE.md`)

Core owns *whether* a path may be written; adapters only describe *how* to render/parse.

## Static registration steps

1. Add `src/adapters/<your-tool>.ts` implementing `Adapter`.
2. Export the adapter instance (same pattern as `cursor.ts` / `claude-code.ts`).
3. Register it in `src/adapters/index.ts`:

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

4. Ensure `init` / `sync` / `push` pick it up through `getAdapter` / the shared `adapters` list — **do not** add target-specific branches in core.
5. Open a PR. See [CONTRIBUTING.md](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.md).

## Round-trip expectation

For an Artifact that your adapter supports:

1. `files = adapter.render(artifact, artifact.targetOverrides)`
2. `parsed = adapter.parseExisting(files.map(…))`
3. `parsed.canonicalContent` and `parsed.targetOverrides` must match the originals **within the fields your adapter supports**.

Add unit tests that assert this round-trip. Existing Cursor / Claude Code tests are the reference.

## Implementation checklist

- [ ] Implement `detect`, `render`, and `parseExisting`
- [ ] Choose stable `id` and path conventions under the consumer project
- [ ] Use `merge` / `blockId` only when updating a shared multi-artifact file
- [ ] Keep canonical rule content as agents.md-flavored Markdown; put tool extras in `targetOverrides`
- [ ] Register statically in `src/adapters/index.ts`
- [ ] Do **not** add per-target special cases in core sync/push logic
- [ ] Add round-trip (and detect) tests
- [ ] Do **not** change behavior of existing Cursor / Claude Code adapters unless fixing a bug with review

## Types export decision

**Docs-only (no npm `exports` for `./adapters`).** The published package remains a CLI (`bin` + `dist` + `templates`). Adding a public `exports` map for adapter types would expand the npm surface without a real SDK consumer today and risks implying a stable application API. Contributors should import types from the repository source (`src/adapters/types.ts`) when developing a PR. If a future change needs published types, keep the export thin and document it as contributor reference — not a general app SDK.

## Related

- [Architecture](../guide/architecture) — where adapters sit in the pipeline
- Built-in implementations: `src/adapters/cursor.ts`, `src/adapters/claude-code.ts`
