import {build} from 'file:///D:/projects/et-wt/sol-congress-source-investigation/node_modules/esbuild/lib/main.js';
await build({entryPoints:['snapshot/server/congress-official-import.ts'],bundle:true,platform:'node',format:'esm',outfile:'dist/probe.mjs',nodePaths:['D:/projects/et-wt/sol-congress-source-investigation/node_modules'],logLevel:'warning'});
