import { it, expect } from 'vitest';
import { electionCalendarDay } from '../server/election-list-filters';
it('uses the actual C3 Michigan latest-zone calendar day at Central midnight',()=>{
  expect(electionCalendarDay(new Date('2026-11-04T05:30:00Z'),'America/Menominee').toISOString()).toBe('2026-11-03T00:00:00.000Z');
  expect(electionCalendarDay(new Date('2026-11-04T06:30:00Z'),'America/Menominee').toISOString()).toBe('2026-11-04T00:00:00.000Z');
});
