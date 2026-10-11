import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const execute=promisify(execFile);const suffix=process.pid+'-'+randomBytes(3).toString('hex');
const network='et-congress-'+suffix,db=network+'-db',image='electiontracker:congress-import-'+suffix;
const evidence=resolve('artifacts/congress-import/private-'+suffix);await mkdir(evidence,{recursive:true});
const password=randomBytes(24).toString('hex'),databaseURL=`postgresql://et_congress_official_test:${password}@${db}:5432/et_congress_official_test`;
const report={outcome:'Failed',network:'internal; zero published ports',image,evidence};
async function docker(...args){try{return (await execute('docker',args,{timeout:600000,maxBuffer:16*1024*1024})).stdout.trim();}catch(e){throw new Error(`docker ${args[0]} failed: ${String(e.stderr??e.message).replaceAll(password,'[redacted]')}`);}}
try{
  const build=await docker('build','--target','builder','-t',image,'.');await writeFile(resolve(evidence,'image-build.txt'),build);
  report.imageId=await docker('image','inspect','--format','{{.Id}}',image);
  await docker('network','create','--internal',network);await docker('run','-d','--name',db,'--network',network,'-e','POSTGRES_USER=et_congress_official_test','-e','POSTGRES_DB=et_congress_official_test','-e','POSTGRES_PASSWORD='+password,'postgres:16-alpine');
  for(let i=0;i<30;i++){try{await docker('exec',db,'pg_isready','-U','et_congress_official_test','-d','et_congress_official_test');break;}catch{await new Promise(r=>setTimeout(r,1000));}}
  const run=async(command)=>docker('run','--rm','--network',network,'-e','DATABASE_URL='+databaseURL,'-e','CONGRESS_EVIDENCE_DIR=/evidence','-v',evidence+':/evidence','--entrypoint','sh',image,'-c',command);
  await writeFile(resolve(evidence,'schema-initial.txt'),await run('node_modules/.bin/drizzle-kit push --force'));
  await writeFile(resolve(evidence,'compiled-acceptance.txt'),await run('node scripts/build-congress-import.mjs && node_modules/.bin/esbuild scripts/verify_official_congress.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/verify-official-congress.js && node dist/verify-official-congress.js'));
  const before=await docker('exec',db,'psql','-U','et_congress_official_test','-d','et_congress_official_test','-Atc',"SELECT count(*),md5(string_agg(row_to_json(r)::text,'' ORDER BY id)) FROM congress_official_import_runs r");
  // The unknown synthetic column was proved preserved by the importer. Remove
  // it explicitly before a full schema sync; no unmodelled column drop is credited.
  await docker('exec',db,'psql','-U','et_congress_official_test','-d','et_congress_official_test','-c','ALTER TABLE congress_members DROP COLUMN retained_note');
  await writeFile(resolve(evidence,'schema-repeat.txt'),await run('node_modules/.bin/drizzle-kit push --force'));
  const after=await docker('exec',db,'psql','-U','et_congress_official_test','-d','et_congress_official_test','-Atc',"SELECT count(*),md5(string_agg(row_to_json(r)::text,'' ORDER BY id)) FROM congress_official_import_runs r");
  if(before!==after)throw new Error('Drizzle sync changed durable audit rows');report.auditSchemaSync={outcome:'Worked',before,after};
  const preflight=await run("node scripts/build-congress-import.mjs && DATABASE_URL=postgresql://unused@unreachable.invalid:5432/unused node dist/sync_official_congress.js --receipt /missing-parent/receipt.json 2>&1 || true");
  if(!preflight.includes('ENOENT')||preflight.includes('ENOTFOUND'))throw new Error('CLI output preflight did not precede database use');report.cliDirectoryPreflight={outcome:'Worked',output:preflight};
  report.manifestSha256=createHash('sha256').update(await readFile('data/congress/119/official-current-members.json')).digest('hex');report.outcome='Worked';
}catch(e){report.error=e.message;process.exitCode=1;}finally{
  await docker('rm','-f',db).catch(()=>{});await docker('network','rm',network).catch(()=>{});await writeFile(resolve(evidence,'harness-receipt.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));
