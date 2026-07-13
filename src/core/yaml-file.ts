import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { pathExists } from './fs-utils.js';

export async function readYamlFile<T>(filePath: string): Promise<T | null> {
  if (!(await pathExists(filePath))) {
    return null;
  }
  const raw = await fs.readFile(filePath, 'utf8');
  return YAML.parse(raw) as T;
}

export async function writeYamlFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const raw = YAML.stringify(data);
  await fs.writeFile(filePath, raw, 'utf8');
}
