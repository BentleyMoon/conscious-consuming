/* The Science Based Targets initiative's companies file: whether a company's climate targets have
 * been checked against what the science says is needed.
 *
 * Joined by LEI only. SBTi lists companies by the name they gave it, and those names collide:
 * "Lucid Group Communications Ltd" is a communications firm, not the car maker, and "Polestar
 * Analytics" is a software company. A name that matches is written out as a proposal for review.
 *
 * Companies opt in to SBTi, so absence says nothing and is not scored. A listed company scores at
 * least 60, because the ranking reads a missing score as 50 and a published commitment must never
 * rank below silence. "Commitment Removed" is a recorded fact but not a positive one, and is left
 * unscored for the same reason absence is.
 */
import { readPayload, readXlsx, excelDate } from '../lib/read.mjs';
import { normaliseName } from '../harness.mjs';

const DASHBOARD = 'https://sciencebasedtargets.org/target-dashboard';
const CLASS_SCORE = [[/^1\.5/, 100], [/^well[- ]below/i, 85], [/^2/, 70]];

export const id = 'sbti-targets';
export const criterion = { key: 'environment', label: "Maker's climate target", source: 'Science Based Targets initiative', tier: 'certified' };
export const idScheme = 'lei';

export const captures = [{
  register: 'sbti-target-dashboard',
  access: 'bulk',
  url: 'https://files.sciencebasedtargets.org/production/files/companies-excel.xlsx',
  extension: 'xlsx',
  local: true,
  scope: 'SBTi companies file: every company row the target dashboard publishes.',
  licenseUrl: 'https://sciencebasedtargets.org/about-us/website-terms-of-use',
  licenseNote: 'SBTi website terms: all rights reserved; pages may be stored for research or other non-commercial use, with credit and a link. Kept local and cited per fact, not republished.',
  parserId: 'sbti-companies-xlsx',
  parserVersion: '1.0.0',
}];

export function reaches() {
  return true;
}

function scoreFor(row) {
  const status = String(row.near_term_status || '');
  if (/^(Validated Targets|Targets Set)/i.test(status)) {
    const parts = String(row.near_term_target_classification || '').split('/').map((s) => s.trim()).filter(Boolean);
    const scores = parts.map((p) => (CLASS_SCORE.find(([re]) => re.test(p)) || [null, null])[1]).filter((n) => n != null);
    if (!scores.length) return null;
    return { score: Math.min(...scores), status: 'validated', parts };
  }
  if (/^Commitment to Set Targets/i.test(status)) return { score: 60, status: 'committed', parts: [] };
  return null;
}

export async function index(ctx) {
  const snap = ctx.latestSnapshot('sbti-target-dashboard');
  if (!snap) return null;
  const rows = readXlsx(readPayload(snap));
  const byId = new Map();
  const byName = new Map();
  for (const row of rows) {
    const lei = String(row.lei || '').trim().toUpperCase();
    const updated = excelDate(row.date_updated);
    const s = scoreFor(row);
    const name = String(row.company_name || '').trim();
    if (name) {
      byName.set(normaliseName(name), {
        legalName: name, identifier: lei || String(row.sbti_id || ''), identifierScheme: lei ? 'lei' : 'sbti_id', source: DASHBOARD,
      });
    }
    if (!lei || !s) continue;
    const what = s.status === 'validated'
      ? `validated near-term targets classed ${s.parts.join(' / ')}${s.parts.length > 1 ? ' (scored on the weaker)' : ''}`
      : 'a commitment to set targets, not yet validated';
    const nz = /validated|targets set/i.test(String(row.net_zero_status || '')) ? `, and a validated net-zero target for ${row.net_zero_year}` : '';
    byId.set(lei, {
      score: s.score,
      note: `SBTi lists ${name} (LEI ${lei}) with ${what}${nz}. Record updated ${updated || 'on an unstated date'}.`,
      source: DASHBOARD,
      asof: (updated || snap.manifest.capturedAt || '').slice(0, 7),
      identifier: lei,
      legalName: name,
    });
  }
  return { byId, byName };
}
