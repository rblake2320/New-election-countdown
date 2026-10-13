"""Independent raw-byte review; public candidate names/status only, no contacts."""
import gzip, hashlib, json, re
from pathlib import Path
from bs4 import BeautifulSoup

source = Path('D:/projects/et-wt/sol-candidate-source-gaps/artifacts/source-gaps-20261013')
output = Path(__file__).parent
manifest = json.loads((output / 'reviewed-supplement.json').read_text(encoding='utf-8'))
sha = lambda value: hashlib.sha256(value).hexdigest()
recordings = {}
for state, filename, proofname in [
    ('SC', 'SC-general-active-house.raw.gz', 'SC-general-active-house-proof.json'),
    ('FL', 'FL-general.raw.gz', 'FL-general-proof.json'),
]:
    raw = gzip.decompress((source / filename).read_bytes())
    proof = json.loads((source / proofname).read_text())
    assert len(raw) == proof['bytes'] and sha(raw) == proof['sha256']
    assert proof['status'] == 200
    recordings[state] = (raw, proof)

sc, scproof = recordings['SC']
soup = BeautifulSoup(sc.decode('utf-8'), 'html.parser')
assert soup.select_one('input#ElectionId')['value'] == '22596'
assert scproof['fields']['ElectionId'] == '22596'
assert '11_03_2026 Statewide General Election' in scproof['fields']['ExportFileName']
assert scproof['fields']['SelectedCandidateStatus'] == 'Active'
headers = [cell.get_text(' ', strip=True) for cell in soup.select('#gridCandidateSearch thead th')]
assert headers == ['Office', 'Associated Counties', 'Name on Ballot', 'Running Mate', 'Party', 'Location of Filing', 'Candidate Status']
facts = []
for row in soup.select('#gridCandidateSearch tbody tr'):
    cells = [cell.get_text(' ', strip=True) for cell in row.select('td')]
    match = re.fullmatch(r'U.S. House of Representatives, District (\d+)', cells[0])
    assert match and cells[6] == 'Active'
    district = match[1].zfill(2)
    if district in ['02', '03', '04', '05']:
        facts.append({'state': 'SC', 'office': 'H', 'district': district, 'name': cells[2], 'partyRaw': cells[4], 'candidateStatus': cells[6], 'ballotAccessType': 'printed'})
scrows = [row for row in manifest['candidates'] if row['state'] == 'SC']
assert len(facts) == len(scrows) == 11
for row in scrows:
    found = [fact for fact in facts if fact['district'] == row['district'] and fact['name'] == row['name']]
    assert len(found) == 1 and found[0]['partyRaw'] == row['partyRaw']
    assert row['date'] == '2026-11-03' and row['ballotAccessType'] == 'printed' and row['incumbent'] is None
for scope in manifest['sources'][0]['completeScopes']:
    assert scope['ballotAccessType'] == 'printed'
    assert sum(fact['district'] == scope['district'] for fact in facts) == scope['expectedCount']

fl, flproof = recordings['FL']
soup = BeautifulSoup(fl.decode('utf-8'), 'html.parser')
assert 'Candidate Listing for 2026 General Election' in soup.get_text(' ', strip=True)
matches = []
for row in soup.select('tr'):
    cells = row.find_all('td', recursive=False)
    if len(cells) == 5 and cells[0].get_text(strip=True) == '10' and 'Frost' in cells[1].get_text():
        matches.append([cell.get_text(' ', strip=True) for cell in cells])
assert len(matches) == 1
frostrow = next(row for row in soup.select('tr') if len(row.find_all('td', recursive=False)) == 5 and 'Maxwell' in row.get_text())
house_table = frostrow.find_parent('table')
all_house10 = [row for row in house_table.select('tr') if len(row.find_all('td', recursive=False)) == 5 and row.find_all('td', recursive=False)[0].get_text(strip=True) == '10']
assert len(all_house10) == 1  # Count every House10 row, not merely the proposed name.
cells = matches[0]
assert cells[2:] == ['Unopposed', 'Unopposed', 'Unopposed']
assert re.search(r'Frost\s*,\s*Maxwell\s+Alejandro\s*\(DEM\)', cells[1])
assert '*Incumbent' in cells[1]
flrows = [row for row in manifest['candidates'] if row['state'] == 'FL']
assert len(flrows) == 1
row = flrows[0]
assert row['name'] == 'Maxwell Alejandro Frost' and row['partyRaw'] == 'DEM' and row['incumbent'] is True
assert row['district'] == '10' and row['date'] == '2026-11-03' and row['office'] == 'H'
assert row.get('ballotAccessType', 'not_specified') == 'not_specified'
assert manifest['sources'][1]['completeScopes'] == [{'office': 'H', 'district': '10', 'expectedCount': 1}]
receipt = {'outcome': 'Worked', 'manifestSha256': sha((output / 'reviewed-supplement.json').read_bytes()),
           'sourceBodies': {state: {'sha256': proof['sha256'], 'bytes': proof['bytes'], 'retrievedAt': proof['retrievedAt'], 'url': proof.get('url', proof.get('requestedUrl'))} for state, (_, proof) in recordings.items()},
           'SC': {'facts': facts, 'phase': 'general', 'electionDate': '2026-11-03', 'contextBasis': 'response ElectionId22596 + retained public search request election export label; partial response has no literal election date', 'coverage': 'complete printed facet only, not a write-in-complete assertion'},
           'FL': {'rawCells': cells, 'office': 'H', 'district': '10', 'phase': 'general', 'electionDate': '2026-11-03', 'classification': 'official general candidate listing, Unopposed status; no printed-ballot, vote-winner or certification inference'},
           'unknownPublishedDates': True, 'databaseWrites': 0}
(output / 'source-verification.json').write_bytes((json.dumps(receipt, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
print(json.dumps({'outcome': 'Worked', 'SC': len(facts), 'FL': 1, 'manifestSha256': receipt['manifestSha256']}))
