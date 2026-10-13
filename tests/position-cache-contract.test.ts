import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { cacheService } from '../server/cache-service';
import { PositionAggregatorService } from '../server/position-aggregator-service';
import { candidates } from '../shared/schema';
const source = JSON.parse(readFileSync('tests/fixtures/c38/actual-statement-proof.json','utf8'));
const fixture=vi.hoisted(()=>({select:vi.fn(),candidateRows:[{id:101,name:'OFFLINE source-bound receiver'}],portalRows:[] as unknown[]}));
vi.mock('../server/db',()=>({db:{select:fixture.select}}));
vi.mock('node-fetch',()=>({default:vi.fn(async()=>{throw new Error('External providers forbidden in isolated acceptance')})}));

describe('seconds cache and current verified position source contracts',()=>{
 beforeAll(()=>cacheService.destroy());
 beforeEach(()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T12:00:00Z'));cacheService.destroy();fixture.select.mockReset();
  fixture.candidateRows=[{id:101,name:'OFFLINE source-bound receiver'}];
  fixture.portalRows=[{id:1,candidateId:101,category:'Healthcare',position:source.retainedExactExcerpt,isVerified:true,sourceUrl:source.sourceUrl,lastUpdated:null,createdAt:null}];
  fixture.select.mockImplementation(()=>{
   let identity=false;
   const query={from:(table:unknown)=>{identity=table===candidates;return query},where:()=>query,orderBy:()=>query,limit:async()=>identity?fixture.candidateRows:fixture.portalRows,then:(ok:(rows:unknown)=>unknown,no:(reason:unknown)=>unknown)=>Promise.resolve(fixture.portalRows).then(ok,no)};
   return query;
  });
 });
 afterEach(()=>{cacheService.destroy();vi.useRealTimers()});
 it('preserves the actual generic cache seconds contract without using it as position authority',async()=>{
  await cacheService.set('position-source-ttl-control',source.retainedExactExcerpt,3600);
  vi.setSystemTime(new Date('2026-10-11T12:59:00Z'));
  expect(await cacheService.get('position-source-ttl-control')).toBe(source.retainedExactExcerpt);
  vi.setSystemTime(new Date('2026-10-11T13:00:00.001Z'));
  expect(await cacheService.get('position-source-ttl-control')).toBeNull();
 });
 it('reads current verified subject records on each call instead of retaining hour-old verification claims',async()=>{
  const service=new PositionAggregatorService(),first=await service.aggregatePositionsForCandidate(101);
  expect(first[0].aggregatedPosition).toBe(source.retainedExactExcerpt);expect(first[0].confidence).toBeNull();
  fixture.select.mockClear();
  expect(await service.aggregatePositionsForCandidate(101)).toEqual(first);
  expect(fixture.select).toHaveBeenCalledTimes(2);
  expect(await cacheService.get('positions-101')).toBeNull();
 });
 it('a previous empty lookup does not hide newly recorded verified source text',async()=>{
  const verified=fixture.portalRows;fixture.portalRows=[];const service=new PositionAggregatorService();
  expect(await service.aggregatePositionsForCandidate(101)).toEqual([]);
  fixture.portalRows=verified;
  expect((await service.aggregatePositionsForCandidate(101))[0].aggregatedPosition).toBe(source.retainedExactExcerpt);
 });
 it('unknown candidate remains a typed not-found rather than cached empty success',async()=>{
  fixture.candidateRows=[];
  await expect(new PositionAggregatorService().aggregatePositionsForCandidate(101)).rejects.toMatchObject({code:'CANDIDATE_NOT_FOUND',message:'Candidate not found'});
  expect(await cacheService.get('positions-101')).toBeNull();
 });
 it('malformed legacy cached content is never trusted over actual source rows',async()=>{
  await cacheService.set('positions-101',{incorrect:'untrusted legacy shape'},3600);
  expect((await new PositionAggregatorService().aggregatePositionsForCandidate(101))[0].positions[0].sourcePositionId).toBe(1);
  expect(fixture.select).toHaveBeenCalledTimes(2);
 });
 it('foreign-subject cached positions never become another candidate position',async()=>{
  const old=await new PositionAggregatorService().aggregatePositionsForCandidate(101);
  await cacheService.set('positions-202',old,3600);
  fixture.candidateRows=[{id:202,name:'OFFLINE different receiver'}];
  // No verified source record belongs to202; row101 cannot be rebound by cache.
  expect(await new PositionAggregatorService().aggregatePositionsForCandidate(202)).toEqual([]);
 });
});
