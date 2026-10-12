import pathlib,json,csv,io,hashlib
OUT=pathlib.Path(__file__).resolve().parent
for name in ['IL-primary-senate','IL-primary-governor']:
    path=OUT/(name+'.csv'); raw=path.read_bytes(); text=raw.decode('utf-8-sig'); lines=text.splitlines(keepends=True);header=next(csv.reader([lines[0]]));found=[]
    for line in lines[1:]:
        values=next(csv.reader([line]));r=dict(zip(header,values))
        if r['EISCandidateID']!='0':found.append(line)
        if len(found)>=20:break
    assert len(found)==20
    payload=(lines[0]+''.join(found)).encode('utf-8');target=OUT/(name+'-minimal.csv');target.write_bytes(payload)
    receipt={'sourceDocumentSha256':hashlib.sha256(raw).hexdigest(),'sourceDocumentBytes':len(raw),'minimalRecording':target.name,'minimalRecordingSha256':hashlib.sha256(payload).hexdigest(),'candidateRows':20,'completeOfficeRecording':False,'normalization':'BOM omitted; original selected complete CSV lines retained. No values changed.','schema':header,'mappingRequirements':['EISCandidateID/EISContestID/EISPartyID are source identifiers, not internal DB IDs.','Primary party+office+election69 is separate race context; do not merge parties.','CandidateID0 Under Votes/Over Votes/Blank Ballots are statistical buckets, not people.','County and city jurisdiction hierarchy requires declared nonoverlapping coverage. Registration repeats by row and must not be summed across candidates.','Current CSV file2026GP is primary only; must verify exact publisher election date before use.','Governor/LtGovernor is a joint ticket; do not invent a Governor identity from the combined candidate string.']}
    (OUT/(name+'-minimal-receipt.json')).write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(name,len(payload))
raw=(OUT/'CA-pre-election-governor.json').read_bytes();text=raw.decode();start=text.index('{');decoder=json.JSONDecoder();first,end=decoder.raw_decode(text[start:]);minimal=text[start:start+end].encode();(OUT/'CA-pre-election-statewide-raw.json').write_bytes(minimal)
assert first['ReportingTime'].startswith('October 9, 2026') and any(int(c['Votes'].replace(',',''))>0 for c in first['candidates'])
context={'outcome':'Refused','admission':'No2026general votes accepted','state':'CA','sourceDeclaredElectionDate':'2026-11-03','sourceDeclaredPhase':'general','sourceDeclaredDateProof':'CA-media-receipt.json +CA-json-index-fetch.json','publicationRuleUrl':'https://voterguide.sos.ca.gov/voter-info/election-results.htm','publicationBeginsRaw':'after polls close8:00pm onNovember3,2026','rawSourceUrl':'https://media.sos.ca.gov/media/governor.json','sourceHttpStatus':200,'sourceWholeSha256':hashlib.sha256(raw).hexdigest(),'minimalExactFragmentSha256':hashlib.sha256(minimal).hexdigest(),'sourceAsOfRaw':first['ReportingTime'],'raceTitleRaw':first['raceTitle'],'nonzeroCandidateCounts':[{k:c[k] for k in ['Name','Party','Votes','Percent']} for c in first['candidates']],'refusalReason':'Actual sourceAsOfOctober9 precedes the declaredNov3 election and publisher result release. HTTP200 and nonzero counts are not publication proof.','certification':'unknown; not admitted','reportingMetricMeaning':'precincts reporting4,817of23,860; not ballots-complete or certified','liveImplementation':False}
(OUT/'CA-pre-election-refusal-context.json').write_text(json.dumps(context,indent=2)+'\n',encoding='utf-8')
print('CA staged input recorded/refused',len(minimal))
