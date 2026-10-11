import { describe, it, expect } from 'vitest';
import { assertManifestReceiving } from '../scripts/candidate-ci-expectations';

const row = {sourceId:'reviewed',name:'Test Candidate',partyRaw:'Independent',state:'AK',office:'S' as const,district:'00',date:'2026-11-03'};
const received = () => ({ generalListSource: {...row, legalName:row.name,electionDate:row.date} });
describe('CI exact manifest receiver', () => {
  it('accepts reviewed sets of different sizes without a frozen count', () => {
    for (const count of [1,259,1361]) {
      const rows=Array.from({length:count},(_,i)=>({...row,name:`Test ${i}`}));
      const body=rows.map(r=>({generalListSource:{...r,legalName:r.name,electionDate:r.date}}));
      expect(()=>assertManifestReceiving(rows,body)).not.toThrow();
    }
  });
  it.each(['legalName','partyRaw','state','office','district','electionDate','sourceId'])('refuses altered %s', field => {
    const body=received(); (body.generalListSource as Record<string,unknown>)[field]='wrong';
    expect(()=>assertManifestReceiving([row],[body])).toThrow();
  });
  it('refuses omissions and duplicates even when total count matches',()=>{
    expect(()=>assertManifestReceiving([row],[])).toThrow();
    expect(()=>assertManifestReceiving([row,{...row,name:'Other'}],[received(),received()])).toThrow();
  });
});
