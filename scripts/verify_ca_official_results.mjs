import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const folder = resolve('artifacts/ca-adapter');
mkdirSync(folder, { recursive: true });
const compiled = resolve(folder, 'verify-ca.mjs');
await build({ entryPoints: ['scripts/verify_ca_official_results.ts'], outfile: compiled,
  bundle: true, platform: 'node', format: 'esm', packages: 'external', target: 'node24' });
const args = [compiled];
if (process.argv[2]) args.push(process.argv[2]);
const child = spawnSync(process.execPath, args, { encoding: 'utf8', stdio: 'inherit' });
if (child.error) throw child.error;
process.exitCode = child.status ?? 1;
