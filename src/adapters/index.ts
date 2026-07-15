import { cursorAdapter } from './cursor.js';
import { claudeCodeAdapter } from './claude-code.js';
import {
  aiderAdapter,
  clineAdapter,
  codexAdapter,
  continueAdapter,
  copilotAdapter,
  geminiCliAdapter,
  kiroAdapter,
  opencodeAdapter,
  qoderAdapter,
  traeAdapter,
  windsurfAdapter,
  zcodeAdapter,
} from './extra-adapters.js';
import type { Adapter } from './types.js';

export const adapters: Adapter[] = [
  cursorAdapter,
  claudeCodeAdapter,
  traeAdapter,
  qoderAdapter,
  codexAdapter,
  opencodeAdapter,
  zcodeAdapter,
  geminiCliAdapter,
  windsurfAdapter,
  continueAdapter,
  clineAdapter,
  kiroAdapter,
  copilotAdapter,
  aiderAdapter,
];

export function getAdapter(id: string): Adapter | undefined {
  return adapters.find((adapter) => adapter.id === id);
}

export {
  cursorAdapter,
  claudeCodeAdapter,
  traeAdapter,
  qoderAdapter,
  codexAdapter,
  opencodeAdapter,
  zcodeAdapter,
  geminiCliAdapter,
  windsurfAdapter,
  continueAdapter,
  clineAdapter,
  kiroAdapter,
  copilotAdapter,
  aiderAdapter,
};
export type { Adapter, RenderedFile, ParsedExisting } from './types.js';
