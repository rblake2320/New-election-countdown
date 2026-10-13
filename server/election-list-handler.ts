import type { RequestHandler, Response } from 'express';
import type { ElectionListing, ElectionQueryFilters } from './election-list-filters';
import { ElectionFilterError, electionCalendarDay, normalizeElectionFilters } from './election-list-filters';

export function electionListHandler(storage: { getElectionsStrict(filters: ElectionQueryFilters): Promise<ElectionListing[]> }, clock = () => new Date()): RequestHandler {
  return async (req, res) => {
    try {
      const minDate = electionCalendarDay(clock());
      minDate.setUTCDate(minDate.getUTCDate() - 30);
      const filters = { ...req.query, minDate } as ElectionQueryFilters;
      normalizeElectionFilters(filters, clock());
      const result = await storage.getElectionsStrict(filters);
      res.json(result);
    } catch (error) {
      if (error instanceof ElectionFilterError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Election listing unavailable:', error instanceof Error ? error.message : 'unknown error');
        sendElectionListingUnavailable(res);
      }
    }
  };
}

/** A storage failure is never a successful empty election listing. */
export function sendElectionListingUnavailable(res: Response): void {
  res.status(503).json({ error: 'Election listing temporarily unavailable', code: 'listing_unavailable' });
}
