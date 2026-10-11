"""Offline retained snapshot acceptance; never reads raw contacts or databases."""
import collections, hashlib, json, pathlib, re
P=pathlib.Path(__file__).resolve().parent
data=json.loads((P/'official-current-members-contact-free.json').read_text(encoding='utf-8'))
allowed={'sourceId','congress','chamber','state','seatRaw','districtRaw','district','role','bioguideId','name','partyRaw','nameEvidence','swornDateRaw','swornDateAttribute','electedDateRaw','senateClassRaw','nameDerivation'}
assert len(data['members'])==539
assert all(set(row)<=allowed for row in data['members'])
assert all(re.fullmatch('[A-Z][0-9]{6}',row['bioguideId']) for row in data['members'])
assert len({row['bioguideId'] for row in data['members']})==539
assert len(data['vacancies'])==2
assert all(v['bioguideId'] is None and v['name'] is None and v['partyRaw'] is None for v in data['vacancies'])
assert {v['seatRaw'] for v in data['vacancies']}=={'FL20','TX23'}
assert collections.Counter(r['role'] for r in data['members'])=={'representative':433,'delegate':5,'resident_commissioner':1,'senator':100}
assert all(row['partyRaw'] in {'D','R','I'} for row in data['members'])
# Only direct source URL metadata is permitted, no person contact/address fields.
for row in data['members']+data['vacancies']:
    raw=json.dumps(row,ensure_ascii=False)
    assert not re.search(r'@|https?://|\b(?:phone|email|address|website|office-room|office-building|office-zip|townname)\b',raw,re.I)
for row in data['members']:
    assert set(row['nameEvidence']) <= {'officialName','nameList','firstName','middleName','lastName','suffix','memberFull'}
out={'outcome':'Worked','actualRetainedMembers':539,'votingOnlyMembers':533,'explicitVacantSeats':2,'distinctRealBioguideIds':539,'unknownPartyCodes':0,'contactFieldValuesRetained':0,'actualSnapshotSha256':hashlib.sha256((P/'official-current-members-contact-free.json').read_bytes()).hexdigest(),'checks':['strict contact-free member-key whitelist','exact role counts','source-derived identity uniqueness','explicit null vacancy persons','no member contact URLs/emails/address fields']}
(P/'contact-free-check-receipt.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out))
