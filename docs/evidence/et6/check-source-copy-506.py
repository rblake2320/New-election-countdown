import json,subprocess,pathlib,time,urllib.request,hashlib,collections
out=pathlib.Path('D:/projects/et-wt/astra-et6-composed/docs/evidence/et6/source-copy-506');out.mkdir(parents=True,exist_ok=True)
SQL="""BEGIN READ ONLY; SELECT json_build_object('elections',(SELECT json_agg(x ORDER BY id) FROM (SELECT id,state,title,type,level,date::text FROM elections WHERE date::date='2026-11-03')x),'candidates',(SELECT json_agg(x ORDER BY id) FROM (SELECT id,election_id FROM candidates)x),'sources',(SELECT json_agg(x ORDER BY id) FROM candidate_source_records x),'snapshots',(SELECT json_agg(x ORDER BY id) FROM general_candidate_list_snapshots x)); COMMIT;"""
p=subprocess.run(['docker','exec','et6-prod-109656-3a740d1d-db','psql','-U','et6_receiving','-d','et6_receiving','-At','-c',SQL],capture_output=True,text=True,encoding="utf-8",check=True);raw=p.stdout[p.stdout.index('{'):p.stdout.rindex('}')+1];db=json.loads(raw);(out/'sql-baseline.json').write_text(raw,encoding="utf-8")
assert len(db['elections'])==506
candidateElection={c['id']:c['election_id'] for c in db['candidates']};official=[s for s in db['sources'] if s['source_layer']=='general_candidate_list' and s['is_current']];byCandidate=collections.defaultdict(list)
for s in official:byCandidate[s['candidate_id']].append(s)
selected={}
for cid,rows in byCandidate.items():
 selected[cid]=max(rows,key=lambda s:(s['metadata'].get('publishedAt') or '',s['source_synced_at'],s['id']))
results=[];start=time.time()
for i,e in enumerate(db['elections']):
 t=time.monotonic();url=f"http://127.0.0.1:5094/api/elections/{e['id']}/general-candidates";errors=[]
 try:
  with urllib.request.urlopen(url,timeout=10) as r:status=r.status;body=r.read()
  payload=json.loads(body);applicable=e['type'].lower() in ['general','special'];expected={cid:s for cid,s in selected.items() if candidateElection[cid]==e['id']} if applicable else {};actual={c['id']:c for c in payload['candidates']}
  if set(actual)!=set(expected):errors.append('candidate_ids_differ')
  for cid,c in actual.items():
   s=expected.get(cid)
   if not s or c.get('generalListSnapshotSha256')!=s['source_file_sha256'] or c.get('generalListSourceUrl')!=s['source_url']:errors.append('candidate_source_differ:'+str(cid))
  snapshots=[s for s in db['snapshots'] if s['election_id']==e['id'] and s['is_current']] if applicable else []
  expectedStatus='not_applicable' if not applicable else 'sourced' if expected or snapshots else 'not_recorded'
  if payload.get('status')!=expectedStatus:errors.append('status_differ')
  expectedDigests=sorted(s['source_file_sha256'] for s in snapshots);actualDigests=sorted(s['snapshotSha256'] for s in payload.get('sources',[]))
  if expectedDigests!=actualDigests:errors.append('snapshot_digests_differ')
  row={'electionId':e['id'],'state':e['state'],'httpStatus':status,'status':payload.get('status'),'count':len(actual),'expectedCount':len(expected),'candidateIds':sorted(actual),'sourceDigests':sorted(set(c['generalListSnapshotSha256'] for c in actual.values())),'snapshotDigests':actualDigests,'bodySHA256':hashlib.sha256(body).hexdigest(),'latencyMs':round((time.monotonic()-t)*1000,2),'errors':errors}
 except Exception as exc:row={'electionId':e['id'],'state':e['state'],'errors':[str(exc)]}
 results.append(row)
 with (out/'per-race.jsonl').open('a') as f:f.write(json.dumps(row)+'\n')
 if (i+1)%100==0:print(json.dumps({'checked':i+1,'failed':sum(bool(r['errors']) for r in results)}),flush=True)
 time.sleep(max(0,.26-(time.monotonic()-t)))
summary={'outcome':'Worked' if all(not r['errors'] for r in results) else 'Failed','races':len(results),'httpStatuses':dict(collections.Counter(r.get('httpStatus') for r in results)),'statuses':dict(collections.Counter(r.get('status') for r in results)),'candidateProfiles':len(db['candidates']),'currentOfficialSourceRecords':len(official),'uniqueCurrentOfficialCandidateIds':len(selected),'httpCandidateMemberships':sum(r.get('count',0) for r in results),'failed':[r for r in results if r['errors']],'elapsedSeconds':round(time.time()-start,2),'maxRps':1/.26,'baselineSHA256':hashlib.sha256(raw.encode()).hexdigest(),'scope':'Real private PostgreSQL read-only transaction + actual HTTP5094; no writes/provider calls; global profile count distinct from official general-list membership'}
(out/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2),flush=True)


