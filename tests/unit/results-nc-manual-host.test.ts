import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { parseOfficialSourcePacket, loadReviewedPacketBytes } from '../../server/official-result-adapters/packet';
import { MemResultReportStore } from '../../server/results-store';
import { resultsSourceRegistry } from '../../server/results-source-registry';
import type { ResultReportInput } from '../../server/results-reports';

const path = resolve('artifacts/source-packet/nc-manual/packet.json');
const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
const loaded = loadReviewedPacketBytes(path, sha);
const target = loaded.packet.targetBinding;
const context = { state: target.state, electionDate: target.date, type: target.type, level: target.level, office: target.title };
const bytes = loaded.files.find(file => file.role === 'payload')!.bytes;
let input: ResultReportInput;
function store(state = 'NC') {
  return new MemResultReportStore(id => id === target.id, () => false, () => [target.id], () => target.date,
    () => ({ ...context, state }), () => [{ election_id: target.id, state, publisher: 'North Carolina State Board of Elections',
      route_type: 'government_gateway', government_url: 'https://www.ncsbe.gov/results-data/election-results', status: 'unknown' }]);
}
async function retained(state = 'NC') {
  const s = store(state);
  expect(await s.storeResultEvidence(bytes, 'text/csv', 'NC-primary-results.txt', 'test:retained')).toMatchObject({
    sha256: 'a1adde2cbace4018e482d7fdc12297dac32595e7e2a175e0f6fcf87c05e3154c', size: 82579,
  });
  return s;
}
const writer = { postedBy: 'test:actual-nc-packet', idempotencyKey: null };
beforeAll(async () => { input = (await parseOfficialSourcePacket(path, sha, target)).input; });
beforeEach(() => resultsSourceRegistry.clear());
describe('actual NC manual packet: delegated official host at writer boundary', () => {
  it('records the unchanged retained six-option 827755-vote packet and repeats without a new revision', async () => {
    expect(input.source.id).toBe('admin_manual:NC');
    expect(input.source.url).toBe('https://er.ncsbe.gov/enr/20260303/data/results_0.txt');
    expect(input.totalVotes).toBe(827755);
    expect(input.candidates).toHaveLength(6);
    const s = await retained();
    const first = await s.recordResultReport(target.id, input, writer);
    expect(first.created).toBe(true);
    expect(first.payload.totalVotes).toBe(input.totalVotes);
    expect(first.payload.source?.url).toBe(input.source.url);
    expect(first.payload.candidates.reduce((sum, candidate) => sum + candidate.votes, 0)).toBe(input.totalVotes);
    const repeat = await s.recordResultReport(target.id, input, writer);
    expect(repeat.created).toBe(false);
    expect(repeat.payload.revision).toBe(first.payload.revision);
  });
  it.each(['https://other.ncsbe.gov/enr/20260303/data/results_0.txt', 'https://er.ncsbe.gov.evil.example/results',
    'https://sub.er.ncsbe.gov/results', 'https://er.ncsbe.gov:444/results'])('refuses adjacent or different-port host %s', async url => {
    await expect((await retained()).recordResultReport(target.id, { ...input, source: { ...input.source, url } }, writer))
      .rejects.toMatchObject({ status: 422, publicCode: 'unknown_source' });
  });
  it('refuses wrong manual state ID against the NC race', async () => {
    await expect((await retained()).recordResultReport(target.id, { ...input, source: { ...input.source, id: 'admin_manual:SC' } }, writer))
      .rejects.toMatchObject({ status: 422, publicCode: 'unknown_source' });
  });
  it('does not admit the delegated NC host to another state', async () => {
    await expect((await retained('SC')).recordResultReport(target.id, { ...input, source: { ...input.source, id: 'admin_manual:SC' } }, writer))
      .rejects.toMatchObject({ status: 422, publicCode: 'unknown_source' });
  });
  it('still requires actual retained evidence', async () => {
    await expect(store().recordResultReport(target.id, input, writer))
      .rejects.toMatchObject({ status: 422, publicCode: 'evidence_missing' });
  });
  it('still refuses an adapter whose expected race context changed', async () => {
    await expect((await retained()).recordResultReport(target.id, input, { ...writer, expectedContext: { ...context, electionDate: '2026-11-03' } }))
      .rejects.toMatchObject({ status: 409, publicCode: 'election_context_changed' });
  });
});
