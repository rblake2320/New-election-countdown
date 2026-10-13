import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { readXlsxWorkbook } from '../server/official-result-adapters/xlsx';
import { parseWashingtonLandsRecount, WA_LANDS_CONTEXT } from '../server/official-result-adapters/wa';
const raw = (name: string) => readFileSync(resolve('artifacts/wa-adapter/raw', name));
const workbook = raw('wa-2024-recount-all-candidates.xlsx');
const beforePdf = raw('wa-2024-original-certification.pdf'), afterPdf = raw('wa-2024-recount-certification.pdf');
async function fixture(cells: string, additions?: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Scope" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml', `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${cells}</row></sheetData></worksheet>`);
  for (const [name, value] of Object.entries(additions ?? {})) zip.file(name, value);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
describe('Actual WA official primary full-contest bytes', () => {
  it('parses all39 counties and original certified8-option counts', async () => {
    const result = await parseWashingtonLandsRecount(workbook, { context: WA_LANDS_CONTEXT, snapshot: 'initial', certificationBytes: beforePdf });
    expect(result.options.map(o => o.votes)).toEqual([194114,419297,396300,396249,267924,84351,143170,1668]);
    expect(result.totalVotes).toBe(1903073); expect(result.publisherMetrics).toEqual({ overvote:1205,undervote:89818,ballotTotal:1994096 });
    expect(result.certificationEvidence[0]?.dateRaw).toBe('22nd day of August, 2024');
    expect(result.options.every(o => !o.isWinner && o.sourceCandidateId === null)).toBe(true);
  });
  it('parses amended full counts, legitimate decreasing write-in and separate ballot denominator', async () => {
    const result = await parseWashingtonLandsRecount(workbook, { context: WA_LANDS_CONTEXT, snapshot: 'recount', certificationBytes: afterPdf });
    expect(result.options.map(o => o.votes)).toEqual([194118,419309,396304,396255,267944,84353,143174,1658]);
    expect(result.totalVotes).toBe(1903115); expect(result.publisherMetrics).toEqual({ overvote:1166,undervote:89818,ballotTotal:1994099 });
    expect(result.options[7]?.optionKind).toBe('write_in');
    expect(result.asOf).toBeNull(); expect(result.asOfRaw).toBe('Sept 4 @ 1PM'); expect(result.certificationEvidence[0]?.certifiedAt).toBeNull();
    expect(result.context.electionDate).toBe('2024-08-06'); expect(result.reporting).toBeNull();
  });
  for (const [key, value] of Object.entries({ state:'CA',electionDate:'2026-11-03',phase:'general',level:'federal',office:'Governor',district:'01',party:'Democratic' })) {
    it(`refuses changed ${key}`, async () => { await expect(parseWashingtonLandsRecount(workbook, { context:{...WA_LANDS_CONTEXT,[key]:value},snapshot:'initial',certificationBytes:beforePdf })).rejects.toThrow(); });
  }
  it('refuses swapped certification', async () => { await expect(parseWashingtonLandsRecount(workbook,{context:WA_LANDS_CONTEXT,snapshot:'initial',certificationBytes:afterPdf})).rejects.toThrow(/Certification/); });
  it('refuses transformed or damaged official bytes', async () => { await expect(parseWashingtonLandsRecount(Buffer.concat([workbook,Buffer.from(' ')]),{context:WA_LANDS_CONTEXT,snapshot:'initial',certificationBytes:beforePdf})).rejects.toThrow(/Workbook bytes/); });
});
describe('Bounded XLSX trust boundary (isolated adversarial controls)', () => {
  it('preserves sparse positions, accents, whitespace and cached formulas without evaluation', async () => {
    const book = await readXlsxWorkbook(await fixture('<c r="B1" t="inlineStr"><is><t> Gretha Solórzano &amp; X\r\n</t></is></c><c r="D1"><f>1/0</f><v>42</v></c>'));
    expect(book.sheets[0]?.rows[0]).toEqual([null,' Gretha Solórzano & X\r\n',null,42]);
  });
  for (const [label, cells] of [ ['uncached formula','<c r="A1"><f>SUM(A2:A3)</f></c>'], ['invalid numeric','<c r="A1"><v>NaN</v></c>'], ['duplicate cell','<c r="A1"><v>1</v></c><c r="A1"><v>2</v></c>'], ['invalid row','<c r="A2"><v>1</v></c>'], ['huge coordinate','<c r="ZZZ1"><v>1</v></c>'], ['out-of-range string','<c r="A1" t="s"><v>999</v></c>'] ]) {
    it(`refuses ${label}`, async () => { await expect(readXlsxWorkbook(await fixture(cells ?? ''))).rejects.toThrow(); });
  }
  it('refuses entity/DOCTYPE in unused package parts', async () => { await expect(readXlsxWorkbook(await fixture('<c r="A1"><v>1</v></c>',{'unused.xml':'<!DOCTYPE a [<!ENTITY x SYSTEM "file:///secret">]><a>&x;</a>'}))).rejects.toThrow(/Unsafe XML/); });
  it('refuses replacement encoding', async () => { await expect(readXlsxWorkbook(await fixture('<c r="A1" t="inlineStr"><is><t>\ufffd</t></is></c>'))).rejects.toThrow(/encoding/); });
  it('refuses malformed XML', async () => { await expect(readXlsxWorkbook(await fixture('<c r="A1"><v>1</v>'))).rejects.toThrow(); });
  it('decodes numeric character references without admitting HTML or invalid characters', async () => {
    expect((await readXlsxWorkbook(await fixture('<c r="A1" t="inlineStr"><is><t>Sol&#xF3;rzano&#13;&#10;</t></is></c>'))).sheets[0]?.rows[0]?.[0]).toBe('Solórzano\r\n');
    await expect(readXlsxWorkbook(await fixture('<c r="A1" t="inlineStr"><is><t>&copy;</t></is></c>'))).rejects.toThrow(/entity/);
    await expect(readXlsxWorkbook(await fixture('<c r="A1" t="inlineStr"><is><t>&#xD800;</t></is></c>'))).rejects.toThrow(/character/);
  });
  it('refuses external worksheet relationships', async () => {
    const bytes=await fixture('<c r="A1"><v>1</v></c>'); const zip=await JSZip.loadAsync(bytes);
    zip.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="https://example.invalid/payload" TargetMode="External"/></Relationships>');
    await expect(readXlsxWorkbook(await zip.generateAsync({type:'nodebuffer'}))).rejects.toThrow(/External/);
  });
  it('rejects declared bombs and encrypted archives before inflation', async () => {
    for(const attack of ['bomb','encrypted']) {
      const bytes=await fixture('<c r="A1"><v>1</v></c>'); const central=bytes.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
      if(attack==='bomb')bytes.writeUInt32LE(0xffffffff,central+24);else bytes.writeUInt16LE(1,central+8);
      await expect(readXlsxWorkbook(bytes)).rejects.toThrow();
    }
  });
  it('refuses CRC-corrupted stored payload', async () => {
    const zip = new JSZip(); zip.file('x','unique-payload'); const bytes = await zip.generateAsync({type:'nodebuffer',compression:'STORE'}); bytes[bytes.indexOf(Buffer.from('unique-payload'))] = 88;
    await expect(readXlsxWorkbook(bytes)).rejects.toThrow(/CRC/);
  });
  it('refuses truncated ZIP and oversized input', async () => { await expect(readXlsxWorkbook(workbook.subarray(0,workbook.length-1))).rejects.toThrow(); await expect(readXlsxWorkbook(Buffer.alloc(16*1024*1024+1))).rejects.toThrow(/size/); });
  it('refuses excessive entry count before inflation', async () => { const zip = new JSZip();for(let n=0;n<257;n++)zip.file(`x${n}`,'x'); await expect(readXlsxWorkbook(await zip.generateAsync({type:'nodebuffer'}))).rejects.toThrow(/directory/); });
  it('bounds sparse grid allocation separately from nonempty cell count', async () => {
    const zip=await JSZip.loadAsync(await fixture(''));
    const rows=Array.from({length:1000},(_,i)=>`<row r="${i+1}"><c r="SR${i+1}"><v>1</v></c></row>`).join('');
    zip.file('xl/worksheets/sheet1.xml',`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`);
    await expect(readXlsxWorkbook(await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}))).rejects.toThrow(/allocation/);
  });
  it('bounds real inflation when forged directory lies about expanded length', async () => {
    const zip = new JSZip();zip.file('bomb',Buffer.alloc(1024*1024,65));const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
    const central=bytes.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));bytes.writeUInt32LE(1,22);bytes.writeUInt32LE(1,central+24);
    await expect(readXlsxWorkbook(bytes)).rejects.toThrow();
  });
});
