from pathlib import Path
import subprocess,datetime,json,hashlib,os,sys
project=Path('D:/projects/New-election-countdown')
owner=Path('D:/projects/et-wt/sol-c6-main-reviewed')
head='f0fe3ab9c300db7993df1748d7f016ddc6fde146'
baseline='c343237594bde7a2e3bd837fceaaae6abad9a072'
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
scratch=Path('C:/Users/techai/.codex/tmp')/f'sol-ci-name-shallow-{stamp}'
evidence=owner/'artifacts/reboot-continuation'/f'name-ci-{stamp}'
evidence.mkdir(parents=True,exist_ok=False)
intent={'status':'running','scenario':'post-merge source-name gate in actual depth-one clone','head':head,'baseline':baseline,'scratch':str(scratch),'noServerOrDB':True,'controls':['without immutable old commit: source comparison must refuse','after workflow fetch: all six source-field tests pass'],'canResume':'No DB or app side effects; rerun script in a new unique scratch directory.'}
(evidence/'intent.json').write_text(json.dumps(intent,indent=2)+'\n',encoding='utf-8')
def run(args,label,cwd=project):
    p=subprocess.run(args,cwd=cwd,capture_output=True,encoding='utf-8',errors='replace')
    (evidence/f'{label}.stdout.txt').write_text(p.stdout,encoding='utf-8')
    (evidence/f'{label}.stderr.txt').write_text(p.stderr,encoding='utf-8')
    return p
clone=run(['git','clone','--no-local','--depth=1','--single-branch','--branch','main',str(project),str(scratch)],'clone')
assert clone.returncode==0, 'Actual shallow clone failed; retained clone log'
actual=run(['git','rev-parse','HEAD'],'head',scratch).stdout.strip()
assert actual==head, 'Main advanced: retry with a freshly pinned head, do not infer acceptance'
assert run(['git','rev-parse','--is-shallow-repository'],'shallow',scratch).stdout.strip()=='true'
absent=run(['git','cat-file','-e',baseline],'baseline-absent',scratch)
assert absent.returncode!=0, 'Negative control requires absent old commit'
red=run([sys.executable,'-m','unittest','discover','-s','tests','-p','test_congress_member_names.py','-v'],'old-commit-absent-red',scratch)
assert red.returncode!=0 and baseline in red.stderr, 'Missing-baseline old control did not refuse at the expected boundary'
fetch=run(['git','fetch','--no-tags','--depth=1','origin',baseline],'workflow-fetch',scratch)
assert fetch.returncode==0, 'Exact workflow baseline fetch failed'
green=run([sys.executable,'-m','unittest','discover','-s','tests','-p','test_congress_member_names.py','-v'],'workflow-tests',scratch)
assert green.returncode==0 and 'Ran 6 tests' in green.stderr and '\nOK' in green.stderr, 'Six actual source tests failed'
files=[p for p in evidence.iterdir() if p.is_file()]
receipt={'outcome':'Worked','head':head,'baseline':baseline,'actualShallowClone':True,'oldCommitAbsentRefused':True,'workflowBaselineFetch':True,'pythonTestsPassed':6,'sourceSnapshotSha256':hashlib.sha256((scratch/'data/congress/119/official-current-members.json').read_bytes()).hexdigest(),'sharedWrites':0,'appServersStarted':0,'scratchRetained':str(scratch),'evidence':str(evidence),'files':[{'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in files]}
(evidence/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
(evidence/'.gitattributes').write_text('* -text -whitespace\n',encoding='utf-8')
print(json.dumps(receipt))
