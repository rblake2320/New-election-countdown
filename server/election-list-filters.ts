import type { Election, ElectionFilters } from '@shared/schema';

export type ElectionQueryFilters = Partial<ElectionFilters> & { minDate?: Date };
export type ElectionListing = Election & { candidateCount: number };
export class ElectionFilterError extends Error {}

const stateNames = 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|District of Columbia'.split('|');
const stateCodes = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' ');
const states = new Map(stateNames.map((name, i) => [name.toLowerCase(), stateCodes[i]]));
stateCodes.forEach(code => states.set(code.toLowerCase(), code));

export const partyAliases: Record<string, string> = {
  d: 'D', dem: 'D', democratic: 'D', democrat: 'D', 'democratic party': 'D', dfl: 'D',
  r: 'R', rep: 'R', republican: 'R', 'republican party': 'R',
  i: 'I', ind: 'I', independent: 'I', unaffiliated: 'I', npa: 'I', non: 'I',
  g: 'G', gre: 'G', green: 'G', 'green party': 'G',
  l: 'L', lib: 'L', libertarian: 'L', 'libertarian party': 'L',
  o: 'O', oth: 'O', other: 'O', c: 'O', con: 'O', w: 'O',
};
export const canonicalParty = (party: string) => partyAliases[party.trim().toLowerCase()] ?? 'O';

export const utcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
function addMonths(date: Date, months: number) {
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return first;
}

export function normalizeElectionFilters(input: Record<string, unknown> = {}, now = new Date()) {
  const scalar = (key: string, allIsSentinel = true): string | undefined => {
    const value = input[key];
    if (value == null || value === '') return undefined;
    if (typeof value !== 'string') throw new ElectionFilterError(`Invalid ${key}: expected one string`);
    const trimmed = value.trim();
    return !trimmed || (allIsSentinel && trimmed.toLowerCase() === 'all') ? undefined : trimmed;
  };
  const list = (key: string): string[] => {
    const value = input[key];
    if (value == null || value === '') return [];
    const parts = Array.isArray(value) ? value : [value];
    if (parts.some(part => typeof part !== 'string')) throw new ElectionFilterError(`Invalid ${key}`);
    const items = parts.flatMap(part => (part as string).split(',')).map(s => s.trim().toLowerCase()).filter(Boolean);
    if (items.includes('all') && items.length > 1) throw new ElectionFilterError(`Invalid ${key}: all cannot be combined`);
    return items[0] === 'all' ? [] : Array.from(new Set(items));
  };
  const timeframe = scalar('timeframe')?.toLowerCase();
  const timeRange = scalar('timeRange')?.toLowerCase();
  if (timeframe && timeRange && timeframe !== timeRange) throw new ElectionFilterError('Conflicting timeframe and timeRange');
  const range = timeframe ?? timeRange;
  const today = utcDay(now);
  let from: Date | undefined;
  let until: Date | undefined;
  if (input.minDate != null) {
    if (!(input.minDate instanceof Date) || !Number.isFinite(input.minDate.getTime())) throw new ElectionFilterError('Invalid minDate');
    from = utcDay(input.minDate);
  }
  if (range) {
    let end: Date | undefined;
    switch (range) {
      case 'upcoming': break;
      case 'week': end = addDays(today, 7); break;
      case 'next-30-days': end = addDays(today, 30); break;
      case 'next-90-days': end = addDays(today, 90); break;
      case 'month': end = addMonths(today, 1); break;
      case 'quarter': end = addMonths(today, 3); break;
      case 'next-6-months': end = addMonths(today, 6); break;
      case 'next-year': case 'year': end = addMonths(today, 12); break;
      default: throw new ElectionFilterError(`Invalid timeframe: ${range}`);
    }
    if (!from || today > from) from = today;
    // Inclusive end calendar date, regardless of database timestamp precision.
    if (end) until = addDays(end, 1);
  }
  const levels = list('level');
  if (levels.some(level => !['federal', 'state', 'local'].includes(level))) throw new ElectionFilterError('Invalid level');
  const parties = list('party').map(party => {
    if (!partyAliases[party]) throw new ElectionFilterError(`Invalid party: ${party}`);
    return partyAliases[party];
  });
  const state = scalar('state');
  const stateCode = state ? states.get(state.toLowerCase()) : undefined;
  if (state && !stateCode) throw new ElectionFilterError('Invalid state');
  const cycleRaw = input.cycle;
  if (cycleRaw != null && typeof cycleRaw !== 'string' && typeof cycleRaw !== 'number') throw new ElectionFilterError('Invalid cycle');
  const cycle = cycleRaw == null || cycleRaw === '' ? undefined : Number(cycleRaw);
  if (cycle !== undefined && (!Number.isInteger(cycle) || cycle < 1000 || cycle > 9998 || (typeof cycleRaw === 'string' && !/^\d{4}$/.test(cycleRaw)))) throw new ElectionFilterError('Invalid cycle');
  const search = scalar('search', false);
  if (search && search.length > 200) throw new ElectionFilterError('Invalid search: maximum 200 characters');
  return { from, until, state: stateCode, types: list('type'), electionTypes: list('electionType'), levels, parties: Array.from(new Set(parties)), cycle, search };
}
