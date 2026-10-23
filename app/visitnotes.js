/* Notes of a visit.

   A reader can choose to keep plain-words notes of what they do here, read every line, cross any
   of them out, add their own, and send a copy themselves by copying it, saving it as a file or
   emailing it. Approved by Bentley on 2026-09-28 (the rework brief of that date,
   section 6); the design and its three passes are in docs/design/VISIT-NOTES.md.

   Rules this file keeps, checked by research/visit_notes_audit.js:
   - Off unless the reader starts it. Nothing is stored before they do, and clearing everything
     removes the one storage key (cc.visitnotes.v1, registered in CC_KEYS in app.js).
   - No network request of any kind. The page's lines come from the live region the app already
     fills for screen readers (announce() in app.js), so the notes say what the app said happened,
     in the same words a screen reader heard.
   - What the reader sees in the send step is exactly the text that leaves, and it leaves only by
     the reader's own act.
   - The reader's own lines are drawn in graphite, the ink the family's visual standard reserves for
     the reader's hand.
   - A note number is made on this device at the send step. If a note changes the site, its number
     goes in CHANGES below, and the app tells that device once, the next time it opens. Nobody else
     can match a number to a person. */
(function () {
  'use strict';

  var KEY = 'cc.visitnotes.v1';
  var MAX = 300;
  var TO = 'futurisminstitute@gmail.com';
  var BEGAN = '28 September 2026';

  /* Notes that changed something, newest first. One entry per change:
     { n: 'K7Q2PF', date: '2026-10-02', changed: 'what changed, in plain words',
       heard: 'what the note said, quoted only if its sender allowed quoting, else paraphrased',
       href: '#decide/coffee' }
     Nothing is listed until a real note has changed something. */
  var CHANGES = [];

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var NUMBER_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

  function blank() {
    return { v: 1, on: false, paused: false, started: '', task: '', lines: [], ans: { stuck: '', forwhat: '', leaving: '' }, quote: false, num: '', sent: [], told: [] };
  }
  function load() {
    var b = blank();
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return b;
      var o = JSON.parse(raw);
      if (o && typeof o === 'object') for (var k in b) if (Object.prototype.hasOwnProperty.call(o, k)) b[k] = o[k];
    } catch (e) {}
    if (!Array.isArray(b.lines)) b.lines = [];
    if (!Array.isArray(b.sent)) b.sent = [];
    if (!Array.isArray(b.told)) b.told = [];
    if (!b.ans || typeof b.ans !== 'object') b.ans = { stuck: '', forwhat: '', leaving: '' };
    return b;
  }
  var st = load();
  /* The only write. With nothing to keep it removes the key instead of writing an empty one, so a
     reader who never starts, or who clears everything, holds nothing from this feature. */
  function persist() {
    try {
      var empty = !st.on && !st.lines.length && !st.sent.length && !st.task;
      if (empty) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) {}
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function isoDay(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function longDay(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return iso || '';
    return (+p[2]) + ' ' + MONTHS[(+p[1]) - 1] + ' ' + p[0];
  }
  function makeNumber() {
    var out = '', bytes = new Uint8Array(6);
    try { crypto.getRandomValues(bytes); } catch (e) { for (var i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < 6; j++) out += NUMBER_CHARS[bytes[j] % NUMBER_CHARS.length];
    return out;
  }

  /* ---------- recording ---------- */

  var lastText = '', lastAt = 0;
  function add(text, by) {
    if (!st.on || st.paused) return;
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    var now = new Date();
    if (by === 'page' && text === lastText && now - lastAt < 3000) return;
    lastText = text; lastAt = +now;
    if (st.lines.length >= MAX) { refresh(); return; }
    st.lines.push({ d: isoDay(now), t: hm(now), s: text, by: by === 'you' ? 'you' : 'page', x: false });
    persist();
    refresh();
    if (!typing()) render();
  }
  /* A redraw would wipe what the reader is typing, so a line that arrives meanwhile only moves the
     count in the draft notice; the list catches up at the next redraw. */
  function typing() {
    var a = document.activeElement;
    return !!(pane && !pane.hidden && a && pane.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName));
  }
  function startedLine(verb) {
    var place = currentPlace();
    return verb + (place ? ' on ' + place : '');
  }
  function currentPlace() {
    try { if (typeof window.navLabel === 'function') return window.navLabel(location.hash || '#home'); } catch (e) {}
    return '';
  }
  function describe(text) {
    var place = currentPlace();
    if (place && text === place) {
      if (/^Search · /.test(text)) return 'Searched for \u201c' + text.replace(/^Search · /, '') + '\u201d';
      return 'Opened ' + text;
    }
    return text;
  }
  function watchLive() {
    var live = document.getElementById('live');
    if (!live || typeof MutationObserver !== 'function') return;
    new MutationObserver(function () {
      var t = (live.textContent || '').trim();
      if (t) add(describe(t), 'page');
    }).observe(live, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- the text that leaves ---------- */

  function kept() { return st.lines.filter(function (l) { return !l.x; }); }
  function noteText() {
    var lines = kept(), out = [];
    var first = lines[0], last = lines[lines.length - 1];
    out.push('Notes of a visit to Conscious Consuming');
    if (first) out.push(longDay(first.d) + ', ' + first.t + (last && (last.t !== first.t || last.d !== first.d) ? ' to ' + (last.d !== first.d ? longDay(last.d) + ', ' : '') + last.t : ''));
    if (st.num) out.push('Note number: ' + st.num);
    out.push(st.quote ? 'Quoting: you may quote my words, without my name.' : 'Quoting: please do not quote my words.');
    out.push('');
    if (st.task) { out.push('What I came to choose: ' + st.task); out.push(''); }
    var day = first ? first.d : '';
    lines.forEach(function (l) {
      if (l.d !== day) { out.push(''); out.push(longDay(l.d)); day = l.d; }
      out.push(l.t + '  ' + (l.by === 'you' ? 'Me: ' : '') + l.s);
    });
    var a = st.ans || {};
    var asked = [['stuck', 'Where I got stuck'], ['forwhat', 'What I think this site is for'], ['leaving', 'What I am leaving with']];
    var any = asked.some(function (q) { return a[q[0]] && String(a[q[0]]).trim(); });
    if (any) {
      out.push('');
      asked.forEach(function (q) { var v = String(a[q[0]] || '').trim(); if (v) out.push(q[1] + ': ' + v); });
    }
    return out.join('\n');
  }

  /* ---------- the panel ---------- */

  var pane, opener, bar, mode = 'auto', confirmClear = false, justSent = false;

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'on') for (var ev in attrs.on) e.addEventListener(ev, attrs.on[ev]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function btn(label, onClick, cls) { return h('button', { type: 'button', 'class': 'vn-btn' + (cls ? ' ' + cls : ''), text: label, on: { click: onClick } }); }

  function openPane(from) {
    build();
    opener = from || document.activeElement;
    pane.hidden = false;
    render();
    var head = pane.querySelector('#vn-title');
    if (head) head.focus();
  }
  function closePane() {
    if (!pane) return;
    pane.hidden = true;
    confirmClear = false;
    if (opener && opener.focus) opener.focus();
  }
  function build() {
    if (pane) return;
    pane = h('section', { id: 'vn-pane', 'class': 'vn-pane', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'vn-title', hidden: true });
    document.body.appendChild(pane);
    pane.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closePane(); } });
  }

  function changesBlock() {
    var box = h('div', { 'class': 'vn-changes' }, [h('h3', { text: 'What notes have changed so far' })]);
    if (!CHANGES.length) {
      box.appendChild(h('p', { 'class': 'vn-quiet', text: 'Nothing yet. Readers could first send notes on ' + BEGAN + '. Each change a note causes will be listed here with that note\u2019s number.' }));
      return box;
    }
    var ul = h('ul', { 'class': 'vn-changelist' });
    CHANGES.forEach(function (c) {
      ul.appendChild(h('li', null, [
        h('span', { 'class': 'vn-mono', text: longDay(c.date) + ' \u00b7 note ' + c.n }),
        h('span', { text: c.changed }),
        c.heard ? h('span', { 'class': 'vn-hand', text: c.heard }) : null,
        c.href ? h('a', { href: c.href, text: 'See it' }) : null
      ]));
    });
    box.appendChild(ul);
    return box;
  }

  function currentMode() {
    if (mode !== 'auto') return mode;
    return (!st.on && !st.lines.length) ? 'intro' : 'notes';
  }

  function render() {
    if (!pane || pane.hidden) return;
    var m = currentMode();
    pane.textContent = '';
    var top = h('div', { 'class': 'vn-top' }, [
      h('h2', { id: 'vn-title', tabindex: '-1', text: 'Notes of this visit' }),
      btn('Close', closePane, 'vn-quietbtn')
    ]);
    pane.appendChild(top);
    var body = h('div', { 'class': 'vn-body' });
    pane.appendChild(body);
    if (m === 'intro') renderIntro(body);
    else if (m === 'finish') renderFinish(body);
    else renderNotes(body);
  }

  function renderIntro(body) {
    var task = h('input', { id: 'vn-task', type: 'text', maxlength: '200', autocomplete: 'off' });
    task.value = st.task || '';
    body.appendChild(h('p', { text: 'Turn this on and the page writes down what you do here, in plain words: the pages you open, what you weigh, what you save. The notes stay on this device, and nothing is sent.' }));
    body.appendChild(h('p', { text: 'When you finish you can read every line, cross any of them out, and send a copy to the person who builds this site if you want to. Notes decide what changes next, and the list below names the note behind each change.' }));
    body.appendChild(h('label', { 'for': 'vn-task', 'class': 'vn-label', text: 'What are you here to choose? You can leave this empty.' }));
    body.appendChild(task);
    body.appendChild(h('div', { 'class': 'vn-row' }, [btn('Start keeping notes', function () {
      st.on = true; st.paused = false; st.task = String(task.value || '').trim().slice(0, 200);
      st.started = new Date().toISOString();
      mode = 'auto'; justSent = false;
      persist();
      add(startedLine('Started notes'), 'page');
      refresh(); render();
    }, 'vn-primary')]));
    body.appendChild(h('p', { 'class': 'vn-quiet', text: 'Times are kept to the minute. Lines you write yourself are drawn in pencil grey.' }));
    body.appendChild(changesBlock());
  }

  function renderNotes(body) {
    var n = st.lines.length;
    var state = !st.on ? 'Stopped' : st.paused ? 'Paused' : n >= MAX ? 'Full' : 'Keeping notes';
    var since = st.lines[0] ? ' since ' + st.lines[0].t : '';
    var status = h('p', { 'class': 'vn-status' }, [
      h('span', { 'class': 'vn-mono', text: state + since + ' \u00b7 ' + n + (n === 1 ? ' line' : ' lines') })
    ]);
    body.appendChild(status);
    if (n >= MAX) body.appendChild(h('p', { 'class': 'vn-quiet', text: 'The notes hold ' + MAX + ' lines. Send or clear them to keep going.' }));

    var controls = h('div', { 'class': 'vn-row' });
    if (st.on) controls.appendChild(btn(st.paused ? 'Resume' : 'Pause', function () { st.paused = !st.paused; persist(); refresh(); render(); }));
    if (st.on) controls.appendChild(btn('Stop keeping notes', function () { st.on = false; persist(); refresh(); render(); }));
    else controls.appendChild(btn('Keep notes again', function () { st.on = true; st.paused = false; persist(); add(startedLine('Kept notes again'), 'page'); refresh(); render(); }));
    body.appendChild(controls);

    if (justSent) {
      body.appendChild(h('div', { 'class': 'vn-sent', role: 'status' }, [
        h('p', null, [h('b', { text: 'Your note number is ' + (st.sent[st.sent.length - 1] || {}).n + '.' })]),
        h('p', { text: 'If your note changes anything, the list of changes will name that number, and this app will tell you here the next time you open it on this device. Nobody else can match the number to you.' }),
        h('div', { 'class': 'vn-row' }, [
          btn('Start fresh notes', function () { st.lines = []; st.task = ''; st.ans = { stuck: '', forwhat: '', leaving: '' }; st.num = ''; st.quote = false; justSent = false; persist(); add(startedLine('Started fresh notes'), 'page'); refresh(); render(); }, 'vn-primary'),
          btn('Keep these and carry on', function () { justSent = false; render(); })
        ])
      ]));
    }

    if (st.task) body.appendChild(h('p', { 'class': 'vn-came' }, ['You came to choose: ', h('span', { 'class': 'vn-hand', text: st.task })]));

    var ol = h('ol', { 'class': 'vn-lines', 'aria-label': 'Your notes, oldest first' });
    var day = '';
    st.lines.forEach(function (l, i) {
      if (l.d !== day) { day = l.d; ol.appendChild(h('li', { 'class': 'vn-day', 'aria-hidden': 'true', text: longDay(l.d) })); }
      var toggle = h('button', { type: 'button', 'class': 'vn-x', 'aria-pressed': l.x ? 'true' : 'false', 'aria-label': (l.x ? 'Put back: ' : 'Cross out: ') + l.s, text: l.x ? 'Put back' : 'Cross out' });
      toggle.addEventListener('click', function () { st.lines[i].x = !st.lines[i].x; persist(); render(); var again = pane.querySelectorAll('.vn-x')[i]; if (again) again.focus(); });
      ol.appendChild(h('li', { 'class': 'vn-line' + (l.by === 'you' ? ' vn-own' : '') + (l.x ? ' vn-crossed' : '') }, [
        h('span', { 'class': 'vn-time', text: l.t }),
        h(l.x ? 's' : 'span', { 'class': 'vn-text', text: (l.by === 'you' ? 'Me: ' : '') + l.s }),
        toggle
      ]));
    });
    body.appendChild(ol);
    if (!n) body.appendChild(h('p', { 'class': 'vn-quiet', text: 'No lines yet.' }));

    var own = h('input', { id: 'vn-own', type: 'text', maxlength: '500', autocomplete: 'off' });
    var form = h('form', { 'class': 'vn-add' }, [
      h('label', { 'for': 'vn-own', 'class': 'vn-label', text: 'Add a line in your own words' }),
      h('div', { 'class': 'vn-row' }, [own, h('button', { type: 'submit', 'class': 'vn-btn', text: 'Add' })])
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = String(own.value || '').trim();
      if (!v) return;
      var was = st.paused; st.paused = false;
      var wasOn = st.on; st.on = true;
      add(v.slice(0, 500), 'you');
      st.paused = was; st.on = wasOn; persist();
      render();
      var again = pane.querySelector('#vn-own'); if (again) again.focus();
    });
    body.appendChild(form);

    var end = h('div', { 'class': 'vn-row vn-end' });
    if (n) end.appendChild(btn('Finish and send', function () { if (!st.num) st.num = makeNumber(); persist(); mode = 'finish'; render(); }, 'vn-primary'));
    if (!confirmClear) end.appendChild(btn('Clear these notes', function () { confirmClear = true; render(); }, 'vn-quietbtn'));
    body.appendChild(end);
    if (confirmClear) {
      body.appendChild(h('div', { 'class': 'vn-confirm', role: 'group', 'aria-label': 'Clear the notes' }, [
        h('p', { text: 'Clear all ' + n + (n === 1 ? ' line' : ' lines') + ' and stop keeping notes? Note numbers you have already sent stay, so this app can still tell you if one of them changed something.' }),
        h('div', { 'class': 'vn-row' }, [
          btn('Yes, clear them', function () { var sent = st.sent, told = st.told; st = blank(); st.sent = sent; st.told = told; confirmClear = false; justSent = false; mode = 'auto'; persist(); refresh(); render(); }),
          btn('Keep them', function () { confirmClear = false; render(); }, 'vn-quietbtn')
        ]),
        st.sent.length ? h('p', { 'class': 'vn-quiet' }, [btn('Also forget my note numbers', function () { st = blank(); confirmClear = false; justSent = false; mode = 'auto'; persist(); refresh(); render(); }, 'vn-linkbtn')]) : null
      ]));
    }
    body.appendChild(changesBlock());
  }

  function renderFinish(body) {
    var out = h('pre', { 'class': 'vn-out', id: 'vn-out', tabindex: '0', 'aria-label': 'The exact text that would leave this device' });
    function update() { out.textContent = noteText(); }
    body.appendChild(h('p', { text: 'Three questions, all optional. Answer in whatever words come.' }));
    [['stuck', 'Where did you get stuck, if anywhere?'], ['forwhat', 'What do you think this site is for?'], ['leaving', 'What are you leaving with?']].forEach(function (q) {
      var ta = h('textarea', { id: 'vn-' + q[0], rows: '2', maxlength: '800' });
      ta.value = st.ans[q[0]] || '';
      ta.addEventListener('input', function () { st.ans[q[0]] = ta.value; persist(); update(); });
      body.appendChild(h('label', { 'for': 'vn-' + q[0], 'class': 'vn-label', text: q[1] }));
      body.appendChild(ta);
    });
    var quote = h('input', { id: 'vn-quote', type: 'checkbox' });
    quote.checked = !!st.quote;
    quote.addEventListener('change', function () { st.quote = quote.checked; persist(); update(); });
    body.appendChild(h('p', { 'class': 'vn-check' }, [quote, h('label', { 'for': 'vn-quote', text: ' You may quote my words, without my name, in the list of what notes have changed.' })]));

    body.appendChild(h('h3', { text: 'This is exactly what would leave this device' }));
    update();
    body.appendChild(out);

    var said = h('p', { 'class': 'vn-quiet', role: 'status' });
    function markSent(how) {
      if (!st.num) st.num = makeNumber();
      if (!st.sent.some(function (s) { return s.n === st.num; })) st.sent.push({ n: st.num, d: isoDay(new Date()) });
      persist();
      said.textContent = how + ' Your note number is ' + st.num + '. If this note changes anything, the list of changes will name that number, and this app will tell you here on this device.';
      justSent = true;
    }
    var copyB = btn('Copy the text', function () {
      var text = noteText();
      var done = function () { markSent('Copied. Paste it anywhere you like.'); };
      try {
        navigator.clipboard.writeText(text).then(done, function () { selectOut(); markSent('Selected. Copy it with your keyboard.'); });
      } catch (e) { selectOut(); markSent('Selected. Copy it with your keyboard.'); }
    }, 'vn-primary');
    var saveB = btn('Save as a file', function () {
      var text = noteText();
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text + '\n'], { type: 'text/plain' }));
      a.download = 'visit-notes-' + isoDay(new Date()) + '-' + (st.num || 'draft') + '.txt';
      document.body.appendChild(a); a.click(); a.remove();
      markSent('Saved as ' + a.download + '.');
    });
    var mailB = btn('Email it', function () {
      var text = noteText();
      var subject = 'Notes of a visit, note ' + st.num;
      var body = text;
      var long = encodeURIComponent(text).length > 1800;
      if (long) {
        body = 'My notes are pasted below.\n\n';
        try { navigator.clipboard.writeText(text).catch(function () {}); } catch (e) {}
      }
      var a = document.createElement('a');
      a.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      document.body.appendChild(a); a.click(); a.remove();
      markSent(long ? 'Your mail app should open. The notes were too long for the link, so they are copied: paste them into the message.' : 'Your mail app should open with the notes in it. If it did not, copy the text and send it to the address below.');
    });
    function selectOut() {
      try { var r = document.createRange(); r.selectNodeContents(out); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {}
    }
    body.appendChild(h('div', { 'class': 'vn-row' }, [copyB, saveB, mailB]));
    body.appendChild(said);
    body.appendChild(h('p', { 'class': 'vn-quiet' }, ['Or send it yourself to ', h('span', { 'class': 'vn-mono vn-select', text: TO }), '. Emailing shows your address to whoever reads it; a saved file can go any way you like.']));
    body.appendChild(h('div', { 'class': 'vn-row vn-end' }, [btn('Back to the notes', function () { mode = 'auto'; render(); }, 'vn-quietbtn')]));
  }

  /* ---------- the line in the draft notice ---------- */

  function refresh() {
    if (!bar) return;
    var n = st.lines.length;
    var label;
    if (!st.on && !n) label = 'Keep notes of this visit';
    else {
      var state = !st.on ? 'Notes stopped' : st.paused ? 'Notes paused' : n >= MAX ? 'Notes full' : 'Keeping notes';
      label = state + ' \u00b7 ' + n + (n === 1 ? ' line' : ' lines');
    }
    bar.open.textContent = label;
    bar.open.setAttribute('aria-expanded', pane && !pane.hidden ? 'true' : 'false');
    bar.open.classList.toggle('vn-live', !!(st.on && !st.paused));
    showHeard();
  }

  /* Once per change, on this device only: a number this device sent is in CHANGES. */
  function showHeard() {
    if (!bar) return;
    var mine = {};
    st.sent.forEach(function (s) { mine[s.n] = s.d; });
    var hit = CHANGES.filter(function (c) { return mine[c.n] && st.told.indexOf(c.n) < 0; })[0];
    bar.heard.textContent = '';
    bar.heard.hidden = !hit;
    if (!hit) return;
    bar.heard.appendChild(h('span', { text: 'Something you sent on ' + longDay(mine[hit.n]) + ' changed this site: ' + hit.changed + ' ' }));
    if (hit.href) bar.heard.appendChild(h('a', { href: hit.href, text: 'See it' }));
    bar.heard.appendChild(document.createTextNode(' '));
    bar.heard.appendChild(btn('Got it', function () { st.told.push(hit.n); persist(); showHeard(); }, 'vn-linkbtn'));
  }

  function mountBar() {
    var host = document.querySelector('[data-visit-notes]') || document.querySelector('.devnotice');
    if (!host) return false;
    var open = h('button', { type: 'button', 'class': 'vn-open', 'aria-controls': 'vn-pane', 'aria-expanded': 'false' });
    open.addEventListener('click', function () { if (pane && !pane.hidden) closePane(); else openPane(open); refresh(); });
    var heard = h('span', { 'class': 'vn-heard', role: 'status', hidden: true });
    host.appendChild(open);
    host.appendChild(heard);
    bar = { open: open, heard: heard };
    return true;
  }

  function style() {
    var css = [
      '.vn-open{font:inherit;font-size:.78rem;margin-left:auto;flex:none;background:none;border:0;border-bottom:1px dotted currentColor;color:var(--accent,#1d7a5a);padding:.35rem 0;min-height:1.75rem;cursor:pointer}',
      '.vn-open.vn-live::before{content:"";display:inline-block;width:.45rem;height:.45rem;border-radius:50%;background:var(--accent,#1d7a5a);margin-right:.4rem;vertical-align:.08rem}',
      '.devnotice{flex-wrap:wrap}',
      '.vn-heard{flex-basis:100%;font-size:.82rem;color:var(--ink,#243126)}',
      '.vn-pane{position:fixed;top:0;right:0;bottom:0;z-index:200;width:min(27rem,100%);overflow:auto;background:var(--surface,#fffdf7);color:var(--ink,#243126);border-left:1px solid var(--line,#c9c1ae);box-shadow:-12px 0 32px rgba(0,0,0,.12);padding:calc(env(safe-area-inset-top,0px) + 1rem) 1.1rem calc(env(safe-area-inset-bottom,0px) + 1.5rem);display:grid;gap:1rem;align-content:start}',
      '.vn-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid var(--line,#c9c1ae);padding-bottom:.6rem}',
      '.vn-top h2{margin:0;font-size:1.15rem}',
      '.vn-body{display:grid;gap:.85rem;min-width:0}',
      '.vn-body p{margin:0;line-height:1.5}',
      '.vn-body h3{margin:.4rem 0 0;font-size:.95rem}',
      '.vn-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}',
      '.vn-row input[type=text]{flex:1 1 12rem;min-width:0}',
      '.vn-pane input[type=text],.vn-pane textarea{font:inherit;width:100%;box-sizing:border-box;padding:.55rem .6rem;border:1px solid var(--line,#c9c1ae);border-radius:3px;background:var(--bg,#f8f5ee);color:var(--ink,#243126);font-style:italic}',
      '.vn-label{font-size:.85rem;color:var(--muted,#596457)}',
      '.vn-btn{font:inherit;font-size:.88rem;min-height:2.75rem;padding:.45rem .85rem;border:1px solid var(--line,#c9c1ae);border-radius:3px;background:var(--surface,#fffdf7);color:var(--ink,#243126);cursor:pointer}',
      '.vn-primary{background:var(--accent,#1d7a5a);border-color:var(--accent,#1d7a5a);color:var(--accent-text,#fff)}',
      '.vn-quietbtn{background:none}',
      '.vn-linkbtn{font:inherit;font-size:inherit;background:none;border:0;padding:0;min-height:0;color:var(--accent,#1d7a5a);text-decoration:underline;cursor:pointer}',
      '.vn-pane button:focus-visible,.vn-open:focus-visible,.vn-pane input:focus-visible,.vn-pane textarea:focus-visible,.vn-out:focus-visible{outline:2px solid var(--accent,#1d7a5a);outline-offset:2px}',
      '.vn-mono,.vn-time,.vn-status{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.78rem;font-variant-numeric:tabular-nums}',
      '.vn-quiet{font-size:.85rem;color:var(--muted,#596457)}',
      /* Graphite: the reader's hand. Soft, off-axis, never authoritative (SOLARPUNK.md, the three inks). */
      '.vn-hand,.vn-own .vn-text{font-style:italic;color:color-mix(in srgb,var(--ink,#243126) 74%,var(--surface,#fffdf7))}',
      '.vn-lines{list-style:none;margin:0;padding:0;display:grid;gap:0;border-top:1px solid var(--line,#c9c1ae)}',
      '.vn-line{display:grid;grid-template-columns:3.2rem 1fr auto;gap:.2rem .6rem;align-items:baseline;padding:.45rem 0;border-bottom:1px solid var(--line,#c9c1ae)}',
      '.vn-text{min-width:0;overflow-wrap:anywhere}',
      '.vn-crossed .vn-text{color:var(--muted,#596457)}',
      '.vn-x{font:inherit;font-size:.74rem;background:none;border:0;color:var(--muted,#596457);text-decoration:underline;cursor:pointer;min-height:2.75rem;padding:0 .2rem}',
      '.vn-day{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#596457);padding:.7rem 0 .2rem}',
      '.vn-out{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;padding:.75rem;border:1px solid var(--line,#c9c1ae);background:var(--bg,#f8f5ee);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.78rem;line-height:1.5;max-height:22rem;overflow:auto}',
      '.vn-check{display:flex;gap:.5rem;align-items:flex-start;font-size:.9rem}',
      '.vn-check input{margin-top:.3rem;width:1.1rem;height:1.1rem;flex:none}',
      '.vn-sent,.vn-confirm{display:grid;gap:.6rem;padding:.8rem;border:1px solid var(--line,#c9c1ae);border-left:3px solid var(--accent,#1d7a5a)}',
      '.vn-select{user-select:all}',
      '.vn-end{padding-top:.3rem}',
      '.vn-changes{display:grid;gap:.4rem;border-top:1px solid var(--line,#c9c1ae);padding-top:.7rem}',
      '.vn-changelist{list-style:none;margin:0;padding:0;display:grid;gap:.7rem}',
      '.vn-changelist li{display:grid;gap:.15rem}',
      '@media (max-width:560px){.vn-pane{border-left:0;box-shadow:none}}',
      // The pane sets display:grid, which beats the hidden attribute, so Close changed nothing
      // on screen. Anything here that is shown or hidden by the attribute has to honour it.
      '.vn-pane[hidden],.vn-heard[hidden],.vn-pane [hidden]{display:none}'
    ].join('\n');
    var s = document.createElement('style');
    s.id = 'vn-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function start() {
    if (!mountBar()) return;
    style();
    watchLive();
    /* Any link marked data-visit-notes-open (the Private panel on the home page) opens the notes. */
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('[data-visit-notes-open]') : null;
      if (!a) return;
      e.preventDefault();
      openPane(a);
      refresh();
    });
    refresh();
  }

  window.CC = window.CC || {};
  window.CC.visitNotes = {
    key: KEY,
    changes: CHANGES,
    text: noteText,
    open: function () { openPane(bar && bar.open); refresh(); },
    _state: function () { return JSON.parse(JSON.stringify(st)); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
