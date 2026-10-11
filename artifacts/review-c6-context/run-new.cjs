const {createRequire}=require('node:module');const {execFileSync}=require('node:child_process');const path=require('node:path');
const base=__dirname;const req=createRequire('D:/projects/et-wt/sol-c6-results/package.json');
req('esbuild').buildSync({entryPoints:[path.join(base,'new-controls.ts')],bundle:true,platform:'node',format:'cjs',target:'node20',nodePaths:['D:/projects/et-wt/sol-c6-results/node_modules'],outfile:path.join(base,'new-controls.cjs'),logLevel:'warning'});
execFileSync(process.execPath,[path.join(base,'new-controls.cjs')],{cwd:base,stdio:'inherit'});
