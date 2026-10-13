import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, mkdirSync, cpSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { describe,it,expect } from 'vitest';
import { bridgeOfficialContest, type OfficialBridgeInput } from '../server/official-result-adapters/bridge';
import { parseWashingtonLandsRecount, WA_LANDS_CONTEXT } from '../server/official-result-adapters/wa';
import { parseOfficialSourcePacket,loadReviewedPacketBytes,officialSourcePacketSchema } from '../server/official-result-adapters/packet';
const root=resolve('artifacts/source-packet/wa'),packetPath=join(root,'initial.packet.json');
const sha=(raw:Uint8Array)=>createHash('sha256').update(raw).digest('hex');
const target={id:4242401,state:'WA',date:'2024-08-06',type:'Primary',level:'state',title:'Washington Commissioner of Public Lands Primary'};
const packet=officialSourcePacketSchema.parse(JSON.parse(readFileSync(packetPath,'utf8')));
const payload=readFileSync(join(root,'raw/wa-2024-recount-all-candidates.xlsx')),pdf=readFileSync(join(root,'raw/wa-2024-original-certification.pdf'));
const certUrl='https://www.sos.wa.gov/sites/default/files/2024-08/Certification%20of%20Results%20-%202024%20Primary.pdf';
const base:OfficialBridgeInput={publisher:packet.publisher,retrievedAt:'2026-10-12T04:27:30.691594+00:00',target,reviewedTarget:target,reviewedContext:WA_LANDS_CONTEXT,reviewedBinding:{target,sourceContext:WA_LANDS_CONTEXT},rawPayload:payload,rawCertificates:[{url:certUrl,sha256:sha(pdf),bytes:pdf}]};
const parsed=await parseWashingtonLandsRecount(payload,{context:WA_LANDS_CONTEXT,snapshot:'initial',certificationBytes:pdf});
function scratch(){const dir=mkdtempSync(join(tmpdir(),'sol-source-packet-test-'));cpSync(root,join(dir,'packet'),{recursive:true});return {dir,path:join(dir,'packet/initial.packet.json')};}
async function mutation(change:(value:typeof packet)=>void){const s=scratch(),value=structuredClone(packet);change(value);const bytes=Buffer.from(JSON.stringify(value));writeFileSync(s.path,bytes);return parseOfficialSourcePacket(s.path,sha(bytes),target);}
describe('Actual raw packet→V1 bridge',()=>{
  it('exports independently hash-verified evidence bytes and bounded resolved paths for the writer',()=>{
    const loaded=loadReviewedPacketBytes(packetPath,sha(readFileSync(packetPath)));
    expect(loaded.files.length).toBe(3);for(const file of loaded.files){expect(sha(file.bytes)).toBe(file.sha256);expect(file.resolvedPath.startsWith(root)).toBe(true);}
    expect(loaded.files.find(file=>file.role==='payload')?.bytes.equals(payload)).toBe(true);
    expect(loaded.files.find(file=>file.role==='certificate')?.bytes.equals(pdf)).toBe(true);
  });
  it('defaults to unofficial even when parser has verified certificate proof',()=>{const input=bridgeOfficialContest(parsed,base);expect(input.status).toBe('unofficial');expect(input.certification).toBeNull();expect(input.asOf).toBeNull();expect(input.candidates.every(c=>c.candidateId===null&&!c.isWinner)).toBe(true);expect(input.candidates[0]?.sourceCandidateId).toBe('Allen Lebovitz');});
  it('requires explicit certification and exact PDF proof; preserves null dates',()=>{const input=bridgeOfficialContest(parsed,{...base,reviewedCertification:true});expect(input.status).toBe('certified');expect(input.certification).toEqual({url:certUrl,certifiedAt:null});});
  it('preserves genuine publisher IDs separately from inferred person IDs',()=>{const value=structuredClone(parsed);value.options[0]={...value.options[0]!,sourceCandidateId:'12',identifierBasis:'publisher_id'};const input=bridgeOfficialContest(value,base);expect(input.candidates[0]?.sourceCandidateId).toBe('12');expect(input.candidates[0]?.candidateId).toBeNull();});
  it('refuses raw/certification mismatch or missing certificate',()=>{expect(()=>bridgeOfficialContest(parsed,{...base,rawPayload:Buffer.from('wrong')})).toThrow(/raw payload/);expect(()=>bridgeOfficialContest(parsed,{...base,reviewedCertification:true,rawCertificates:[]})).toThrow(/certification bytes/);expect(()=>bridgeOfficialContest({...parsed,certificationEvidence:[]},{...base,reviewedCertification:true})).toThrow(/requires actual/);});
  it('requires the independently declared certificate pin, not only a self-hashed proof',()=>{expect(()=>bridgeOfficialContest(parsed,{...base,reviewedCertification:true,rawCertificates:[{url:certUrl,sha256:'0'.repeat(64),bytes:pdf}]})).toThrow(/certification bytes/);});
  for(const [key,value] of Object.entries({id:4242402,state:'CA',date:'2026-11-03',type:'General',level:'federal',title:'Other race'}))it(`refuses rewritten authoritative target ${key}`,()=>{expect(()=>bridgeOfficialContest(parsed,{...base,target:{...target,[key]:value}})).toThrow(/reviewed binding/);});
  it('refuses certification context relabelling',()=>{const value=structuredClone(parsed);const proof=value.certificationEvidence[0];if(!proof)throw new Error('missing fixtureproof');proof.context.electionDate='2026-11-03';expect(()=>bridgeOfficialContest(value,{...base,reviewedCertification:true})).toThrow(/electionDate/);});
  it('refuses target phase even if all target tuples are rewritten together',()=>{expect(()=>bridgeOfficialContest(parsed,{...base,target:{...target,type:'General'},reviewedTarget:{...target,type:'General'},reviewedBinding:{...base.reviewedBinding,target:{...target,type:'General'}}})).toThrow(/phase/);});
  it('requires explicit source office/party/title mapping instead of guessing from target title',()=>{
    expect(()=>bridgeOfficialContest(parsed,{...base,reviewedBinding:{...base.reviewedBinding,sourceContext:{...WA_LANDS_CONTEXT,office:'Governor'}}})).toThrow(/office/);
    expect(()=>bridgeOfficialContest(parsed,{...base,reviewedBinding:{...base.reviewedBinding,sourceContext:{...WA_LANDS_CONTEXT,party:'DEM'}}})).toThrow(/party/);
    expect(()=>bridgeOfficialContest(parsed,{...base,target:{...target,title:'Other office'},reviewedTarget:{...target,title:'Other office'}})).toThrow(/title/);
  });
  it('accepts reviewed lowercase DBphase while refusing unreviewed case edits in target tuple',()=>{const lower={...target,type:'primary'};expect(bridgeOfficialContest(parsed,{...base,target:lower,reviewedTarget:lower,reviewedBinding:{...base.reviewedBinding,target:lower}}).status).toBe('unofficial');expect(()=>bridgeOfficialContest(parsed,{...base,target:lower})).toThrow(/type/);});
  it('derives stable full-input idempotency; changed actual retrieval gets a different key',()=>{expect(bridgeOfficialContest(parsed,base).idempotencyKey).toBe(bridgeOfficialContest(parsed,base).idempotencyKey);expect(bridgeOfficialContest(parsed,{...base,retrievedAt:'2026-10-12T04:28:30Z'}).idempotencyKey).not.toBe(bridgeOfficialContest(parsed,base).idempotencyKey);});
  it('runs actual pinned portable packet and binds real capture clock',async()=>{const receipt=await parseOfficialSourcePacket(packetPath,sha(readFileSync(packetPath)),target);expect(receipt.input.totalVotes).toBe(1903073);expect(receipt.input.retrievedAt).toBe(base.retrievedAt);expect(receipt.input.certification?.certifiedAt).toBeNull();});
  for(const [folder,total,count] of [['wa-senate',1948716,12],['ca',9262468,68]] as const)it(`calls actual ${folder} raw parser from portable packet`,async()=>{
    const dir=resolve('artifacts/source-packet',folder),path=join(dir,'packet.json'),actualTarget=JSON.parse(readFileSync(join(dir,'target-binding.json'),'utf8'));
    const receipt=await parseOfficialSourcePacket(path,sha(readFileSync(path)),actualTarget);
    expect(receipt.input.totalVotes).toBe(total);expect(receipt.input.candidates.length).toBe(count);expect(receipt.input.status).toBe('certified');expect(receipt.input.asOf).toBeNull();expect(receipt.input.candidates.every(c=>c.candidateId===null&&!c.isWinner)).toBe(true);
  });
  for(const [folder,total,count,state] of [['nc-manual',827755,6,'NC'],['nc-house-manual',67376,5,'NC'],['la-manual',196212,2,'LA']] as const)it(`calls actual ${folder} raw parser and emits truthful manual provenance`,async()=>{
    const dir=resolve('artifacts/source-packet',folder),path=join(dir,'packet.json'),actualTarget=JSON.parse(readFileSync(join(dir,'target-binding.json'),'utf8'));
    const receipt=await parseOfficialSourcePacket(path,sha(readFileSync(path)),actualTarget);
    expect(receipt.input.totalVotes).toBe(total);expect(receipt.input.candidates.length).toBe(count);expect(receipt.input.status).toBe('unofficial');expect(receipt.input.source?.kind).toBe('admin_manual');expect(receipt.input.source?.id).toBe(`admin_manual:${state}`);
    expect(receipt.input.asOf).toBeNull();expect(receipt.input.certification).toBeNull();expect(receipt.input.candidates.every(c=>c.candidateId===null&&!c.isWinner)).toBe(true);
    if(state==='LA')expect(receipt.input.candidates.map(c=>c.sourceCandidateId)).toEqual(['124648','124649']);
  });
  it('refuses claiming manual source certified or using another state ID',()=>{
    const publisher={...base.publisher,kind:'admin_manual' as const,id:'admin_manual:WA'};
    expect(()=>bridgeOfficialContest(parsed,{...base,publisher,reviewedCertification:true})).toThrow(/unofficial status/);
    expect(()=>bridgeOfficialContest(parsed,{...base,publisher:{...publisher,id:'admin_manual:NC'}})).toThrow(/exact admin_manual/);
    expect(()=>bridgeOfficialContest(parsed,{...base,publisher:{...publisher,id:'WA'}})).toThrow(/exact admin_manual/);
    expect(()=>bridgeOfficialContest(parsed,{...base,publisher:{...publisher,id:'NC'}})).toThrow(/exact admin_manual/);
  });
  it('keeps original/amended actual returns on SAME source contest with different counts and keys',async()=>{
    const before=await parseOfficialSourcePacket(packetPath,sha(readFileSync(packetPath)),target),afterPath=join(root,'recount.packet.json'),after=await parseOfficialSourcePacket(afterPath,sha(readFileSync(afterPath)),target);
    expect(before.input.source?.sourceContestId).toBe(after.input.source?.sourceContestId);expect(before.input.electionId).toBe(after.input.electionId);
    expect(before.input.totalVotes).not.toBe(after.input.totalVotes);expect(before.input.idempotencyKey).not.toBe(after.input.idempotencyKey);
  });
  it('refuses manifest digest mismatch and changed expected totals',async()=>{await expect(parseOfficialSourcePacket(packetPath,'0'.repeat(64),target)).rejects.toThrow(/manifest/);await expect(mutation(p=>{p.expectedTotals.totalVotes++;})).rejects.toThrow(/expected totals/);});
  it('refuses changed raw source bytes',async()=>{const s=scratch();writeFileSync(join(s.dir,'packet/raw/wa-2024-recount-all-candidates.xlsx'),'damaged');await expect(parseOfficialSourcePacket(s.path,sha(readFileSync(s.path)),target)).rejects.toThrow(/Raw payload/);});
  it('refuses traversal/absolute paths and duplicate roles',async()=>{await expect(mutation(p=>{p.files[0]!.path='../outside';})).rejects.toThrow(/relative paths/);await expect(mutation(p=>{p.files[0]!.path='C:/outside';})).rejects.toThrow(/relative paths/);await expect(mutation(p=>{p.files.push(p.files[0]!);})).rejects.toThrow(/ambiguous file roles/);});
  it('refuses missing or mismatched actual capture receipt',async()=>{await expect(mutation(p=>{p.files=p.files.filter(f=>f.role!=='capture_receipt');})).rejects.toThrow(/capture_receipt absent/);await expect(mutation(p=>{p.publisher.url='https://www.sos.wa.gov/other';})).rejects.toThrow(/Publisher URL/);});
  it('refuses invalid capture clock rather than supplying parsing time',async()=>{
    const s=scratch(),value=structuredClone(packet),capture=value.files.find(f=>f.role==='capture_receipt');if(!capture)throw new Error('missing capturefixture');
    const file=join(s.dir,'packet',capture.path),rows:Record<string,unknown>[]=JSON.parse(readFileSync(file,'utf8'));
    const record=rows.find(r=>r.sha256===sha(payload));if(!record)throw new Error('missing payload receipt');record.checkedAt='2026-10-12T04:27:30+99:99';
    const raw=Buffer.from(JSON.stringify(rows));writeFileSync(file,raw);capture.sha256=sha(raw);const manifest=Buffer.from(JSON.stringify(value));writeFileSync(s.path,manifest);
    await expect(parseOfficialSourcePacket(s.path,sha(manifest),target)).rejects.toThrow();
  });
  it('refuses real filesystem link escape (Windows junction / POSIX symlink)',async()=>{
    const s=scratch(),outside=join(s.dir,'outside');mkdirSync(outside);writeFileSync(join(outside,'payload.xlsx'),payload);
    symlinkSync(outside,join(s.dir,'packet/link'),process.platform==='win32'?'junction':'dir');
    const value=structuredClone(packet);value.files[0]!.path='link/payload.xlsx';const bytes=Buffer.from(JSON.stringify(value));writeFileSync(s.path,bytes);
    await expect(parseOfficialSourcePacket(s.path,sha(bytes),target)).rejects.toThrow(/outside packet/);
  });
});
