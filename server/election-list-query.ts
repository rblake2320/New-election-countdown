import { and, eq, getTableColumns, gte, ilike, inArray, isNull, notInArray, lt, or, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
import { elections, candidates } from '@shared/schema';
import { normalizeElectionFilters, partyAliases, US_ELECTION_TIME_ZONES, type ElectionQueryFilters } from './election-list-filters';

// One SQL statement: date predicates, party membership and all-candidate count.
// The party EXISTS filter intentionally does not restrict the count's LEFT JOIN.
export function buildElectionListQuery(database: NodePgDatabase<typeof schema>, filters: ElectionQueryFilters = {}, now = new Date()) {
  const normalized = normalizeElectionFilters(filters, now);
  const conditions: SQL[] = [eq(elections.isActive, true)];
  if (normalized.from) conditions.push(gte(elections.date, normalized.from));
  if (normalized.period) {
    const knownZone = inArray(elections.timezone, Array.from(US_ELECTION_TIME_ZONES));
    const lowerZone = sql`case when ${knownZone} then ${elections.timezone} else ${'Etc/GMT+11'} end`;
    const upperZone = sql`case when ${knownZone} then ${elections.timezone} else ${'Etc/GMT+4'} end`;
    const localDay = sql`(${now.toISOString()}::timestamptz at time zone ${lowerZone})::date`;
    const upperDay = sql`(${now.toISOString()}::timestamptz at time zone ${upperZone})::date`;
    conditions.push(gte(elections.date, localDay));
    if (normalized.period.days !== undefined) {
      conditions.push(lt(elections.date, sql`${upperDay} + ${normalized.period.days} * interval '1 day' + interval '1 day'`));
    } else if (normalized.period.months !== undefined) {
      conditions.push(lt(elections.date, sql`${upperDay} + ${normalized.period.months} * interval '1 month' + interval '1 day'`));
    }
  } else if (normalized.until) conditions.push(lt(elections.date, normalized.until));
  if (normalized.state) conditions.push(eq(elections.state, normalized.state));
  if (normalized.types.length) conditions.push(inArray(sql`lower(trim(${elections.type}))`, normalized.types));
  if (normalized.electionTypes.length) conditions.push(inArray(sql`lower(trim(${elections.type}))`, normalized.electionTypes));
  if (normalized.levels.length) conditions.push(inArray(sql`lower(trim(${elections.level}))`, normalized.levels));
  if (normalized.cycle) {
    conditions.push(gte(elections.date, new Date(Date.UTC(normalized.cycle, 0, 1))));
    conditions.push(lt(elections.date, new Date(Date.UTC(normalized.cycle + 1, 0, 1))));
  }
  if (normalized.search) {
    const pattern = `%${normalized.search.replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push(or(ilike(elections.title, pattern), ilike(elections.subtitle, pattern), ilike(elections.location, pattern))!);
  }
  if (normalized.parties.length) {
    const aliases = Object.entries(partyAliases).filter(([, code]) => normalized.parties.includes(code)).map(([alias]) => alias);
    const knownAliases = Object.keys(partyAliases);
    const partyMatch = normalized.parties.includes('O')
      ? or(isNull(candidates.party), inArray(sql`lower(trim(${candidates.party}))`, aliases), notInArray(sql`lower(trim(${candidates.party}))`, knownAliases))!
      : inArray(sql`lower(trim(${candidates.party}))`, aliases);
    conditions.push(sql`exists (select 1 from ${candidates} where ${candidates.electionId} = ${elections.id} and ${partyMatch})`);
  }
  return database.select({ ...getTableColumns(elections), candidateCount: sql<number>`count(${candidates.id})`.mapWith(Number) })
    .from(elections).leftJoin(candidates, eq(candidates.electionId, elections.id))
    .where(and(...conditions)).groupBy(elections.id).orderBy(elections.date, elections.id);
}
