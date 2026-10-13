import pg from 'pg';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, realpathSync, lstatSync,openSync,fsyncSync,closeSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { canonical } from '../server/official-results-manifest';

export const DATA_TABLES = ['elections','candidates','candidate_source_records','general_candidate_list_snapshots','candidate_ingest_runs','election_catalog_correction_runs','official_results_sync_runs'] as const;
export type DataTable = typeof DATA_TABLES[number];
export type SourceSnapshot = { version:1; database:string; tables:Record<DataTable,Record<string,unknown>[]>; hash:string };
export class SourceReleaseRefused extends Error { constructor(public readonly code:string,message:string){super(message);this.name='SourceReleaseRefused';} }
export function requirePrivateDatabase(name:string):void {if(!/^et_sol_data_[a-z0-9_]+$/.test(name))throw new SourceReleaseRefused('PRIVATE_DATABASE_REQUIRED','Only the approved source-data private database prefix is writable');}
export function sourceHash(value:unknown):string{return createHash('sha256').update(canonical(value)).digest('hex');}
export type DatabaseAuthorization = (database:string)=>void;
export async function guard(client:pg.PoolClient,expected:string,authorize:DatabaseAuthorization=requirePrivateDatabase):Promise<void>{authorize(expected);const actual=(await client.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];authorize(actual.database);/* Installed pg Client exposes these fields; @types/pg omits them on PoolClient. */const transport=client as pg.PoolClient&{readonly host:string;readonly port:number};if(actual.database!==expected||!['localhost','127.0.0.1','::1'].includes(transport.host)||transport.port!==5432||actual.port!==5432)throw new SourceReleaseRefused('DATABASE_MISMATCH','Connection is not the exact approved local target');}
export async function snapshot(client:pg.PoolClient,database:string,allowMissing=false,authorize:DatabaseAuthorization=requirePrivateDatabase):Promise<SourceSnapshot>{
  await guard(client,database,authorize);const tables={} as SourceSnapshot['tables'];
  for(const table of DATA_TABLES){const found=(await client.query('SELECT to_regclass($1) AS target',['public.'+table])).rows[0].target;if(!found){if(!allowMissing)throw new SourceReleaseRefused('MISSING_SOURCE_SCHEMA','Required source-only table is absent: '+table);tables[table]=[];continue;}tables[table]=(await client.query(`SELECT to_jsonb(t) AS row FROM public.${table} t ORDER BY t.id`)).rows.map(r=>r.row);}
  return {version:1,database,tables,hash:sourceHash(tables)};
}
const PRIVATE_ROOT=resolve('C:/.codex/private/election-source-backups');
export function requirePrivatePath(path:string):void{const rel=relative(PRIVATE_ROOT,resolve(path));if(!rel||rel.startsWith('..')||resolve(path)===PRIVATE_ROOT)throw new SourceReleaseRefused('PRIVATE_BACKUP_PATH_REQUIRED','Raw row images must remain under the owner-restricted backup root');}
export function createPrivateDirectory(path:string):void{
  requirePrivatePath(path);mkdirSync(path,{recursive:true});if(lstatSync(path).isSymbolicLink()||realpathSync(path).toLowerCase()!==resolve(path).toLowerCase())throw new SourceReleaseRefused('BACKUP_LINK_REFUSED','Private backup path cannot be a junction or symlink');
  if(process.platform!=='win32')throw new SourceReleaseRefused('OWNER_ACL_REQUIRED','This Windows release rehearsal requires verified owner ACLs');
  const cmd=[
    '$ErrorActionPreference="Stop";$p=$env:SOURCE_RELEASE_BACKUP_DIR',
    '$sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User',
    '$acl=[System.IO.Directory]::GetAccessControl($p);$acl.SetAccessRuleProtection($true,$false);foreach($old in @($acl.GetAccessRules($true,$false,[System.Security.Principal.SecurityIdentifier]))){$acl.RemoveAccessRuleAll($old)}',
    'foreach($who in @($sid,(New-Object System.Security.Principal.SecurityIdentifier("S-1-5-18")))){$rule=New-Object System.Security.AccessControl.FileSystemAccessRule($who,"FullControl","ContainerInherit,ObjectInherit","None","Allow");$acl.AddAccessRule($rule)}',
    '[System.IO.Directory]::SetAccessControl($p,$acl);$check=[System.IO.Directory]::GetAccessControl($p)',
    'if(-not $check.AreAccessRulesProtected -or @($check.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])|Where-Object{$_.IdentityReference.Value -notin @($sid.Value,"S-1-5-18")}).Count -ne 0){throw "Owner ACL verification failed"}',
  ].join(';');
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',cmd],{stdio:'pipe',windowsHide:true,env:{...process.env,SOURCE_RELEASE_BACKUP_DIR:path}});
}
export function savePrivateSnapshot(path:string,value:SourceSnapshot):void{requirePrivatePath(path);if(sourceHash(value.tables)!==value.hash)throw new SourceReleaseRefused('SNAPSHOT_HASH_MISMATCH','Private row-image hash is invalid');const fd=openSync(path,'wx',0o600);try{writeFileSync(fd,JSON.stringify(value)+'\n');fsyncSync(fd);}finally{closeSync(fd);}}
export function validateSourceSnapshot(value:unknown,authorize:DatabaseAuthorization=requirePrivateDatabase):SourceSnapshot{const s=value as SourceSnapshot;if(!s||typeof s!=='object'||s.version!==1||typeof s.database!=='string'||!s.tables||typeof s.tables!=='object'||Object.keys(s.tables).sort().join('|')!==[...DATA_TABLES].sort().join('|')||DATA_TABLES.some(t=>!Array.isArray(s.tables[t]))||sourceHash(s.tables)!==s.hash)throw new SourceReleaseRefused('SNAPSHOT_HASH_MISMATCH','Private row-image schema/hash is invalid');authorize(s.database);return s;}
export function loadPrivateSnapshot(path:string,authorize:DatabaseAuthorization=requirePrivateDatabase):SourceSnapshot{requirePrivatePath(path);let value:unknown;try{value=JSON.parse(readFileSync(path,'utf8'));}catch(error){if(error instanceof SyntaxError)throw new SourceReleaseRefused('INVALID_SNAPSHOT_JSON','Private row-image JSON is incomplete or malformed; its contents are never printed');throw error;}return validateSourceSnapshot(value,authorize);}

/** Compare the complete postimage under locks; restore only allowlisted rows in one transaction. */
export async function rollbackSourceRows(pool:pg.Pool,before:SourceSnapshot,after:SourceSnapshot,options:{faultAfterWrites?:number;authorizeDatabase?:DatabaseAuthorization}={}):Promise<{hash:string;restoredRows:number;deletedInsertedRows:number}>{
  const authorize=options.authorizeDatabase??requirePrivateDatabase;authorize(before.database);authorize(after.database);if(before.database!==after.database||sourceHash(before.tables)!==before.hash||sourceHash(after.tables)!==after.hash)throw new SourceReleaseRefused('SNAPSHOT_HASH_MISMATCH','Rollback snapshots are not bound to the same approved database');
  const client=await pool.connect();let restoredRows=0,deletedInsertedRows=0,writes=0,admitted=false;
  try{
    const admission=await client.query<{admitted:boolean}>('SELECT pg_try_advisory_lock($1) AS admitted',[2026110301]);
    if(admission.rows[0]?.admitted!==true)throw new SourceReleaseRefused('SOURCE_WRITER_BUSY','Rollback refused before transaction because source writer admission is busy');
    admitted=true;
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');await client.query("SET LOCAL statement_timeout='60s'");await client.query("SET LOCAL lock_timeout='5s'");
    await client.query('LOCK TABLE '+DATA_TABLES.map(t=>'public.'+t).join(',')+' IN SHARE ROW EXCLUSIVE MODE');
    await guard(client,before.database,authorize);
    const current=await snapshot(client,before.database,false,authorize);if(current.hash!==after.hash)throw new SourceReleaseRefused('POSTIMAGE_DRIFT','Rollback refused because source data changed after the retained postimage');
    // Current partial UNIQUE markers must be retired before older versions reactivate.
    for(const t of ['candidate_source_records','general_candidate_list_snapshots'] as const)await client.query(`UPDATE public.${t} SET is_current=false WHERE is_current=true`);
    const childFirst:DataTable[]=['candidate_source_records','general_candidate_list_snapshots','official_results_sync_runs','candidate_ingest_runs','election_catalog_correction_runs','candidates','elections'];
    for(const table of childFirst){
      const oldIds=new Set(before.tables[table].map(r=>String(r.id)));const inserted=after.tables[table].filter(r=>!oldIds.has(String(r.id))).map(r=>r.id);
      if(inserted.length){const q=await client.query(`DELETE FROM public.${table} WHERE id::text=ANY($1::text[])`,[inserted.map(String)]);deletedInsertedRows+=q.rowCount??0;}
    }
    for(const table of DATA_TABLES){
      const cols=(await client.query('SELECT column_name FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=$1 AND is_generated=\'NEVER\' ORDER BY ordinal_position',[table])).rows.map(r=>r.column_name as string);const writable=cols.filter(c=>c!=='id');const quote=(s:string)=>'"'+s.replaceAll('"','""')+'"';
      for(const record of before.tables[table]){
        const query=`UPDATE public.${table} AS t SET (${writable.map(quote).join(',')})=(SELECT ${writable.map(c=>'x.'+quote(c)).join(',')} FROM jsonb_populate_record(NULL::public.${table},$1::jsonb) AS x) WHERE t.id::text=$2`;
        const result=await client.query(query,[JSON.stringify(record),String(record.id)]);if(result.rowCount!==1)throw new SourceReleaseRefused('ORIGINAL_ROW_MISSING','An original source row is missing; rollback refuses to synthesize it');restoredRows++;if(++writes===options.faultAfterWrites)throw new SourceReleaseRefused('INJECTED_ROLLBACK_FAILURE','Private rollback fault control');
      }
    }
    const restored=await snapshot(client,before.database,false,authorize);if(restored.hash!==before.hash)throw new SourceReleaseRefused('RESTORE_HASH_MISMATCH','Restored source row hash differs from original');await client.query('COMMIT');return{hash:restored.hash,restoredRows,deletedInsertedRows};
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{
    let cleanupError:SourceReleaseRefused|undefined;
    if(admitted){try{const released=await client.query<{released:boolean}>('SELECT pg_advisory_unlock($1) AS released',[2026110301]);if(released.rows[0]?.released!==true)cleanupError=new SourceReleaseRefused('ROLLBACK_LOCK_CLEANUP_FAILED','Rollback admission lock could not be released');}catch{cleanupError=new SourceReleaseRefused('ROLLBACK_LOCK_CLEANUP_FAILED','Rollback admission connection failed during cleanup');}}
    client.release(Boolean(cleanupError));if(cleanupError)throw cleanupError;
  }
}
