// Compile-only fixtures; never seeded or shipped on a user-visible path.
import type { InsertCandidate } from '../../shared/schema';

const candidate: InsertCandidate = { name: 'Compile fixture', party: 'I' };
const name: string = candidate.name;
// @ts-expect-error Database-generated IDs are omitted from insert DTOs.
const withId: InsertCandidate = { name: 'Compile fixture', party: 'I', id: 1 };
// @ts-expect-error Real required input fields cannot silently become optional.
const missingName: InsertCandidate = { party: 'I' };
// @ts-expect-error Required input is not nullable.
const nullName: InsertCandidate = { name: null, party: 'I' };
// @ts-expect-error Party keeps its actual string contract.
const wrongParty: InsertCandidate = { name: 'Compile fixture', party: 1 };

for (const [key, value] of new Map<string, number>([['fixture', 1]])) {
  const typed: [string, number] = [key, value];
  void typed;
}
void [name, withId, missingName, nullName, wrongParty];
