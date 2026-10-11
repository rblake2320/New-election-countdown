// Evidence replay only; stages an isolated diagnostic test and removes only it.
import { readFileSync, writeFileSync, unlinkSync, existsSync, realpathSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const directory=dirname(fileURLToPath(import.meta.url));
const root=resolve(directory,'../..');
if(realpathSync(process.cwd())!==realpathSync(root)) throw new Error('Run from this owned worktree root');
const staged=resolve(directory,'offline-legacy-staged.test.ts');
if(dirname(staged)!==directory||existsSync(staged)) throw new Error('Refuse existing/out-of-scope staged file');
writeFileSync(staged,readFileSync(resolve(directory,'legacy-import-probe.test.ts.txt')),{flag:'wx'});
try {
  const run=spawnSync(process.execPath,[resolve(root,'node_modules/vitest/vitest.mjs'),'run',staged,'--reporter=json','--outputFile='+resolve(directory,'legacy-vitest.json')],{cwd:root,encoding:'utf8'});
  writeFileSync(resolve(directory,'legacy-vitest.txt'),(run.stdout??'')+(run.stderr??''));
  if(run.error) throw run.error;
  process.stdout.write(`Legacy diagnostic assertions exit ${run.status}; retained legacy-vitest.json\n`);
  process.exitCode=run.status??1;
}finally {unlinkSync(staged);}
