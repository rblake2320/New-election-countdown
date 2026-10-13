import { storage } from './storage';
import type { Election } from '@shared/schema';

export class MichiganCandidateSourceUnavailableError extends Error {
  constructor(public readonly code: 'LEGACY_MICHIGAN_SOURCE_UNVERIFIED' | 'MICHIGAN_CATALOG_UNAVAILABLE', message: string) {
    super(message); this.name = 'MichiganCandidateSourceUnavailableError';
  }
}
export class MichiganCandidateService {
  async findMichiganPrimaryElection(now: Date = new Date()): Promise<Election | null> {
    if (!Number.isFinite(now.getTime())) throw new RangeError('A valid lookup time is required');
    const end = now.getTime() + 20 * 86400000;
    try {
      const elections = await storage.getElections();
      return elections.filter(election => {
        const state = typeof election.state === 'string' ? election.state.trim().toLowerCase() : '';
        const date = new Date(election.date).getTime();
        return (state === 'mi' || state === 'michigan') && election.type === 'primary' && Number.isFinite(date) && date >= now.getTime() && date <= end;
      }).sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())[0] ?? null;
    } catch {
      throw new MichiganCandidateSourceUnavailableError('MICHIGAN_CATALOG_UNAVAILABLE', 'Michigan election catalog is unavailable');
    }
  }
  /** The old method mixed unverified hardcoded 2024 names and FEC filings,
   * then marked them verified for any supplied race. This unsupported writer
   * is refused before file, network or DB access. An OpenFEC key is not ballot
   * authority. Use the separately reviewed source-bound nominee import CLI. */
  async fetchMichiganCandidates(_electionId: number): Promise<never> {
    throw new MichiganCandidateSourceUnavailableError('LEGACY_MICHIGAN_SOURCE_UNVERIFIED', 'Legacy Michigan candidate import has no reviewed date/office/ballot source. Use scripts/refresh_general_candidates.ts with its reviewed manifest and dry-run safeguards.');
  }
}
export const michiganCandidateService = new MichiganCandidateService();
