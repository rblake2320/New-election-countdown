import concurrent.futures,json,pathlib
from importlib.machinery import SourceFileLoader
P=pathlib.Path(__file__).resolve().parent;m=SourceFileLoader('official_pages',str(P/'fetch-pages.py')).load_module()
urls={
'OK-primary':'https://oklahoma.gov/elections/elections-results/election-results/2026-election-results/june-primary-election.html',
'WY-primary':'https://sos.wyo.gov/Elections/Docs/2026/2026PrimaryResults.aspx',
'SD-home':'https://sdsos.gov/elections-voting/default.aspx',
'OR-current':'https://sos.oregon.gov/elections/Pages/current-election.aspx',
'OR-enr':'https://results.oregonvotes.gov/',
'UT-historical':'https://vote.utah.gov/historical-election-results/',
'SC-gzip-decoded':'https://www.enr-scvotes.org/SC/126294/',
'WA-correction':'https://www.sos.wa.gov/elections/data-research/election-data-and-maps/election-results-and-voters-pamphlets/2024-primary-election',
'WI-guidance':'https://myvote.wi.gov/en-us/Election-Results',
'TN-results-alt':'https://sos.tn.gov/elections/services/election-results'}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    for d in pool.map(m.fetch,urls.items()):print(json.dumps(d),flush=True)
