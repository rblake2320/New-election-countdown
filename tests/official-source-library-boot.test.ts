import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';

function actualBundle(name:string){
  const scratch=mkdtempSync(join(tmpdir(),'sol-packet-library-boot-'));
  const output=join(scratch,'entry.mjs');
  // npm may install bin/esbuild as a native executable (Linux) or JS launcher
  // (Windows). Load its JS API in the child instead of asking Node to parse ELF.
  const build=spawnSync(process.execPath,['--input-type=module','-e',
    "import { buildSync } from 'esbuild'; buildSync({ entryPoints: [process.argv[1]], bundle: true, platform: 'node', format: 'esm', outfile: process.argv[2] });",
    resolve('artifacts/source-packet',name+'.ts'),output],{encoding:'utf8',timeout:5000});
  if(build.error||build.status!==0)throw new Error(`Actual esbuild CLI failed: ${build.stderr}`);
  return spawnSync(process.execPath,[output],{cwd:scratch,encoding:'utf8',timeout:5000});
}
describe('Actual bundled server-style packet import boundary',()=>{
  it('retains old negative: bundled CLI import runs argv guard and poisons server exitCode',()=>{
    const child=actualBundle('probe-old-library-boot');expect(child.error).toBeUndefined();expect(child.status).toBe(1);expect(child.stdout).toContain('CLI_ARGUMENT');expect(child.stdout).toContain('"exitCode":1');
  });
  it('canonical pure library import emits only boot marker and leaves exitCode unchanged',()=>{
    const child=actualBundle('probe-library-boot');expect(child.error).toBeUndefined();expect(child.status).toBe(0);expect(child.stderr).toBe('');
    const result=JSON.parse(child.stdout);expect(result.outcome).toBe('Worked');expect(result.exitCodeUnchanged).toBe(true);expect(child.stdout).not.toContain('CLI_ARGUMENT');
  });
});
