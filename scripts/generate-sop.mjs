import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return null;
  }
  const frontmatterLines = [];
  let idx = 1;
  while (idx < lines.length && lines[idx].trim() !== '---') {
    frontmatterLines.push(lines[idx]);
    idx += 1;
  }
  if (idx >= lines.length) {
    return null;
  }

  const data = {};
  let currentKey = null;
  for (const line of frontmatterLines) {
    if (!line.trim()) {
      continue;
    }
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      const rawValue = keyMatch[2];
      if (rawValue) {
        data[currentKey] = rawValue.replace(/^['"]|['"]$/g, '');
      } else {
        data[currentKey] = [];
      }
      continue;
    }
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }
      data[currentKey].push(listMatch[1].trim());
    }
  }

  const sopList = Array.isArray(data.sop) ? data.sop.filter(Boolean) : [];
  if (sopList.length === 0) {
    return null;
  }

  return {
    title: typeof data.title === 'string' && data.title ? data.title : null,
    required: String(data.required || '').toLowerCase() === 'true',
    sop: sopList,
  };
}

function renderSop(items) {
  const lines = [];
  lines.push('# Agency SOP');
  lines.push('');
  lines.push('This SOP is generated from docs frontmatter. Do not edit manually.');
  lines.push('');
  lines.push('## Update Requirements');
  lines.push('- When a document with SOP frontmatter changes, regenerate this file with `node scripts/generate-sop.mjs` and commit `docs/sop.md`.');
  lines.push('- Add new SOP items by updating the `sop` list in the source document frontmatter.');
  lines.push('- Keep SOP items small and actionable; use the source document for details.');
  lines.push('');
  lines.push('## SOP Items');

  for (const item of items) {
    lines.push('');
    lines.push(`### ${item.title || path.basename(item.path)}`);
    lines.push(`Source: \`${item.path}\`${item.required ? ' (required)' : ''}`);
    for (const entry of item.sop) {
      lines.push(`- ${entry}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

async function main() {
  const files = await walk(DOCS_DIR);
  const items = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const meta = parseFrontmatter(content);
    if (!meta) {
      continue;
    }
    items.push({
      path: path.relative(ROOT, file),
      title: meta.title,
      required: meta.required,
      sop: meta.sop,
    });
  }

  items.sort((a, b) => a.path.localeCompare(b.path));
  const output = renderSop(items);
  await fs.writeFile(path.join(DOCS_DIR, 'sop.md'), output, 'utf8');
  console.log(`Generated docs/sop.md from ${items.length} source file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
