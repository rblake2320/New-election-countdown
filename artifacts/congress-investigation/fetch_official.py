"""Fetch public official XML; retain hashes/schema only, never raw contact values."""
import collections, datetime, hashlib, json, pathlib, urllib.request, xml.etree.ElementTree as ET

OUT=pathlib.Path(__file__).resolve().parent
SOURCES={"house":"https://clerk.house.gov/xml/lists/MemberData.xml", "senate":"https://www.senate.gov/general/contact_information/senators_cfm.xml"}
def tag(e): return e.tag.split('}')[-1]
def safe_tree(e):
    allowed={"title-info","congress-num","congress-text","session","session-num","session-text","members","member","member-info","member-detail","bioguideID","bioguide_id","name","namelist","firstname","lastname","first_name","last_name","member_full","formal-name","party","state","state-statistic","state-fullname","district","district-name","district-statistic","vacancy","vacant","elected-date","sworn-date","status","position","class","leadership"}
    if tag(e) not in allowed: return None
    children=[v for child in e if (v:=safe_tree(child)) is not None]
    leaf=(e.text or '').strip() if not list(e) else None
    return {"tag":tag(e), **({"text":leaf} if leaf else {}), **({"children":children} if children else {})}
for chamber,url in SOURCES.items():
    checked=datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"ElectionTracker-official-source-review/1.0","Accept":"application/xml,text/xml"})
        with urllib.request.urlopen(req,timeout=45) as r:
            body=r.read(); status=r.status; final=r.url; content_type=r.headers.get('Content-Type'); last_modified=r.headers.get('Last-Modified')
        root=ET.fromstring(body)
        schema=collections.Counter('/'.join(p) for p in [])
        def walk(e,p):
            q=p+[tag(e)]; schema['/'.join(q)]+=1
            for c in e:walk(c,q)
        walk(root,[])
        members=[e for e in root.iter() if tag(e)=='member']
        retained=[safe_tree(e) for e in members]
        receipt={"source":chamber,"url":url,"finalUrl":final,"checkedAt":checked,"httpStatus":status,"contentType":content_type,"lastModified":last_modified,"byteLength":len(body),"sha256":hashlib.sha256(body).hexdigest(),"rootTag":tag(root),"schemaPathCounts":dict(sorted(schema.items())),"documentMetadata":[safe_tree(e) for e in root if tag(e)=='title-info'],"memberCount":len(members),"contactFreeMemberProjection":retained,"privacy":"Raw document bytes parsed in memory only; no contact-field values retained; tag names only in schema inventory."}
    except Exception as e:
        receipt={"source":chamber,"url":url,"checkedAt":checked,"outcome":"Blocked","errorType":type(e).__name__,"error":str(e)}
    (OUT/f'{chamber}-source-receipt.json').write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in receipt.items() if k not in ['contactFreeMemberProjection','schemaPathCounts']},ensure_ascii=False))
