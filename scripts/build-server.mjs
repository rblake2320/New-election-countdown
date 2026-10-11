import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const tsconfig = JSON.parse(readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8'));

await build({
  entryPoints: ['server/index.ts'],
  // Preserve this builder's prior define semantics when the checker target changes.
  // The client/checker retain their existing assignment semantics in tsconfig.json.
  tsconfigRaw: { ...tsconfig, compilerOptions: { ...tsconfig.compilerOptions, useDefineForClassFields: true } },
  platform: 'node',
  packages: 'external',
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  define: { 'process.env.NODE_ENV': '"production"' },
});
