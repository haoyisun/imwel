import { cursorAdapter } from './cursor.js';
import { claudeCodeAdapter } from './claude-code.js';
import type { Adapter } from './types.js';

export const adapters: Adapter[] = [cursorAdapter, claudeCodeAdapter];

export function getAdapter(id: string): Adapter | undefined {
  return adapters.find((adapter) => adapter.id === id);
}

export { cursorAdapter, claudeCodeAdapter };
export type { Adapter, RenderedFile, ParsedExisting } from './types.js';
