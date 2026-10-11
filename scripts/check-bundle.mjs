import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist/public');
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
if (!scripts.length) throw new Error('Built index has no script entry');
const budget = Number(process.env.MAX_ENTRY_BYTES || 400_000);
if (!Number.isFinite(budget) || budget <= 0) throw new Error('Invalid MAX_ENTRY_BYTES');
let total = 0;
for (const src of scripts) {
  const file = path.resolve(root, src.replace(/^\//, ''));
  if (!file.startsWith(root + path.sep)) throw new Error(`Nonlocal entry: ${src}`);
  const { size } = await fs.stat(file);
  total += size;
  console.log(JSON.stringify({ entry: src, bytes: size }));
}
console.log(JSON.stringify({ totalEntryBytes: total, budget, passed: total <= budget }));
if (total > budget) process.exitCode = 1;
