import { createHash } from 'node:crypto';
import { z } from 'zod';
import { httpsResultsUrl, resultsTimestamp } from '../../shared/official-results';
import { liveResultReportInputSchema, type LiveResultReportInput } from '../../shared/live-election-results';
import { officialContestContextSchema, parsedOfficialContestSchema, requireContext, OfficialResultParseError, type OfficialContestContext } from './types';

const text=z.string().trim().min(1).max(512),token=text.max(256);
export const officialTargetBindingSchema=z.object({id:z.number().int().positive().safe(),state:z.string().regex(/^[A-Z]{2}$/),date:officialContestContextSchema.shape.electionDate,type:token,level:token,title:text}).strict();
export const reviewedPublisherSchema=z.object({id:token,kind:z.enum(['official_state_enr','official_state_page','official_county']),name:text,url:httpsResultsUrl}).strict();
export type OfficialTargetBinding=z.infer<typeof officialTargetBindingSchema>;
export type ReviewedPublisher=z.infer<typeof reviewedPublisherSchema>;
export interface OfficialBridgeInput {
  publisher:ReviewedPublisher;retrievedAt:string;target:OfficialTargetBinding;reviewedTarget:OfficialTargetBinding;
  reviewedContext:OfficialContestContext;rawPayload:Uint8Array;
  rawCertificates:{url:string;bytes:Uint8Array}[];
  reviewedCertification?:boolean;expectedRevision?:string|null;supersedesReportId?:number|null;
}
function refuse(code:string,message:string):never{throw new OfficialResultParseError(code,message);}
function hash(bytes:Uint8Array):string{return createHash('sha256').update(bytes).digest('hex');}

/** Pure bridge: no clock, network, database or candidate identity inference. */
export function bridgeOfficialContest(parsedInput:unknown,input:OfficialBridgeInput):LiveResultReportInput{
  const parsed=parsedOfficialContestSchema.parse(parsedInput),publisher=reviewedPublisherSchema.parse(input.publisher);
  const target=officialTargetBindingSchema.parse(input.target),reviewed=officialTargetBindingSchema.parse(input.reviewedTarget);
  requireContext(parsed.context,officialContestContextSchema.parse(input.reviewedContext));
  for(const key of ['id','state','date','type','level','title'] as const)if(target[key]!==reviewed[key])refuse('TARGET_MISMATCH',`Authoritative target ${key} differs from reviewed binding`);
  if(target.state!==parsed.context.state||target.date!==parsed.context.electionDate||target.level!==parsed.context.level)refuse('TARGET_CONTEXT_MISMATCH','Target state/date/level differs from actual source context');
  const phaseTypes:Record<OfficialContestContext['phase'],string[]>= {general:['General'],primary:['Primary'],runoff:['Runoff'],primary_runoff:['Primary Runoff','PrimaryRunoff'],other:['Other','Special']};
  if(!phaseTypes[parsed.context.phase].includes(target.type))refuse('TARGET_CONTEXT_MISMATCH','Target type differs from reviewed source phase');
  if(hash(input.rawPayload)!==parsed.sourcePayloadSha256)refuse('PAYLOAD_HASH_MISMATCH','Parsed result does not bind actual raw payload bytes');
  const retrievedAt=resultsTimestamp.parse(input.retrievedAt);
  let certification:LiveResultReportInput['certification']=null;
  if(input.reviewedCertification===true){
    if(parsed.certificationEvidence.length===0)refuse('CERTIFICATION_MISSING','Reviewed certification requires actual parser proof');
    for(const proof of parsed.certificationEvidence){
      requireContext(proof.context,parsed.context);
      const raw=input.rawCertificates.filter(item=>item.url===proof.url&&hash(item.bytes)===proof.sha256);
      if(raw.length!==1)refuse('CERTIFICATION_HASH_MISMATCH','Exact contest certification bytes are missing or ambiguous');
    }
    const proof=parsed.certificationEvidence[0];if(!proof)refuse('CERTIFICATION_MISSING','No exact contest proof');
    certification={url:proof.url,certifiedAt:proof.certifiedAt};
  }
  const status=certification===null?'unofficial':'certified';
  const candidates=parsed.options.map(option=>({candidateId:null,sourceCandidateId:option.identifierBasis==='publisher_id'?option.sourceCandidateId??refuse('IDENTIFIER_MISSING','Publisher option identifier absent'):option.name,
    name:option.name,party:option.party,votes:option.votes,percent:option.percent,isWinner:false}));
  const basisNote='Identifiers are exact publisher IDs when provided, otherwise exact source printed labels scoped to the source contest; all candidateId null; no winners inferred.';
  const certificateNote=certification?` Certification raw SHA256: ${parsed.certificationEvidence.map(proof=>proof.sha256).join(',')}.`:'';
  const body={schemaVersion:1,electionId:target.id,status,reporting:parsed.reporting,
    source:{...publisher,sourceContestId:parsed.sourceContestId},sourcePayloadSha256:parsed.sourcePayloadSha256,
    asOf:parsed.asOf,asOfBasis:parsed.asOfBasis,retrievedAt,totalVotes:parsed.totalVotes,candidates,winnerCalledBy:null,certification,
    supersedesReportId:input.supersedesReportId??null,expectedRevision:input.expectedRevision??null,note:basisNote+certificateNote};
  const identity=hash(Buffer.from(JSON.stringify(body)));
  return liveResultReportInputSchema.parse({...body,idempotencyKey:`sourcepacket:${identity}`});
}
