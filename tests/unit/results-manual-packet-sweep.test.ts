import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseOfficialSourcePacket, loadReviewedPacketBytes } from '../../server/official-result-adapters/packet';
import { MemResultReportStore } from '../../server/results-store';
import { resultsSourceRegistry } from '../../server/results-source-registry';

beforeEach(() => resultsSourceRegistry.clear());
async function packet(relative: string) {
  const path = resolve('artifacts/source-packet', relative);
  const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
  const loaded = loadReviewedPacketBytes(path, sha), target = loaded.packet.targetBinding;
  const input = (await parseOfficialSourcePacket(path, sha, target)).input;
  const store = new MemResultReportStore(id => id === target.id, () => false, () => [target.id], () => target.date,
    () => ({ state: target.state, electionDate: target.date, type: target.type, level: target.level, office: target.title }),
    () => [{ election_id: target.id, state: target.state, publisher: target.state + ' Secretary of State', route_type: 'government_gateway',
      government_url: target.state === 'LA' ? 'https://www.sos.la.gov/elections-voting/election-results-statistics' : 'https://www.sos.wa.gov/vi/node/151' }]);
  await store.storeResultEvidence(loaded.files.find(file => file.role === 'payload')!.bytes, 'application/json', null, 'test:retained');
  return { loaded, target, input, store };
}
const ctx = { postedBy: 'test:packet-sweep', idempotencyKey: null };
describe('supported real packet host sweep', () => {
  it('accepts actual LA runoff packet with manifest-only shape after exact portal delegation review', async () => {
    const p = await packet('la-manual/packet.json');
    expect(p.input.source.id).toBe('admin_manual:LA');
    expect(p.input.totalVotes).toBe(196212);
    const first = await p.store.recordResultReport(p.target.id, p.input, ctx);
    expect(first.created).toBe(true);
    expect(first.payload.totalVotes).toBe(196212);
    expect(first.payload.candidates).toHaveLength(2);
    expect(first.payload.source?.url).toBe(p.input.source.url);
    const repeat = await p.store.recordResultReport(p.target.id, p.input, ctx);
    expect(repeat.created).toBe(false);
    expect(repeat.payload.revision).toBe(first.payload.revision);
  });
  it('keeps existing LA live-registered host admission working for the actual manual packet', async () => {
    const p = await packet('la-manual/packet.json');
    resultsSourceRegistry.register({ id: 'la-reviewed-test-live', state: 'LA', name: 'Louisiana Secretary of State', kind: 'official_state_enr',
      allowedUrls: [p.input.source.url], electionDate: '2026-11-03', phase: 'primary', electionIds: [429] });
    expect((await p.store.recordResultReport(p.target.id, p.input, ctx)).created).toBe(true);
  });
  it.each(['https://sub.voterportal.sos.la.gov/results', 'https://voterportal.sos.la.gov.evil.example/results',
    'https://voterportal.sos.la.gov:444/results', 'https://er.ncsbe.gov/results'])('refuses LA adjacent or foreign-state host %s', async url => {
    const p = await packet('la-manual/packet.json');
    await expect(p.store.recordResultReport(p.target.id, { ...p.input, source: { ...p.input.source, url } }, ctx))
      .rejects.toMatchObject({ status: 422, publicCode: 'unknown_source' });
  });
  it('refuses a foreign manual source ID on the actual LA race', async () => {
    const p = await packet('la-manual/packet.json');
    await expect(p.store.recordResultReport(p.target.id, { ...p.input, source: { ...p.input.source, id: 'admin_manual:NC' } }, ctx))
      .rejects.toMatchObject({ status: 422, publicCode: 'unknown_source' });
  });
  it.each(['wa/initial.packet.json', 'wa/recount.packet.json', 'wa-senate/packet.json', 'ca/packet.json'])('preserves actual registered source path %s', async relative => {
    const p = await packet(relative);
    const kind = p.input.source.kind;
    if (kind !== 'official_state_page') throw new Error('Unexpected retained source kind');
    resultsSourceRegistry.register({ id: p.input.source.id, state: p.target.state, name: p.input.source.name, kind,
      allowedUrls: [p.input.source.url], electionDate: p.target.date, phase: p.target.type, electionIds: [p.target.id] });
    const result = await p.store.recordResultReport(p.target.id, p.input, ctx);
    expect(result.payload.totalVotes).toBe(p.loaded.packet.expectedTotals.totalVotes);
    expect(result.payload.source?.url).toBe(p.input.source.url);
  });
});
