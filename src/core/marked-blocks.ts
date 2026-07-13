const BLOCK_START = (id: string) => `<!-- imwel:block:${id} -->`;
const BLOCK_END = (id: string) => `<!-- /imwel:block:${id} -->`;

export function wrapBlock(id: string, content: string): string {
  const trimmed = content.trimEnd();
  return `${BLOCK_START(id)}\n${trimmed}\n${BLOCK_END(id)}\n`;
}

export function extractBlock(content: string, id: string): string | null {
  const start = BLOCK_START(id);
  const end = BLOCK_END(id);
  const startIdx = content.indexOf(start);
  if (startIdx === -1) {
    return null;
  }
  const afterStart = startIdx + start.length;
  const endIdx = content.indexOf(end, afterStart);
  if (endIdx === -1) {
    return null;
  }
  return content.slice(afterStart, endIdx).replace(/^\n/, '').replace(/\n$/, '');
}

export function upsertBlock(content: string, id: string, blockContent: string): string {
  const block = wrapBlock(id, blockContent);
  const existing = extractBlock(content, id);
  if (existing === null) {
    const trimmed = content.trimEnd();
    return trimmed ? `${trimmed}\n\n${block}` : block;
  }
  const start = BLOCK_START(id);
  const end = BLOCK_END(id);
  const startIdx = content.indexOf(start);
  const endIdx = content.indexOf(end, startIdx) + end.length;
  return `${content.slice(0, startIdx)}${block.trimEnd()}\n${content.slice(endIdx).replace(/^\n/, '')}`;
}

export function removeBlock(content: string, id: string): string {
  const start = BLOCK_START(id);
  const end = BLOCK_END(id);
  const startIdx = content.indexOf(start);
  if (startIdx === -1) {
    return content;
  }
  const endIdx = content.indexOf(end, startIdx);
  if (endIdx === -1) {
    return content;
  }
  const before = content.slice(0, startIdx).trimEnd();
  const after = content.slice(endIdx + end.length).replace(/^\n+/, '');
  if (!before) {
    return after;
  }
  if (!after) {
    return `${before}\n`;
  }
  return `${before}\n\n${after}`;
}
