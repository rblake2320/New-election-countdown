import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {createHash} from 'node:crypto';
import {verifyBrowserWire} from './verify-browser-wire.mjs';
// Root owns the fixture. This stage owns only four exact browser container names.
export async function runMixedBrowserStage(opts) {
  const { docker, exec, env, names, network, label, runId, dir, bundle, prep, caFile, browserImage, base, check, save, report } = opts;
  if (!/^et6-prod-\d+-[a-f0-9]{8}$/.test(network) || names.app !== network + '-app' || names.db !== network + '-db') throw new Error('Internal fixture identity mismatch');
  if (new URL(base).protocol !== 'https:') throw new Error('HTTPS required');
  const controllerSource = await readFile(new URL('./receive-mixed-browser-internal.mjs', import.meta.url), 'utf8');
  const marker = '/tmp/et6-mixed-state.json';
  report.mixedBrowserStage = { scope: 'Controlled internal source-health failure; no external outage claim', widths: [] };
  const stage = report.mixedBrowserStage;
  stage.controllerSha256=createHash('sha256').update(controllerSource).digest('hex');
  await writeFile(resolve(dir,'fault-controller.mjs'),controllerSource);
  const expectedDocument=JSON.parse(await readFile(resolve(dir,'headers.json'),'utf8')).checks[0];
  const pause = ms => new Promise(r => setTimeout(r, ms));
  for (const width of [1280, 390]) {
    const widthDir = resolve(dir, 'mixed-' + width); await mkdir(widthDir, { recursive: true });
    const round = { width, browsers: [], cleanup: [] }; stage.widths.push(round);
    const ownedNames = ['firefox', 'webkit'].map(engine => `${network}-browser-${engine}-${width}`);
    let controller, controllerResult, caught;
    try {
      await docker('exec', names.app, 'node', '--input-type=module', '-e', `import{rm}from'node:fs/promises';await rm('${marker}',{force:true});`);
      // Capture the settled promise immediately so early errors cannot become unhandled.
      controller = exec('docker', ['exec', '-e', 'ET6_RECEIVING_HOLD_SECONDS=150', '-e', 'ET6_EXPECTED_DB_HOST=' + names.db, names.app, 'node', '--input-type=module', '-e', controllerSource], { env, timeout: 240000, maxBuffer: 8 * 1024 * 1024 })
        .then(r => ({ exit: 0, stdout: r.stdout, stderr: r.stderr }), e => ({ exit: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' }));
      let visible;
      for (let i = 0; i < 45; i++) {
        try {
          const state = JSON.parse(await docker('exec', names.app, 'node', '--input-type=module', '-e', `import{readFile}from'node:fs/promises';console.log(await readFile('${marker}','utf8'));`));
          if (state.phase === 'failed') throw new Error('Controller failed before browser window');
          if (state.phase === 'failure-visible') { visible = state; break; }
        } catch (error) { if (error.message === 'Controller failed before browser window') throw error; }
        await pause(1000);
      }
      check('mixed failure marker ' + width, Boolean(visible));
      check('mixed window >=90 seconds remaining ' + width, Date.now() - Date.parse(visible.startedAt) < 60000);
      round.window = visible; await save();
      // Both engines observe the SAME hold and recovery, then next width gets a fresh hold.
      round.browsers = await Promise.all(['firefox', 'webkit'].map(async engine => {
        const outDir = resolve(widthDir, engine); await mkdir(outDir, { recursive: true });
        const name = `${network}-browser-${engine}-${width}`;
        const browserEnv = { ...env, BASE: base, EXPECT_ERR_ID: '24', OUT: '/out', BROWSER: engine, WIDTH: String(width), MAX_WAIT_S: '240', MIN_HEALTHY: '505' };
        const args = ['run', '--rm', '--init', '--name', name, '--label', `${label}=${runId}`, '--network', network, '--shm-size=1g', '-v', bundle + ':/harness:ro', '-v', prep + ':/prep:ro', '-v', caFile + ':/run/et6-ca/root.crt:ro', '-v', outDir + ':/out', '-e', 'BASE', '-e', 'EXPECT_ERR_ID', '-e', 'OUT', '-e', 'BROWSER', '-e', 'WIDTH', '-e', 'MAX_WAIT_S', '-e', 'MIN_HEALTHY', browserImage, 'sh', '-c', 'sh /prep/prepare-trust.sh >&2 && runuser -u pwuser -- env HOME=/home/pwuser NODE_EXTRA_CA_CERTS=/run/et6-ca/root.crt FIREFOX_PROFILE_DIR=/tmp/et6-firefox-profile node /harness/mixed_happening_now.cjs'];
        const result = await exec('docker', args, { env: browserEnv, timeout: 300000, maxBuffer: 2 * 1024 * 1024 }).then(r => ({ exit: 0, stdout: r.stdout, stderr: r.stderr }), e => ({ exit: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' }));
        await writeFile(resolve(outDir, 'execution.json'), JSON.stringify(result, null, 2));
        if(result.exit===0){
          const security=JSON.parse(await readFile(resolve(outDir,'security.json'),'utf8'));
          check('mixed '+engine+'/'+width+' original document retained',security.documents.length>0);
          for(const doc of security.documents)check('mixed '+engine+'/'+width+' unchanged HTML and CSP',doc.status===200&&doc.bodySha256===expectedDocument.proxyBodySha256&&Object.entries(expectedDocument.proxyHeaders).every(([k,v])=>(doc.headers[k]??null)===v));
        }
        return { engine, width, exit: result.exit, outDir };
      }));
      check('both mixed browsers passed ' + width, round.browsers.every(r => r.exit === 0));
      controllerResult=await controller;
      round.controller=JSON.parse(controllerResult.stdout.trim().split(/\r?\n/).at(-1));
      check('controller recovered before wire join '+width,controllerResult.exit===0&&round.controller.outcome==='Worked');
      const appLog=await docker('logs','--timestamps',names.app);await writeFile(resolve(widthDir,'wire-app.log'),appLog);
      for(const b of round.browsers){
        const requests=JSON.parse(await readFile(resolve(b.outDir,'requests.json'),'utf8'));
        const timeline=JSON.parse(await readFile(resolve(b.outDir,'timeline.json'),'utf8'));
        b.wire=verifyBrowserWire(requests.resultPolls,timeline,appLog,round.controller,{engine:b.engine,width});
        await writeFile(resolve(b.outDir,'wire-verification.json'),JSON.stringify(b.wire,null,2));
      }
    } catch (error) { caught = error; }
    finally {
      if (controller) {
        controllerResult = await controller;
        await writeFile(resolve(widthDir, 'controller-execution.json'), JSON.stringify(controllerResult, null, 2));
        try {
          const lines = controllerResult.stdout.trim().split(/\r?\n/);
          round.controller = JSON.parse(lines[lines.length - 1]);
          if (controllerResult.exit !== 0 || round.controller.outcome !== 'Worked') caught ??= new Error('Controlled health fixture/recovery failed ' + width);
        } catch (error) { caught ??= error; }
      }
      for (const name of ownedNames) {
        try {
          const present = (await docker('container', 'ls', '-a', '--format', '{{.Names}}')).split(/\r?\n/).includes(name);
          if (!present) { round.cleanup.push({ name, outcome: 'absent' }); continue; }
          if (await docker('inspect', '--format', `{{index .Config.Labels "${label}"}}`, name) !== runId) throw new Error('Browser cleanup ownership mismatch');
          await docker('rm', '-f', name); round.cleanup.push({ name, outcome: 'removed' });
        } catch (error) { round.cleanup.push({ name, outcome: 'Failed', error: error.message }); caught ??= error; }
      }
      await save();
    }
    if (caught) throw caught;
  }
  stage.outcome = 'Worked'; await save();
}
