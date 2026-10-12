import json,pathlib,csv,hashlib,re
OUT=pathlib.Path(__file__).resolve().parent
values=json.loads((OUT/'CA-primary-gov-values.json').read_text(encoding='utf-8'))
rows=next(iter(values.values()));names=rows[0][1:];parties=rows[1][1:]
total=next(row[1:] for row in rows if row[0]=='State Totals')
county=[row for row in rows if isinstance(row[0],str) and row[0] not in ['State Totals','  Percent'] and isinstance(row[1],(float,int))]
assert len(names)==68 and len(county)==58
assert all(sum(row[i+1] for row in county)==total[i] for i in range(68))
pdf=(OUT/'CA-primary-gov-pdf-text.txt').read_text(encoding='utf-8')
expected={'Xavier\nBecerra':2591857,'Steve\nHilton':2277318,'Tom\nSteyer':2110707}
for name,vote in expected.items():assert total[names.index(name)]==vote and format(vote,',') in pdf
certificate={'url':'https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/18-sov-certificate.pdf','sha256':json.loads((OUT/'CA-primary-certificate-receipt.json').read_text(encoding='utf-8'))['sha256'],'observedPage':1,'certifiedAt':'2026-07-10','electionDate':'2026-06-02','phase':'primary','exactCertificationExcerpt':'result of the official canvass of the returns of the June 2, 2026, Primary Election.','readMethod':'Visual inspection of actual publisher PDF; no text layer'}
summary={'outcome':'Worked','state':'CA','electionDate':'2026-06-02','phase':'primary','officeRaw':'Governor','candidateCount':68,'countyCount':58,'validCandidateVotesTotal':sum(total),'certificate':certificate,'expectedCountsIndependentPDF':{name.replace('\n',' '):count for name,count in expected.items()},'mappingRequirements':['Party labels are voter-nominated party preference; DEM/REP/NPP and(W/I) retained exactly.','No stable candidate ID in XLSX; bind office/date/district and exact source header plus reviewed candidate identity. Do not infer from FEC.','County totals must not be added to State Totals a second time. Percentage rows/blank lines are not votes.','This certified2026Jun2primary recording must never be published as2026Nov3general.'],'rawWorkbookSha256':hashlib.sha256((OUT/'CA-primary-gov.xlsx').read_bytes()).hexdigest(),'rawPdfSha256':hashlib.sha256((OUT/'CA-primary-gov-pdf.pdf').read_bytes()).hexdigest()}
(OUT/'CA-certified-primary-acceptance.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
de=list(csv.DictReader((OUT/'DE-primary-csv.csv').open(encoding='utf-8-sig')))
expectedCount=int(json.loads((OUT/'DE-independent-count-receipt.json').read_text(encoding='utf-8'))['countResponse'][0]['count'])
assert len(de)==expectedCount==829
scope=[r for r in de if r['electiondate'].startswith('2026-09-15') and r['electionname']=='2026 Primary Election'];assert len(scope)==80
rep33={r['candidatename']:int(r['totalvotessum']) for r in scope if r['office']=='State Representative District 33'};assert rep33=={'MORGAN HUDSON':1017,'MATT BUCHER':1010}
deaccept={'outcome':'Worked','state':'DE','dataset':'4hbv-7brf','allResponseRows':829,'independentApiCount':829,'primaryDate':'2026-09-15','primaryRows':80,'sourceAsOfRaw':sorted(set(r['xmlreporttime'] for r in scope)),'independentOfficialHtmlRep33':rep33,'htmlProof':'https://elections.delaware.gov/results/enr/PR2026.html; static recount table independently lists1017/1010','certification':'unknown for selected primary rows: dataset title saysOfficial but linked ENR page itself saysUnofficial; certification must not be inferred','mappingRequirements':['Filter exact electiondate + electionname before office/candidate matching; resource has many election years and school races.','Primary party is part of race identity, not only candidate affiliation.','No stable candidate/race ID in CSV: reviewed source tupleoffice+party+date+exact candidate name needed.','xmlreporttime is source as-of, HTTP fetch time is not as-of. Precinct reporting/absentee status not in CSV.'],'rawCsvSha256':hashlib.sha256((OUT/'DE-primary-csv.csv').read_bytes()).hexdigest()}
(OUT/'DE-primary-acceptance.json').write_text(json.dumps(deaccept,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'CA':summary,'DE':deaccept}))
