import { mkdtempSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { beforeAll, describe, it, expect } from 'vitest';

const probeNames = ['probe-old-library-boot', 'probe-library-boot'] as const;
type ProbeName = typeof probeNames[number];
const childBudgetMs = 5000;
let scratch: string;
let outputs: Record<ProbeName, string>;

function actualRuntime(name: ProbeName) {
  const started = performance.now();
  const child = spawnSync(process.execPath, [outputs[name]], {
    cwd: scratch, encoding: 'utf8', timeout: childBudgetMs,
  });
  console.info(JSON.stringify({ phase: 'runtime', probe: name,
    elapsedMs: performance.now() - started, budgetMs: childBudgetMs,
    status: child.status, signal: child.signal, error: child.error?.message ?? null }));
  return child;
}

describe('Actual bundled server-style packet import boundary', () => {
  beforeAll(() => {
    scratch = mkdtempSync(join(tmpdir(), 'sol-packet-library-boot-'));
    outputs = Object.fromEntries(probeNames.map(name => [name, join(scratch, name + '.mjs')])) as Record<ProbeName, string>;
    const entries = probeNames.map(name => resolve('artifacts/source-packet', name + '.ts'));
    // One real compiler child builds both immutable probe wrappers once. Runtime
    // assertions retain their own unchanged 5 s budget without paying compilation.
    // The JS API works with both Linux native and Windows JS esbuild launchers.
    const started = performance.now();
    const build = spawnSync(process.execPath, ['--input-type=module', '-e',
      "import { buildSync } from 'esbuild'; buildSync({ entryPoints: process.argv.slice(1, 3), bundle: true, platform: 'node', format: 'esm', outdir: process.argv[3], outExtension: { '.js': '.mjs' } });",
      ...entries, scratch], { encoding: 'utf8', timeout: childBudgetMs });
    console.info(JSON.stringify({ phase: 'compile', elapsedMs: performance.now() - started,
      budgetMs: childBudgetMs, status: build.status, signal: build.signal,
      error: build.error?.message ?? null,
      wrapperSha256: entries.map(path => createHash('sha256').update(readFileSync(path)).digest('hex')) }));
    if (build.error || build.status !== 0) {
      throw new Error(`Actual esbuild compile failed: status=${build.status} signal=${build.signal} error=${build.error?.message ?? 'none'} stderr=${build.stderr}`);
    }
  }, childBudgetMs);

  it('retains old negative: bundled CLI import runs argv guard and poisons server exitCode', () => {
    const child = actualRuntime('probe-old-library-boot');
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(1);
    expect(child.stdout).toContain('CLI_ARGUMENT');
    expect(child.stdout).toContain('"exitCode":1');
  });

  it('canonical pure library import emits only boot marker and leaves exitCode unchanged', () => {
    const child = actualRuntime('probe-library-boot');
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    expect(child.stderr).toBe('');
    const result = JSON.parse(child.stdout);
    expect(result.outcome).toBe('Worked');
    expect(result.exitCodeUnchanged).toBe(true);
    expect(child.stdout).not.toContain('CLI_ARGUMENT');
  });
});
