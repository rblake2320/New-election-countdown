import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(readFileSync('tests/fixtures/c38/actual-statement-proof.json', 'utf8'));
const mocks = vi.hoisted(() => ({ outage: false, cached: null as unknown, rows: [] as unknown[], select: vi.fn(), cacheGet: vi.fn(), cacheSet: vi.fn() }));
vi.mock('../../server/db', () => ({ db: { select: mocks.select } }));
vi.mock('../../server/cache-service', () => ({ cacheService: { get: mocks.cacheGet, set: mocks.cacheSet } }));
import { candidates } from '../../shared/schema';
import { PositionAggregatorService } from '../../server/position-aggregator-service';
beforeEach(() => {
 vi.clearAllMocks(); mocks.outage=false; mocks.rows=[]; mocks.cached=null;
 mocks.cacheGet.mockImplementation(async()=>mocks.cached);
 mocks.select.mockImplementation(() => {
  if(mocks.outage)throw new Error('isolated DB unavailable');
  let candidateQuery=false;
  const q={from:vi.fn(),where:vi.fn(),orderBy:vi.fn(),limit:vi.fn(),then:(ok: (value:unknown)=>unknown,no:(reason:unknown)=>unknown)=>Promise.resolve(mocks.rows).then(ok,no)};
  q.from.mockImplementation(table=>{candidateQuery=table===candidates;return q});q.where.mockReturnValue(q);q.orderBy.mockReturnValue(q);
  q.limit.mockImplementation(()=>Promise.resolve(candidateQuery?[{id:1,name:'Source-bound receiver fixture'}]:mocks.rows));
  return q;
 });
});
describe('position aggregator actual-source contract', () => {
 it('preserves exact verified-row words but does not assign95percentconfidence or currentdate',async()=>{
  mocks.rows=[{id:1,candidateId:1,category:'Healthcare',position:fixture.retainedExactExcerpt,isVerified:true,sourceUrl:fixture.sourceUrl,lastUpdated:null,createdAt:null}];
  // Old private getter is the exact receiving producer; new aggregate path
  // uses the canonical verified-row reader. No actual portal row is claimed.
  const service=new PositionAggregatorService();
  const getter=Reflect.get(service,'getCandidatePortalPosition');
  const actual=typeof getter==='function'?await Reflect.apply(getter,service,[1,'Healthcare']):(await service.aggregatePositionsForCandidate(1))[0].positions[0];
  expect(actual.position).toBe(fixture.retainedExactExcerpt);
  expect(actual.confidence).toBeNull();
  expect(actual.dateRecorded).toBeNull();
 });
 it('does not turn successful empty rows into an aggregate position',async()=>{
  expect(await new PositionAggregatorService().aggregatePositionsForCandidate(1)).toEqual([]);
 });
 it('separates source outage from successful empty data',async()=>{
  mocks.outage=true;
  await expect(new PositionAggregatorService().aggregatePositionsForCandidate(1)).rejects.toMatchObject({code:'POSITION_SOURCE_UNAVAILABLE'});
 });
 it('refuses unsupported saving before pretending aggregation was persisted',async()=>{
  await expect(new PositionAggregatorService().updateCandidatePositions(1)).rejects.toMatchObject({code:'AGGREGATED_POSITION_WRITER_UNAVAILABLE'});
 });
 it('does not turn an absent source date into an observed current date',async()=>{
  mocks.rows=[{id:1,candidateId:1,category:'Healthcare',position:fixture.retainedExactExcerpt,isVerified:true,sourceUrl:fixture.sourceUrl,lastUpdated:null,createdAt:null}];
  const actual=(await new PositionAggregatorService().aggregatePositionsForCandidate(1))[0];
  expect(actual.positions[0].dateRecorded).toBeNull();
  expect(actual.confidence).toBeNull();
  expect(actual.aggregatedPosition).toBe(fixture.retainedExactExcerpt);
 });
 it('ignores stale cache evidence after the verified statement is revoked',async()=>{
  mocks.cached=[{candidateId:1,candidateName:'Source-bound receiver fixture',category:'Healthcare',confidence:1,aggregatedPosition:fixture.retainedExactExcerpt,positions:[{source:'candidate_upload',confidence:0.95,position:fixture.retainedExactExcerpt,dateRecorded:new Date()}]}];
  expect(await new PositionAggregatorService().aggregatePositionsForCandidate(1)).toEqual([]);
  expect(mocks.cacheGet).not.toHaveBeenCalled();
 });
 it('makes unconfigured external adapters explicit and does not claim a zero result',()=>{
  expect(new PositionAggregatorService().getSourceAvailability().votingRecord).toEqual({status:'unavailable',code:'ADAPTER_NOT_CONFIGURED'});
 });
 it.each([NaN,0,-1,1.5])('rejects bad subject %s before querying',async id=>{
  await expect(new PositionAggregatorService().aggregatePositionsForCandidate(id)).rejects.toMatchObject({code:'INVALID_CANDIDATE_ID'});
  expect(mocks.select).not.toHaveBeenCalled();
 });

});
