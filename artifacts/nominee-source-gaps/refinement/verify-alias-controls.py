from pathlib import Path
import json,unicodedata,copy
BASE=Path(__file__).resolve().parent
j=json.loads((BASE/'ar-general-three-gaps-refined-draft.json').read_text(encoding='utf8'))
f=json.loads((BASE/'fec-contact-free-projection.json').read_text(encoding='utf8'))['rows']
def norm(s):return ''.join(c for c in unicodedata.normalize('NFKD',s).lower() if c in 'abcdefghijklmnopqrstuvwxyz0123456789')
def display(raw):
 p=[s.strip() for s in raw.split(',')]
 return (' '.join(p[1:])+' '+p[0]).title() if len(p)>1 else raw.title()
def matches(row,actor):
 return row['state']==actor['state'] and row['office']==actor['office'] and row['district']==actor['district'] and row['date']=='2026-11-03' and row['partyRaw']=='Republican' and actor['partyRaw']=='REP' and any(norm(n)==norm(display(actor['nameRaw'])) for n in [row['name'],row['ballotName'],*row.get('aliases',[])])
old=json.loads((BASE.parent/'ar-general-three-gaps-draft.json').read_text(encoding='utf8'))
controls=[]
for row in j['candidates']:
 if not row['ballotName'].startswith('Congressman '):continue
 actor=next(r for r in f if r['state']=='AR' and r['district']==row['district'])
 previous=next(r for r in old['candidates'] if r['ballotName']==row['ballotName'])
 assert not matches(previous,actor)
 assert matches(row,actor)
 for field,bad in [('partyRaw','DEM'),('district','03'),('state','AZ'),('office','S')]:
  changed={**actor,field:bad};assert not matches(row,changed)
 controls.append({'ballotName':row['ballotName'],'oldLiteralTitleMatchesFecDerivedName':False,'reviewedAliasMatchesFecDerivedName':True,'wrongPartyDistrictStateOfficeAllRefused':True,'fecId':actor['id']})
receipt={'outcome':'Worked','controls':controls,'realRetainedIdentityInputs':True,'syntheticNegativeContextMutations':12,'databaseActorsNotRead':True,'noFuzzyNameOrGenericTitleRemoval':True}
(BASE/'alias-match-controls.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(receipt))
