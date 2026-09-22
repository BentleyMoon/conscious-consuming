// The route walker's enhancements. The page is complete without this file: every station, source,
// and date is static HTML, which is what the no-script contract requires. What scripting adds is
// the learner's own layer: stated conditions, walked marks, notes, the time-scaled line, and the
// trail export. All of it stays in this browser; there is no server and nothing is sent.
(function () {
  'use strict';

  var dataEl = document.getElementById('route-data');
  if (!dataEl) return;
  var route;
  try { route = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var slug = document.body.getAttribute('data-route') || 'route';
  var KEY = 'kosplora-trail-' + slug;

  function loadTrail() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function saveTrail(t) {
    try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) { /* private mode: the page still works */ }
  }
  var trail = loadTrail();

  // ---- minutes, parsed from strings like "40m", "1h", "2h30m" ----
  function minutes(s) {
    if (!s) return 0;
    var h = /([\d.]+)\s*h/.exec(s), m = /(\d+)\s*m/.exec(s);
    return (h ? parseFloat(h[1]) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
  }

  // ---- the route drawn to the scale it claims: dot spacing is station time ----
  var holder = document.querySelector('.timeline');
  if (holder && route.stations) {
    var mins = route.stations.map(function (s) { return Math.max(minutes(s.time), 10); });
    var total = mins.reduce(function (a, b) { return a + b; }, 0);
    var W = 640, PAD = 14, y = 26, x = PAD;
    var span = W - PAD * 2;
    var parts = ['<svg viewBox="0 0 ' + W + ' 52" width="' + W + '" height="52" role="img" ' +
      'aria-label="The route as a line: ' + route.stations.length + ' stations across about ' +
      Math.round(total / 60 * 10) / 10 + ' hours, spaced by their estimated time.">'];
    parts.push('<line x1="' + PAD + '" y1="' + y + '" x2="' + (W - PAD) + '" y2="' + y +
      '" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>');
    route.stations.forEach(function (s, i) {
      parts.push('<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="5" fill="currentColor"/>');
      parts.push('<text x="' + x.toFixed(1) + '" y="' + (y + 20) + '" text-anchor="middle" ' +
        'font-size="9" font-family="monospace" fill="currentColor" fill-opacity="0.7">' + (i + 1) + '</text>');
      x += span * (mins[i] / total);
    });
    parts.push('<circle cx="' + (W - PAD) + '" cy="' + y + '" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>');
    parts.push('<text x="' + (W - PAD) + '" y="' + (y - 12) + '" text-anchor="end" font-size="9" ' +
      'font-family="monospace" fill="currentColor" fill-opacity="0.7">' +
      Math.floor(total / 60) + 'h' + (total % 60 ? (total % 60) + 'm' : '') + '</text>');
    parts.push('</svg>');
    holder.innerHTML = parts.join('');
  }

  // ---- conditions: asked once, rendered back as a sentence, kept here ----
  var form = document.querySelector('.conditions form');
  var line = document.querySelector('.conditions-line');
  function sentence(c) {
    if (!c.time && !c.energy && !c.social) return '';
    var bits = [];
    if (c.time) bits.push(c.time);
    if (c.energy) bits.push(c.energy + ' energy');
    if (c.social) bits.push(c.social);
    return 'Your conditions: ' + bits.join(', ') + '. Stations that need more than that show their alternatives.';
  }
  if (form && line) {
    ['time', 'energy', 'social'].forEach(function (name) {
      var el = form.elements[name];
      if (el && trail.conditions && trail.conditions[name]) el.value = trail.conditions[name];
    });
    form.addEventListener('change', function () {
      trail.conditions = {
        time: form.elements.time.value,
        energy: form.elements.energy.value,
        social: form.elements.social.value,
      };
      line.textContent = sentence(trail.conditions);
      saveTrail(trail);
    });
    line.textContent = sentence(trail.conditions || {});
  }

  // ---- walked marks and notes: the learner's record, never the site's metric ----
  document.querySelectorAll('.station').forEach(function (sec, i) {
    var btn = document.createElement('button');
    btn.className = 'walkbtn';
    btn.type = 'button';
    var walked = trail.walked && trail.walked[i];
    btn.setAttribute('aria-pressed', walked ? 'true' : 'false');
    btn.textContent = walked ? 'Walked' : 'Mark walked';
    btn.addEventListener('click', function () {
      trail.walked = trail.walked || {};
      trail.walked[i] = !trail.walked[i];
      btn.setAttribute('aria-pressed', trail.walked[i] ? 'true' : 'false');
      btn.textContent = trail.walked[i] ? 'Walked' : 'Mark walked';
      saveTrail(trail);
    });

    var note = document.createElement('textarea');
    note.placeholder = 'Notes for this station stay in this browser until you export them.';
    note.setAttribute('aria-label', 'Notes for station ' + (i + 1));
    if (trail.notes && trail.notes[i]) note.value = trail.notes[i];
    note.addEventListener('input', function () {
      trail.notes = trail.notes || {};
      trail.notes[i] = note.value;
      saveTrail(trail);
    });

    sec.appendChild(btn);
    sec.appendChild(note);
  });

  // ---- the trail leaves with the learner ----
  var exportBtn = document.getElementById('export-trail');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var out = {
        kind: 'trail',
        format: 'kosplora-trail/0.1',
        route: slug,
        question: route.question,
        exported: new Date().toISOString().slice(0, 10),
        conditions: trail.conditions || null,
        walked: trail.walked || {},
        notes: trail.notes || {},
      };
      var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = slug + '-trail.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
})();
