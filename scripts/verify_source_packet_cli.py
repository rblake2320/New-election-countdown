"""Execute actual compiled CLI from an alternate CWD, retain input/refusal bytes."""
import pathlib,subprocess,json,hashlib,tempfile
root=pathlib.Path(__file__).resolve().parents[1]; packet=root/'artifacts/source-packet/wa'; module=root/'artifacts/source-packet/parse_official_source_packet.mjs'
cwd=tempfile.mkdtemp(prefix='sol-packet-cli-'); results=[]
for name in ['initial','recount']:
    manifest=packet/(name+'.packet.json'); sha=hashlib.sha256(manifest.read_bytes()).hexdigest()
    cmd=['node',str(module),'--packet',str(manifest),'--sha256',sha,'--target',str(packet/'target-binding.json')]
    run=subprocess.run(cmd,cwd=cwd,capture_output=True); value=json.loads(run.stdout); assert run.returncode==0 and value['outcome']=='Worked'
    (packet/(name+'-v1-receipt.json')).write_bytes(run.stdout); results.append(value)
assert results[0]['input']['source']['sourceContestId']==results[1]['input']['source']['sourceContestId']
assert results[0]['input']['electionId']==results[1]['input']['electionId']==4242401
assert [r['input']['totalVotes'] for r in results]==[1903073,1903115]
assert results[0]['input']['idempotencyKey']!=results[1]['input']['idempotencyKey']
others=[]
for folder,total,optionCount,kind,status in [('wa-senate',1948716,12,'official_state_page','certified'),('ca',9262468,68,'official_state_page','certified'),('nc-manual',827755,6,'admin_manual','unofficial'),('nc-house-manual',67376,5,'admin_manual','unofficial'),('la-manual',196212,2,'admin_manual','unofficial')]:
    directory=root/'artifacts/source-packet'/folder;manifest=directory/'packet.json';sha=hashlib.sha256(manifest.read_bytes()).hexdigest()
    run=subprocess.run(['node',str(module),'--packet',str(manifest),'--sha256',sha,'--target',str(directory/'target-binding.json')],cwd=cwd,capture_output=True)
    value=json.loads(run.stdout);assert run.returncode==0 and value['outcome']=='Worked'
    assert value['input']['totalVotes']==total and len(value['input']['candidates'])==optionCount
    assert value['input']['source']['kind']==kind and value['input']['status']==status and value['input']['asOf'] is None
    assert all(row['candidateId'] is None and row['isWinner'] is False for row in value['input']['candidates'])
    (directory/'v1-receipt.json').write_bytes(run.stdout);others.append({'folder':folder,'totalVotes':total,'candidateCount':optionCount,'kind':kind,'status':status,'manifestSha256':sha,'retrievedAt':value['input']['retrievedAt']})
actual=json.loads((packet/'target-binding.json').read_bytes()); actual['id']+=1
wrong=pathlib.Path(cwd)/'wrong-target.json';wrong.write_text(json.dumps(actual))
manifest=packet/'initial.packet.json'; sha=hashlib.sha256(manifest.read_bytes()).hexdigest()
run=subprocess.run(['node',str(module),'--packet',str(manifest),'--sha256',sha,'--target',str(wrong)],cwd=cwd,capture_output=True)
value=json.loads(run.stdout); assert run.returncode==1 and value['outcome']=='Refused' and value['code']=='TARGET_MISMATCH'
(packet/'wrong-target-refusal.json').write_bytes(run.stdout)
receipt={'outcome':'Worked','compiledModuleSha256':hashlib.sha256(module.read_bytes()).hexdigest(),'actualCliCases':8,'sameSourceContest':results[0]['input']['source']['sourceContestId'],'actualClock':results[0]['input']['retrievedAt'],'dryRunFixturePrimaryKey':4242401,'additionalActualParsers':others,'noDb':True,'noNetwork':True}
(root/'artifacts/source-packet/compiled-cli-receipt.json').write_bytes((json.dumps(receipt,indent=2)+'\n').encode());print(json.dumps(receipt))
