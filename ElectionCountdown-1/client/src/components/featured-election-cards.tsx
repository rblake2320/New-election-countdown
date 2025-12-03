import { ElectionCard } from '@/components/election-card';
import type { Election } from '@shared/schema';

interface FeaturedElectionCardsProps {
  elections: Election[];
}

export function FeaturedElectionCards({ elections }: FeaturedElectionCardsProps) {
  // Take first 3 elections as featured
  const featuredElections = elections.slice(0, 3);
  
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