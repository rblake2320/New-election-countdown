import { db, pool } from './db';
import { congressMembers } from '@shared/schema';
import { LegacyCongressImportRefused, loadOfficialCongressSnapshot, sourceCoverageComplete, syncOfficialCongress, type CongressImportOptions, type CongressImportReceipt } from './congress-official-import';

export interface CongressImportValidation {
  total:number;house:number;senate:number;states:number;parties:Record<string,number>;
  unrecordedPartyCount:number;unrecordedStateCount:number;isComplete:boolean;
  expectedCounts:{house:number;senate:number;total:number};
  sourceScope:'all_current_members_including_nonvoting';sourceStatus:'reviewed_snapshot'|'unavailable';
}
export class CongressImportService {
  async importFromCompleteDataset():Promise<{count:number;breakdown:unknown}> {
    // Neither the legacy files nor a database writer is touched by this path.
    throw new LegacyCongressImportRefused();
  }
  async importReviewedOfficialSnapshot(options:CongressImportOptions={}):Promise<CongressImportReceipt> {
    return syncOfficialCongress(pool,options);
  }
  async validateImport():Promise<CongressImportValidation> {
    const members=await db.select().from(congressMembers);
    const recordedStates=new Set<string>();const parties:Record<string,number>={};
    let unrecordedPartyCount=0,unrecordedStateCount=0;
    for(const member of members){
      if(member.state!==null&&member.state.trim())recordedStates.add(member.state);else unrecordedStateCount++;
      if(member.party!==null&&member.party.trim())parties[member.party]=(parties[member.party]??0)+1;else unrecordedPartyCount++;
    }
    let isComplete=false;let sourceStatus:CongressImportValidation['sourceStatus']='unavailable';
    try{
      const {snapshot}=loadOfficialCongressSnapshot();sourceStatus='reviewed_snapshot';
      isComplete=members.filter(m=>m.congress===119).length===539&&sourceCoverageComplete(members.map(m=>({...m,bioguide_id:m.bioguideId})),snapshot);
    }catch{ /* Missing/unreviewed source is an honest incomplete read, never a writer. */ }
    return {total:members.length,house:members.filter(m=>m.chamber==='House').length,senate:members.filter(m=>m.chamber==='Senate').length,states:recordedStates.size,parties,unrecordedPartyCount,unrecordedStateCount,isComplete,expectedCounts:{house:439,senate:100,total:539},sourceScope:'all_current_members_including_nonvoting',sourceStatus};
  }
}
export const congressImportService=new CongressImportService();
