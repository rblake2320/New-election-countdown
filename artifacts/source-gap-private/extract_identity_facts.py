import gzip, hashlib, json, re
from pathlib import Path
from bs4 import BeautifulSoup
from pypdf import PdfReader

p = Path(__file__).parent
facts = []
for body in (p / 'identity-raw').glob('SC-*.raw.gz'):
 raw = gzip.decompress(body.read_bytes())
 s = BeautifulSoup(raw.decode('utf-8'), 'html.parser')
 text = s.get_text(' ', strip=True)
 headings = [h.get_text(' ', strip=True) for h in s.select('h1,h2,h3')]
 label_values = {}
 for label in ['Election:', 'Office:', 'Name on Ballot:', 'Party:', 'Status:']:
  idx = text.find(label)
  if idx >= 0:
   end = min((text.find(stop, idx + len(label)) for stop in ['Election:', 'Office:', 'Name on Ballot:', 'Party:', 'Address:', 'Status:', 'Date Filed:'] if text.find(stop, idx + len(label)) >= 0), default=idx+100)
   label_values[label] = text[idx+len(label):end].strip()
 facts.append({'file': body.name, 'bodySha256': hashlib.sha256(raw).hexdigest(), 'headings': headings, 'labels': label_values, 'documents': [{'text': a.get_text(' ', strip=True), 'href': a.get('href'), 'data': {k:v for k,v in a.attrs.items() if k.startswith('data-')}} for a in s.select('a') if any(x in a.get_text() for x in ['SICPP','Filing Form','Receipt'])]})
pdf_facts=[]
for body in (p / 'identity-raw').glob('Form2-*.pdf'):
 text = '\n'.join(page.extract_text() for page in PdfReader(body).pages)
 pdf_facts.append({'file': body.name, 'bodySha256': hashlib.sha256(body.read_bytes()).hexdigest(), 'matches': [m.group() for m in re.finditer(r'(?:Wilson, Joe[^\n]*|Timmons, William[^\n]*|H[28]SC\d+|2026|REPUBLICAN PARTY)', text)]})
result={'candidateDetails':facts,'form2':pdf_facts,'contactFieldsExcluded':True}
(p/'identity-extracted-facts.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps(result,indent=2))
