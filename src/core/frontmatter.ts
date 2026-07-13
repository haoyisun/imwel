export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>;
  body: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch && currentKey && currentList) {
      currentList.push(unquote(listMatch[1] ?? ''));
      continue;
    }
    const kvMatch = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kvMatch) {
      continue;
    }
    const key = kvMatch[1] ?? '';
    const value = kvMatch[2] ?? '';
    if (!value) {
      currentKey = key;
      currentList = [];
      result[key] = currentList;
      continue;
    }
    currentKey = null;
    currentList = null;
    result[key] = parseScalar(value);
  }
  return result;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  return unquote(trimmed);
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function serializeScalar(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  const str = String(value);
  if (/[:#{}[\],&*!|>'"%@`]/.test(str) || str.includes('\n')) {
    return JSON.stringify(str);
  }
  return str;
}

export function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  return {
    frontmatter: parseSimpleYaml(match[1] ?? ''),
    body: match[2] ?? '',
  };
}

export function extractImwelOverrides(frontmatter: Record<string, unknown>): Record<string, unknown> {
  const imwel = frontmatter.imwel;
  if (imwel && typeof imwel === 'object' && !Array.isArray(imwel)) {
    return { ...(imwel as Record<string, unknown>) };
  }
  return {};
}

export function serializeFrontmatter(
  body: string,
  frontmatter: Record<string, unknown>,
  imwelOverrides?: Record<string, unknown>,
): string {
  const merged = { ...frontmatter };
  if (imwelOverrides && Object.keys(imwelOverrides).length > 0) {
    merged.imwel = imwelOverrides;
  } else {
    delete merged.imwel;
  }
  const lines = ['---'];
  for (const [key, value] of Object.entries(merged)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${serializeScalar(item)}`);
      }
      continue;
    }
    lines.push(`${key}: ${serializeScalar(value)}`);
  }
  lines.push('---', '');
  return `${lines.join('\n')}${body}`;
}
