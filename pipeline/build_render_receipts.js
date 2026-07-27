#!/usr/bin/env node
/* Render every presentation fixture in the real app at 320, 768, and 1440 px and write
   app/data/presentation-renders.json in the shape research/presentation_acceptance_audit.js
   verifies: one row per fixture with the rendered frame HTML plus, per width, an honest
   horizontal-overflow check and first-view visibility for search, path, lead, coverage,
   and the main action. Requires the dev dependency playwright (npx playwright install chromium). */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PACKAGE = path.join(ROOT, 'app', 'data', 'presentation.json');
/* Pass an output path to stage receipts elsewhere (a trial run must not land in app/data:
   once the file exists there, the acceptance audit evaluates receipts instead of listing
   WAIT items, and any unimplemented page kind fails verify and blocks the release chain). */
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'app', 'data', 'presentation-renders.json');
const APP_URL = 'file:///' + path.join(ROOT, 'app', 'index.html').replace(/\\/g, '/');
const WIDTHS = [320, 768, 1440];
const FIRST_VIEW_PARTS = { search: 'search', path: 'path', lead: 'lead', coverage: 'coverage', mainAction: 'main-action' };

async function measure(page, route) {
  await page.goto(APP_URL + '#' + route, { waitUntil: 'load' });
  await page.waitForSelector('[data-presentation-kind]', { timeout: 15000 });
  await page.waitForTimeout(400);
  return page.evaluate((parts) => {
    const root = document.querySelector('[data-presentation-kind]');
    const doc = document.documentElement;
    const firstView = {};
    for (const key of Object.keys(parts)) {
      let el = document.querySelector('[data-presentation-part="' + parts[key] + '"]');
      if (parts[key] === 'main-action' && !el) el = document.querySelector('[data-presentation-main-action]');
      const rect = el ? el.getBoundingClientRect() : null;
      firstView[key] = !!rect && rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0;
    }
    return {
      html: root ? root.outerHTML : '',
      horizontalOverflow: doc.scrollWidth > window.innerWidth + 1,
      firstView,
    };
  }, FIRST_VIEW_PARTS);
}

(async () => {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE, 'utf8'));
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const renders = [];
  const failures = [];
  for (const set of pkg.fixtures || []) {
    for (const fixture of set.cases) {
      const row = {
        id: fixture.id,
        route: fixture.route,
        pageKind: set.pageKind,
        state: fixture.state,
        instance: fixture.instance || 'conscious-consuming',
        html: '',
        widths: {},
      };
      for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        try {
          const result = await measure(page, fixture.route);
          if (width === 1440) row.html = result.html;
          row.widths[String(width)] = { horizontalOverflow: result.horizontalOverflow, firstView: result.firstView };
        } catch (error) {
          failures.push(fixture.id + ' at ' + width + 'px: ' + error.message.split('\n')[0]);
        } finally {
          await page.close();
        }
      }
      renders.push(row);
      process.stdout.write('  rendered ' + fixture.id + ' (' + set.pageKind + '/' + fixture.state + ')\n');
    }
  }
  await browser.close();
  const manifest = {
    kind: 'presentation-render-receipts',
    version: '1.0.0',
    packageChecksum: pkg.checksum,
    renders,
  };
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
  console.log('build_render_receipts: wrote ' + renders.length + ' receipts -> app/data/presentation-renders.json');
  if (failures.length) {
    console.log('render failures (' + failures.length + '):');
    for (const failure of failures) console.log('  ' + failure);
    process.exitCode = 1;
  }
})();
