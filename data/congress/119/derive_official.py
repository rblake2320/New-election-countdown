"""Contact-free government XML derivation; evidence only, never an app import.

New fetches write an UNREVIEWED official-current-members-contact-free.json.
They do not overwrite the pinned official-current-members.json loader input.
A changed source requires a new source review and immutable loader SHA update.
"""
import collections, datetime, hashlib, json, pathlib, re, urllib.request, xml.etree.ElementTree as ET
OUT=pathlib.Path(__file__).resolve().parent
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ElectionTracker-official-source-review/1.0'}),timeout=45) as r:
        body=r.read()
        return body,{'url':url,'finalUrl':r.url,'httpStatus':r.status,'contentType':r.headers.get('Content-Type'),'lastModified':r.headers.get('Last-Modified'),'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'byteLength':len(body),'sha256':hashlib.sha256(body).hexdigest()}
def text(e,path):return (e.findtext(path) or '').strip()
def save(name,v):
    (OUT/name).write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def require(condition,message):
    if not condition:raise ValueError(message)
hb,hs=fetch('https://clerk.house.gov/xml/lists/MemberData.xml'); hr=ET.fromstring(hb)
sb,ss=fetch('https://www.senate.gov/general/contact_information/senators_cfm.xml');sr=ET.fromstring(sb)
landing,ls=fetch('https://www.senate.gov/senators/index.htm')
congress=text(hr,'./title-info/congress-num');require(congress=='119','House source does not declare Congress119')
require(re.search(rb'119(?:th)?\s+Congress',landing,re.I) is not None,'Senate landing Congress119 context missing')
hs.update({'publisher':'Office of the Clerk, U.S. House of Representatives','congressRaw':congress,'sessionRaw':text(hr,'./title-info/session'),'publishedAtRaw':hr.get('publish-date')})
ss.update({'publisher':'U.S. Senate','lastUpdatedRaw':text(sr,'last_updated'),'congressInXml':None,'congressContextSource':ls,'congressContextRetainedText':'119th Congress'})
house=[];vacancies=[];senate=[];seats=[]
for m in hr.findall('./members/member'):
    i=m.find('member-info'); require(i is not None,'Missing House member-info')
    state=i.find('state').get('postal-code');rawdistrict=text(i,'district'); seat=text(m,'statedistrict');bid=text(i,'bioguideID');name=text(i,'official-name')
    role='delegate' if rawdistrict=='Delegate' else 'resident_commissioner' if rawdistrict=='Resident Commissioner' else 'representative'
    if rawdistrict=='At Large': district='00'
    elif role!='representative': district=None
    else:
        match=re.fullmatch(r'(\d+)(?:st|nd|rd|th)',rawdistrict);require(match is not None,'Unrecognized House district '+rawdistrict);district=match.group(1).zfill(2)
    row={'sourceId':'house-memberdata','congress':119,'chamber':'House','state':state,'seatRaw':seat,'districtRaw':rawdistrict,'district':district,'role':role,'bioguideId':bid or None,'name':name or None,'partyRaw':text(i,'party') or None,'nameEvidence':{'officialName':name,'nameList':text(i,'namelist'),'firstName':text(i,'firstname'),'middleName':text(i,'middlename'),'lastName':text(i,'lastname'),'suffix':text(i,'suffix')},'swornDateRaw':text(i,'sworn-date'),'swornDateAttribute':i.find('sworn-date').get('date'),'electedDateRaw':text(i,'elected-date')}
    seats.append({'state':state,'seatRaw':seat,'district':district,'role':role,'occupied':bool(bid)})
    if not bid:
        footnote=text(i,'footnote');require(not name and footnote.startswith('Vacancy due to '),'Empty House identity without explicit vacancy proof')
        vacancy={'sourceId':'house-memberdata','state':state,'seatRaw':seat,'district':district,'role':role,'bioguideId':None,'name':None,'partyRaw':None,'vacancyEvidence':footnote,'predecessorVacateDate':text(m,'./predecessor-info/pred-vacate-date')}
        vacancies.append(vacancy)
    else:
        require(bool(re.fullmatch('[A-Z][0-9]{6}',bid)) and bool(name),'Invalid occupied House identity')
        house.append(row)
for m in sr.findall('member'):
    bid=text(m,'bioguide_id');require(bool(re.fullmatch('[A-Z][0-9]{6}',bid)),'Invalid Senate bioguide')
    first=text(m,'first_name');last=text(m,'last_name');require(bool(first and last),'Missing Senate name')
    senate.append({'sourceId':'senate-current-members','congress':119,'chamber':'Senate','state':text(m,'state'),'district':None,'senateClassRaw':text(m,'class'),'role':'senator','bioguideId':bid,'name':first+' '+last,'nameDerivation':'exact first_name + one space + exact last_name','nameEvidence':{'firstName':first,'lastName':last,'memberFull':text(m,'member_full')},'partyRaw':text(m,'party') or None})
allmembers=house+senate;ids=[r['bioguideId'] for r in allmembers];housekeys=[r['seatRaw'] for r in seats];senatekeys=[(r['state'],r['senateClassRaw']) for r in senate]
require(len(ids)==len(set(ids)),'Duplicate government bioguide across sources')
require(len(housekeys)==len(set(housekeys)),'Duplicate House seat')
require(len(senatekeys)==len(set(senatekeys)),'Duplicate Senate class seat')
require(all(r['partyRaw'] in {'D','R','I'} for r in allmembers),'Unknown source party code')
voting=[r for r in house if r['role']=='representative'];nonvoting=[r for r in house if r['role']!='representative']
counts={'houseSeatEntries':len(seats),'houseOccupiedMembers':len(house),'houseVotingOccupied':len(voting),'houseNonVotingOccupied':len(nonvoting),'houseExplicitVacancies':len(vacancies),'houseVotingSeats':sum(r['role']=='representative' for r in seats),'senateOccupiedMembers':len(senate),'senateStates':len(set(r['state'] for r in senate)),'senateRowsPerState':dict(sorted(collections.Counter(r['state'] for r in senate).items())),'occupiedVotingCongressMembers':len(voting)+len(senate),'occupiedIncludingNonVoting':len(allmembers),'partyRawCountsByScope':{'votingHouse':dict(collections.Counter(r['partyRaw'] for r in voting)),'nonVotingHouse':dict(collections.Counter(r['partyRaw'] for r in nonvoting)),'senate':dict(collections.Counter(r['partyRaw'] for r in senate))}}
require(counts['houseVotingSeats']==435 and len(nonvoting)==6 and len(senate)==100,'Reviewed coverage shape changed; requires a new review')
require(all(v==2 for v in counts['senateRowsPerState'].values()),'Senate current source not exactly two per state; do not fabricate absent Senator')
data={'version':1,'classification':'official_current_members_and_seat_occupancy_not_general_election_nominees','sources':[hs,ss],'counts':counts,'members':allmembers,'vacancies':vacancies,'seatCoverage':seats,'privacy':'Only member identity, party, seat, role and relevant date fields retained. Raw XML/HTML bytes and all contact-field values were discarded after in-memory hashing/parsing.'}
save('official-current-members-contact-free.json',data)
baseline={k:json.loads((OUT/f'{k}-source-receipt.json').read_text(encoding='utf-8'))['sha256'] for k in ['house','senate']}
receipt={'outcome':'Worked','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'counts':counts,'sources':[hs,ss],'hashConservationFromInitialFetch':{'house':hs['sha256']==baseline['house'],'senate':ss['sha256']==baseline['senate']},'uniqueRealBioguideIds':len(ids),'duplicateRealBioguideIds':0,'duplicateHouseSeats':0,'duplicateSenateClassSeats':0,'unknownPartyCodes':0,'vacancies':vacancies,'nonVotingMembers':nonvoting,'semanticBoundaries':['House XML explicitly declares Congress119/session2.','Senate XML has no Congress field; current119 is independently bound to official Senators landing, not silently hardcoded.','Vacant House seats are not member identities and have null person/party/bioguide.','House 441 XML entries are seats, not441 occupied representatives.','Senate file has no separate vacancy element; this snapshot100 named unique IDs covers50 states with2 distinct classes each. Do not assume future absent rows mean vacancy without positive corroboration.','No certification, election results, biography, contacts or candidacy is derived.'],'limitationsForAdoption':['Government source whole-byte hashes are retained; raw contact-bearing documents are intentionally not persisted. Contact-free projections are independently replayable but cannot reconstruct original raw document hash.','No database import/transaction implementation occurred in this read-only investigation.']}
save('official-derivation-receipt.json',receipt)
print(json.dumps({'outcome':receipt['outcome'],'counts':counts,'hashConservation':receipt['hashConservationFromInitialFetch'],'vacancies':vacancies},ensure_ascii=False))
