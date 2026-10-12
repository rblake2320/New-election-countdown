import concurrent.futures,json,pathlib,urllib.parse
from importlib.machinery import SourceFileLoader
P=pathlib.Path(__file__).resolve().parent
m=SourceFileLoader('research_pages',str(P/'fetch-pages.py')).load_module()
# Strip link wrappers containing encoded personal contacts from prior receipts.
for file in (P/'receipts').glob('*.json'):
    d=json.loads(file.read_text());d['links']=[x for x in d.get('links',[]) if '@' not in urllib.parse.unquote(x['href'])]
    file.write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8')
urls={
'VA-enr':'https://enr.elections.virginia.gov/results/public/virginia/elections/2026-August-Democratic-Primary',
'WA-enr':'https://results.votewa.gov/results/public/washington/elections/20260804',
'VT-enr':'https://electionresults.vermont.gov/Index.html',
'RI-enr':'https://electionresults.ri.gov/results/public/RhodeIsland/elections/RI2026StatewidePrimary',
'SC-enr':'https://www.enr-scvotes.org/SC/126294/',
'WV-enr':'https://results.enr.clarityelections.com/WV/126209/web.345435/#/summary',
'TX-enr':'https://goelect.txelections.civixapps.com/ivis-enr-ui/races',
'TX-legacy-current':'https://electionresults.sos.state.tx.us/results.html',
'UT-enr':'https://electionresults.utah.gov/',
'PA-enr':'https://www.electionreturns.pa.gov/',
'SD-enr':'https://electionresults.sd.gov/',
'WY-2026':'https://sos.wyo.gov/Elections/Docs/2026/Results/Primary/2026_Primary_Statewide_Candidates_Summary.pdf'}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    for result in pool.map(m.fetch,urls.items()):print(json.dumps(result),flush=True)
