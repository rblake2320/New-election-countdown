import { build } from 'esbuild';

await build({
  entryPoints: ['server/index.ts', 'scripts/sync_official_results.ts'],
  platform: 'node',
  packages: 'external',
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  entryNames: '[name]',
  define: { 'process.env.NODE_ENV': '"production"' },
});
