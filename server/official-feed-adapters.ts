/**
 * ET-6 boot registration of lane C's official-feed sources and adapters (contract v1.3).
 *
 * The production bundle has no external singleton to mutate, so registration happens HERE at startup:
 * `registerOfficialFeedAdapters` is called once from registerRoutes before any polling can start. Lane C
 * owns the body of `registerOfficialFeedSources`; lane A owns the hook, the receipt and the status wiring.
 *
 * Rules (contract §3 + C deltas): every source is registered with its exact reviewed tuple (kind, allowed
 * URLs/hosts, real election date/phase or explicit election ids) and every adapter by that source id;
 * nothing here manufactures a publication status or relabels a historical recording as Nov 2026.
 */
import { registerReviewedOfficialResults } from './official-result-bootstrap';
import type { ResultsIngestionService } from './results-ingestion-service';
import type { ResultsSourceRegistry } from './results-source-registry';

export interface OfficialFeedBootReceipt {
  /** source ids registered at boot, in registration order */
  sources: string[];
  /** adapter source ids registered at boot */
  adapters: string[];
  /** adapters registered without a matching source entry or manifest publisher cannot be admitted; surfaced, not hidden */
  adaptersWithoutSource: string[];
  /** set when the registration body threw; the server still boots, polling simply admits nothing from the registry */
  error: string | null;
  bootedAt: string;
}

/**
 * LANE C fills this in (one PR per source family, each with its parser receipts). Keep it a plain function:
 * no network, no fetch, no file reads at boot — only registry/adapter registration.
 */
export function registerOfficialFeedSources(ingestion: ResultsIngestionService, registry: ResultsSourceRegistry): void {
  registerReviewedOfficialResults(ingestion, registry);
}

export type OfficialFeedRegistrationBody = (ingestion: ResultsIngestionService, registry: ResultsSourceRegistry) => void;

export function registerOfficialFeedAdapters(ingestion: ResultsIngestionService, registry: ResultsSourceRegistry, body: OfficialFeedRegistrationBody = registerOfficialFeedSources): OfficialFeedBootReceipt {
  const before = new Set(registry.list().map((s) => s.id));
  const adaptersBefore = new Set(ingestion.getStatus().adapters);
  let error: string | null = null;
  try {
    body(ingestion, registry);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error('[official feeds] boot registration failed; registry-admitted polling is unavailable:', error);
  }
  const sources = registry.list().map((s) => s.id).filter((id) => !before.has(id));
  const adapters = ingestion.getStatus().adapters.filter((id) => !adaptersBefore.has(id));
  const known = new Set(registry.list().map((s) => s.id));
  const adaptersWithoutSource = adapters.filter((id) => !known.has(id));
  const receipt: OfficialFeedBootReceipt = { sources, adapters, adaptersWithoutSource, error, bootedAt: new Date().toISOString() };
  console.log(`[official feeds] boot registration: ${sources.length} source(s), ${adapters.length} adapter(s)${adaptersWithoutSource.length ? `, ${adaptersWithoutSource.length} adapter(s) without a registry entry (manifest publishers only)` : ''}${error ? ', ERROR' : ''}`);
  return receipt;
}
