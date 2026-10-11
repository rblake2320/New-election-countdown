import type { SeedRace } from './seed-data-2026';
import { louisianaHouseDescription } from './louisiana-house-catalog';

// 2020-census House apportionment — every district is up Nov 3, 2026
const HOUSE_SEATS: Record<string, number> = {
  CA: 52, TX: 38, FL: 28, NY: 26, PA: 17, IL: 17, OH: 15, GA: 14, NC: 14, MI: 13,
  NJ: 12, VA: 11, WA: 10, AZ: 9, IN: 9, MA: 9, TN: 9, MD: 8, MN: 8, MO: 8,
  WI: 8, CO: 8, AL: 7, SC: 7, LA: 6, KY: 6, OR: 6, OK: 5, CT: 5, IA: 4,
  AR: 4, KS: 4, MS: 4, NV: 4, UT: 4, NM: 3, NE: 3, WV: 2, ID: 2, HI: 2,
  ME: 2, NH: 2, RI: 2, MT: 2, ND: 1, SD: 1, DE: 1, VT: 1, WY: 1, AK: 1,
};

export function houseRaces(): SeedRace[] {
  const races: SeedRace[] = [];
  for (const [state, seats] of Object.entries(HOUSE_SEATS)) {
    for (let d = 1; d <= seats; d++) {
      const district = seats === 1 ? 'At-Large' : `District ${d}`;
      races.push({
        state,
        title: `U.S. House Election - ${state}-${seats === 1 ? 'AL' : String(d).padStart(2, '0')}`,
        subtitle: state === 'LA' ? `${state} ${district} — open primary` : `${state} ${district}`,
        type: state === 'LA' ? 'primary' : 'general',
        level: 'federal',
        office: 'U.S. House of Representatives',
        date: '2026-11-03',
        description: state === 'LA' ? louisianaHouseDescription(d) : `${state} ${district} U.S. House seat — general election November 3, 2026.`,
        candidates: [],
      });
    }
  }
  return races;
}
