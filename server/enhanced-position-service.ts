import { candidatePositionAPI, CandidatePositionUnavailableError, type PositionData } from './candidate-position-api';

export interface EnhancedPosition extends Omit<PositionData, 'sources'> {
  sources: Array<Omit<PositionData['sources'][number], 'type'> & { type: 'candidate_portal' }>;
}
const providerAvailability = Object.freeze({
  votingRecord: { status: 'unavailable', code: 'PROVIDER_NOT_CONFIGURED' },
  legislativeSponsorship: { status: 'unavailable', code: 'PROVIDER_NOT_CONFIGURED' },
  officialStatements: { status: 'unavailable', code: 'PROVIDER_NOT_CONFIGURED' },
});

/** The canonical verified-row reader supplies the position text. Unsupported
 * voting/statement providers cannot synthesize votes, confidence or quotes. */
export class EnhancedPositionService {
  async getEnhancedPositions(candidateId: number): Promise<EnhancedPosition[]> {
    return (await candidatePositionAPI.getPositionsForCandidate(candidateId)).map(position => ({
      ...position, sources: position.sources.map(source => ({ ...source, type: 'candidate_portal' as const })),
    }));
  }
  async enrichCandidateWithPositions<T extends { id: number }>(candidate: T) {
    try {
      const positions = await this.getEnhancedPositions(candidate.id);
      const dates = positions.flatMap(position => position.sources.flatMap(source => source.date === null ? [] : [source.date]));
      return { ...candidate, enhancedPositions: positions, positionSummary: {
        totalCategories: positions.length, averageConfidence: null,
        dataQuality: positions.length ? 'verified_candidate_supplied' : 'not_recorded',
        lastUpdated: dates.length ? new Date(Math.max(...dates.map(date => date.getTime()))) : null,
        sourceAvailability: { ...providerAvailability, candidatePortal: { status: positions.length ? 'available' : 'not_recorded', code: null } },
      } };
    } catch (error) {
      if (!(error instanceof CandidatePositionUnavailableError)) throw error;
      return { ...candidate, enhancedPositions: [], positionSummary: {
        totalCategories: null, averageConfidence: null, dataQuality: 'unavailable', lastUpdated: null,
        sourceAvailability: { ...providerAvailability, candidatePortal: { status: 'unavailable', code: error.code } },
      } };
    }
  }
}
export const enhancedPositionService = new EnhancedPositionService();
