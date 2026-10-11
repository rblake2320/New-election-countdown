import { describe,it,expect } from 'vitest';
import { assertRegistrationActions } from '../scripts/candidate-ci-registration';
import type { FecRow,FecAction } from '../server/fec-candidate-sync';
const record:FecRow={candId:'H6LA01001',displayName:'Fixture Example',party:'D',partyRaw:'DEM',state:'LA',office:'H',district:'01',status:'C',incumbent:false};
const expected=[{electionId:42,record}];
const action=():FecAction=>({kind:'insert',electionId:42,record:{...record}});
describe('explicit LA registration stage',()=>{
  it('admits exactly the independent insert set',()=>expect(()=>assertRegistrationActions([action()],expected)).not.toThrow());
  it.each(['enrich','update','source_refresh'] as const)('rejects %s in the insert stage',kind=>expect(()=>assertRegistrationActions([{...action(),kind}],expected)).toThrow());
  it.each(['state','office','district','party','partyRaw','candId'] as const)('rejects changed %s',field=>{
    const a=action(); (a.record as unknown as Record<string,unknown>)[field]='wrong';
    expect(()=>assertRegistrationActions([a],expected)).toThrow();
  });
  it('rejects wrong FK, missing, duplicate or preexisting identity',()=>{
    for(const actions of [[{...action(),electionId:43}],[],[action(),action()],[{...action(),candidateId:7}]]) {
      expect(()=>assertRegistrationActions(actions,expected)).toThrow();
    }
  });
});
