import json,pathlib,urllib.request,re,concurrent.futures,hashlib,datetime
from fetch_index import fetch
OUT=pathlib.Path(__file__).resolve().parent
TASKS=[('CA','https://www.sos.ca.gov/elections/prior-elections/statewide-election-results/primary-election-june-2-2026/statement-vote','sov'),('AZ','https://azsos.gov/press','press'),('CO','https://www.coloradosos.gov/pubs/elections/Results/2026.html','year'),('FL','https://results.elections.myflorida.com/','archive-portal'),('FL','https://floridaelectionwatch.gov/','enr'),('CT','https://ctemspublic.tgstg.net/','ems'),('IN','https://enr.indianavoters.in.gov/site/index.html','enr'),('KS','https://sos.ks.gov/elections/election-results.html','archive'),('KY','https://elect.ky.gov/results/2020-2029/Pages/2026Primary-Recap-Sheets.aspx','primary-recaps')]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for r in pool.map(lambda a:fetch(*a),TASKS):print(json.dumps(r))
