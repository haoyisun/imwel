import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from '../dist/locales/en.js';
import { zhCN } from '../dist/locales/zh-CN.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const localeKeyPattern = /\bt\(\s*['"]([a-z][\w.-]*)['"]/g;

function collectKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();
  for (const match of content.matchAll(localeKeyPattern)) {
    if (match[1]) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function walkTsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTsFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

const usedKeys = new Set();
for (const file of walkTsFiles(srcDir)) {
  if (file.includes(`${path.sep}locales${path.sep}`)) {
    continue;
  }
  for (const key of collectKeysFromFile(file)) {
    usedKeys.add(key);
  }
}

const enKeys = new Set(Object.keys(en));
const missingEn = [...usedKeys].filter((key) => !enKeys.has(key));
const missingZh = [...enKeys].filter((key) => !(key in zhCN));

if (missingEn.length > 0) {
  console.error('Missing English locale keys:', missingEn.join(', '));
  process.exit(1);
}

if (missingZh.length > 0) {
  console.warn('Missing zh-CN translations (will fall back to English):', missingZh.join(', '));
}

console.log(`i18n check passed (${usedKeys.size} keys referenced, ${enKeys.size} en keys)`);
