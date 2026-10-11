const {createRequire}=require('node:module');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const base=__dirname;
const req=createRequire('D:/projects/et-wt/sol-c6-results/package.json');
req('esbuild').buildSync({entryPoints:[path.join(base,'probes.tsx')],bundle:true,platform:'node',format:'cjs',target:'node20',jsx:'automatic',alias:{'@':path.join(base,'fixed/client/src'),'react':'D:/projects/et-wt/sol-c6-results/node_modules/react','react-dom':'D:/projects/et-wt/sol-c6-results/node_modules/react-dom'},nodePaths:['D:/projects/et-wt/sol-c6-results/node_modules'],outfile:path.join(base,'probes.cjs'),logLevel:'warning'});
execFileSync(process.execPath,[path.join(base,'probes.cjs')],{cwd:base,stdio:'inherit'});
