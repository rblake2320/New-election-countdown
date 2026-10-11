import { openSync,closeSync,writeFileSync,renameSync,unlinkSync,readFileSync,fsyncSync,existsSync } from 'node:fs';
import { resolve,dirname,join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import pg from 'pg';
import { loadOfficialCongressSnapshot,syncOfficialCongress,legacyRemovalPlanSchema } from '../server/congress-official-import';

const {values}=parseArgs({options:{apply:{type:'boolean',default:false},manifest:{type:'string'},receipt:{type:'string'},'expect-manifest-sha':{type:'string'},'expect-preimage-sha':{type:'string'},'legacy-removal-plan':{type:'string'},'expect-removal-plan-sha':{type:'string'}},strict:true});
let committedReceipt:Awaited<ReturnType<typeof syncOfficialCongress>>|null=null;
let temporary:string|null=null;
let ownedReceiptPath:string|null=null;
try{
  if(!values.receipt)throw new Error('--receipt must name a new local receipt file');
  const output=resolve(values.receipt);const directory=dirname(output);
  // Reservation and same-directory write/rename preflight happen before DB use.
  const reservation=openSync(output,'wx');closeSync(reservation);ownedReceiptPath=output;
  const probe=join(directory,'.congress-preflight-'+randomUUID());const moved=probe+'.moved';
  try{writeFileSync(probe,'preflight',{flag:'wx'});renameSync(probe,moved);unlinkSync(moved);}finally{for(const file of [probe,moved])try{unlinkSync(file);}catch{}}
  loadOfficialCongressSnapshot(values.manifest);
  const legacyRemovalPlan=values['legacy-removal-plan']?legacyRemovalPlanSchema.parse(JSON.parse(readFileSync(resolve(values['legacy-removal-plan']),'utf8'))):undefined;
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL must be injected into this process');
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:5000});
  try{
    const receipt=await syncOfficialCongress(pool,{mode:values.apply?'apply':'dry-run',manifestPath:values.manifest,expectedManifestSha256:values['expect-manifest-sha'],expectedPreimageSha256:values['expect-preimage-sha'],legacyRemovalPlan,expectedLegacyRemovalPlanSha256:values['expect-removal-plan-sha']});
    committedReceipt=receipt.committed?receipt:null;
    temporary=output+'.pending-'+randomUUID();
    const handle=openSync(temporary,'wx');try{writeFileSync(handle,JSON.stringify(receipt,null,2)+'\n');fsyncSync(handle);}finally{closeSync(handle);}
    renameSync(temporary,output);temporary=null;
    console.log(JSON.stringify({outcome:receipt.committed?'Applied':'Dry-run',runId:receipt.runId,changedCount:receipt.changedCount,sourceMemberCount:receipt.sourceMemberCount,catalogComplete:receipt.catalogComplete,unreviewedLegacyRowIds:receipt.unreviewedLegacyRowIds,receipt:output}));
  }finally{await pool.end();}
}catch(error){
  if(committedReceipt)console.error(JSON.stringify({outcome:'Applied',committed:true,runId:committedReceipt.runId,receiptExport:'Failed',temporaryReceipt:temporary&&existsSync(temporary)?temporary:null,errorCode:(error as NodeJS.ErrnoException).code??'LOCAL_RECEIPT_EXPORT'}));
  else {
    const refused={outcome:'Refused',committed:false,error:(error as Error).message};
    if(ownedReceiptPath)try{writeFileSync(ownedReceiptPath,JSON.stringify(refused,null,2)+'\n');}catch{}
    console.error(JSON.stringify(refused));
  }
  process.exitCode=1;
}
