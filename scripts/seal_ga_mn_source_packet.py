import pathlib,json,hashlib,re,subprocess,datetime
repo=pathlib.Path(__file__).resolve().parents[1];root=repo/'artifacts/ga-mn-general'
gaps=json.loads(pathlib.Path('D:/projects/et-wt/astra-et6-composed/docs/evidence/et6/source-copy-506/official-list-not-recorded-races.json').read_bytes());wanted=[g for g in gaps if g['state'] in ['GA','MN']]
drafts=[json.loads((root/'drafts'/(s+'-2026-general-incremental.json')).read_bytes()) for s in ['ga','mn']]
sources={s['id']:s for d in drafts for s in d['sources']};coverage=[]
for g in wanted:
 district=re.search(r'-(\d\d)$',g['title']).group(1)
 rows=[r for d in drafts for r in d['candidates'] if r['state']==g['state'] and r['district']==district and r['office']=='H']
 assert rows and len({r['name'] for r in rows})==len(rows)
 scope=[s for sid in {r['sourceId'] for r in rows} for s in sources[sid]['completeScopes'] if s['office']=='H' and s['district']==district]
 assert sum(s['expectedCount'] for s in scope)==len(rows)
 coverage.append(dict(electionId=g['id'],state=g['state'],district=district,outcome='Worked',namedPrintedCount=len(rows),sourceIds=sorted({r['sourceId'] for r in rows}),sourceSha256=[sources[sid]['sha256'] for sid in sorted({r['sourceId'] for r in rows})]))
assert len(coverage)==17 and all(x['outcome']=='Worked' for x in coverage)
for d in drafts:
 assert len(d['candidates'])==sum(s['expectedRowCount'] for s in d['sources'])==sum(c['expectedCount'] for s in d['sources'] for c in s['completeScopes'])
 for s in d['sources']:
  matching=[p for p in (root/'raw').iterdir() if hashlib.sha256(p.read_bytes()).hexdigest()==s['sha256']];assert matching,(s['id'],'actual raw source unavailable')
  assert s['publishedAt'] is None
 for r in d['candidates']:assert r['incumbent'] is None and not set(r)-{'sourceId','state','office','district','date','name','partyRaw','incumbent','sourcePage','ballotAccessType'}
proof=dict(outcome='Worked',originalMissingGaMnRaces=17,sourceCoveredOriginalGaps=17,coverage=coverage,sourceCount=len(sources),draftRowCount=sum(len(d['candidates']) for d in drafts),independentScopeRowConservation=True,actualRawShaBinding=True,noContactFields=True,noInferredIncumbency=True,noDBWrites=True,certificationNotClaimed=True)
(root/'receipts/source-scope-review.json').write_bytes((json.dumps(proof,indent=2)+'\n').encode())
files=[]
for p in sorted(root.rglob('*')):
 if p.is_file() and p.name!='delivery-index.json':files.append(dict(path=p.relative_to(repo).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
for p in sorted((repo/'scripts').glob('*general*ballots.py')):files.append(dict(path=p.relative_to(repo).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
index=dict(version=1,branch='lane-c/ga-mn-general-source-increment',sourceCheckpoint=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),sealedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),outcome='Worked',scope=proof,files=files)
(root/'delivery-index.json').write_bytes((json.dumps(index,indent=2)+'\n').encode())
print(json.dumps({'outcome':'Worked','originalGapsCovered':len(coverage),'rows':proof['draftRowCount'],'sources':len(sources),'indexedFiles':len(files)}))
