import { describe, it, expect, vi } from 'vitest';

vi.mock('../../server/storage', () => ({ storage: { getElections: vi.fn(async () => []) } }));

import { ResultsIngestionService } from '../../server/results-ingestion-service';
import { ResultsSourceRegistry } from '../../server/results-source-registry';
import { registerOfficialFeedAdapters, registerOfficialFeedSources } from '../../server/official-feed-adapters';

describe('ET-6 boot registration hook for lane C sources/adapters', () => {
  it('the shipped body registers22 reviewed sources/adapters and reports them', () => {
    const receipt = registerOfficialFeedAdapters(new ResultsIngestionService(), new ResultsSourceRegistry(), registerOfficialFeedSources);
    expect(receipt.sources).toHaveLength(22);expect(receipt.adapters).toHaveLength(22);expect(receipt).toMatchObject({ adaptersWithoutSource: [], error: null });
  });

  it('reports exactly what the boot body registered and flags adapters without a registry entry', () => {
    const svc = new ResultsIngestionService();
    const reg = new ResultsSourceRegistry();
    const receipt = registerOfficialFeedAdapters(svc, reg, (ingestion, registry) => {
      registry.register({ id: 'wa-sos-2024p', kind: 'official_state_page', name: 'WA SOS', state: 'WA', allowedHosts: ['www.sos.wa.gov'], electionDate: '2024-08-06', phase: 'primary' });
      ingestion.registerAdapter('wa-sos-2024p', async () => null);
      ingestion.registerAdapter('nc-sbe', async () => null); // manifest publisher only, no registry entry
    });
    expect(receipt).toMatchObject({ sources: ['wa-sos-2024p'], adapters: ['wa-sos-2024p', 'nc-sbe'], adaptersWithoutSource: ['nc-sbe'], error: null });
    expect(svc.getStatus().adapters).toEqual(['wa-sos-2024p', 'nc-sbe']);
    expect(reg.list().map((s) => s.id)).toEqual(['wa-sos-2024p']);
  });

  it('survives a throwing body: the server still boots and the error is in the receipt', () => {
    const failed = registerOfficialFeedAdapters(new ResultsIngestionService(), new ResultsSourceRegistry(), () => { throw new Error('bad tuple'); });
    expect(failed).toMatchObject({ sources: [], adapters: [], error: 'bad tuple' });
  });
});
