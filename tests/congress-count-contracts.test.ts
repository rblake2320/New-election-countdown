import { afterEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ rows: [] as Array<{ chamber: string | null; party: string | null; state: string | null }> }));
vi.mock('../server/db', () => ({ db: { select: () => ({ from: async () => fixture.rows }) } }));
vi.mock('../server/congress-bill-service', () => ({ getCongressBillService: () => null }));
import { CongressImportService } from '../server/congress-import-service';
import { CongressCompleteSyncService } from '../server/congress-complete-sync';
afterEach(() => { fixture.rows=[]; vi.restoreAllMocks(); });

describe('recorded Congress count contracts', () => {
  it('reports missing affiliation separately without creating a party named null or empty', async () => {
    vi.spyOn(console,'log').mockImplementation(() => {});
    fixture.rows=[{chamber:'House',party:'D',state:'AL'},{chamber:'Senate',party:null,state:'AK'},{chamber:'Senate',party:'',state:null}];
    const stats=await new CongressImportService().validateImport();
    expect(stats).toMatchObject({total:3,house:1,senate:2,states:2,parties:{D:1},unrecordedPartyCount:2,unrecordedStateCount:1,isComplete:false});
    expect(Object.keys(stats.parties)).toEqual(['D']);
  });
  it('keeps chamber totals numeric and does not count an unknown chamber as House or Senate', () => {
    vi.spyOn(console,'log').mockImplementation(() => {});
    const result=new CongressCompleteSyncService().validateMemberCounts([
      {state:'AL',chamber:'House'},{state:'AK',chamber:'Senate'},{state:'AK',chamber:'Unknown'}
    ]);
    expect(result).toEqual({totalHouse:1,totalSenate:1,total:2});
  });
  it('reports an empty read as zero records without claiming a complete import', async () => {
    vi.spyOn(console,'log').mockImplementation(() => {});
    expect(await new CongressImportService().validateImport()).toMatchObject({total:0,states:0,parties:{},unrecordedPartyCount:0,unrecordedStateCount:0,isComplete:false});
  });
});
