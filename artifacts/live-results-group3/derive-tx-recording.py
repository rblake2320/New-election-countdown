import hashlib,html,json,pathlib,re
P=pathlib.Path(__file__).resolve().parent
receipt=json.loads((P/'receipts/TX-asset-discovery.json').read_text());landing=json.loads((P/'receipts/TX-legacy-current-landing.json').read_text())
context=receipt['senateVoteContext'];match=re.search(r'<div class="election">U\. S\. SENATOR.*?</table></div>',context,re.S);assert match
fragment=match.group();options=[]
for name,votes in re.findall(r'<td class="candidate">(.*?)</td><td class="ballot">([\d,]+)</td>',fragment,re.S):options.append({'candidateLabelRaw':html.unescape(name),'ballotsCastRaw':votes,'votes':int(votes.replace(',',''))})
assert options==[{'candidateLabelRaw':'KEN PAXTON','ballotsCastRaw':'885,949','votes':885949},{'candidateLabelRaw':'JOHN CORNYN (I)','ballotsCastRaw':'501,725','votes':501725}]
(P/'recordings/tx-2026-runoff-senate-fragment.html').write_text(fragment,encoding='utf-8')
data={'state':'TX','electionDate':'2026-05-26','phase':'runoff','electionLabelRaw':'2026 REPUBLICAN PRIMARY RUNOFF ELECTION','partyPrimaryRaw':'REPUBLICAN','raceLabelRaw':'U. S. SENATOR','sourceUrl':receipt['url'],'sourceWholeDocumentSha256':receipt['sha256'],'sourceCalendarContext':landing['title'],'sourceClockRaw':'Updated 05/27/2026 09:20 AM','sourceAsOf':None,'certificationStatus':'not_declared_in_captured_table','sourcePollingLocationsReporting':'100%','reportingMetric':'polling_locations_reporting_not_votes_counted','publisherTableRows':2,'options':options,'independentlyDerivedOptionVoteSum':sum(o['votes'] for o in options),'publisherContestVoteTotal':None,'winner':None,'general2026':False,'mappingNote':'No numerical race/candidate ID is in this table. Literal (I) is preserved, not inferred as Independent party.'}
(P/'recordings/tx-2026-runoff-senate.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8');print(json.dumps({'publisherTableRows':2,'sum':data['independentlyDerivedOptionVoteSum'],'sourceAsOf':None}))
