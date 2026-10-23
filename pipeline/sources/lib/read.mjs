/* Readers for the payload shapes registers publish: zip archives, CSV, the first sheet of an xlsx
 * workbook, and the bundles written by pipeline/sources/capture.mjs. No dependencies, so a build
 * reads a committed snapshot with nothing but Node. ZIP64 archives are refused rather than misread.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

export function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip archive');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || p === 0xffffffff) throw new Error('ZIP64 archives are not supported');
  const out = new Map();
  for (let n = 0; n < count; n += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad zip central directory');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    if (method === 0) out.set(name, data);
    else if (method === 8) out.set(name, zlib.inflateRawSync(data));
    else throw new Error(`zip entry ${name} uses unsupported method ${method}`);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function unescapeXml(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTITIES[e] ?? m;
  });
}
function textOf(xml) {
  let out = '';
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1];
  return unescapeXml(out);
}

/* The first worksheet as objects keyed by the header row. */
export function readXlsx(buf) {
  const parts = unzip(buf);
  const shared = [];
  const ss = parts.get('xl/sharedStrings.xml');
  if (ss) for (const m of ss.toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]));
  const sheetName = [...parts.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  const xml = parts.get(sheetName).toString('utf8');
  const grid = [];
  for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(cm[1]);
      if (!ref) continue;
      const type = (/\bt="([^"]+)"/.exec(cm[1]) || [])[1];
      const inner = cm[2] || '';
      const v = (/<v>([\s\S]*?)<\/v>/.exec(inner) || [])[1];
      let value = type === 's' ? shared[Number(v)] : type === 'inlineStr' ? textOf(inner) : v !== undefined ? unescapeXml(v) : '';
      if (!type && /^-?\d+(\.\d+)?E[+-]?\d+$/i.test(value) && Number.isSafeInteger(Number(value))) value = String(Number(value));
      cells[ref[1]] = value;
    }
    grid.push(cells);
  }
  const [header, ...body] = grid;
  const cols = Object.entries(header).filter(([, name]) => name);
  return body.map((cells) => Object.fromEntries(cols.map(([col, name]) => [name, cells[col] ?? ''])));
}

/* Spreadsheet serial day to YYYY-MM-DD (the 1900 date system). */
export function excelDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n <= 0) return '';
  return new Date(Date.UTC(1899, 11, 30) + Math.round(n * 86400000)).toISOString().slice(0, 10);
}

export function readPayload(snapshot) {
  if (!snapshot || !snapshot.payloadPath) throw new Error('snapshot has no payload');
  return fs.readFileSync(snapshot.payloadPath);
}
