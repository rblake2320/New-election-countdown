import JSZip from 'jszip';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/** Inflate only the selected entry and stop before accumulating beyond the cap. */
export async function extractFecMaster(bytes: Buffer, limit = 64 * 1024 * 1024): Promise<string> {
  // CRC32=true would inflate every archive entry up front, defeating the cap.
  // HTTPS source identity and the reviewed SHA256 protect application integrity.
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.values(zip.files).filter(f => !f.dir && /(^|\/)cn\.txt$/i.test(f.name));
  if (entries.length !== 1) throw new Error('Expected exactly one cn.txt in official ZIP');
  const stream = entries[0].internalStream('nodebuffer');
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0, settled = false;
    stream.on('data', value => {
      if (settled) return;
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      size += chunk.length;
      if (size > limit) {
        settled = true;
        stream.pause();
        reject(new Error('Extracted FEC source exceeds byte limit'));
        return;
      }
      chunks.push(chunk);
    }).on('error', error => { if (!settled) { settled = true; reject(error); } })
      .on('end', () => { if (!settled) { settled = true; resolve(Buffer.concat(chunks).toString('utf8')); } });
    stream.resume();
  });
}

export function persistFecManifest(directory: string, hash: string, manifest: Record<string, unknown>,
  write: (path: string, content: string) => void = (path, content) => writeFileSync(path, content)) {
  const applied = manifest.mode === 'applied';
  const auditId = manifest.database_audit_id;
  if (applied && (typeof auditId !== 'number' || auditId < 1)) throw new Error('Applied receipt requires a committed database audit ID');
  const filename = join(directory, `manifest-${hash}-${applied ? 'apply' : 'dry-run'}-${randomUUID()}.json`);
  try {
    // Unique per run: a repeat cannot overwrite the original apply action log.
    write(filename, JSON.stringify(manifest, null, 2));
    return { outcome: applied ? 'applied' : 'read-only-dry-run', receipt_file: filename, database_audit_id: auditId ?? null };
  } catch (error) {
    if (!applied) throw error;
    // The transaction and its audit record committed. A filesystem failure must
    // never be presented as an uncommitted ingestion failure.
    return { outcome: 'applied', receipt_file: null, database_audit_id: auditId,
      receipt_error: { code: (error as { code?: string }).code ?? 'unknown', message: 'Local manifest write failed; committed receipt is retained in candidate_ingest_runs' } };
  }
}
