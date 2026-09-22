#!/usr/bin/env node
/* Every inline script on every public surface must parse.

   WHY THIS EXISTS: kosplora/index.html shipped with an unterminated string literal inside its
   open-university renderer:

       return '<div class="ou-cautions">...'+OU.cautions.map(...).join('')+'</main>
       </div>';

   A literal newline inside a single-quoted string is a SyntaxError, so the browser discarded the
   entire <script> block and every function in it. The largest section on the site (17 subjects,
   101 curated channels, ~1,839 words) rendered nothing for as long as that commit was live.

   It hid because the section has a <noscript> fallback, so an empty region looked deliberate;
   because curl returns the same bytes whether the script parses or not; and because no check
   ever asked a JS engine to read the page's own inline code.

   Parsing is cheap and total. This walks the public surfaces, pulls every inline <script>, and
   asks V8 to compile it. It does not execute anything, so it is safe and fast.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

// Discovered, not enumerated: any HTML we ship is in scope the day it lands.
function htmlFiles() {
  const skip = new Set(['node_modules', 'dist', '.git', 'research', 'content', 'planning']);
  const found = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }); } catch (_) { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || skip.has(entry.name)) continue;
      const rel = dir ? dir + '/' + entry.name : entry.name;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith('.html')) found.push(rel);
    }
  };
  walk('');
  return found.sort();
}

// Inline scripts only: anything with src= is a separate file with its own parse story.
function inlineScripts(html) {
  const blocks = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/\btype\s*=\s*["']?(application\/(ld\+json|json)|text\/template)/i.test(attrs)) continue;
    const line = html.slice(0, match.index).split('\n').length;
    blocks.push({ code: match[2], line, module: /\btype\s*=\s*["']?module/i.test(attrs) });
  }
  return blocks;
}

function main() {
  console.log('Inline script parse audit');
  const files = htmlFiles();
  let scripts = 0, bytes = 0;

  for (const rel of files) {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const block of inlineScripts(html)) {
      scripts += 1;
      bytes += block.code.length;
      try {
        // Compile only. new vm.Script() throws on SyntaxError and runs nothing.
        new vm.Script(block.code, { filename: `${rel}:${block.line}` });
      } catch (error) {
        failures.push(`${rel}:${block.line}: inline script does not parse (${error.message})`);
      }
    }
  }

  if (!scripts) failures.push('no inline scripts found; the walker is looking in the wrong place');

  if (failures.length) {
    console.error(`INLINE SCRIPT AUDIT FAIL (${failures.length})`);
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exit(1);
  }
  console.log(`  html surfaces: ${files.length}`);
  console.log(`  inline scripts compiled: ${scripts} (${Math.round(bytes / 1024)}kb)`);
  console.log('INLINE SCRIPT AUDIT PASS');
}

main();
