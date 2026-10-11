import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FeaturedElectionCards } from '../client/src/components/featured-election-cards';
import type { Election } from '../shared/schema';
vi.mock('@/components/election-card', () => ({ ElectionCard: ({ election }: { election: Election }) => <span>actual-featured-race-{election.id}</span> }));
describe('actual Featured component election-night membership', () => {
  afterEach(() => vi.useRealTimers());
  it('removes New York at local midnight while retaining Hawaii, without refetching', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T04:59:30Z'));
    render(<FeaturedElectionCards elections={[
      { id: 1, date: new Date('2026-11-03T00:00:00Z'), timezone: 'America/New_York' },
      { id: 2, date: new Date('2026-11-03T00:00:00Z'), timezone: 'Pacific/Honolulu' },
    ] as Election[]} />);
    expect(screen.queryByText('actual-featured-race-1')).not.toBeNull();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.queryByText('actual-featured-race-1')).toBeNull();
    expect(screen.queryByText('actual-featured-race-2')).not.toBeNull();
  });
});
