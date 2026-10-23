// The conformance page's checker. It reads the file in the browser with FileReader or from the text box,
// fetches the registry and the schemas this site publishes, and runs the same validator as the command
// line (ovs-validate.mjs). Nothing the reader chooses or pastes leaves the page.
import { validate, entryFor, SCHEMA_BASE } from './ovs-validate.mjs';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const out = $('ck-out');
let registry = null;

async function getRegistry() {
  if (!registry) registry = await fetch('../../app/data/standard/registry.json').then((r) => r.json());
  return registry;
}
const load = (id) => fetch('/schema/' + id.slice(SCHEMA_BASE.length).split('#')[0]).then((r) => (r.ok ? r.json() : undefined));

async function fillFormats() {
  const reg = await getRegistry();
  const sel = $('ck-format');
  for (const e of reg.entries.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    const o = document.createElement('option');
    o.value = e.id; o.textContent = e.id;
    sel.appendChild(o);
  }
}

async function run(text) {
  out.innerHTML = '<p>Checking&hellip;</p>';
  let value;
  try { value = JSON.parse(text); } catch (e) { out.innerHTML = `<p><b>Not readable JSON.</b> ${esc(e.message)}</p>`; return; }
  const reg = await getRegistry();
  const entry = entryFor(value, reg, $('ck-format').value || null);
  if (!entry) { out.innerHTML = '<p><b>The file has no <code>format</code> field,</b> so the format is unknown. Choose one above and check again.</p>'; return; }
  const schemaUrl = '../../' + entry.schema;
  const schema = await fetch(schemaUrl).then((r) => (r.ok ? r.json() : null));
  if (!schema) { out.innerHTML = `<p>Could not load the schema for <code>${esc(entry.id)}</code>.</p>`; return; }
  const errors = await validate(value, schema, { load });
  const spec = `../spec/${encodeURIComponent(entry.id)}/index.html`;
  if (!errors.length) {
    out.innerHTML = `<p><b>A valid <a href="${spec}"><code>${esc(entry.id)}</code></a> file.</b> It holds everything its schema requires. Rules that span several fields are checked by the full audit, listed below.</p>`;
    return;
  }
  out.innerHTML = `<p><b>Not a valid <a href="${spec}"><code>${esc(entry.id)}</code></a> file.</b> ${errors.length} problem${errors.length === 1 ? '' : 's'}:</p><ul>` +
    errors.slice(0, 200).map((e) => `<li><code>${esc(e.path || '(the whole file)')}</code> ${esc(e.message)}</li>`).join('') +
    (errors.length > 200 ? `<li>and ${errors.length - 200} more</li>` : '') + '</ul>';
}

$('ck-file').addEventListener('change', () => {
  const f = $('ck-file').files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { $('ck-text').value = String(rd.result); run(String(rd.result)); };
  rd.readAsText(f);
});
$('ck-run').addEventListener('click', () => run($('ck-text').value));
fillFormats().catch(() => { out.innerHTML = '<p>The list of formats could not be loaded.</p>'; });
