/* The needs rose: the eight needs as a small dial above the index, kin to the survey on the
   front door. The same steering idea at its simplest: push from the centre and the need in that
   direction lights; let go with a tap and the index below opens there, the rest dimming, which
   is the page's own rule. Tap the centre to bring everything back. It is a pointer for the big
   chart underneath, not a rival to it: eight points, their counts, nothing else.
   Same house physics as the survey: colours read from the theme tokens at draw time, one sun
   for the lit faces, a benchmark mark per point, patient motion only. */
(function (global) {
  'use strict';
  var CC = global.CC = global.CC || {};

  // the chart abbreviations for the needs, by ontology id
  var SHORT = { nourish: 'FOOD', care: 'CARE', 'keep-a-home': 'HOME', connect: 'CONNECT',
    move: 'MOVE', learn: 'LEARN', 'give-and-act': 'GIVE', protect: 'PROTECT' };

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

  function mount(boxId, getNeeds, onPick, onClear) {
    var box = document.getElementById(boxId);
    if (!box || box.dataset.roseMounted) return;
    var needs = (typeof getNeeds === 'function' ? getNeeds() : getNeeds) || [];
    if (!needs.length) return;
    box.dataset.roseMounted = '1';

    var canvas = document.createElement('canvas');
    canvas.className = 'needsrose-canvas';
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label',
      'Dial of the eight needs. Push the pointer toward a need to light it, tap to open it in the ' +
      'index below, tap the centre to show every need again. With a keyboard: arrow keys move the ' +
      'light, Enter opens, Escape shows everything.');
    box.appendChild(canvas);

    var TH = tokens(box);
    var W = 0, H = 0, R = 0, DPR = Math.max(1, global.devicePixelRatio || 1);
    var hot = -1, chosen = -1;
    var pointer = { inside: false, x: 0, y: 0 };
    var running = false, visible = true;
    var SUN = { x: -0.42, y: -0.46 };

    function resize() {
      var r = box.getBoundingClientRect();
      W = Math.round(r.width); H = Math.round(r.height); R = Math.min(W, H) / 2;
      if (!W || !H) { requestAnimationFrame(function () { resize(); wake(); }); return; }
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    }

    function slot(i) {
      var th = -Math.PI / 2 + (i / needs.length) * Math.PI * 2;
      return { th: th, x: W / 2 + Math.cos(th) * R * 0.66, y: H / 2 + Math.sin(th) * R * 0.56 };
    }

    function draw() {
      if (!W || !H) return;
      var ctx = canvas.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, R - 1, 0, Math.PI * 2); ctx.clip();
      var g = ctx.createRadialGradient(W / 2 + SUN.x * R * 0.5, H / 2 + SUN.y * R * 0.5, R * 0.1, W / 2, H / 2, R * 1.1);
      g.addColorStop(0, TH.surface); g.addColorStop(1, TH.bg);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = TH.line; ctx.globalAlpha = 0.4; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.ellipse(W / 2, H / 2, R * 0.66, R * 0.56, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

      // the steering line, centre to pointer, while a need is lit by heading
      if (pointer.inside && hot >= 0 && chosen < 0) {
        ctx.strokeStyle = TH.accent; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(W / 2, H / 2); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.textAlign = 'center';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
      for (var i = 0; i < needs.length; i++) {
        var p = slot(i);
        var active = i === (chosen >= 0 ? chosen : hot);
        var dim = chosen >= 0 && i !== chosen;
        var a = dim ? 0.35 : 1;
        var rad = active ? 5 : 3.4;
        ctx.globalAlpha = a;
        ctx.fillStyle = active ? TH.accent : TH.muted;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = TH.surface; ctx.globalAlpha = a * 0.55;
        ctx.beginPath(); ctx.arc(p.x + SUN.x * rad * 0.4, p.y + SUN.y * rad * 0.4, rad * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = a;
        ctx.strokeStyle = TH.ink; ctx.lineWidth = 0.6; ctx.globalAlpha = a * 0.3;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = a;
        var name = SHORT[needs[i].id] || String(needs[i].label || needs[i].id).toUpperCase().slice(0, 8);
        ctx.fillStyle = active ? TH.accent : TH.ink;
        ctx.font = '600 ' + (active ? 11 : 10) + 'px ' + TH.font;
        // side treatment only for the true east and west points; the diagonals sit at cos 0.707
        // and pulling them inward made PROTECT and CARE meet in the middle
        var above = Math.sin(p.th) < -0.2, side = Math.abs(Math.cos(p.th)) > 0.9;
        var lx = p.x, ly = above ? p.y - 10 : p.y + 18;
        if (side) { ctx.textAlign = Math.cos(p.th) > 0 ? 'right' : 'left'; lx = p.x + (Math.cos(p.th) > 0 ? -10 : 10); ly = p.y - 6; }
        ctx.fillText(name, lx, ly);
        ctx.fillStyle = TH.hint;
        ctx.font = (active ? 10 : 9) + 'px ' + TH.font;
        ctx.fillText(String(needs[i].count), lx, ly + 11);
        ctx.textAlign = 'center';
      }
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.globalAlpha = 1;

      ctx.fillStyle = chosen >= 0 ? TH.accent : TH.hint;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, chosen >= 0 ? 2.6 : 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = TH.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, R - 1, 0, Math.PI * 2); ctx.stroke();
    }

    function frame() { if (!running) return; draw(); running = false; }
    function wake() { if (!running && visible) { running = true; requestAnimationFrame(frame); } }

    function headingIndex(px, py) {
      var dx = px - W / 2, dy = py - H / 2;
      if (Math.hypot(dx, dy) < R * 0.16) return -1; // the centre is its own place
      var th = Math.atan2(dy, dx);
      var best = -1, bd = 1e9;
      for (var i = 0; i < needs.length; i++) {
        var d = Math.abs(Math.atan2(Math.sin(th - slot(i).th), Math.cos(th - slot(i).th)));
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }

    function choose(i) {
      chosen = i;
      if (typeof onPick === 'function') onPick(needs[i]);
      wake();
    }
    function clearChoice() {
      chosen = -1;
      if (typeof onClear === 'function') onClear();
      wake();
    }

    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
      pointer.inside = Math.hypot(pointer.x - W / 2, pointer.y - H / 2) <= R;
      var h = pointer.inside ? headingIndex(pointer.x, pointer.y) : -1;
      if (h !== hot) { hot = h; wake(); }
      canvas.style.cursor = pointer.inside ? 'pointer' : 'default';
    });
    canvas.addEventListener('pointerleave', function () { pointer.inside = false; if (hot >= 0) { hot = -1; wake(); } });
    canvas.addEventListener('click', function (e) {
      var r = canvas.getBoundingClientRect();
      var i = headingIndex(e.clientX - r.left, e.clientY - r.top);
      if (i < 0) clearChoice(); else choose(i);
    });
    canvas.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { hot = (hot + 1 + needs.length) % needs.length; e.preventDefault(); wake(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { hot = (hot - 1 + needs.length) % needs.length; e.preventDefault(); wake(); }
      if (e.key === 'Enter' && hot >= 0) choose(hot);
      if (e.key === 'Escape') clearChoice();
    });

    if (global.ResizeObserver) new ResizeObserver(function () { resize(); wake(); }).observe(box);
    if (global.IntersectionObserver) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) wake(); }).observe(canvas);
    }
    var refreshTokens = function () { TH = tokens(box); wake(); };
    new MutationObserver(refreshTokens).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (global.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refreshTokens);

    resize(); wake();
    CC.needsRose._debug = { get hot() { return hot; }, get chosen() { return chosen; }, needs: needs, choose: choose, clear: clearChoice };
  }

  CC.needsRose = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
