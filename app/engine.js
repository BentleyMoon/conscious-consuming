/* The Open Values Engine — the domain-agnostic core of Conscious Consuming, extracted as the reference
   implementation of the Open Values Standard v0.1 (docs/STANDARD-v0.md). PURE: no DOM, no globals, no I/O.
   It ranks ANY entities-with-criteria by ANY weighting, transparently. This file is the first brick of
   the Values Layer: the same engine can power a different site behind a different UI (docs/THE-VALUES-LAYER.md).
   Plain script (no build): attaches to window.CC.engine, and exports for Node/library use. */
(function (root) {
  'use strict';

  // The neutral confidence floor: below this share of your weighted axes having data, we withhold the
  // score (it would be mostly a guess) rather than fake one.
  const MIN_COVERAGE = 0.25;

  // The value vocabulary (Standard v0 §4): ~8 universal themes a person weights once, that DERIVE the
  // per-criterion weights — so values travel across every lens. Defaults all-3 (= Balanced/neutral).
  const THEMES = [
    { id: 'planet',  label: 'Planet',      icon: '🌍', blurb: 'environment, waste, durability' },
    { id: 'people',  label: 'People',      icon: '🤝', blurb: 'fair labor, ethics, impact' },
    { id: 'health',  label: 'Health',      icon: '❤️', blurb: 'nutrition, safety, low-tox' },
    { id: 'honesty', label: 'Honesty',     icon: '🔍', blurb: 'transparency, independence' },
    { id: 'privacy', label: 'Privacy',     icon: '🛡️', blurb: 'data, openness, control' },
    { id: 'animals', label: 'Animals',     icon: '🐾', blurb: 'cruelty-free, vegan' },
    { id: 'cost',    label: 'Cost & ease', icon: '💸', blurb: 'affordable, low-fee, easy' },
    { id: 'local',   label: 'Local',       icon: '🏘️', blurb: 'independent, community, co-ops' }
  ];

  // criterion key → theme. Reusing a key auto-joins an entity to the Discover facets AND this map.
  const KEY2THEME = {
    environment: 'planet', forest: 'planet', packaging: 'planet', palm_oil: 'planet', organic: 'planet', durability: 'planet', repairability: 'planet', longevity: 'planet',
    processing: 'health', nutrition_grade: 'health', protein: 'health', low_sugar: 'health', health: 'health', safety: 'health',
    ethics: 'people', labor: 'people', artist_pay: 'people', impact: 'people', ways_to_help: 'people',
    transparency: 'honesty', independence: 'honesty', nonprofit: 'honesty', certification: 'honesty', depth: 'honesty',
    privacy: 'privacy', openness: 'privacy', jurisdiction: 'privacy', security: 'privacy',
    vegan: 'animals', cruelty_free: 'animals',
    economical: 'cost', fees: 'cost', price: 'cost', accessibility: 'cost', catalog: 'cost', selection: 'cost',
    local: 'local', ownership: 'local',
    portability: 'privacy', respect: 'privacy', educational: 'people', calm: 'health'
  };

  // Project a Values Passport (theme → weight) onto a lens's criteria → per-criterion weights.
  // v0.1 (forced by the Kosplora rule-of-three test): the key→theme vocabulary is now an OPTIONAL parameter,
  // so a different instance (e.g. Kosplora's learning themes) can supply its own value vocabulary WITHOUT
  // editing the engine. Defaults to this engine's (Conscious Consuming's) map, so existing callers are unchanged.
  function themeDefaults(criteria, passport, k2t) {
    passport = passport || {}; k2t = k2t || KEY2THEME;
    const w = {};
    for (const cr of criteria) { const th = k2t[cr.key]; w[cr.key] = (th && passport[th] != null) ? passport[th] : 3; } // null-coalesce, not ||, so a deliberate 0 ("ignore") survives
    return w;
  }

  // Safety-grade allergen decision. Absence is never evidence of safety: only an
  // explicit free claim clears an active allergy. Legacy datasets without the
  // evidence payload therefore resolve to no-data and cannot silently pass.
  function allergenStatus(p, tag) {
    const evidence = (p && p.allergenEvidence) || {};
    const declares = evidence.declares || (p && p.allergens) || [];
    const declaredFree = evidence.declaredFree || [];
    if (declares.indexOf(tag) >= 0) return 'declares';
    if (declaredFree.indexOf(tag) >= 0) return 'declared-free';
    return 'no-data';
  }
  function allergenDecision(p, excludes) {
    const statuses = [];
    if (excludes) excludes.forEach(function (tag) { statuses.push({ tag: tag, status: allergenStatus(p, tag) }); });
    return { eligible: statuses.every(function (row) { return row.status === 'declared-free'; }), statuses: statuses };
  }

  // THE RANK (Standard v0 §6). ctx = { criteria, weights, excludes?, minCoverage? }.
  // Returns null when excluded or below the confidence floor; else a transparent Ranking object.
  function score(p, ctx) {
    const criteria = ctx.criteria, weights = ctx.weights || {}, excludes = ctx.excludes;
    const minCov = (ctx.minCoverage == null) ? MIN_COVERAGE : ctx.minCoverage;
    if (excludes && excludes.size && !allergenDecision(p, excludes).eligible) return null;
    let num = 0, ws = 0, all = 0, c = [], nF = 0, nW = 0, cap = null;
    for (const cr of criteria) {
      const w = weights[cr.key] || 0; if (w > 0) { all += w; nW++; }
      const s = p.scores[cr.key];
      if (w > 0 && s != null) {
        num += w * s; ws += w; nF++; c.push([cr.label, w * s]);
        // Non-compensatory veto: an axis YOU weight heavily (≥4) scoring catastrophically low (≤20) caps the fit,
        // so a fully-compensatory mean can't average a dealbreaker away. Only your OWN priorities can cap.
        if (w >= 4 && s <= 20 && (cap == null || s < cap.v)) cap = { label: cr.label, v: s };
      }
    }
    if (!ws || !all) return null;
    const cov = ws / all; if (cov < minCov) return null;
    c.sort(function (a, b) { return b[1] - a[1]; });
    const raw = Math.round(num / ws * cov + 50 * (1 - cov)), capped = cap && raw > 49;
    return { score: capped ? 49 : raw, coverage: cov, why: c.slice(0, 2).map(function (x) { return x[0]; }), facts: nF, wanted: nW, cap: capped ? cap : null };
  }

  // Graded, color-coded "fit" tier — a single summary beats a bare number at a glance (Nutri-Score RCT,
  // N=12,391). "Fit" keeps it values-relative; colors stay calm (no alarming red).
  function scoreTier(v) {
    if (v >= 78) return ['Excellent fit', 'st-hi'];
    if (v >= 60) return ['Strong fit', 'st-good'];
    if (v >= 45) return ['Mixed fit', 'st-mid'];
    return ['Weak fit', 'st-low'];
  }

  // The weakest weighted axis — a weighted mean is fully compensatory, so a high score can hide a low axis (EU JRC).
  function weakestAxis(p, ctx) {
    const criteria = ctx.criteria, weights = ctx.weights || {};
    let lo = null;
    for (const cr of criteria) { const w = weights[cr.key] || 0, s = p.scores[cr.key]; if (w > 0 && s != null && (lo == null || s < lo[1])) lo = [cr.label, s]; }
    return lo;
  }

  // An "assessed" sub-score is a judgement, not a measurement — render it as a coarse BAND (never 2-digit
  // precision), and soften its bar, so 92 vs 95 can't fake a distinction. Measured/certified keep exact facts.
  function band(v) { return v >= 80 ? ['Strong', 'bd-hi'] : v >= 60 ? ['Good', 'bd-good'] : v >= 40 ? ['Fair', 'bd-mid'] : v >= 20 ? ['Limited', 'bd-low'] : ['Poor', 'bd-poor']; }
  function bandFill(v) { return v >= 80 ? 90 : v >= 60 ? 70 : v >= 40 ? 50 : v >= 20 ? 30 : 12; }

  // Provenance is either a legacy string (a bare note) or {note,source,asof} — a per-claim citation with a date.
  function provOf(p, key) {
    const pv = p.provenance && p.provenance[key];
    if (pv && typeof pv === 'object') return { note: pv.note || '', source: pv.source || '', asof: pv.asof || '' };
    return { note: pv || '', source: '', asof: '' };
  }

  // --- K2: the SHARED CORE beyond the math — the passport (interop) + the verdict (the shell's computation),
  // so every instance consumes ONE core, not a copy. The DOM/skin stays per-instance (that is L3, meant to differ). ---

  // The shared universal value vocabulary — the cross-instance bridge (docs/VALUES-PASSPORT.md).
  const UNIVERSAL = ['planet', 'people', 'openness', 'access', 'wellbeing', 'autonomy', 'animals', 'community', 'quality', 'joy'];

  // Build an Open Values Passport from an instance's theme weights, via its theme→universal map.
  function passportFrom(weights, themeToUniversal, source) {
    weights = weights || {}; themeToUniversal = themeToUniversal || {};
    const values = {};
    for (const id in weights) { const u = themeToUniversal[id] || id; values[u] = weights[id]; }
    return { format: 'open-values-passport', version: '0.1', source: source || '', values: values };
  }
  // Read a passport into an instance's LOCAL theme weights, via its universal→localTheme map. Returns
  // { weights, applied, carried, dropped }. carried = prioritised (≥4) values that found a local home here
  // (each { universal, local, weight }); dropped = prioritised values with NO expression in this space —
  // surfaced HONESTLY (so "your values follow you" never silently drops or fakes what doesn't apply here).
  // applied (kept for back-compat) = the universals in carried.
  function passportApply(passport, universalToLocal, base) {
    const out = Object.assign({}, base || {}), applied = [], carried = [], dropped = [];
    if (passport && passport.values) {
      for (const u in passport.values) {
        const w = passport.values[u], k = universalToLocal[u];
        if (k) {
          if (out[k] == null || w > out[k]) out[k] = w;                 // raise-toward: augment a priority, never erase one
          if (w >= 4) { applied.push(u); carried.push({ universal: u, local: k, weight: w }); }
        } else if (w >= 4) {
          dropped.push({ universal: u, weight: w });                    // a value you prioritised that this space can't express — said, not hidden
        }
      }
    }
    return { weights: out, applied: applied, carried: carried, dropped: dropped };
  }

  // A complete VERDICT for one entity — the shared computation behind every instance's detail view.
  // ctx = { criteria, weights, excludes? }. Returns { score, tier, why, coverage, cap, reason, bands } or null.
  function verdict(entity, ctx) {
    const s = score(entity, ctx); if (!s) return null;
    const criteria = ctx.criteria;
    let reason = null, fallback = null;
    for (const cr of criteria) {
      const v = entity.scores ? entity.scores[cr.key] : null; if (v == null) continue;
      const pr = provOf(entity, cr.key), dec = Math.abs(v - 50);
      if (!fallback || dec > Math.abs(fallback.v - 50)) fallback = { label: cr.label, v: v, band: band(v), note: pr.note, source: null, asof: null };
      if (pr.source && (!reason || dec > Math.abs(reason.v - 50))) reason = { label: cr.label, v: v, band: band(v), note: pr.note, source: pr.source, asof: pr.asof };
    }
    const bands = [];
    for (const cr of criteria) {
      const v = entity.scores ? entity.scores[cr.key] : null; if (v == null) continue;
      const pr = provOf(entity, cr.key);
      bands.push({ key: cr.key, label: cr.label, v: v, band: band(v), fill: bandFill(v), note: pr.note, source: pr.source, asof: pr.asof, tier: cr.tier || 'assessed' });
    }
    return { score: s.score, tier: scoreTier(s.score), why: s.why, coverage: s.coverage, cap: s.cap, reason: reason || fallback, bands: bands };
  }

  // --- K4: FEDERATION — many individual passports become a collective stance, computed LOCALLY and
  // reproducibly, with NO server to capture, subpoena, or shut down. The collective is itself a passport
  // (it carries its shared values into any instance). Surfaces dissent HONESTLY — never manufactures consensus.
  // passports: [{ values:{universal:0..5}, nick?, source? }]; returns the merged collective + a drop-in passport. ---
  function mergePassports(passports, name) {
    passports = (passports || []).filter(function (p) { return p && p.values; });
    const n = passports.length, values = {}, agreement = {}, members = [];
    passports.forEach(function (p, i) { members.push(p.nick || p.source || ('member ' + (i + 1))); });
    for (const u of UNIVERSAL) {
      const xs = [];
      for (const p of passports) { const v = p.values[u]; if (v != null) xs.push(+v); }
      if (!xs.length) continue;                                  // the group hasn't spoken on this value — omit it, don't fake a 0
      let sum = 0; for (const x of xs) sum += x; const mean = sum / xs.length;
      let varc = 0; for (const x of xs) varc += (x - mean) * (x - mean); const sd = Math.sqrt(varc / xs.length);
      values[u] = Math.round(mean * 100) / 100;
      // consensus 1 = unanimous, 0 = maximally split (half at 0, half at 5 → sd 2.5). Dissent is reported, not hidden.
      agreement[u] = { mean: values[u], sd: Math.round(sd * 100) / 100, consensus: Math.max(0, Math.round((1 - sd / 2.5) * 100) / 100), voices: xs.length };
    }
    const dissent = Object.keys(agreement).sort(function (a, b) { return agreement[a].consensus - agreement[b].consensus; });
    const passport = { format: 'open-values-passport', version: '0.1', source: name || 'an assembly', values: values };
    return { format: 'open-values-collective', version: '0.1', name: name || 'an assembly', n: n, members: members, values: values, agreement: agreement, dissent: dissent, passport: passport };
  }

  // --- K4b: FEDERATION OF FACTS — a lens is a file, so communities can FORK it, PATCH it, and MERGE patches
  // reproducibly and with attribution, by passing files (Git-for-data). No server owns the facts. ---

  // Federation works on a lens's ENTITY array — `resources` in portable lenses, `products` in CC's own datasets.
  // Treat them uniformly so any sourced lens (including Conscious Consuming's categories) can hash, merge, and diff.
  function entField(L){ return (L && L.resources) ? 'resources' : ((L && L.products) ? 'products' : 'resources'); }
  function ents(L){ return (L && (L.resources || L.products)) || []; }
  // A cheap, deterministic fingerprint of a lens's facts (no crypto, no Date) — so a fork or a merged lens can be
  // cited and verified ("lens X at #h"). Stable across runs; changes whenever any score or entity changes.
  function lensHash(lens) {
    const rs = ents(lens);
    let s = '';
    for (const r of rs) { s += '|' + r.code + ':'; const sc = r.scores || {}, keys = Object.keys(sc).sort(); for (const k of keys) s += k + '=' + sc[k] + ','; }
    let h = 2166136261;                                          // FNV-1a-style rolling hash
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  // Apply an ordered list of lens patches to a base lens → { lens, log }. PURE & reproducible (same inputs →
  // same output). Every change is logged with its author + source, so facts stay contestable and accountable.
  // patch = { by?, note?, ops:[ {op:'set-score', code,key,value,source?,asof?,note?} | {op:'add-entity', entity, source?} ] }
  function mergeLens(baseLens, patches) {
    const lens = JSON.parse(JSON.stringify(baseLens || {}));
    const FIELD = entField(lens);
    lens[FIELD] = lens[FIELD] || [];
    const byCode = {}; for (const r of lens[FIELD]) byCode[r.code] = r;
    const log = [];
    const baseHash = lensHash(lens);                            // the version these patches were meant to target
    const list = [].concat(patches || []);
    for (const patch of list) {
      const by = (patch && patch.by) || 'anonymous', ops = (patch && patch.ops) || [];
      // Provenance check (K4 hardening): a patch may declare the lens hash it was authored against. We still apply
      // it, but FLAG a mismatch — so you never silently merge a patch made for a different version of the facts.
      if (patch && patch.baseHash && patch.baseHash !== baseHash) log.push({ by: by, status: 'base-mismatch', expected: patch.baseHash, got: baseHash });
      for (const op of ops) {
        if (!op || !op.op) continue;
        if (op.op === 'set-score') {
          const r = byCode[op.code];
          if (!r) { log.push({ by: by, op: 'set-score', code: op.code, status: 'no-such-entity' }); continue; }
          r.scores = r.scores || {}; r.provenance = r.provenance || {};
          const from = (r.scores[op.key] == null ? null : r.scores[op.key]);
          const v = Math.max(0, Math.min(100, +op.value));
          const oldNote = (typeof r.provenance[op.key] === 'object' && r.provenance[op.key]) ? r.provenance[op.key].note : r.provenance[op.key];
          r.scores[op.key] = v;
          r.provenance[op.key] = { note: op.note || oldNote || '', source: op.source || '', asof: op.asof || '' };
          log.push({ by: by, op: 'set-score', code: op.code, key: op.key, from: from, to: v, source: op.source || '' });
        } else if (op.op === 'add-entity') {
          const en = op.entity;
          if (!en || !en.code) { log.push({ by: by, op: 'add-entity', status: 'invalid' }); continue; }
          if (byCode[en.code]) { log.push({ by: by, op: 'add-entity', code: en.code, status: 'already-exists' }); continue; }
          const clone = JSON.parse(JSON.stringify(en));
          lens[FIELD].push(clone); byCode[en.code] = clone;
          log.push({ by: by, op: 'add-entity', code: en.code, name: en.name || en.code, source: op.source || '' });
        }
      }
    }
    return { lens: lens, log: log };
  }

  // Stamp a derived lens with its parentage (the fork's provenance) — so lineage travels with the file.
  function forkLens(lens, metaPatch) {
    const out = JSON.parse(JSON.stringify(lens || {}));
    out.meta = Object.assign({}, out.meta || {}, metaPatch || {});
    out.meta.forkedFrom = { id: (lens && lens.meta && lens.meta.id) || '', hash: lensHash(lens) };
    return out;
  }

  // The inverse of mergeLens: the patch ops that turn base → derived (added entities + changed scores), so
  // "fork it, edit it, export just your changes" works — diff your fork against the original, send the small patch.
  function diffLens(base, derived) {
    const ops = [], baseByCode = {};
    for (const r of ents(base)) baseByCode[r.code] = r;
    for (const r of ents(derived)) {
      const b = baseByCode[r.code];
      if (!b) { ops.push({ op: 'add-entity', entity: JSON.parse(JSON.stringify(r)) }); continue; }
      const sc = r.scores || {}, bs = b.scores || {};
      for (const k in sc) {
        if (sc[k] !== bs[k]) {
          const pv = (r.provenance && r.provenance[k]) || {}, obj = (typeof pv === 'object');
          ops.push({ op: 'set-score', code: r.code, key: k, value: sc[k], source: (obj ? pv.source : '') || '', asof: (obj ? pv.asof : '') || '', note: (obj ? pv.note : pv) || '' });
        }
      }
    }
    return ops;
  }

  // --- K4c: FEDERATION OF ACTION — a collective's values + a lens → a shared, DERIVED slate: where the group
  // puts its money (endorse) and where it moves money from (divest). Divest fires ONLY where an option fails a
  // value the group weights heavily (≥4) badly (≤ conflictMax) — with the reason + source attached, never a bare
  // call-out. Reproducible from (passport + lens); carries dissent so it can't fake unanimity. ---
  function buildSlate(passport, lens, opts) {
    opts = opts || {}; lens = lens || {};
    const criteria = lens.criteria || [], resources = lens.resources || [];
    const conflictMax = (opts.conflictMax == null) ? 25 : opts.conflictMax;
    // REPLACE semantics (empty base): for a slate the passport IS the group's whole stance, so it fully
    // determines the weighting — including values it deliberately sets LOW. Unmapped themes fall back to 3 below.
    const applied = passportApply(passport || {}, lens.universalToLocal || {}, {});
    const weights = themeDefaults(criteria, applied.weights, lens.key2theme);
    const ctx = { criteria: criteria, weights: weights };
    const heavy = {}; for (const cr of criteria) { if ((weights[cr.key] || 0) >= 4) heavy[cr.key] = true; }
    const items = [];
    for (const r of resources) {
      const V = verdict(r, ctx); if (!V) continue;
      const conflicts = [];                                       // heavily-weighted values this option fails badly — each with its receipt
      for (const cr of criteria) {
        if (!heavy[cr.key]) continue;
        const v = r.scores ? r.scores[cr.key] : null;
        if (v != null && v <= conflictMax) { const pv = provOf(r, cr.key); conflicts.push({ label: cr.label, key: cr.key, v: v, source: pv.source, note: pv.note, asof: pv.asof }); }
      }
      conflicts.sort(function (a, b) { return a.v - b.v; });
      items.push({ code: r.code, name: r.name, brand: r.brand, score: V.score, tier: V.tier, why: V.why, reason: V.reason, conflicts: conflicts });
    }
    items.sort(function (a, b) { return b.score - a.score; });
    const endorse = items.filter(function (x) { return x.score >= (opts.endorseMin == null ? 60 : opts.endorseMin); }).slice(0, opts.endorse || 3);
    const divest = items.filter(function (x) { return x.conflicts.length > 0; }).sort(function (a, b) { return a.score - b.score; }).slice(0, opts.divest || 3);
    return {
      format: 'open-values-slate', version: '0.1',
      lens: (lens.meta && lens.meta.id) || '', lensTitle: (lens.meta && lens.meta.title) || '', lensHash: lensHash(lens),
      by: (passport && (passport.name || passport.source)) || '', values: (passport && passport.values) || {}, applied: applied.applied,
      dissent: opts.dissent || [], endorse: endorse, divest: divest, ranked: items
    };
  }

  // --- INTEROP (the Commons ↔ the Standard): turn a community's AGGREGATED ratings into a forkable lens, so the
  // crowd's collective judgement becomes first-class, values-rankable FACTS — forkable in the Workshop, actionable
  // in a Slate, ranked by anyone's passport. The discussion layer (a server) and the decision layer (files) meet
  // on one data shape. ratings = [{ code, name, brand?, scores:{critKey:0..100}, voters? }]; opts = { id, title, criteria, ... }. ---
  function lensFromRatings(ratings, opts) {
    opts = opts || {}; ratings = ratings || [];
    const criteria = opts.criteria || [], asof = opts.asof || '', src = opts.source || 'the Commons', resources = [];
    for (const r of ratings) {
      if (!r || r.code == null) continue;
      const scores = {}, provenance = {}, sc = r.scores || {};
      for (const cr of criteria) {
        const v = sc[cr.key]; if (v == null) continue;
        scores[cr.key] = Math.max(0, Math.min(100, +v));
        provenance[cr.key] = { note: 'Community rating' + (r.voters ? ' from ' + r.voters + ' voters' : ''), source: src, asof: asof };
      }
      resources.push({ code: String(r.code), name: r.name || String(r.code), brand: r.brand || '', scores: scores, provenance: provenance });
    }
    let themes = opts.themes, k2t = opts.key2theme;
    if (!themes) themes = criteria.map(function (c) { return { id: c.key, label: c.label, blurb: '' }; }); // each criterion is its own value
    if (!k2t) { k2t = {}; for (const c of criteria) k2t[c.key] = c.key; }
    return {
      meta: { id: opts.id || 'commons', title: opts.title || 'Community Commons', attribution: 'Aggregated community ratings — the Commons. Weighted on your device by your own values.' },
      criteria: criteria, themes: themes, key2theme: k2t, universalToLocal: opts.universalToLocal || {}, resources: resources
    };
  }

  // ── THE WEAVE (v0.10): the ontology as a GRAPH with no center. Nodes are lens entities; edges are taxonomic
  //    (from the ontology), sourced (a forkable open-values-edges file), or COMPUTED — and the headline
  //    capability, cross-domain ANALOGY ("the Patagonia of phones"), falls straight out of the same theme
  //    projection the values spine uses. No new data, no server. PURE & Node-testable. (docs/THE-WEAVE.md) ──

  // Project an entity's criterion scores into a value SIGNATURE over themes (default CC's KEY2THEME): the mean
  // score of the criteria mapping to each theme. Only themes with data appear — a signature is never faked.
  function signature(entity, k2t) {
    k2t = k2t || KEY2THEME;
    const sums = {}, counts = {}, sc = (entity && entity.scores) || {};
    for (const key in sc) { const v = sc[key]; if (v == null) continue; const th = k2t[key]; if (!th) continue; sums[th] = (sums[th] || 0) + v; counts[th] = (counts[th] || 0) + 1; }
    const sig = {}; for (const th in sums) sig[th] = sums[th] / counts[th]; return sig;
  }
  // RMS distance between two signatures over the themes they BOTH carry (0 = identical). null when they share
  // fewer than minOverlap themes — too little in common to compare honestly.
  function sigDistance(a, b, minOverlap) {
    minOverlap = minOverlap || 3; let n = 0, sum = 0;
    for (const th in a) { if (b[th] == null) continue; const d = a[th] - b[th]; sum += d * d; n++; }
    return (n < minOverlap) ? null : Math.sqrt(sum / n);
  }
  // The metaphor primitive: the nodes most like `node` but in a DIFFERENT bucket (category/domain) — the
  // computed "X of Y". Reuses signature() — the same cross-domain projection as the passport spine; this is
  // values-native analogy, returned labelled `computed`, never asserted. → [{ node, distance, resemblance }].
  function analogues(node, pool, opts) {
    opts = opts || {};
    const k2t = opts.key2theme || KEY2THEME, k = opts.k || 3, maxDist = (opts.maxDistance == null ? 35 : opts.maxDistance);
    const bucketOf = opts.bucketOf || function (x) { return x.category || x.domain || ''; };
    const here = bucketOf(node), sa = signature(node, k2t), out = [];
    for (const cand of (pool || [])) {
      if (cand === node || (node.id && cand.id === node.id)) continue;
      if (bucketOf(cand) === here) continue;                       // analogy is CROSS-bucket by definition
      const d = sigDistance(sa, signature(cand, k2t), opts.minOverlap);
      if (d == null || d > maxDist) continue;
      out.push({ node: cand, distance: Math.round(d * 10) / 10, resemblance: Math.max(0, Math.round(100 - d)), computed: true });
    }
    out.sort(function (x, y) { return x.distance - y.distance; });
    return out.slice(0, k);
  }
  // Build a light graph index from lenses (node-sets) + the ontology (taxonomic edges) + sourced edge files.
  // Nodes are thin refs (heavy facts stay in the lenses). PURE; rebuildable on-device with no server.
  function buildGraph(opts) {
    opts = opts || {};
    const lenses = opts.lenses || [], edgeFiles = opts.edges || [], ont = opts.ontology || null;
    const nodesById = {}, edgesByFrom = {}, byRel = {};
    function addEdge(e) { if (!e || !e.from || !e.rel || !e.to) return; (edgesByFrom[e.from] = edgesByFrom[e.from] || []).push(e); (byRel[e.rel] = byRel[e.rel] || []).push(e); }
    for (const L of lenses) {
      const cat = (L.meta && L.meta.id) || '', dom = (L.meta && L.meta.domain) || '';
      for (const ent of (L.products || L.resources || [])) {
        const id = 'ovs:' + cat + '/' + ent.code;
        nodesById[id] = { id: id, kind: 'entity', label: ent.name || ent.code, category: cat, domain: dom, scores: ent.scores || {}, ids: ent.ids || {} };
      }
    }
    if (ont && ont.domains) for (const d of ont.domains) for (const c of (d.categories || [])) { if (c.cid) addEdge({ from: 'ovs:cat/' + c.cid, rel: 'in-domain', to: 'ovs:domain/' + (d.label || ''), computed: true }); }
    for (const f of (edgeFiles || [])) for (const e of ((f && f.edges) || [])) addEdge(e);
    return {
      nodesById: nodesById, edgesByFrom: edgesByFrom, edgesByRel: byRel,
      node: function (id) { return nodesById[id] || null; },
      nodes: function () { const a = []; for (const k in nodesById) a.push(nodesById[k]); return a; },
      neighbors: function (id, rel) { return (edgesByFrom[id] || []).filter(function (e) { return !rel || e.rel === rel; }); }
    };
  }

  // FEDERATION of the Weave (G2): edge-files merge exactly as `mergeLens` merges facts — by `(from,rel,to)`
  // key, with provenance, dedupe, and an optional `baseHash` mismatch flag. Content-addressed via `edgesHash`,
  // so an edge-set can be cited + verified. PURE & reproducible; the graph federates by file, with no center.
  function edgesHash(ef) {
    const es = (ef && ef.edges) || [];
    const keys = es.map(function (e) { return e.from + '|' + e.rel + '|' + e.to; }).sort();
    let s = keys.join(','), h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function mergeGraph(baseFile, patches) {
    const file = JSON.parse(JSON.stringify(baseFile || { edges: [] }));
    if (!file.edges) file.edges = [];
    const key = function (e) { return e.from + '|' + e.rel + '|' + e.to; };
    const seen = {}; for (const e of file.edges) seen[key(e)] = e;
    const log = [], baseH = edgesHash(file), list = [].concat(patches || []);
    for (const patch of list) {
      const by = (patch && patch.by) || 'anonymous';
      if (patch && patch.baseHash && patch.baseHash !== baseH) log.push({ by: by, status: 'base-mismatch', expected: patch.baseHash, got: baseH });
      for (const e of ((patch && patch.edges) || [])) {
        if (!e || !e.from || !e.rel || !e.to) { log.push({ by: by, status: 'invalid' }); continue; }
        const k = key(e);
        if (seen[k]) { log.push({ by: by, status: 'duplicate', edge: k }); continue; }
        const clone = JSON.parse(JSON.stringify(e)); file.edges.push(clone); seen[k] = clone;
        log.push({ by: by, op: 'add-edge', from: e.from, rel: e.rel, to: e.to, source: e.source || '' });
      }
    }
    return { file: file, log: log };
  }
  // CROSS-PLATFORM (G2): the JSON-LD @context maps ovs relations onto the open-data web (schema.org / Wikidata),
  // and `toJSONLD` exports any node + its edges as web-citable linked data — how a CC node JOINS the graph the
  // rest of the web already shares (the "values overlay"): no server, just shared identifiers.
  const WEAVE_CONTEXT = {
    '@vocab': 'https://schema.org/', 'ovs': 'https://openvalues.dev/ns#',
    'alternative-to': 'schema:isSimilarTo', 'owned-by': 'schema:parentOrganization',
    'parent-of': 'schema:subOrganization', 'made-by': 'schema:manufacturer',
    'supplies': 'ovs:supplies', 'certified-by': 'ovs:certifiedBy',
    'analogous-to': 'ovs:analogousTo', 'in-domain': 'ovs:inDomain'
  };
  function toJSONLD(node, edges) {
    if (!node) return null;
    const o = { '@context': WEAVE_CONTEXT, '@id': node.id, '@type': 'Thing', 'name': node.label || node.id };
    const ids = node.ids || {}, same = [];
    if (ids.wikidata) same.push('http://www.wikidata.org/entity/' + ids.wikidata);
    if (ids.off) same.push('https://world.openfoodfacts.org/product/' + ids.off);
    if (same.length) o.sameAs = (same.length > 1 ? same : same[0]);
    for (const e of (edges || [])) { if (e.from !== node.id) continue; (o[e.rel] = o[e.rel] || []).push({ '@id': e.to }); }
    return o;
  }

  // COMMUNITY-AUTHORED INDEXES — anyone can author their own way of slicing the commons ("the things strong on
  // the values I care about"), saved as a forkable `open-values-index` file, shared and forked, with NO official
  // taxonomy and NO server. `indexMatch` filters by theme-signature (reusing signature()); the caller ranks by
  // the passport. PURE & testable — indexing as a first-class, federatable artifact (docs/THE-WEAVE.md).
  function indexMatch(entity, index, k2t) {
    const vals = (index && index.values) || []; if (!vals.length) return false;     // no values chosen → not an index
    const sig = signature(entity, k2t), min = (index && index.min != null) ? index.min : 60;
    for (const v of vals) { if (sig[v] == null || sig[v] < min) return false; }      // must be strong on EVERY chosen value
    return true;
  }
  function runIndex(index, items, k2t) {
    const out = []; for (const it of (items || [])) { if (indexMatch(it, index, k2t)) out.push(it); } return out;
  }

  // CROSS-INSTANCE WORMHOLE — an entity's values-twin in ANOTHER instance of the standard, via the spine: read
  // the entity's signature as a passport, carry it through the universal vocabulary into the target instance, and
  // return the target's highest-scoring entity under those values. "This bank's twin in the world of learning."
  // PURE; reuses passportFrom/passportApply/themeDefaults/score. carried/dropped report what bridged, honestly.
  function twinOf(entity, fromMap, targetLens, k2t) {
    targetLens = targetLens || {};
    const sig = signature(entity, k2t), weights = {};
    for (const th in sig) weights[th] = Math.max(0, Math.min(5, Math.round(sig[th] / 20)));
    const applied = passportApply(passportFrom(weights, fromMap || {}, 'entity'), targetLens.universalToLocal || {}, {});
    const w = themeDefaults(targetLens.criteria || [], applied.weights, targetLens.key2theme);
    let best = null;
    for (const r of (targetLens.resources || [])) { const s = score(r, { criteria: targetLens.criteria || [], weights: w }); if (s && (!best || s.score > best.score)) best = { node: r, score: s.score }; }
    if (best) { best.carried = applied.carried; best.dropped = applied.dropped; }
    return best;
  }

  const engine = {
    VERSION: '0.10', MIN_COVERAGE: MIN_COVERAGE, THEMES: THEMES, KEY2THEME: KEY2THEME,
    themeDefaults: themeDefaults, score: score, scoreTier: scoreTier, weakestAxis: weakestAxis,
    allergenStatus: allergenStatus, allergenDecision: allergenDecision,
    band: band, bandFill: bandFill, provOf: provOf,
    UNIVERSAL: UNIVERSAL, passportFrom: passportFrom, passportApply: passportApply, verdict: verdict,
    mergePassports: mergePassports,
    lensHash: lensHash, mergeLens: mergeLens, forkLens: forkLens, diffLens: diffLens,
    buildSlate: buildSlate, lensFromRatings: lensFromRatings,
    signature: signature, sigDistance: sigDistance, analogues: analogues, buildGraph: buildGraph,
    edgesHash: edgesHash, mergeGraph: mergeGraph, WEAVE_CONTEXT: WEAVE_CONTEXT, toJSONLD: toJSONLD,
    indexMatch: indexMatch, runIndex: runIndex, twinOf: twinOf
  };

  root.CC = root.CC || {};
  root.CC.engine = engine;
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
})(typeof self !== 'undefined' ? self : this);
