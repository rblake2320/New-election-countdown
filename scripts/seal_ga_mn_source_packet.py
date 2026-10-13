import pathlib,json,hashlib,re,subprocess,datetime
repo=pathlib.Path(__file__).resolve().parents[1];root=repo/'artifacts/ga-mn-general'
gaps=json.loads(pathlib.Path('D:/projects/et-wt/astra-et6-composed/docs/evidence/et6/source-copy-506/official-list-not-recorded-races.json').read_bytes());wanted=[g for g in gaps if g['state'] in ['GA','MN']]
drafts=[json.loads((root/'drafts'/s).read_bytes()) for s in ['ga-2026-general-incremental.json','mn-2026-general-incremental.json','mn-2026-general-current-sgh03.json','ga-2026-general-current-writeins.json']]
sources={s['id']:s for d in drafts for s in d['sources']};coverage=[]
for g in wanted:
 district=re.search(r'-(\d\d)$',g['title']).group(1)
 rows=[r for d in drafts for r in d['candidates'] if r['state']==g['state'] and r['district']==district and r['office']=='H' and r['ballotAccessType']=='printed']
 assert rows and len({r['name'] for r in rows})==len(rows)
 scope=[s for sid in {r['sourceId'] for r in rows} for s in sources[sid]['completeScopes'] if s['office']=='H' and s['district']==district]
 assert sum(s['expectedCount'] for s in scope)==len(rows)
 coverage.append(dict(electionId=g['id'],state=g['state'],district=district,outcome='Worked',namedPrintedCount=len(rows),sourceIds=sorted({r['sourceId'] for r in rows}),sourceSha256=[sources[sid]['sha256'] for sid in sorted({r['sourceId'] for r in rows})]))
assert len(coverage)==17 and all(x['outcome']=='Worked' for x in coverage)
for d in drafts:
 assert len(d['candidates'])==sum(s['expectedRowCount'] for s in d['sources'])==sum(c['expectedCount'] for s in d['sources'] for c in s['completeScopes'])
 for s in d['sources']:
  matching=[p for p in (root/'raw').iterdir() if hashlib.sha256(p.read_bytes()).hexdigest()==s['sha256']];assert matching,(s['id'],'actual raw source unavailable')
  assert s['publishedAt']==('2026-09-15' if s['id']=='ga-sos-current-qualified-writeins-2026-morgan' else None)
 for r in d['candidates']:assert r['incumbent'] is None and not set(r)-{'sourceId','state','office','district','date','name','partyRaw','incumbent','sourcePage','ballotAccessType','ticketText'}
proof=dict(outcome='Worked',originalMissingGaMnRaces=17,sourceCoveredOriginalGaps=17,coverage=coverage,sourceCount=len(sources),draftRowCount=sum(len(d['candidates']) for d in drafts),independentScopeRowConservation=True,actualRawShaBinding=True,noContactFields=True,noInferredIncumbency=True,noDBWrites=True,certificationNotClaimed=True)
proof['printedCoverage']={state:sorted({r['office']+r['district'] for d in drafts for r in d['candidates'] if r['state']==state and r['ballotAccessType']=='printed'}) for state in ['GA','MN']}
assert proof['printedCoverage']['GA']==['G00']+['H'+str(i).zfill(2) for i in range(1,15)]+['S00']
assert proof['printedCoverage']['MN']==['G00']+['H'+str(i).zfill(2) for i in range(1,9)]+['S00']
proof['allPrintedFederalGovernorScoped']=True
proof['overlappingHistoricalMnSourceRequiresRootReview']=True
proof['overlappingHistoricalGaWriteinSourceRequiresRootReview']=True
proof['scopeClassRowCounts']={kind:sum(r['ballotAccessType']==kind for d in drafts for r in d['candidates']) for kind in ['printed','write_in']}
assert proof['scopeClassRowCounts']=={'printed':56,'write_in':16}
(root/'receipts/source-scope-review.json').write_bytes((json.dumps(proof,indent=2)+'\n').encode())
files=[]
for p in sorted(root.rglob('*')):
 if p.is_file() and p.name!='delivery-index.json':files.append(dict(path=p.relative_to(repo).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
for name in ['research_ga_mn.py','fetch_source.py','correct_capture_classification.py','extract_first_general_ballots.py','extract_second_general_ballots.py','extract_third_general_ballots.py','extract_fourth_general_ballots.py','extract_fifth_general_ballots.py','ocr_general_sources.py','fetch_curl_source.py','seal_ga_mn_source_packet.py','verify_ga_mn_increment.ts','compare_current_mn_sgh03.py','compare_current_ga_writeins.py']:
 p=repo/'scripts'/name;files.append(dict(path=p.relative_to(repo).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
index=dict(version=1,branch='lane-c/ga-mn-general-source-increment',sourceCheckpoint=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),sealedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),outcome='Worked',scope=proof,files=files)
(root/'delivery-index.json').write_bytes((json.dumps(index,indent=2)+'\n').encode())
print(json.dumps({'outcome':'Worked','originalGapsCovered':len(coverage),'rows':proof['draftRowCount'],'sources':len(sources),'indexedFiles':len(files)}))
