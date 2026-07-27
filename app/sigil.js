/* The Value Sigil — a small, deterministic emblem rendered from a values map ({key: 0..5}). "Identity without
   identity": the same values always draw the same mark; no name, no account, computed locally. A radial
   fingerprint — one hued spoke + node per value, length = how much you weight it, with a soft bloom in the
   dominant value's hue. PURE: no DOM, returns an SVG string. Attaches to window.CC.sigil; exports for Node. */
(function (root) {
  'use strict';
  // Soft, distinguishable hues per value (universal vocabulary + CC themes + a few instance themes). Unknown
  // keys get a stable hue from a hash, so ANY value vocabulary renders consistently.
  var HUES = {
    planet: 150, people: 8, openness: 212, access: 172, wellbeing: 336, autonomy: 244, animals: 38, community: 24, quality: 266, joy: 48,
    health: 340, honesty: 212, privacy: 244, cost: 172, local: 24,
    rigor: 266, open: 212, ease: 172, fresh: 150, reach: 24, 'private': 244
  };
  function hashHue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 360; }
  function hueOf(k) { return HUES[k] != null ? HUES[k] : hashHue(k); }

  function sigil(values, opts) {
    opts = opts || {};
    var size = opts.size || 96, R = size / 2, cx = R, cy = R;
    var keys = Object.keys(values || {}).filter(function (k) { return values[k] != null; });
    keys.sort();                                              // stable order → the same profile always draws identically
    var n = keys.length;
    if (!n) { return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="' + cx + '" cy="' + cy + '" r="' + (R - 2) + '" fill="none" stroke="currentColor" stroke-opacity="0.15"/></svg>'; }
    var maxR = R * 0.82, minR = R * 0.18;
    var pts = [], spokes = '', dots = '', dom = keys[0], dw = -1;
    for (var i = 0; i < n; i++) {
      var k = keys[i], w = Math.max(0, Math.min(5, +values[k] || 0));
      if (w > dw) { dw = w; dom = k; }
      var ang = -Math.PI / 2 + i * 2 * Math.PI / n;          // first value at top, clockwise
      var r = minR + (w / 5) * (maxR - minR);
      var x = cx + r * Math.cos(ang), y = cy + r * Math.sin(ang);
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
      var hue = hueOf(k);
      spokes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="hsl(' + hue + ',48%,55%)" stroke-opacity="0.32" stroke-width="1"/>';
      dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (1.6 + w * 0.5).toFixed(1) + '" fill="hsl(' + hue + ',58%,55%)" opacity="0.95"/>';
    }
    var dh = hueOf(dom);
    var ring = '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R - 2).toFixed(1) + '" fill="none" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>';
    var bloom = '<polygon points="' + pts.join(' ') + '" fill="hsl(' + dh + ',52%,55%)" fill-opacity="0.16" stroke="hsl(' + dh + ',46%,52%)" stroke-width="1.4" stroke-linejoin="round"/>';
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A unique mark of your values">' +
      ring + spokes + bloom + dots + '</svg>';
  }

  // A shareable VALUES-PASSPORT CARD (SVG): the sigil + what you value + the no-account promise. Self-contained
  // (system fonts only, no external refs) so it renders crisply and converts to PNG on a canvas without tainting.
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function passportCard(values, opts) {
    opts = opts || {};
    var W = opts.size || 1080, H = W;
    var PAPER = '#faf8f3', INK = '#2c2c28', MUTE = '#6b6a62', GREEN = '#1d7a5a', LINE = 'rgba(0,0,0,0.10)';
    var SANS = '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif';
    var SERIF = 'Iowan Old Style,Palatino Linotype,Palatino,Georgia,serif';
    var sigSz = Math.round(W * 0.45), sx = Math.round((W - sigSz) / 2), sy = Math.round(W * 0.205);
    var sig = sigil(values, { size: sigSz }).replace('<svg ', '<svg x="' + sx + '" y="' + sy + '" ');
    var hi = Object.keys(values || {}).filter(function (k) { return (+values[k] || 0) >= 4; })
      .sort(function (a, b) { return values[b] - values[a]; }).slice(0, 4).map(cap);
    var line = hi.length ? hi.join('  ·  ') : 'Balanced — a little of everything';
    function t(x, y, fill, fam, fs, fw, ls, str) {
      return '<text x="' + x + '" y="' + y + '" text-anchor="middle" fill="' + fill + '" font-family="' + fam + '" font-size="' + fs + '" font-weight="' + fw + '"' + (ls ? ' letter-spacing="' + ls + '"' : '') + '>' + str + '</text>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="My Values Passport card">' +
      '<rect width="' + W + '" height="' + H + '" fill="' + PAPER + '"/>' +
      '<rect x="22" y="22" width="' + (W - 44) + '" height="' + (H - 44) + '" rx="28" fill="none" stroke="' + LINE + '" stroke-width="2"/>' +
      t(W / 2, Math.round(W * 0.13), GREEN, SANS, Math.round(W * 0.027), 700, Math.round(W * 0.005), 'MY VALUES PASSPORT') +
      '<g style="color:' + GREEN + '">' + sig + '</g>' +
      t(W / 2, Math.round(W * 0.775), INK, SERIF, Math.round(W * 0.044), 600, 0, line) +
      t(W / 2, Math.round(W * 0.84), MUTE, SANS, Math.round(W * 0.024), 400, 0, 'no name · no account · carried on my device') +
      t(W / 2, Math.round(W * 0.93), GREEN, SANS, Math.round(W * 0.028), 700, 0, 'The Open Values Standard') +
      '</svg>';
  }

  // A shareable COLLECTIVE card for an Assembly — the collective sigil + what the group SHARES and, honestly,
  // where it's still SPLIT (never faking unanimity), and the uncapturable promise. Takes a merged collective
  // ({ name, n, values, agreement, dissent } from engine.mergePassports).
  function collectiveCard(coll, opts) {
    opts = opts || {}; var W = opts.size || 1080, H = W;
    var PAPER = '#faf8f3', INK = '#2c2c28', MUTE = '#6b6a62', GREEN = '#1d7a5a', CLAY = '#a8432f', LINE = 'rgba(0,0,0,0.10)';
    var SANS = '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', SERIF = 'Iowan Old Style,Palatino Linotype,Palatino,Georgia,serif';
    coll = coll || {}; var values = coll.values || {}, agr = coll.agreement || {}, name = coll.name || 'Our assembly', n = coll.n || 0;
    function esc2(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; }); }
    function t(x, y, fill, fam, fs, fw, ls, str) {
      return '<text x="' + x + '" y="' + y + '" text-anchor="middle" fill="' + fill + '" font-family="' + fam + '" font-size="' + fs + '" font-weight="' + fw + '"' + (ls ? ' letter-spacing="' + ls + '"' : '') + '>' + str + '</text>';
    }
    var sigSz = Math.round(W * 0.42), sx = Math.round((W - sigSz) / 2), sy = Math.round(W * 0.20);
    var sig = sigil(values, { size: sigSz }).replace('<svg ', '<svg x="' + sx + '" y="' + sy + '" ');
    var shared = Object.keys(values).filter(function (k) { return values[k] >= 3.5 && agr[k] && agr[k].consensus >= 0.5; })
      .sort(function (a, b) { return values[b] - values[a]; }).slice(0, 4).map(cap);
    var split = (coll.dissent || []).filter(function (k) { return agr[k] && agr[k].consensus < 0.5; }).slice(0, 3).map(cap);
    var sharedLine = shared.length ? shared.join('  ·  ') : 'finding common ground';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Our assembly values card">' +
      '<rect width="' + W + '" height="' + H + '" fill="' + PAPER + '"/>' +
      '<rect x="22" y="22" width="' + (W - 44) + '" height="' + (H - 44) + '" rx="28" fill="none" stroke="' + LINE + '" stroke-width="2"/>' +
      t(W / 2, Math.round(W * 0.115), INK, SERIF, Math.round(W * 0.05), 600, 0, esc2(name)) +
      t(W / 2, Math.round(W * 0.16), MUTE, SANS, Math.round(W * 0.024), 400, 0, n + ' ' + (n === 1 ? 'voice' : 'voices') + ' · a shared stance') +
      '<g style="color:' + GREEN + '">' + sig + '</g>' +
      t(W / 2, Math.round(W * 0.715), GREEN, SANS, Math.round(W * 0.022), 700, Math.round(W * 0.004), 'WHAT WE SHARE') +
      t(W / 2, Math.round(W * 0.765), INK, SERIF, Math.round(W * 0.04), 600, 0, sharedLine) +
      (split.length
        ? t(W / 2, Math.round(W * 0.83), CLAY, SANS, Math.round(W * 0.023), 600, 0, 'still split on  ' + split.join('  ·  '))
        : t(W / 2, Math.round(W * 0.83), MUTE, SANS, Math.round(W * 0.023), 400, 0, 'in remarkable agreement')) +
      t(W / 2, Math.round(W * 0.89), MUTE, SANS, Math.round(W * 0.022), 400, 0, 'no server · no account · reproducible by anyone with the same files') +
      t(W / 2, Math.round(W * 0.945), GREEN, SANS, Math.round(W * 0.027), 700, 0, 'The Open Values Standard · Assembly') +
      '</svg>';
  }

  // G4 — a shareable RESEMBLANCE card: "X is the Y of Z" + the shape of values they SHARE, drawn as the sigil.
  // The metaphor made spreadable, in the same calm style as the passport card. Self-contained (system fonts).
  function analogyCard(o, opts) {
    opts = opts || {}; o = o || {}; var W = opts.size || 1080, H = W;
    var PAPER = '#faf8f3', INK = '#2c2c28', MUTE = '#6b6a62', GREEN = '#1d7a5a', LINE = 'rgba(0,0,0,0.10)';
    var SANS = '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', SERIF = 'Iowan Old Style,Palatino Linotype,Palatino,Georgia,serif';
    function esc2(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; }); }
    function t(x, y, fill, fam, fs, fw, ls, str) { return '<text x="' + x + '" y="' + y + '" text-anchor="middle" fill="' + fill + '" font-family="' + fam + '" font-size="' + fs + '" font-weight="' + fw + '"' + (ls ? ' letter-spacing="' + ls + '"' : '') + '>' + str + '</text>'; }
    var sigSz = Math.round(W * 0.32), sx = Math.round((W - sigSz) / 2), sy = Math.round(W * 0.20);
    var sig = sigil(o.values || {}, { size: sigSz }).replace('<svg ', '<svg x="' + sx + '" y="' + sy + '" ');
    var res = (o.resemblance != null) ? (o.resemblance + '% alike — the same shape of values') : 'alike by your values';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A values resemblance card">' +
      '<rect width="' + W + '" height="' + H + '" fill="' + PAPER + '"/>' +
      '<rect x="22" y="22" width="' + (W - 44) + '" height="' + (H - 44) + '" rx="28" fill="none" stroke="' + LINE + '" stroke-width="2"/>' +
      t(W / 2, Math.round(W * 0.125), GREEN, SANS, Math.round(W * 0.023), 700, Math.round(W * 0.005), 'A RESEMBLANCE BY YOUR VALUES') +
      '<g style="color:' + GREEN + '">' + sig + '</g>' +
      t(W / 2, Math.round(W * 0.625), INK, SERIF, Math.round(W * 0.058), 600, 0, esc2(o.aName || '')) +
      t(W / 2, Math.round(W * 0.69), MUTE, SANS, Math.round(W * 0.026), 400, 0, 'is the') +
      t(W / 2, Math.round(W * 0.752), GREEN, SERIF, Math.round(W * 0.052), 600, 0, esc2(o.bName || '')) +
      t(W / 2, Math.round(W * 0.807), MUTE, SANS, Math.round(W * 0.026), 400, 0, 'of ' + esc2(o.aCat || '')) +
      t(W / 2, Math.round(W * 0.872), INK, SANS, Math.round(W * 0.022), 600, 0, res) +
      t(W / 2, Math.round(W * 0.918), MUTE, SANS, Math.round(W * 0.0185), 400, 0, 'a suggestion, never an endorsement · computed on my device') +
      t(W / 2, Math.round(W * 0.957), GREEN, SANS, Math.round(W * 0.022), 700, 0, 'Conscious Consuming · The Open Values Standard') +
      '</svg>';
  }

  root.CC = root.CC || {};
  root.CC.sigil = sigil; root.CC.passportCard = passportCard; root.CC.collectiveCard = collectiveCard; root.CC.analogyCard = analogyCard;
  root.CC.valueHue = hueOf;                                   // the canonical per-value colour language (one source of truth)
  sigil.passportCard = passportCard; sigil.collectiveCard = collectiveCard; sigil.analogyCard = analogyCard; sigil.valueHue = hueOf;
  // Browser-only: render any card SVG to a PNG download. Shared by the You page + the Assembly (one place to fix).
  if (typeof document !== 'undefined') {
    root.CC.downloadCardPNG = function (svgString, filename, onDone) {
      var url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })), img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
        c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url);
        try { c.toBlob(function (b) { if (!b) { if (onDone) onDone(false); return; } var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); if (onDone) onDone(true); }); }
        catch (e) { if (onDone) onDone(false); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); if (onDone) onDone(false); };
      img.src = url;
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = sigil;
})(typeof self !== 'undefined' ? self : this);
