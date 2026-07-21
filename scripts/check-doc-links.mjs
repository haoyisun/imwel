import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const root = path.resolve(url.fileURLToPath(new URL('.', import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const distDir = path.join(docsDir, '.vitepress', 'dist');

function walk(dir, filter) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.vitepress' || entry.name === 'node_modules') continue;
      out.push(...walk(full, filter));
    } else if (filter(full)) {
      out.push(full);
    }
  }
  return out;
}

const mdFiles = walk(docsDir, (f) => f.endsWith('.md'));

// Build a cache of anchor ids per dist html file.
const anchorCache = new Map();
function anchorsFor(htmlPath) {
  if (anchorCache.has(htmlPath)) return anchorCache.get(htmlPath);
  let ids = null;
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    ids = new Set([...html.matchAll(/<h[1-6][^>]*\sid="([^"]+)"/g)].map((m) => m[1]));
  }
  anchorCache.set(htmlPath, ids);
  return ids;
}

// Map a source .md file to its dist .html path.
function distHtmlFor(mdAbs) {
  const rel = path.relative(docsDir, mdAbs).replace(/\\/g, '/');
  let htmlRel = rel.replace(/\.md$/, '.html');
  if (htmlRel.endsWith('index.html')) htmlRel = htmlRel.replace(/index\.html$/, 'index.html');
  return path.join(distDir, htmlRel);
}

const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
const problems = [];

for (const md of mdFiles) {
  const content = fs.readFileSync(md, 'utf8');
  const dir = path.dirname(md);
  let m;
  while ((m = linkRe.exec(content))) {
    let target = m[1].trim();
    // strip optional "title"
    target = target.replace(/\s+["'].*["']$/, '');
    if (!target) continue;
    if (/^(https?:|mailto:|tel:|#)/.test(target)) {
      // pure in-page anchor
      if (target.startsWith('#')) {
        const anchor = decodeURIComponent(target.slice(1));
        const ids = anchorsFor(distHtmlFor(md));
        if (ids && !ids.has(anchor)) {
          problems.push({ file: rel(md), link: target, reason: 'in-page anchor not found' });
        }
      }
      continue;
    }
    const [rawPath, rawAnchor] = target.split('#');
    // Resolve target file path
    let resolved;
    if (rawPath === '') {
      resolved = md;
    } else {
      resolved = path.resolve(dir, rawPath);
      if (!/\.md$/.test(resolved)) {
        // directory link or .html; try index.md or .md
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          resolved = path.join(resolved, 'index.md');
        } else if (fs.existsSync(resolved + '.md')) {
          resolved = resolved + '.md';
        } else if (resolved.endsWith('.html')) {
          resolved = resolved.replace(/\.html$/, '.md');
        }
      }
    }
    if (!fs.existsSync(resolved)) {
      problems.push({ file: rel(md), link: target, reason: 'target file missing: ' + rel(resolved) });
      continue;
    }
    if (rawAnchor) {
      const anchor = decodeURIComponent(rawAnchor);
      const ids = anchorsFor(distHtmlFor(resolved));
      if (ids === null) {
        problems.push({ file: rel(md), link: target, reason: 'no built html to verify anchor (' + rel(distHtmlFor(resolved)) + ')' });
      } else if (!ids.has(anchor)) {
        problems.push({ file: rel(md), link: target, reason: 'anchor "#' + anchor + '" not found in ' + rel(resolved) });
      }
    }
  }
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

if (problems.length === 0) {
  console.log('OK: no broken internal links found across ' + mdFiles.length + ' markdown files.');
} else {
  console.log('FOUND ' + problems.length + ' broken links:\n');
  for (const p of problems) {
    console.log('- [' + p.file + '] (' + p.link + ') -> ' + p.reason);
  }
  process.exitCode = 1;
}
