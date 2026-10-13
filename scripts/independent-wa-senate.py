"""Independent official workbook conservation, no app reader/parser imported."""
import hashlib, json, pathlib, sys
from collections import defaultdict
from openpyxl import load_workbook
p = pathlib.Path(sys.argv[1]); w = load_workbook(p,read_only=True,data_only=True)
rows = list(w['RAW'].values); assert len(rows) == 4551
race_catalog = sorted(set((r[0],r[1]) for r in rows[1:]))
senate = [r for r in rows[1:] if r[0] == 'U.S. Senator' and r[1] == 2005]
assert len(senate) == 600
totals = defaultdict(int); scopes = defaultdict(set)
for r in senate:
    key = (r[3],r[2]); geography = (r[6],r[4])
    assert geography not in scopes[key]
    scopes[key].add(geography); totals[key] += r[7]
assert len(totals) == 12
reference = next(iter(scopes.values()))
assert len(reference) == 50 and len({county for county,district in reference}) == 39
assert all(scope == reference for scope in scopes.values())
expected = [86956,431182,17561,1114327,21055,110701,7840,111386,17433,10587,16826,2862]
ordered = sorted(totals.items()); assert [value for key,value in ordered] == expected
assert sum(totals.values()) == 1948716
print(json.dumps({'outcome':'Worked','method':'Independent openpyxl raw RAW rows; all50 geographicparts conserved for all12 Senate options','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'rowCount':600,'geographicParts':50,'countyCount':39,'options':[{'ballotOrder':k[0],'name':k[1],'votes':v} for k,v in ordered],'totalVotes':sum(totals.values()),'actualRaceCatalog':race_catalog,'hasHouseRace':any('representative' in name.lower() for name,seq in race_catalog),'noWinnerInferred':True},indent=2))
