import { ElectionCard } from '@/components/election-card';
import type { Election } from '@shared/schema';
import { getElectionTiming } from '@/lib/election-timing';

interface FeaturedElectionCardsProps {
  elections: Election[];
}

const FEATURED_COUNT = 3;

export function FeaturedElectionCards({ elections }: FeaturedElectionCardsProps) {
  // Feature the soonest races that have not happened yet. Taking the first
  // three rows featured a primary that was already over.
  const now = new Date();
  const featuredElections = elections
    .filter(e => {
      const phase = getElectionTiming(e, now).phase;
      return phase !== 'completed' && phase !== 'polls-closed';
    })
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
