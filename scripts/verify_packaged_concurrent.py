"""Read-only companion for this run's owned internal Docker containers."""
import datetime
import json
import pathlib
import re
import subprocess
import sys
import time

app, evidence = sys.argv[1:]
if not re.fullmatch(r'et-app-\d+-[a-f0-9]{6}', app):
    raise SystemExit('Refused: only the test-container owned app name is accepted')
evidence = pathlib.Path(evidence)
for _ in range(180):
    state = subprocess.run(['docker', 'inspect', '--format', '{{.State.Running}}', app + '-proxy'], capture_output=True, text=True)
    if state.returncode == 0 and state.stdout.strip() == 'true':
        break
    time.sleep(1)
else:
    raise SystemExit('Concurrent gate blocked: owned proxy phase was not reached')
db = app.replace('et-app-', 'et-db-', 1)
control = subprocess.run(['docker', 'exec', db, 'psql', '-U', 'et_test', '-d', 'et_test', '-Atc',
                          'select coalesce(json_agg(id order by id),\'[]\'::json) from candidates where election_id=37;'], capture_output=True, text=True, check=True)
expected_ids = json.loads(control.stdout)
script = """
const paths=['/api/health','/api/elections?timeframe=upcoming','/api/elections/37/candidates','/api/elections/37/general-candidates'];
const expectedIds=EXPECTED_IDS;
const started=Date.now();
const outcomes=await Promise.all(Array.from({length:120},async(_,i)=>{
  const path=paths[i%paths.length],t=Date.now();
  try{const r=await fetch('http://127.0.0.1:5000'+path,{signal:AbortSignal.timeout(15000)});
    const body=await r.json();let valid=true;
    if(path.includes('?'))valid=Array.isArray(body)&&body.length>0;
    if(path.endsWith('/candidates'))valid=Array.isArray(body)&&JSON.stringify(body.map(c=>c.id).sort((a,b)=>a-b))===JSON.stringify(expectedIds);
    if(path==='/api/health')valid=body.ok===true;
    return {path,status:r.status,valid,elapsedMs:Date.now()-t};
  }catch(e){return {path,error:e.message,elapsedMs:Date.now()-t};}
}));
console.log(JSON.stringify({requests:120,concurrency:120,elapsedMs:Date.now()-started,
  passed:outcomes.every(r=>r.status===200&&r.valid),outcomes}));
""".replace('EXPECTED_IDS', json.dumps(expected_ids))
result = subprocess.run(['docker', 'exec', app, 'node', '--input-type=module', '-e', script], capture_output=True, text=True)
receipt = {'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'fixture': 'same harness-owned internal app; read-only requests after nominee/recovery, during proxy phase', 'app': app, 'expectedRace37Ids': expected_ids, 'exitCode': result.returncode}
if result.returncode:
    receipt['error'] = result.stderr.strip()
else:
    receipt.update(json.loads(result.stdout))
evidence.mkdir(parents=True, exist_ok=True)
(evidence / 'concurrent-http.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: v for k, v in receipt.items() if k != 'outcomes'}))
raise SystemExit(0 if receipt.get('passed') else 1)
