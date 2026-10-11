// Ordinary administrator backup and restore acceptance, only in harness-owned containers.
export async function testBackupRestore({ docker, app, db, password }) {
  const registration = await docker('exec', app, 'node', '--input-type=module', '-e', `
    const r=await fetch('http://127.0.0.1:5000/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'backup-admin@example.test',password:'Disposable-Backup-2026!'})});
    if(r.status!==201)throw Error('Backup fixture registration failed');
    console.log(r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '));
  `);
  await docker('exec', db, 'psql', '-U', 'et_test', '-d', 'et_test', '-v', 'ON_ERROR_STOP=1', '-c',
    "update users set role='admin' where email='backup-admin@example.test';");
  await docker('exec', db, 'psql', '-U', 'et_test', '-d', 'et_test', '-v', 'ON_ERROR_STOP=1', '-c', 'create database et_backup_restore_test;');
  const snapshot = async database => JSON.parse(await docker('exec', db, 'psql', '-U', 'et_test', '-d', database, '-Atc', `
    SELECT json_object_agg(table_name, digest) FROM (
      SELECT table_name, (xpath('/row/digest/text()',query_to_xml(format(
        'SELECT md5(coalesce(string_agg(row_to_json(t)::text, chr(10) ORDER BY row_to_json(t)::text), '''')) AS digest FROM %I.%I t',table_schema,table_name),false,true,'')))[1]::text AS digest
      FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'
    ) snapshot;`));
  const before = await snapshot('et_test');
  const response = JSON.parse(await docker('exec', '-e', `TEST_BACKUP_COOKIE=${registration}`, app, 'node', '--input-type=module', '-e', `
    const r=await fetch('http://127.0.0.1:5000/api/admin/backup/full',{method:'POST',headers:{Cookie:process.env.TEST_BACKUP_COOKIE}});
    if(r.status!==200)throw Error('Backup HTTP status '+r.status);
    const result=await r.json();
    if(!/^backups\\/election-tracker-backup-[\\w-]+\\.sql\\.gz$/.test(result.path))throw Error('Unexpected backup path');
    console.log(JSON.stringify({status:r.status,path:result.path}));
  `));
  const dump = await docker('exec', '-e', `TEST_BACKUP_PATH=${response.path}`, app, 'node', '--input-type=module', '-e', `
    import {createReadStream,createWriteStream} from 'node:fs';
    import {pipeline} from 'node:stream/promises'; import {createGunzip} from 'node:zlib';
    const output=process.env.TEST_BACKUP_PATH+'.restore';
    await pipeline(createReadStream(process.env.TEST_BACKUP_PATH),createGunzip(),createWriteStream(output,{mode:0o600})); console.log(output);
  `);
  await docker('exec', '-e', `PGPASSWORD=${password}`, app, 'pg_restore', '--no-password', '--exit-on-error', '--no-owner', '--no-privileges', '-h', db, '-U', 'et_test', '-d', 'et_backup_restore_test', dump);
  const after = await snapshot('et_backup_restore_test');
  const tables = Object.keys(before).sort();
  if (!tables.length || tables.length !== Object.keys(after).length || tables.some(t => before[t] !== after[t])) throw Error('Restored public table contents differ');
  const query = await docker('exec', '-e', `PGPASSWORD=${password}`, '-e', `PGHOST=${db}`, app, 'node', '--input-type=module', '-e', `
    import pg from 'pg'; const client=new pg.Client({host:process.env.PGHOST,user:'et_test',password:process.env.PGPASSWORD,database:'et_backup_restore_test'});
    await client.connect(); const r=await client.query('SELECT count(*)::int AS elections FROM elections'); await client.end();
    if(r.rows[0].elections<1)throw Error('Restored app query empty'); console.log(JSON.stringify(r.rows[0]));
  `);
  return { status:'Worked', backupHttpStatus:response.status, restoredTables:tables.length, allTableDigestsMatch:true, applicationQuery:JSON.parse(query), scope:'Harness-owned private database, local archive only; no off-host recovery claim' };
}
