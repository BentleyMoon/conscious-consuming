#!/usr/bin/env node
/* Public route audit for Values Commons.

   This is intentionally small: it checks that the public ecosystem doors exist,
   the homepage points at them, the deploy packager includes them, and the spec
   domain posture stays explicit.
*/
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const failures = [];

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  if (!exists(rel)) {
    failures.push(`${rel}: missing file`);
    return "";
  }
  return fs.readFileSync(abs(rel), "utf8");
}

function expectFile(rel) {
  if (!exists(rel)) failures.push(`${rel}: missing required public route`);
}

function expectIncludes(rel, needle, reason) {
  const text = read(rel);
  if (!text.includes(needle)) failures.push(`${rel}: missing ${reason || needle}`);
}

function expectNotIncludes(rel, needle, reason) {
  const text = read(rel);
  if (text.includes(needle)) failures.push(`${rel}: stale ${reason || needle}`);
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function stripTarget(raw) {
  return raw.trim().split("#")[0].split("?")[0];
}

function skipTarget(target) {
  return !target
    || target.startsWith("#")
    || target.startsWith("//")
    || target.startsWith("{")
    || /^[a-z][a-z0-9+.-]*:/i.test(target);
}

function targetExists(fromFile, target) {
  let rel = target.replace(/\\/g, "/");
  if (rel.startsWith("/")) rel = rel.slice(1);
  const base = target.startsWith("/")
    ? ROOT
    : path.dirname(abs(fromFile));
  const candidate = path.resolve(base, rel);
  if (fs.existsSync(candidate) || fs.existsSync(path.join(candidate, "index.html"))) return true;

  const repoRel = path.relative(ROOT, candidate).replace(/\\/g, "/");
  const renderedDoc = repoRel.match(/^docs\/([A-Z0-9-]+)\.html$/);
  if (renderedDoc) {
    const source = `docs/${renderedDoc[1]}.md`;
    return exists(source) && read("pipeline/build_site.py").includes(`'${renderedDoc[1]}'`);
  }

  return false;
}

function checkLocalLinks(files) {
  const linkRe = /\b(?:href|src)=["']([^"']+)["']/g;
  for (const file of files) {
    const text = read(file).replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, "$1</script>");
    for (const match of text.matchAll(linkRe)) {
      const target = stripTarget(match[1]);
      if (skipTarget(target)) continue;
      if (!targetExists(file, target)) {
        failures.push(`${file}: missing local link ${match[1]}`);
      }
    }
  }
}

function parseRouteMeta() {
  const build = read("pipeline/build_site.py");
  const block = build.match(/ROUTE_META\s*=\s*\{([\s\S]*?)\n\}/);
  const out = new Map();
  if (!block) {
    failures.push("pipeline/build_site.py: missing ROUTE_META");
    return out;
  }
  for (const match of block[1].matchAll(/^\s*'([^']+)'\s*:\s*\{([^}]*)\},?/gm)) {
    const rel = match[1];
    const body = match[2];
    const pairs = {};
    for (const pair of body.matchAll(/'([^']+)'\s*:\s*([^,]+)(?:,|$)/g)) {
      pairs[pair[1]] = pair[2].trim();
    }
    out.set(rel, pairs);
  }
  return out;
}

function checkRouteMetadataContract(files) {
  const build = read("pipeline/build_site.py");
  const previewAudit = read("research/preview_feedback_audit.js");
  const routeMeta = parseRouteMeta();

  for (const file of files) {
    const info = routeMeta.get(file);
    expect(Boolean(info), `pipeline/build_site.py: ROUTE_META missing ${file}`);
    expect(previewAudit.includes(`'${file}'`) || previewAudit.includes(`"${file}"`), `research/preview_feedback_audit.js: ROUTE_PAGES missing ${file}`);
    if (!info) continue;
    expect(Boolean(info.title), `pipeline/build_site.py: ROUTE_META ${file} missing title`);
    expect(Boolean(info.path || info.url), `pipeline/build_site.py: ROUTE_META ${file} missing path/url`);
  }

  for (const file of routeMeta.keys()) {
    expect(files.includes(file), `research/public_route_audit.js: routeFiles missing ${file} from ROUTE_META`);
  }

  for (const needle of [
    '<link rel="canonical"',
    '<meta property="og:type" content="website">',
    '<meta property="og:title"',
    '<meta property="og:description"',
    '<meta property="og:url"',
    '<meta property="og:image"',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title"',
    '<meta name="twitter:description"',
    '<meta name="twitter:image"',
    'apply_route_metadata()'
  ]) {
    expect(build.includes(needle), `pipeline/build_site.py: missing route share metadata contract ${needle}`);
  }
}

function generatedHtmlFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) generatedHtmlFiles(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function checkGeneratedSeoContract() {
  const sitemap = read('app/sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const listed = new Set(urls);
  expect(urls.length === listed.size, `app/sitemap.xml: contains ${urls.length - listed.size} duplicate URL(s)`);
  expect(urls.every(url => !/\.html(?:$|[?#])/.test(url)), 'app/sitemap.xml: public URLs must be extensionless');

  const titles = new Map();
  const canonicals = new Set();
  const generated = [
    ...generatedHtmlFiles(abs('app/g')),
    ...generatedHtmlFiles(abs('app/c')),
  ];
  for (const file of generated) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const html = fs.readFileSync(file, 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] || '';
    expect(Boolean(title), `${rel}: title is required`);
    expect(Boolean(canonical), `${rel}: canonical is required`);
    expect(!/\.html(?:$|[?#])/.test(canonical), `${rel}: canonical must be extensionless (${canonical})`);
    expect(!canonical || listed.has(canonical), `${rel}: canonical is absent from app/sitemap.xml (${canonical})`);
    expect(!canonical || !canonicals.has(canonical), `${rel}: duplicate canonical ${canonical}`);
    if (canonical) canonicals.add(canonical);
    if (title) {
      const prior = titles.get(title);
      expect(!prior, `${rel}: duplicate title also used by ${prior || 'another generated page'} (${title})`);
      titles.set(title, rel);
    }
    for (const match of html.matchAll(/\bhref=["']([^"']+)["']/gi)) {
      const href = match[1];
      if (!/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('//')) {
        expect(!/\.html(?:$|[?#])/.test(href), `${rel}: internal href exposes a physical .html filename (${href})`);
      }
    }
  }

  for (const url of urls) {
    const parsed = new URL(url);
    let publicPath = parsed.pathname.replace(/^\/app\/?/, '');
    if (!publicPath || publicPath.endsWith('/')) publicPath += 'index.html';
    else publicPath += '.html';
    expect(exists(`app/${publicPath}`), `app/sitemap.xml: ${url} has no generated file app/${publicPath}`);
  }
  return generated.length;
}

const routeFiles = [
  "index.html",
  "standard/index.html",
  "passport/index.html",
  "instances/index.html",
  "instances/new/index.html",
  "contribute/index.html",
  "weave/index.html",
  "kosplora/index.html",
  "instances/messages/index.html",
  "assembly/index.html",
  "workshop/index.html",
  "slate/index.html",
  "tour/index.html",
  "funders/index.html",
  "awards/index.html",
];

const shareMetaRouteFiles = [
  ...routeFiles,
  "app/index.html",
];

for (const file of routeFiles) expectFile(file);

for (const route of [
  "standard/index.html",
  "passport/index.html",
  "instances/index.html",
  "contribute/index.html",
  "weave/index.html",
]) {
  expectIncludes("index.html", route, `homepage link to ${route}`);
}

expectIncludes("standard/index.html", "Open Values Standard", "standard page title/copy");
expectIncludes("index.html", "Doors", "homepage door index");
expectIncludes("index.html", "Three tools, one engine", "homepage app-first path");
expectIncludes("index.html", "How it stays honest", "homepage honesty section");
expectIncludes("index.html", "Five parts you keep as files", "homepage civic-tools framing");
// 2026-08-13. The phrase moved when the front page was rewritten to state its claim directly.
// What the check is for is the promise, not the wording: the values file carries no identity and
// needs no account. Testing the promise rather than a sentence that copy edits will keep breaking.
expectIncludes("index.html", "No identity, no account", "homepage passport contract");
expectIncludes("index.html", "Source before score", "homepage workshop contract");
expectIncludes("index.html", "Commit, not command", "homepage slate contract");
expectIncludes("index.html", "Ownership, alternatives, and look-alike choices are inspectable claims", "homepage relationship-map contract");
expectIncludes("index.html", "Read the adoption guide", "homepage adoption-guide CTA");
expectIncludes("index.html", "Share what happened", "homepage feedback CTA");
expectIncludes("index.html", "docs/PREVIEW-FEEDBACK-LOOP.md", "homepage feedback-loop link");
expectNotIncludes("index.html", "coming soon", "homepage placeholder copy");
expectIncludes("docs/README.md", "Public On-Ramp", "docs on-ramp map");
expectIncludes("docs/README.md", "The reorganization established the public names", "docs map reorganization closeout");
expectIncludes("docs/README.md", "Before the first invitations", "docs map adoption feedback closeout");
expectIncludes("passport/index.html", "Values Passport", "passport page title/copy");
expectIncludes("passport/index.html", "Core files", "passport core-file navigation");
expectIncludes("passport/index.html", "Privacy promise", "passport privacy section");
expectIncludes("passport/index.html", "No identity", "passport privacy contract");
expectIncludes("passport/index.html", "No fake transfer", "passport honest-transfer rule");
expectIncludes("passport/index.html", "No account required", "passport no-account portability rule");
expectIncludes("passport/index.html", "Use this next", "passport next-use section");
expectIncludes("passport/index.html", "Find group agreement", "passport group-agreement CTA");
expectNotIncludes("passport/index.html", "Try CC", "passport app-first CTA");
expectIncludes("instances/index.html", "Build the next app", "app creation path");
expectIncludes("instances/index.html", "What every app shares", "shared app structure section");
expectIncludes("instances/index.html", "Explore the apps", "app catalogue navigation");
expectIncludes("instances/index.html", "How values carry over", "values portability section");
expectIncludes("instances/index.html", "Before a new app is public", "app readiness checklist");
expectIncludes("instances/index.html", "New subject brief", "new-subject scaffold");
expectIncludes("instances/index.html", "Write this before code", "no-code-first prompt");
expectIncludes("instances/index.html", "Read the adoption guide", "adoption-guide CTA");
expectIncludes("instances/index.html", "Use the new-subject brief", "new-subject CTA");
expectIncludes("instances/new/index.html", "Build an app around one decision", "new-app builder purpose");
expectIncludes("instances/new/index.html", "No source, no score", "new-app evidence rule");
expectNotIncludes("instances/new/index.html", "press an instance", "internal builder jargon");
expectIncludes("contribute/index.html", "Make one decision more trustworthy", "contribution path");
expectIncludes("contribute/index.html", "Ways to help", "contribution navigation");
expectIncludes("contribute/index.html", "A useful correction", "correction section");
expectIncludes("contribute/index.html", "Add an ownership or alternative link", "relationship contribution shape");
expectIncludes("contribute/index.html", "New subject brief", "new-subject path");
expectIncludes("contribute/index.html", "Write the decision before the code", "new-subject scope prompt");
expectIncludes("contribute/index.html", "Use the new-subject brief", "new-subject CTA");
expectIncludes("contribute/index.html", "Correct a fact", "contribution ecosystem CTA");
expectNotIncludes("contribute/index.html", "Try CC", "contribution app-first CTA");
expectIncludes("weave/index.html", "See what a choice is connected to", "relationship-map purpose");
expectIncludes("weave/index.html", "Explore the map", "relationship-map navigation");
expectIncludes("weave/index.html", "Trust rules", "relationship-map trust rules");
expectIncludes("weave/index.html", "Name both sides", "relationship endpoint rule");
expectIncludes("weave/index.html", "Show the source or calculation", "relationship basis rule");
expectIncludes("weave/index.html", "Keep corrections visible", "relationship contestability rule");
expectIncludes("weave/index.html", "Relationship file", "relationship-file section");
expectIncludes("weave/index.html", "open-values-edges", "weave edge-file contract");
expectIncludes("weave/index.html", "Add a relationship", "relationship contribution section");
expectIncludes("weave/index.html", "What the map should do", "relationship action section");
expectNotIncludes("weave/index.html", "Try CC", "weave app-first CTA");
expectIncludes("kosplora/index.html", "Instance spine", "Kosplora instance navigation");
expectIncludes("instances/messages/index.html", "Instance spine", "Where to Message instance navigation");
expectIncludes("assembly/index.html", "How the files move", "assembly file guide");
expectIncludes("assembly/index.html", "What this page promises", "assembly consent rules");
expectIncludes("assembly/index.html", "People bring their own files", "assembly consent rule");
expectIncludes("assembly/index.html", "Dissent preserved", "assembly dissent preservation rule");
expectIncludes("assembly/index.html", "Full group export", "assembly full-group export rule");
expectIncludes("workshop/index.html", "How the files move", "workshop file guide");
expectIncludes("workshop/index.html", "What a useful correction includes", "workshop correction rules");
expectIncludes("workshop/index.html", "Source before score", "workshop source-before-score rule");
expectIncludes("workshop/index.html", "Keep it reversible", "workshop reversible change rule");
expectIncludes("slate/index.html", "How the files move", "slate file guide");
expectIncludes("slate/index.html", "What the plan must keep visible", "slate planning rules");
expectIncludes("slate/index.html", "Reason stays attached", "slate attached-reason rule");
expectIncludes("slate/index.html", "Dissent visible", "slate dissent visibility rule");
expectIncludes("slate/index.html", "Facts contestable", "slate contestability rule");
expectIncludes("tour/index.html", "Tour exits", "tour ecosystem exit links");
expectIncludes("tour/index.html", "Choose your next move", "tour next-move chooser");
expectIncludes("tour/index.html", "Correct a claim", "tour workshop route");
expectIncludes("tour/index.html", "Trace relationships", "tour weave route");
expectIncludes("tour/index.html", "../weave/index.html", "tour link to Weave");
// 2026-08-18: the engine demonstration moved to kosplora/shelf/ when the door became the
// route walker's front page; these pins follow the content they exist to protect. The door
// gets its own pins: the routes it lists must exist and the promises must stay put.
expectIncludes("kosplora/shelf/index.html", "What this instance proves", "Kosplora proof strip");
expectIncludes("kosplora/shelf/index.html", "Decision transfer", "Kosplora decision-transfer proof");
expectIncludes("kosplora/shelf/index.html", "../../app/engine.js", "Kosplora shared engine import");
expectIncludes("kosplora/shelf/index.html", "../../app/decision.js", "Kosplora shared decision import");
expectIncludes("kosplora/index.html", "Follow a question into the world", "Kosplora door hero");
expectIncludes("kosplora/index.html", "route/local-ai/index.html", "Kosplora door lists the first route");
expectIncludes("kosplora/index.html", "shelf/index.html", "Kosplora door reaches the shelf");
expectIncludes("instances/messages/index.html", "What this instance proves", "Messages proof strip");
expectIncludes("instances/messages/index.html", "Zero shell edits", "Messages zero-shell proof");
expectIncludes("funders/index.html", "What support strengthens", "funder support section");
expectNotIncludes("funders/index.html", "noindex", "funder noindex directive conflicts with its public sitemap entry");
expectIncludes("funders/index.html", "More people can use it, check it, and adapt it.", "funder public-use framing");
expectIncludes("funders/index.html", "What we would test", "funder test plan");
expectIncludes("funders/index.html", "One new subject", "funder new-subject test");
expectIncludes("funders/index.html", "Six months of work", "funder work plan");
expectIncludes("funders/index.html", "Use it, learn, and fix what matters.", "funder work framing");
expectIncludes("funders/index.html", "Plan one new app", "funder new-app milestone");
expectIncludes("funders/index.html", "Improve the adoption guide", "funder adoption milestone");
expectIncludes("funders/index.html", "ADOPTION-KIT.md", "funder link to adoption kit");
expectIncludes("contribute/index.html", "Open the adoption guide", "contribution adoption-guide CTA");
expectFile("docs/ADOPTION-KIT.md");
expectIncludes("docs/ADOPTION-KIT.md", "## Choose a Starting Point", "adoption guide audience router");
expectIncludes("docs/ADOPTION-KIT.md", "## New Subject Brief", "adoption guide new-subject brief");
expectIncludes("docs/ADOPTION-KIT.md", "## What to Record", "adoption guide tester notes");
expectIncludes("docs/ADOPTION-KIT.md", "PREVIEW-FEEDBACK-LOOP.md", "adoption kit feedback-loop link");
expectIncludes("docs/ADOPTION-KIT.md", "Do not start by adding features. Start by naming a decision.", "adoption kit anti-feature-sprawl rule");
expectIncludes("docs/README.md", "ADOPTION-KIT.md](ADOPTION-KIT.md) -> [CREATE-AN-INSTANCE.md", "docs map builder/adopter adoption path");
expectIncludes("docs/DEPLOY-AND-SHARE.md", "/docs/ADOPTION-KIT.html", "deploy guide adoption-kit URL");
expectIncludes("docs/GRANT-ONE-PAGER.md", "### Six months of work", "grant one-pager work plan");
expectIncludes("docs/GRANT-ONE-PAGER.md", "A practical adoption guide and new-subject brief", "grant one-pager adoption result");
expectIncludes("docs/GRANT-PREVIEW-PATH.md", "six-month work plan", "grant preview work-plan talking point");
expectIncludes("docs/CREATE-AN-INSTANCE.md", "## New subject brief", "new-subject doc template");
expectIncludes("docs/CREATE-AN-INSTANCE.md", "What must be true before launch", "instance launch-test prompt");
expectIncludes("docs/CREATE-AN-INSTANCE.md", "Before you share it publicly", "instance public checklist");

for (const dir of ["standard", "passport", "contribute", "weave"]) {
  expectIncludes("pipeline/build_site.py", `'${dir}'`, `PUBLIC_DIRS entry for ${dir}`);
}

for (const doc of ["STANDARD-v0", "VALUES-PASSPORT", "CREATE-AN-INSTANCE", "ADOPTION-KIT", "THE-WEAVE", "DEPLOY-AND-SHARE"]) {
  expectIncludes("pipeline/build_site.py", `'${doc}'`, `PUBLIC_DOCS entry for ${doc}`);
}

expectIncludes(
  "docs/DEPLOY-AND-SHARE.md",
  "https://valuescommons.org/standard/",
  "openvaluesstandard.org redirect target",
);
expectIncludes(
  "standard/index.html",
  "openvaluesstandard.org",
  "spec-domain explanation on standard page",
);

expectNotIncludes(
  "docs/README.md",
  "Part 5 | Product polish and launch surfaces, pending",
  "stale Part 5 pending status",
);

checkLocalLinks(routeFiles);
checkRouteMetadataContract(shareMetaRouteFiles);
const generatedSeoCount = checkGeneratedSeoContract();

if (failures.length) {
  console.log("Public route audit failures:");
  for (const failure of failures) console.log(`  FAIL ${failure}`);
  process.exit(1);
}

console.log(`Public route audit: ${routeFiles.length} route files OK`);
console.log(`Generated SEO audit: ${generatedSeoCount} guide/verdict pages OK`);
console.log("PUBLIC ROUTE CHECKS PASS");
