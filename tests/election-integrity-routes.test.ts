import express from 'express';
import { createServer, type Server } from 'node:http';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerElectionIntegrityRoutes } from '../server/election-integrity-routes';
import { VotingIntentionError, votingIntentionInputSchema } from '../server/voting-intentions';
const getElection = vi.fn(async (id: number) => id === 2 ? { id: 2, state: 'AK' } : null);
const record = vi.fn(async () => ({ created: true, intention: { id: 1, electionId: 2, candidateId: 1, partyPreference: null, confidence: 'medium', createdAt: '2026-10-13T00:00:00.000Z', updatedAt: null } }));
let server: Server, base: string;
beforeAll(async () => {
 const app = express(), router = express.Router(); app.use(express.json());
 registerElectionIntegrityRoutes(router, { getElection, authenticate: (req,res,next) => req.get('x-unit-actor') ? next() : res.status(401).json({code:'unauthenticated'}), actor: req => req.get('x-unit-actor') ?? null, intentions: { record } });
 app.use('/api/elections',router); server=createServer(app); await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve)); const address=server.address(); if(!address||typeof address==='string')throw new Error('HTTP startup failed');base=`http://127.0.0.1:${address.port}`;
});
afterAll(async()=>{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));});
beforeEach(()=>{vi.clearAllMocks();getElection.mockImplementation(async id=>id===2?{id:2,state:'AK'}:null);record.mockResolvedValue({created:true,intention:{id:1,electionId:2,candidateId:1,partyPreference:null,confidence:'medium',createdAt:'2026-10-13T00:00:00.000Z',updatedAt:null}});});
describe('actual HTTP election-integrity route boundary (unit-controlled authentication/store)',()=>{
 it('existing AK race cannot manufacture state lean, intensity, score or request-time publication',async()=>{
  const response=await fetch(base+'/api/elections/2/political-analysis');expect(response.status).toBe(503);const body=await response.json();expect(body).toMatchObject({code:'political_analysis_unavailable',source:null,asOf:null});for(const key of ['leaning','intensity','competitiveness','baseline','lastUpdated'])expect(body).not.toHaveProperty(key);
 });
 it('unknown race is404 and malformed full ID400',async()=>{expect((await fetch(base+'/api/elections/999/political-analysis')).status).toBe(404);expect((await fetch(base+'/api/elections/2.5/political-analysis')).status).toBe(400);});
 it('storage outage never becomes a source-free invented score',async()=>{getElection.mockRejectedValueOnce(new Error('private DB details'));const response=await fetch(base+'/api/elections/2/political-analysis');expect(response.status).toBe(503);expect(await response.json()).toMatchObject({code:'election_store_unavailable'});});
 it('no preference acknowledgement without authenticated storage',async()=>{const response=await fetch(base+'/api/elections/2/voting-intention',{method:'POST',headers:{'content-type':'application/json'},body:'{"candidateId":1}'});expect(response.status).toBe(401);expect(record).not.toHaveBeenCalled();});
 it('cookie-authenticated foreign origin refused before storage',async()=>{const response=await fetch(base+'/api/elections/2/voting-intention',{method:'POST',headers:{'content-type':'application/json','x-unit-actor':'unit-only-subject',origin:'https://foreign.invalid'},body:'{"candidateId":1}'});expect(response.status).toBe(403);expect(record).not.toHaveBeenCalled();});
 it('same-site foreign subdomain fetch metadata refused',async()=>{const response=await fetch(base+'/api/elections/2/voting-intention',{method:'POST',headers:{'content-type':'application/json','x-unit-actor':'unit-only-subject','sec-fetch-site':'same-site'},body:'{"candidateId":1}'});expect(response.status).toBe(403);expect(record).not.toHaveBeenCalled();});
 it('acknowledges only returned committed storage outcome',async()=>{const response=await fetch(base+'/api/elections/2/voting-intention',{method:'POST',headers:{'content-type':'application/json','x-unit-actor':'unit-only-subject'},body:'{"candidateId":1}'});expect(response.status).toBe(201);expect((await response.json()).intention.id).toBe(1);expect(record).toHaveBeenCalledWith(2,'unit-only-subject',{candidateId:1});});
 it('store refusal does not claim success',async()=>{record.mockRejectedValueOnce(new VotingIntentionError(422,'candidate_not_in_election','Foreign race'));const response=await fetch(base+'/api/elections/2/voting-intention',{method:'POST',headers:{'content-type':'application/json','x-unit-actor':'unit-only-subject'},body:'{"candidateId":7}'});expect(response.status).toBe(422);expect(await response.json()).not.toHaveProperty('success');});
 it('input refuses forged actor, projection flags and partial identifiers',()=>{expect(votingIntentionInputSchema.safeParse({candidateId:1,userId:'forged'}).success).toBe(false);expect(votingIntentionInputSchema.safeParse({candidateId:1,isProjectedWinner:true}).success).toBe(false);expect(votingIntentionInputSchema.safeParse({candidateId:'2junk'}).success).toBe(false);});
});
