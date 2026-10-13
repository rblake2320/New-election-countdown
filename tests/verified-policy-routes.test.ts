import { createServer, type Server } from 'node:http';
import express from 'express';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../server/db', () => ({ db: {} }));
import { registerVerifiedPolicyRoutes } from '../server/verified-policy-routes';
import { CandidatePositionUnavailableError } from '../server/candidate-position-api';
import { VerifiedPolicyComparisonError, verifiedComparisonInputs } from '../server/verified-policy-comparison';

const positions = vi.fn(async (_id: number) => []);
const compare = vi.fn(async (ids: unknown, categories: unknown) => verifiedComparisonInputs(ids, categories).categories.map(category => ({ category, positions: [] })));
let server: Server, base: string;
beforeAll(async () => {
  const app = express(); registerVerifiedPolicyRoutes(app, { positions, compare }); server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('HTTP listener failed');
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
beforeEach(() => { vi.clearAllMocks(); positions.mockImplementation(async () => []); compare.mockImplementation(async (ids, categories) => verifiedComparisonInputs(ids, categories).categories.map(category => ({ category, positions: [] }))); });

describe('actual HTTP verified-source policy route boundary (controlled unit store)', () => {
  it.each(['2.5', '2junk', '0', '-1', '2147483648'])('refuses incomplete/out-of-range id %s before a source read', async id => {
    const res = await fetch(base + `/api/candidates/${id}/positions`); expect(res.status).toBe(400); expect(positions).not.toHaveBeenCalled();
  });
  it('local records are readable without any external provider key, preserving truthful empty state', async () => {
    const res = await fetch(base + '/api/candidates/2/positions'); expect(res.status).toBe(200); expect(await res.json()).toEqual([]); expect(positions).toHaveBeenCalledWith(2);
  });
  it('DB errors are unavailable, never successful empty or raw private errors', async () => {
    positions.mockRejectedValueOnce(new Error('private database details'));
    const res = await fetch(base + '/api/candidates/2/positions'); expect(res.status).toBe(503); expect(await res.json()).toEqual({ code: 'POSITION_SOURCE_UNAVAILABLE', error: 'Verified candidate position records are unavailable' });
  });
  it('invalid recorded source remains a typed refusal', async () => {
    positions.mockRejectedValueOnce(new CandidatePositionUnavailableError('INVALID_POSITION_SOURCE', 'Recorded source invalid'));
    const res = await fetch(base + '/api/candidates/2/positions'); expect(res.status).toBe(422); expect((await res.json()).code).toBe('INVALID_POSITION_SOURCE');
  });
  it('comparison uses strict subject/category validation and no manufactured statements', async () => {
    const res = await fetch(base + '/api/civic/compare?candidateIds=1,2&policyCategories=healthcare'); expect(res.status).toBe(200); expect(await res.json()).toEqual([{ category: 'healthcare', positions: [] }]);
    const malformed = await fetch(base + '/api/civic/compare?candidateIds=1.5&policyCategories=healthcare'); expect(malformed.status).toBe(400);
  });
  it('missing scope and missing subject are typed, not a raw 500', async () => {
    expect((await fetch(base + '/api/civic/compare')).status).toBe(400);
    compare.mockRejectedValueOnce(new VerifiedPolicyComparisonError('CANDIDATE_NOT_FOUND', 404, 'Candidate not found'));
    const res = await fetch(base + '/api/civic/compare?candidateIds=2&policyCategories=healthcare'); expect(res.status).toBe(404);
  });
});
