import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
const root=process.cwd(),base='8b49d60030b7c94ce772c1b3137ba43a4f85fbcb';
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);if(config.error)throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText,' '));
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root);parsed.options.incremental=false;
const newFile=resolve('server/congress-official-import.ts');
const baselineText=new Map(['server/congress-import-service.ts','shared/schema.ts'].map(file=>[resolve(file),execFileSync('git',['show',base+':'+file],{encoding:'utf8'})]));
function check(baseline){
  const host=ts.createCompilerHost(parsed.options);const original=host.getSourceFile.bind(host);
  if(baseline)host.getSourceFile=(file,language,onError,newSource)=>baselineText.has(resolve(file))?ts.createSourceFile(file,baselineText.get(resolve(file)),language,true):original(file,language,onError,newSource);
  const program=ts.createProgram(parsed.fileNames.filter(file=>!baseline||resolve(file)!==newFile),parsed.options,host);
  return ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?relative(root,d.file.fileName).replaceAll('\\','/'):null,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
}
const before=check(true),after=check(false);const counts=new Map();for(const d of before){const key=JSON.stringify(d);counts.set(key,(counts.get(key)??0)+1);}const added=[];for(const d of after){const key=JSON.stringify(d),left=counts.get(key)??0;if(left)counts.set(key,left-1);else added.push(d);}
const strictOptions={...parsed.options,strict:true};const strictProgram=ts.createProgram([newFile,resolve('scripts/sync_official_congress.ts'),resolve('scripts/verify_official_congress.ts')],strictOptions);
const owned=['server/congress-official-import.ts','server/congress-import-service.ts','scripts/sync_official_congress.ts','scripts/verify_official_congress.ts'];
const strictDiagnostics=ts.getPreEmitDiagnostics(strictProgram).filter(d=>d.file&&owned.includes(relative(root,d.file.fileName).replaceAll('\\','/'))).map(d=>({file:relative(root,d.file.fileName).replaceAll('\\','/'),code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
const result={base,baselineCount:before.length,currentCount:after.length,addedDiagnostics:added,ownedStrictDiagnostics:strictDiagnostics,outcome:added.length||strictDiagnostics.length?'Failed':'Worked',strictScope:'Owned importer/service/CLI/private verifier diagnostics; strict unrelated dependency diagnostics are not counted as owned.'};
writeFileSync('artifacts/congress-import/type-comparison.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.outcome==='Failed')process.exitCode=1;
