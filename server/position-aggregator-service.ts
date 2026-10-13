import { db } from './db';
import { candidates, type Candidate } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { candidatePositionAPI, CandidatePositionUnavailableError } from './candidate-position-api';

export interface PositionSource {
  source: 'candidate_upload'; sourcePositionId: number; confidence: null;
  position: string; dateRecorded: Date | null; url: string | null;
}
export interface CandidatePosition {
  candidateId: number; candidateName: string; category: string;
  positions: PositionSource[]; aggregatedPosition: string; confidence: null;
}
export class PositionAggregationUnavailableError extends Error {
  constructor(public readonly code: 'AGGREGATED_POSITION_WRITER_UNAVAILABLE' | 'CANDIDATE_NOT_FOUND' = 'AGGREGATED_POSITION_WRITER_UNAVAILABLE', message = 'Aggregated position persistence is not configured; verified source records are read without a synthetic writer') {
    super(message); this.name = 'PositionAggregationUnavailableError';
  }
}

/** Present source records, not estimated policy/voting positions. The source
 * reader checks the current verified subject binding on each call, so a stale
 * cache cannot retain a revoked statement or old fabricated confidence. */
export class PositionAggregatorService {
  async aggregatePositionsForCandidate(candidateId: number): Promise<CandidatePosition[]> {
    if (!Number.isSafeInteger(candidateId) || candidateId < 1) throw new CandidatePositionUnavailableError('INVALID_CANDIDATE_ID', 'A positive candidate identifier is required');
    let candidate: Candidate | undefined;
    try {
      const rows = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
      candidate = rows[0];
    } catch {
      throw new CandidatePositionUnavailableError('POSITION_SOURCE_UNAVAILABLE', 'Candidate identity records are unavailable');
    }
    if (!candidate) throw new PositionAggregationUnavailableError('CANDIDATE_NOT_FOUND', 'Candidate not found');
    if (candidate.id !== candidateId || typeof candidate.name !== 'string' || !candidate.name.trim()) throw new CandidatePositionUnavailableError('INVALID_POSITION_SOURCE', 'Candidate identity is not bound to the requested position subject');
    const positions = await candidatePositionAPI.getPositionsForCandidate(candidateId);
    return positions.map(position => ({
      candidateId, candidateName: candidate.name, category: position.category,
      // This is the exact stored text; there is no synthesis or source bonus.
      aggregatedPosition: position.position, confidence: null,
      positions: position.sources.map(source => ({
        source: 'candidate_upload', sourcePositionId: source.sourcePositionId,
        confidence: null, position: source.description,
        dateRecorded: source.date, url: source.url,
      })),
    }));
  }
  getSourceAvailability() {
    return {
      votingRecord: { status: 'unavailable', code: 'ADAPTER_NOT_CONFIGURED' },
      propublica: { status: 'unavailable', code: 'ADAPTER_NOT_CONFIGURED' },
      fundingAnalysis: { status: 'unavailable', code: 'ADAPTER_NOT_CONFIGURED' },
      officialWebsite: { status: 'unavailable', code: 'ADAPTER_NOT_CONFIGURED' },
      ballotpedia: { status: 'unavailable', code: 'ADAPTER_NOT_CONFIGURED' },
      newsAnalysis: { status: 'unavailable', code: 'ADAPTER_NOT_CONFIGURED' },
    };
  }
  async updateCandidatePositions(_candidateId: number): Promise<never> {
    // The old saveAggregatedPosition implementation performed no write.
    // Refuse before reading data rather than reporting successful persistence.
    throw new PositionAggregationUnavailableError();
  }
}
export const positionAggregatorService = new PositionAggregatorService();
