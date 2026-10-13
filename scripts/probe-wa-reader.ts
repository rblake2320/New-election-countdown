import { readFileSync } from 'node:fs';
import { readXlsxWorkbook } from '../server/official-result-adapters/xlsx';
const book = await readXlsxWorkbook(readFileSync('artifacts/wa-adapter/raw/wa-2024-recount-all-candidates.xlsx'));
console.log(JSON.stringify({sha256:book.sha256,sheets:book.sheets.map(s=>({name:s.name,rows:s.rows.length,first:s.rows[0],last:s.rows.at(-1)}))},null,2));
