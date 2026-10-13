"""Independent openpyxl raw-byte conservation oracle; no app parser imported."""
import hashlib, json, pathlib, sys
from openpyxl import load_workbook
p = pathlib.Path(sys.argv[1])
w = load_workbook(p, read_only=True, data_only=True)
s = w['Sheet1']
rows = list(s.values)
assert len(rows) == 42 and len(rows[0]) == 34
groups = []
for c in range(1, 34, 3):
    totals = [sum(row[c+j] for row in rows[2:41]) for j in range(3)]
    assert totals == list(rows[41][c:c+3])
    assert all(row[c+1]-row[c] == row[c+2] for row in rows[2:])
    groups.append({'name':rows[0][c],'initial':totals[0],'recount':totals[1],'variance':totals[2]})
before = sum(x['initial'] for x in groups[:8]); after = sum(x['recount'] for x in groups[:8])
assert (before, after) == (1903073, 1903115)
assert groups[-1]['initial'] == before+groups[8]['initial']+groups[9]['initial'] == 1994096
assert groups[-1]['recount'] == after+groups[8]['recount']+groups[9]['recount'] == 1994099
print(json.dumps({'outcome':'Worked','method':'Independent openpyxl cached raw workbook cells; 39 county sums, 11 groups, both phases and variance','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'groups':groups,'optionTotals':[before,after],'noWinnerInferred':True},indent=2))
