import collections,json,pathlib
P=pathlib.Path(__file__).resolve().parent;d=json.loads((P/'recordings/vt-2026-primary-federal.json').read_text());results=[]
for party in d['d']:
    for office in party['o']:
        totals=collections.Counter();labels={};sourceKinds={}
        summary=[r for r in office['cs'] if r['tid']==0 and r['tn']=='STATE WIDE'];assert len(summary)==1
        townRows=[r for r in office['cs'] if r['tid']!=0]
        summaryTotals=collections.Counter()
        for kind in ['rc','wc']:
            for option in summary[0][kind]:summaryTotals[option['cid']]+=option['vc']
        for town in townRows:
            for kind in ['rc','wc']:
                for option in town[kind]:
                    totals[option['cid']]+=option['vc'];labels[option['cid']]=option['cn'];sourceKinds.setdefault(option['cid'],set()).add(kind)
        assert totals==summaryTotals
        comparisons=[]
        for col in range(1,4):
            candidate=office.get('cid'+str(col))
            if candidate is None:continue
            reported=sum(row.get('vc'+str(col),0) for row in office['cd']);derived=totals[candidate];assert reported==derived
            comparisons.append({'sourceCandidateId':candidate,'candidateLabel':labels.get(candidate,office.get('cn'+str(col))),'townOptionVoteSum':derived,'separateCdColumnSum':reported})
        results.append({'sourcePartyId':party['pid'],'partyRaw':party['pn'],'partyCodeRaw':party['pc'],'sourceOfficeId':office['oid'],'officeRaw':office['on'],'voteForRaw':office['vf'],'sourceTownDistrictRows':len(townRows),'sourceSummaryRowsExcluded':1,'comparisons':comparisons,'optionCountIncludingAllWriteInNamesAndAggregate':len(totals),'candidateVotesDerivedIncludingAllSourceOptions':sum(totals.values()),'publisherStateWideOptionSum':sum(summaryTotals.values()),'publisherScRaw':summary[0]['sc'],'publisherBvRaw':summary[0]['bv'],'publisherSvRaw':summary[0]['sv'],'winner':None,'scopeNotes':['STATE WIDE tid0 summary is excluded from additive town tallies; including it doubles every candidate.','rc and wc retain separate regular/write-in collections.','cd duplicates top candidate tallies for display; never add cd and cs.','cid0 OTHER WRITE-IN is an aggregate, not a person.','Same named person can have distinct cid by primary party; bind electionGuid/partyId/officeId.','bv/sc/sv fields are retained raw and not inferred as candidate-vote total.']})
out={'outcome':'Worked','electionDate':'2026-08-11','phase':'primary','sourceElectionId':7514,'sourceElectionGuid':'a18f77e0-89f8-4a01-8d97-61a7c75ba200','sourceOfficial':True,'sourceClockRaw':'10/09/2026 07:56 PM','sourceAsOf':None,'progressMetric':{'kind':'towns_reporting','reported':247,'total':247,'percent':100,'notVotesCountedPercent':True},'officeComparisons':results,'futureGeneralElectionDirectoryEntryIsNotPublishedResults':True}
(P/'receipts/vt-identifier-conservation.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print(json.dumps(out,indent=2))
