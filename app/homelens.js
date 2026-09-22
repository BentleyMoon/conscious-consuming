/* The lens: every decision on one plate, the spot under your pointer opens up, and scrolling
   walks the categorical ontology from very broad to specific.

   VERSION TWELVE makes the experiment learnable without making the canvas carry every control.
   Both projections now publish one semantic control contract to the DOM: their named depth steps,
   a clickable ontology trail, a stable semantic snapshot, and a reset. Switching projections keeps
   the same decision as its anchor instead of reusing a meaningless fractional x-position; returning
   later restores stable ontology ids rather than coordinates that can drift when the catalogue grows.

   VERSION ELEVEN makes Spatial a projection of the published presentation ontology rather than a
   convenient aggregation of legacy group labels. Its stable rungs are needs -> areas -> kinds ->
   decisions -> evidence, derived from ontology.presentation and kept in authored order. Descent
   lands on the chosen node's first child and ascent returns to its actual parent, so the thread is
   never lost. A DOM wayfinding trail mirrors the canvas for sighted and assistive-technology users.
   Fisheye gains a persistent eight-need overview and a velocity-reporting centre reticle: fast
   travel can distort the field without erasing where the reader is.

   VERSION TEN makes the two useful projections explicit instead of forcing one compromise to do
   both jobs. Spatial is the default and opens on the missing middle rung: the named areas inside
   the eight needs. It is a stable atlas that descends needs -> areas -> decisions -> evidence.
   Fisheye is optional and restores version six's centre-steered traversal: direction chooses the
   path, distance from the quiet centre chooses speed, the focused decision stays centred, and
   speed-coupled flattening reduces hunting. Both projections use the same world, focus, colours,
   routes, filters and evidence. Switching the projection never creates a second taxonomy.

   VERSION NINE, correcting version eight's reading of the founder's ask. Scrolling was meant to be
   depth in the CATEGORICAL ontology itself, and the middle of that scale was missing: the rungs
   are needs (8), then the named groups inside them (29, real data: Pantry & cooking, Skin & face,
   Bank & spend), then the decisions (88), then inside one decision, where its published measures
   are the most specific thing the catalogue knows. The receipt is the bottom rung of the taxonomy,
   not an info panel interrupting it. The chip row below the map is the filter and info layer: the
   measure lenses that light carriers, and info criteria that choose what every cell reports.

   VERSION EIGHT, extending the version the founder finally accepted. Three additions, each asked
   for by name: colour carries the foundational need, the wheel travels categorical depth on an
   ontological scale, and filter layers under the map replace the old text-depth labels, which were
   real controls over insufficiently useful criteria.

   COLOUR IS THE NEED. Eight needs, eight hues, spectral order so neighbouring rows never share a
   family: nourish olive, move teal, connect azure, protect indigo, learn violet, care rose,
   give-and-act coral, keep-a-home amber. The ink on every cell is still chosen per cell against
   the composited fill — the painted-pixel lesson from version five — so the palette cannot
   reintroduce the contrast failure.

   SCROLLING IS CATEGORICAL DEPTH, NOT MAGNIFICATION. Three rungs of the ontology itself:
   needs (eight bands, each saying what it holds), decisions (the plate of 88), and inside one
   decision (the focused cell opens its published receipt — each criterion named in plain words
   with how far apart the options actually sit on it). The wheel steps between rungs only while it
   has a rung to step to; at the top rung scrolling up is the page's again, and at the bottom
   scrolling down is too, so the map borrows the wheel exactly as far as it can use it and no
   further. Escape climbs back out. The header names the rung you are on.

   FILTER LAYERS ARE THE MEASURES, WHICH ARE THE ONE FACET THAT CROSSES THE TREE. The old control
   chose how much text every cell showed: names, what differs, how solid. Three levels of the same
   information is not variety. The lenses under the map are built from the criteria the catalogue
   actually measures — climate and nature, animals, health, people and labour, privacy and
   openness, your wallet, built to last — and lighting one keeps every cell in place while the
   decisions that carry that measure stay lit and the rest step back. Nothing hides; the counts on
   each chip are computed from the data at mount, never hand-maintained, so a lens cannot claim
   coverage it does not have.

   CARRIED FROM VERSION SEVEN, because they are the reason it works: the STABLE FOCUS MAPPING
   (pointer position through the uniform slot division, never the distorted drawing — McGuffin &
   Balakrishnan's fixed-slot expansion, the property that separates the dock from the hunting
   menus); everything always fitting the frame; the plate lying flat when the pointer leaves; and
   the one press rule — a press opens a cell only if it was already the focus when the press began
   — one click with hover, look-then-commit in two taps on glass. And from version six's post-
   mortem: API(x) = stakes times spread, a fact about the reader's decision, not our database. */

(function (global) {
  'use strict';
  var CC = global.CC = global.CC || {};

  var HEAD = 26;
  var GUTTER = 84;
  var K_ROW = 1.6, S_ROW = 0.9;
  var K_CELL = 8, S_CELL = 1.4;
  var K_ROW_IN = 3.2, K_CELL_IN = 18;   // inside a decision, the focus needs room for its receipt
  var EASE = 10;
  /* The optional centre-steered view keeps version six's physics. These are rates, not positions:
     a pointer at the edge travels faster, while the quiet centre is a reading place. */
  var FISH_DEAD = 0.16, FISH_SPD_U = 0.85, FISH_SPD_R = 2.6;
  var FISH_ROW_BASE = 44, FISH_ROW_MIN = 17, FISH_CELL_MIN = 13;
  var FISH_K_ROW = 1.5, FISH_K_CELL = 1.9, FISH_S_ROW = 1.15, FISH_S_CELL = 1.5;
  /* One mouse notch is ~100 units but browsers deliver anywhere down to ~75, and a threshold
     above the per-event delta makes every other notch appear dead. 55 sits safely under a single
     notch while still letting a trackpad accumulate rather than machine-gun through the rungs. */
  var WHEEL_STEP = 55;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  /* Eight needs, eight hues, spectral order. One hex each; every fill is this composited over the
     theme background at an alpha, and the label ink is chosen against the composited result, so
     the same table serves light and dark without a second palette to drift. */
  var NEED_COLORS = {
    nourish: '#6b8f3d', move: '#2f9e83', connect: '#2f7fa6', protect: '#5560b0',
    learn: '#8455a8', care: '#b05c72', 'give-and-act': '#c06544', 'keep-a-home': '#a87a2f'
  };

  /* The filter layers. Groups of criteria keys the catalogue actually measures, in the reader's
     words. Membership is computed per decision at mount from its own criteria list — the lens
     definitions name keys, never categories, so a new category joins the right lenses by carrying
     the right measures and an empty lens drops itself. */
  var LENSES = [
    { id: 'climate', label: 'Climate & nature', keys: ['environment', 'palm_oil', 'forest', 'rainforest_alliance', 'packaging'] },
    { id: 'animals', label: 'Animals', keys: ['cruelty_free', 'vegan'] },
    { id: 'health', label: 'Health', keys: ['nutrition_grade', 'low_sugar', 'processing', 'protein', 'organic', 'health'] },
    { id: 'people', label: 'People & labour', keys: ['ethics', 'fair_trade', 'labor', 'artist_pay', 'respect', 'nonprofit'] },
    { id: 'privacy', label: 'Privacy & openness', keys: ['privacy', 'openness', 'transparency', 'security', 'independence'] },
    { id: 'wallet', label: 'Your wallet', keys: ['economical', 'fees', 'price'] },
    /* 'permanence' joined on 2026-08-13. Built to last was about objects: a phone that survives a
       drop, a coat that can be re-stitched. A streaming catalogue that quietly loses the film you
       paid to watch is the same value asked of something with no physical body, and a reader who
       lights this lens because they hate replacing things means it in both senses. */
    { id: 'lasts', label: 'Built to last', keys: ['longevity', 'durability', 'repairability', 'permanence'] }
  ];

  function tokens(el) {
    var cs = getComputedStyle(document.documentElement);
    var read = function (n, fb) { var v = cs.getPropertyValue(n).trim(); return v || fb; };
    return {
      accent: read('--accent', '#1d7a5a'), ink: read('--ink', '#16170f'),
      muted: read('--muted', '#566560'), hint: read('--hint', '#96948a'),
      line: read('--line', '#d8d4c8'), surface: read('--surface', '#fbfaf6'),
      bg: read('--bg', '#F7F3EA'), font: getComputedStyle(el).fontFamily || 'serif'
    };
  }

  function stakesOf(cat) {
    if (cat.type === 'Services') return 5;
    var n = cat.need;
    if (n === 'connect' || n === 'protect' || n === 'move' || n === 'learn' ||
        n === 'keep-a-home' || n === 'give-and-act') return 4;
    if (n === 'care') return 3;
    return 2;
  }
  var STAKES_SAYS = {
    5: 'a service you stay with until you switch',
    4: 'bought rarely and lived with for years',
    3: 'goes on your body, over and over',
    2: 'bought often, and each one small'
  };

  function spreadOf(cat) {
    var reads = cat.decision && cat.decision.reads;
    var crit = (reads && reads.receipt && reads.receipt.criteria) || [];
    if (!crit.length) return 0.5;
    var t = 0;
    for (var i = 0; i < crit.length; i++) t += (crit[i].spread || 0);
    return clamp((t / crit.length) / 100, 0, 1);
  }

  function scentOf(cat) {
    var reads = cat.decision && cat.decision.reads;
    return (reads && reads.text) || '';
  }

  function receiptOf(cat) {
    var reads = cat.decision && cat.decision.reads;
    var crit = (reads && reads.receipt && reads.receipt.criteria) || [];
    return crit.map(function (c) { return { name: c.readsAs || c.criterion, spread: c.spread || 0 }; })
               .sort(function (a, b) { return b.spread - a.spread; });
  }

  function checkableOf(cat) {
    var pp = cat.provenanceProfile || {};
    return pp.entryCount ? (pp.multiSourceEntries || 0) / pp.entryCount : 0;
  }

  function lensesOf(cat) {
    var keys = {};
    for (var i = 0; i < (cat.criteria || []).length; i++) keys[cat.criteria[i].key] = 1;
    var out = {};
    for (var l = 0; l < LENSES.length; l++) {
      for (var k = 0; k < LENSES[l].keys.length; k++) {
        if (keys[LENSES[l].keys[k]]) { out[LENSES[l].id] = 1; break; }
      }
    }
    return out;
  }

  function aggregateNode(id, label, kind, members, children, reads, parent) {
    var api = 0, opts = 0, chk = 0, ec = 0, stakes = 0, spr = 0, lz = {};
    members.forEach(function (m) {
      if (m.api > api) api = m.api;
      if (m.stakes > stakes) stakes = m.stakes;
      spr += m.spread; opts += m.count; chk += m.checkable * m.count; ec += m.count;
      for (var k in m.lenses) lz[k] = 1;
    });
    return {
      id: id, label: label, kind: kind, members: members, children: children || [],
      parentId: parent ? parent.id : null, parentLabel: parent ? parent.label : '',
      api: api, stakes: stakes, spread: members.length ? spr / members.length : 0,
      count: opts, checkable: ec ? chk / ec : 0, lenses: lz,
      scent: reads || members.map(function (m) { return m.label; }).join(', ')
    };
  }

  function buildWorld(catalog, ontology) {
    var byNeed = {}, i;
    for (i = 0; i < catalog.length; i++) {
      var c = catalog[i];
      (byNeed[c.need || 'other'] = byNeed[c.need || 'other'] || []).push(c);
    }
    var needs = (ontology && ontology.needs) || [];
    if (!needs.length) needs = Object.keys(byNeed).map(function (k) { return { id: k, label: k }; });

    /* Resolve the same public presentation tree the generated package uses. Matching against the
       authored source rows, rather than the compact catalogue labels, matters: one label uses an
       ampersand in the ontology and "and" in the index. A cid can occupy two authored paths; this
       map shows each built dataset once, at its first canonical path, exactly as it always has. */
    var placement = {}, placeOrder = 0;
    var presentation = (ontology && ontology.presentation) || {};
    var sourceRows = [];
    ((ontology && ontology.domains) || []).forEach(function (domain) {
      (domain.categories || []).forEach(function (row) {
        var copy = {};
        for (var rk in row) copy[rk] = row[rk];
        copy.domain = domain.label; sourceRows.push(copy);
      });
    });
    function selectorMatches(row, selector) {
      if (row.domain !== selector.domain) return false;
      if (selector.groups && selector.groups.indexOf(row.group) < 0) return false;
      if (selector.labels && selector.labels.indexOf(row.label) < 0) return false;
      return true;
    }
    (presentation.categories || []).forEach(function (area) {
      (area.subcategories || []).forEach(function (family) {
        sourceRows.forEach(function (row) {
          if (!row.cid || placement[row.cid] || row.need !== area.need) return;
          var matches = (family.selectors || []).some(function (selector) { return selectorMatches(row, selector); });
          if (!matches) return;
          placement[row.cid] = {
            order: placeOrder++, areaId: area.id, areaLabel: area.label,
            areaReads: area.reads || '', familyId: family.id, familyLabel: family.label
          };
        });
      });
    });

    var rows = [], maxApi = 0;
    for (i = 0; i < needs.length; i++) {
      var list = byNeed[needs[i].id] || [];
      if (!list.length) continue;
      var cells = list.map(function (cat, sourceIndex) {
        var st = stakesOf(cat), sp = spreadOf(cat), api = st * sp;
        var p = placement[cat.id] || {
          order: 100000 + sourceIndex, areaId: needs[i].id + '-more', areaLabel: 'More',
          areaReads: '', familyId: needs[i].id + '-' + (cat.group || 'more'), familyLabel: cat.group || 'More'
        };
        if (api > maxApi) maxApi = api;
        return {
          id: cat.id, label: cat.label, route: '#explore/' + cat.id,
          api: api, stakes: st, spread: sp, count: cat.n || 0,
          checkable: checkableOf(cat), scent: scentOf(cat),
          receipt: receiptOf(cat), lenses: lensesOf(cat), order: p.order,
          areaId: p.areaId, areaLabel: p.areaLabel,
          familyId: p.familyId, familyLabel: p.familyLabel
        };
      });
      cells.sort(function (a, b) { return a.order - b.order; });

      var areas = [], families = [];
      (presentation.categories || []).filter(function (area) { return area.need === needs[i].id; }).forEach(function (area) {
        var areaFamilies = [];
        (area.subcategories || []).forEach(function (family) {
          var fm = cells.filter(function (cell) { return cell.familyId === family.id; });
          if (!fm.length) return;
          var fn = aggregateNode(needs[i].id + '/' + area.id + '/' + family.id,
                                 family.label, 'family', fm, fm, '', area);
          fn.sourceId = family.id;
          areaFamilies.push(fn); families.push(fn);
        });
        var am = cells.filter(function (cell) { return cell.areaId === area.id; });
        if (am.length) {
          var an = aggregateNode(needs[i].id + '/' + area.id, area.label,
                                 'area', am, areaFamilies, area.reads || '', null);
          an.sourceId = area.id; areas.push(an);
        }
      });
      /* The fallback is defensive only. The presentation audit should make it empty, but the lens
         remains usable while data is arriving during local development. */
      var loose = cells.filter(function (cell) {
        return !areas.some(function (area) { return area.members.indexOf(cell) >= 0; });
      });
      if (loose.length) {
        var fallbackFamily = aggregateNode(needs[i].id + '/more/more', 'More', 'family', loose, loose, '', { id: 'more', label: 'More' });
        families.push(fallbackFamily);
        areas.push(aggregateNode(needs[i].id + '/more', 'More', 'area', loose, [fallbackFamily], '', null));
      }
      rows.push({
        id: needs[i].id, label: needs[i].label || needs[i].id,
        reads: needs[i].reads || '', route: '#need/' + needs[i].id,
        color: NEED_COLORS[needs[i].id] || null,
        cells: cells, categories: areas, subcategories: families, groups: areas
      });
    }
    for (i = 0; i < rows.length; i++) {
      for (var j = 0; j < rows[i].cells.length; j++) {
        rows[i].cells[j].apiNorm = maxApi ? rows[i].cells[j].api / maxApi : 0;
      }
      [rows[i].categories, rows[i].subcategories].forEach(function (nodes) {
        for (var q = 0; q < nodes.length; q++) nodes[q].apiNorm = maxApi ? nodes[q].api / maxApi : 0;
      });
    }
    return rows;
  }

  /* map.json is a second, wider source than the boot catalogue. The catalogue knows only
     decisions that have datasets; the map knows the named ground around them. Keep the two
     sources joined by cid, and keep the map's actual ancestry intact. Need is deliberately a
     cross-cutting rung: it colours every node, but it is not invented as a parent of fields. */
  function buildWideWorld(map, liveWorld, ontology) {
    var liveByCid = {}, needNames = {}, decisionsByKey = {}, keyByCid = {};
    var levels = [[], [], [], [], []], all = [];
    var i, j, k, q;
    for (i = 0; i < liveWorld.length; i++) {
      for (j = 0; j < liveWorld[i].cells.length; j++) liveByCid[liveWorld[i].cells[j].id] = liveWorld[i].cells[j];
    }
    ((ontology && ontology.needs) || []).forEach(function (need) { needNames[need.id] = need.label || need.id; });

    function mapDecision(realm, field, family, decision) {
      var key = [realm.id, field.id, family.id, decision.id].join('/');
      var live = decision.cid ? liveByCid[decision.cid] : null;
      var node = {
        id: key, mapKey: key, label: decision.label, kind: 'decision', state: decision.state,
        cid: decision.cid || null, route: decision.cid ? '#explore/' + decision.cid : null,
        need: decision.need, needLabel: needNames[decision.need] || decision.need,
        color: NEED_COLORS[decision.need] || null,
        realmId: realm.id, realmLabel: realm.label, fieldId: field.id, fieldLabel: field.label,
        familyId: family.id, familyLabel: family.label,
        api: live ? live.api : 0, apiNorm: 1, stakes: live ? live.stakes : 0,
        spread: live ? live.spread : 0, count: live ? live.count : 0,
        checkable: live ? live.checkable : 0, receipt: live ? live.receipt : [],
        lenses: live ? live.lenses : {},
        scent: live && live.scent ? live.scent : ((map.states || {})[decision.state] || decision.state),
        totalCount: 1, builtCount: decision.state === 'built' ? 1 : 0,
        openCount: decision.state === 'open' ? 1 : 0,
        heldCount: decision.state === 'held' ? 1 : 0,
        refusedCount: decision.state === 'refused' ? 1 : 0,
        coverage: decision.state === 'built' ? 1 : 0,
        memberKeys: [key], builtKeys: decision.state === 'built' ? [key] : []
      };
      decisionsByKey[key] = node;
      if (decision.cid) keyByCid[decision.cid] = key;
      all.push(node);
      return node;
    }

    function aggregate(id, label, kind, members, extra) {
      var node = {
        id: id, label: label, kind: kind, state: 'mixed', route: null,
        api: 0, apiNorm: 1, stakes: 0, spread: 0, count: 0, checkable: 0,
        receipt: [], lenses: {}, memberKeys: [], builtKeys: [], totalCount: members.length,
        builtCount: 0, openCount: 0, heldCount: 0, refusedCount: 0, coverage: 0
      };
      for (var x in extra || {}) node[x] = extra[x];
      var optionTotal = 0, checkedTotal = 0;
      members.forEach(function (member) {
        node.api = Math.max(node.api, member.api || 0);
        node.stakes = Math.max(node.stakes, member.stakes || 0);
        node.spread += member.spread || 0;
        node.count += member.count || 0;
        optionTotal += member.count || 0;
        checkedTotal += (member.checkable || 0) * (member.count || 0);
        node.builtCount += member.builtCount || 0;
        node.openCount += member.openCount || 0;
        node.heldCount += member.heldCount || 0;
        node.refusedCount += member.refusedCount || 0;
        node.memberKeys = node.memberKeys.concat(member.memberKeys || []);
        node.builtKeys = node.builtKeys.concat(member.builtKeys || []);
        for (var l in member.lenses || {}) node.lenses[l] = 1;
      });
      node.spread = members.length ? node.spread / members.length : 0;
      node.checkable = optionTotal ? checkedTotal / optionTotal : 0;
      node.coverage = node.totalCount ? node.builtCount / node.totalCount : 0;
      node.scent = plural(node.totalCount, 'decision') + '; ' + node.builtCount + ' answered';
      return node;
    }

    function row(id, label, need, cells, route) {
      return { id: id, label: label, need: need, color: NEED_COLORS[need] || null,
               route: route || null, cells: cells };
    }
    function normalise(rows) {
      var max = 1;
      rows.forEach(function (r) { r.cells.forEach(function (c) { max = Math.max(max, c.totalCount || 1); }); });
      rows.forEach(function (r) { r.cells.forEach(function (c) { c.apiNorm = Math.sqrt((c.totalCount || 1) / max); }); });
      return rows;
    }

    var realms = map.realms || [], realmDecisions = {}, fieldDecisions = {}, familyDecisions = {};
    for (i = 0; i < realms.length; i++) {
      var realm = realms[i]; realmDecisions[realm.id] = [];
      for (j = 0; j < (realm.fields || []).length; j++) {
        var field = realm.fields[j], fk = realm.id + '/' + field.id; fieldDecisions[fk] = [];
        for (k = 0; k < (field.families || []).length; k++) {
          var family = field.families[k], famk = fk + '/' + family.id; familyDecisions[famk] = [];
          for (q = 0; q < (family.decisions || []).length; q++) {
            var decisionNode = mapDecision(realm, field, family, family.decisions[q]);
            realmDecisions[realm.id].push(decisionNode);
            fieldDecisions[fk].push(decisionNode);
            familyDecisions[famk].push(decisionNode);
          }
        }
      }
    }

    var needOrder = ((ontology && ontology.needs) || []).map(function (n) { return n.id; });
    if (!needOrder.length) needOrder = Object.keys(needNames);
    needOrder.forEach(function (need) {
      var realmNodes = realms.filter(function (r) { return r.need === need; }).map(function (r) {
        return aggregate('realm/' + r.id, r.label, 'realm', realmDecisions[r.id], {
          realmId: r.id, realmLabel: r.label, need: r.need,
          needLabel: needNames[r.need] || r.need, color: NEED_COLORS[r.need] || null
        });
      });
      if (realmNodes.length) levels[0].push(row('need/' + need, needNames[need] || need, need, realmNodes, '#need/' + need));
      var needMembers = all.filter(function (d) { return d.need === need; });
      if (needMembers.length) levels[1].push(row('need/' + need, needNames[need] || need, need,
        [aggregate('need/' + need, needNames[need] || need, 'need', needMembers, {
          need: need, needLabel: needNames[need] || need, color: NEED_COLORS[need] || null
        })], '#need/' + need));
    });

    realms.forEach(function (r) {
      var fieldNodes = (r.fields || []).map(function (f) {
        var members = fieldDecisions[r.id + '/' + f.id];
        return aggregate('field/' + r.id + '/' + f.id, f.label, 'field', members, {
          realmId: r.id, realmLabel: r.label, fieldId: f.id, fieldLabel: f.label,
          need: r.need, needLabel: needNames[r.need] || r.need, color: NEED_COLORS[r.need] || null
        });
      });
      levels[2].push(row('realm/' + r.id, r.label, r.need, fieldNodes));

      var familyNodes = [];
      (r.fields || []).forEach(function (f) {
        (f.families || []).forEach(function (family) {
          var members = familyDecisions[r.id + '/' + f.id + '/' + family.id];
          familyNodes.push(aggregate('family/' + r.id + '/' + f.id + '/' + family.id,
            family.label, 'family', members, {
              realmId: r.id, realmLabel: r.label, fieldId: f.id, fieldLabel: f.label,
              familyId: family.id, familyLabel: family.label,
              need: r.need, needLabel: needNames[r.need] || r.need, color: NEED_COLORS[r.need] || null
            }));
        });
      });
      levels[3].push(row('realm/' + r.id, r.label, r.need, familyNodes));
      levels[4].push(row('realm/' + r.id, r.label, r.need, realmDecisions[r.id]));
    });

    for (i = 0; i < levels.length; i++) levels[i] = normalise(levels[i]);
    return { levels: levels, decisions: decisionsByKey, keyByCid: keyByCid,
             totals: map.totals || {}, states: map.states || {} };
  }

  function mount(containerId, getCatalog) {
    var box = document.getElementById(containerId);
    if (!box || box.dataset.lensMounted) return;
    var readCatalog = typeof getCatalog === 'function' ? getCatalog : function () { return global.CATALOG; };
    if (!(readCatalog() || []).length) {
      var tries = 0;
      var t0 = setInterval(function () {
        if ((readCatalog() || []).length) { clearInterval(t0); mount(containerId, getCatalog); }
        else if (++tries > 60) clearInterval(t0);
      }, 250);
      return;
    }
    box.dataset.lensMounted = '1';

    var canvas = document.createElement('canvas');
    canvas.className = 'homelens-canvas';
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'application');
    box.appendChild(canvas);

    var TH = tokens(box);
    var W = 0, H = 0, DPR = Math.max(1, global.devicePixelRatio || 1);
    var ont = (global.CC_BUNDLE && global.CC_BUNDLE.ontology) || null;
    var world = buildWorld(readCatalog(), ont);
    var wide = null, wideStatus = 'idle', wideError = '', pendingFish = null;
    var fishAnchorKey = null, lastLiveAnchor = world.length && world[0].cells.length ? world[0].cells[0] : null;
    box.dataset.needs = String(world.length);
    box.dataset.areas = String(world.reduce(function (n, row) { return n + row.categories.length; }, 0));
    box.dataset.kinds = String(world.reduce(function (n, row) { return n + row.subcategories.length; }, 0));
    box.dataset.decisions = String(world.reduce(function (n, row) { return n + row.cells.length; }, 0));
    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var focusR = 0, focusU = 0, shownR = 0, shownU = 0;
    var engTarget = 0, eng = 0;
    var mode = 'spatial';
    var level = 1, levelShown = 1;        // 0 needs - 1 areas - 2 families - 3 decisions - 4 evidence
    var fishDepth = 0, fishDepthShown = 0;
    var velX = 0, velY = 0, flat = 0, pointerIn = false, dragging = null;
    var info = null;                       // which info criterion the cells report, if any
    var lens = null;
    var laid = [], rowBoxes = [], headCtls = [];
    var kbd = false, raf = 0, last = 0, press = null, wheelAcc = 0, depthLockUntil = 0;
    var coarse = !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
    var lastContextSig = '';

    /* The words drawn on the breadcrumb. "Groups" was build vocabulary leaking onto the page:
       the information architecture contract has banned it, with domain, selector and ontology,
       since 2026-07-20. A reader is moving between needs, the areas inside them, the decisions,
       and then inside one. */
    var LEVEL_SAYS = ['needs', 'areas', 'kinds', 'decisions', 'evidence'];
    var FISH_DEPTHS = ['domains', 'needs', 'fields', 'families', 'decisions', 'evidence'];

    function loadingFishRows() {
      return [{ id: 'whole-map', label: 'Whole map', color: TH.accent, route: null, cells: [{
        id: 'whole-map-loading', label: wideStatus === 'error' ? 'The whole map could not be loaded' : 'Loading the whole map',
        kind: 'status', state: wideStatus, route: null, color: TH.accent, api: 0, apiNorm: 1,
        stakes: 0, spread: 0, count: 0, checkable: 0, receipt: [], lenses: {},
        scent: wideStatus === 'error' ? wideError : '1,068 decisions stay off the boot path until this view is opened.',
        totalCount: 1, builtCount: 0, openCount: 0, heldCount: 0, refusedCount: 0,
        coverage: 0, memberKeys: [], builtKeys: []
      }] }];
    }

    function evidenceRows() {
      if (!wide || !fishAnchorKey || !wide.decisions[fishAnchorKey]) return loadingFishRows();
      var decision = wide.decisions[fishAnchorKey], cells = [], i;
      if (decision.state === 'built' && decision.receipt && decision.receipt.length) {
        for (i = 0; i < decision.receipt.length; i++) {
          var criterion = decision.receipt[i];
          cells.push({
            id: fishAnchorKey + '/evidence/' + i, label: criterion.name, kind: 'evidence', state: 'built',
            route: decision.route, color: decision.color, need: decision.need,
            realmId: decision.realmId, realmLabel: decision.realmLabel,
            fieldId: decision.fieldId, fieldLabel: decision.fieldLabel,
            familyId: decision.familyId, familyLabel: decision.familyLabel,
            decisionId: decision.id, decisionLabel: decision.label,
            api: criterion.spread || 0, apiNorm: Math.max(0.18, (criterion.spread || 0) / 100),
            stakes: decision.stakes, spread: criterion.spread || 0, count: decision.count,
            checkable: decision.checkable, receipt: [], lenses: decision.lenses,
            scent: 'Options differ ' + Math.round(criterion.spread || 0) + ' of 100',
            totalCount: 1, builtCount: 1, openCount: 0, heldCount: 0, refusedCount: 0,
            coverage: 1, memberKeys: [fishAnchorKey], builtKeys: [fishAnchorKey]
          });
        }
      } else {
        cells.push({
          id: fishAnchorKey + '/evidence/none', label: decision.state === 'open' ? 'No evidence published yet' : 'No evidence published',
          kind: 'evidence', state: decision.state, route: null, color: decision.color, need: decision.need,
          realmId: decision.realmId, realmLabel: decision.realmLabel,
          fieldId: decision.fieldId, fieldLabel: decision.fieldLabel,
          familyId: decision.familyId, familyLabel: decision.familyLabel,
          decisionId: decision.id, decisionLabel: decision.label,
          api: 0, apiNorm: 1, stakes: 0, spread: 0, count: 0, checkable: 0,
          receipt: [], lenses: {}, scent: wide.states[decision.state] || decision.scent,
          totalCount: 1, builtCount: 0, openCount: decision.state === 'open' ? 1 : 0,
          heldCount: decision.state === 'held' ? 1 : 0, refusedCount: decision.state === 'refused' ? 1 : 0,
          coverage: 0, memberKeys: [fishAnchorKey], builtKeys: []
        });
      }
      return [{ id: 'evidence/' + fishAnchorKey, label: decision.label, need: decision.need,
                color: decision.color, route: decision.route, cells: cells }];
    }

    function fishRows(depth) {
      if (!wide) return loadingFishRows();
      return depth >= 5 ? evidenceRows() : wide.levels[clamp(depth, 0, 4)];
    }

    function activeRows() { return mode === 'fisheye' ? fishRows(fishDepth) : world; }

    function loadWideWorld() {
      if (wideStatus === 'loading' || wideStatus === 'ready') return;
      wideStatus = 'loading'; wideError = ''; box.dataset.mapState = 'loading';
      layout(); draw();
      global.fetch('./data/map.json').then(function (response) {
        if (!response.ok) throw new Error('map.json returned ' + response.status);
        return response.json();
      }).then(function (map) {
        if (!map || map.format !== 'open-values-map') throw new Error('map.json has the wrong format');
        wide = buildWideWorld(map, world, ont); wideStatus = 'ready'; box.dataset.mapState = 'ready';
        box.dataset.domains = String((wide.totals || {}).realms || 0);
        box.dataset.fields = String((wide.totals || {}).fields || 0);
        box.dataset.families = String((wide.totals || {}).families || 0);
        box.dataset.mapDecisions = String((wide.totals || {}).decisions || 0);
        box.dataset.mapBuilt = String((wide.totals || {}).built || 0);
        box.dataset.mapOpen = String((wide.totals || {}).open || 0);
        if (pendingFish && pendingFish.key && wide.decisions[pendingFish.key]) fishAnchorKey = pendingFish.key;
        else if (pendingFish && pendingFish.cid && wide.keyByCid[pendingFish.cid]) fishAnchorKey = wide.keyByCid[pendingFish.cid];
        if (!fishAnchorKey) {
          var keys = Object.keys(wide.decisions); fishAnchorKey = keys.length ? keys[0] : null;
        }
        pendingFish = null;
        focusFishAnchor(fishDepth);
        layout(); draw(); emitContext();
        say((wide.totals.decisions || 0) + ' decisions loaded; ' + (wide.totals.built || 0) + ' have answers.');
      }).catch(function (err) {
        wideStatus = 'error'; wideError = err && err.message ? err.message : 'Unknown error';
        box.dataset.mapState = 'error'; layout(); draw(); emitContext();
        say('The whole map could not be loaded.');
      });
    }

    function updateA11y() {
      var spatial = 'Spatial map of the catalogue. It opens at the areas inside eight needs. ' +
        'Point to inspect. Select or scroll to move from needs to areas, kinds, decisions, and the evidence inside one. ' +
        'At the outer depth edges the wheel scrolls the page. Keyboard: arrows move, Enter descends or opens, ' +
        'plus and minus change depth, and Escape climbs out.';
      var fish = 'Fisheye view of the whole catalogue map. Move away from the centre to travel; ' +
        'farther moves faster, and stopping enlarges the focused choice. Scroll moves through domains, needs, fields, ' +
        'families, decisions, and evidence. Open decisions remain visible but do not open a route. At the outer depth ' +
        'edges the wheel scrolls the page. Keyboard: arrows move, Enter descends or opens, plus and minus change depth, ' +
        'and Escape climbs out.';
      canvas.setAttribute('aria-label', mode === 'fisheye' ? fish : spatial);
      canvas.style.cursor = coarse ? 'grab' : (mode === 'fisheye' ? 'crosshair' : 'pointer');
      box.dataset.mode = mode;
    }

    function rowAt(r) {
      var rows = activeRows();
      return rows[clamp(Math.round(r), 0, Math.max(0, rows.length - 1))];
    }
    // Every rung is derived from the public presentation tree; evidence keeps the decision cells.
    function itemsOf(row, lv) {
      return lv < 1.5 ? row.categories : (lv < 2.5 ? row.subcategories : row.cells);
    }
    function cellAt(r, u, lv) {
      var row = rowAt(r); if (!row) return null;
      var list = mode === 'fisheye' ? row.cells : itemsOf(row, lv === undefined ? level : lv);
      return list[clamp(Math.round(u * (list.length - 1)), 0, list.length - 1)];
    }
    function colorOf(row) { return row.color || TH.accent; }

    /* What is under the reader right now, counted at the rung they are on. Fisheye holds the
       whole map, so it can say "10 of 165"; Spatial holds only what is built, so it reports a
       count and says which population that is, rather than borrowing a denominator it does not
       have. Reported at every context change, which is what makes the strip an instrument
       reading rather than a fixed sentence. */
    function hereCounts() {
      if (mode === 'fisheye') {
        if (!wide || wideStatus !== 'ready') return null;
        var at = fishAnchorKey ? wide.decisions[fishAnchorKey] : null;
        if (!at) return null;
        // One test per rung, written out rather than layered, because a chain of >= conditions
        // with one !== exception in it is exactly where an off-by-one rung hides.
        function underHere(d) {
          if (fishDepth === 0) return d.realmId === at.realmId;
          if (fishDepth === 1) return d.need === at.need;
          if (fishDepth === 2) return d.realmId === at.realmId && d.fieldId === at.fieldId;
          if (fishDepth === 3) return d.realmId === at.realmId && d.fieldId === at.fieldId &&
                                      d.familyId === at.familyId;
          return d.id === at.id;
        }
        var keys = Object.keys(wide.decisions), built = 0, named = 0, i, d;
        for (i = 0; i < keys.length; i++) {
          d = wide.decisions[keys[i]];
          if (!underHere(d)) continue;
          named += 1;
          if (d.state === 'built') built += 1;
        }
        return { built: built, named: named, exact: true };
      }
      var row = rowAt(shownR);
      if (!row) return null;
      var list = itemsOf(row, level);
      if (!list || !list.length) return null;
      var cell = (eng > 0.05 || kbd) ? cellAt(shownR, shownU, level) : null;
      var group = cell && cell.members ? cell.members : (cell ? [cell] : null);
      var total = 0;
      if (group) total = group.length;
      else list.forEach(function (item) { total += item.members ? item.members.length : 1; });
      return { built: total, named: 0, exact: false };
    }

    function contextState() {
      var here = hereCounts();
      var row = rowAt(mode === 'fisheye' ? focusR : shownR);
      if (!row) return { here: here, mode: mode, level: level, path: ['All needs'], crumbs: [],
                         scale: mode === 'fisheye' ? FISH_DEPTHS.slice() : LEVEL_SAYS.slice(),
                         at: mode === 'fisheye' ? fishDepth : level, hint: '' };
      if (mode === 'fisheye') {
        var fishCell = cellAt(focusR, focusU), anchor = wide && fishAnchorKey ? wide.decisions[fishAnchorKey] : null;
        if (fishCell && wide) syncFishAnchor(fishCell);
        anchor = wide && fishAnchorKey ? wide.decisions[fishAnchorKey] : anchor;
        var labels = [], crumbs = [];
        function crumb(label, rung) {
          if (!label || (crumbs.length && crumbs[crumbs.length - 1].label === label)) return;
          crumbs.push({ label: label, level: rung }); labels.push(label);
        }
        if (wideStatus !== 'ready') {
          crumb(wideStatus === 'error' ? 'Whole map unavailable' : 'Loading whole map', 0);
        } else if (anchor) {
          crumb(anchor.realmLabel, 0);
          if (fishDepth >= 1) crumb(anchor.needLabel, 1);
          if (fishDepth >= 2) crumb(anchor.fieldLabel, 2);
          if (fishDepth >= 3) crumb(anchor.familyLabel, 3);
          if (fishDepth >= 4) crumb(anchor.label, 4);
          if (fishDepth >= 5 && fishCell) crumb(fishCell.label, 5);
        } else if (fishCell) crumb(fishCell.label, fishDepth);
        if (crumbs.length) crumbs[crumbs.length - 1].current = true;
        return { here: here,
          mode: mode, level: fishDepth,
          path: labels.length ? labels : [row.label], crumbs: crumbs,
          scale: FISH_DEPTHS.slice(), at: fishDepth,
          hint: wideStatus === 'loading' ? 'The whole map is loaded only when this view is opened.'
              : wideStatus === 'error' ? 'The built catalogue remains available in Spatial.'
              : fishDepth === 0 ? 'Sixteen domains, sized by how many decisions they hold and shaded by how many have answers.'
              : fishDepth === 1 ? 'Need crosses the domain tree; colour keeps it visible on every deeper rung.'
              : fishDepth === 2 ? 'Fields are shown inside their actual domain, not under an invented parent.'
              : fishDepth === 3 ? 'Families keep the map’s authored grouping.'
              : fishDepth === 4 ? 'Built decisions are lit. Open, held, and refused ground stays visible.'
              : (anchor && anchor.state !== 'built' ? 'This decision has no published evidence; its map state is shown honestly.'
                 : 'The focused decision is showing its published measures.')
        };
      }
      var active = (eng > 0.05 || kbd) ? cellAt(shownR, shownU, level) : null;
      if (!active) {
        return { here: here, mode: mode, level: level, path: ['All needs', LEVEL_SAYS[level]],
                 crumbs: [{ label: 'All needs', level: 0 },
                           { label: LEVEL_SAYS[level], level: level, current: true }],
                 scale: LEVEL_SAYS.slice(), at: level,
                 hint: level === 1 ? 'Choose an area to see the kinds inside.' : 'Point anywhere to begin.' };
      }
      var path = [row.label];
      var crumbs = [{ label: row.label, level: 0 }];
      if (level === 1) path.push(active.label);
      else if (level === 2) path.push(active.parentLabel, active.label);
      else if (level >= 3) path.push(active.areaLabel, active.familyLabel, active.label);
      if (level === 1) crumbs.push({ label: active.label, level: 1, current: true });
      else if (level === 2) {
        crumbs.push({ label: active.parentLabel, level: 1 });
        crumbs.push({ label: active.label, level: 2, current: true });
      } else if (level >= 3) {
        crumbs.push({ label: active.areaLabel, level: 1 });
        crumbs.push({ label: active.familyLabel, level: 2 });
        crumbs.push({ label: active.label, level: 3, current: true });
      } else crumbs[0].current = true;
      return { here: here,
        mode: mode, level: level, path: path, crumbs: crumbs,
        scale: LEVEL_SAYS.slice(), at: level,
        hint: level === 0 ? 'Choose a need to see its areas.'
            : level === 1 ? 'Choose an area to see the kinds inside.'
            : level === 2 ? 'Choose a kind to see its decisions.'
            : level === 3 ? 'Select again to open, or move deeper to inspect evidence.'
            : 'The focused decision is showing its published evidence.'
      };
    }

    function emitContext() {
      var detail = contextState(), sig = detail.mode + '|' + detail.level + '|' + detail.path.join('|');
      if (sig === lastContextSig) return;
      lastContextSig = sig;
      try { global.dispatchEvent(new CustomEvent('cc:homelens-context', { detail: detail })); } catch (e) {}
    }

    function layout() {
      if (mode === 'fisheye') layoutFisheye();
      else layoutSpatial();
    }

    /* The fisheye is a second projection over the same world. Ontological distance drives size,
       and the focused decision stays centred while the rows and neighbours flow around it. */
    function layoutFisheye() {
      laid = []; rowBoxes = [];
      var rows = fishRows(fishDepth);
      var innerW = Math.max(40, W - GUTTER), innerH = Math.max(40, H - HEAD);
      var kRow = FISH_K_ROW * (1 - 0.42 * flat);
      var kCell = FISH_K_CELL * (1 - 0.42 * flat);
      var cellBase = clamp(innerW / 3.6, 74, 108);
      var heights = [], total = 0, i, j;

      for (i = 0; i < rows.length; i++) {
        var dR = (i - focusR) / FISH_S_ROW;
        var h = FISH_ROW_BASE * (0.62 + kRow * Math.exp(-dR * dR));
        heights.push(Math.max(FISH_ROW_MIN, h)); total += heights[i];
      }
      if (total < innerH && total > 0) {
        var gy = innerH / total;
        for (i = 0; i < heights.length; i++) heights[i] *= gy;
        total = innerH;
      }
      var yAt = [], run = 0;
      for (i = 0; i < heights.length; i++) { yAt.push(run); run += heights[i]; }
      var fi = clamp(Math.round(focusR), 0, Math.max(0, rows.length - 1));
      var offY = HEAD + innerH / 2 - ((yAt[fi] || 0) + (heights[fi] || 0) / 2);
      offY = clamp(offY, HEAD + Math.min(0, innerH - total), HEAD);

      for (i = 0; i < rows.length; i++) {
        var row = rows[i], n = row.cells.length;
        var y = yAt[i] + offY, h2 = heights[i];
        rowBoxes.push({ row: row, y: y, h: h2, i: i });
        if (y + h2 < HEAD || y > H) continue;

        var fIdx = focusU * Math.max(0, n - 1), widths = [], tw = 0;
        for (j = 0; j < n; j++) {
          var dC = (j - fIdx) / FISH_S_CELL;
          var api = 0.55 + 0.75 * row.cells[j].apiNorm;
          var w = cellBase * api * (0.34 + kCell * Math.exp(-dC * dC)) * 0.62;
          widths.push(Math.max(FISH_CELL_MIN, w)); tw += widths[j];
        }
        if (tw < innerW && tw > 0) {
          var gx = innerW / tw;
          for (j = 0; j < n; j++) widths[j] *= gx;
          tw = innerW;
        }
        var xAt = [], runX = 0;
        for (j = 0; j < n; j++) { xAt.push(runX); runX += widths[j]; }
        var fj = clamp(Math.round(fIdx), 0, Math.max(0, n - 1));
        var offX = GUTTER + innerW / 2 - ((xAt[fj] || 0) + (widths[fj] || 0) / 2);
        offX = clamp(offX, GUTTER + Math.min(0, innerW - tw), GUTTER);
        for (j = 0; j < n; j++) {
          var x = xAt[j] + offX;
          if (x + widths[j] < GUTTER - 2 || x > W) continue;
          laid.push({ cell: row.cells[j], row: row, ri: i, ci: j,
                      x: x, y: y + 1, w: widths[j] - 2, h: h2 - 2,
                      isFocus: i === fi && j === fj });
        }
      }
    }

    function layoutSpatial() {
      laid = []; rowBoxes = [];
      var innerW = Math.max(40, W - GUTTER), innerH = Math.max(40, H - HEAD);
      var n = world.length, i, j;
      var inDepth = clamp(levelShown - 3, 0, 1);            // 0 at decisions, 1 at evidence
      var atNeeds = clamp(1 - levelShown, 0, 1);            // 1 at needs, 0 from groups down
      var kRow = (K_ROW + (K_ROW_IN - K_ROW) * inDepth) * eng;
      var kCell = (K_CELL + (K_CELL_IN - K_CELL) * inDepth) * eng;

      var hw = [], hsum = 0;
      for (i = 0; i < n; i++) {
        var dR = (i - shownR) / S_ROW;
        hw.push(1 + kRow * Math.exp(-dR * dR)); hsum += hw[i];
      }
      var y = HEAD;
      var fRow = clamp(Math.round(shownR), 0, n - 1);
      for (i = 0; i < n; i++) {
        var rh = hw[i] / hsum * innerH;
        var row = world[i];
        rowBoxes.push({ row: row, y: y, h: rh, i: i });

        // at the needs rung the bands are whole; cells only exist from the decisions rung down
        if (atNeeds < 0.98) {
          var list = itemsOf(row, levelShown), lm = list.length;
          var fIdx = shownU * (lm - 1);
          var ww = [], wsum = 0;
          for (j = 0; j < lm; j++) {
            var base = 0.55 + 0.75 * list[j].apiNorm;
            var mag = (i === fRow) ? 1 + kCell * Math.exp(-Math.pow((j - fIdx) / S_CELL, 2)) : 1;
            ww.push(base * mag); wsum += ww[j];
          }
          var x = GUTTER;
          for (j = 0; j < lm; j++) {
            var cw = ww[j] / wsum * innerW;
            laid.push({ cell: list[j], row: row, ri: i, ci: j,
                        x: x + 1, y: y + 1, w: Math.max(0.5, cw - 2), h: Math.max(0.5, rh - 2) });
            x += cw;
          }
        }
        y += rh;
      }
    }

    function fit(ctx, text, maxW) {
      if (maxW <= 6) return '';
      if (ctx.measureText(text).width <= maxW) return text;
      var t = text;
      while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
      return t.length > 1 ? t.replace(/[\s,]+\S*$/, '') + '…' : '';
    }

    /* A NAME IS WHOLE OR IT IS ABSENT.
       fit() ellipsises, which is right for a sentence that runs on and wrong for a name. A cell
       reading "Broadba…" or "Passwor…" has not told anybody anything: it costs a reader a guess and
       returns nothing, and fifteen of them across one map is most of why the plate looked like
       noise rather than a catalogue. The colour already carries the need, the shape already carries
       the weight, and the name arrives on focus. So a cell that cannot hold its whole name holds
       none of it. */
    function whole(ctx, text, maxW) {
      return (maxW > 6 && ctx.measureText(text).width <= maxW) ? text : '';
    }

    function wrap(ctx, text, maxW, maxLines) {
      var words = text.split(/\s+/), lines = [], cur = '';
      for (var i = 0; i < words.length; i++) {
        var t = cur ? cur + ' ' + words[i] : words[i];
        if (ctx.measureText(t).width <= maxW) { cur = t; continue; }
        if (cur) lines.push(cur);
        cur = words[i];
        if (lines.length >= maxLines) break;
      }
      if (cur && lines.length < maxLines) lines.push(cur);
      lines = lines.slice(0, maxLines);
      for (var k = 0; k < lines.length; k++) lines[k] = fit(ctx, lines[k], maxW);
      lines = lines.filter(Boolean);
      // words were dropped: the last line owns up to it rather than stopping mid-thought
      if (lines.length && lines.join(' ').length < text.length - 1 && !/…$/.test(lines[lines.length - 1])) {
        lines[lines.length - 1] = fit(ctx, lines[lines.length - 1] + ' …', maxW);
      }
      return lines;
    }

    function rgbOf(css) {
      var m = String(css).match(/^#?([0-9a-f]{6})$/i);
      if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
      var v = String(css).match(/(\d+(?:\.\d+)?)/g);
      return v && v.length >= 3 ? [+v[0], +v[1], +v[2]] : [128, 128, 128];
    }
    function lum(c) {
      var v = c.map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    }
    function ratio(a, b) { var la = lum(a), lb = lum(b), h = Math.max(la, lb), l = Math.min(la, lb); return (h + 0.05) / (l + 0.05); }
    function inkOn(alpha, baseCss) {
      var ac = rgbOf(baseCss), bg = rgbOf(TH.bg);
      var f = [0, 1, 2].map(function (i) { return ac[i] * alpha + bg[i] * (1 - alpha); });
      return ratio(rgbOf(TH.ink), f) >= ratio(rgbOf(TH.surface), f) ? TH.ink : TH.surface;
    }

    function dimmedBy(cell) { return lens && !cell.lenses[lens]; }

    function mapLine(cell) {
      if (!cell) return '';
      if (cell.kind === 'evidence') return cell.scent || '';
      if (cell.kind === 'decision') {
        if (cell.state !== 'built') return cell.state === 'open' ? 'open; no answer yet'
          : cell.state === 'held' ? 'held deliberately'
          : cell.state === 'refused' ? 'outside this catalogue' : cell.state;
        return plural(cell.count || 0, 'option') + '; ' + Math.round((cell.checkable || 0) * 100) + '% second-sourced';
      }
      return plural(cell.totalCount || 0, 'decision') + '; ' + (cell.builtCount || 0) + ' answered';
    }

    function mapAlpha(cell, isFocus, dim) {
      if (dim) return 0.045;
      var a;
      if (cell.kind === 'decision') {
        a = cell.state === 'built' ? 0.42 : cell.state === 'open' ? 0.105 : cell.state === 'held' ? 0.075 : 0.055;
      } else if (cell.kind === 'evidence') {
        a = cell.state === 'built' ? 0.18 + 0.28 * (cell.apiNorm || 0) : 0.09;
      } else if (cell.kind === 'status') a = 0.12;
      else a = 0.08 + 0.4 * (cell.coverage || 0);
      return clamp(a + (isFocus ? 0.1 : 0), 0.04, 0.58);
    }

    /* The info criteria: what every cell reports about itself when one is chosen. Aggregates for a
       group come from its members, so the same chip means the same thing at both rungs. */
    function infoLine(c) {
      if (info === 'options') return plural(c.count, 'option');
      if (info === 'sourced') return Math.round(c.checkable * 100) + '% second-sourced';
      if (info === 'stakes') return 'stakes ' + c.stakes + ' of 5';
      if (info === 'differ') return 'options differ ' + Math.round(c.spread * 100) + ' of 100';
      return '';
    }

    function draw() {
      if (!W || !H) return;
      var ctx = canvas.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, H);

      var rowsNow = activeRows();
      var fRow = clamp(Math.round(mode === 'fisheye' ? focusR : shownR), 0, Math.max(0, rowsNow.length - 1));
      var focused = mode === 'fisheye' ? cellAt(focusR, focusU)
                    : ((eng > 0.05 || kbd) ? cellAt(shownR, shownU) : null);
      var atNeeds = mode === 'spatial' && levelShown < 0.5;
      var inside = (mode === 'spatial' && levelShown > 3.5) || (mode === 'fisheye' && fishDepthShown > 4.5);
      var i;

      if (atNeeds) {
        /* The needs rung: eight coloured bands, each saying in a sentence what it holds. The same
           stable mapping applies — the band under the pointer grows — and a click steps down onto
           its decisions. */
        for (i = 0; i < rowBoxes.length; i++) {
          var B = rowBoxes[i], col = colorOf(B.row);
          var on = i === fRow && (eng > 0.05 || kbd);
          var a0 = on ? 0.34 : 0.2;
          ctx.globalAlpha = a0; ctx.fillStyle = col;
          ctx.fillRect(GUTTER, B.y + 1, W - GUTTER, B.h - 2);
          ctx.globalAlpha = 1;
          var ink0 = inkOn(a0, col);
          ctx.fillStyle = ink0;
          var bf = clamp(Math.round(Math.min(B.h / 2.6, 16)), 9, 16);
          ctx.font = '700 ' + bf + 'px ' + TH.font;
          ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText(fit(ctx, B.row.label, W - GUTTER - 130), GUTTER + 8, B.y + 5);
          ctx.font = '600 ' + Math.max(9, bf - 5) + 'px ' + TH.font;
          ctx.globalAlpha = 0.85;
          ctx.textAlign = 'right';
          ctx.fillText(plural(B.row.cells.length, 'decision'), W - 8, B.y + 7);
          ctx.textAlign = 'left';
          if (B.row.reads && B.h > bf + 22) {
            ctx.font = Math.max(9, bf - 4) + 'px ' + TH.font;
            var rl = wrap(ctx, B.row.reads, W - GUTTER - 16, B.h > bf + 40 ? 2 : 1);
            for (var q0 = 0; q0 < rl.length; q0++) ctx.fillText(rl[q0], GUTTER + 8, B.y + 8 + bf + q0 * (bf - 2));
          }
          ctx.globalAlpha = 1;
        }
      } else {
        for (i = 0; i < laid.length; i++) {
          var L = laid[i], c = L.cell, col2 = c.color || colorOf(L.row);
          var isFocus = mode === 'fisheye' ? !!L.isFocus : (focused && L.ri === fRow && c === focused);
          var dim = dimmedBy(c);
          var a = mode === 'fisheye' && wide ? mapAlpha(c, isFocus, dim)
                : (dim ? 0.05 : clamp(0.09 + 0.34 * c.apiNorm + (isFocus ? 0.1 : 0), 0, 0.55));
          var ink = inkOn(a, dim ? TH.hint : col2);

          ctx.globalAlpha = a;
          ctx.fillStyle = dim ? TH.hint : col2;
          ctx.fillRect(L.x, L.y, L.w, L.h);
          ctx.globalAlpha = 1;
          if (isFocus) {
            ctx.strokeStyle = TH.ink; ctx.lineWidth = 2;
            ctx.strokeRect(L.x + 1, L.y + 1, L.w - 2, L.h - 2);
          } else if (L.w > 3) {
            ctx.strokeStyle = TH.bg; ctx.lineWidth = 1;
            ctx.strokeRect(L.x + 0.5, L.y + 0.5, L.w - 1, L.h - 1);
          }
          if (mode === 'fisheye' && c.state && c.state !== 'built' && c.state !== 'mixed' && L.w > 5 && L.h > 5) {
            ctx.save();
            ctx.setLineDash(c.state === 'open' ? [2, 3] : c.state === 'held' ? [6, 3] : [1, 4]);
            ctx.globalAlpha = isFocus ? 0.9 : 0.48; ctx.strokeStyle = col2; ctx.lineWidth = 1;
            ctx.strokeRect(L.x + 1.5, L.y + 1.5, Math.max(0, L.w - 3), Math.max(0, L.h - 3));
            ctx.restore();
          }

          if (L.w < 20 || L.h < 13) continue;
          if (dim && !isFocus) continue;          // stepped back: present, placed, quiet
          ctx.fillStyle = ink;
          var fs = clamp(Math.round(Math.min(L.h / 2.6, L.w / 6.2, 14)), 8, 14);
          ctx.font = '650 ' + fs + 'px ' + TH.font;
          ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          var name = whole(ctx, c.label, L.w - 10);
          var nameLines = name ? [name] : (isFocus ? wrap(ctx, c.label, L.w - 10, 2) : []);
          /* A focused name may wrap, but it may not be shortened. The header also carries it, yet
             leaving the centre cell blank on a phone makes the focus look like a rendering bug. */
          if (!nameLines.length || nameLines.join(' ') !== c.label) continue;
          for (var nl = 0; nl < nameLines.length; nl++) {
            ctx.fillText(nameLines[nl], L.x + 5, L.y + 4 + nl * (fs + 1));
          }
          var below = L.y + 6 + nameLines.length * (fs + 1);

          if (isFocus && inside && c.receipt && c.receipt.length && L.w > 150 && L.h > fs + 40) {
            /* Inside the decision: the published receipt, drawn. Each criterion in the reader's
               words with how far apart the options actually sit on it — length, the channel that
               reads, for the number that matters. */
            ctx.font = Math.max(9, fs - 4) + 'px ' + TH.font;
            var bw = L.w - 16, rows2 = Math.min(c.receipt.length, Math.floor((L.y + L.h - below - 18) / 15));
            for (var rc = 0; rc < rows2; rc++) {
              var cr = c.receipt[rc], ry = below + rc * 15;
              ctx.globalAlpha = 0.9;
              ctx.fillText(whole(ctx, cr.name, bw * 0.46), L.x + 6, ry);
              ctx.globalAlpha = 0.25;
              ctx.fillRect(L.x + 8 + bw * 0.48, ry + 3, bw * 0.4, 5);
              ctx.globalAlpha = 0.95;
              ctx.fillRect(L.x + 8 + bw * 0.48, ry + 3, bw * 0.4 * (cr.spread / 100), 5);
              ctx.globalAlpha = 0.8;
              ctx.textAlign = 'right';
              ctx.fillText(String(cr.spread), L.x + 6 + bw, ry);
              ctx.textAlign = 'left';
            }
            ctx.globalAlpha = 0.85;
            ctx.font = '600 10px ' + TH.font;
            ctx.fillText(fit(ctx, c.count + ' options · ' + Math.round(c.checkable * 100) + '% second-sourced · click to open', L.w - 12),
                         L.x + 6, L.y + L.h - 14);
            ctx.globalAlpha = 1;
          } else {
            var showScent = isFocus || (mode === 'fisheye' && fishDepthShown > 0.35 && fishDepth < 4);
            if (showScent && c.scent && L.w > 104 && L.h > fs + 24) {
              ctx.globalAlpha = mode === 'fisheye' && !isFocus
                ? clamp((fishDepthShown - 0.35) / 0.5, 0, 1) * 0.8 : 0.85;
              ctx.font = Math.max(9, fs - 3) + 'px ' + TH.font;
              var lines = wrap(ctx, c.scent, L.w - 10, L.h > fs + 50 ? 3 : 2);
              for (var q = 0; q < lines.length; q++) ctx.fillText(lines[q], L.x + 5, below + q * (fs - 1));
              below += lines.length * (fs - 1) + 2;
              ctx.globalAlpha = 1;
            }
            var fishEvidence = mode === 'fisheye' && fishDepthShown > 1.35;
            var stat = mode === 'fisheye' && wide ? ((isFocus || fishEvidence) ? mapLine(c) : '')
                     : info ? infoLine(c)
                     : ((isFocus || fishEvidence) ? c.count + ' options · ' + Math.round(c.checkable * 100) + '% second-sourced' : '');
            if (stat && L.w > 64 && L.h > 28) {
              ctx.globalAlpha = 0.9;
              ctx.font = '600 10px ' + TH.font;
              var alt = mode === 'fisheye' && wide ? (c.kind === 'decision' ? c.state : String(c.builtCount || 0) + '/' + String(c.totalCount || 0))
                      : info === 'options' ? String(c.count)
                      : info === 'sourced' ? Math.round(c.checkable * 100) + '%'
                      : info === 'stakes' ? c.stakes + '/5'
                      : info === 'differ' ? String(Math.round(c.spread * 100))
                      : c.count + ' · ' + Math.round(c.checkable * 100) + '%';
              var line = ctx.measureText(stat).width <= L.w - 10 ? stat
                       : (ctx.measureText(alt).width <= L.w - 10 ? alt : '');
              if (line) ctx.fillText(line, L.x + 5, Math.min(below, L.y + L.h - 14));
              ctx.globalAlpha = 1;
            }
          }
        }
      }

      if (mode === 'fisheye') {
        /* The reticle reports velocity as well as centre: a larger halo and directional spoke mean
           faster travel. At rest it collapses back to the quiet reading point. */
        var mx = GUTTER + (W - GUTTER) / 2, my = HEAD + (H - HEAD) / 2;
        var steerSpeed = clamp(Math.hypot(velX, velY), 0, 1);
        ctx.globalAlpha = 0.72; ctx.strokeStyle = TH.accent; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(mx, my, 10 + steerSpeed * 8, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mx - 18, my); ctx.lineTo(mx - 13, my);
        ctx.moveTo(mx + 13, my); ctx.lineTo(mx + 18, my);
        ctx.moveTo(mx, my - 18); ctx.lineTo(mx, my - 13);
        ctx.moveTo(mx, my + 13); ctx.lineTo(mx, my + 18); ctx.stroke();
        if (steerSpeed > 0.02) {
          ctx.globalAlpha = 0.9; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(mx, my);
          ctx.lineTo(mx + velX * 28, my + velY * 28); ctx.stroke();
        }

        /* A persistent miniature overview keeps fast travel from erasing location. Each rail is
           a row on the current rung: needs on the broad rungs, domains on the deep ones. */
        var ovW = clamp((W - GUTTER) * 0.13, 76, 112), ovH = rowsNow.length * 4 + 10;
        var ovX = W - ovW - 8, ovY = H - ovH - 8;
        ctx.globalAlpha = 0.88; ctx.fillStyle = TH.bg; ctx.fillRect(ovX, ovY, ovW, ovH);
        ctx.globalAlpha = 1; ctx.strokeStyle = TH.line; ctx.lineWidth = 1;
        ctx.strokeRect(ovX + 0.5, ovY + 0.5, ovW - 1, ovH - 1);
        for (var oi = 0; oi < rowsNow.length; oi++) {
          var oy = ovY + 5 + oi * 4;
          ctx.globalAlpha = oi === fRow ? 0.9 : 0.42;
          ctx.fillStyle = colorOf(rowsNow[oi]);
          ctx.fillRect(ovX + 5, oy, ovW - 10, oi === fRow ? 3 : 2);
        }
        ctx.globalAlpha = 1; ctx.fillStyle = TH.bg; ctx.strokeStyle = TH.ink; ctx.lineWidth = 1.5;
        var dotX = ovX + 5 + focusU * (ovW - 10), dotY = ovY + 6 + fRow * 4;
        ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // the gutter: pinned need or domain names, whichever owns the current rung
      ctx.fillStyle = TH.bg; ctx.fillRect(0, HEAD, GUTTER, H - HEAD);
      ctx.strokeStyle = TH.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(GUTTER - 0.5, HEAD); ctx.lineTo(GUTTER - 0.5, H); ctx.stroke();
      for (i = 0; i < rowBoxes.length; i++) {
        var R = rowBoxes[i];
        var onG = i === fRow && (eng > 0.05 || kbd);
        ctx.fillStyle = onG ? colorOf(R.row) : TH.hint;
        var rf = clamp(Math.round(Math.min(R.h / 2.4, 12)), 8, 12);
        ctx.font = (onG ? '700 ' : '600 ') + rf + 'px ' + TH.font;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        var cy = clamp(R.y + R.h / 2, HEAD + 8, H - 8);
        var gl = (R.h > rf * 2 + 1) ? wrap(ctx, R.row.label, GUTTER - 12, 2) : [fit(ctx, R.row.label, GUTTER - 12)];
        for (var gk = 0; gk < gl.length; gk++) {
          ctx.fillText(gl[gk], 8, cy + (gk - (gl.length - 1) / 2) * (rf + 1));
        }
        // the swatch ties gutter to plate even when the row is thin
        ctx.globalAlpha = onG ? 0.9 : 0.45;
        ctx.fillStyle = colorOf(R.row);
        ctx.fillRect(GUTTER - 6, R.y + 1, 3, Math.max(2, R.h - 2));
        ctx.globalAlpha = 1;
      }

      // the header: where you are on the ontological scale, and what is focused
      ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, HEAD);
      ctx.strokeStyle = TH.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, HEAD - 0.5); ctx.lineTo(W, HEAD - 0.5); ctx.stroke();
      ctx.textBaseline = 'middle';

      headCtls = [];
      ctx.textAlign = 'right';
      var cx = W - 8;
      var scaleWords = mode === 'fisheye' ? FISH_DEPTHS : LEVEL_SAYS;
      var scaleAt = mode === 'fisheye' ? fishDepth : level;
      for (i = scaleWords.length - 1; i >= 0; i--) {
        var onL = i === scaleAt;
        ctx.font = (onL ? '700 ' : '500 ') + '10px ' + TH.font;
        ctx.fillStyle = onL ? TH.accent : TH.hint;
        var tw = ctx.measureText(scaleWords[i]).width;
        ctx.fillText(scaleWords[i], cx, HEAD / 2);
        headCtls.push({ x: cx - tw - 4, w: tw + 8, level: i, depth: i });
        cx -= tw + 4;
        if (i > 0) { ctx.fillStyle = TH.hint; ctx.fillText('›', cx, HEAD / 2); cx -= 10; }
      }
      ctx.textAlign = 'left';
      var lead = atNeeds ? (rowAt(shownR) ? rowAt(shownR).label : 'Eight needs')
               : (focused ? focused.label
               : (mode === 'spatial' && level === 1 ? 'Areas inside eight needs'
               : (mode === 'spatial' && level === 2 ? 'Kinds inside each area'
               : (mode === 'spatial' && level === 4 ? 'Evidence inside one decision' : 'Every decision here'))));
      ctx.font = '600 10px ' + TH.font; ctx.fillStyle = TH.ink;
      var lw = ctx.measureText(lead).width;
      ctx.fillText(fit(ctx, lead, cx - 20), 8, HEAD / 2);
      if (!atNeeds && focused && mode === 'spatial') {
        ctx.fillStyle = TH.hint; ctx.font = '10px ' + TH.font;
        ctx.fillText(fit(ctx, '· ' + STAKES_SAYS[focused.stakes], cx - lw - 26), lw + 14, HEAD / 2);
      }
      if (mode === 'fisheye' && focused) {
        ctx.fillStyle = TH.hint; ctx.font = '10px ' + TH.font;
        ctx.fillText(fit(ctx, '; ' + mapLine(focused), cx - lw - 26), lw + 14, HEAD / 2);
      }
      ctx.textBaseline = 'alphabetic';
      emitContext();
    }

    function tick(t) {
      raf = 0;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      if (mode === 'fisheye') {
        var movingRows = fishRows(fishDepth);
        var moving = pointerIn && !dragging && !reduced &&
          (Math.abs(velX) > 0.001 || Math.abs(velY) > 0.001);
        if (moving) {
          focusU = clamp(focusU + velX * FISH_SPD_U * dt, 0, 1);
          focusR = clamp(focusR + velY * FISH_SPD_R * dt, 0, Math.max(0, movingRows.length - 1));
        }
        var speed = Math.min(1, Math.hypot(velX, velY) * 1.5);
        var wantFlat = moving ? speed : 0;
        flat += (wantFlat - flat) * (reduced ? 1 : Math.min(1, dt * (wantFlat > flat ? 9 : 5)));
        fishDepthShown += (fishDepth - fishDepthShown) * (reduced ? 1 : Math.min(1, dt * 8));
        shownR = focusR; shownU = focusU; eng = engTarget = 1;
        layout(); draw();
        if (moving || Math.abs(wantFlat - flat) > 0.01 || Math.abs(fishDepth - fishDepthShown) > 0.01) kick();
        else last = 0;
        return;
      }
      var k = reduced ? 1 : Math.min(1, dt * EASE);
      shownR += (focusR - shownR) * k;
      shownU += (focusU - shownU) * k;
      eng += (engTarget - eng) * k;
      levelShown += (level - levelShown) * k;
      layout(); draw();
      if (Math.abs(focusR - shownR) > 0.005 || Math.abs(focusU - shownU) > 0.005 ||
          Math.abs(engTarget - eng) > 0.01 || Math.abs(level - levelShown) > 0.01) kick();
      else last = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }

    function focusFromPoint(px, py) {
      var innerW = Math.max(40, W - GUTTER), innerH = Math.max(40, H - HEAD);
      var rows = activeRows();
      var r = (py - HEAD) / innerH * rows.length - 0.5;
      focusR = clamp(r, 0, Math.max(0, rows.length - 1));
      focusU = clamp((px - GUTTER) / innerW, 0, 1);
    }

    function deflect(px, py) {
      var mx = GUTTER + (W - GUTTER) / 2;
      var my = HEAD + (H - HEAD) / 2;
      var nx = (px - mx) / Math.max(1, (W - GUTTER) / 2);
      var ny = (py - my) / Math.max(1, (H - HEAD) / 2);
      var mag = Math.hypot(nx, ny);
      if (mag < FISH_DEAD) { velX = velY = 0; return; }
      var speed = clamp((mag - FISH_DEAD) / (1 - FISH_DEAD), 0, 1);
      speed *= speed;
      velX = nx / mag * speed; velY = ny / mag * speed;
    }

    function syncFishAnchor(node) {
      if (!wide || !node || !node.memberKeys || !node.memberKeys.length) return fishAnchorKey;
      if (fishAnchorKey && node.memberKeys.indexOf(fishAnchorKey) >= 0) return fishAnchorKey;
      fishAnchorKey = node.builtKeys && node.builtKeys.length ? node.builtKeys[0] : node.memberKeys[0];
      var decision = wide.decisions[fishAnchorKey];
      if (decision && decision.cid) {
        for (var wr = 0; wr < world.length; wr++) {
          for (var wc = 0; wc < world[wr].cells.length; wc++) {
            if (world[wr].cells[wc].id === decision.cid) lastLiveAnchor = world[wr].cells[wc];
          }
        }
      }
      return fishAnchorKey;
    }

    function focusFishAnchor(depth) {
      var rows = fishRows(depth), found = null;
      if (!fishAnchorKey || !rows.length) { focusR = shownR = 0; focusU = shownU = 0; return false; }
      for (var r = 0; r < rows.length && !found; r++) {
        for (var c = 0; c < rows[r].cells.length; c++) {
          var memberKeys = rows[r].cells[c].memberKeys || [];
          if (memberKeys.indexOf(fishAnchorKey) >= 0) { found = { r: r, c: c, n: rows[r].cells.length }; break; }
        }
      }
      if (!found) return false;
      focusR = shownR = found.r;
      focusU = shownU = found.n > 1 ? found.c / (found.n - 1) : 0;
      return true;
    }

    function setFishDepth(v, spoken) {
      var nv = clamp(v, 0, 5);
      if (nv === fishDepth) return false;
      if (!wide) { loadWideWorld(); }
      syncFishAnchor(cellAt(focusR, focusU));
      fishDepth = nv; wheelAcc = 0;
      focusFishAnchor(fishDepth);
      /* A wheel gesture often arrives with the pointer away from the quiet centre. Its steering
         velocity belongs to travel on the old rung, not to the depth change. Carrying it across
         the boundary changes the focused ancestry while the reader is trying to deepen in place. */
      velX = velY = 0; pointerIn = false; dragging = null; flat = 0;
      depthLockUntil = Date.now() + 320;
      if (spoken !== false) say('Depth: ' + FISH_DEPTHS[fishDepth]);
      kick(); return true;
    }

    function setLevel(v, spoken) {
      var nv = clamp(v, 0, 4);
      if (nv === level) return false;
      level = nv; wheelAcc = 0;
      if (spoken !== false) say('Depth: ' + LEVEL_SAYS[level] +
        (level === 3 && cellAt(focusR, focusU) ? ', ' + cellAt(focusR, focusU).label : ''));
      kick();
      return true;
    }

    function focusOn(list, target) {
      if (!list || !list.length || !target) return;
      var at = list.indexOf(target);
      if (at >= 0) focusU = list.length > 1 ? at / (list.length - 1) : 0;
    }

    function decisionAnchor() {
      if (mode === 'fisheye') {
        syncFishAnchor(cellAt(focusR, focusU));
        var mapped = wide && fishAnchorKey ? wide.decisions[fishAnchorKey] : null;
        if (mapped && mapped.cid) {
          for (var r = 0; r < world.length; r++) {
            for (var c = 0; c < world[r].cells.length; c++) {
              if (world[r].cells[c].id === mapped.cid) return world[r].cells[c];
            }
          }
        }
        return lastLiveAnchor;
      }
      var row = rowAt(shownR);
      if (!row) return null;
      var current = cellAt(focusR, focusU, level);
      if (current && current.receipt) return current;
      if (current && current.members && current.members.length) return current.members[0];
      return row.cells[0] || null;
    }

    function spatialRowFor(decision) {
      if (!decision) return world[0] || null;
      for (var r = 0; r < world.length; r++) if (world[r].cells.indexOf(decision) >= 0) return world[r];
      return world[0] || null;
    }

    function focusAncestor(row, decision, targetLevel) {
      if (!row || !decision || targetLevel <= 0) return;
      if (targetLevel === 1) {
        var area = row.categories.filter(function (node) { return node.sourceId === decision.areaId; })[0];
        focusOn(row.categories, area); return;
      }
      if (targetLevel === 2) {
        var family = row.subcategories.filter(function (node) { return node.sourceId === decision.familyId; })[0];
        focusOn(row.subcategories, family); return;
      }
      focusOn(row.cells, decision);
    }

    function descendLevel(spoken) {
      if (level >= 4) return false;
      var row = rowAt(focusR), current = cellAt(focusR, focusU, level);
      if (level === 1 && current && current.kind === 'area') {
        focusOn(row.subcategories, current.children[0]);
      } else if (level === 2 && current && current.kind === 'family') {
        focusOn(row.cells, current.members[0]);
      }
      return setLevel(level + 1, spoken);
    }

    function ascendLevel(spoken) {
      if (level <= 0) return false;
      var row = rowAt(focusR), current = cellAt(focusR, focusU, level);
      if (level === 3 && current) {
        var family = row.subcategories.filter(function (node) { return node.sourceId === current.familyId; })[0];
        focusOn(row.subcategories, family);
      } else if (level === 2 && current) {
        var area = row.categories.filter(function (node) { return node.sourceId === current.parentId; })[0];
        focusOn(row.categories, area);
      }
      return setLevel(level - 1, spoken);
    }

    function navigateLevel(target, spoken) {
      target = clamp(target, 0, 4);
      var moved = false;
      while (level < target) moved = descendLevel(spoken) || moved;
      while (level > target) moved = ascendLevel(spoken) || moved;
      return moved;
    }

    function setMode(id, spoken) {
      var next = id === 'fisheye' ? 'fisheye' : 'spatial';
      if (next === mode) return false;
      var anchor = decisionAnchor();
      var row = spatialRowFor(anchor);
      mode = next; wheelAcc = 0; press = null; dragging = null;
      velX = velY = 0; pointerIn = false; kbd = false; last = 0;
      if (mode === 'fisheye') {
        if (anchor) lastLiveAnchor = anchor;
        depthLockUntil = Date.now() + 320;
        level = levelShown = 3;
        if (wide && anchor && wide.keyByCid[anchor.id]) fishAnchorKey = wide.keyByCid[anchor.id];
        else pendingFish = { cid: anchor ? anchor.id : null };
        if (wide) focusFishAnchor(fishDepth);
        else { focusR = shownR = 0; focusU = shownU = 0; loadWideWorld(); }
        eng = engTarget = 1;
      } else {
        level = levelShown = 1;
        focusAncestor(row, anchor, 1);
        focusR = shownR = world.indexOf(row);
        shownR = focusR; shownU = focusU; eng = engTarget = 1;
      }
      updateA11y(); layout(); draw();
      if (spoken !== false) say(mode === 'fisheye'
        ? 'Fisheye navigation. Scroll from domains through needs, fields, families, decisions, and evidence.'
        : 'Spatial navigation. Areas inside eight needs.');
      return true;
    }

    function snapshot() {
      var row = rowAt(mode === 'fisheye' ? focusR : shownR);
      var current = mode === 'fisheye' ? cellAt(focusR, focusU)
        : ((eng > 0.05 || kbd) ? cellAt(focusR, focusU, level) : null);
      return {
        version: 2, mode: mode, row: row ? row.id : null, anchor: current ? current.id : null,
        mapAnchor: fishAnchorKey, level: level, depth: fishDepth
      };
    }

    function restore(saved) {
      if (!saved || (saved.version !== 1 && saved.version !== 2)) return false;
      if (saved.mode === 'fisheye') {
        mode = 'fisheye'; level = levelShown = 3;
        fishDepth = fishDepthShown = clamp(Number(saved.depth) || 0, 0, 5);
        pendingFish = { key: saved.mapAnchor || null, cid: saved.version === 1 ? saved.anchor : null };
        focusR = shownR = 0; focusU = shownU = 0;
        velX = velY = 0; pointerIn = false; flat = 0; eng = engTarget = 1;
        updateA11y(); loadWideWorld(); layout(); draw();
        return true;
      }
      var ri = world.findIndex(function (row) { return row.id === saved.row; });
      if (ri < 0) ri = 0;
      focusR = shownR = ri;
      var row = world[ri], target = null;
      [row.cells, row.subcategories, row.categories].some(function (list) {
        target = list.filter(function (item) { return item.id === saved.anchor; })[0] || null;
        return !!target;
      });
      var anchor = target && target.receipt ? target
        : (target && target.members && target.members.length ? target.members[0] : row.cells[0]);
      mode = 'spatial';
      fishDepth = fishDepthShown = clamp(Number(saved.depth) || 0, 0, 5);
      level = levelShown = clamp(Number(saved.level) || 1, 0, 4);
      focusAncestor(row, anchor, level);
      shownU = focusU; velX = velY = 0; pointerIn = false; flat = 0;
      eng = engTarget = mode === 'fisheye' || level !== 1 || !!saved.anchor ? 1 : 0;
      updateA11y(); layout(); draw();
      return true;
    }

    function showLevel(target, spoken) {
      if (mode === 'fisheye') {
        return setFishDepth(target, spoken);
      }
      var anchor = decisionAnchor(), row = rowAt(shownR);
      target = clamp(target, 0, 4);
      level = levelShown = target;
      focusAncestor(row, anchor, target);
      shownR = focusR; shownU = focusU; eng = engTarget = 1;
      updateA11y(); layout(); draw();
      if (spoken !== false) say('Spatial view: ' + LEVEL_SAYS[target] + '.');
      return true;
    }

    function resetView(spoken) {
      if (mode === 'fisheye') {
        fishDepth = fishDepthShown = 0;
        depthLockUntil = Date.now() + 320;
        if (wide) {
          var keys = Object.keys(wide.decisions); fishAnchorKey = keys.length ? keys[0] : null;
          focusFishAnchor(0);
        } else { focusR = shownR = 0; focusU = shownU = 0; loadWideWorld(); }
        velX = velY = 0; pointerIn = false; flat = 0; kbd = false; wheelAcc = 0;
        layout(); draw();
        if (spoken !== false) say('Fisheye reset to domains.');
        return true;
      }
      level = levelShown = 1; fishDepth = fishDepthShown = 0;
      focusR = shownR = 0; focusU = shownU = 0;
      velX = velY = 0; pointerIn = false; flat = 0; kbd = false;
      eng = engTarget = 0; wheelAcc = 0;
      updateA11y(); layout(); draw();
      if (spoken !== false) say('Map reset. Areas inside all eight needs.');
      return true;
    }

    canvas.addEventListener('pointermove', function (e) {
      var b = canvas.getBoundingClientRect();
      var px = e.clientX - b.left, py = e.clientY - b.top;
      if (mode === 'fisheye') {
        if (Date.now() < depthLockUntil) {
          velX = velY = 0; pointerIn = false; return;
        }
        if (dragging) {
          var dragRows = fishRows(fishDepth);
          focusU = clamp(dragging.u - (px - dragging.x) / Math.max(120, W - GUTTER) * 1.6, 0, 1);
          if (e.pointerType !== 'touch') {
            focusR = clamp(dragging.r - (py - dragging.y) / Math.max(120, H - HEAD) * dragRows.length * 0.8,
                           0, Math.max(0, dragRows.length - 1));
          }
          velX = velY = 0; flat = 0.55; shownR = focusR; shownU = focusU;
          layout(); draw(); return;
        }
        if (reduced) {
          focusFromPoint(px, py); shownR = focusR; shownU = focusU; layout(); draw(); return;
        }
        deflect(px, py); kbd = false; kick(); return;
      }
      if (px < GUTTER || py < HEAD) return;
      focusFromPoint(px, py);
      engTarget = 1; kbd = false;
      kick();
    });
    canvas.addEventListener('pointerenter', function () {
      if (mode === 'fisheye' && Date.now() >= depthLockUntil) { pointerIn = true; kick(); }
    });
    canvas.addEventListener('pointerleave', function (e) {
      if (mode === 'fisheye') {
        pointerIn = false; velX = velY = 0; dragging = null; flat = 0; kick(); return;
      }
      if (e.pointerType === 'touch') return;   // a lifted finger is not a departed reader
      if (!kbd) engTarget = 0;
      press = null; kick();
    });
    canvas.addEventListener('pointerdown', function (e) {
      var b = canvas.getBoundingClientRect();
      if (mode === 'fisheye') {
        dragging = { x: e.clientX - b.left, y: e.clientY - b.top,
                     u: focusU, r: focusR, t: Date.now() };
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        return;
      }
      var focusedNow = (eng > 0.05 || kbd) ? cellAt(focusR, focusU) : null;
      press = { x: e.clientX - b.left, y: e.clientY - b.top, was: focusedNow, level: level };
    });
    canvas.addEventListener('pointerup', function (e) {
      var b = canvas.getBoundingClientRect();
      var px = e.clientX - b.left, py = e.clientY - b.top;
      if (mode === 'fisheye') {
        var fishMoved = dragging ? Math.hypot(px - dragging.x, py - dragging.y) : 99;
        var fishQuick = dragging && Date.now() - dragging.t < 700;
        dragging = null; flat = 0;
        if (fishMoved > 8 || !fishQuick) { kick(); return; }
        if (py < HEAD) {
          for (var fh = 0; fh < headCtls.length; fh++) {
            if (px >= headCtls[fh].x && px <= headCtls[fh].x + headCtls[fh].w) {
              setFishDepth(headCtls[fh].depth); return;
            }
          }
          return;
        }
        if (px < GUTTER) {
          for (var fr = 0; fr < rowBoxes.length; fr++) {
            if (py >= rowBoxes[fr].y && py <= rowBoxes[fr].y + rowBoxes[fr].h) {
              if (rowBoxes[fr].row.route) location.hash = rowBoxes[fr].row.route;
              else say(rowBoxes[fr].row.label + '.');
              return;
            }
          }
          return;
        }
        for (var fl = laid.length - 1; fl >= 0; fl--) {
          var hit = laid[fl];
          if (px >= hit.x && px <= hit.x + hit.w && py >= hit.y && py <= hit.y + hit.h) {
            focusR = shownR = hit.ri;
            var hitRow = fishRows(fishDepth)[hit.ri];
            focusU = shownU = hitRow && hitRow.cells.length > 1 ? hit.ci / (hitRow.cells.length - 1) : 0;
            syncFishAnchor(hit.cell);
            if (fishDepth < 4) { setFishDepth(fishDepth + 1); return; }
            if (hit.cell.route) { location.hash = hit.cell.route; return; }
            var stateText = hit.cell.kind === 'evidence' ? hit.cell.scent : mapLine(hit.cell);
            say(hit.cell.label + '. ' + String(stateText || '').replace(/[.!?]+$/, '') + '.');
            layout(); draw(); return;
          }
        }
        kick(); return;
      }
      var moved = press ? Math.hypot(px - press.x, py - press.y) : 99;
      var was = press && press.was, pressLevel = press ? press.level : level;
      press = null;
      if (moved > 8) return;
      if (py < HEAD) {
        for (var i = 0; i < headCtls.length; i++) {
          if (px >= headCtls[i].x && px <= headCtls[i].x + headCtls[i].w) { navigateLevel(headCtls[i].level); return; }
        }
        return;
      }
      if (px < GUTTER) {
        for (var g = 0; g < rowBoxes.length; g++) {
          if (py >= rowBoxes[g].y && py <= rowBoxes[g].y + rowBoxes[g].h) { location.hash = rowBoxes[g].row.route; return; }
        }
        return;
      }
      focusFromPoint(px, py);
      engTarget = 1;
      if (pressLevel === 0) {                    // a need steps down onto its areas
        descendLevel();
        say(rowAt(focusR).label + '. Choose an area.');
        return;
      }
      var now = cellAt(focusR, focusU);
      if (pressLevel === 1 && now && now.kind === 'area') {
        var areaName = now.label; descendLevel();
        say(areaName + '. Choose a kind inside it.');
        return;
      }
      if (pressLevel === 2 && now && now.kind === 'family') {
        var familyName = now.label; descendLevel();
        say(familyName + '. ' + plural(now.members.length, 'decision') + '.');
        return;
      }
      if (was && now === was) { location.hash = now.route; return; }
      if (now) say(now.label + ', ' + STAKES_SAYS[now.stakes] + (now.scent ? '. ' + now.scent : '') + '. Press again to open.');
      kick();
    });

    /* The wheel travels the ontological scale — and only the scale. While a rung exists in the
       direction of the scroll the step is taken and the page holds still; at the top rung
       scrolling up, and at the bottom rung scrolling down, the event is left alone and the page
       scrolls, so the map borrows the wheel exactly as far as it can use it. */
    canvas.addEventListener('wheel', function (e) {
      var dirDown = e.deltaY > 0;
      if (mode === 'fisheye') {
        if ((dirDown && fishDepth >= 5) || (!dirDown && fishDepth <= 0)) return;
        e.preventDefault(); wheelAcc += e.deltaY;
        if (wheelAcc > WHEEL_STEP) setFishDepth(fishDepth + 1);
        else if (wheelAcc < -WHEEL_STEP) setFishDepth(fishDepth - 1);
        return;
      }
      if ((dirDown && level >= 4) || (!dirDown && level <= 0)) return;   // the page's wheel again
      e.preventDefault();
      wheelAcc += e.deltaY;
      if (wheelAcc > WHEEL_STEP) descendLevel();
      else if (wheelAcc < -WHEEL_STEP) ascendLevel();
    }, { passive: false });

    function say(msg) { try { if (typeof global.announce === 'function') global.announce(msg); } catch (e) {} }

    canvas.addEventListener('keydown', function (e) {
      if (mode === 'fisheye') {
        var fishRowsNow = fishRows(fishDepth), fishRow = rowAt(focusR), fishN = fishRow ? fishRow.cells.length : 1;
        var fishStep = 1 / Math.max(1, fishN - 1);
        if (e.key === 'ArrowRight') focusU = clamp(focusU + fishStep, 0, 1);
        else if (e.key === 'ArrowLeft') focusU = clamp(focusU - fishStep, 0, 1);
        else if (e.key === 'ArrowDown') focusR = clamp(Math.round(focusR) + 1, 0, Math.max(0, fishRowsNow.length - 1));
        else if (e.key === 'ArrowUp') focusR = clamp(Math.round(focusR) - 1, 0, Math.max(0, fishRowsNow.length - 1));
        else if (e.key === '+' || e.key === '=') { e.preventDefault(); setFishDepth(fishDepth + 1); return; }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); setFishDepth(fishDepth - 1); return; }
        else if (e.key === 'Enter') {
          e.preventDefault();
          var fishCell = cellAt(focusR, focusU); syncFishAnchor(fishCell);
          if (fishDepth < 4) { setFishDepth(fishDepth + 1); return; }
          if (fishCell && fishCell.route) location.hash = fishCell.route;
          else if (fishCell) say(fishCell.label + '. ' + String(mapLine(fishCell) || '').replace(/[.!?]+$/, '') + '.');
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          if (fishDepth > 0) { setFishDepth(fishDepth - 1); return; }
          velX = velY = 0; pointerIn = false; flat = 0; kick(); return;
        } else return;
        e.preventDefault();
        kbd = true; velX = velY = 0; pointerIn = false; flat = 0;
        shownR = focusR; shownU = focusU; layout(); draw();
        var fishNow = cellAt(focusR, focusU); syncFishAnchor(fishNow);
        if (fishNow) say(fishNow.label + ', in ' + rowAt(focusR).label + '. ' + mapLine(fishNow) + '.');
        return;
      }
      var row = rowAt(focusR), m = row ? itemsOf(row, level).length : 1;
      var step = 1 / Math.max(1, m - 1);
      if (e.key === 'ArrowRight') focusU = clamp(focusU + step, 0, 1);
      else if (e.key === 'ArrowLeft') focusU = clamp(focusU - step, 0, 1);
      else if (e.key === 'ArrowDown') focusR = clamp(Math.round(focusR) + 1, 0, world.length - 1);
      else if (e.key === 'ArrowUp') focusR = clamp(Math.round(focusR) - 1, 0, world.length - 1);
      else if (e.key === '+' || e.key === '=') { descendLevel(); kbd = true; engTarget = 1; return; }
      else if (e.key === '-' || e.key === '_') { ascendLevel(); kbd = true; engTarget = 1; return; }
      else if (e.key === 'Enter') {
        if (level < 3) { descendLevel(); kbd = true; engTarget = 1; return; }
        var fc = cellAt(focusR, focusU); if (fc && fc.route) location.hash = fc.route; return;
      }
      else if (e.key === 'Escape') {
        if (level > 0) { ascendLevel(); return; }
        kbd = false; engTarget = 0; kick(); return;
      }
      else return;
      e.preventDefault();
      kbd = true; engTarget = 1; kick();
      var c = cellAt(focusR, focusU);
      if (level === 0) say(rowAt(focusR).label + ', ' + plural(rowAt(focusR).cells.length, 'decision') + '. ' + (rowAt(focusR).reads || ''));
      else if (c) say(c.label + ', in ' + rowAt(focusR).label + ', ' + STAKES_SAYS[c.stakes] +
                 (c.scent ? '. ' + c.scent : ''));
    });

    function resize() {
      var r = box.getBoundingClientRect();
      W = Math.round(r.width); H = Math.round(r.height);
      if (!W || !H) { requestAnimationFrame(function () { resize(); }); return; }
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      layout(); draw();
    }

    if (global.ResizeObserver) { try { new ResizeObserver(function () { resize(); }).observe(box); } catch (e) {} }
    global.addEventListener('resize', resize);
    var mq = global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)');
    if (mq && mq.addEventListener) mq.addEventListener('change', function () { TH = tokens(box); layout(); draw(); });
    document.addEventListener('cc:theme', function () { TH = tokens(box); layout(); draw(); });

    if (!world.length) {
      var gt = 0, gi = setInterval(function () {
        var cat = readCatalog() || [];
        if (cat.length) {
          clearInterval(gi);
          world = buildWorld(cat, (global.CC_BUNDLE && global.CC_BUNDLE.ontology) || null);
          layout(); draw();
        } else if (++gt > 40) clearInterval(gi);
      }, 250);
    }

    updateA11y();
    resize();

    CC.homeLens.setMode = function (id) { return setMode(id); };
    CC.homeLens.mode = function () { return mode; };
    CC.homeLens.context = function () { return contextState(); };
    CC.homeLens.state = function () { return snapshot(); };
    CC.homeLens.restore = function (saved) { return restore(saved); };
    CC.homeLens.setView = function (v) {
      if (mode === 'fisheye') return setFishDepth(v);
      var moved = navigateLevel(v);
      kbd = true; engTarget = 1; kick();
      return moved;
    };
    CC.homeLens.showLevel = function (v) { return showLevel(v); };
    CC.homeLens.reset = function () { return resetView(); };
    CC.homeLens.modes = function () {
      return [
        { id: 'spatial', label: 'Spatial', description: 'Zoom from eight needs to areas, kinds, decisions, and evidence.' },
        { id: 'fisheye', label: 'Fisheye', description: 'Scroll through domains, needs, fields, families, decisions, and evidence. The whole map loads only when opened.' }
      ];
    };

    CC.homeLens.setLens = function (id) {
      lens = id || null;
      layout(); draw();
      if (lens) {
        var lit = 0;
        for (var i = 0; i < world.length; i++) {
          for (var j = 0; j < world[i].cells.length; j++) if (world[i].cells[j].lenses[lens]) lit++;
        }
        var def = null;
        for (var l = 0; l < LENSES.length; l++) if (LENSES[l].id === lens) def = LENSES[l];
        say((def ? def.label : lens) + ': ' + lit + ' decisions carry it; the rest stay in place, dimmed.');
      } else {
        say('All measures.');
      }
    };
    CC.homeLens.setInfo = function (id) {
      info = id || null;
      layout(); draw();
      say(info ? 'Cells now report ' + (info === 'options' ? 'how many options each holds'
        : info === 'sourced' ? 'how much of each has a second source'
        : info === 'stakes' ? 'the stakes of each choice'
        : 'how far apart the options sit') + '.' : 'Cells report their names.');
    };
    CC.homeLens.infos = function () {
      return [
        { id: 'options', label: 'Options' },
        { id: 'sourced', label: 'Second-sourced' },
        { id: 'stakes', label: 'Stakes' },
        { id: 'differ', label: 'Options differ' }
      ];
    };
    CC.homeLens.lenses = function () {
      // counts computed from the data at hand, never maintained beside it
      return LENSES.map(function (d) {
        var n = 0;
        for (var i = 0; i < world.length; i++) {
          for (var j = 0; j < world[i].cells.length; j++) if (world[i].cells[j].lenses[d.id]) n++;
        }
        return { id: d.id, label: d.label, count: n };
      }).filter(function (d) { return d.count > 0; });
    };

    CC.homeLens._debug = {
      get world() { return world; }, get laid() { return laid; }, get rows() { return rowBoxes; },
      get wide() { return wide; }, get mapState() { return wideStatus; },
      get focus() { return { r: shownR, u: shownU, level: level, eng: eng, lens: lens, info: info,
                             mode: mode, depth: fishDepth, mapAnchor: fishAnchorKey,
                             flat: flat, vx: velX, vy: velY }; },
      pointAt: function (px, py) { focusFromPoint(px, py); engTarget = 1; eng = 1; shownR = focusR; shownU = focusU; layout(); draw(); },
      setFocus: function (r, u) { focusR = r; focusU = u; engTarget = 1; eng = 1; shownR = r; shownU = u; layout(); draw(); },
      setLevel: function (v) { setLevel(v, false); levelShown = level; layout(); draw(); },
      setDepth: function (v) { setFishDepth(v, false); fishDepthShown = fishDepth; layout(); draw(); },
      setMode: function (v) { setMode(v, false); },
      steer: function (x, y) { velX = x; velY = y; pointerIn = true; kick(); },
      stop: function () { velX = velY = 0; pointerIn = false; kick(); },
      blur: function () { engTarget = 0; eng = 0; layout(); draw(); }
    };
  }

  CC.homeLens = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
