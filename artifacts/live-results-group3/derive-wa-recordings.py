"""Read-only research derivation; no app DTO, ingestion parser or winner inference."""
import collections,hashlib,json,pathlib,openpyxl
P=pathlib.Path(__file__).resolve().parent;R=P/'recordings'
downloads=json.loads((P/'receipts/example-downloads.json').read_text());source={d['file']:d for d in downloads}
w=openpyxl.load_workbook(R/'wa-2024-recount-all-candidates.xlsx',read_only=True,data_only=True);rows=list(w.active.values);w.close()
headers=rows[0];groups=[(headers[c],c) for c in range(1,len(headers),3)];counties=rows[2:-1];total=rows[-1]
assert len(counties)==39 and total[0]=='Total' and len(groups)==11
before=[];after=[];changes=[]
for label,c in groups:
    initial=sum(r[c] for r in counties);recount=sum(r[c+1] for r in counties);variance=sum(r[c+2] for r in counties)
    assert (initial,recount,variance)==(total[c],total[c+1],total[c+2]) and variance==recount-initial
    for r in counties:assert r[c+1]-r[c]==r[c+2]
    kind='write_in_aggregate' if label=='Write-In' else 'overvote' if label=='Overvote' else 'undervote' if label=='Undervote' else 'publisher_total_including_over_under' if label=='Totals' else 'named_candidate'
    a={'sourceOptionLabel':label,'optionKind':kind,'votes':initial,'sourceCell':f'Sheet1!{openpyxl.utils.get_column_letter(c+1)}42'}
    b={'sourceOptionLabel':label,'optionKind':kind,'votes':recount,'sourceCell':f'Sheet1!{openpyxl.utils.get_column_letter(c+2)}42'}
    before.append(a);after.append(b)
    if variance:changes.append({'sourceOptionLabel':label,'before':initial,'after':recount,'difference':variance})
options=[v for v in before if v['optionKind'] in ['named_candidate','write_in_aggregate']]
afterOptions=[v for v in after if v['optionKind'] in ['named_candidate','write_in_aggregate']]
assert sum(v['votes'] for v in before if v['optionKind']!='publisher_total_including_over_under')==before[-1]['votes']
assert sum(v['votes'] for v in after if v['optionKind']!='publisher_total_including_over_under')==after[-1]['votes']
assert [v['votes'] for v in afterOptions]==[194118,419309,396304,396255,267944,84353,143174,1658] # independently read signed amended certificate
assert [v['votes'] for v in options]==[194114,419297,396300,396249,267924,84351,143170,1668] # independently read original certificate page index4
context={'state':'WA','electionDate':'2024-08-06','phase':'primary','officeLabel':'Commissioner of Public Lands','general2026':False,'scope':'complete seven named candidates + aggregate write-in; over/under and publisher Totals separately retained','winner':None,'sourceAsOf':None,'sourceAsOfRaw':'Last updated: Sept 4 @ 1PM (page; timezone absent)','certificationDateRaw':'4th day of September, 2024','certificateSource':source['wa-2024-recount-certification.pdf'],'workbookSource':source['wa-2024-recount-all-candidates.xlsx'],'governmentLanding':'https://www.sos.wa.gov/elections/data-research/election-data-and-maps/election-results-and-voters-pamphlets/2024-primary-election'}
for name,values in [('wa-2024-lands-before.json',before),('wa-2024-lands-after.json',after)]:
    versionContext=dict(context)
    if 'before' in name:versionContext.update({'certificateSource':source['wa-2024-original-certification.pdf'],'certificationDateRaw':'22nd day of August, 2024','certificateVotesPageIndex':4,'certificateSignaturePageIndex':10})
    else:versionContext.update({'certificateVotesPageIndex':0,'certificateSignaturePageIndex':0})
    (R/name).write_text(json.dumps({'context':versionContext,'sourceVersion':'initial' if 'before' in name else 'amended_recount','optionsAndMetrics':values},indent=2)+'\n',encoding='utf-8')
correction={'outcome':'Worked','actualOfficialCorrection':True,'completeCandidateOptionCount':8,'namedCandidates':7,'aggregateWriteInOptions':1,'countyRowsIndependentlySummed':39,'beforeCandidateVoteSumIncludingWriteIn':sum(v['votes'] for v in options),'afterCandidateVoteSumIncludingWriteIn':sum(v['votes'] for v in afterOptions),'publisherTotalsIncludingOverUnder':{'before':before[-1]['votes'],'after':after[-1]['votes']},'changes':changes,'certificateVotesIndependentlyReadMatchAllEightOptions':True,'voteAsOf':None,'semanticRefusals':['Two-candidate webpage table is not full contest.','Publisher Totals includes over/under and is not candidate-vote denominator.','Primary does not imply general-election winner.','No UTC timestamp invented from date-only certification or localclock without timezone.']}
correction.update({'originalCertificateAllEightOptionsMatch':True,'originalCertificationDateRaw':'22nd day of August, 2024','amendedCertificationDateRaw':'4th day of September, 2024'})
(P/'receipts/wa-correction-conservation.json').write_text(json.dumps(correction,indent=2)+'\n',encoding='utf-8')
w=openpyxl.load_workbook(R/'wa-2024-congressional-results.xlsx',read_only=True,data_only=True);raw=list(w['RAW'].values);w.close();counts=collections.Counter();ballotOrder={};seq=set();recordRows=[]
for row in raw[1:]:
    if row[0]!='U.S. Senator':continue
    counts[row[2]]+=row[7];ballotOrder[row[2]]=row[3];seq.add(row[1]);recordRows.append(dict(zip(raw[0],row)))
expected={'Mel Ram':86956,'Dr Raul Garcia':431182,'David Tilton':17561,'Maria Cantwell':1114327,'Chuck Jackson':21055,'Isaac A Holyk':110701,'Henry Clay Dennison':7840,'Scott Nazarino':111386,'Paul Lawrence Giesick':17433,'Thor Amundson':10587,'Goodspaceguy':16826,'WRITE-IN':2862}
assert dict(counts)==expected and len(counts)==12 and len(seq)==1
senate={'state':'WA','electionDate':'2024-08-06','phase':'primary','officeLabel':'U.S. Senator','sourceAsOf':None,'status':'certified','certificateDateRaw':'22nd day of August, 2024','certificateVotesPageIndex':0,'certificateSignaturePageIndex':10,'rawSource':source['wa-2024-congressional-results.xlsx'],'certificationSource':source['wa-2024-original-certification.pdf'],'countyCongressionalPartRows':recordRows,'options':[{'sourceOptionLabel':name,'sourceBallotOrder':ballotOrder[name],'sourceSeqNo':next(iter(seq)),'optionKind':'write_in_aggregate' if name=='WRITE-IN' else 'named_candidate','votes':counts[name]} for name in expected],'candidateVotesIncludingAggregateWriteIn':sum(counts.values()),'winner':None,'mappingNotes':'SeqNo/BallotOrder are actual workbook fields, not global candidate identities; bind per election/contest. Eleven named people plus one aggregate write-in. The file contains statewide races aggregated by congressional geography, not US House election contests.'}
(R/'wa-2024-certified-senate.json').write_text(json.dumps(senate,indent=2)+'\n',encoding='utf-8')
receipt={'outcome':'Worked','scope':'Complete WA2024Primary Senate twelve options','rawSourceRows':len(recordRows),'independentCountyPartSum':dict(counts),'independentlyReadOriginalCertificateVotes':expected,'candidateVoteTotalIncludingWriteIn':sum(counts.values()),'completeOptions':12,'votesMatchCertificate':True,'general2026':False,'sourceAsOf':None}
(P/'receipts/wa-certified-senate-conservation.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'correction':correction,'certifiedSenate':receipt},indent=2))
