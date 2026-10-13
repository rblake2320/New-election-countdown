from pathlib import Path
import json,hashlib,re,sys
from bs4 import BeautifulSoup
from pypdf import PdfReader
base=Path(__file__).parent
raw=Path(sys.argv[1])
checks=[]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
index=json.loads((base/"SOURCE_INDEX.json").read_text())
for f in index["files"]:
 path=Path(f["path"])
 assert sha(path)==f["sha256"],f["path"]
checks.append({"scenario":"retained packet index byte hashes","count":len(index["files"]),"outcome":"Worked"})
total=0
for f in base.glob("*-draft.json"):
 m=json.loads(f.read_text());assert m["version"]==1
 for s in m["sources"]:
  rows=[r for r in m["candidates"] if r["sourceId"]==s["id"]]
  assert len(rows)==s["expectedRowCount"]
  assert all(r["state"]==s["state"] and r["date"]==s["electionDate"] and r["incumbent"] is None for r in rows)
  for scope in s["completeScopes"]:
   selected=[r for r in rows if r["office"]==scope["office"] and r["district"]==scope["district"] and r.get("ballotAccessType")==scope.get("ballotAccessType")]
   assert len(selected)==scope["expectedCount"]
 total+=len(m["candidates"])
checks.append({"scenario":"draft row/date/state/scope count conservation, all unknown incumbents null","rows":total,"outcome":"Worked"})
for manifest,pdf in [("ar-general-three-gaps-draft.json","AR-general-ballotdraw.pdf"),("az-general-gov-h06-h07-draft.json","AZ-Pima-official-general.pdf"),("az-h06-write-in-addon-draft.json","AZ-Pima-official-write-ins.pdf")]:
 m=json.loads((base/manifest).read_text());document=base/pdf;primary=m["sources"][0];assert sha(document)==primary["sha256"]
 text=" ".join(PdfReader(document).pages[0].extract_text().split())
 for row in [r for r in m["candidates"] if r["sourceId"]==primary["id"]]:assert row["ballotName"] in text,row["ballotName"]
checks.append({"scenario":"actual retained PDF hashes and every extracted first-source ballot label","outcome":"Worked"})
wi=json.loads((base/"az-general-gov-h06-h07-draft.json").read_text())["sources"][1];assert sha(base/"AZ-Mohave-official-write-ins.pdf")==wi["sha256"]
roles=json.loads((base/"az-extraction-receipt.json").read_text())["governorRoleIdentity"];assert sha(raw/"AZ-role-guide.raw")==roles["source"]["sha256"]
reader=PdfReader(raw/"AZ-role-guide.raw")
for page in roles["pages"]:
 text=reader.pages[page["sourcePage"]-1].extract_text();assert page["heading"] in text
 for name in page["names"]:assert name in text
checks.append({"scenario":"actual 2026 guide names and explicit Governor role, identity only","names":4,"outcome":"Worked"})
il=json.loads((base/"il-extraction-receipt.json").read_text());assert sha(raw/"IL-General-Gov-actualquery.raw")==il["sourceFetch"]["sha256"]
for role in il["governorRoleProofs"]:
 name=role["fields"]["Name"];stem={"JB Pritzker":"Pritzker","Darren Bailey":"Bailey","Collin Corbett":"Corbett"}[name];file=raw/("IL-"+stem+"-role.raw");assert sha(file)==role["fetch"]["sha256"]
 s=BeautifulSoup(file.read_bytes(),"html.parser");assert s.find(id="ContentPlaceHolder1_lblName").get_text(" ",strip=True)==name;assert s.find(id="ContentPlaceHolder1_lblOffice").get_text(" ",strip=True)=="Governor"
 assert any(r[0]=="2026" and r[1]=="GE" for r in role["electionRows"])
checks.append({"scenario":"actual Illinois general bytes and independently source-labelled Governor identities","physicalGeneralRows":6,"governors":3,"outcome":"Worked"})
receipt={"outcome":"Worked","checks":checks,"rawContactContainingSourcesReadOnlyNotEmitted":True,"pinalByteCaptureClaim":False,"noDatabaseOrNetworkAccess":True}
(base/"source-packet-verification.json").write_text(json.dumps(receipt,indent=2)+"\n");print(json.dumps(receipt))
