import { ElectionCard } from '@/components/election-card';
import type { Election } from '@shared/schema';
import { isUpcomingElection } from '@/lib/election-timing';
import { useNow } from '@/hooks/use-now';

interface FeaturedElectionCardsProps {
  elections: Election[];
}

const FEATURED_COUNT = 3;

export function FeaturedElectionCards({ elections }: FeaturedElectionCardsProps) {
  // Feature the soonest races that have not happened yet. Taking the first
  // three rows featured a primary that was already over.
  const now = new Date(useNow(60_000)); // same rollover clock as the home list
  const featuredElections = elections
    .filter(e => isUpcomingElection(e, now))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, FEATURED_COUNT);
  
  if (featuredElections.length === 0) return null;
  
  return (
    <section style={{ marginBottom: 'var(--section-spacing)' }}>
      <h2 className="text-2xl font-bold" style={{ marginBottom: 'var(--content-spacing)' }}>Featured Elections</h2>
      <div className="unified-grid">
        {featuredElections.map((election) => (
          <ElectionCard key={election.id} election={election} viewMode="grid" />
        ))}
      </div>
    </section>
  );
}
