/** Run default dry-run, then review exact plan SHA before explicit apply. */
import {config} from 'dotenv';
import pg from 'pg';
import {runLouisianaHouseCorrection} from '../server/louisiana-house-catalog';
config({path:process.env.ELECTION_ENV_FILE||'.env',quiet:true});
async function main(){
  const args=process.argv.slice(2);
  if(args.some(a=>!['--apply','--dry-run'].includes(a)&&!/^--expect-plan-sha256=[a-f0-9]{64}$/.test(a)))throw new Error('Use --dry-run (default) or --apply --expect-plan-sha256=<reviewed hash>');
  if(args.includes('--apply')&&args.includes('--dry-run'))throw new Error('Choose apply or dry-run');
  if(args.filter(a=>a.startsWith('--expect-plan-sha256=')).length>1)throw new Error('Pass only one reviewed plan SHA');
  const apply=args.includes('--apply'),expectedPlanSha256=args.find(a=>a.startsWith('--expect-plan-sha256='))?.split('=')[1];
  if(apply&&!expectedPlanSha256)throw new Error('Apply requires reviewed plan SHA256');
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required before opening a connection');
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000,allowExitOnIdle:true,options:apply?undefined:'-c default_transaction_read_only=on'});
  try{const plan=await runLouisianaHouseCorrection(pool,{apply,expectedPlanSha256});console.log(JSON.stringify({outcome:apply?'applied':'read-only-dry-run',...plan}));}finally{await pool.end();}
}
main().catch(error=>{const code=(error as {code?:string}).code;console.error(JSON.stringify({outcome:'failed',code,message:code?'Catalog database operation failed':error instanceof Error?error.message:'Catalog correction failed'}));process.exitCode=1;});
