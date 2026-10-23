#!/usr/bin/env node
// Saves the Futurism Institute's list of projects (futurisminstitute.org/family.json) into this
// repository as content/family.json, the copy the family footer is built from.
//
// WHY A COPY: the build and CI run without the network, and the footer has to come out the same
// every time. The Institute builds the list from C:\websites\packages\design-system\projects.mjs and
// its footer reads the same file, so a fresh copy here makes the two footers identical. Run this when
// the Institute says the list changed, then build: pipeline/build_family_footer.js does the rest.
import { writeFileSync } from 'node:fs';

const SOURCE = 'https://futurisminstitute.org/family.json';
const res = await fetch(SOURCE, { headers: { accept: 'application/json' } });
if (!res.ok) { console.error(`import-family: ${SOURCE} answered ${res.status}`); process.exit(1); }
const family = await res.json();
if (!Array.isArray(family.projects) || !Array.isArray(family.homes) || !family.groups) {
  console.error('import-family: the list has no projects, homes or groups; not saved');
  process.exit(1);
}
family.importedFrom = SOURCE;
writeFileSync(new URL('../content/family.json', import.meta.url), JSON.stringify(family, null, 2) + '\n');
console.log(`import-family: ${family.projects.length} projects (${family.projects.filter((p) => p.public).length} public), built ${family.built}`);
