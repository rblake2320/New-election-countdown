from pathlib import Path
import fitz, subprocess, json
p = Path(__file__).parent / 'identity-raw'
facts = []
for name in ['Joe','William']:
 doc = fitz.open(p / ('SC-Form-' + name + '.pdf'))
 png = p / ('SC-Form-' + name + '-p1.png')
 doc[0].get_pixmap(matrix=fitz.Matrix(2,2)).save(png)
 r = subprocess.run(['C:/Program Files/Tesseract-OCR/tesseract.exe',str(png),'stdout','--psm','6'],capture_output=True,text=True)
 text = r.stdout
 matches = [line for line in text.splitlines() if (line.startswith('[Name') or line.startswith('Name on Ballot') or line.startswith('Thereby file my notice') or line.startswith('I hereby file my notice')) and not any(x.lower() in line.lower() for x in ['Phone','email','contact','voter','reg.'])]
 facts.append({'name': name, 'matches': matches, 'exit': r.returncode})
 (p / ('SC-Form-' + name + '-ocr.txt')).write_text(text)
result={'facts':facts,'mode':'windowless official scanned PDF OCR, no screen/native capture','uncommittedRawOcrContainsExcludedContactFields':True}
(Path(__file__).parent / 'sc-filing-form-ocr-facts.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps(facts,indent=2))
