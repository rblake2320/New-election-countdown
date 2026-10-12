/**
 * The app's default query function fetches only queryKey[0]. A query whose key has
 * more segments (an id, a filter) and no queryFn silently fetches the wrong URL:
 * Happening Now asked for ['/api/elections', id, 'results'] and got the election
 * list, so no result could ever show (ET-6). Every such query must pass its URL.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd(), 'client/src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
  });
}

function multiSegmentKeysWithoutQueryFn(): string[] {
  const found: string[] = [];
  for (const file of sourceFiles(root)) {
    const s = readFileSync(file, 'utf8');
    const re = /use(?:Infinite)?Query(?:<[^(]*?>)?\(\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      let i = m.index + m[0].length, depth = 1;
      while (depth && i < s.length) { const c = s[i++]; if (c === '{') depth++; else if (c === '}') depth--; }
      const block = s.slice(m.index, i);
      const key = /queryKey:\s*(\[[^\]]*\])/.exec(block);
      if (!key || /queryFn\s*:/.test(block)) continue;
      if (key[1].slice(1, -1).split(',').filter(x => x.trim()).length > 1)
        found.push(`${relative(root, file)}:${s.slice(0, m.index).split('\n').length} ${key[1]}`);
    }
  }
  return found;
}

describe('query keys and URLs', () => {
  it('no multi-segment queryKey relies on the default (queryKey[0]-only) fetcher', () => {
    expect(multiSegmentKeysWithoutQueryFn()).toEqual([]);
  });

  it('the scan detects the pattern it guards against', () => {
    expect(sourceFiles(root).length).toBeGreaterThan(50);
    const sample = "useQuery({ queryKey: ['/api/elections', id, 'results'], enabled: true })";
    expect(/queryKey:\s*(\[[^\]]*\])/.exec(sample)![1].split(',').length).toBe(3);
  });
});
