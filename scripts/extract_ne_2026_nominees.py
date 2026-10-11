"""Extract only factual federal/Governor columns from the reviewed official PDF.

The source's page rotation is applied before cell selection. Mailing/contact
columns are deliberately excluded. Source page 1 was also visually inspected.
"""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import fitz

URL = 'https://sos.nebraska.gov/sites/default/files/doc/elections/2026/Final_Statewide_General_Candidate_Filing_List_9.11.26.pdf'
source = Path('election-data-2026/ne-general-2026.pdf')
bytes_ = source.read_bytes()
doc = fitz.open(stream=bytes_, filetype='pdf')
page = doc[0]
words = []
for word in page.get_text('words'):
    rect = fitz.Rect(word[:4]) * page.rotation_matrix
    words.append((rect.x0, rect.y0, word[4]))
anchors = sorted(y for x, y, text in words if text == 'For' and x < 30 and y > 70)
assert len(anchors) == 22, f'Unexpected source layout: {len(anchors)} page-1 candidate rows'
rows = []
for index, y in enumerate(anchors):
    bottom = anchors[index + 1] - 0.5 if index + 1 < len(anchors) else 550
    def cell(left, right):
        values = [(yy, xx, text) for xx, yy, text in words if left <= xx < right and y - 0.5 <= yy < bottom]
        return ' '.join(text for _, _, text in sorted(values, key=lambda item: (round(item[0], 1), item[1])))
    office_text = cell(18, 150)
    if 'Senator' in office_text:
        office, district = 'S', '00'
    elif 'Representative in Congress' in office_text:
        office, district = 'H', cell(150, 202).split()[-1]
    elif 'Governor and Lt.' in office_text:
        office, district = 'G', '00'
    else:
        continue
    name = cell(317, 428)
    ticket = name if office == 'G' else None
    if ticket:
        name = ticket.split(' and ', 1)[0]
    row = {'sourceId': 'NE-general-2026-09-11', 'state': 'NE', 'office': office, 'district': district,
           'date': '2026-11-03', 'name': name, 'partyRaw': cell(254, 317),
           'incumbent': cell(484, 539) == 'Incumbent', 'sourcePage': 1}
    if ticket:
        row['ticketText'] = ticket
    rows.append(row)
assert len(rows) == 21
assert {office: sum(r['office'] == office for r in rows) for office in ('S', 'H', 'G')} == {'S': 5, 'H': 12, 'G': 4}
assert len({(r['office'], r['district'], r['name'], r['partyRaw']) for r in rows}) == 21
manifest = {'version': 1, 'sources': [{'id': 'NE-general-2026-09-11', 'state': 'NE',
    'kind': 'official_general_candidate_list', 'name': 'Nebraska Secretary of State Final Statewide General Candidate List',
    'url': URL, 'sha256': hashlib.sha256(bytes_).hexdigest(), 'publishedAt': '2026-09-11',
    'retrievedAt': datetime.now(timezone.utc).isoformat(), 'electionDate': '2026-11-03',
    'expectedRowCount':21,
    'completeScopes': [{'office': 'S', 'district': '00','expectedCount':5}, {'office': 'H', 'district': '01','expectedCount':4}, {'office': 'H', 'district': '02','expectedCount':3}, {'office': 'H', 'district': '03','expectedCount':5}, {'office': 'G', 'district': '00','expectedCount':4}]}], 'candidates': rows}
output = Path('data/nominees/ne-2026-general.json')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps({'source_sha256': manifest['sources'][0]['sha256'], 'rows': len(rows), 'scopes': len(manifest['sources'][0]['completeScopes']), 'candidates': rows}, ensure_ascii=False))
