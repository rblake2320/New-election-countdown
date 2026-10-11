import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await build({entryPoints:['scripts/sync_official_congress.ts'],platform:'node',packages:'external',bundle:true,format:'esm',outfile:'dist/sync_official_congress.js'});
await mkdir('dist/congress-data',{recursive:true});
for(const file of ['official-current-members.json','source-derivation-receipt.json','house-source-receipt.json','senate-source-receipt.json'])await copyFile('data/congress/119/'+file,'dist/congress-data/'+file);
await copyFile('migrations/20261011_congress_official_import.sql','dist/congress-data/migration.sql');
