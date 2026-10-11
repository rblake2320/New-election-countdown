import { writeFile } from 'node:fs/promises';
import { manifestFromReviews, sha256, readResultsReview } from '../server/official-results-manifest';
import { fileURLToPath } from 'node:url';
const files = ['source-reviews/initial-14.json', 'source-reviews/remaining-36.json'];
const root = new URL('../data/official-results/', import.meta.url);
const reviews = await Promise.all(files.map(file => readResultsReview(fileURLToPath(root), file)));
const bytes = JSON.stringify(manifestFromReviews(reviews), null, 2) + '\n';
await writeFile(new URL('2026-11-03.json', root), bytes, { flag: 'wx' });
console.log(JSON.stringify({ states: 50, manifestSha256: sha256(bytes) }));
