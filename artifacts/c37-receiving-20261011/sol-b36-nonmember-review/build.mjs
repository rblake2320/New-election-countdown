import {build} from 'file:///D:/projects/et-wt/lane-b-et36/node_modules/esbuild/lib/main.js';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const repo='D:/projects/et-wt/lane-b-et36',nm=repo+'/node_modules';
for(const [label,head] of [['old','dea5bf21967d742f6b8853653082dd370c8871d2'],['new','96201290851fe8e0e39dcece19a6891abc77fb6c']]) {
  const seen=[];const plugin={name:'pinned-git-source',setup(b){b.onLoad({filter:/\.(tsx?|jsx?)$/},args=>{
    const path=args.path.replaceAll('\\','/');if(!path.toLowerCase().startsWith((repo+'/client/src/').toLowerCase())&&path.toLowerCase()!==(repo+'/server/congress-members-routes.ts').toLowerCase())return null;
    const rel=path.slice(repo.length+1),bytes=execFileSync('git',['show',head+':'+rel],{cwd:repo});seen.push({file:rel,sha256:createHash('sha256').update(bytes).digest('hex')});return {contents:bytes.toString('utf8'),loader:rel.endsWith('tsx')?'tsx':'ts'};
  });}};
  await fs.writeFile(`${label}-entry.mjs`,`export * from '${repo}/client/src/lib/congress-members.ts';
export { CongressData } from '${repo}/client/src/components/congress-data.tsx';
export { ErrorBoundary } from '${repo}/client/src/components/ErrorBoundary.tsx';
export * as apiScope from '${repo}/server/congress-members-routes.ts';
export { QueryClient, QueryClientProvider } from '@tanstack/react-query';
export { createElement } from 'react';
export { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
${label==='new'?`export * from '${repo}/client/src/lib/fetch-list.ts';`:''}`);
  await build({entryPoints:[`${label}-entry.mjs`],bundle:true,platform:'node',format:'esm',jsx:'automatic',outfile:`${label}-runtime.mjs`,nodePaths:[nm],alias:{'@':repo+'/client/src','react':nm+'/react','react-dom':nm+'/react-dom','@tanstack/react-query':nm+'/@tanstack/react-query'},plugins:[plugin],banner:{js:"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"},logLevel:'warning'});
  await fs.writeFile(`${label}-source-receipt.json`,JSON.stringify({head,files:seen},null,2)+'\n');
  console.log(JSON.stringify({label,head,sourceFiles:seen.length}));
}
