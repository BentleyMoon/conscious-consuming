#!/usr/bin/env node
/* Build app/data/pulse.json: a quiet local ledger for the "What's new" strip.

   Inputs are intentionally boring and re-runnable:
   - recent git history touching content/ or app/data/
   - freshness flags computed from dated provenance in curated lenses

   This is not a social feed. No counters, streaks, likes, or engagement hooks.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA_INDEX = path.join(ROOT, 'app', 'data', 'index.json');
const LENSES_DIR = path.join(ROOT, 'content', 'lenses');
const GUIDES_DIR = path.join(ROOT, 'content', 'guides');
const OUT = path.join(ROOT, 'app', 'data', 'pulse.json');
const WINDOW_DAYS = 90;
// 2026-08-13. Raised 48 -> 120. The catalogue went from 88 built decisions to 118 in a day, and
// thirty new datasets pushed every older category out of the recent-changes window, including
// banking, the reference category the fixtures assert on. A changes feed that only ever shows the
// last few days of a busy week is not a change history.
const MAX_ENTRIES = 120;
const MAX_GUIDES_PER_COMMIT = 8;
const ALLOWED_KINDS = new Set(['added', 'corrected', 'contested', 'stale']);

const HIGH_CHANGE = new Set([
  'ai-assistants',
  'digital-services',
  'investing',
  'laptops',
  'news-sources',
  'password-managers',
  'payments',
  'phones',
  'vpn'
]);
const FIRST_USER = new Set([
  'ai-assistants',
  'banking',
  'clothing',
  'digital-services',
  'investing',
  'learning-resources',
  'news-sources',
  'password-managers',
  'payments',
  'phones',
  'vpn'
]);
const FIRST_PRESENTATION_GUIDES = new Set([
  'vote-with-your-money',
  'how-scores-work',
  'digital-literacy',
  'ethical-banking',
  'investing',
  'ai-assistants',
  'digital-services',
  'password-managers',
  'vpn',
  'clothing',
  'news-sources',
  'learning-resources'
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function formatJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cutoffDate(days = WINDOW_DAYS) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function runGit(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', shell: false });
  if (result.error) return '';
  if (result.status !== 0) return '';
  return result.stdout || '';
}

function categoryMaps() {
  const index = readJson(DATA_INDEX);
  const byId = new Map();
  const byFile = new Map();
  for (const cat of index.categories || []) {
    byId.set(cat.id, cat);
    if (cat.file) byFile.set(cat.file, cat);
  }
  return { byId, byFile };
}

function labelForNode(node, maps) {
  if (node.startsWith('ovs:cat/')) {
    const cat = maps.byId.get(node.slice('ovs:cat/'.length));
    return cat ? cat.label : node;
  }
  if (node.startsWith('ovs:guide/')) return guideTitle(node.slice('ovs:guide/'.length));
  return node;
}

function guideTitle(slug) {
  const file = path.join(GUIDES_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return slug.replace(/-/g, ' ');
  const text = fs.readFileSync(file, 'utf8');
  const title = text.match(/^title:\s*(.+)$/m);
  if (title) return title[1].trim().replace(/^["']|["']$/g, '');
  const h1 = text.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : slug.replace(/-/g, ' ');
}

function lensNodeFromPath(rel, maps) {
  const name = path.basename(rel);
  if (!name.endsWith('.json')) return null;

  if (rel.startsWith('app/data/')) {
    const cat = maps.byFile.get(name);
    return cat ? `ovs:cat/${cat.id}` : null;
  }

  if (rel.startsWith('content/lenses/')) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return null;
    try {
      const ds = readJson(abs);
      const id = ds.meta && ds.meta.id;
      return id && maps.byId.has(id) ? `ovs:cat/${id}` : null;
    } catch {
      return null;
    }
  }

  return null;
}

function guideNodeFromPath(rel) {
  if (rel.startsWith('content/guides/') && rel.endsWith('.md')) {
    return `ovs:guide/${path.basename(rel, '.md')}`;
  }
  if (rel.startsWith('app/g/') && rel.endsWith('.html') && path.basename(rel) !== 'index.html') {
    return `ovs:guide/${path.basename(rel, '.html')}`;
  }
  return null;
}

function nodeFromPath(rel, maps) {
  return lensNodeFromPath(rel, maps) || guideNodeFromPath(rel);
}

function sourceName(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/howtodivest\.org/i.test(raw)) return 'How to Divest';
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '');
    return host.split('.')[0].replace(/-/g, ' ');
  } catch {
    return '';
  }
}

function pulseLabel(label, node) {
  if (node === 'ovs:cat/banking') return 'banking';
  return String(label || '').toLowerCase();
}

function voiceLabel(label) {
  return String(label || '').replace(/\s*&\s*/g, ' and ');
}

function whatFor(kind, label, subject, node, sourceLabel = '') {
  void subject;
  const plainLabel = voiceLabel(label);
  if (node && node.startsWith('ovs:guide/')) {
    if (kind === 'added') return `Added 1 guide: ${plainLabel}, source: ${sourceLabel}.`;
    return `${plainLabel} guide had 1 text rebuild, source: ${sourceLabel}.`;
  }
  if (kind === 'added') return `Added 1 category page: ${plainLabel}, source: ${sourceLabel}.`;
  return `${plainLabel} had 1 data rebuild, source: ${sourceLabel}.`;
}

function recentGitEntries(maps) {
  const log = runGit([
    'log',
    `--since=${WINDOW_DAYS} days ago`,
    '--date=short',
    '--pretty=format:%H%x09%ad%x09%s',
    '--',
    'content',
    'app/data'
  ]).trim();
  if (!log) return [];

  const entries = [];
  const seen = new Set();

  for (const line of log.split(/\r?\n/).filter(Boolean)) {
    const [hash, date, ...subjectParts] = line.split('\t');
    const subject = subjectParts.join('\t');
    const changes = runGit(['diff-tree', '--no-commit-id', '--name-status', '-r', hash, '--', 'content', 'app/data'])
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);

    const nodes = new Map();
    for (const change of changes) {
      const parts = change.split('\t');
      const status = parts[0] || '';
      const rel = parts[parts.length - 1];
      const node = nodeFromPath(rel, maps);
      if (!node) continue;
      const previous = nodes.get(node);
      const kind = status.startsWith('A') ? 'added' : 'corrected';
      if (!previous || previous.kind !== 'added') nodes.set(node, { kind, rel });
    }

    const selected = selectCommitNodes(nodes);
    for (const [node, meta] of selected) {
      const key = `${date}|${node}|${meta.kind}|${hash.slice(0, 8)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const label = labelForNode(node, maps);
      entries.push({
        date,
        node,
        kind: meta.kind,
        what: whatFor(meta.kind, label, subject, node, hash.slice(0, 8)),
        commit: hash.slice(0, 8)
      });
    }
  }

  return entries;
}

function selectCommitNodes(nodes) {
  const rows = [...nodes.entries()];
  const categories = rows
    .filter(([node]) => node.startsWith('ovs:cat/'))
    .sort((a, b) => a[0].localeCompare(b[0]));
  const guides = rows
    .filter(([node]) => node.startsWith('ovs:guide/'))
    .sort((a, b) =>
      guidePriority(a[0]) - guidePriority(b[0])
      || a[0].localeCompare(b[0])
    );
  return [
    ...categories,
    ...guides.slice(0, MAX_GUIDES_PER_COMMIT)
  ];
}

function guidePriority(node) {
  const slug = node.slice('ovs:guide/'.length);
  return FIRST_PRESENTATION_GUIDES.has(slug) ? 0 : 1;
}

function yearFrom(value) {
  const match = String(value || '').match(/\b(20\d{2}|19\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function categoryThreshold(id, currentYear) {
  return HIGH_CHANGE.has(id) ? currentYear - 2 : currentYear - 3;
}

function staleEntries(maps) {
  if (!fs.existsSync(LENSES_DIR)) return [];
  const currentYear = Number(today().slice(0, 4));
  const rowsByLens = new Map();

  for (const name of fs.readdirSync(LENSES_DIR).sort()) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(LENSES_DIR, name);
    let ds;
    try {
      ds = readJson(file);
    } catch {
      continue;
    }
    if (ds.meta && ds.meta.productBase) continue;
    const id = ds.meta && ds.meta.id;
    if (!id || !maps.byId.has(id)) continue;
    const threshold = categoryThreshold(id, currentYear);

    for (const product of ds.products || []) {
      const scores = product.scores || {};
      const provenance = product.provenance || {};
      for (const key of Object.keys(scores)) {
        const pv = provenance[key];
        if (!pv || typeof pv !== 'object') continue;
        const year = yearFrom(pv.asof);
        if (year == null || year > threshold) continue;
        const row = {
          lens: id,
          year,
          source: pv.source || '',
          note: pv.note || '',
          product: product.name || product.code || 'an entry',
          criterion: key
        };
        if (!rowsByLens.has(id)) rowsByLens.set(id, []);
        rowsByLens.get(id).push(row);
      }
    }
  }

  const out = [];
  for (const [id, rows] of rowsByLens.entries()) {
    rows.sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.product.localeCompare(b.product));
    const oldest = rows[0];
    const label = maps.byId.get(id).label;
    out.push({
      date: today(),
      node: `ovs:cat/${id}`,
      kind: 'stale',
      what: `${rows.length} ${pulseLabel(label, `ovs:cat/${id}`)} source${rows.length === 1 ? '' : 's'} need${rows.length === 1 ? 's' : ''} a fresher check: ${oldest.product}${oldest.source ? ` (${sourceName(oldest.source)})` : ''}.`,
      source: oldest.source || undefined
    });
  }

  return out.sort((a, b) =>
    (Number(FIRST_USER.has(b.node.slice('ovs:cat/'.length))) - Number(FIRST_USER.has(a.node.slice('ovs:cat/'.length))))
    || a.node.localeCompare(b.node)
  );
}

function sortEntries(entries) {
  return entries.sort((a, b) =>
    b.date.localeCompare(a.date)
    || kindRank(a.kind) - kindRank(b.kind)
    || a.node.localeCompare(b.node)
    || a.what.localeCompare(b.what)
  );
}

function kindRank(kind) {
  return { stale: 0, added: 1, corrected: 2, contested: 3 }[kind] ?? 9;
}

function buildAll() {
  const maps = categoryMaps();
  const candidates = [
    ...staleEntries(maps),
    ...recentGitEntries(maps)
  ].filter(entry => ALLOWED_KINDS.has(entry.kind));

  const deduped = [];
  const seen = new Set();
  for (const entry of sortEntries(candidates)) {
    const key = `${entry.date}|${entry.node}|${entry.kind}|${entry.what}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const clean = {};
    for (const [k, v] of Object.entries(entry)) {
      if (v !== undefined && v !== '') clean[k] = v;
    }
    deduped.push(clean);
  }

  const entries = deduped.slice(0, MAX_ENTRIES);
  return {
    format: 'ovs-pulse',
    version: '0.1',
    built: today(),
    windowDays: WINDOW_DAYS,
    entries,
    truncated: Math.max(0, deduped.length - entries.length)
  };
}

function writeOutput(pulse) {
  fs.writeFileSync(OUT, formatJson(pulse));
}

function checkOutput(pulse) {
  if (!fs.existsSync(OUT)) return ['app/data/pulse.json is missing'];
  return fs.readFileSync(OUT, 'utf8') === formatJson(pulse) ? [] : ['app/data/pulse.json'];
}

function main() {
  try {
    const pulse = buildAll();
    if (process.argv.includes('--check')) {
      const drift = checkOutput(pulse);
      if (drift.length) {
        console.log('build_pulse: generated output is stale');
        for (const item of drift) console.log('  ' + item);
        process.exit(1);
      }
      console.log(`build_pulse: output current (${pulse.entries.length} entries, ${pulse.truncated} truncated)`);
      return;
    }
    writeOutput(pulse);
    console.log(`build_pulse: wrote app/data/pulse.json (${pulse.entries.length} entries, ${pulse.truncated} truncated)`);
  } catch (err) {
    console.error('build_pulse FAILED:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  buildAll,
  ALLOWED_KINDS
};
