#!/usr/bin/env node
/* Visit notes audit.

   app/visitnotes.js lets a reader keep notes of a visit and send a copy themselves. Its promises
   are only worth what checks them, so this file fails the build when one breaks:

   1. The notes make no network request of any kind. The only way out is the reader's own act:
      copying, saving a file, or opening their mail app.
   2. Nothing is stored before the reader starts: the module reads at load, and its one write
      removes the key instead of writing an empty record.
   3. The key is registered in CC_KEYS, so "export everything" and "delete everything" in app.js
      tell the truth about it.
   4. The script is wired where the other app scripts are: loaded after app.js, cache-busted by
      pipeline/stamp.py, kept offline by the service worker, and read by the voice gate.
   5. The public promise says what is now true: "The site sends nothing", and no reader-facing
      "on-device only" survives in the app.
   6. What the send step shows is what leaves: every send path builds its text from noteText().
   7. Each entry in CHANGES names a real note number, a date and what changed.

   Pass a path to check a different copy of the module (used to prove the audit bites). */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODULE = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'app', 'visitnotes.js');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const failures = [];
const expect = (ok, msg) => { if (!ok) failures.push(msg); };

const src = fs.readFileSync(MODULE, 'utf8');
/* Comments may describe what the file refuses to do; only code is checked. */
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

// 1. No network.
const NETWORK = [
  [/\bfetch\s*\(/, 'fetch('],
  [/XMLHttpRequest/, 'XMLHttpRequest'],
  [/sendBeacon/, 'navigator.sendBeacon'],
  [/\bWebSocket\b/, 'WebSocket'],
  [/\bEventSource\b/, 'EventSource'],
  [/importScripts/, 'importScripts'],
  [/new\s+Image\s*\(/, 'new Image()'],
  [/\.src\s*=/, 'assigning .src'],
  [/window\.open\s*\(/, 'window.open('],
  [/postMessage\s*\(/, 'postMessage('],
  [/https?:\/\//, 'an http(s) address'],
  [/\baction\s*[:=]/, 'a form action']
];
for (const [re, name] of NETWORK) expect(!re.test(code), `network: app/visitnotes.js uses ${name}; the notes must leave only by the reader's own act`);
const mailtos = code.match(/mailto:/g) || [];
expect(mailtos.length === 1, `network: expected exactly one mailto: (the reader's own mail app), found ${mailtos.length}`);

// 2. Nothing stored before the reader starts.
const writes = code.match(/localStorage\.(setItem|removeItem|clear)\s*\(/g) || [];
const persistBody = (code.match(/function persist\(\)\s*\{([\s\S]*?)\n  \}/) || [])[1] || '';
const writesInPersist = persistBody.match(/localStorage\.(setItem|removeItem)\s*\(/g) || [];
expect(writes.length === 2 && writesInPersist.length === 2, `storage: every localStorage write must live in persist(); found ${writes.length} writes, ${writesInPersist.length} inside persist()`);
expect(/var empty = !st\.on && !st\.lines\.length && !st\.sent\.length && !st\.task;/.test(persistBody) && /if \(empty\) localStorage\.removeItem\(KEY\)/.test(persistBody),
  'storage: persist() must remove the key when there is nothing to keep, so an unstarted or cleared reader holds nothing');
const startBody = (code.match(/function start\(\)\s*\{([\s\S]*?)\n  \}/) || [])[1] || '';
expect(startBody && !/persist\(|\badd\(/.test(startBody), 'storage: start() must not write or record anything at load');
expect(/function blank\(\)\s*\{\s*return \{ v: 1, on: false/.test(code), 'storage: a new reader must start with notes off');

// 3. Registered key.
const keyMatch = code.match(/var KEY = '([^']+)'/);
const KEY = keyMatch && keyMatch[1];
expect(KEY === 'cc.visitnotes.v1', `key: expected var KEY = 'cc.visitnotes.v1', found ${KEY}`);
const app = read('app/app.js');
const registry = (app.match(/const CC_KEYS=\[([\s\S]*?)\];/) || [])[1] || '';
expect(KEY && registry.includes(`'${KEY}'`), `key: ${KEY} is not in CC_KEYS in app/app.js, so export and delete-all would not cover it`);

// 4. Wiring.
if (!process.argv[2]) {
  const html = read('app/index.html');
  const appAt = html.search(/<script src="\.\/app\.js[?"]/);
  const notesAt = html.search(/<script src="\.\/visitnotes\.js[?"]/);
  expect(appAt > 0 && notesAt > appAt, 'wiring: app/index.html must load visitnotes.js after app.js');
  expect(/\.\/visitnotes\.js\?v=[0-9a-f]{8}"/.test(html), 'wiring: visitnotes.js in app/index.html carries no ?v= stamp; run py -3 pipeline/stamp.py');
  expect(/'visitnotes\.js'/.test(read('pipeline/stamp.py')), 'wiring: visitnotes.js is missing from ASSETS in pipeline/stamp.py');
  expect(/'\.\/visitnotes\.js'/.test(read('app/sw.js')), 'wiring: visitnotes.js is missing from CORE in app/sw.js, so the notes would vanish offline');
  expect(/'app\/visitnotes\.js'/.test(read('research/guide_voice_audit.js')), 'wiring: app/visitnotes.js is missing from APP_JS in research/guide_voice_audit.js');

  // 5. The promise.
  expect(app.includes('The site sends nothing; if you keep notes of a visit, you can choose to send a copy yourself.'),
    'promise: the Private panel in app/app.js must say the site sends nothing and that sending a copy is the reader\'s choice');
  expect(app.includes('data-visit-notes-open'), 'promise: the Private panel must offer a way to open the notes');
  for (const f of fs.readdirSync(path.join(ROOT, 'app')).filter(f => /\.(html|js)$/.test(f))) {
    const t = fs.readFileSync(path.join(ROOT, 'app', f), 'utf8');
    expect(!/on-device only/i.test(t), `promise: app/${f} still says "on-device only", which a reader who sends their notes would make untrue`);
  }
}

// 6. What is shown is what leaves.
const finish = (code.match(/function renderFinish\(body\)\s*\{([\s\S]*?)\n  \}/) || [])[1] || '';
const built = finish.match(/noteText\(\)/g) || [];
expect(built.length >= 4, `send: the preview and all three send paths must build from noteText(); found ${built.length} uses in renderFinish`);
expect(/out\.textContent = noteText\(\)/.test(finish), 'send: the preview must show noteText() itself');

// 7. CHANGES.
const changesSrc = (code.match(/var CHANGES = (\[[\s\S]*?\]);/) || [])[1];
let changes = null;
try { changes = changesSrc ? Function('"use strict";return ' + changesSrc)() : null; } catch (e) { changes = null; }
expect(Array.isArray(changes), 'changes: var CHANGES must be an array literal');
for (const c of changes || []) {
  expect(/^[2-9A-HJKMNP-Z]{6}$/.test(c.n || ''), `changes: "${c.n}" is not a note number this module could have made`);
  expect(/^\d{4}-\d{2}-\d{2}$/.test(c.date || ''), `changes: note ${c.n} needs an ISO date`);
  expect(typeof c.changed === 'string' && c.changed.trim().length > 10, `changes: note ${c.n} must say what changed`);
}

if (failures.length) {
  console.error('visit notes audit FAILED');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`visit notes audit passed: no network, nothing stored before the reader starts, key ${KEY} registered, wired in 4 places, promise reworded, ${built.length} send paths from one text, ${(changes || []).length} changes listed`);
