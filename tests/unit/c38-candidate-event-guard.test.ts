import { beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({processEvent:vi.fn()}));
vi.mock('../../server/services/alert-engine-service',()=>({alertEngineService:{processEvent:state.processEvent}}));
import {EventProcessorService} from '../../server/services/event-processor-service';
const election={id:1,title:'Isolated candidate-event receiving context',date:new Date('2026-11-03T00:00:00Z'),type:'general',level:'state',state:'CA'};
const event={candidateId:7,electionId:1,eventType:'position_change' as const,updateType:'minor' as const,importance:1,verified:true};
beforeEach(()=>vi.clearAllMocks());
describe('C38 actual candidate-to-election receiving guard',()=>{
 it.each([999,null,undefined])('refuses stored candidate election binding %s before alert or filter queue mutation',async electionId=>{
  const service=new EventProcessorService();
  await expect(service.processCandidateEvent({id:7,name:'Isolated subject',party:'I',electionId} as never,election as never,event)).rejects.toMatchObject({code:'INVALID_EVENT_CONTEXT'});
  expect(state.processEvent).not.toHaveBeenCalled();
  expect(service.getProcessingStats().queueSize).toBe(0);
 });
 it('same actual candidate/election/event binding reaches alert boundary once',async()=>{
  const service=new EventProcessorService();
  await service.processCandidateEvent({id:7,name:'Isolated subject',party:'I',electionId:1} as never,election as never,event);
  expect(state.processEvent).toHaveBeenCalledTimes(1);
  expect(state.processEvent.mock.calls[0][1]).toMatchObject({candidateId:7,electionId:1,electionDate:election.date});
 });
});
