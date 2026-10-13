import pathlib,subprocess,hashlib,json,fitz,csv
root=pathlib.Path(__file__).resolve().parents[1]/'artifacts/ga-mn-general';out=root/'ocr';out.mkdir(exist_ok=True)
receipt=[]
for key in ['ga-fayette-ballot','ga-carroll-ballot']:
 raw=root/'raw'/(key+'.pdf');doc=fitz.open(raw)
 for i,page in enumerate(doc):
  img=out/(key+'-page-'+str(i+1)+'.png');page.get_pixmap(dpi=200).save(img)
  stem=out/(key+'-page-'+str(i+1));cmd=['C:/Program Files/Tesseract-OCR/tesseract.exe',str(img),str(stem),'-l','eng','--psm','3','txt','tsv']
  result=subprocess.run(cmd,capture_output=True,text=True);assert result.returncode==0,result.stderr
  words=list(csv.DictReader((stem.with_suffix('.tsv')).open(encoding='utf-8'),delimiter='\t'))
  conf=[float(w['conf']) for w in words if w['text'].strip() and float(w['conf'])>=0]
  receipt.append(dict(source=key,rawSha256=hashlib.sha256(raw.read_bytes()).hexdigest(),pageOneBased=i+1,dpi=200,renderer='PyMuPDF',ocr='Tesseract eng psm3 CPU',imageSha256=hashlib.sha256(img.read_bytes()).hexdigest(),meanWordConfidence=sum(conf)/len(conf),outcome='Worked',admission='Requires independent page-image review; OCR alone never admits candidates'))
(out/'receipt.json').write_bytes((json.dumps(receipt,indent=2)+'\n').encode())
print(json.dumps(receipt))
