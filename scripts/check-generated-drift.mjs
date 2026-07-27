#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SITE_BASE = (process.env.CC_SITE_BASE || "https://valuescommons.org/app").replace(/\/+$/, "");
const GENERATED_TARGETS = [
  "app/data",
  "app/data.js",
  "app/lines.js",
  "app/guides.js",
  "app/g",
  "app/c",
  "app/og-home.png",
  "app/sitemap.xml",
  "app/robots.txt",
  "app/index.html",
  "app/styles.css",
];
const TOP_LEVEL_DATA_CONTRACTS = new Set([
  "asks-offers-index.json",
  "barcodes.json",
  "challenge-index.json",
  "design-tokens.json",
  "index.json",
  "proposals.json",
  "pulse.json",
]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_WIDTH = 1200;
const PNG_HEIGHT = 630;
const CRC32_TABLE = new Uint32Array(256);
for (let n = 0; n < CRC32_TABLE.length; n++) {
  let value = n;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  CRC32_TABLE[n] = value >>> 0;
}

// Not byte-reproducible across machines, so they can't gate a cross-platform check without false drift:
//  · pulse.json is a date/git-history feed (differs whenever the clock or history moves)
//  · rasterized images (PNGs: og-home, verdict cards) depend on the OS font stack + library versions
// The check still guards the text outputs (datasets, guides, data.js, node indexes) — the ones a stale
// source edit would leave wrong — and it normalizes line endings so a Windows CRLF working tree and a
// Linux LF checkout compare equal (git stores LF either way; only the working bytes differed).
const IGNORE = [/(^|\/)pulse\.json$/, /\.png$/i, /\.jpe?g$/i, /\.ico$/i, /\.woff2?$/i];
function ignored(rel) { return IGNORE.some((re) => re.test(rel)); }
const TEXT_EXT = /\.(html?|json|js|css|xml|txt|svg|md|webmanifest)$/i;

// Ignored outputs must be non-mutating too. Pulse has a dedicated semantic audit, so this script
// does not rebuild it; the environment below suppresses platform-dependent raster regeneration.

function relPath(file) {
  return path.join(ROOT, file);
}

function sha(file) {
  let buf = fs.readFileSync(file);
  if (TEXT_EXT.test(file)) buf = Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n")); // EOL-agnostic
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function walk(rel, out = []) {
  const norm = rel.replace(/\\/g, "/");
  if (ignored(norm)) return out;
  const abs = relPath(rel);
  if (!fs.existsSync(abs)) {
    out.push([norm, "<missing>"]);
    return out;
  }
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    out.push([norm, sha(abs)]);
    return out;
  }
  if (!stat.isDirectory()) return out;
  for (const name of fs.readdirSync(abs).sort()) {
    walk(path.join(rel, name), out);
  }
  return out;
}

function snapshot() {
  const map = new Map();
  for (const target of GENERATED_TARGETS) {
    for (const [rel, digest] of walk(target)) map.set(rel, digest);
  }
  return map;
}

function walkIgnoredNames(rel, out = new Set()) {
  const norm = rel.replace(/\\/g, "/");
  const abs = relPath(rel);
  if (!fs.existsSync(abs)) return out;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    if (ignored(norm)) out.add(norm);
    return out;
  }
  if (!stat.isDirectory()) return out;
  for (const name of fs.readdirSync(abs).sort()) walkIgnoredNames(path.join(rel, name), out);
  return out;
}

function ignoredNameSnapshot() {
  const names = new Set();
  for (const target of GENERATED_TARGETS) walkIgnoredNames(target, names);
  return names;
}

function generatedFilesUnder(rel, pattern, out = []) {
  const abs = relPath(rel);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) generatedFilesUnder(child, pattern, out);
    else if (entry.isFile() && pattern.test(entry.name)) out.push(child.replace(/\\/g, "/"));
  }
  return out;
}

function compareClosure(label, actual, expected, errors) {
  const actualSet = new Set(actual);
  for (const file of [...expected].sort()) {
    if (!actualSet.has(file)) errors.push(`${label}: missing ${file}`);
  }
  for (const file of [...actualSet].sort()) {
    if (!expected.has(file)) errors.push(`${label}: orphan ${file}`);
  }
}

function pngCrc32(buffer, start, end) {
  let crc = 0xffffffff;
  for (let offset = start; offset < end; offset++) {
    crc = CRC32_TABLE[(crc ^ buffer[offset]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function inspectGeneratedPng(file, errors) {
  const absolute = relPath(file);
  if (!fs.existsSync(absolute)) {
    errors.push(`raster outputs: missing ${file}`);
    return;
  }
  const buffer = fs.readFileSync(absolute);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    errors.push(`raster outputs: ${file} is not a complete PNG`);
    return;
  }

  let offset = 8;
  let sawHeader = false;
  let sawImageData = false;
  let sawEnd = false;
  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) {
      errors.push(`raster outputs: ${file} has a truncated chunk header`);
      return;
    }
    const length = buffer.readUInt32BE(offset);
    if (length > buffer.length - offset - 12) {
      errors.push(`raster outputs: ${file} has a truncated chunk body`);
      return;
    }
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataEnd = offset + 8 + length;
    if (!/^[A-Za-z]{4}$/.test(type)) {
      errors.push(`raster outputs: ${file} has an invalid chunk type`);
      return;
    }
    if (pngCrc32(buffer, offset + 4, dataEnd) !== buffer.readUInt32BE(dataEnd)) {
      errors.push(`raster outputs: ${file} has a ${type} CRC mismatch`);
      return;
    }
    if (!sawHeader) {
      if (type !== 'IHDR' || length !== 13) {
        errors.push(`raster outputs: ${file} does not begin with a valid IHDR`);
        return;
      }
      const width = buffer.readUInt32BE(offset + 8);
      const height = buffer.readUInt32BE(offset + 12);
      if (width !== PNG_WIDTH || height !== PNG_HEIGHT) {
        errors.push(`raster outputs: ${file} is ${width}x${height}; expected ${PNG_WIDTH}x${PNG_HEIGHT}`);
        return;
      }
      sawHeader = true;
    } else if (type === 'IHDR') {
      errors.push(`raster outputs: ${file} has a duplicate IHDR`);
      return;
    }
    if (type === 'IDAT') sawImageData = true;
    offset = dataEnd + 4;
    if (type === 'IEND') {
      if (length !== 0 || offset !== buffer.length) {
        errors.push(`raster outputs: ${file} has an invalid IEND or trailing bytes`);
        return;
      }
      sawEnd = true;
      break;
    }
  }
  if (!sawImageData || !sawEnd) errors.push(`raster outputs: ${file} is missing IDAT or IEND`);
}

function checkSurfaceClosure() {
  const errors = [];
  const catalog = JSON.parse(fs.readFileSync(relPath("app/data/index.json"), "utf8"));
  const expectedDatasets = new Set();
  const categoryIds = new Set();
  for (const category of catalog.categories || []) {
    const file = `app/data/${category.file}`;
    if (expectedDatasets.has(file)) errors.push(`dataset outputs: duplicate catalogue file ${category.file}`);
    if (categoryIds.has(category.id)) errors.push(`dataset outputs: duplicate category id ${category.id}`);
    expectedDatasets.add(file);
    categoryIds.add(category.id);
    if (fs.existsSync(relPath(file))) {
      const dataset = JSON.parse(fs.readFileSync(relPath(file), "utf8"));
      if (dataset.meta?.id !== category.id) errors.push(`dataset outputs: ${file} id does not match catalogue`);
    }
  }
  const expectedTopLevelData = new Set(expectedDatasets);
  for (const name of TOP_LEVEL_DATA_CONTRACTS) expectedTopLevelData.add(`app/data/${name}`);
  const actualTopLevelData = fs.readdirSync(relPath("app/data"), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
    .map(entry => `app/data/${entry.name}`);
  compareClosure("top-level data outputs", actualTopLevelData, expectedTopLevelData, errors);

  const nodeManifest = JSON.parse(fs.readFileSync(relPath("app/data/nodes/manifest.json"), "utf8"));
  const expectedNodes = new Set(["app/data/nodes/manifest.json"]);
  for (const entry of nodeManifest.indexes || []) {
    if (typeof entry.file !== "string" || path.basename(entry.file) !== entry.file || !entry.file.endsWith(".json")) {
      errors.push(`node outputs: invalid manifest file ${JSON.stringify(entry.file)}`);
      continue;
    }
    const file = `app/data/nodes/${entry.file}`;
    if (expectedNodes.has(file)) errors.push(`node outputs: duplicate manifest file ${entry.file}`);
    expectedNodes.add(file);
  }
  const actualNodes = generatedFilesUnder("app/data/nodes", /\.json$/i);
  compareClosure("node outputs", actualNodes, expectedNodes, errors);

  const guideSlugs = fs.readdirSync(relPath("content/guides"))
    .filter(name => name.endsWith(".md"))
    .map(name => name.slice(0, -3));
  const expectedGuides = new Set(["app/g/index.html", "app/g/index.png"]);
  const expectedGuidePngs = new Set(["app/g/index.png"]);
  for (const slug of guideSlugs) {
    expectedGuides.add(`app/g/${slug}.html`);
    expectedGuides.add(`app/g/${slug}.png`);
    expectedGuidePngs.add(`app/g/${slug}.png`);
  }
  const actualGuides = generatedFilesUnder("app/g", /.*/);
  compareClosure("guide directory outputs", actualGuides, expectedGuides, errors);

  const manifest = JSON.parse(fs.readFileSync(relPath("app/c/_cards.json"), "utf8"));
  const expectedVerdicts = new Set(["app/c/index.html"]);
  const expectedCardPngs = new Set();
  const cardIds = new Set();
  for (const card of manifest) {
    const id = `${card.cid}/${card.code}`;
    if (cardIds.has(id)) errors.push(`verdict outputs: duplicate manifest id ${id}`);
    cardIds.add(id);
    expectedVerdicts.add(`app/c/${id}.html`);
    expectedVerdicts.add(`app/c/${id}.png`);
    expectedCardPngs.add(`app/c/${id}.png`);
  }
  const expectedCardDirectory = new Set(expectedVerdicts);
  expectedCardDirectory.add("app/c/_cards.json");
  const actualCards = generatedFilesUnder("app/c", /.*/);
  compareClosure("verdict directory outputs", actualCards, expectedCardDirectory, errors);

  const expectedRasters = new Set(["app/og-home.png", ...expectedGuidePngs, ...expectedCardPngs]);
  for (const file of [...expectedRasters].sort()) inspectGeneratedPng(file, errors);

  return {
    errors,
    datasetFiles: expectedDatasets.size,
    dataContractFiles: TOP_LEVEL_DATA_CONTRACTS.size,
    topLevelDataFiles: expectedTopLevelData.size,
    nodeFiles: expectedNodes.size,
    guideFiles: expectedGuides.size,
    cardFiles: expectedVerdicts.size,
    cardDirectoryFiles: expectedCardDirectory.size,
    rasterFiles: expectedRasters.size,
  };
}

function run(command, args, options = {}) {
  const label = [command, ...args].join(" ");
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      CC_SITE_BASE: SITE_BASE,
      CC_SKIP_CARD_IMAGES: "1",
      CC_SKIP_GUIDE_IMAGES: "1",
    },
    ...options,
  });
  if (result.error) {
    if (result.error.code === "ENOENT") return false;
    throw result.error;
  }
  if (result.status !== 0) process.exit(result.status || 1);
  return true;
}

function runPython(script, args = []) {
  const candidates = process.platform === "win32"
    ? [["py", ["-3"]], ["python", []], ["python3", []]]
    : [["python3", []], ["python", []]];
  for (const [command, baseArgs] of candidates) {
    if (run(command, [...baseArgs, script, ...args])) return;
  }
  console.error("No Python 3 executable found. Install Python or set PATH before checking generated drift.");
  process.exit(1);
}

function extractOrderedBuildSteps(source) {
  const steps = [];
  const call = /\brun\(\s*["']node["']\s*,\s*\[\s*["']([^"']+)["']|\brunPython\(\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(call)) steps.push(match[1] || match[2]);
  return steps;
}

function duplicateSteps(steps) {
  const seen = new Set();
  const duplicates = new Set();
  for (const step of steps) {
    if (seen.has(step)) duplicates.add(step);
    else seen.add(step);
  }
  return [...duplicates];
}

function assertBuildGraphParity() {
  const canonicalSource = fs.readFileSync(relPath("scripts/build.mjs"), "utf8");
  const auditSource = fs.readFileSync(relPath("scripts/check-generated-drift.mjs"), "utf8");
  const canonical = extractOrderedBuildSteps(canonicalSource)
    .filter(step => step.startsWith("pipeline/"));
  const audited = extractOrderedBuildSteps(auditSource)
    .filter(step => step.startsWith("pipeline/") || step === "research/pulse_audit.js");
  const errors = [];

  const canonicalDuplicates = duplicateSteps(canonical);
  const auditDuplicates = duplicateSteps(audited);
  if (canonicalDuplicates.length) errors.push(`canonical build repeats: ${canonicalDuplicates.join(", ")}`);
  if (auditDuplicates.length) errors.push(`drift audit repeats: ${auditDuplicates.join(", ")}`);

  const siteBuild = "pipeline/build_site.py";
  const pulseBuild = "pipeline/build_pulse.js";
  const pulseAudit = "research/pulse_audit.js";
  if (canonical.filter(step => step === siteBuild).length !== 1 || canonical.at(-1) !== siteBuild) {
    errors.push(`${siteBuild} must remain the single final canonical build step`);
  }
  if (canonical.filter(step => step === pulseBuild).length !== 1) {
    errors.push(`${pulseBuild} must appear exactly once in the canonical build`);
  }
  if (audited.includes(siteBuild)) errors.push(`${siteBuild} must stay outside the source-only drift audit`);
  if (audited.includes(pulseBuild)) errors.push(`${pulseBuild} must not rewrite history during the drift audit`);
  if (audited.filter(step => step === pulseAudit).length !== 1) {
    errors.push(`${pulseAudit} must replace the pulse writer exactly once`);
  }

  const expected = canonical
    .filter(step => step !== siteBuild)
    .map(step => step === pulseBuild ? pulseAudit : step);
  if (JSON.stringify(audited) !== JSON.stringify(expected)) {
    errors.push(`producer order differs\n    expected: ${expected.join(" -> ")}\n    audited:  ${audited.join(" -> ")}`);
  }
  if (errors.length) {
    console.error(`\nGenerated-output build graph is incomplete:\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  return { canonical: canonical.length, audited: audited.length };
}

function diff(before, after) {
  const changed = [];
  const keys = new Set([...before.keys(), ...after.keys()]);
  for (const key of [...keys].sort()) {
    if (before.get(key) !== after.get(key)) changed.push(key);
  }
  return changed;
}

console.log("Generated-output drift audit");
console.log(`  site base: ${SITE_BASE}`);
console.log(`  targets: ${GENERATED_TARGETS.join(", ")}`);
const buildGraph = assertBuildGraphParity();
console.log(`  build graph: ${buildGraph.canonical} canonical steps, ${buildGraph.audited} audited steps (site build excluded; pulse read-only)`);

const before = snapshot();
const ignoredBefore = ignoredNameSnapshot();
run("node", ["pipeline/build_lines.js"]);
runPython("pipeline/build_datasets.py");
run("node", ["pipeline/build_tags.js"]);
run("node", ["pipeline/build_errands.js"]);
run("node", ["pipeline/build_nodes.js"]);
run("node", ["research/pulse_audit.js", "--allow-derived-drift"]);
run("node", ["pipeline/build_challenge.js"]);
run("node", ["pipeline/build_proposals.js"]);
run("node", ["pipeline/build_initiatives.js"]);
run("node", ["pipeline/build_design_tokens.js"]);
run("node", ["pipeline/build_cards.js"]);
runPython("pipeline/build_guides.py");
const after = snapshot();
const ignoredAfter = ignoredNameSnapshot();
const closure = checkSurfaceClosure();

const ignoredNameChanges = [...new Set([...ignoredBefore, ...ignoredAfter])]
  .filter(file => ignoredBefore.has(file) !== ignoredAfter.has(file));
const changed = [...new Set([...diff(before, after), ...ignoredNameChanges])].sort();
if (changed.length || closure.errors.length) {
  if (closure.errors.length) {
    console.log(`\nGenerated surface closure failures: ${closure.errors.length}`);
    for (const failure of closure.errors.slice(0, 80)) console.log(`  ${failure}`);
    if (closure.errors.length > 80) console.log(`  ... ${closure.errors.length - 80} more`);
  }
  if (!changed.length) process.exit(1);
  console.log(`\nGenerated outputs changed after rebuild: ${changed.length}`);
  for (const rel of changed.slice(0, 80)) console.log(`  ${rel}`);
  if (changed.length > 80) console.log(`  ... ${changed.length - 80} more`);
  console.log("\nRun the build, review the generated changes, and include them with the source edit.");
  process.exit(1);
}

console.log(`GENERATED SURFACES CLOSED (${closure.topLevelDataFiles} top-level data files: ${closure.datasetFiles} datasets + ${closure.dataContractFiles} contracts; ${closure.nodeFiles} node files; ${closure.guideFiles} guide files; ${closure.cardDirectoryFiles} card-directory files: ${closure.cardFiles} verdicts + manifest; ${closure.rasterFiles} raster contracts)`);
console.log(`GENERATED OUTPUTS CURRENT (${after.size} files checked)`);
