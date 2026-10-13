import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { posix } from 'node:path';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { z } from 'zod';
import { OfficialResultParseError } from './types';

export type XlsxCell = string | number | null;
export interface XlsxSheet { name: string; rows: XlsxCell[][] }
export interface XlsxWorkbook { sha256: string; sheets: XlsxSheet[] }
const limits = { archive: 16 * 1024 * 1024, entries: 256, entry: 16 * 1024 * 1024,
  expanded: 64 * 1024 * 1024, rows: 20000, columns: 512, cells: 500000 };
function refuse(message: string): never { throw new OfficialResultParseError('INVALID_XLSX', message); }
function object(value: unknown): Record<string, unknown> { return z.record(z.unknown()).parse(value); }
function list(value: unknown): unknown[] { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function string(value: unknown): string { return z.string().parse(value); }
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
// Preflight the directory BEFORE inflation. maxOutputLength also enforces the
// actual expansion bound when an adversary lies about the directory lengths.
function unzip(bytes: Buffer): Map<string, Buffer> {
  if (bytes.length < 22 || bytes.length > limits.archive) refuse('Archive size exceeds bound');
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--) {
    if (bytes.readUInt32LE(at) === 0x06054b50 && at + 22 + bytes.readUInt16LE(at + 20) === bytes.length) { end = at; break; }
  }
  if (end < 0) refuse('ZIP end directory absent');
  const count = bytes.readUInt16LE(end + 10), size = bytes.readUInt32LE(end + 12), start = bytes.readUInt32LE(end + 16);
  if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6) || bytes.readUInt16LE(end + 8) !== count || count === 0 || count > limits.entries || start + size !== end) refuse('Unsupported ZIP directory');
  const directory: { name: string; offset: number; compressed: number; expanded: number; method: number; flags: number; crc: number }[] = [];
  const names = new Set<string>(); let at = start, total = 0;
  for (let index = 0; index < count; index++) {
    if (at + 46 > end || bytes.readUInt32LE(at) !== 0x02014b50) refuse('Truncated central directory');
    const flags = bytes.readUInt16LE(at + 8), method = bytes.readUInt16LE(at + 10), compressed = bytes.readUInt32LE(at + 20), expanded = bytes.readUInt32LE(at + 24);
    const n = bytes.readUInt16LE(at + 28), extra = bytes.readUInt16LE(at + 30), comment = bytes.readUInt16LE(at + 32), offset = bytes.readUInt32LE(at + 42);
    if (at + 46 + n + extra + comment > end) refuse('Truncated ZIP name');
    const name = bytes.subarray(at + 46, at + 46 + n).toString('utf8');
    if (!name || name.includes('\ufffd') || name.includes('\\') || name.startsWith('/') || name.split('/').includes('..') || names.has(name)) refuse('Unsafe or duplicate ZIP path');
    if ((flags & ~0x80e) || (method === 0 && (flags & 6)) || ![0, 8].includes(method) || bytes.readUInt16LE(at + 34) || offset >= start || expanded > limits.entry || compressed > limits.archive || expanded > Math.max(1024, compressed * 2000)) refuse('Unsupported or oversized ZIP entry');
    total += expanded; if (total > limits.expanded) refuse('Expanded archive exceeds bound');
    names.add(name); directory.push({ name, flags, method, compressed, expanded, offset, crc: bytes.readUInt32LE(at + 16) });
    at += 46 + n + extra + comment;
  }
  if (at !== end) refuse('Directory length mismatch');
  const output = new Map<string, Buffer>(); const ranges: [number, number][] = [];
  for (const entry of directory) {
    const p = entry.offset;
    if (p + 30 > start || bytes.readUInt32LE(p) !== 0x04034b50 || bytes.readUInt16LE(p + 6) !== entry.flags || bytes.readUInt16LE(p + 8) !== entry.method) refuse('Local ZIP header mismatch');
    const n = bytes.readUInt16LE(p + 26), extra = bytes.readUInt16LE(p + 28), data = p + 30 + n + extra, finish = data + entry.compressed;
    if (finish > start || bytes.subarray(p + 30, p + 30 + n).toString('utf8') !== entry.name || ranges.some(([a, b]) => p < b && finish > a)) refuse('Overlapping or truncated ZIP entry');
    if (!(entry.flags & 8) && (bytes.readUInt32LE(p + 14) !== entry.crc || bytes.readUInt32LE(p + 18) !== entry.compressed || bytes.readUInt32LE(p + 22) !== entry.expanded)) refuse('Local ZIP sizes mismatch');
    ranges.push([p, finish]); const compressed = bytes.subarray(data, finish);
    const result = entry.method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: Math.min(limits.entry, entry.expanded + 1) });
    if (result.length !== entry.expanded || crc32(result) !== entry.crc) refuse('ZIP size or CRC mismatch');
    if (entry.name.endsWith('.xml') || entry.name.endsWith('.rels')) {
      const xml = result.toString('utf8'); if (xml.includes('\ufffd') || /<!DOCTYPE|<!ENTITY/i.test(xml)) refuse('Unsafe XML declaration or encoding');
    }
    output.set(entry.name, result);
  }
  return output;
}
function xml(files: Map<string, Buffer>, path: string): Record<string, unknown> {
  const data = files.get(path); if (!data) refuse(`Required XML absent: ${path}`);
  const text = data.toString('utf8');
  let depth = 0; for (const token of text.matchAll(/<\/?[A-Za-z_][^>]*>/g)) {
    if (token[0].startsWith('</')) depth--; else if (!token[0].endsWith('/>')) depth++;
    if (depth > 64) refuse('XML nesting exceeds bound');
  }
  if (XMLValidator.validate(text) !== true) refuse('Malformed XML');
  const parsed: unknown = new XMLParser({ ignoreAttributes: false, parseTagValue: false, parseAttributeValue: false, trimValues: false, processEntities: true }).parse(text);
  return object(parsed);
}
function richText(value: unknown): string {
  const node = object(value);
  if (node.t !== undefined) return typeof node.t === 'string' ? node.t : string(object(node.t)['#text'] ?? '');
  return list(node.r).map(run => richText(run)).join('');
}
const mainNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
export async function readXlsxWorkbook(bytes: Buffer): Promise<XlsxWorkbook> {
  try {
    const files = unzip(bytes), book = object(xml(files, 'xl/workbook.xml').workbook);
    if (book['@_xmlns'] !== mainNs) refuse('Unsupported workbook namespace');
    const relRoot = object(xml(files, 'xl/_rels/workbook.xml.rels').Relationships);
    if (relRoot['@_xmlns'] !== 'http://schemas.openxmlformats.org/package/2006/relationships') refuse('Unsupported relationship namespace');
    const relationships = new Map<string, Record<string, unknown>>();
    for (const value of list(relRoot.Relationship)) { const rel = object(value), id = string(rel['@_Id']); if (relationships.has(id)) refuse('Duplicate relationship'); relationships.set(id, rel); }
    const resolve = (rel: Record<string, unknown>): string => {
      const target = string(rel['@_Target']);
      if (rel['@_TargetMode'] === 'External' || target.includes('\\') || target.includes(':') || target.includes('?') || target.includes('#')) refuse('External workbook relationship');
      const path = target.startsWith('/') ? target.slice(1) : posix.normalize('xl/' + target);
      if (!path.startsWith('xl/') || path.includes('../')) refuse('Escaping workbook relationship'); return path;
    };
    let strings: string[] = [];
    for (const rel of relationships.values()) if (rel['@_Type'] === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings') {
      if (strings.length) refuse('Duplicate shared strings');
      const sst = object(xml(files, resolve(rel)).sst); if (sst['@_xmlns'] !== mainNs) refuse('Unsupported string namespace');
      strings = list(sst.si).map(richText); if (strings.length > limits.cells) refuse('Too many shared strings');
    }
    let cells = 0; const sheets: XlsxSheet[] = [], sheetNames = new Set<string>();
    for (const rawSheet of list(object(book.sheets).sheet)) {
      const spec = object(rawSheet), name = string(spec['@_name']), rel = relationships.get(string(spec['@_r:id']));
      if (sheetNames.has(name) || !rel || rel['@_Type'] !== 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet') refuse('Invalid worksheet relationship');
      sheetNames.add(name); const sheet = object(xml(files, resolve(rel)).worksheet);
      if (sheet['@_xmlns'] !== mainNs) refuse('Unsupported worksheet namespace');
      const rows: XlsxCell[][] = [], seenRows = new Set<number>();
      for (const rawRow of list(object(sheet.sheetData).row)) {
        const row = object(rawRow), rowNumber = Number(row['@_r']);
        if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > limits.rows || seenRows.has(rowNumber)) refuse('Invalid worksheet row');
        seenRows.add(rowNumber); while (rows.length < rowNumber) rows.push([]);
        const values = rows[rowNumber - 1]; if (!values) refuse('Missing row allocation'); const seen = new Set<number>();
        for (const rawCell of list(row.c)) {
          if (++cells > limits.cells) refuse('Cell count exceeds bound'); const cell = object(rawCell);
          const coordinate = string(cell['@_r']).match(/^([A-Z]+)([1-9]\d*)$/); if (!coordinate || Number(coordinate[2]) !== rowNumber) refuse('Invalid cell coordinate');
          let column = 0; for (const letter of coordinate[1] ?? '') column = column * 26 + letter.charCodeAt(0) - 64;
          if (column < 1 || column > limits.columns || seen.has(column)) refuse('Duplicate or oversized cell coordinate');
          seen.add(column); while (values.length < column) values.push(null);
          let value: XlsxCell = null; const type = cell['@_t'];
          if (cell.f !== undefined && cell.v === undefined) refuse('Formula has no cached value');
          if (type === 'inlineStr') value = richText(cell.is);
          else if (cell.v !== undefined) {
            const raw = string(cell.v);
            if (type === 's') { const index = Number(raw); if (!/^\d+$/.test(raw) || !Number.isSafeInteger(index) || strings[index] === undefined) refuse('Invalid shared string index'); value = strings[index] ?? null; }
            else if (type === 'str') value = raw;
            else if (type === undefined || type === 'n') { if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$/.test(raw) || !Number.isFinite(Number(raw))) refuse('Invalid numeric cache'); value = Number(raw); }
            else refuse('Unsupported cell type');
          } else if (type !== undefined && type !== 'n') refuse('Typed cell has no cached value');
          values[column - 1] = value;
        }
      }
      sheets.push({ name, rows });
    }
    if (!sheets.length || sheets.length > 64) refuse('Workbook has no usable sheets');
    return { sha256: createHash('sha256').update(bytes).digest('hex'), sheets };
  } catch (error) {
    if (error instanceof OfficialResultParseError) throw error;
    throw new OfficialResultParseError('INVALID_XLSX', error instanceof Error ? error.message : 'Invalid workbook');
  }
}
