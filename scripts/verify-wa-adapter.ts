import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parseWashingtonLandsRecount, WA_LANDS_CONTEXT } from '../server/official-result-adapters/wa';
const root = process.argv[2]; if (!root) throw new Error('Supply raw fixture directory');
const raw = (file: string) => readFileSync(resolve(root, file));
const workbook = raw('wa-2024-recount-all-candidates.xlsx');
const records = [];
for (const snapshot of ['initial', 'recount'] as const) {
  const certificationBytes = raw(snapshot === 'initial' ? 'wa-2024-original-certification.pdf' : 'wa-2024-recount-certification.pdf');
  const result = await parseWashingtonLandsRecount(workbook, { context: WA_LANDS_CONTEXT, snapshot, certificationBytes });
  const expected = snapshot === 'initial' ? 1903073 : 1903115;
  const expectedBallots = snapshot === 'initial' ? 1994096 : 1994099;
  if (result.totalVotes !== expected || result.publisherMetrics.ballotTotal !== expectedBallots || result.options.length !== 8 || result.options.some(o => o.isWinner) || result.asOf !== null || result.certificationEvidence.some(c => c.certifiedAt !== null)) throw new Error('Independent certified acceptance failed');
  records.push({ snapshot, outcome: 'Worked', certificateSha256: createHash('sha256').update(certificationBytes).digest('hex'), parsed: result });
}
console.log(JSON.stringify({ outcome:'Worked', mode:'actual raw XLSX bytes; compiled adapter; no DB/provider', records }, null, 2));
