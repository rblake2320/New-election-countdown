import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import { httpsResultsUrl, resultsTimestamp } from '../../shared/official-results';
import { officialContestContextSchema, OfficialResultParseError, type ParsedOfficialContest } from './types';
import { bridgeOfficialContest, officialTargetBindingSchema, reviewedPublisherSchema, reviewedSourceTargetBindingSchema, type OfficialTargetBinding } from './bridge';
import { parseWashingtonLandsRecount, parseWashingtonSenatePrimary } from './wa';
import { parseCaliforniaGovernorSov } from './ca';
import { parseNcOfficialResults } from './nc';
import { parseLaOfficialResults } from './la';
const sha=z.string().regex(/^[a-f0-9]{64}$/),token=z.string().min(1).max(256);
export const officialSourcePacketSchema=z.object({version:z.literal(1),purpose:z.literal('dry_run_only'),
  parser:z.enum(['wa_lands_initial','wa_lands_recount','wa_senate_primary','ca_governor_primary','nc_official','la_official']),
  context:officialContestContextSchema,targetBinding:officialTargetBindingSchema,publisher:reviewedPublisherSchema,
  reviewedBinding:reviewedSourceTargetBindingSchema,
  files:z.array(z.object({role:z.enum(['payload','companion','certificate','capture_receipt']),path:z.string().min(1).max(512),sha256:sha,url:httpsResultsUrl.nullable()}).strict()).min(2).max(8),
  reviewedCertification:z.boolean().default(false),sourceContestId:token.nullable(),localContestId:token.nullable(),
  expectedTotals:z.object({totalVotes:z.number().int().nonnegative().safe(),optionCount:z.number().int().positive().max(5000)}).strict(),
}).strict();
export type OfficialSourcePacket=z.infer<typeof officialSourcePacketSchema>;
function digest(bytes:Uint8Array):string{return createHash('sha256').update(bytes).digest('hex');}
function refuse(code:string,message:string):never{throw new OfficialResultParseError(code,message);}
function boundedFile(path:string,limit:number):Buffer{const info=statSync(path);if(!info.isFile()||info.size<1||info.size>limit)refuse('FILE_BOUND','Source file is missing, empty or oversized');return readFileSync(path);}
function packetFile(root:string,path:string):string{
  if(isAbsolute(path)||path.includes('\\')||path.split('/').some(part=>part==='..'||part==='.'||part==='')||path.includes(':'))refuse('PATH_REFUSED','Packet paths must be simple relative paths');
  const actual=realpathSync(resolve(root,path)),within=relative(root,actual);
  if(within===''||within==='..'||within.startsWith('..'+sep)||isAbsolute(within))refuse('PATH_REFUSED','Packet file resolves outside packet directory');return actual;
}
export function loadReviewedPacketBytes(packetPath:string,expectedManifestSha256:string){
  const manifestPath=realpathSync(packetPath),root=realpathSync(dirname(manifestPath));
  const bytes=boundedFile(manifestPath,256*1024);if(digest(bytes)!==sha.parse(expectedManifestSha256))refuse('MANIFEST_HASH_MISMATCH','Packet manifest does not match reviewed SHA256');
  const packet=officialSourcePacketSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
  const roles=new Set<string>();
  const files=packet.files.map(file=>{
    if(roles.has(file.role))refuse('DUPLICATE_ROLE','Packet has ambiguous file roles');roles.add(file.role);
    const resolvedPath=packetFile(root,file.path),raw=boundedFile(resolvedPath,32*1024*1024);
    if(digest(raw)!==file.sha256)refuse('RAW_HASH_MISMATCH',`Raw ${file.role} differs from reviewed bytes`);
    return {...file,resolvedPath,bytes:raw};
  });
  return {packet,manifestSha256:digest(bytes),files};
}
export async function parseOfficialSourcePacket(packetPath:string,expectedManifestSha256:string,targetInput:unknown){
  const loaded=loadReviewedPacketBytes(packetPath,expectedManifestSha256),packet=loaded.packet;
  const target:OfficialTargetBinding=officialTargetBindingSchema.parse(targetInput);
  const roles=new Map(loaded.files.map(file=>[file.role,file]));
  const required=(role:OfficialSourcePacket['files'][number]['role'])=>{const file=roles.get(role);if(!file)refuse('ROLE_MISSING',`Raw ${role} absent`);return file;};
  const payload=required('payload'),capture=required('capture_receipt');
  if(payload.url!==packet.publisher.url)refuse('PUBLISHER_URL_MISMATCH','Publisher URL does not bind actual payload');
  const captureValue:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(capture.bytes));
  const captureRows=z.array(z.record(z.unknown())).parse(Array.isArray(captureValue)?captureValue:[captureValue]);
  const matches=captureRows.filter(row=>row.url===payload.url&&row.sha256===payload.sha256&&(row.status===200||row.httpStatus===200));
  if(matches.length!==1)refuse('CAPTURE_RECEIPT_MISMATCH','No unique actual successful payload capture receipt');
  const captureClock=matches[0];
  if(captureClock?.checkedAt!==undefined&&captureClock?.retrievedAt!==undefined&&captureClock.checkedAt!==captureClock.retrievedAt)refuse('CAPTURE_RECEIPT_MISMATCH','Capture receipt clocks disagree');
  const retrievedAt=resultsTimestamp.parse(captureClock?.checkedAt??captureClock?.retrievedAt);
  const certificate=roles.get('certificate');let parsed:ParsedOfficialContest;
  switch(packet.parser){
    case 'wa_lands_initial':case 'wa_lands_recount':
      parsed=await parseWashingtonLandsRecount(payload.bytes,{context:packet.context,snapshot:packet.parser==='wa_lands_initial'?'initial':'recount',certificationBytes:required('certificate').bytes});break;
    case 'wa_senate_primary':parsed=await parseWashingtonSenatePrimary(payload.bytes,{context:packet.context,certificationBytes:required('certificate').bytes});break;
    case 'ca_governor_primary':parsed=await parseCaliforniaGovernorSov(payload.bytes,packet.context,certificate?.bytes);break;
    case 'nc_official':{
      const companion=required('companion');if(!packet.sourceContestId||!packet.localContestId||!payload.url||!companion.url)refuse('SCOPE_MISSING','NC source/companion IDs or URLs absent');
      parsed=parseNcOfficialResults(payload.bytes,companion.bytes,{context:packet.context,sourceContestId:packet.sourceContestId,localContestId:packet.localContestId,resultsUrl:payload.url,countyUrl:companion.url,resultsSha256:payload.sha256,countySha256:companion.sha256});break;}
    case 'la_official':{
      const companion=required('companion');if(!packet.sourceContestId||!payload.url||!companion.url)refuse('SCOPE_MISSING','LA source/companion ID or URLs absent');
      parsed=parseLaOfficialResults(payload.bytes,companion.bytes,{context:packet.context,sourceContestId:packet.sourceContestId,votesUrl:payload.url,rosterUrl:companion.url,votesSha256:payload.sha256,rosterSha256:companion.sha256});break;}
  }
  if(packet.sourceContestId!==null&&parsed.sourceContestId!==packet.sourceContestId)refuse('SOURCE_CONTEST_MISMATCH','Actual parsed contest differs from reviewed source contest key');
  if(parsed.totalVotes!==packet.expectedTotals.totalVotes||parsed.options.length!==packet.expectedTotals.optionCount)refuse('EXPECTED_TOTAL_MISMATCH','Actual parsed vote/option counts differ from independently reviewed expected totals');
  const input=bridgeOfficialContest(parsed,{publisher:packet.publisher,retrievedAt,target,reviewedTarget:packet.targetBinding,reviewedContext:packet.context,reviewedBinding:packet.reviewedBinding,rawPayload:payload.bytes,rawCertificates:certificate?.url?[{url:certificate.url,sha256:certificate.sha256,bytes:certificate.bytes}]:[],reviewedCertification:packet.reviewedCertification});
  return {outcome:'Worked',mode:'dry_run_only',manifestSha256:loaded.manifestSha256,files:packet.files.map(file=>({role:file.role,sha256:file.sha256})),targetBinding:target,sourceContext:parsed.context,asOfRaw:parsed.asOfRaw,identifierBasis:parsed.options.map(option=>({sourceLabel:option.name,basis:option.identifierBasis,optionKind:option.optionKind})),publisherMetrics:parsed.publisherMetrics,certificationEvidence:parsed.certificationEvidence,input};
}
