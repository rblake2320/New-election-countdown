import json,pathlib,subprocess
own=pathlib.Path(__file__).resolve().parent;image='sha256:90561267d8c97492b08405aa421616bbfee7da6e8c6fb7293e29d2cf445c8748'
run=subprocess.run(['docker','run','--rm','--network','none','--user','0','--mount','type=bind,source='+str(own)+',target=/review,readonly','--entrypoint','node',image,'/review/linux-refusal-cases.mjs'],capture_output=True,timeout=30)
if run.returncode:raise RuntimeError(run.stderr.decode('utf-8'))
receipt=json.loads(run.stdout);receipt['nodeRuntimeImageId']=image
(own/'linux-refusals-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt))
