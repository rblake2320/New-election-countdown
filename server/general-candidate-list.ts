import { isLouisiana2026HouseOpenPrimary } from './louisiana-house-catalog';
import type { Pool } from 'pg';
import type { RequestHandler } from 'express';

/** Public allowlist, with the official list's source labels distinct from FEC/ballot status. */
export async function getGeneralCandidateList(pool:Pool,electionId:number){
  const available=(await pool.query("SELECT to_regclass('public.candidate_source_records') AS sources,to_regclass('public.candidates') AS candidates,to_regclass('public.elections') AS elections,to_regclass('public.general_candidate_list_snapshots') AS snapshots")).rows[0];
  if(!available.elections)throw new Error('Election schema unavailable');
  const election=(await pool.query('SELECT id,state,title,type,level,date::text AS date,offices FROM elections WHERE id=$1',[electionId])).rows[0];
  if(!election)return {status:'election_not_found',electionId,candidates:[]};
  if(isLouisiana2026HouseOpenPrimary(election) || !['general','special'].includes(election.type.toLowerCase()))return {status:'not_applicable',reason:'not_a_general_election',electionId,candidates:[]};
  if(!available.sources)return {status:'not_recorded',electionId,candidates:[]};
  if(!available.candidates)throw new Error('Candidate schema unavailable');
  const result=await pool.query(`SELECT c.id,coalesce(s.metadata->>'ballotName',c.name) AS name,coalesce(s.metadata->>'partyValue','') AS party,c.election_id AS "electionId",
    CASE WHEN jsonb_typeof(s.metadata->'incumbent')='boolean' THEN (s.metadata->>'incumbent')::boolean ELSE NULL END AS "isIncumbent",c.description,c.website,c.profile_image_url AS "profileImageUrl",c.is_verified AS "isVerified",
    c.data_source AS "dataSource",c.source_status AS "sourceStatus",c.fec_candidate_id AS "fecCandidateId",c.ballot_status AS "ballotStatus",
    s.source_url AS "generalListSourceUrl",s.source_file_sha256 AS "generalListSnapshotSha256",s.source_synced_at AS "generalListCheckedAt",s.metadata AS "generalListSource"
    FROM candidates c JOIN LATERAL (
      SELECT * FROM candidate_source_records r WHERE r.candidate_id=c.id AND r.source_layer='general_candidate_list' AND r.is_current=true
      ORDER BY CASE WHEN r.metadata->>'publishedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN r.metadata->>'publishedAt' END DESC NULLS LAST,r.source_synced_at DESC,r.id DESC LIMIT 1
    ) s ON true WHERE c.election_id=$1 ORDER BY c.name,c.id`,[electionId]);
  const snapshots=available.snapshots?(await pool.query(`SELECT source_url AS url,source_synced_at AS "checkedAt",source_file_sha256 AS "snapshotSha256",metadata->>'sourceName' AS name,metadata->>'publishedAt' AS "publishedAt",metadata->'scope' AS scope
    FROM general_candidate_list_snapshots WHERE election_id=$1 AND is_current=true ORDER BY id`,[electionId])).rows:[];
  const coverage=snapshots.some(s=>s.scope && !s.scope.partyRaw && !s.scope.ballotAccessType)?'complete':snapshots.length?'scoped':'unspecified';
  return {status:result.rows.length||snapshots.length?'sourced':'not_recorded',electionId,candidates:result.rows,sources:snapshots,coverage};
}
export function generalCandidateListHandler(pool:Pool):RequestHandler{
  return async(req,res)=>{
    if(!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))){res.status(400).json({error:'Invalid election ID'});return;}
    try{const result=await getGeneralCandidateList(pool,Number(req.params.id));res.status(result.status==='election_not_found'?404:200).json(result);}
    catch{res.status(503).json({error:'General election candidate list temporarily unavailable'});}
  };
}
