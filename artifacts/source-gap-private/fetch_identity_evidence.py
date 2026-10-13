import concurrent.futures, datetime, gzip, hashlib, json
from pathlib import Path
import requests

artifact = Path(__file__).parent
rawdir = artifact / 'identity-raw'
rawdir.mkdir(exist_ok=True)
tasks = [
 ('SC-Zyon', 'https://vrems.scvotes.sc.gov/Candidate/CandidateDetail/?candidateId=24437&electionId=22596&searchType=Default'),
 ('SC-Dayna', 'https://vrems.scvotes.sc.gov/Candidate/CandidateDetail/?candidateId=24375&electionId=22596&searchType=Default'),
 ('SC-Joe', 'https://vrems.scvotes.sc.gov/Candidate/CandidateDetail/?candidateId=23673&electionId=22596&searchType=Default'),
 ('SC-Brian', 'https://vrems.scvotes.sc.gov/Candidate/CandidateDetail/?candidateId=24334&electionId=22596&searchType=Default'),
 ('SC-Jessica', 'https://vrems.scvotes.sc.gov/Candidate/CandidateDetail/?candidateId=24229&electionId=22596&searchType=Default'),
 ('SC-William', 'https://vrems.scvotes.sc.gov/Candidate/CandidateDetail/?candidateId=24234&electionId=22596&searchType=Default'),
 ('FEC-Joe', 'https://www.fec.gov/data/candidate/H2SC02059/?cycle=2026'),
 ('FEC-William', 'https://www.fec.gov/data/candidate/H8SC04250/?cycle=2026'),
 ('Form2-Joe', 'https://docquery.fec.gov/pdf/917/202504219756338917/202504219756338917.pdf'),
 ('Form2-William', 'https://docquery.fec.gov/pdf/971/202502209753753971/202502209753753971.pdf'),
 ('House-William', 'https://clerk.house.gov/members/T000480'),
 ('FEC-Jessica', 'https://www.fec.gov/data/candidate/H6SC04197/?cycle=2026'),
 ('FEC-Zyon-1', 'https://www.fec.gov/data/candidate/H6SC02159/?cycle=2026'),
 ('FEC-Zyon-2', 'https://www.fec.gov/data/candidate/H6SC02167/?cycle=2026'),
]

def fetch(task):
 name, url = task
 try:
  r = requests.get(url, timeout=25)
  body = r.content
  content_type = r.headers.get('content-type', '')
  proof = {'url': url, 'finalUrl': r.url, 'status': r.status_code, 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest(), 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'contentType': content_type}
  path = rawdir / (name + ('.pdf' if 'pdf' in content_type else '.raw.gz'))
  path.write_bytes(body if 'pdf' in content_type else gzip.compress(body))
  proof['localUncommittedBody'] = str(path)
  (artifact / (name + '-identity-proof.json')).write_bytes((json.dumps(proof, indent=2) + '\n').encode())
  return name, r.status_code, len(body)
 except Exception as error:
  proof = {'url': url, 'outcome': 'Blocked', 'error': str(error), 'type': type(error).__name__}
  (artifact / (name + '-identity-proof.json')).write_bytes((json.dumps(proof, indent=2) + '\n').encode())
  return name, 'Blocked', type(error).__name__

if __name__ == '__main__':
 print(json.dumps(list(concurrent.futures.ThreadPoolExecutor(max_workers=4).map(fetch, tasks))))
