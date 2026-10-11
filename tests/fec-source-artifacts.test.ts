import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { extractFecMaster, persistFecManifest } from '../server/fec-source-artifacts';
describe('FEC bounded extraction and durable receipt outcomes', () => {
  it('extracts the selected official-named file', async () => {
    const zip = new JSZip(); zip.file('cn.txt', 'one|row');
    expect(await extractFecMaster(await zip.generateAsync({ type: 'nodebuffer' }))).toBe('one|row');
  });
  it('rejects a selected file larger than a small test cap during streaming', async () => {
    const zip = new JSZip(); zip.file('cn.txt', 'x'.repeat(2048));
    await expect(extractFecMaster(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), 100)).rejects.toThrow(/byte limit/);
  });
  it('rejects ambiguous selected entries', async () => {
    const zip = new JSZip(); zip.file('cn.txt','one'); zip.file('other/cn.txt','two');
    await expect(extractFecMaster(await zip.generateAsync({ type: 'nodebuffer' }))).rejects.toThrow(/exactly one/);
  });
  it('keeps both apply receipts when the same source is imported twice', () => {
    const written = new Map<string,string>();
    const write = (path:string,value:string) => written.set(path,value);
    persistFecManifest('fixture','a'.repeat(64),{mode:'applied',database_audit_id:1,actions:{insert:3}},write);
    persistFecManifest('fixture','a'.repeat(64),{mode:'applied',database_audit_id:2,actions:{}},write);
    expect(written.size).toBe(2);
    expect(Array.from(written.values()).some(value=>JSON.parse(value).actions.insert===3)).toBe(true);
  });
  it('reports committed apply and retained database audit after an injected local ENOSPC', () => {
    const actual = persistFecManifest('fixture','a'.repeat(64),{mode:'applied',database_audit_id:42},()=> { throw Object.assign(new Error('fixture disk error'),{code:'ENOSPC'}); });
    expect(actual).toMatchObject({outcome:'applied',receipt_file:null,database_audit_id:42,receipt_error:{code:'ENOSPC'}});
  });
  it('never claims committed apply without a database audit receipt', () => {
    expect(()=>persistFecManifest('fixture','a'.repeat(64),{mode:'applied'},()=>{})).toThrow(/audit ID/);
  });
});
