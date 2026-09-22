const ALLERGEN_LABELS={gluten:"gluten",crustaceans:"crustaceans",eggs:"eggs",fish:"fish",peanut:"peanuts",soy:"soybeans",milk:"milk",nuts:"tree nuts",celery:"celery",mustard:"mustard",sesame:"sesame",sulphites:"sulphites",lupin:"lupin",molluscs:"molluscs",lactose:"lactose",coconut:"coconut"};
const TYPES=['Products','Services','Media','Organizations','Initiatives'];
// C4: category -> guide relation (the "wikipedia article" for a category)
const CAT_GUIDE={
  'plant-based-milk':'plant-based-milk','milk':'milk','plant-based-yogurt':'plant-based-yogurt','eggs':'eggs',
  'breakfast-cereal':'breakfast-cereal','granola':'granola','oats':'oats','coffee':'coffee','dark-chocolate':'dark-chocolate',
  'yogurt':'yogurt','olive-oil':'olive-oil','bread':'bread','plant-based-meat':'plant-based-meat','tea':'tea',
  'pasta-sauce':'pasta-sauce','nut-butter':'nut-butter','nuts':'nuts','fruit-juice':'fruit-juice','ice-cream':'ice-cream',
  'cheese':'cheese','butter':'butter','crisps':'crisps','biscuits':'biscuits','soda':'soda','honey':'honey',
  'fruit-jam':'fruit-jam','rice':'rice','pasta':'pasta','legumes':'legumes','tofu':'tofu','hummus':'hummus',
  'soups':'soups','canned-fish':'canned-fish','canned-tomatoes':'canned-tomatoes','canned-vegetables':'canned-vegetables',
  'frozen-vegetables':'frozen-vegetables','frozen-pizza':'frozen-pizza','dried-fruit':'dried-fruit','cereal-bars':'cereal-bars',
  'energy-drinks':'energy-drinks','crackers':'crackers','ketchup':'ketchup','mayonnaise':'mayonnaise','salad-dressing':'salad-dressing',
  'ready-meals':'ready-meals','fish-seafood':'fish-seafood','spices-seasoning':'spices-seasoning','flour-baking':'flour-baking',
  'pickles':'pickles','chocolate-spread':'chocolate-spread','toothpaste':'toothpaste','mouthwash':'mouthwash','soap':'soap',
  'body-wash':'body-wash','shampoo':'shampoo','deodorant':'deodorant','sunscreen':'sunscreen','face-wash':'face-wash',
  'face-cream':'face-cream','hand-cream':'hand-cream','lip-balm':'lip-balm','hair-conditioner':'hair-conditioner',
  'razors':'razors','period-products':'period-products','cleaning-products':'cleaning-products','dish-soap':'dish-soap','laundry':'laundry',
  'paper-goods':'paper-goods','clothing':'clothing','shoes':'shoes','learning-resources':'learning-resources',
  'news-sources':'news-sources','music-streaming':'music-streaming','books':'books','digital-services':'digital-services',
  'ai-assistants':'ai-assistants','password-managers':'password-managers','vpn':'vpn','phones':'phones','laptops':'laptops',
  'mobile-carriers':'mobile-carriers','broadband-internet':'broadband-internet','smart-thermostats':'smart-thermostats',
  'banking':'ethical-banking','payments':'payments','investing':'investing','causes-to-support':'causes-to-support',
  'mission-businesses':'mission-businesses',
  'credit-cards':'credit-cards','mortgages':'mortgages','washing-machines':'washing-machines',
  'self-hosting-platforms':'self-hosting-platforms','federated-social-servers':'federated-social-servers',
  'direct-drive-solar':'direct-drive-solar','off-grid-power-systems':'off-grid-power-systems',
  'messaging':'private-messaging'
};

// === Release channels: 'public' (the live sites — only what's hand-reviewed) vs 'dev' (the workbench —
// everything, including surfaces whose generated prose hasn't passed the voice bar yet). One deploy, one
// codebase; the channel is a local flag. localhost defaults to dev; the live domains default to public;
// anyone can flip it — the workbench is open, just not the front door. Gated surfaces are replaced in
// public by honest design-intention notes (#workbench), never by silent absence. ===
const CH_KEY='cc.channel';
function _chDefault(){const h=location.hostname;return (h==='localhost'||h==='127.0.0.1'||h==='::1'||h==='')?'dev':'public';}
let channel=(function(){try{const m=location.search.match(/[?&]channel=(dev|public)/);if(m){localStorage.setItem(CH_KEY,m[1]);return m[1];}return localStorage.getItem(CH_KEY)||_chDefault();}catch(e){return _chDefault();}})();
function chDev(){return channel==='dev';}
function setChannel(c){try{localStorage.setItem(CH_KEY,c);}catch(e){}channel=c;announce(c==='dev'?'Workbench on, you now see the in-progress surfaces.':'Workbench off, the public view.');location.hash='home';location.reload();}

// The value fingerprint, the "if you pick one" callout, the Lab page, and the posture-button experiment
// are retired. explain-the-score and compare mode are permanent now (no flags); the plain posture nudge stays.
let compareSet=[];
function explainEl(p){
  const items=[];let all=0,ws=0;
  for(const cr of DATA.criteria){const w=weights[cr.key]||0,sc=p.scores[cr.key];if(w>0){all+=w;if(sc!=null){ws+=w;items.push([cr.label,w,sc]);}}}
  if(!items.length)return el('div',{});
  const max=Math.max(1,...items.map(x=>x[1]*x[2]));items.sort((a,b)=>b[1]*b[2]-a[1]*a[2]);
  let rows='';
  for(const [label,w,sc] of items)rows+=`<div class="ex-row"><span class="ex-l">${esc(label)}</span><span class="ex-tr"><span class="ex-fl" style="width:${Math.round(sc*w/max*100)}%"></span></span><span class="ex-v">${sc}×${w}</span></div>`;
  const cov=all?ws/all:1;
  const adj=cov<0.999?`<p class="ex-note">Then scaled ×${cov.toFixed(2)} toward a neutral 50, we're missing ${Math.round((1-cov)*100)}% of what you weight here, and won't pretend to know.</p>`:'';
  const S=score(p), capl=(S&&S.cap)?`<p class="ex-note">Then <b>capped at 49</b>, you weight <b>${esc(S.cap.label)}</b> heavily (4–5) and it scores only ${S.cap.v}/100, a dealbreaker for you.</p>`:'';
  const box=el('details',{class:'explain explainlab'});
  box.innerHTML=`<summary>Why this score? Show the math</summary><div class="ex-wrap"><p class="ex-note">Your score = each fact × how much you weight it, biggest first.</p>${rows}${adj}${capl}</div>`;
  return box;
}
function postureEl(p){
  return el('div',{class:'posture'},`Before committing, <b>is this a need?</b> You can save it and sleep on it, see a better-for-your-values pick below, or consider borrowing, repairing, or skipping.`);
}
// Lab: compare mode — pin up to 4 entries and see them side by side.
function inCompare(code){return compareSet.some(x=>x.code===code);}
function toggleCompare(p){
  if(inCompare(p.code))compareSet=compareSet.filter(x=>x.code!==p.code);
  else if(compareSet.length<4)compareSet.push({code:p.code,product:p,label:DATA.meta.label,criteria:DATA.criteria.slice()});
  updateCompareFab();
}
function updateCompareFab(){
  let fab=document.getElementById('cmpfab');
  if(!fab){fab=el('a',{id:'cmpfab',class:'cmpfab',href:'#compare'});document.body.appendChild(fab);}
  if(compareSet.length){fab.style.display='';fab.textContent=`⊕ Compare (${compareSet.length})`;}else fab.style.display='none';
}
function renderCompare(){
  const v=document.getElementById('view-compare');
  if(!compareSet.length){v.innerHTML='<h2 class="sectionh">Compare</h2><p class="sectionsub">Nothing pinned yet. Open any entry and tap <b>⊕ Compare</b> to pin it (up to 4), then come back here.</p>';return;}
  const crit=[],seen={};
  for(const e of compareSet)for(const c of e.criteria)if(!seen[c.key]){seen[c.key]=1;crit.push(c);}
  let html='<h2 class="sectionh">Compare</h2><p class="sectionsub">Side by side across every criterion, pinned on this device.</p><div class="cmp-wrap"><table class="cmp"><thead><tr><th></th>';
  for(const e of compareSet)html+=`<th><div class="cmp-nm">${esc(e.product.name)}</div><div class="cmp-br">${esc(e.label)}</div><button class="cmp-x savebtn" data-code="${esc(e.code)}">remove</button></th>`;
  html+='</tr></thead><tbody>';
  for(const c of crit){html+=`<tr><td class="cmp-cl">${esc(c.label)}</td>`;
    for(const e of compareSet){const sc=e.product.scores?e.product.scores[c.key]:null;
      html+=`<td>${sc!=null?`<span class="cmp-bar"><span style="width:${sc}%"></span></span> <span class="cmp-v">${sc}</span>`:'<span class="cmp-na">,</span>'}</td>`;}
    html+='</tr>';}
  html+='</tbody></table></div>';
  v.innerHTML=html;
  v.querySelectorAll('.cmp-x').forEach(b=>b.onclick=()=>{compareSet=compareSet.filter(x=>x.code!==b.dataset.code);updateCompareFab();renderCompare();});
}
const STORAGE_KEY='cc.profile.v1', SAVED_KEY='cc.saved.v1', FEEDBACK_KEY='cc.feedback.v1', TRUST_LENS_KEY='cc.trustLens.v1';
const MAP_STATE_KEY='cc.map-state.v1';
let homeMapState=(function(){try{const v=JSON.parse(localStorage.getItem(MAP_STATE_KEY)||'null');return v&&v.version===1?v:null;}catch(e){return null;}})();
function saveHomeMapState(value){homeMapState=value||null;try{if(homeMapState)localStorage.setItem(MAP_STATE_KEY,JSON.stringify(homeMapState));else localStorage.removeItem(MAP_STATE_KEY);}catch(e){}}
let DATA=null,weights={},excludes=new Set(),selected=null,sortBy='score',regionFilter='everywhere',builtCriteria='',
    viewingSaved=false,viewingFeedback=false,feedbackContext=null,savedSet=new Set(),CATALOG=[];
let CHALLENGE_INDEX=null,CHALLENGE_INDEX_P=null;
let ASKS_OFFERS_INDEX=null,ASKS_OFFERS_INDEX_P=null;
let rerankPing=false; // T1, set by any weight change (slider/preset/theme chip); renderList confirms "re-ranked to your values" once, calmly
let trustLensOn=(function(){try{return localStorage.getItem(TRUST_LENS_KEY)==='1';}catch(e){return false;}})();

// --- The standing self (the "companion" keystone): allergens, diet/preferences and region are facts ABOUT YOU,
// not per-category chores. They live in one durable object, seed every category by default, and in-view changes
// write back so they follow you everywhere. Editable on the #you page. ---
const YOU_KEY='cc.you.v1';
const YOU={allergens:[],diet:[],avoid:[],region:'everywhere'};
(function(){try{const j=JSON.parse(localStorage.getItem(YOU_KEY)||'null');if(j){YOU.allergens=Array.isArray(j.allergens)?j.allergens:[];YOU.diet=Array.isArray(j.diet)?j.diet:[];YOU.avoid=Array.isArray(j.avoid)?j.avoid:[];YOU.region=j.region||'everywhere';}}catch(e){}})();
function saveYou(){try{localStorage.setItem(YOU_KEY,JSON.stringify(YOU));}catch(e){}}
const DIET_PREFS=['Vegan','Vegetarian','Organic','Palm-oil-free','Fair Trade','Cruelty-free','No added sugar']; // standing prefs, matched against product focuses/labels
const REGIONS=['everywhere','US','EU','UK'];
const REGION_SCOPE='Region uses broad availability tags. Global entries stay visible.';
function regionLabel(r){return r==='everywhere'?'Everywhere':(r+' coverage');}
function regionFilterText(r){return r==='everywhere'?'from anywhere':(r+' coverage, plus global entries');}
function categoryIndexMeta(cid){return (CATALOG||[]).find(c=>c.id===cid)||{};}
function currentRegionProfile(){return categoryIndexMeta(DATA&&DATA.meta&&DATA.meta.id).regionProfile||{};}
function currentRegionStrictSafe(){const p=currentRegionProfile();return p.strictCurrentEnumSafe!==false;}
let dietHidden=0, activeDietLast=[], dietCountLast={}; // last ranking's diet filter effect + per-line hidden counts (honest in-view messaging)
let avoidHiddenLast=0, activeAvoidLast=[]; // last ranking's avoid-line effect: [{label,n}] hidden here, honestly
let allergenFoldedLast=[]; // active-allergy conflicts + unknowns, kept in a named show-anyway fold

// --- R1 · LINES: the person's standing rules as one model. "Rules filter; the errand ranks; leanings break
// ties." Allergens + diet already lived in YOU; `avoid` (hide a company and its brands) is the new kind, and
// `require` reuses the diet focus-matcher. The canonical registry is CC.LINE_REGISTRY (generated from
// content/lines.json). A line only bites where the category carries the data for it — so "Vegetarian" never
// empties Banking. Nothing here is ever applied for you; you set every line yourself, and can remove it as easily.
function lineRegistry(){return (window.CC&&CC.LINE_REGISTRY)||[];}
function lineById(id){return lineRegistry().find(l=>l.id===id)||null;}
function linesByKind(kind){return lineRegistry().filter(l=>l.kind===kind);}
// A stored diet/require line is just its label (in YOU.diet); map it to the acceptable focus labels via the registry.
function reqLineForLabel(d){return lineRegistry().find(l=>(l.kind==='diet'||l.kind==='require')&&l.label===d)||null;}
function acceptFor(d){const L=reqLineForLabel(d);return L&&L.accept?L.accept:[d];}
// YOU.avoid holds registry ids (strings) and/or custom {label,brands} objects (a brand you named yourself).
function activeAvoidLines(){return (YOU.avoid||[]).map(a=>typeof a==='string'?lineById(a):a).filter(Boolean);}
function isAvoiding(av){const key=av&&(av.id||av.label);return (YOU.avoid||[]).some(a=>(typeof a==='string'?a:(a&&(a.id||a.label)))===key);}
// A brand token matches on word boundaries, case- AND accent-insensitively — "nescafe" hits "Nescafé",
// "coke" hits "Coca-Cola" but never "cokernel". Both sides are folded to plain ascii before comparing,
// so registry tokens can stay ascii and no encoding mishap can quietly shrink a boycott's reach.
function _fold(s){let x=String(s||'').toLowerCase();try{x=x.normalize('NFD').replace(/[̀-ͯ]/g,'');}catch(e){}return x;}
function _wordHit(hay,needle){
  const n=_fold(needle).trim(); if(n.length<2)return false;
  const h=_fold(hay);
  const escd=n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  try{return new RegExp('(^|[^a-z0-9])'+escd+'([^a-z0-9]|$)').test(h);}catch(e){return h.indexOf(n)>=0;}
}
function avoidHit(p,av){
  if(!av)return false;
  const hay=((p.brand||'')+' '+(p.name||'')+' '+(p.code||'')).toLowerCase();
  if(av.entity&&String(p.code||'').toLowerCase()===String(av.entity).toLowerCase())return true;
  for(const b of (av.brands||[]))if(_wordHit(hay,b))return true;
  return false;
}
// How many entities an avoid line currently reaches in a dataset — so its coverage reads honestly ("2 hidden here").
function avoidReach(av,ds){let n=0;for(const p of ((ds&&(ds.products||ds.resources))||[]))if(avoidHit(p,av))n++;return n;}
// "Draw a line from anything": add or remove a custom avoid line for a product's brand, from a verdict page.
function brandAvoidId(brand){return 'avoid:custom:'+String(brand||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}

// ── Conscience gets a body and a memory (Move 5) ──
// The FORCE COUNTER: how many times your lines stepped into a ranking — counted locally, once per
// category per session, never transmitted. Honest phrasing everywhere: times your lines ACTED on
// rankings, not purchases prevented (we don't know what you bought, on purpose).
const FORCE_KEY='cc.force.v1';
let FORCE=(function(){try{return JSON.parse(localStorage.getItem(FORCE_KEY)||'null')||{n:0,month:'',mn:0,by:{}};}catch(e){return {n:0,month:'',mn:0,by:{}};}})();
const _forceSeen=new Set();
function forceRecord(){
  if(!DATA)return; const hid=(avoidHiddenLast||0)+(dietHidden||0); if(!hid)return;
  const k=DATA.meta.id; if(_forceSeen.has(k))return; _forceSeen.add(k);
  const m=new Date().toISOString().slice(0,7);
  if(FORCE.month!==m){FORCE.month=m;FORCE.mn=0;}
  FORCE.n+=hid; FORCE.mn+=hid;
  for(const a of (activeAvoidLast||[]))FORCE.by[a.label]=(FORCE.by[a.label]||0)+a.n;
  try{localStorage.setItem(FORCE_KEY,JSON.stringify(FORCE));}catch(e){}
}
function forceLine(){
  if(!FORCE.n)return '';
  const top=Object.entries(FORCE.by).sort((a,b)=>b[1]-a[1])[0];
  return `Your rules have stepped in <b>${FORCE.n.toLocaleString()}</b> time${FORCE.n===1?'':'s'}${FORCE.mn&&FORCE.mn!==FORCE.n?`, ${FORCE.mn.toLocaleString()} this month`:''}${top&&top[1]>2?` · ${esc(top[0])} alone: ${top[1].toLocaleString()}`:''}. Counted on this device only.`;
}
// The SIGNING: arming a line gets one calm moment — shown once per line, dismissible, never again.
const CEREM_KEY='cc.ceremony.v1';
let _cerem=(function(){try{return new Set(JSON.parse(localStorage.getItem(CEREM_KEY)||'[]'));}catch(e){return new Set();}})();
function ceremony(line){
  if(!line||!line.id||_cerem.has(line.id))return;
  _cerem.add(line.id); try{localStorage.setItem(CEREM_KEY,JSON.stringify([..._cerem]));}catch(e){}
  const old=document.querySelector('.ceremony'); if(old)old.remove();
  const d=el('div',{class:'ceremony',role:'status'});
  const nb=(line.brands||[]).length;
  d.innerHTML=`<div><b>You set a rule.</b> ${esc(line.reads||('No more '+line.label+'.'))}${nb?` The ${nb} brand name${nb===1?'':'s'} this rule knows won't appear in anything ranked on this device.`:''}</div>`;
  const ok=el('button',{class:'savebtn'},'Okay');ok.onclick=()=>d.remove();d.appendChild(ok);
  document.body.appendChild(d); setTimeout(()=>{if(d.parentNode)d.remove();},9000);
}
function toggleAvoidBrand(p){
  const brand=((p&&p.brand)||(p&&p.name)||'').trim(); if(!brand)return false;
  const id=brandAvoidId(brand), has=(YOU.avoid||[]).some(a=>typeof a==='object'&&a&&a.id===id);
  if(has)YOU.avoid=(YOU.avoid||[]).filter(a=>!(typeof a==='object'&&a&&a.id===id));
  else {const ln={id:id,kind:'avoid',label:brand,reads:'Hide anything from '+brand+'.',brands:[brand.toLowerCase()],custom:true};YOU.avoid=(YOU.avoid||[]).concat([ln]);ceremony(ln);}
  saveYou();announce(has?('No longer avoiding '+brand):('Avoiding '+brand+', now hidden from your rankings everywhere'));
  return !has;
}
function avoidingBrand(p){const brand=((p&&p.brand)||(p&&p.name)||'').trim();if(!brand)return false;const id=brandAvoidId(brand);return (YOU.avoid||[]).some(a=>typeof a==='object'&&a&&a.id===id);}

// ── THE WEAVE at the point of decision — "who really owns this, and boycott the whole family."
//    Resolves a product to its parent company from the generated ownership graph (companies.json +
//    the registry avoid brands), reusing the accent-folding word matcher — one truth for matching and
//    for the avoid it arms. Shows ONLY when a real parent is known (14% of the shelf); never claims
//    "independent" for the 86% we simply haven't mapped. Public-ready: structure + our own words. ──
let _coMatchers=null;
function companyMatchers(){
  if(_coMatchers)return _coMatchers;
  const cos=((NODES&&NODES.nodes)||[]).filter(n=>n.type==='company');
  _coMatchers=cos.map(co=>{
    const slug=nodeSlug(co.id), L=lineById('avoid:'+slug), toks=new Set((co.brandNames||[]).map(s=>String(s).toLowerCase()));
    if(L)for(const b of (L.brands||[]))toks.add(b);
    return {co:co,slug:slug,line:L,toks:[...toks]};
  });
  return _coMatchers;
}
function ownerCompanyOf(p){
  const hay=((p&&p.brand)||'')+' '+((p&&p.name)||'');
  for(const c of companyMatchers()){ if(c.toks.some(t=>_wordHit(hay,t))) return c; }
  return null;
}
// the avoid line a company card arms: the registry line if one exists, else a custom family-avoid
function companyAvoidLine(c){
  return c.line || {id:'avoid:custom:'+c.slug,kind:'avoid',label:c.co.label,reads:'Hide '+c.co.label+' and the brands it owns.',brands:(c.co.brandNames||[]).map(b=>String(b).toLowerCase()),custom:true};
}
function armCompanyAvoid(c){
  const line=companyAvoidLine(c);
  if(isAvoiding(line))YOU.avoid=(YOU.avoid||[]).filter(a=>(typeof a==='string'?a:(a&&a.id))!==line.id);
  else {YOU.avoid=(YOU.avoid||[]).concat([c.line?line.id:line]);ceremony(line);}
  saveYou();
}
function ownershipEl(p,ds){
  const wrap=el('div',{class:'card owncard',style:'margin-top:1rem'});
  wrap.innerHTML='<div class="alts-h" style="margin:0">Who owns it</div><p class="alts-sub" style="margin:.15rem 0 0">Checking the ownership map…</p>';
  loadNodes().then(()=>{
    const c=ownerCompanyOf(p); if(!c){wrap.remove();return;}   // no known parent → no card, no guess
    const co=c.co, names=(co.brandNames||[]);
    const sibs=names.filter(b=>_fold(b)!==_fold(p.brand||'')&&_fold(b)!==_fold(p.name||'')).slice(0,6);
    const more=Math.max(0,names.length-sibs.length-(names.length>sibs.length?1:0));
    const line=companyAvoidLine(c), on=isAvoiding(line);
    wrap.innerHTML=`<div class="alts-h" style="margin:0">Who owns it</div>
      <p class="ownline">This is a <b>${esc(co.label)}</b> brand, buying it puts money there.</p>
      ${sibs.length?`<p class="alts-sub" style="margin:.15rem 0 .7rem">${esc(co.label)} also owns ${sibs.map(esc).join(', ')}${more>0?` and ${more} more`:''}. Your money votes for all of it.</p>`:'<p class="alts-sub" style="margin:.15rem 0 .7rem">One boycott can cover the whole family.</p>'}`;
    const b=el('button',{class:'catbtn'},on?('⊘ Avoiding '+co.label+', tap to stop'):('⊘ Avoid '+co.label+' and its brands'));
    b.onclick=()=>{armCompanyAvoid(c);announce(on?('No longer avoiding '+co.label):('Avoiding '+co.label+', its brands are now hidden from every ranking'));render();};
    wrap.appendChild(b);
    if(chDev()){const l=el('a',{class:'alts-sub',href:nodeHash(co),style:'display:block;margin-top:.55rem'});l.textContent='See everything '+co.label+' owns →';wrap.appendChild(l);}
  });
  return wrap;
}

// --- R1 increment 2 · the ERRAND SLIDER + honest default sorts. A category can declare its point
// (meta.primaryAxis: the criterion that IS what the category is about) and its one real tension
// (meta.tradeoff: two criterion keys, meta.tradeoffLabels: plain pole words). Until the data pass (CQ in
// codex.md) stamps those onto every lens, AXIS_SEED covers the flagships — data wins over seed the moment
// it lands, and every key is validated against the live criteria so a wrong entry no-ops instead of lying.
const AXIS_SEED={
  'learning-resources':{primary:'educational'},
  'news-sources':{primary:'independence'},
  'causes-to-support':{primary:'impact'},
  'vpn':{primary:'privacy'},
  'password-managers':{primary:'security'},
  'ai-assistants':{primary:'privacy'},
  'banking':{primary:'environment',tradeoff:['fees','environment'],labels:['lowest fees','greenest']},
  'coffee':{tradeoff:['economical','ethics'],labels:['cheapest','fairest']},
  'dark-chocolate':{tradeoff:['economical','ethics'],labels:['cheapest','fairest']},
  'digital-services':{primary:'privacy',tradeoff:['economical','privacy'],labels:['cheapest','most private']}
};
function catAxes(){
  if(!DATA||!DATA.meta)return {primary:null,tradeoff:null,labels:null};
  const m=DATA.meta, seed=AXIS_SEED[m.id]||{};
  const keys={};for(const cr of DATA.criteria)keys[cr.key]=cr.label;
  let primary=m.primaryAxis||seed.primary||null; if(primary&&!keys[primary])primary=null;
  let to=m.tradeoff||seed.tradeoff||null;
  if(!(Array.isArray(to)&&to.length===2&&keys[to[0]]&&keys[to[1]]))to=null;
  const labels=to?((m.tradeoffLabels||seed.labels)||[keys[to[0]].toLowerCase(),keys[to[1]].toLowerCase()]):null;
  return {primary:primary,tradeoff:to,labels:labels,keyLabel:keys};
}
// The errand position is remembered per category (an errand repeats; your setting should too). 50 = balanced.
const ERRAND_KEY='cc.errand.v1';
let errandPos=(function(){try{return JSON.parse(localStorage.getItem(ERRAND_KEY)||'{}')||{};}catch(e){return {};}})();
function saveErrandPos(){try{localStorage.setItem(ERRAND_KEY,JSON.stringify(errandPos));}catch(e){}}
// Coalesce rapid tuning ticks into one re-rank per animation frame: dragging a slider or the errand bar
// updates the value labels every tick, but re-scores the whole list at most once per frame. The live feel
// stays; the per-tick jank goes.
let _rerankRAF=0;
function scheduleRerank(){ if(_rerankRAF)return; _rerankRAF=requestAnimationFrame(()=>{_rerankRAF=0;render();updateProfile();}); }
function applyErrand(t){ // t 0..100 between the two poles; weights start from your themes, then the poles pull
  const ax=catAxes(); if(!ax.tradeoff)return;
  weights=themeDefaults(DATA.criteria);
  const a=ax.tradeoff[0], b=ax.tradeoff[1];
  weights[a]=Math.max(0,Math.min(5,Math.round(1+4*(1-t/100))));
  weights[b]=Math.max(0,Math.min(5,Math.round(1+4*(t/100))));
  for(const cr of DATA.criteria){const i=document.getElementById('w_'+cr.key);if(i){i.value=weights[cr.key]||0;sliderFill(i);const vv=document.getElementById('v_'+cr.key);if(vv)vv.textContent=weights[cr.key]||0;}}
  rerankPing=true;scheduleRerank();
}
// "Am I current?" — derived LIVE, never hand-bumped: the running engine version + the cache-bust hash stamped
// onto app.js. If the hash on screen differs from the latest build, the view is stale (old server / cached PWA).
const CC_BUILD=(function(){let v=(window.CC&&CC.engine)?('engine v'+CC.engine.VERSION):'';try{const s=document.querySelector('script[src*="app.js"]');const m=s&&s.src.match(/[?&]v=([0-9a-f]+)/);if(m)v+=(v?' · ':'')+'build #'+m[1];}catch(e){}return v||'dev build';})();

// Phase C / C6 — localization (English is the always-present fallback).
let locale=(function(){try{return localStorage.getItem('cc.locale')||'en';}catch(e){return 'en';}})();
function tr(k){const I=window.CC_I18N||{};const tb=I[locale]||{};return (tb[k]!=null)?tb[k]:((I.en&&I.en[k]!=null)?I.en[k]:k);}
function setLocale(l){locale=l;try{localStorage.setItem('cc.locale',l);}catch(e){}applyNavI18n();route();}

// --- Theme: manual light/dark/auto, persisted, overriding the OS. (A no-flash inline script in index.html
// sets data-theme before paint; this syncs the toggle button + the mobile browser-chrome color.) ---
const THEME_KEY='cc.theme';
let theme=(function(){try{return localStorage.getItem(THEME_KEY)||'system';}catch(e){return 'system';}})();
const THEME_ICON={system:'monitor',light:'sun',dark:'moon'}, THEME_LABEL={system:'follow system',light:'light',dark:'dark'};
function applyTheme(){
  const root=document.documentElement;
  if(theme==='system')root.removeAttribute('data-theme'); else root.setAttribute('data-theme',theme);
  const eff=theme==='system'?((window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light'):theme;
  const tc=document.querySelector('meta[name=theme-color]'); if(tc)tc.setAttribute('content',eff==='dark'?'#16170f':'#1d7a5a');
  const b=document.getElementById('themebtn'); if(b){b.innerHTML=CC.icon(THEME_ICON[theme]||'monitor');const lbl='Theme: '+(THEME_LABEL[theme]||theme);b.title=lbl+', click to change';b.setAttribute('aria-label',lbl);}
}
function cycleTheme(){
  // Two honest states. 'system' exists only as the untouched default — the first tap flips you to the
  // opposite of what you're looking at, and from then on it's light↔dark. (A third stored state that
  // looked identical to one of the others read as a broken button. It was.)
  const eff=theme==='system'?((window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light'):theme;
  theme=(eff==='dark')?'light':'dark';
  try{localStorage.setItem(THEME_KEY,theme);}catch(e){}applyTheme();announce('Theme: '+(THEME_LABEL[theme]||theme));}
function applyNavI18n(){
  const wm=document.querySelector('.wordmark');if(wm)wm.textContent=tr('wordmark');
  document.querySelectorAll('.navlinks a').forEach(a=>{const k='nav.'+a.dataset.nav,v=tr(k);if(v!==k)a.textContent=v;}); // keep the HTML label if a key is ever missing, never leak a raw i18n key
  const ls=document.getElementById('locale');if(ls)ls.value=locale;
}

// UX flagship — the "living ranking": cards glide to new positions when your values change (FLIP).
const ONBOARD_KEY='cc.onboarded.v1';
let onboarded=(function(){try{return !!localStorage.getItem(ONBOARD_KEY);}catch(e){return true;}})();

// --- Value themes (A5): a portable values profile. You set ~8 universal themes once; they DERIVE the
// per-category criterion weights, so your values travel across every category. Defaults to all-3 (= Balanced),
// so behaviour is identical until you set it. Presets/sliders still override in-session. ---
const THEMES_KEY='cc.themes.v1';
// THEMES + KEY2THEME (the value vocabulary) and the pure scoring fns now live in the engine library
// (engine.js) — one source of truth, and the reference implementation of Open Values Standard v0.
const {THEMES,KEY2THEME,scoreTier,band,bandFill,provOf}=CC.engine;
const themeWeights={};THEMES.forEach(t=>themeWeights[t.id]=3);
(function(){try{const j=JSON.parse(localStorage.getItem(THEMES_KEY)||'null');if(j)Object.assign(themeWeights,j);}catch(e){}})();
function themesSet(){try{return !!localStorage.getItem(THEMES_KEY);}catch(e){return false;}}
// The value-colour language: every value reads in its own soft hue (CC.valueHue / the sigil palette) — colour
// the *value*, never the *score*. hueDot() is a small inline dot; valHue() the raw hue for bars/segments.
function valHue(id){ return (window.CC&&CC.valueHue)?CC.valueHue(id):210; }
function hueDot(id){ return '<span class="vhue" aria-hidden="true" style="display:inline-block;width:.62em;height:.62em;border-radius:50%;background:hsl('+valHue(id)+',58%,55%);vertical-align:-.02em;margin-right:.4em"></span>'; }
function saveThemes(){try{localStorage.setItem(THEMES_KEY,JSON.stringify(themeWeights));}catch(e){}if(typeof updateNavValues==='function')updateNavValues();}
// --- The Open Values Passport (K0): portable rules first, optional leanings second. The shared engine still owns
// the universal value vocabulary; Round 7 adds the optional line-selection extension without breaking v0.1 readers. ---
const CC_THEME_UNIVERSAL={planet:'planet',people:'people',health:'wellbeing',honesty:'openness',privacy:'autonomy',animals:'animals',cost:'access',local:'community'};
function personalLineSelection(){
  const ids=[],custom=[];
  for(const tag of (YOU.allergens||[])){const line=lineRegistry().find(item=>item.kind==='allergy'&&item.tag===tag);if(line)ids.push(line.id);}
  for(const label of (YOU.diet||[])){const line=reqLineForLabel(label);if(line)ids.push(line.id);}
  for(const value of (YOU.avoid||[])){
    if(typeof value==='string'){if(lineById(value))ids.push(value);continue;}
    if(!value||typeof value!=='object')continue;
    const label=String(value.label||'').trim().slice(0,120), brands=(value.brands||[]).filter(x=>typeof x==='string'&&x.trim()).slice(0,64).map(x=>x.trim().slice(0,120));
    if(!label||!brands.length)continue;
    custom.push({id:String(value.id||brandAvoidId(label)).slice(0,160),kind:'avoid',label:label,reads:String(value.reads||('Hide anything from '+label+'.')).slice(0,240),brands:brands,custom:true});
  }
  const spec=(window.CC&&CC.LINE_SELECTION)||{};
  return {format:spec.format||'open-values-line-selection',version:spec.version||'0.1',registryVersion:(window.CC&&CC.LINE_VERSION)||'',ids:Array.from(new Set(ids)).sort(),custom:custom};
}
function applyPersonalLineSelection(selection){
  const spec=(window.CC&&CC.LINE_SELECTION)||{}, expected=spec.format||'open-values-line-selection', applied=[],dropped=[];
  if(!selection||selection.format!==expected)return {applied:applied,dropped:dropped};
  for(const id of Array.from(new Set((selection.ids||[]).filter(x=>typeof x==='string'))).slice(0,64)){
    const line=lineById(id);if(!line){dropped.push(id);continue;}
    if(line.kind==='allergy'&&line.tag){if(!YOU.allergens.includes(line.tag)){YOU.allergens.push(line.tag);applied.push(id);}}
    else if((line.kind==='diet'||line.kind==='require')&&line.label){if(!YOU.diet.includes(line.label)){YOU.diet.push(line.label);applied.push(id);}}
    else if(line.kind==='avoid'){if(!(YOU.avoid||[]).some(value=>(typeof value==='string'?value:(value&&value.id))===id)){YOU.avoid=(YOU.avoid||[]).concat([id]);applied.push(id);}}
  }
  for(const value of (Array.isArray(selection.custom)?selection.custom:[]).slice(0,32)){
    if(!value||value.kind!=='avoid')continue;
    const label=String(value.label||'').trim().slice(0,120), brands=(Array.isArray(value.brands)?value.brands:[]).filter(x=>typeof x==='string'&&x.trim()).slice(0,64).map(x=>x.trim().slice(0,120));
    if(!label||!brands.length)continue;
    const id=String(value.id||brandAvoidId(label)).slice(0,160);if((YOU.avoid||[]).some(item=>(typeof item==='string'?item:(item&&item.id))===id))continue;
    YOU.avoid=(YOU.avoid||[]).concat([{id:id,kind:'avoid',label:label,reads:String(value.reads||('Hide anything from '+label+'.')).slice(0,240),brands:brands,custom:true}]);applied.push(id);
  }
  if(applied.length)saveYou();
  return {applied:applied,dropped:dropped};
}
function valuesPassport(){const w={};for(const t of THEMES)w[t.id]=themeWeights[t.id]||3;const p=CC.engine.passportFrom(w,CC_THEME_UNIVERSAL,'conscious-consuming');p.exported=new Date().toISOString();p.lines=personalLineSelection();return p;} // unknown extension fields remain safe for v0.1 readers
function exportValuesPassport(){const p=valuesPassport(),n=(p.lines.ids||[]).length+(p.lines.custom||[]).length,b=new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),a=el('a',{href:URL.createObjectURL(b),download:'my-values-passport.json'});a.click();announce(`Your file was downloaded with ${n} rule${n===1?'':'s'} and any Advanced close-call priorities.`);}
// Receive a passport from ANY instance — or a whole assembly's collective passport (K4). universal → CC themes (inverse of CC_THEME_UNIVERSAL).
const UNIVERSAL2CC={planet:'planet',people:'people',wellbeing:'health',openness:'honesty',autonomy:'privacy',animals:'animals',access:'cost',community:'local'};
function applyValuesPassport(p){
  if(!p||(!p.values&&!p.lines))return null;
  const base={};for(const t of THEMES)base[t.id]=(themeWeights[t.id]!=null?themeWeights[t.id]:3);
  const res=p.values?CC.engine.passportApply(p,UNIVERSAL2CC,base):{weights:base,applied:[],carried:[],dropped:[]}; // raise-toward: augments, never erases
  Object.assign(themeWeights,res.weights);if(p.values)saveThemes();
  res.lines=applyPersonalLineSelection(p.lines);
  return res;
}
function importValuesPassport(file){const r=new FileReader();
  r.onload=()=>{let res=null,badJSON=false;try{const j=JSON.parse(r.result);if(j&&(j.values||j.lines))res=applyValuesPassport(j);}catch(e){badJSON=true;}
    const m=document.getElementById('you-msg');
    if(res){if(m){const ln=res.lines&&res.lines.applied?res.lines.applied.length:0,car=(res.applied&&res.applied.length)?` ${res.applied.join(', ')} will break close ties.`:'',drop=(res.lines&&res.lines.dropped&&res.lines.dropped.length)?` ${res.lines.dropped.length} unknown rule id${res.lines.dropped.length===1?' was':'s were'} reported but not applied.`:'';m.textContent=`Your file was uploaded. ${ln} new rule${ln===1?'':'s'} added.${car}${drop} Reloading…`;}setTimeout(()=>location.reload(),800);}
    else if(m)m.textContent=badJSON?'That file isn’t readable as JSON, is it the right file?':'That file is valid JSON, but not a compatible values file.';};
  r.readAsText(file);}
// Download a shareable Values Passport CARD (your sigil + what you value) — composed as SVG, rendered to PNG on a
// canvas, all in the browser. Self-contained SVG (system fonts, no external refs) → the canvas stays clean.
function downloadValuesCard(){
  if(!(window.CC&&CC.passportCard&&CC.downloadCardPNG))return;
  CC.downloadCardPNG(CC.passportCard(valuesPassport().values,{size:1080}),'my-values-card.png',ok=>announce(ok?'Your values card was downloaded.':'Could not render the card.'));}
function themeDefaults(criteria){return CC.engine.themeDefaults(criteria,themeWeights);}
function renderThemes(){
  const box=document.getElementById('themes');if(!box)return;
  const fresh=!themesSet();
  let chips='';
  for(const t of THEMES){const on=(themeWeights[t.id]||3)>=4;
    chips+=`<button type="button" class="themechip${on?' on':''}" data-theme="${t.id}" title="${esc(t.blurb)}" aria-pressed="${on}"><span class="ti">${hueDot(t.id)}</span>${esc(t.label)}</button>`;}
  box.innerHTML=`<div class="themehd">Your values${fresh?`, <b>tap what matters most</b>; it shapes every category`:` · shapes every category`}</div><div class="themechips">${chips}</div>`;
  box.querySelectorAll('.themechip').forEach(b=>b.onclick=()=>{const id=b.dataset.theme;themeWeights[id]=(themeWeights[id]||3)>=4?3:5;saveThemes();applyThemes();});
}
function applyThemes(){
  rerankPing=true;
  if(DATA){weights=themeDefaults(DATA.criteria);
    for(const cr of DATA.criteria){const i=document.getElementById('w_'+cr.key);if(i){i.value=weights[cr.key]||0;sliderFill(i);const v=document.getElementById('v_'+cr.key);if(v)v.textContent=weights[cr.key]||0;}}}
  renderThemes();render();updateProfile();
}
// --- The 30-second values elicitation (Fault 2: the threshold). Concrete real-world trade-offs let a newcomer
// DISCOVER their own values, then seed the portable theme weights. Honest: nothing persists until "use these". ---
const VALUES_QUIZ=[
  {scene:"You need a new T-shirt.",a:{t:"$4, fast fashion",th:['cost']},b:{t:"$30, fair wages, lasts for years",th:['people','planet']}},
  {scene:"Eggs for the week.",a:{t:"Cheapest, from caged hens",th:['cost']},b:{t:"A bit more, pasture-raised",th:['animals','health']}},
  {scene:"Time for a new phone.",a:{t:"The latest sealed flagship",th:['cost']},b:{t:"Repairable, built to last",th:['planet','honesty']}},
  {scene:"A handy new app.",a:{t:"Free, it sells your data",th:['cost']},b:{t:"A few dollars, no tracking",th:['privacy','honesty']}},
  {scene:"Your morning coffee.",a:{t:"Cheapest on the shelf",th:['cost']},b:{t:"Fair-trade from a local roaster",th:['people','local']}},
  {scene:"Friday-night snack.",a:{t:"Cheap and ultra-processed",th:['cost']},b:{t:"A simple, whole-food one",th:['health','planet']}}
];
let quizPhase='intro', quizI=0, quizPts={};
const themeById=id=>THEMES.find(t=>t.id===id);
function startValues(){quizPhase='intro';quizI=0;quizPts={};renderValues();}
function pickValue(c){const q=VALUES_QUIZ[quizI];for(const th of q[c].th)quizPts[th]=(quizPts[th]||0)+1;quizI++;if(quizI>=VALUES_QUIZ.length)quizPhase='result';renderValues();}
function topValueThemes(){return Object.keys(quizPts).sort((a,b)=>quizPts[b]-quizPts[a]).slice(0,3);}
function useValues(){for(const t of THEMES){const p=quizPts[t.id]||0;themeWeights[t.id]=Math.min(5,3+Math.min(2,p));}saveThemes();try{localStorage.setItem(ONBOARD_KEY,'1');}catch(e){}onboarded=true;announce('Your values are set');location.hash='#map';} // graded seeding: more picks → higher weight (3→5)
function renderValues(){
  const v=document.getElementById('view-values');if(!v)return;
  if(quizPhase==='studio'){
    const tw=id=>{const x=themeWeights[id];return (x==null)?3:x;};
    const rows=THEMES.map(t=>`<div class="vrow"><span class="vlabel">${hueDot(t.id)}${esc(t.label)}<span class="vblurb">${esc(t.blurb)}</span></span><input class="vslider" type="range" min="0" max="5" step="1" value="${tw(t.id)}" data-theme="${t.id}" aria-label="${esc(t.label)} weight"><span class="vval" id="vv-${t.id}">${tw(t.id)}</span></div>`).join('');
    v.innerHTML=`<div class="quiz studio">
      <div class="quiz-eyebrow">Your values</div>
      <h2 class="quiz-h">Tune what matters to you</h2>
      <p class="quiz-sub">Slide each value from <b>0</b> (ignore) to <b>5</b> (front of mind). Every verdict in every category runs on this mix. <a href="#values/quiz">Not sure where to start? Take the 30-second quiz →</a></p>
      <div class="vbar" id="vbar"></div>
      <p class="vmix" id="vmix"></p>
      <div class="vstudio">${rows}</div>
      <div class="quiz-actions"><a class="catbtn" href="#map">See the map for these values →</a><button class="quiz-skip" id="v-reset">Reset to balanced</button></div></div>`;
    const refresh=()=>{
      const bar=document.getElementById('vbar');
      if(bar)bar.innerHTML=THEMES.filter(t=>tw(t.id)>0).map(t=>`<span class="vseg" style="flex:${tw(t.id)};background:hsl(${valHue(t.id)},55%,62%)" title="${esc(t.label)}, ${tw(t.id)}/5"></span>`).join('')||'<span class="vseg empty">all values off, nothing to rank by</span>';
      const m=document.getElementById('vmix');
      if(m){const pri=THEMES.filter(t=>tw(t.id)>=4).map(t=>hueDot(t.id)+esc(t.label));m.innerHTML=pri.length?`Emphasising <b>${pri.join(' · ')}</b> above the rest.`:`Balanced, nothing weighed above the rest yet.`;}
    };
    v.querySelectorAll('.vslider').forEach(s=>s.addEventListener('input',e=>{themeWeights[e.target.dataset.theme]=+e.target.value;document.getElementById('vv-'+e.target.dataset.theme).textContent=e.target.value;saveThemes();refresh();}));
    const rb=document.getElementById('v-reset');if(rb)rb.onclick=()=>{THEMES.forEach(t=>themeWeights[t.id]=3);saveThemes();renderValues();};
    refresh();
    return;
  }
  if(quizPhase==='intro'){
    v.innerHTML=`<div class="quiz"><div class="quiz-eyebrow">Find your values · 30 seconds</div>
      <h2 class="quiz-h">What do you actually care about?</h2>
      <p class="quiz-sub">Six quick, real-life trade-offs. There are no right answers, only yours. Nothing is saved until you choose to keep it, and you can change your mind any time after.</p>
      <figure class="imgslot art" data-slot="2" aria-hidden="true"><svg viewBox="0 0 540 150" width="420" height="117" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <g style="stroke:var(--hint)"><path d="M100 52h22l14 46h64l12-38H128"/><circle cx="146" cy="112" r="7"/><circle cx="190" cy="112" r="7"/><path d="M330 52h22l14 46h64l12-38H358"/><circle cx="376" cy="112" r="7"/><circle cx="420" cy="112" r="7"/></g>
        <g style="stroke:var(--accent)"><path d="M158 76c0-12 12-18 22-18-2 12-10 17-22 18z"/><path d="M394 70v20M384 80h20"/><path d="M262 96c4-14 12-22 16-24" stroke-dasharray="1 8"/></g>
      </svg></figure>
      <div class="quiz-actions"><button class="catbtn" id="quiz-begin">Begin →</button><a class="quiz-skip" href="#map">Skip, I'll set them myself</a></div></div>`;
    const b=document.getElementById('quiz-begin');if(b)b.onclick=()=>{quizPhase='quiz';quizI=0;quizPts={};renderValues();};
    return;
  }
  if(quizPhase==='quiz'){
    const q=VALUES_QUIZ[quizI];
    const dots=VALUES_QUIZ.map((_,i)=>`<span class="qdot${i<quizI?' done':''}${i===quizI?' now':''}"></span>`).join('');
    v.innerHTML=`<div class="quiz"><div class="qprog">${dots}<span class="qcount">${quizI+1} / ${VALUES_QUIZ.length}</span></div>
      <div class="quiz-scene">${esc(q.scene)}</div>
      <div class="qchoices"><button class="qchoice" data-c="a">${esc(q.a.t)}</button><button class="qchoice" data-c="b">${esc(q.b.t)}</button></div>
      <p class="quiz-foot">Pick the one closer to you. Trade-offs are the point, you can't have everything at once.</p></div>`;
    v.querySelectorAll('.qchoice').forEach(btn=>btn.onclick=()=>pickValue(btn.dataset.c));
    return;
  }
  const chips=topValueThemes().map(id=>{const t=themeById(id);return t?`<span class="qresult-chip">${hueDot(t.id)}${esc(t.label)}</span>`:'';}).join('');
  v.innerHTML=`<div class="quiz"><div class="quiz-eyebrow">Your values</div>
    <h2 class="quiz-h">Here's what matters most to you</h2>
    <div class="qresult">${chips||'<span class="qresult-chip">Balanced</span>'}</div>
    <p class="quiz-sub">These will weigh more in every category from now on. Treat it as a first sketch, not a diagnosis, you can adjust any of it on your <a href="#you">You</a> page.</p>
    <div class="quiz-actions"><button class="catbtn" id="quiz-use">Use these values →</button><button class="quiz-skip" id="quiz-redo">Start over</button></div></div>`;
  const u=document.getElementById('quiz-use');if(u)u.onclick=useValues;
  const r=document.getElementById('quiz-redo');if(r)r.onclick=startValues;
}
function prefersReduced(){return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
function flipPlay(container,first){
  if(prefersReduced()||!container.offsetParent)return;
  for(const elc of container.children){
    const c=elc.dataset&&elc.dataset.code; if(!c)continue;
    const f=first[c]; if(!f)continue;
    const l=elc.getBoundingClientRect(); const dx=f.left-l.left, dy=f.top-l.top;
    if(!dx&&!dy)continue;
    elc.style.transform=`translate(${dx}px,${dy}px)`; elc.style.transition='none';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      elc.style.transition='transform .42s cubic-bezier(.2,.7,.2,1)'; elc.style.transform='';
      elc.addEventListener('transitionend',()=>{elc.style.transition='';},{once:true});
    }));
  }
}

function el(t,a={},h){const e=document.createElement(t);for(const k in a)e.setAttribute(k,a[k]);if(h!=null)e.innerHTML=h;return e;}
function esc(s){return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function makeClickable(node,fn,label){
  node.setAttribute('role','button');node.setAttribute('tabindex','0');
  if(label)node.setAttribute('aria-label',label);
  node.addEventListener('click',fn);
  node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});
  return node;
}
// presets are per-lens (live in each dataset's meta); fall back to a generated Balanced
function curPresets(){return (DATA&&DATA.meta&&DATA.meta.presets)||{Balanced:{w:Object.fromEntries((DATA?DATA.criteria:[]).map(c=>[c.key,3])),x:[]}};}
// A preset carries a hidden value hierarchy (its per-factor weights). Legibility rule: never set weights a
// person can't see. presetSummary spells out, in plain words, exactly what a preset does before it does it.
function presetSummary(pr){
  if(!pr||!pr.w)return '';
  const crit=(DATA&&DATA.criteria)||[];
  const lab=k=>{const c=crit.find(x=>x.key===k);return c?c.label:k;};
  const es=Object.entries(pr.w).filter(e=>crit.some(c=>c.key===e[0]));
  if(!es.length)return '';
  const vals=es.map(e=>e[1]), max=Math.max(...vals), min=Math.min(...vals);
  const exc=(pr.x||[]).map(k=>ALLERGEN_LABELS[k]||k);
  if(max===min){let s=`Weights every factor equally (${max}/5).`;if(exc.length)s+=` Excludes ${exc.join(', ')}.`;return s;}
  const hi=es.filter(e=>e[1]===max).map(e=>lab(e[0]));
  const zero=es.filter(e=>e[1]===0).map(e=>lab(e[0]));
  let s=`Sets ${hi.join(', ')} to ${max}/5, the rest lower.`;
  if(zero.length)s+=` Ignores ${zero.join(', ')}.`;
  if(exc.length)s+=` Excludes ${exc.join(', ')}.`;
  return s;
}

// --- profile (M3) ---
function saveProfile(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({weights,excludes:[...excludes],sortBy,regionFilter,category:DATA&&DATA.meta.id}));}catch(e){}}
function loadProfile(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch(e){return null;}}
function profileName(){
  const P=curPresets();
  for(const name in P){const pr=P[name];let ok=true;
    for(const cr of DATA.criteria){if((weights[cr.key]||0)!==(pr.w[cr.key]||0)){ok=false;break;}}
    if(ok){const xs=new Set(pr.x||[]);if(xs.size!==excludes.size||[...excludes].some(a=>!xs.has(a)))ok=false;}
    if(ok)return name;}
  return null;
}
function standingSummary(){ // the active standing filters, in plain words
  const bits=[];
  if(excludes.size)bits.push('excluding '+[...excludes].map(a=>ALLERGEN_LABELS[a]||a).join(', '));
  if(activeDietLast.length)bits.push('only '+activeDietLast.join(' · '));
  if(activeAvoidLast.length)bits.push('avoiding '+activeAvoidLast.map(a=>a.label).join(', '));
  if(regionFilter!=='everywhere')bits.push(regionFilterText(regionFilter));
  return bits;
}
// The "your lines, applied" strip — the rent test paid in public: every line you hold is shown working, here,
// with an honest count of what it hid. Empty when you hold no lines that touch this category.
function updateFilterNote(){
  const fn=document.getElementById('filternote');if(!fn)return;
  const parts=[];
  if(excludes.size)parts.push('declared free of '+[...excludes].map(a=>esc(ALLERGEN_LABELS[a]||a)).join(', ')+(allergenFoldedLast.length?` <span class="fn-n">${allergenFoldedLast.length} need a label check</span>`:''));
  for(const r of activeDietLast)parts.push(esc(r)+(dietCountLast[r]?` <span class="fn-n">${dietCountLast[r]} hidden</span>`:''));
  for(const a of activeAvoidLast)parts.push(`avoiding ${esc(a.label)}${a.n?` <span class="fn-n">${a.n} hidden</span>`:''}`);
  if(regionFilter!=='everywhere')parts.push(esc(regionFilterText(regionFilter)));
  if(!parts.length){fn.innerHTML='';return;}
  let t=`<span class="fn-lead">My rules, applied:</span> ${parts.join(' · ')}.`;
  if(regionFilter!=='everywhere'&&!currentRegionStrictSafe())t+=' Broad coverage here is not country-only; some market-specific entries stay global until the app has country-level regions.';
  if(excludes.size)t+=' Declarations and missing evidence are folded below; only an explicit free claim clears an allergy.';
  t+=' <a href="#you">Edit my rules →</a>';
  fn.innerHTML=t;
}
function updateProfile(){
  const n=profileName(), s=document.getElementById('profstatus');
  if(s)s.textContent=(n?`Your values · ${n}`:'Your custom values')+' · saved on this device · ';
  updateFilterNote();saveProfile();
}

// --- saved (M4) ---
function loadSaved(){try{const a=JSON.parse(localStorage.getItem(SAVED_KEY)||'[]');savedSet=new Set(a.map(e=>e.code));return a;}catch(e){savedSet=new Set();return [];}}
let savedList=loadSaved();
function persistSaved(){try{localStorage.setItem(SAVED_KEY,JSON.stringify(savedList));}catch(e){}}
function isSaved(code){return savedSet.has(code);}
function toggleSave(p){
  if(savedSet.has(p.code)){savedList=savedList.filter(e=>e.code!==p.code);savedSet.delete(p.code);}
  else{savedList.unshift({code:p.code,category:DATA&&DATA.meta.label,categoryId:DATA&&DATA.meta.id,product:p});savedSet.add(p.code);}
  persistSaved();updateSavedBtn();render();
}
function updateSavedBtn(){const b=document.getElementById('savedbtn');if(b)b.innerHTML=CC.icon('heart',{cls:'is-filled'})+` Saved (${savedList.length})`;}
function saveToggleEl(p,label){
  const on=isSaved(p.code);
  const b=el('button',{class:'savebtn'+(on?' on':''),'aria-label':on?'Remove from saved':'Save to my list'},
    on?(label?CC.icon('heart',{cls:'is-filled'})+' Saved':CC.icon('heart',{cls:'is-filled'})):(label?CC.icon('heart')+' Save':CC.icon('heart')));
  b.onclick=(ev)=>{ev.stopPropagation();toggleSave(p);};
  return b;
}
// The region is one standing fact about you, set once, applied everywhere — so it lives in the
// chrome, not buried in a per-category dropdown (the dropdown stays, synced, for in-context tweaks).
const REGION_NAMES={everywhere:'Everywhere',US:'United States',UK:'United Kingdom',EU:'European Union'};
// The tags the data can carry today. Naming what is missing is part of the answer: a reader
// looking for Canada should learn that here rather than infer it from an empty result.
const REGION_NOT_YET='Entries are tagged US, UK, EU or global today. Anywhere else, including Canada, Australia and India, is served only by the global entries until somebody sources a market.';
function updateNavRegion(){
  const b=document.getElementById('navregion');if(!b)return;
  b.innerHTML=CC.icon('globe')+' '+esc(regionLabel(YOU.region))+'<span class="navregion-caret" aria-hidden="true">&#9662;</span>';
  b.title=REGION_SCOPE+' Choose a region or language.';
  b.setAttribute('aria-haspopup','true');
  b.setAttribute('aria-expanded',document.getElementById('regionmenu')?'true':'false');
}
/* Coverage counted from the live index rather than written down, so the menu cannot claim a
   number the data stopped supporting. Each category carries a regionProfile with per-tag entry
   counts; this sums them and also counts how many decisions carry the tag at all, because
   "1,390 entries" and "in 53 decisions" answer different questions a reader actually has. */
function regionCoverage(){
  const entries={},decisions={},total={n:0,d:(CATALOG||[]).length};
  for(const cat of (CATALOG||[])){
    const values=((cat.regionProfile||{}).values)||{};
    for(const tag of Object.keys(values)){
      entries[tag]=(entries[tag]||0)+values[tag];
      decisions[tag]=(decisions[tag]||0)+1;
    }
    total.n+=((cat.regionProfile||{}).entryCount)||0;
  }
  return {entries:entries,decisions:decisions,total:total};
}
function regionCoverageLine(r,cov){
  if(r==='everywhere')return cov.total.n.toLocaleString()+' entries across '+cov.total.d+' decisions';
  const n=cov.entries[r]||0,d=cov.decisions[r]||0;
  if(!n)return 'nothing tagged for this market yet';
  return n.toLocaleString()+' entries in '+d+' decision'+(d===1?'':'s')+', plus every global entry';
}
function localeCoverage(code){
  const meta=(window.CC_LOCALE_META||{})[code]||{};
  const table=(window.CC_I18N||{})[code]||{},en=(window.CC_I18N||{}).en||{};
  const keys=Object.keys(en),have=keys.filter(k=>table[k]!=null).length;
  return {label:meta.label||code,endonym:meta.endonym||code,covers:meta.covers||'',
          have:have,total:keys.length,complete:meta.complete===true};
}
function regionMenuHTML(){
  const cov=regionCoverage();
  let html='<div class="rm-sec" role="group" aria-label="Region"><div class="rm-h">Region</div>';
  for(const r of REGIONS){
    const on=YOU.region===r;
    html+='<button type="button" role="menuitemradio" aria-checked="'+(on?'true':'false')+'" class="rm-opt'+(on?' on':'')+'" data-region="'+esc(r)+'">'
      +'<span class="rm-mark" aria-hidden="true">'+(on?CC.icon('check'):'')+'</span>'
      +'<span class="rm-body"><b>'+esc(REGION_NAMES[r]||r)+'</b><small>'+esc(regionCoverageLine(r,cov))+'</small></span></button>';
  }
  html+='<p class="rm-note">'+esc(REGION_NOT_YET)+'</p></div>';
  html+='<div class="rm-sec" role="group" aria-label="Language"><div class="rm-h">Language</div>';
  for(const code of Object.keys(window.CC_LOCALE_META||{en:1})){
    const L=localeCoverage(code),on=locale===code;
    html+='<button type="button" role="menuitemradio" aria-checked="'+(on?'true':'false')+'" class="rm-opt'+(on?' on':'')+'" data-locale="'+esc(code)+'">'
      +'<span class="rm-mark" aria-hidden="true">'+(on?CC.icon('check'):'')+'</span>'
      +'<span class="rm-body"><b>'+esc(L.endonym)+(L.endonym===L.label?'':' <i>'+esc(L.label)+'</i>')+'</b>'
      +'<small>'+esc(L.covers)+'</small></span></button>';
  }
  html+='<p class="rm-note">Only English is written all the way through. A language here changes the interface and nothing else unless it says so. <a href="#contribute">Help translate</a></p></div>';
  return html;
}
function closeRegionMenu(refocus){
  const m=document.getElementById('regionmenu');if(m)m.remove();
  document.removeEventListener('keydown',regionMenuKey,true);
  document.removeEventListener('pointerdown',regionMenuAway,true);
  const b=document.getElementById('navregion');
  if(b){b.setAttribute('aria-expanded','false');if(refocus)b.focus();}
}
function regionMenuKey(e){
  if(e.key==='Escape'){e.stopPropagation();closeRegionMenu(true);return;}
  const m=document.getElementById('regionmenu');if(!m)return;
  if(e.key!=='ArrowDown'&&e.key!=='ArrowUp'&&e.key!=='Tab')return;
  const opts=[...m.querySelectorAll('.rm-opt')];if(!opts.length)return;
  const at=opts.indexOf(document.activeElement);
  if(e.key==='Tab'&&at===-1)return;
  e.preventDefault();
  const step=(e.key==='ArrowUp'||(e.key==='Tab'&&e.shiftKey))?-1:1;
  opts[(at+step+opts.length)%opts.length].focus();
}
function regionMenuAway(e){
  const m=document.getElementById('regionmenu'),b=document.getElementById('navregion');
  if(m&&!m.contains(e.target)&&b&&!b.contains(e.target))closeRegionMenu(false);
}
function chooseRegion(r){
  if(YOU.region!==r){
    YOU.region=r;regionFilter=r;saveYou();
    const rg=document.getElementById('region');if(rg)rg.value=regionFilter;
    announce('Region: '+regionFilterText(r));
  }
  closeRegionMenu(true);updateNavRegion();regionRerender();
}
function chooseLocale(code){
  closeRegionMenu(true);
  if(code===locale){updateNavRegion();return;}
  announce('Language: '+localeCoverage(code).endonym);
  setLocale(code);          // persists, re-labels the chrome and re-routes
  updateNavRegion();
}
function toggleRegionMenu(){
  if(document.getElementById('regionmenu')){closeRegionMenu(true);return;}
  const b=document.getElementById('navregion');if(!b)return;
  const m=el('div',{id:'regionmenu',class:'regionmenu',role:'menu','aria-label':'Region and language'});
  m.innerHTML=regionMenuHTML();
  b.parentNode.insertBefore(m,b.nextSibling);
  m.addEventListener('click',e=>{
    const opt=e.target.closest('.rm-opt');if(!opt)return;
    if(opt.dataset.region)chooseRegion(opt.dataset.region);
    else if(opt.dataset.locale)chooseLocale(opt.dataset.locale);
  });
  document.addEventListener('keydown',regionMenuKey,true);
  document.addEventListener('pointerdown',regionMenuAway,true);
  b.setAttribute('aria-expanded','true');
  const first=m.querySelector('.rm-opt.on')||m.querySelector('.rm-opt');
  if(first)first.focus();
}
/* Region filters the evidence itself, so every view that reads it has to be re-worked. The old guard
   re-rendered only when nothing else was on screen, so changing region on a decision page, an item,
   the map, search or discover quietly did nothing and left the previous region's answer sitting
   there. The explore stack (list, item, saved, notes) re-works in place through render(), which is
   also what keeps a query typed into the search box — that lives in the DOM, not in the route, and
   re-dispatching would wipe it. Every other view is rebuilt from its own route. */
function regionRerender(){
  if(scanState)return; // never tear down a live scanner under someone's hands
  const explore=document.getElementById('view-explore');
  if(DATA&&explore&&explore.style.display!=='none'){render();return;}
  route();
}
function setActiveCat(id){
  document.querySelectorAll('#cats .tr-row').forEach(b=>b.classList.toggle('on',b.dataset.cid===id));
  const active=document.querySelector('#cats .tr-row.on'), d=active&&active.closest('details.tree');
  if(d&&!d.open)d.open=true;
}

// --- testing notes (M5) ---
function loadFeedback(){try{return JSON.parse(localStorage.getItem(FEEDBACK_KEY)||'[]');}catch(e){return [];}}
let feedbackList=loadFeedback();
function persistFeedback(){try{localStorage.setItem(FEEDBACK_KEY,JSON.stringify(feedbackList));}catch(e){}}
function updateNotesBtn(){const b=document.getElementById('notesbtn');if(b)b.innerHTML=CC.icon('edit')+` Notes (${feedbackList.length})`;}
function addFeedback(reaction,note){
  feedbackList.unshift({time:new Date().toISOString(),reaction,note,
    context:{category:DATA&&DATA.meta.label,product:feedbackContext,values:profileName()||'custom'}});
  persistFeedback();updateNotesBtn();
}
function exportFeedback(){const b=new Blob([JSON.stringify(feedbackList,null,2)],{type:'application/json'});const a=el('a',{href:URL.createObjectURL(b),download:'conscious-consuming-notes.json'});a.click();}
// Turn private notes into a readable report.
function _mdLine(s){return (s||'').replace(/\r?\n/g,' ').trim();}
function buildSelfTestReport(){
  const fb=feedbackList, cb=(typeof contribList!=='undefined'?contribList:[]);
  const order=['helped','mixed',"didn't help",'confusing','idea'];
  const counts={}; fb.forEach(f=>{const r=f.reaction||'(untagged)';counts[r]=(counts[r]||0)+1;});
  const when=new Date().toISOString().slice(0,10);
  let md=`# Conscious Consuming, self-test report\n\n_Generated on this device, ${when}. ${fb.length} field note${fb.length!==1?'s':''}, ${cb.length} suggestion${cb.length!==1?'s':''}. Private, nothing was sent._\n\n## At a glance\n\n`;
  if(!fb.length) md+='_No notes yet, use the tool for a few real decisions, then jot what you noticed._\n\n';
  order.concat(Object.keys(counts).filter(k=>order.indexOf(k)<0)).forEach(r=>{if(counts[r])md+=`- **${r}**, ${counts[r]}\n`;});
  md+='\n';
  function sec(title,items){ if(!items.length)return''; let s=`## ${title}\n\n`;
    for(const f of items){const c=[f.context&&f.context.category,f.context&&f.context.product,(f.context&&f.context.values)?('values: '+f.context.values):''].filter(Boolean).join(' · ');
      s+=`- ${f.note?_mdLine(f.note):'(no note)'}${c?`  \n  _${_mdLine(c)}_`:''}\n`;}
    return s+'\n'; }
  md+=sec('What helped, keep this', fb.filter(f=>f.reaction==='helped'));
  md+=sec('Friction & confusion, fix this', fb.filter(f=>f.reaction==="didn't help"||f.reaction==='confusing'||f.reaction==='mixed'));
  md+=sec('Ideas & gaps, maybe build', fb.filter(f=>f.reaction==='idea'));
  md+=sec('Other notes', fb.filter(f=>order.indexOf(f.reaction)<0));
  if(cb.length){md+='## Suggestions you logged\n\n';for(const c of cb)md+=`- **${_mdLine(c.kind)}**, ${_mdLine(c.text)}\n`;md+='\n';}
  md+='---\n\n_Your notes. Sort each one: keep · fix · build · later._\n';
  return md;
}
function exportSelfTestReport(){const when=new Date().toISOString().slice(0,10);const b=new Blob([buildSelfTestReport()],{type:'text/markdown'});const a=el('a',{href:URL.createObjectURL(b),download:`conscious-consuming-self-test-${when}.md`});a.click();}

// --- scoring & lists (generic over DATA.criteria) ---
// the pure ranking lives in the engine library (engine.js); app.js binds it to its live state
function score(p){return CC.engine.score(p,{criteria:DATA.criteria,weights,excludes});}
function weakestAxis(p){return CC.engine.weakestAxis(p,{criteria:DATA.criteria,weights});}
function currentListQuery(){const q=document.getElementById('q');return q?(q.value||'').trim():'';}
function productMatchesQuery(p,q){
  q=String(q||'').toLowerCase().trim();
  if(!q)return true;
  return [p.name,p.brand,(p.focuses||[]).join(' '),(p.labels||[]).join(' ')].join(' ').toLowerCase().includes(q);
}
function routeHref(view,cid,facet){return '#'+view+'/'+encodeURIComponent(cid)+(facet?'/'+encodeURIComponent(facet):'');}
function currentRouteView(){return (location.hash.slice(1)||'home').split('/')[0];}
function exploreHref(cid,facet){return routeHref(currentRouteView()==='rank'?'rank':'explore',cid,facet);}
function decideHref(cid,facet){return routeHref('decide',cid,facet);}
function rankingHref(cid,facet){return routeHref('rank',cid,facet);}
function decisionPrimaryCategory(cid){const category=(CATALOG||[]).find(item=>item.id===cid), decision=category&&category.decision;return !!(decision&&decision.page&&decision.page.primaryRoute);}
function rankedList(filterQuery){
  const q=filterQuery==null?currentListQuery():String(filterQuery||'').trim();
  let arr=[]; dietHidden=0; avoidHiddenLast=0; allergenFoldedLast=[];
  // RULES FILTER FIRST (R1). A diet/require line only "bites" in a category that carries its data — so a
  // "Vegetarian" line never empties Banking; it simply doesn't apply there. Each requirement is satisfied when a
  // product's focuses intersect that line's acceptable labels (so Vegan also satisfies Vegetarian).
  const reqLines=[];
  for(const d of YOU.diet){const acc=acceptFor(d);
    if(DATA.products.some(p=>(p.focuses||p.labels||[]).some(f=>acc.indexOf(f)>=0)))reqLines.push({label:d,accept:acc});}
  activeDietLast=reqLines.map(r=>r.label);
  const avoids=activeAvoidLines();
  const avoidCount={}, dietCount={};
  for(const p of DATA.products){
    if(!productMatchesQuery(p,q))continue;
    if(regionFilter!=='everywhere'&&p.region&&p.region.length&&!p.region.includes('global')&&!p.region.includes(regionFilter))continue;
    // avoid veto: hide a company and the brands it owns (coverage shown honestly in the applied strip)
    let av=null; for(const a of avoids){if(avoidHit(p,a)){av=a;break;}}
    if(av){avoidCount[av.label]=(avoidCount[av.label]||0)+1;avoidHiddenLast++;continue;}
    if(reqLines.length){const fs=p.focuses||p.labels||[];const fails=reqLines.filter(r=>!fs.some(f=>r.accept.indexOf(f)>=0));if(fails.length){for(const r of fails)dietCount[r.label]=(dietCount[r.label]||0)+1;dietHidden++;continue;}}
    const allergy=CC.engine.allergenDecision(p,excludes);
    if(!allergy.eligible){
      const safeScore=CC.engine.score(p,{criteria:DATA.criteria,weights:weights,excludes:new Set()});
      allergenFoldedLast.push({product:p,score:safeScore,statuses:allergy.statuses});
      continue;
    }
    const s=score(p); if(s)arr.push([p,s]);
  }
  activeAvoidLast=Object.keys(avoidCount).map(k=>({label:k,n:avoidCount[k]}));dietCountLast=dietCount;
  if(sortBy==='name')arr.sort((a,b)=>a[0].name.localeCompare(b[0].name));
  else if(sortBy!=='score'&&DATA.criteria.some(cr=>cr.key===sortBy))arr.sort((a,b)=>{const x=a[0].scores[sortBy],y=b[0].scores[sortBy];return (y==null?-1:y)-(x==null?-1:x);});
  else arr.sort((a,b)=>b[1].score-a[1].score);
  return arr;
}
function tierBadge(t){t=t||'assessed';return `<span class="tier t-${t}" title="${t==='measured'?'objective open data':t==='certified'?'third-party certification':'our researched assessment'}">${t}</span>`;}
function provenanceSummaryOf(p){return (p&&p.provenanceSummary)||null;}
// Registrable domain (eTLD+1), so same-org subdomains cannot fake independence: fairphone.com and
// support.fairphone.com collapse to one, apple.com + security.apple.com + support.apple.com to one.
// A small heuristic, no public-suffix-list dependency; org-name labels (e.g. "GitHub") pass through.
// This keeps the app's independence count honest even where the generated sourceDomainCount over-counts
// hostnames (measured: 9% of multi-source entries); a canonical data-lane fix is queued alongside.
function registrableDomain(label){
  let h=String(label||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/^www\./,'');
  if(!/[a-z0-9]\.[a-z]{2}/.test(h))return h;                       // not a domain (an org name) → as-is
  const parts=h.split('.'); if(parts.length<=2)return h;
  const twoLevelSuffix=/^(co|com|org|net|gov|ac|edu|gouv)\.[a-z]{2}$/.test(parts.slice(-2).join('.'));
  return parts.slice(twoLevelSuffix?-3:-2).join('.');
}
function independentDomains(ps){
  const labels=((ps&&ps.sourceLabels)||[]).filter(Boolean);
  if(!labels.length)return null;                                   // no labels → fall back to the emitted count
  return Array.from(new Set(labels.map(registrableDomain)));
}
function provenanceSourceCount(ps){
  const dom=independentDomains(ps);
  if(dom)return dom.length;
  const n=ps&&Number(ps.sourceDomainCount);
  return Number.isFinite(n)?Math.max(0,n):0;
}
function provenanceParts(p){
  const ps=provenanceSummaryOf(p);
  if(!ps)return null;
  const dom=independentDomains(ps);
  const n=provenanceSourceCount(ps), labels=(dom||(ps.sourceLabels||[])).filter(Boolean).map(String);
  if(n>1)return {
    mode:'multi',
    text:n+' independent sources',
    detail:'Score evidence draws on '+n+' source domains.',
    sources:labels,
    title:'Scored facts draw on more than one source domain.'
  };
  const src=ps.primarySource||labels[0]||'source listed';
  if(n===1||ps.singleSource)return {
    mode:'held',
    text:'One source: '+src,
    detail:'Confidence held: scored facts come from one source domain, so repeated criteria are not treated as independent corroboration.',
    sources:labels.length?labels:[src],
    title:'Scored facts rest on one source domain; confidence is held.'
  };
  return {
    mode:'missing',
    text:'Source links missing',
    detail:'Confidence held: this entry has scored facts, but no source-domain links in the generated summary.',
    sources:[],
    title:'Source links are missing for this entry.'
  };
}
/* MARK THE EXCEPTION, NOT THE RULE.
   This used to badge every row. On a decision page that meant "2 independent sources" printed
   fifteen times and "3 independent sources" seven more, with not one entry falling below two. A
   label that appears on everything distinguishes nothing: twenty-two badges all saying the
   evidence is fine, and an eye that learns in three rows to stop reading them.

   Two or more independent sources is the standard this catalogue holds itself to, so it is stated
   once where the list begins rather than stamped on every line. What stays badged is what a reader
   needs warning about: one source, or none. Those are rare, which is exactly why they should be
   the thing that catches the eye. */
function provenanceChipHTML(p){
  const x=provenanceParts(p);
  if(!x||x.mode==='multi')return '';
  return `<span class="provchip prov-${x.mode}" title="${esc(x.title)}">${esc(x.text)}</span>`;
}
/* The standard, said once. Returns nothing when some entry actually falls short, because then the
   badges below are carrying the message and a blanket claim would contradict them. */
function provenanceStandardHTML(list){
  const parts=(list||[]).map(provenanceParts).filter(Boolean);
  if(parts.length<3)return '';
  if(parts.some(x=>x.mode!=='multi'))return '';
  return `<p class="provstandard">Every scored fact below draws on at least two independent sources.</p>`;
}
function provenancePanelHTML(p){
  const ps=provenanceSummaryOf(p), x=provenanceParts(p);
  if(!ps||!x)return '';
  const src=x.sources.length?`<div class="provsrcs">${x.sources.slice(0,5).map(s=>`<span>${esc(s)}</span>`).join('')}</div>`:'';
  const noteOnly=ps.noteOnlyFactCount?`<p class="provnote">${ps.noteOnlyFactCount} scored note${ps.noteOnlyFactCount===1?'':'s'} have no source URL and do not count as independent sources.</p>`:'';
  const factLine=ps.factCount?`<p class="provnote">${ps.sourcedFactCount||0} of ${ps.factCount} scored facts carry source links.</p>`:'';
  return `<div class="provpanel prov-${x.mode}" aria-label="Source independence">
    <div class="provline">${provenanceChipHTML(p)}</div>
    <p>${esc(x.detail)}</p>
    ${src}${factLine}${noteOnly}
  </div>`;
}
function verdictCardProvenanceHTML(p){
  const x=provenanceParts(p);
  if(!x)return '';
  const labels=(x.mode==='multi'&&x.sources&&x.sources.length)?`<span class="vc-corr-src">${esc(x.sources.slice(0,3).join(' · '))}</span>`:'';
  return `<div class="vc-corr"><span class="vc-corr-pill vc-corr-${x.mode}">${esc(x.text)}</span>${labels}</div>`;
}
function trustLensQualified(p){return provenanceSourceCount(provenanceSummaryOf(p))>1;}
function trustLensSplit(arr){
  if(!trustLensOn)return {visible:arr,folded:[]};
  const visible=[], folded=[];
  for(const row of arr)(trustLensQualified(row[0])?visible:folded).push(row);
  return {visible,folded};
}
function trustLensControlHTML(){
  if(!DATA||!DATA.products)return '';
  const total=DATA.products.length, multi=DATA.products.filter(trustLensQualified).length;
  return `<label class="trusttoggle"><input id="trusttoggle" type="checkbox"${trustLensOn?' checked':''}> <span>Show only verdicts backed by two or more independent sources</span></label>
    <p>${multi.toLocaleString()} of ${total.toLocaleString()} entries in this category have 2+ source domains. Single-source and no-source verdicts fold with a show-anyway path; they are never erased.</p>`;
}
function renderTrustLensControl(){
  const box=document.getElementById('trustlens'); if(!box)return;
  box.innerHTML=trustLensControlHTML();
  const cb=box.querySelector('#trusttoggle');
  if(cb)cb.onchange=e=>{trustLensOn=!!e.target.checked;try{localStorage.setItem(TRUST_LENS_KEY,trustLensOn?'1':'0');}catch(err){}render();};
}
function trustFoldEl(rows){
  if(!rows.length)return null;
  const d=el('details',{class:'trustfold'});
  const n=rows.length, noun=n===1?'verdict':'verdicts';
  d.innerHTML=`<summary>Show ${n.toLocaleString()} single/no-source ${noun} anyway</summary>
    <p class="trustfold-note">These entries still have sourced facts, but fewer than two independent source domains in the generated summary. They stay available so the Trust Lens never silently removes evidence.</p>`;
  const wrap=el('div',{class:'trustfold-list'});
  for(const [p,s] of rows.slice(0,40))wrap.appendChild(listCard(p,s));
  d.appendChild(wrap);
  if(rows.length>40)d.appendChild(el('p',{class:'trustfold-note'},`Showing the first 40 folded verdicts. Search, sort, or turn off Trust Lens to inspect the rest.`));
  return d;
}
// band()/bandFill()/provOf() now live in the engine library (engine.js), bound above.
function barsHTML(p){
  let h='';
  for(const cr of DATA.criteria){const v=p.scores[cr.key];
    if(v==null){if((weights[cr.key]||0)>0)h+=`<div class="bar bmiss"><span class="bl">${esc(cr.label)}</span><span class="pv">, no data, and you weight this</span></div>`;continue;}
    const tier=cr.tier||'assessed', assessed=tier==='assessed';
    const pr=provOf(p,cr.key), bd=assessed?band(v):null, fill=assessed?bandFill(v):v;
    const src=pr.source?`<a class="prov-src" href="${esc(pr.source)}" target="_blank" rel="noopener">source↗${pr.asof?' '+esc(pr.asof):''}</a>`:(pr.asof?`<span class="prov-asof">(${esc(pr.asof)})</span>`:'');
    h+=`<div class="bar${assessed?' assessed':''}"><span class="bl">${esc(cr.label)}${bd?` <span class="bandlbl ${bd[1]}">${bd[0]}</span>`:''}</span><span class="tr"><span class="fl" style="width:${fill}%"></span></span><span class="pv">${esc(pr.note||cr.source)} ${src}</span>${tierBadge(tier)}</div>`;}
  return h;
}
function allergenLine(p){
  const evidence=p.allergenEvidence||{declares:p.allergens||[],declaredFree:[]};
  const parts=[];
  if((evidence.declares||[]).length)parts.push(`Declares ${(evidence.declares||[]).map(a=>ALLERGEN_LABELS[a]||a).join(', ')}.`);
  if((evidence.declaredFree||[]).length)parts.push(`Declared ${(evidence.declaredFree||[]).map(a=>(ALLERGEN_LABELS[a]||a)+'-free').join(', ')}.`);
  return parts.length?parts.join(' '):`No allergen data. Check the label.`;
}
function algHTML(p){return DATA.meta.allergens?`<div class="alg"><span>•</span><span>${allergenLine(p)}</span></div>`:'';}
/* A redirect replaces the entry it came from. location.hash pushes, which leaves the redirecting
   route in history: back lands on it, it redirects again, and the reader never gets out. Every
   route that rewrites the address on arrival must come through here. */
function hopTo(hash){
  const to=hash.charAt(0)==='#'?hash:'#'+hash;
  if(location.hash===to){route();return;}
  location.replace(location.pathname+location.search+to);
}
function openProduct(code){location.hash='item/'+encodeURIComponent(DATA.meta.id)+'/'+encodeURIComponent(code);}

function listCard(p,s,badge,onClick){
  const card=el('div',{class:'card click','data-code':p.code});
  const t=s&&scoreTier(s.score);
  card.innerHTML=`<div class="top"><div><span class="nm">${esc(p.name)}</span>${p.brand?` <span class="br">${esc(p.brand)}</span>`:''}${badge?`<span class="catbadge">${esc(badge)}</span>`:''}</div><div class="right" style="display:flex;align-items:center;gap:.6rem"><span class="sc${s&&s.coverage<0.7?' low':''}">${s?s.score:','}<small> /100</small></span></div></div>
    <div class="why">${s?`<span class="stier ${t[1]}">${t[0]}</span> · strongest on ${s.why.join(' and ')}${s.facts<s.wanted?` · ${s.facts} of ${s.wanted} facts you value`:''}${s.cap?` · capped on ${esc(s.cap.label)}`:''}`:'excluded by your allergen filter'}</div>
    <div class="provline">${provenanceChipHTML(p)}</div>
    ${algHTML(p)}`;
  card.querySelector('.right').appendChild(saveToggleEl(p,false));
  makeClickable(card,onClick||(()=>openProduct(p.code)),`View ${p.name}`);
  return card;
}
function allergenStatusText(row){
  const label=ALLERGEN_LABELS[row.tag]||row.tag;
  if(row.status==='declares')return `Declares ${label}.`;
  if(row.status==='declared-free')return `Declared ${label}-free.`;
  return `No ${label} data. Check the label.`;
}
function allergenSafetyFoldEl(rows){
  if(!rows||!rows.length)return null;
  const d=el('details',{class:'allergen-safety-fold'});
  const unknown=rows.filter(row=>(row.statuses||[]).some(status=>status.status==='no-data')).length;
  d.innerHTML=`<summary>Show ${rows.length.toLocaleString()} option${rows.length===1?'':'s'} that need a label check</summary><p class="allergen-safety-note">An active allergy only clears an option explicitly declared free of every selected allergen. ${unknown?`${unknown.toLocaleString()} ${unknown===1?'has':'have'} missing evidence. `:''}Nothing is erased; check the current package before choosing.</p>`;
  const wrap=el('div',{class:'allergen-safety-list'});
  for(const row of rows.slice(0,40)){
    const item=el('div',{class:'allergen-safety-entry'});
    item.appendChild(el('p',{class:'allergen-safety-reason'},(row.statuses||[]).filter(status=>status.status!=='declared-free').map(allergenStatusText).join(' ')));
    item.appendChild(listCard(row.product,row.score));wrap.appendChild(item);
  }
  d.appendChild(wrap);
  if(rows.length>40)d.appendChild(el('p',{class:'allergen-safety-note'},`Showing the first 40 folded options. Search to inspect a narrower set.`));
  return d;
}
// --- Evidence-coverage meter (Masterplan V6): how sourced is a category's data? A claim is "well-evidenced"
// if it is measured/certified, carries object provenance with a source URL, or is a plain note on a low-stakes
// convenience axis. Contested axes still need citations to look authoritative. ---
const EV_LABEL={strong:'✓ Evidence: strong',partial:'◐ Evidence: partial',early:'○ Evidence: early'};
const EVIDENCE_NOTE_OK={fees:true,accessibility:true,price:true,economical:true,catalog:true,selection:true};
function evidenceCoverage(ds){
  if(!ds||!ds.products||!ds.criteria||!ds.criteria.length)return null;
  const openDB=!!(ds.meta&&ds.meta.productBase); // food/beauty are backed by an open database (Open Food/Beauty Facts), sourced by origin
  const tier={}; for(const cr of ds.criteria)tier[cr.key]=cr.tier||'assessed';
  let good=0,total=0;
  for(const p of ds.products)for(const cr of ds.criteria){
    const v=p.scores&&p.scores[cr.key]; if(v==null)continue; total++;
    const pv=p.provenance&&p.provenance[cr.key];
    if(openDB||(pv&&typeof pv==='object'&&pv.source)||tier[cr.key]==='measured'||tier[cr.key]==='certified'||(EVIDENCE_NOTE_OK[cr.key]&&typeof pv==='string'&&pv.trim()))good++;
  }
  if(!total)return null;
  const pct=good/total, level=pct>=0.66?'strong':pct>=0.2?'partial':'early';
  return {level,pct,good,total};
}
function showEvidence(ds){
  const e=document.getElementById('evcov'); if(!e)return;
  const ev=evidenceCoverage(ds);
  e.innerHTML=ev?`<span class="ev ev-${ev.level}" title="${ev.good} of ${ev.total} shown facts carry a measured value, a certification, a cited source, or a low-stakes convenience note (${Math.round(ev.pct*100)}%). Strong ≥66% · partial ≥33% · early below.">${EV_LABEL[ev.level]}</span>`:'';
}
function loadChallengeIndex(){
  if(CHALLENGE_INDEX)return Promise.resolve(CHALLENGE_INDEX);
  if(CHALLENGE_INDEX_P)return CHALLENGE_INDEX_P;
  CHALLENGE_INDEX_P=fetch('./data/challenge-index.json').then(r=>r.ok?r.json():Promise.reject(new Error('HTTP '+r.status)))
    .then(d=>{CHALLENGE_INDEX=(d&&d.format==='open-values-challenge-index')?d:{cases:[]};return CHALLENGE_INDEX;})
    .catch(()=>{CHALLENGE_INDEX={cases:[]};return CHALLENGE_INDEX;});
  return CHALLENGE_INDEX_P;
}
function challengeCaseFor(cid,index){return ((index&&index.cases)||[]).find(c=>c.category===cid)||null;}
function challengeSourceLink(source){
  if(!source||!source.source)return '';
  return ` <a href="${esc(String(source.source))}" target="_blank" rel="noopener">source${source.asof?' '+esc(String(source.asof)):''}</a>`;
}
function challengeReceiptLine(label,receipt){
  if(!receipt)return '';
  const source=receipt.source||{}, axis=receipt.axis?String(receipt.axis).replace(/-/g,' '):'fact';
  const score=Number.isFinite(receipt.score)?` ${receipt.score}/100`:'';
  const summary=(source&&source.note)||receipt.summary||'Sourced fact.';
  return `<p class="challenge-receipt"><b>${esc(label)}:</b> ${esc(axis)}${score}. ${esc(summary)}${challengeSourceLink(source)}</p>`;
}
function challengeCaseHTML(c){
  const ov=c.oppositeView||{}, top=ov.top||{}, steel=c.steelman||{};
  const itemHref=top.code?`#item/${encodeURIComponent(c.category)}/${encodeURIComponent(top.code)}`:'';
  const pick=top.name?`<p><b>${esc(ov.label||'Different priorities')}:</b> ${esc(top.name)}${top.brand?` <span class="challenge-muted">${esc(top.brand)}</span>`:''}${Number.isFinite(top.score)?`, ${top.score}/100 with those priorities`:''}.</p>`:'';
  const steelLine=steel.line||steel.framing||'';
  return `<div class="challenge-k">Different priorities</div>
    <div class="challenge-title">${esc(c.label||'Compare another ranking')}</div>
    <p>${esc(c.reads||'A different set of priorities produces another ranking.')}</p>
    ${pick}
    ${steelLine?`<p><b>Limit of the first choice:</b> ${esc(steelLine)}</p>`:''}
    ${challengeReceiptLine('Source for the alternative',ov.receipt||ov.selectedTag)}
    ${challengeReceiptLine('Source for the limitation',steel.receipt||steel.selectedTag)}
    ${itemHref?`<div class="challenge-actions"><a class="savebtn" href="${itemHref}">Open ${esc(top.name||'alternative')}</a> <span class="challenge-muted">Your sliders stay unchanged.</span></div>`:''}`;
}
function challengeDetailHTML(c,p){
  const ov=c.oppositeView||{}, top=ov.top||{}, user=c.userView||{}, userTop=user.top||{}, steel=c.steelman||{};
  const topHref=top.code?`#item/${encodeURIComponent(c.category)}/${encodeURIComponent(top.code)}`:'';
  const userHref=userTop.code?`#item/${encodeURIComponent(c.category)}/${encodeURIComponent(userTop.code)}`:'';
  const isUserTop=p.code===user.expectedTop||p.code===userTop.code;
  const isOppositeTop=p.code===ov.expectedTop||p.code===top.code;
  const steelLine=steel.line||steel.framing||'';
  if(isUserTop)return `<div class="challenge-k">Check another priority</div>
    <div class="challenge-title">${esc(c.label||'Compare another ranking')}</div>
    <p>${esc(c.reads||'A different set of priorities produces another ranking.')}</p>
    ${steelLine?`<p><b>Limit to check:</b> ${esc(steelLine)}</p>`:''}
    ${top.name?`<p><b>${esc(ov.label||'Different priorities')}:</b> ${esc(top.name)}${top.brand?` <span class="challenge-muted">${esc(top.brand)}</span>`:''}${Number.isFinite(top.score)?`, ${top.score}/100 with those priorities`:''}.</p>`:''}
    ${challengeReceiptLine('Source for the alternative',ov.receipt||ov.selectedTag)}
    ${challengeReceiptLine('Source for the limitation',steel.receipt||steel.selectedTag)}
    ${topHref?`<div class="challenge-actions"><a class="savebtn" href="${topHref}">Open ${esc(top.name||'alternative')}</a> <span class="challenge-muted">Your values stay unchanged.</span></div>`:''}`;
  if(isOppositeTop)return `<div class="challenge-k">Why this ranks first</div>
    <div class="challenge-title">${esc(ov.label||'Different priorities')}</div>
    <p>This option ranks first when ${esc(ov.label||'a different set of priorities').toLowerCase()} receives more weight.</p>
    ${challengeReceiptLine('Source',ov.receipt||ov.selectedTag)}
    ${userHref?`<div class="challenge-actions"><a class="savebtn" href="${userHref}">Open ${esc(userTop.name||'the current choice')}</a> <span class="challenge-muted">Your sliders stay unchanged.</span></div>`:''}`;
  return `<div class="challenge-k">Compare another priority</div>
    <div class="challenge-title">${esc(c.label||'Different priorities')}</div>
    <p>${esc(c.reads||'A different set of priorities produces another ranking.')}</p>
    ${top.name?`<p><b>Alternative:</b> ${esc(top.name)}${top.brand?` <span class="challenge-muted">${esc(top.brand)}</span>`:''}.</p>`:''}
    ${challengeReceiptLine('Receipt',ov.receipt||ov.selectedTag)}
    ${topHref?`<div class="challenge-actions"><a class="savebtn" href="${topHref}">Open ${esc(top.name||'alternative')}</a> <span class="challenge-muted">Your values stay unchanged.</span></div>`:''}`;
}
function renderChallengeBox(cid,box){
  if(!box)return;
  loadChallengeIndex().then(index=>{
    if(!box||!DATA||DATA.meta.id!==cid||box.getAttribute('data-cid')!==cid)return;
    const c=challengeCaseFor(cid,index);
    box.innerHTML=c?challengeCaseHTML(c):'';
  });
}
function renderDetailChallengeBox(cid,code,box){
  if(!box)return;
  loadChallengeIndex().then(index=>{
    if(!box||!DATA||DATA.meta.id!==cid||selected!==code||box.getAttribute('data-code')!==code)return;
    const c=challengeCaseFor(cid,index), p=DATA.products.find(x=>x.code===code);
    box.innerHTML=(c&&p)?challengeDetailHTML(c,p):'';
  });
}
function loadAsksOffersIndex(){
  if(ASKS_OFFERS_INDEX)return Promise.resolve(ASKS_OFFERS_INDEX);
  if(ASKS_OFFERS_INDEX_P)return ASKS_OFFERS_INDEX_P;
  ASKS_OFFERS_INDEX_P=fetch('./data/asks-offers-index.json').then(r=>r.ok?r.json():Promise.reject(new Error('HTTP '+r.status)))
    .then(d=>{ASKS_OFFERS_INDEX=(d&&d.format==='open-values-asks-offers-index')?d:{items:[],counts:{}};return ASKS_OFFERS_INDEX;})
    .catch(()=>{ASKS_OFFERS_INDEX={items:[],counts:{},failed:true};return ASKS_OFFERS_INDEX;});
  return ASKS_OFFERS_INDEX_P;
}
function aoSourceLink(r){
  return r&&r.source?` <a href="${esc(String(r.source))}" target="_blank" rel="noopener">source${r.asof?' '+esc(String(r.asof)):''}</a>`:'';
}
function aoChipList(xs,cls){
  return (xs||[]).slice(0,5).map(x=>`<span class="${cls||'ao-chip'}">${esc(String(x))}</span>`).join('');
}
function aoRelatedLinks(xs,kind){
  if(!xs||!xs.length)return '';
  const links=xs.slice(0,2).map(x=>{
    const href=kind==='category'?'#explore/'+encodeURIComponent(x.id||x):((x.hash)||('#guide/'+encodeURIComponent(x.id||x)));
    const label=x.label||x.title||x.id||x;
    return `<a href="${esc(href)}">${esc(label)}</a>`;
  }).join('');
  return links?`<div class="ao-links">${links}</div>`:'';
}
function aoInitiativeHTML(it){
  const act=it.actPath||{}, actUrl=act.kind==='url'&&act.url;
  return `<div class="ao-init">
    <a class="ao-init-name" href="#item/causes-to-support/${encodeURIComponent(it.code||'')}">${esc(it.name||it.code||'Initiative')}</a>
    ${it.brand?`<span class="ao-init-brand">${esc(it.brand)}</span>`:''}
    ${actUrl?`<a class="ao-act" href="${esc(act.url)}" target="_blank" rel="noopener">${esc(act.label||'Act')}</a>`:''}
  </div>`;
}
function asksOffersItemHTML(item){
  const action=item.action||{}, needs=action.items||item.needs||item.offers||[], rel=item.related||{};
  const inits=(rel.initiatives||[]).slice(0,2).map(aoInitiativeHTML).join('');
  const receipts=(item.receipts||[]).slice(0,2).map(r=>`<p class="ao-receipt">${esc(r.note||'Sourced receipt.')}${aoSourceLink(r)}</p>`).join('');
  const limits=(item.limits||[]).slice(0,2).map(l=>`<p class="ao-limit">${esc(l)}</p>`).join('');
  const proof=(receipts||limits)?`<details class="ao-more"><summary>Receipts and limits</summary>${receipts}${limits}</details>`:'';
  return `<article class="aoitem ao-${esc(item.kind||'item')}">
    <div class="ao-kind">${esc(item.kind==='offer'?'Offer':'Ask')}</div>
    <h3>${esc(item.title||'Untitled')}</h3>
    <p>${esc(item.summary||'')}</p>
    ${needs.length?`<div class="ao-list"><span>${esc(action.listLabel||'Needs')}</span>${aoChipList(needs,'ao-chip')}</div>`:''}
    <div class="ao-prompt">${esc(item.prompt||'')}</div>
    ${inits?`<div class="ao-sub">Initiatives this points to</div><div class="ao-inits">${inits}</div>`:''}
    ${aoRelatedLinks(rel.guides,'guide')}
    ${aoRelatedLinks(rel.categories,'category')}
    ${proof}
  </article>`;
}
function asksOffersBoardHTML(index){
  const items=(index.items||[]), counts=index.counts||{};
  if(index.failed)return `<div class="aoboard-miss"><b>Mutual-aid board unavailable.</b> The initiatives lens still works, but the asks/offers file did not load.</div>`;
  if(!items.length)return '';
  const askN=counts.asks||items.filter(i=>i.kind==='ask').length, offerN=counts.offers||items.filter(i=>i.kind==='offer').length;
  return `<section class="aoboard" aria-label="Mutual aid board">
    <div class="ao-head">
      <div><div class="dsh">Mutual aid board</div><h3>Turn a cause into a concrete ask</h3>
      <p>These are starter patterns, not live requests: ${askN} asks and ${offerN} offers, each tied to sourced guides and initiatives. Keep private contact details out of public files.</p></div>
      <a class="savebtn" href="#guide/where-to-give">Read the giving guide</a>
    </div>
    <div class="aogrid">${items.map(asksOffersItemHTML).join('')}</div>
    <p class="ao-foot">Start from one, adapt it, then share it in a trusted channel you already use. No account is needed here.</p>
  </section>`;
}
function renderAsksOffersBoard(cid,box){
  if(!box||cid!=='causes-to-support'){if(box)box.innerHTML='';return;}
  box.innerHTML='<div class="aoboard-miss">Loading the mutual-aid board...</div>';
  loadAsksOffersIndex().then(index=>{
    if(!box||!DATA||DATA.meta.id!==cid||box.getAttribute('data-cid')!==cid)return;
    box.innerHTML=asksOffersBoardHTML(index);
  });
}
function renderList(){
  const arr=rankedList();
  const trust=trustLensSplit(arr), displayArr=trust.visible, foldedArr=trust.folded;
  // the count line says what the ranking actually is — the category's own axis, a single fact, or your values
  const _axl=(sortBy!=='score'&&sortBy!=='name')?(DATA.criteria.find(c=>c.key===sortBy)||{}).label:null;
  const rankingLabel=sortBy==='name'?'A to Z':_axl?`Ranked by ${_axl.toLowerCase()}, switch to “best for you” anytime`:'Ranked for your values';
  document.getElementById('count').textContent=trustLensOn
    ? `Trust Lens on · ${displayArr.length} matches backed by 2+ independent sources${foldedArr.length?`, ${foldedArr.length} single/no-source matches folded below`:''}`
    : `${rankingLabel} · ${arr.length} eligible match${arr.length===1?'':'es'}${allergenFoldedLast.length?` · ${allergenFoldedLast.length} need a label check`:''}`;
  renderTrustLensControl();
  updateFilterNote();
  // Kinds within this category (the fine ontology, on the page itself): chips from the ontology's facets.
  const fb=document.getElementById('facetbar');
  if(fb){
    const ont=window.CC_BUNDLE&&window.CC_BUNDLE.ontology, kids=[];
    if(ont&&ont.domains)for(const d of ont.domains)for(const c of (d.categories||[]))if(c.cid===DATA.meta.id&&c.facet)kids.push(c);
    if(kids.length){
      const cur=currentListQuery().toLowerCase();
      fb.innerHTML=`<span class="facet-h" style="margin:0 .4rem 0 0">Kinds:</span>`+
        `<a class="facet${cur?'':' on'}" href="${exploreHref(DATA.meta.id)}">All</a>`+
        kids.map(k=>`<a class="facet${cur===k.facet.toLowerCase()?' on':''}" href="${exploreHref(DATA.meta.id,k.facet)}">${esc(k.label)}</a>`).join('');
    } else fb.innerHTML='';
  }
  showEvidence(DATA);
  if(overlayCount(DATA.meta.id)){const _e=document.getElementById('evcov');if(_e){const _n=overlayCount(DATA.meta.id);_e.innerHTML+=(_e.innerHTML.trim()?' · ':'')+`<span style="color:var(--accent)">✎ ${_n} correction${_n>1?'s':''} you've applied here</span> <a id="lwipe" style="cursor:pointer;color:var(--accent);text-decoration:underline">clear</a>`;const _w=document.getElementById('lwipe');if(_w)_w.onclick=()=>{clearOverlay(DATA.meta.id);announce('Corrections cleared, original facts restored');render();};}}
  const res=document.getElementById('results');
  const first={}; for(const ch of res.children){const c=ch.dataset&&ch.dataset.code; if(c)first[c]=ch.getBoundingClientRect();}
  res.innerHTML='';
  // The sourcing standard, said once at the top instead of stamped on every row below.
  const std=provenanceStandardHTML(displayArr.map(x=>x&&x.p||x));
  if(std)res.insertAdjacentHTML('beforeend',std);
  if(!onboarded){
    const ob=el('div',{class:'onboard'},`<b>Drag any slider and the list rearranges itself.</b> The facts stay put; your priorities do the sorting. Tap a preset if you'd rather start quick. Nothing you do here is tracked.`);
    const b=el('button',{class:'catbtn',style:'margin-top:.7rem'},'Got it');
    b.onclick=()=>{onboarded=true;try{localStorage.setItem(ONBOARD_KEY,'1');}catch(e){}render();};
    ob.appendChild(b);res.appendChild(ob);
  }
  const gslug=CAT_GUIDE[DATA.meta.id], gg=gslug&&(window.CC_GUIDES||[]).find(g=>g.slug===gslug);
  if(gg){const gl=el('a',{class:'guidelink',href:'#guide/'+gslug});gl.innerHTML=`${CC.icon('guides')} <b>Read the guide:</b> ${esc(gg.title)} →`;res.appendChild(gl);}
  const aobox=el('div',{'data-cid':DATA.meta.id});res.appendChild(aobox);renderAsksOffersBoard(DATA.meta.id,aobox);
  const listScope=currentListQuery();
  if(displayArr.length>1){const dc=el('a',{class:'guidelink',href:decideHref(DATA.meta.id,listScope),style:'border-left:3px solid var(--accent)'});dc.innerHTML='✦ <b>Just want the answer?</b> Help me decide →';res.appendChild(dc);}
  const chbox=el('div',{class:'challengebox','data-cid':DATA.meta.id});res.appendChild(chbox);renderChallengeBox(DATA.meta.id,chbox);
  let prevSc=null;
  for(const [p,s] of displayArr.slice(0,40)){const card=listCard(p,s);if(sortBy==='score'&&prevSc!=null&&s&&Math.abs(s.score-prevSc)<=2)card.classList.add('tied');if(s)prevSc=s.score;res.appendChild(card);}
  if(displayArr.length>40)res.appendChild(el('div',{class:'listend'},`Showing your 40 best matches of ${displayArr.length}. Refine your values or search above to see further down.`));
  else if(displayArr.length)res.appendChild(el('div',{class:'listend'},`That's all ${displayArr.length}, ranked for your values, you're all caught up.`));
  else if(trustLensOn&&foldedArr.length)res.appendChild(el('div',{class:'listend'},'No entries in this view have two independent source domains yet. The single-source and no-source verdicts are folded below.'));
  else if(allergenFoldedLast.length)res.appendChild(el('div',{class:'listend'},'No option here is explicitly declared free of every selected allergen. The label-check fold keeps every option inspectable.'));
  const allergenFold=allergenSafetyFoldEl(allergenFoldedLast);
  if(allergenFold)res.appendChild(allergenFold);
  const folded=trustLensOn?trustFoldEl(foldedArr):null;
  if(folded)res.appendChild(folded);
  flipPlay(res,first);
  forceRecord(); // the force counter: once per category per session, honest arithmetic
  // T1 — a brief, calm confirmation that a weight change re-ranked the list (once per change, then gone)
  if(rerankPing){rerankPing=false;const c=document.getElementById('count');
    if(c){const b=el('span',{class:'reranked'},'✓ reordered to match');c.appendChild(b);
      setTimeout(()=>{b.classList.add('out');setTimeout(()=>b.remove(),700);},1500);}
    announce('Re-ranked to your values'+(displayArr.length&&displayArr[0]?', '+displayArr[0][0].name+' now first':''));}
}
// component · a sourced correction from the verdict → a portable open-values-lens-patch (the federation artifact).
// Curated lenses only (food/beauty correct upstream at Open Food/Beauty Facts). Nothing is uploaded; the file is yours to pass.
function correctionFormEl(p,ds){
  const d=el('details',{class:'fixwrap',style:'margin:.3rem 0 1rem;border:1px solid var(--line);border-radius:12px;background:var(--surface);overflow:hidden'});
  const crit=(ds.criteria||[]).map(c=>`<option value="${esc(c.key)}">${esc(c.label)}</option>`).join('');
  const ist='font:inherit;padding:.45rem .55rem;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);width:100%';
  const lab='font-size:.78rem;color:var(--hint);display:flex;flex-direction:column;gap:.2rem';
  d.innerHTML=`<summary style="cursor:pointer;padding:.7rem 1rem;font-weight:600;color:var(--accent)">${CC.icon('flag')} Suggest a correction</summary>
    <div style="padding:0 1rem 1rem;display:flex;flex-direction:column;gap:.6rem">
      <p style="margin:0;font-size:.87rem;color:var(--muted)">See a fact that looks wrong? Propose a fix <b>with a source</b>. You'll get a small, portable <b>correction file</b>, send it to the maintainer or load it in the <a href="../workshop/index.html">Lens Workshop</a>, where it merges reproducibly. <b>Nothing is uploaded.</b></p>
      <label style="${lab}">Which fact<select id="fix-key" style="${ist}">${crit}</select></label>
      <div id="fix-cur" style="font-size:.84rem;color:var(--muted)"></div>
      <label style="${lab}">It should be (0–100)<input id="fix-val" type="number" min="0" max="100" inputmode="numeric" style="${ist}"></label>
      <label style="${lab}">Your source <b style="color:var(--accent)">· required</b><input id="fix-src" placeholder="a link or citation, where this fact comes from" style="${ist}"></label>
      <label style="${lab}">Why (optional)<input id="fix-why" placeholder="a short note" style="${ist}"></label>
      <div style="display:flex;gap:.7rem;align-items:center;flex-wrap:wrap"><button class="catbtn" id="fix-go" disabled>✓ Apply to my copy</button><button class="savebtn" id="fix-dl" disabled>⤓ Download to share</button></div><span id="fix-note" style="font-size:.82rem;color:var(--muted);display:block;margin-top:.3rem"></span>
    </div>`;
  const key=d.querySelector('#fix-key'),val=d.querySelector('#fix-val'),src=d.querySelector('#fix-src'),why=d.querySelector('#fix-why'),go=d.querySelector('#fix-go'),dl=d.querySelector('#fix-dl'),cur=d.querySelector('#fix-cur'),note=d.querySelector('#fix-note');
  const showCur=()=>{const vv=p.scores&&p.scores[key.value];cur.innerHTML='Currently: <b>'+(vv==null?'no value yet':vv+' / 100')+'</b>';};
  const check=()=>{const ok=val.value!==''&&!!src.value.trim();go.disabled=dl.disabled=!ok;};
  key.onchange=showCur; val.oninput=check; src.oninput=check; showCur(); check();
  const buildPatch=()=>({format:'open-values-lens-patch',version:'0.1',target:ds.meta.id,baseHash:(window.CC&&CC.engine?CC.engine.lensHash(CC_ORIG[ds.meta.id]||ds):''),note:'community correction · '+p.name,created:new Date().toISOString(),ops:[{op:'set-score',code:p.code,key:key.value,value:Math.max(0,Math.min(100,+val.value)),source:src.value.trim(),note:why.value.trim()}]});
  go.onclick=()=>{ const r=applyPatchLocally(buildPatch()); if(r.ok){ announce('Applied, your correction now shows in the ranking'); render(); } else { note.textContent=r.reason==='duplicate'?"You've already applied this exact correction.":"Couldn't apply that correction."; } };
  dl.onclick=()=>{
    const patch=buildPatch(), fn=(ds.meta.id+'-'+p.code+'-fix').replace(/[^a-z0-9._-]/gi,'-')+'.patch.json';
    const b=new Blob([JSON.stringify(patch,null,2)],{type:'application/json'});
    const a=el('a',{href:URL.createObjectURL(b),download:fn});document.body.appendChild(a);a.click();a.remove();
    note.textContent='Saved '+fn+', yours to send. It merges reproducibly; nothing was uploaded.';
  };
  return d;
}
// ── THE WEAVE — Connections (G3): the graph made visible on a verdict. "Resembles" is computed cross-domain
//    analogy (engine.analogues over the loaded commons — the metaphor, live, no new data); "Connected" reads
//    sourced edges (./edges.json, a forkable open-values-edges file); "Elsewhere" links out to the open-data web.
//    Additive, calm, on-demand — no IA change, nothing uploaded. Degrades gracefully (file:// hides Connected).
let EDGES=null, EDGES_TRIED=false;
function loadEdges(){ if(EDGES||EDGES_TRIED)return Promise.resolve(EDGES);
  return fetch('./edges.json').then(r=>r.ok?r.json():null).then(j=>{EDGES=j;EDGES_TRIED=true;return j;}).catch(()=>{EDGES_TRIED=true;return null;}); }
// Cross-instance wormhole: load ANOTHER instance's lens (a manifest that sets window.OVS_LENS) so we can find an
// entity's values-twin there via the spine. Fetched + parsed in a sandbox; cached; degrades gracefully (file://).
const _instLens={};
function loadInstanceLens(url){if(_instLens[url])return Promise.resolve(_instLens[url]);
  return fetch(url).then(r=>r.ok?r.text():null).then(txt=>{if(!txt)return null;try{const w={};new Function('window',txt)(w);const L=w.OVS_LENS||w.KOSPLORA_LENS||null;if(L)_instLens[url]=L;return L;}catch(e){return null;}}).catch(()=>null);}
function _wsplit(id){const i=id.indexOf('/');return [id.slice(0,i).replace(/^ovs:/,''), id.slice(i+1)];}
function _wcatLabel(cat){const c=(CATALOG||[]).find(x=>x.id===cat);return c?c.label:cat;}
function _wlabelOf(id){const [cat,code]=_wsplit(id);const ds=window.CC_BUNDLE&&CC_BUNDLE.data&&CC_BUNDLE.data[cat];
  if(ds){const e=(ds.products||ds.resources||[]).find(x=>x.code===code);if(e)return e.name;}
  return code.replace(/-/g,' ').replace(/\b\w/g,m=>m.toUpperCase()); }
function _wresolves(id){const [cat,code]=_wsplit(id);const ds=window.CC_BUNDLE&&CC_BUNDLE.data&&CC_BUNDLE.data[cat];return !!(ds&&(ds.products||ds.resources||[]).some(x=>x.code===code));}
function weaveGraph(){const D=(window.CC_BUNDLE&&CC_BUNDLE.data)||{},lenses=[];for(const k in D)lenses.push(D[k]);
  return CC.engine.buildGraph({lenses:lenses, ontology:(window.CC_BUNDLE&&CC_BUNDLE.ontology)||null, edges:EDGES?[EDGES]:[]}); }
function renderResembles(box, cid, code){
  const G=weaveGraph(), node=G.node('ovs:'+cid+'/'+code);
  if(!node){box.innerHTML='';return;}
  const an=CC.engine.analogues(node, G.nodes(), {k:3});
  if(!an.length){box.innerHTML='<div class="dsh">Resembles</div><p class="alts-sub">Nothing across other categories closely matches its values yet, the more of the commons is built, the more this finds.</p>';return;}
  const tiles=an.map(a=>{const [cat,c2]=_wsplit(a.node.id);return `<a class="dcard" href="#item/${cat}/${encodeURIComponent(c2)}"><span class="dcard-n">${esc(a.node.label)}</span><span class="dcard-c">${a.resemblance}% alike · ${esc(_wcatLabel(cat))}</span></a>`;}).join('');
  box.innerHTML='<div class="dsh">Resembles, by your shared values</div><div class="dgrid">'+tiles+'</div><p class="alts-sub" style="margin-top:.4rem">A computed resemblance: the same <i>shape</i> of values across different things, a suggestion, never an endorsement.</p>';
  // G4 — the metaphor made spreadable: a downloadable "X is the Y of Z" card for the top resemblance
  if(window.CC&&CC.analogyCard&&CC.downloadCardPNG){
    const top=an[0], [tcat]=_wsplit(top.node.id);
    const btn=el('button',{class:'savebtn',style:'margin-top:.3rem'},'↗ Save “'+esc(node.label)+' is the '+esc(top.node.label)+'” as a card');
    btn.onclick=()=>{
      const sa=CC.engine.signature(node), sb=CC.engine.signature(top.node), shared={};
      for(const th in sa){if(sb[th]!=null)shared[th]=Math.min(sa[th],sb[th]);}  // the values they hold in common
      const svg=CC.analogyCard({aName:node.label,aCat:_wcatLabel(cid),bName:top.node.label,bCat:_wcatLabel(tcat),resemblance:top.resemblance,values:shared},{size:1080});
      CC.downloadCardPNG(svg,'resemblance-card.png',ok=>announce(ok?'Resemblance card downloaded.':'Could not render the card.'));
    };
    box.appendChild(btn);
  }
}
function renderConnected(box, cid, p){
  if(!EDGES_TRIED){loadEdges().then(()=>renderConnected(box,cid,p));return;}
  if(!EDGES){box.innerHTML='';return;}
  const id='ovs:'+cid+'/'+p.code, REL={'alternative-to':'Consider instead','owned-by':'Owned by','parent-of':'Owns','made-by':'Made by','supplies':'Supplies','certified-by':'Certified by'};
  const out=(EDGES.edges||[]).filter(e=>e.from===id), inc=(EDGES.edges||[]).filter(e=>e.to===id);
  if(!out.length&&!inc.length){box.innerHTML='';return;}
  const row=(e,dir)=>{const other=dir==='out'?e.to:e.from,[cat,code]=_wsplit(other),
    rel=dir==='out'?(REL[e.rel]||e.rel):(e.rel==='alternative-to'?'An alternative for':(REL[e.rel]||e.rel)),
    inner=`<span class="dcard-n">${esc(_wlabelOf(other))}</span><span class="dcard-c">${esc(rel)}${e.source?' · sourced':''}</span>`;
    // a target that isn't a built entity (e.g. an org behind an ownership edge) renders as a label, never a broken link
    return _wresolves(other)?`<a class="dcard" href="#item/${cat}/${encodeURIComponent(code)}" title="${esc(e.source||'')}">${inner}</a>`:`<span class="dcard" title="${esc(e.source||'')}" style="cursor:default">${inner}</span>`;};
  box.innerHTML='<div class="dsh">Connected</div><div class="dgrid">'+out.map(e=>row(e,'out')).concat(inc.map(e=>row(e,'in'))).join('')+'</div>';
}
function externalLinksHTML(p, ds){
  const L=[];
  if(ds.meta.productBase&&p.code)L.push(`<a href="${ds.meta.productBase}${encodeURIComponent(p.code)}" target="_blank" rel="noopener">Open Food Facts ↗</a>`);
  const ids=p.ids||{};
  if(ids.wikidata)L.push(`<a href="https://www.wikidata.org/wiki/${encodeURIComponent(ids.wikidata)}" target="_blank" rel="noopener">Wikidata ↗</a>`);
  if(p.links&&p.links.length)for(const l of p.links)L.push(`<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label||'Website')} ↗</a>`);
  return L.length?('<div class="dsh">Elsewhere</div><div class="links">'+L.join('')+'</div>'):'';
}
function connectionsEl(p, ds){
  const cid=ds.meta.id, wrap=el('div',{class:'card',style:'margin-top:1rem'});
  wrap.innerHTML='<div class="alts-h" style="margin:0 0 .25rem">Connections</div><p class="alts-sub" style="margin:0">How this sits in the wider commons, by your values, not category alone.</p>';
  const resem=el('div',{style:'margin-top:.7rem'});
  const btn=el('button',{class:'catbtn'},CC.icon('spark')+' What does this resemble across the commons?');
  btn.onclick=()=>{btn.disabled=true;btn.textContent='Searching the commons…';loadAllCategories().then(()=>renderResembles(resem,cid,p.code));};
  resem.appendChild(btn); wrap.appendChild(resem);
  const conn=el('div',{style:'margin-top:.7rem'}); renderConnected(conn,cid,p); wrap.appendChild(conn);
  const ext=externalLinksHTML(p,ds); if(ext){const e0=el('div',{style:'margin-top:.7rem'});e0.innerHTML=ext;wrap.appendChild(e0);}
  if(window.CC&&CC.engine&&CC.engine.twinOf){   // a wormhole to this entity's values-twin in another instance of the standard
    const worm=el('div',{style:'margin-top:.7rem'});
    const wb=el('button',{class:'savebtn'},CC.icon('spark')+' Its values-twin in another world (learning) →');
    wb.onclick=()=>{wb.disabled=true;wb.textContent='Opening a wormhole…';loadInstanceLens('../kosplora/lens.js').then(K=>{
      if(!K){worm.innerHTML='<div class="dsh">Through the standard</div><p class="alts-sub">Couldn’t reach the other instance from here, open the full site to walk between worlds.</p>';return;}
      const t=CC.engine.twinOf(p,CC_THEME_UNIVERSAL,K);
      if(!t||!t.node){worm.innerHTML='<div class="dsh">Through the standard</div><p class="alts-sub">No clear twin across the standard yet.</p>';return;}
      const carried=(t.carried||[]).map(c=>c.universal).join(', ');
      worm.innerHTML='<div class="dsh">Through the standard</div><div class="card" style="border-left:3px solid var(--accent)"><div>In <b>learning</b>, '+esc(p.name)+'’s values-twin is <b>'+esc(t.node.name)+'</b>.</div><p class="alts-sub" style="margin:.35rem 0 0">Your stance carried into a different instance of the standard'+(carried?', via <b>'+esc(carried)+'</b>':'')+', through the shared values spine. <a href="../kosplora/" target="_blank" rel="noopener">Explore Kosplora ↗</a></p></div>';
    });};
    worm.appendChild(wb); wrap.appendChild(worm);
  }
  return wrap;
}
function presentationEntryFactLabel(criterion){
  return criterion.key==='fees'?'Fees':criterion.label||String(criterion.key||'Fact').replace(/_/g,' ');
}
function renderPresentationEntry(p){
  const presentation=CC.presentation&&CC.presentation.current(), route='#item/'+DATA.meta.id+'/'+p.code;
  const fixture=presentation&&CC.presentation.fixtureFor(presentation,'entry',route);if(!fixture)return false;
  const s=score(p), reason=s&&headlineReason(p,DATA,s), type=String(DATA.meta.type||'Entry').replace(/s$/,''), seenSources=new Set(), sources=[];
  const facts=(DATA.criteria||[]).map(criterion=>{
    const value=p.scores&&p.scores[criterion.key], provenance=p.provenance&&p.provenance[criterion.key], sourced=provenance&&typeof provenance==='object'&&provenance.source;
    const label=presentationEntryFactLabel(criterion);
    if(sourced&&!seenSources.has(provenance.source)){seenSources.add(provenance.source);sources.push({label:label,url:provenance.source,asof:provenance.asof||''});}
    return {label:label,band:Number.isFinite(value)?CC.engine.band(value)[0]:'Unknown',note:typeof provenance==='string'?provenance:(provenance&&provenance.note)||'',source:sourced?provenance.source:'',asof:sourced&&provenance.asof||'',missing:sourced?'':label+': source not supplied'};
  });
  const connections=[];
  if(p.brand)connections.push('<p><b>Brand:</b> '+esc(p.brand)+'</p>');
  for(const link of (p.links||[]))connections.push('<a href="'+esc(link.url)+'" target="_blank" rel="noopener">'+esc(link.label||'Website')+'</a>');
  const guide=CAT_GUIDE[DATA.meta.id], hasGuide=!!(guide&&(window.CC_GUIDES||[]).some(item=>item.slug===guide));
  document.getElementById('count').textContent='';
  const res=document.getElementById('results');res.innerHTML=CC.presentation.entryFrame(presentation,{
    fixture:fixture,route:route,category:DATA.meta.id,categoryLabel:DATA.meta.label,type:type,displayName:p.name,description:p.description||'',saved:isSaved(p.code),
    answer:s?(scoreTier(s.score)[0]+' for your current choices'):'Cannot pass the active rules',why:reason?(reason.label+': '+reason.band[0]+'. '+(reason.note||'')):'The available facts do not support an answer.',
    facts:facts,sources:sources,connectionsHtml:connections.join(''),allHref:'#decide/'+encodeURIComponent(DATA.meta.id),guideHref:hasGuide?'#guide/'+encodeURIComponent(guide):'',datasetHref:'./data/'+DATA.meta.id+'.json'
  });
  const search=res.querySelector('[data-presentation-search-form]');if(search)search.onsubmit=e=>{e.preventDefault();const input=search.querySelector('input[type="search"]'),term=input&&input.value.trim();if(term)location.hash='#search/'+encodeURIComponent(term);};
  const save=res.querySelector('#entry-save-choice');if(save)save.onclick=()=>toggleSave(p);
  return true;
}
function renderDetail(){
  const p=DATA.products.find(x=>x.code===selected);
  if(!p){selected=null;return renderList();}
  if(renderPresentationEntry(p))return;
  const s=score(p);
  const t=s&&scoreTier(s.score), wk=s&&weakestAxis(p);
  const scored=DATA.products.map(x=>[x,score(x)]).filter(z=>z[1]).sort((a,b)=>b[1].score-a[1].score);
  const my=s?s.score:-1;
  const better=scored.filter(z=>z[0].code!==p.code&&z[1].score>my).slice(0,4);
  // D1 — verdict-forward: the single most-decisive sourced reason, an honest confidence read, an explicit next action.
  const reason=s?headlineReason(p,DATA,s):null;
  const covLevel=s?(s.coverage>=0.7?['strong','ev-strong']:s.coverage>=0.4?['partial','ev-partial']:['limited','ev-early']):null;
  const LENS_VERB={banking:'Move your money',investing:'Move your money',payments:'Switch your payments','digital-services':'Switch the service','ai-assistants':'Switch assistant',vpn:'Switch VPN','password-managers':'Switch manager','music-streaming':'Switch service',phones:'Choose better',laptops:'Choose better',clothing:'Shop better',shoes:'Shop better'};
  const _cid=DATA.meta.id, _verb=LENS_VERB[_cid];
  const _gslug=CAT_GUIDE[_cid], _hasGuide=!!(_gslug&&(window.CC_GUIDES||[]).some(g=>g.slug===_gslug));
  const action=_verb?(_hasGuide?{label:_verb+', see how',href:'#guide/'+_gslug}:{label:_verb,href:'#explore/'+_cid})
    :(_hasGuide?{label:'Read the guide',href:'#guide/'+_gslug}:{label:'Compare all '+DATA.meta.label.toLowerCase(),href:'#explore/'+_cid});
  document.getElementById('count').textContent='';
  const res=document.getElementById('results');res.innerHTML='';
  res.appendChild(makeClickable(el('div',{class:'back'},'← all'),()=>{location.hash='explore/'+DATA.meta.id;},'Back to all'));
  const avHit=activeAvoidLines().find(a=>avoidHit(p,a));
  if(avHit){const bn=el('div',{class:'avoidbanner'});bn.innerHTML=`&#8856; You’re avoiding <b>${esc(avHit.label)}</b>, and this is one of its brands. It’s hidden from your rankings, you’re seeing it here only because you opened it directly. <a href="#you">My rules →</a>`;res.appendChild(bn);}
  if(overlayCount(DATA.meta.id)){const nn=overlayCount(DATA.meta.id);const ln=el('div',{style:'font-size:.82rem;color:var(--muted);margin:.1rem 0 .55rem'});ln.innerHTML='✎ You\'ve applied <b>'+nn+'</b> correction'+(nn>1?'s':'')+' here, on this device, reproducible, never uploaded. ';const clr=el('a',{style:'color:var(--accent);cursor:pointer'},'clear & restore originals');clr.onclick=()=>{clearOverlay(DATA.meta.id);announce('Corrections cleared, original facts restored');render();};ln.appendChild(clr);res.appendChild(ln);}
  const src=DATA.meta.productBase
    ? `<a href="${DATA.meta.productBase}${encodeURIComponent(p.code||'')}" target="_blank" rel="noopener">see source &amp; suggest a correction ↗</a>`
    : `<a href="#contribute/problem/${encodeURIComponent(p.name||'')}">dispute or correct a rating ↗</a>`;
  // Phase C / C1 — richer record fields (all optional, backward-compatible)
  const descHTML=p.description?`<p class="desc">${esc(p.description)}</p>`:'';
  const focusHTML=(p.focuses&&p.focuses.length)?`<div class="focuses">${p.focuses.map(f=>`<span class="focus">${esc(f)}</span>`).join('')}</div>`:'';
  const linksHTML=(p.links&&p.links.length)?`<div class="links">${p.links.map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label||'Website')} ↗</a>`).join('')}</div>`:'';
  const card=el('div',{class:'card vdcard'});
  const reasonHTML=reason
    ? `<div class="vd-reason"><span class="vd-rl">${esc(reason.label)}: <b>${esc(reason.band[0])}</b></span><span class="vd-rn">${reason.applied?`<b style="color:var(--accent)">✎ your correction</b> · `:''}${esc(reason.note||'')} ${reason.source?`<a href="${esc(reason.source)}" target="_blank" rel="noopener">${reason.applied?'your source':'source'} ↗${reason.asof?' '+esc(reason.asof):''}</a>`:''}</span></div>`
    : (s?`<div class="vd-reason"><span class="vd-rl">Strongest on <b>${esc(s.why.join(' and '))}</b></span>${wk&&wk[1]<55?`<span class="vd-rn">Watch the weakest axis, ${esc(wk[0])} (${wk[1]}/100).</span>`:''}</div>`:'');
  card.innerHTML=`<div class="vd-id"><div class="nm big">${esc(p.name)}</div>${p.brand?`<div class="br">${esc(p.brand)}</div>`:''}</div>
    ${s?`<div class="vd-verdict"><div class="vd-score"><span class="vd-num">${s.score}</span><span class="vd-den">/ 100</span></div>
      <div class="vd-meta"><div class="vd-fit"><span class="stier ${t[1]}">${t[0]}</span> <span class="vd-for">for your values</span></div>
        <div class="vd-conf">${covLevel?`<span class="ev ${covLevel[1]}">Evidence: ${covLevel[0]}</span>`:''}<span>weighted by what you care about${s.facts<s.wanted?` · ${s.facts} of ${s.wanted} facts`:''}</span></div></div></div>`
      :`<div class="vd-conf">Excluded by your allergen filter.</div>`}
    ${s&&s.cap?`<div class="capnote">Capped at 49, you weight <b>${esc(s.cap.label)}</b> highly and it scores ${s.cap.v}/100, a dealbreaker for what you care about.</div>`:''}
    ${reasonHTML}
    ${provenancePanelHTML(p)}
    ${descHTML}${focusHTML}`;
  res.appendChild(card);
  const detailChallenge=el('div',{class:'challengebox challengebox-detail','data-cid':DATA.meta.id,'data-code':p.code});
  res.appendChild(detailChallenge);renderDetailChallengeBox(DATA.meta.id,p.code,detailChallenge);
  // The fold (interface system §1.3): one screen, one decision. Above: verdict · act row · who owns
  // it · the better picks. Below: two quiet disclosure groups holding everything else.
  const fullpic=el('details',{class:'foldgrp'});fullpic.innerHTML='<summary>The full picture, every factor, the math, corrections</summary>';
  const fpIn=el('div',{class:'fold-in'});fullpic.appendChild(fpIn);
  const around=el('details',{class:'foldgrp'});around.innerHTML='<summary>Around it, what it resembles and who it connects to</summary>';
  const arIn=el('div',{class:'fold-in'});around.appendChild(arIn);
  fpIn.appendChild(explainEl(p));
  fpIn.appendChild(postureEl(p));
  const sb=el('div',{style:'display:flex;gap:.6rem;align-items:center;margin:.1rem 0 .5rem'});
  sb.appendChild(saveToggleEl(p,true));
  const note=el('button',{class:'savebtn'},CC.icon('edit')+' note on this');
  note.onclick=()=>{feedbackContext=p.name;viewingFeedback=true;selected=null;render();};
  sb.appendChild(note);
  const share=el('button',{class:'savebtn'},'↗ Verdict card');
  share.onclick=()=>{location.hash='card/'+DATA.meta.id+'/'+encodeURIComponent(p.code);};
  sb.appendChild(share);
  const _brand=((p.brand||p.name||'').trim());
  if(_brand){const avon=avoidingBrand(p);const avb=el('button',{class:'savebtn'+(avon?' on':''),title:avon?('You’re avoiding '+_brand):('Hide '+_brand+' everywhere in your rankings')},avon?'⊘ Avoiding this brand':'⊘ Avoid this brand');avb.onclick=()=>{toggleAvoidBrand(p);render();};sb.appendChild(avb);}
  const cmp=el('button',{class:'savebtn'+(inCompare(p.code)?' on':'')},inCompare(p.code)?'⊖ Comparing':'⊕ Compare');cmp.onclick=()=>{toggleCompare(p);render();};sb.appendChild(cmp);
  res.appendChild(sb);
  res.appendChild(ownershipEl(p,DATA));      // who owns it, at the point of decision, above the fold
  if(!DATA.meta.productBase)fpIn.appendChild(correctionFormEl(p,DATA));
  res.appendChild(el('div',{class:'alts-h'},'Better for your values'));
  if(better.length){
    res.appendChild(el('div',{class:'alts-sub'},'same category, ranked higher for what you care about'));
    for(const [a,as] of better){
      const c=el('div',{class:'card click'});
      c.innerHTML=`<div class="top"><div><span class="nm">${esc(a.name)}</span>${a.brand?` <span class="br">${esc(a.brand)}</span>`:''}</div><div class="sc">${as.score}<small> /100</small></div></div>
        <div class="why">stronger on ${as.why.join(' and ')}</div>`;
      makeClickable(c,()=>openProduct(a.code),`View ${a.name}`);
      res.appendChild(c);
    }
  }else{
    res.appendChild(el('div',{class:'alts-sub'},s?'This is already your top pick here.':'Adjust your values or filters to see alternatives.'));
  }
  const act=el('a',{class:'vd-action',href:action.href}); act.innerHTML=`${esc(action.label)} →`; res.appendChild(act);
  const det=el('details',{class:'breakdown'});
  det.innerHTML=`<summary>Full breakdown · ${DATA.criteria.length} factors, shown honestly</summary>
    <div class="bars">${barsHTML(p)}</div>
    <div class="tierkey">how we know, <span class="tier t-measured">measured</span> exact open data · <span class="tier t-certified">certified</span> third-party · <span class="tier t-assessed">assessed</span> our researched judgement, shown as a band, not a false number</div>
    ${algHTML(p)}${linksHTML}
    <div class="mfoot"><span>weighted to your values, not ours · no brand pays us</span>${src}</div>`;
  fpIn.appendChild(det);
  res.appendChild(fullpic);
  arIn.appendChild(connectionsEl(p,DATA));   // THE WEAVE (G3): resembles · connected · elsewhere
  res.appendChild(around);
}
function renderSaved(){
  document.getElementById('count').textContent='';
  const res=document.getElementById('results');res.innerHTML='';
  res.appendChild(makeClickable(el('div',{class:'back'},'← back to browsing'),()=>{location.hash='explore';},'Back to browsing'));
  res.appendChild(el('div',{class:'alts-h'},`Your saved (${savedList.length})`));
  if(!savedList.length){res.appendChild(el('div',{class:'alts-sub'},'Nothing saved yet, tap '+CC.icon('heart')+' on any entry to keep it here. Saved on this device only.'));return;}
  res.appendChild(el('div',{class:'alts-sub'},'kept on this device · scored where it shares your current values'));
  for(const entry of savedList){
    const p=entry.product, sameType=(()=>{const d=(window.CC_BUNDLE&&window.CC_BUNDLE.data[entry.categoryId]);return d&&DATA&&d.meta.type===DATA.meta.type;})();
    res.appendChild(listCard(p,sameType?score(p):null,entry.category,()=>{
      viewingSaved=false;
      const cat=CATALOG.find(c=>c.id===entry.categoryId);
      if(cat&&DATA.meta.id!==entry.categoryId){setActiveCat(entry.categoryId);loadCategory(cat).then(()=>openProduct(entry.code));}
      else openProduct(entry.code);
    }));
  }
}
function renderFeedback(){
  document.getElementById('count').textContent='';
  const res=document.getElementById('results');res.innerHTML='';
  res.appendChild(makeClickable(el('div',{class:'back'},'← back to browsing'),()=>{feedbackContext=null;location.hash='explore';},'Back to browsing'));
  res.appendChild(el('div',{class:'alts-h'},'Self-test field log'));
  res.appendChild(el('div',{class:'alts-sub'},'Use this for real decisions for about two weeks. After each one, note whether it helped, what was missing, and whether you trusted it. The notes stay on this device until you export them.'));
  const form=el('div',{class:'card'});
  form.innerHTML=`${feedbackContext?`<div class="why">about: <b>${esc(feedbackContext)}</b></div>`:''}
    <div class="rx">
      <button class="savebtn" data-r="helped">it helped</button>
      <button class="savebtn" data-r="mixed">mixed</button>
      <button class="savebtn" data-r="didn't help">didn't help</button>
      <button class="savebtn" data-r="confusing">confusing</button>
      <button class="savebtn" data-r="idea">idea</button>
    </div>
    <textarea id="fnote" rows="3" placeholder="What did you notice? What worked, what didn't, what's missing, did you trust it?"></textarea>
    <div style="margin-top:.6rem"><button class="catbtn" id="fsave">Save note</button></div>`;
  res.appendChild(form);
  let reaction=null;
  form.querySelectorAll('.rx button').forEach(b=>b.onclick=()=>{reaction=(reaction===b.dataset.r)?null:b.dataset.r;form.querySelectorAll('.rx button').forEach(x=>x.classList.toggle('on',x.dataset.r===reaction));});
  form.querySelector('#fsave').onclick=()=>{const t=form.querySelector('#fnote').value.trim();if(!t&&!reaction)return;addFeedback(reaction,t);feedbackContext=null;render();};
  if(feedbackList.length){
    const bar=el('div',{style:'display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap;margin:1.5rem 0 .6rem'});
    bar.appendChild(el('span',{class:'alts-h',style:'margin:0'},`${feedbackList.length} note${feedbackList.length>1?'s':''}`));
    const grp=el('div',{style:'display:flex;gap:.5rem;flex-wrap:wrap'});
    const rep=el('button',{class:'savetag'},'self-test report (.md)');rep.onclick=exportSelfTestReport;grp.appendChild(rep);
    const exp=el('button',{class:'savetag'},'export notes (.json)');exp.onclick=exportFeedback;grp.appendChild(exp);
    bar.appendChild(grp);
    res.appendChild(bar);
    for(const f of feedbackList){
      const c=el('div',{class:'card'});
      c.innerHTML=`<div class="why">${f.reaction?`<b>${esc(f.reaction)}</b> · `:''}${esc(f.context.category||'')}${f.context.product?` · ${esc(f.context.product)}`:''} · values: ${esc(f.context.values||'')}</div>
        ${f.note?`<div>${esc(f.note)}</div>`:''}`;
      const del=el('button',{class:'savebtn',style:'margin-top:.6rem'},'delete');
      del.onclick=()=>{feedbackList=feedbackList.filter(x=>x!==f);persistFeedback();updateNotesBtn();render();};
      c.appendChild(del);res.appendChild(c);
    }
  }
}
function render(){
  if(!DATA)return;
  // A leaf is a leaf: on an item page the category directory, tune panel, facets and count are the
  // list's chrome, not the item's. Hiding them (CSS, .leaf) is what keeps a searched product from
  // opening under a full category menu — the founder's ambush report. The DOM stays intact so the
  // search box, sort and region keep their values for the way back.
  const _ev=document.getElementById('view-explore');
  if(_ev)_ev.classList.toggle('leaf',!!selected&&!viewingSaved&&!viewingFeedback);
  viewingFeedback?renderFeedback():viewingSaved?renderSaved():selected?renderDetail():renderList();
  if(selected)renderCrumbs();
}

function applyPreset(name){
  const pr=curPresets()[name];if(!pr)return;weights={...pr.w};excludes=new Set(pr.x||[]);rerankPing=true;
  for(const cr of DATA.criteria){const i=document.getElementById('w_'+cr.key);if(i){i.value=weights[cr.key]||0;sliderFill(i);document.getElementById('v_'+cr.key).textContent=weights[cr.key]||0;}}
  document.querySelectorAll('.filters input').forEach(cb=>cb.checked=excludes.has(cb.value));
  render();updateProfile();announce('Applied the '+name+' preset. '+presetSummary(pr));
}
function sliderFill(inp){const max=+inp.max||5;const pct=(+inp.value/max)*100;inp.style.background='linear-gradient(90deg,var(--accent) '+pct+'%,var(--track) '+pct+'%)';} // green fill up to the thumb (bespoke slider)
function buildControls(){
  // The errand bar — one trade-off, in the category's own words, where the lens declares (or seeds) a real
  // tension. This is the primary tuning control now; the full slider wall lives on under "fine-tune".
  const eb=document.getElementById('errandbar');
  if(eb){
    const ax=catAxes();
    if(ax.tradeoff){
      const t=(errandPos[DATA.meta.id]!=null)?errandPos[DATA.meta.id]:50;
      eb.innerHTML=`<div class="errand"><span class="er-l">${esc(ax.labels[0])}</span><input id="errandrange" type="range" min="0" max="100" step="5" value="${t}" aria-label="Trade-off: ${esc(ax.labels[0])} versus ${esc(ax.labels[1])}"><span class="er-r">${esc(ax.labels[1])}</span></div><p class="er-hint">Slide toward what matters most for this choice. Everything else stays weighted by your values.</p>`;
      const r=document.getElementById('errandrange');
      sliderFill(r);
      r.addEventListener('input',e=>{const v=+e.target.value;errandPos[DATA.meta.id]=v;saveErrandPos();sliderFill(e.target);applyErrand(v);});
      if(errandPos[DATA.meta.id]!=null)applyErrand(t); // returning to a category you tuned: your setting still holds
    } else eb.innerHTML='';
  }
  const sl=document.getElementById('sliders');sl.innerHTML='';
  // P2 — group the fine-tune sliders UNDER their value theme, so the theme↔criteria relationship is visible
  // (one coherent control echoing the theme chips, not three stacked weighting systems). IDs/handlers unchanged.
  const addSlider=(parent,cr)=>{
    const row=el('div',{class:'slider'});
    row.innerHTML=`<label for="w_${cr.key}">${esc(cr.label)}</label><input id="w_${cr.key}" type="range" min="0" max="5" step="1" value="${weights[cr.key]||0}"><span class="v" id="v_${cr.key}">${weights[cr.key]||0}</span>`;
    parent.appendChild(row);
    const inp=row.querySelector('input'); sliderFill(inp);
    inp.addEventListener('input',e=>{weights[cr.key]=+e.target.value;document.getElementById('v_'+cr.key).textContent=e.target.value;sliderFill(e.target);rerankPing=true;scheduleRerank();});
  };
  const byTheme={}, order=[];
  for(const cr of DATA.criteria){const th=KEY2THEME[cr.key]||'other';if(!byTheme[th]){byTheme[th]=[];order.push(th);}byTheme[th].push(cr);}
  for(const th of order){
    const meta=THEMES.find(t=>t.id===th);
    const grp=el('div',{class:'slidergroup'});
    grp.appendChild(el('div',{class:'sgh-theme'},meta?meta.icon+' '+esc(meta.label):'Other factors'));
    const inner=el('div',{class:'sliders-in'});
    byTheme[th].forEach(cr=>addSlider(inner,cr));
    grp.appendChild(inner);
    sl.appendChild(grp);
  }
  const ff=document.getElementById('filters');ff.innerHTML='<span>Exclude:</span>';ff.style.display=DATA.meta.allergens?'':'none';
  if(DATA.meta.allergens)for(const k in ALLERGEN_LABELS){
    const lab=el('label',{},`<input type="checkbox" value="${k}"> ${ALLERGEN_LABELS[k]}`);
    lab.querySelector('input').addEventListener('change',e=>{e.target.checked?excludes.add(k):excludes.delete(k);YOU.allergens=[...excludes];saveYou();render();updateProfile();});
    ff.appendChild(lab);
  }
  const pr=document.getElementById('presets');pr.innerHTML='';
  const P=curPresets();
  const pnote=el('p',{class:'hint presetnote',id:'presetnote',style:'flex-basis:100%;margin:.3rem 0 0;min-height:1.15em'});
  for(const name in P){const sum=presetSummary(P[name]);const b=el('button',{title:sum,'aria-label':name+(sum?', '+sum:'')},name);const show=()=>{pnote.textContent=sum;};b.addEventListener('mouseenter',show);b.addEventListener('focus',show);b.onclick=()=>applyPreset(name);pr.appendChild(b);}
  pr.appendChild(pnote);
  const sort=document.getElementById('sort');
  let opts=`<option value="score">Sort: best for you</option><option value="name">Sort: name (A–Z)</option>`;
  for(const cr of DATA.criteria)opts+=`<option value="${cr.key}">Sort: best on ${cr.label.toLowerCase()}</option>`;
  sort.innerHTML=opts;sort.value=sortBy;
  const reg=document.getElementById('region');
  if(reg){const rset=new Set();for(const p of DATA.products)if(p.region)for(const r of p.region)if(r!=='global')rset.add(r);
    let ropts='<option value="everywhere">Region: everywhere</option>';
    for(const r of [...rset].sort())ropts+=`<option value="${esc(r)}">Region: ${esc(regionLabel(r))}</option>`;
    reg.innerHTML=ropts;reg.value=regionFilter;reg.title=REGION_SCOPE;reg.setAttribute('aria-label','Region coverage');reg.style.display=rset.size?'':'none';}
  document.querySelectorAll('.filters input').forEach(cb=>cb.checked=excludes.has(cb.value));
  updateProfile();
}
function wireStaticControls(){
  document.getElementById('sort').addEventListener('change',e=>{sortBy=e.target.value;render();updateProfile();});
  const reg=document.getElementById('region');if(reg)reg.addEventListener('change',e=>{regionFilter=e.target.value;YOU.region=regionFilter;saveYou();updateNavRegion();render();updateProfile();});
  document.getElementById('q').addEventListener('input',()=>{if(!selected&&!viewingSaved&&!viewingFeedback)render();});
  const rb=document.getElementById('profreset');if(rb)rb.onclick=()=>{try{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(THEMES_KEY);}catch(e){}THEMES.forEach(t=>themeWeights[t.id]=3);excludes=new Set(YOU.allergens);regionFilter=YOU.region;const rg=document.getElementById('region');if(rg)rg.value=regionFilter;applyThemes();};
}

// Lazy data layer (P2): when SERVED, the ~5 MB data.js bundle is no longer loaded up front — only ./data/index.json
// (categories + criteria + ontology, small). Each category's products load on demand and cache in CC_BUNDLE.data.
// (When opened from file://, where fetch is blocked, boot() injects data.js instead — see boot().)
// ── Local patch overlay — the RECEIVING half of federation: corrections YOU apply, on THIS device. Reproducible,
//    clearable, never uploaded. The same engine.mergeLens that *creates* a patch also *applies* one (facts federate by file). ──
const PATCH_KEY='cc.patches';
let patchOverlay=(function(){try{return JSON.parse(localStorage.getItem(PATCH_KEY)||'{}')||{};}catch(e){return {};}})();
function savePatchOverlay(){try{localStorage.setItem(PATCH_KEY,JSON.stringify(patchOverlay));}catch(e){}}
function overlayCount(cid){return (patchOverlay[cid]||[]).length;}
const CC_ORIG={}; // pristine, un-overlaid facts, so the overlay can be re-applied or cleared without a refetch
function applyOverlay(ds){
  if(!ds||!ds.meta)return ds;
  const cid=ds.meta.id, ps=patchOverlay[cid]||[];
  if(!ps.length||!(window.CC&&CC.engine))return ds;                  // no corrections → pristine data, zero overhead
  if(!CC_ORIG[cid])CC_ORIG[cid]=JSON.parse(JSON.stringify(ds));       // remember the original facts once
  try{
    const res=CC.engine.mergeLens(CC_ORIG[cid],ps), m=res.lens, ents=m.products||m.resources||[];
    for(const l of res.log){if(l.op==='set-score'&&!l.status&&l.code&&l.key){const en=ents.find(x=>x.code===l.code);if(en&&en.provenance&&typeof en.provenance[l.key]==='object')en.provenance[l.key]._applied=true;}} // mark corrected facts so they never read as the original source
    m.meta=Object.assign({},CC_ORIG[cid].meta,{corrected:ps.length}); return m;
  }catch(e){return ds;}
}
function reapplyOverlay(cid){
  if(!(window.CC_BUNDLE&&window.CC_BUNDLE.data))return;
  if(!CC_ORIG[cid]&&window.CC_BUNDLE.data[cid])CC_ORIG[cid]=JSON.parse(JSON.stringify(window.CC_BUNDLE.data[cid]));
  if(!CC_ORIG[cid])return;                                            // not loaded yet → it overlays on next load
  window.CC_BUNDLE.data[cid]=applyOverlay(CC_ORIG[cid]);
  if(DATA&&DATA.meta.id===cid)DATA=window.CC_BUNDLE.data[cid];
}
function applyPatchLocally(patch){
  const cid=patch&&patch.target; if(!cid||!Array.isArray(patch.ops))return {ok:false,reason:'invalid'};
  const sig=JSON.stringify(patch.ops);
  if((patchOverlay[cid]||[]).some(x=>JSON.stringify(x.ops||[])===sig))return {ok:false,reason:'duplicate',cid:cid};
  // dry-run against the pristine facts so we can tell the user what actually changed (vs targets-you-don't-have)
  let applied=0,missed=0; const base=CC_ORIG[cid]||(window.CC_BUNDLE&&window.CC_BUNDLE.data&&window.CC_BUNDLE.data[cid]);
  if(base&&window.CC&&CC.engine){try{for(const l of CC.engine.mergeLens(base,[patch]).log){if(l.op){l.status?missed++:applied++;}}}catch(e){}}
  patchOverlay[cid]=(patchOverlay[cid]||[]).concat([patch]); savePatchOverlay(); reapplyOverlay(cid);
  return {ok:true,applied:applied,missed:missed,cid:cid};
}
function clearOverlay(cid){
  if(cid)delete patchOverlay[cid]; else patchOverlay={};
  savePatchOverlay();
  if(cid)reapplyOverlay(cid); else Object.keys(CC_ORIG).forEach(function(k){reapplyOverlay(k);});
}
function overlayAllLoaded(){const data=window.CC_BUNDLE&&window.CC_BUNDLE.data;if(!data)return;for(const cid in patchOverlay){if((patchOverlay[cid]||[]).length&&data[cid])reapplyOverlay(cid);}} // file:// preloads all data (not via getDataset), overlay it at boot for consistency with served mode
let _fullDataBundleP=null;
function loadFullDataBundle(){
  const current=window.CC_BUNDLE&&window.CC_BUNDLE.data;if(current&&Object.keys(current).length>1)return Promise.resolve(current);
  if(_fullDataBundleP)return _fullDataBundleP;
  _fullDataBundleP=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./data.js';s.onload=()=>resolve((window.CC_BUNDLE&&window.CC_BUNDLE.data)||{});s.onerror=()=>reject(new Error('full data bundle unavailable'));document.head.appendChild(s);});
  return _fullDataBundleP;
}
function getDataset(cat){
  const c=window.CC_BUNDLE&&window.CC_BUNDLE.data&&window.CC_BUNDLE.data[cat.id];
  if(c)return Promise.resolve(c);
  return fetch('./data/'+(cat.file||cat.id+'.json')).then(r=>r.ok?r.json():Promise.reject(new Error('HTTP '+r.status))).then(applyOverlay).catch(primary=>loadFullDataBundle().then(data=>{const fallback=data&&data[cat.id];if(!fallback)throw primary;return applyOverlay(fallback);}));
}
function loadAllCategories(){ // cross-category views (search, discover) need every category's products
  const need=(CATALOG||[]).filter(c=>!(window.CC_BUNDLE&&window.CC_BUNDLE.data&&window.CC_BUNDLE.data[c.id]));
  if(!need.length)return Promise.resolve();
  return Promise.all(need.map(c=>getDataset(c).then(ds=>{if(window.CC_BUNDLE)window.CC_BUNDLE.data[c.id]=ds;}).catch(()=>{}))).then(()=>{});
}
function loadCategory(cat){
  return getDataset(cat).then(d=>{
    DATA=d;selected=null;
    if(window.CC_BUNDLE&&window.CC_BUNDLE.data)window.CC_BUNDLE.data[d.meta.id]=d; // cache the loaded category
    const noun=DATA.meta.type==='Products'?'products':'entries';
    document.getElementById('attr').textContent=`${d.meta.n} ${d.meta.label.toLowerCase()} ${noun} · ${d.meta.attribution}`;
    const critKey=DATA.criteria.map(c=>c.key).join(',');
    if(critKey!==builtCriteria){
      const first=!builtCriteria;
      const sv=loadProfile();
      weights=themeDefaults(DATA.criteria);  // your value-themes derive the weights everywhere; presets/sliders override in-session
      excludes=new Set(YOU.allergens);       // standing: your allergens follow you into every category
      regionFilter=YOU.region;               // standing: your region default travels too
      // Honest default sort: a category with a declared point (primaryAxis) opens sorted by that point —
      // educational media by educational value. Your saved sort for THIS category still wins; "best for you"
      // is always one tap away in the dropdown.
      const _ax=catAxes();
      sortBy=(sv&&sv.category===d.meta.id&&sv.sortBy)?sv.sortBy:(_ax.primary||'score');
      buildControls();
      if(first)wireStaticControls();
      builtCriteria=critKey;
    }
    renderThemes();
    render();
  }).catch(()=>{
    // a category fetch failed (offline, or a bad/missing file) — show a calm recoverable state, never a silent hang
    const r=document.getElementById('results');
    if(r)r.innerHTML='<div class="onboard" style="border-color:var(--warn)"><b>Couldn’t load '+esc(cat.label||cat.id)+'.</b> Check your connection and try again. Saved preferences and lists remain on this device.</div>';
    const a=document.getElementById('attr');if(a)a.textContent='';
    const c=document.getElementById('count');if(c)c.textContent='';
    const e=document.getElementById('evcov');if(e)e.textContent='';
  });
}

// --- portal: views + router ---
function decisionCriterionLabel(criterion){
  const label=String((criterion&&criterion.label)||'').trim();
  if(/^economical$/i.test(label))return 'cost';
  if(/^low sugar$/i.test(label))return 'sugar';
  return label.toLowerCase();
}
function decisionList(items){
  const clean=items.filter(Boolean);
  if(clean.length<2)return clean[0]||'';
  if(clean.length===2)return clean[0]+' and '+clean[1];
  return clean.slice(0,-1).join(', ')+', and '+clean[clean.length-1];
}
function categoryMatterLine(category){
  const criteria=(category&&category.criteria)||catCriteria(category&&category.id);
  const labels=[];
  for(const criterion of (criteria||[])){
    const label=decisionCriterionLabel(criterion);
    if(label&&!labels.includes(label))labels.push(label);
    if(labels.length===3)break;
  }
  return labels.length?'What matters: '+labels.join(' · '):'Open the decision to see what differs';
}
function domainDifferencesSentence(categories){
  const frequency=new Map(), firstSeen=new Map(), seenCategories=new Set();let order=0;
  for(const category of (categories||[])){
    const categoryId=category&&category.id;if(categoryId&&seenCategories.has(categoryId))continue;
    if(categoryId)seenCategories.add(categoryId);
    for(const criterion of (category.criteria||catCriteria(category.id)||[])){
      const label=decisionCriterionLabel(criterion);if(!label)continue;
      if(!firstSeen.has(label))firstSeen.set(label,order++);
      frequency.set(label,(frequency.get(label)||0)+1);
    }
  }
  const labels=[...frequency].sort((a,b)=>(b[1]-a[1])||(firstSeen.get(a[0])-firstSeen.get(b[0]))).slice(0,3).map(x=>x[0]);
  return labels.length?'Choices here differ on '+decisionList(labels)+'.':'Open a decision to see what differs and why.';
}
function needRegistry(){
  const ont=window.CC_BUNDLE&&window.CC_BUNDLE.ontology;
  return (ont&&ont.needs)||[];
}
function needById(id){return needRegistry().find(n=>n.id===id)||null;}
function needForCategory(category){return category&&category.need?needById(category.need):null;}
function needRouteForCategory(category){const n=needForCategory(category);return n?('#need/'+encodeURIComponent(n.id)):'#map';}
// Old domain links remain valid, but the canonical parent is now the need that holds most of that
// domain's mapped rows. Deriving this from ontology v4 keeps the redirect honest as the map grows.
function legacyDomainNeedId(label){
  const dl=decodeURIComponent(label||''), ont=window.CC_BUNDLE&&window.CC_BUNDLE.ontology, tally=new Map();
  const rows=[];
  if(ont&&ont.domains){const d=ont.domains.find(x=>x.label===dl);if(d)rows.push(...(d.categories||[]));}
  for(const row of rows){if(row.need)tally.set(row.need,(tally.get(row.need)||0)+1);}
  if(!tally.size)for(const c of (CATALOG||[])){if(c.domain===dl&&c.need)tally.set(c.need,(tally.get(c.need)||0)+1);}
  const order=needRegistry().map(n=>n.id);
  return [...tally].sort((a,b)=>(b[1]-a[1])||(order.indexOf(a[0])-order.indexOf(b[0])))[0]?.[0]||'';
}
function commonsMapHTML(){
  // a calm, by-domain summary (the full per-category map lives in Browse)
  const ont=window.CC_BUNDLE&&window.CC_BUNDLE.ontology;
  const order=(ont&&ont.domains||[]).map(d=>d.label);
  const by={};
  for(const c of CATALOG){const d=c.domain||'Other';(by[d]=by[d]||[]).push(c);}
  const labels=order.length?order:Object.keys(by);
  let out='';
  for(const dl of labels){const cats=by[dl];
    if(cats) out+=`<a class="ctype live" href="#domain/${encodeURIComponent(dl)}"><span class="nm">${esc(dl)}</span><span class="badge live">ready</span><span class="sub">${esc(domainDifferencesSentence(cats))}</span></a>`;
    else out+=`<a class="ctype growing" href="#domain/${encodeURIComponent(dl)}"><span class="nm">${esc(dl)}</span><span class="badge">growing</span><span class="req">soon →</span></a>`;
  }
  return out;
}
// The home spotlight ROTATES across domains each visit, so the front door is never just "banking" — it shows
// the breadth of ways to vote with your money. Each spotlight is an honest, open question into a category —
// and each now carries a real, SOURCED proof pair: a low + a high verdict, both linking to the receipts.
// (Causes shows two strong picks instead — a curated set of vetted nonprofits has no honest "ranks low".)
// homeSpotlight() rotates uniformly, so proof shows whichever question appears AND we never lead with
// banking (Bentley's critique). Every code below is verified to resolve and to score in its stated band.
const HOME_SPOTLIGHTS=[
  {cid:'banking', q:"Does your bank fund fossil fuels?", s:"JPMorgan Chase financed about <b>$58&nbsp;billion</b> in fossil fuels in 2025. See where your bank stands, and where to move your money.", link:"See the banks",
    proof:{a:{cid:'banking',code:'chase',band:'low',name:'JPMorgan Chase',tag:"World's #1 fossil-fuel financier"},
           b:{cid:'banking',code:'triodos',band:'high',name:'Triodos Bank',tag:'Publishes every loan it makes'}}},
  {cid:'phones', q:"Is your phone built to last, or to be replaced?", s:"Repairability and longevity vary hugely between makers, and the phone you can fix is the greenest one you'll ever own.", link:"Compare phones",
    proof:{a:{cid:'phones',code:'asus-rog-zenfone',band:'low',name:'ASUS ROG Phone',tag:'Hard to repair · ~2 years of updates'},
           b:{cid:'phones',code:'fairphone',band:'high',name:'Fairphone',tag:'Repairable · 8 years of updates'}}},
  {cid:'coffee', q:"Who actually gets paid for your morning coffee?", s:"Fair-trade, shade-grown, and the roaster down the road each change the answer. Brew it in line with your values.", link:"Compare coffee",
    proof:{a:{cid:'coffee',code:'7613036943765',band:'low',name:'Starbucks Dolce Gusto pod',tag:'Ultra-processed · Nutri-Score E'},
           b:{cid:'coffee',code:'4000799108716',band:'high',name:'Mount Hagen',tag:'Organic, fair-trade · just coffee'}}},
  {cid:'ai-assistants', q:"Is your AI assistant on your side?", s:"Privacy, openness and honest design are what separate the tools that serve you from the ones that mine you.", link:"Compare AI assistants",
    proof:{a:{cid:'ai-assistants',code:'character-ai',band:'low',name:'Character.AI',tag:'Keeps your chats to train its AI'},
           b:{cid:'ai-assistants',code:'gpt4all',band:'high',name:'GPT4All',tag:'Runs on your device, data stays local'}}},
  {cid:'causes-to-support', q:"Where would a little giving do the most good?", s:"Sent well, a small amount goes a long way. Compare causes by transparency and the real-world good they do.", link:"Find a cause",
    proof:{intro:'Two you can back, and see exactly why',
           a:{cid:'causes-to-support',code:'givewell',band:'high',name:'GiveWell',tag:'Even publishes its own mistakes'},
           b:{cid:'causes-to-support',code:'eff',band:'high',name:'EFF',tag:'Digital rights &middot; open books since 1990'}}}
];
function homeSpotlight(avoidCid){
  // Every spotlight now carries its own real, sourced proof pair, so a first-time visitor sees a concrete
  // verdict whichever one shows — which lets us rotate freely and NEVER lead with banking (Bentley's critique).
  const pool=HOME_SPOTLIGHTS.filter(x=>x.cid!==avoidCid);
  const from=pool.length?pool:HOME_SPOTLIGHTS;   // one spotlight left in the file is still an answer
  return from[Math.floor(Math.random()*from.length)];
}
// The wedge redraws itself rather than the page, so asking for another question keeps your scroll
// position, the map you were pointing at, and anything typed in the search field.
function spotlightHTML(sp){
  return `<div class="home-question-head">
      <h2 class="wedge-q">${esc(sp.q)}</h2>
      <button type="button" class="wedge-again" id="wedge-again" title="Ask a different question" aria-label="Ask a different question">${CC.icon('refresh')||'&#8635;'}</button>
    </div>
    <p class="wedge-s">${esc(sp.s)}</p>
    <div class="proof-intro">${esc((sp.proof&&sp.proof.intro)||'Two real options. Sources open.')}</div>
    <div class="proof">${proofCard(sp.proof.a)}${proofCard(sp.proof.b)}</div>
    <a class="home-question-link" href="#explore/${sp.cid}">${esc(sp.link)} &rarr;</a>`;
}
function wireSpotlight(sp){
  const box=document.getElementById('home-question');if(!box)return;
  box.dataset.cid=sp.cid;
  const btn=document.getElementById('wedge-again');if(!btn)return;
  btn.onclick=()=>{
    const next=homeSpotlight(box.dataset.cid);
    box.innerHTML=spotlightHTML(next);
    wireSpotlight(next);
    const q=box.querySelector('.wedge-q');if(q){q.setAttribute('tabindex','-1');q.focus({preventScroll:true});}
  };
}
// One proof card: a real entry that genuinely scores in its band, linking through to the sourced verdict.
function proofCard(c){return `<a class="proofcard ${c.band}" href="#card/${c.cid}/${encodeURIComponent(c.code)}"><span class="proof-name">${esc(c.name)}</span><span class="proof-tag">${esc(c.tag)}</span><span class="proof-see">${esc(c.see||'open the sourced verdict')} &rarr;</span></a>`;}
// T1 — the 5-second home demo: three real phones from the real dataset, re-ranked LIVE by the real engine
// as you tap a value chip. The thesis, SHOWN, before any reading. Chosen because the #1 genuinely changes
// per value (climate → the repairable rugged phone; cost → the budget line; ethics → per the sourced facts).
// Honest by construction: scores come from getDataset() at tap-time, never hardcoded; if the data moves on
// and a code disappears, the demo hides rather than fakes. Session-only — it never touches your saved values.
const HOME_DEMO={cid:'phones',codes:['iphone','galaxy-a-series','samsung-xcover-rugged'],
  chips:[{th:'planet',label:'Climate',icon:CC.icon('globe')},{th:'cost',label:'Cost',icon:CC.icon('tag')},{th:'people',label:'Ethics',icon:CC.icon('people')}]};
let demoTheme=null;
function initHomeDemo(){
  const box=document.getElementById('homedemo');if(!box)return;
  const cat=(CATALOG||[]).find(c=>c.id===HOME_DEMO.cid);if(!cat)return;
  getDataset(cat).then(ds=>{
    if(!ds||!ds.products||!ds.criteria)return;
    const entries=HOME_DEMO.codes.map(c=>ds.products.find(p=>p.code===c)).filter(Boolean);
    if(entries.length!==HOME_DEMO.codes.length)return;   // data moved on → stay hidden, never fake
    box.hidden=false;renderHomeDemo(ds,entries);
  }).catch(()=>{});
}
function renderHomeDemo(ds,entries){
  const chipsBox=document.getElementById('hd-chips'),list=document.getElementById('hd-list');
  if(!chipsBox||!list)return;
  chipsBox.innerHTML=HOME_DEMO.chips.map(ch=>`<button type="button" class="themechip hd-chip${demoTheme===ch.th?' on':''}" data-th="${ch.th}" aria-pressed="${demoTheme===ch.th}">${hueDot(ch.th)}${ch.label}</button>`).join('');
  chipsBox.querySelectorAll('.hd-chip').forEach(b=>b.onclick=()=>{demoTheme=(demoTheme===b.dataset.th)?null:b.dataset.th;renderHomeDemo(ds,entries);});
  const tw={};THEMES.forEach(t=>tw[t.id]=3);if(demoTheme)tw[demoTheme]=5;
  const w=CC.engine.themeDefaults(ds.criteria,tw,KEY2THEME);
  const ranked=entries.map(p=>[p,CC.engine.score(p,{criteria:ds.criteria,weights:w})]).filter(x=>x[1]).sort((a,b)=>b[1].score-a[1].score);
  const first={};for(const ch of list.children){const c=ch.dataset&&ch.dataset.code;if(c)first[c]=ch.getBoundingClientRect();}
  list.innerHTML=ranked.map(([p,s],i)=>`<a class="hd-row${i===0?' lead':''}" data-code="${esc(p.code)}" href="#card/${HOME_DEMO.cid}/${encodeURIComponent(p.code)}"><span class="hd-rk">${i+1}</span><span class="hd-nm">${esc(p.name)}</span><span class="hd-why">${i===0&&s.why&&s.why.length?'strongest on '+esc(s.why[0].toLowerCase()):''}</span><span class="hd-sc">${s.score}<small>/100</small></span></a>`).join('');
  flipPlay(list,first);
  const st=document.getElementById('hd-status');
  if(st){const chip=HOME_DEMO.chips.find(c=>c.th===demoTheme);st.textContent=chip?`${chip.label} weighs more now. Same facts, new order.`:'All three values weigh the same right now. Tap one.';}
}
function renderHome(){
  const v=document.getElementById('view-home');
  const sp=homeSpotlight();
  /* THE FRONT PAGE IS THE TOOL.
     Two corrections in one day. It began as seventeen blocks and seven ways to start, with the
     tool crammed into the right half under four hundred words of instructions. I replaced that
     with a sentence and a list of every decision by name, which fixed the clutter and lost the
     product: a hundred and fifteen links is a wall, and a wall is not something you use.

     So the tool is the page now. No slogan above it, because a headline that argues with the
     reader is taking room from the thing they came to use, and the argument is already made
     everywhere else on the site. A field to type into, the plate of every decision, and the
     measures that light it. Nothing else. */
  const total=(CATALOG||[]).length;
  const savedMapMode=homeMapState&&homeMapState.mode==='fisheye'?'fisheye':'spatial';
  const savedMapHelp=savedMapMode==='fisheye'
    ?'Move away from the centre to travel; move farther to go faster. The overview marks your position.'
    :'Zoom from eight needs to areas, kinds, decisions, and evidence.';
  v.innerHTML=`
    <section class="home-nexus" aria-labelledby="home-title">
      <div class="nexus-titlebar">
        <div class="nexus-titlecopy">
          <h1 id="home-title" class="nexus-h">Your Navigation Nexus</h1>
          <p class="nexus-sub">Vote with your dollar, steward your attention, and subvert marketing with your values.</p>
        </div>
        <a class="home-institute" href="https://futurisminstitute.org/" target="_blank" rel="noopener">
          <svg class="home-institute-sun" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="7.5"/><line class="sun-ray" x1="30.50" y1="20.00" x2="38.00" y2="20.00"/><line class="sun-ray sun-ray--dotted" x1="30.14" y1="22.72" x2="34.49" y2="23.88"/><line class="sun-ray" x1="29.09" y1="25.25" x2="35.59" y2="29.00"/><line class="sun-ray sun-ray--dotted" x1="27.42" y1="27.42" x2="30.61" y2="30.61"/><line class="sun-ray" x1="25.25" y1="29.09" x2="29.00" y2="35.59"/><line class="sun-ray sun-ray--dotted" x1="22.72" y1="30.14" x2="23.88" y2="34.49"/><line class="sun-ray" x1="20.00" y1="30.50" x2="20.00" y2="38.00"/><line class="sun-ray sun-ray--dotted" x1="17.28" y1="30.14" x2="16.12" y2="34.49"/><line class="sun-ray" x1="14.75" y1="29.09" x2="11.00" y2="35.59"/><line class="sun-ray sun-ray--dotted" x1="12.58" y1="27.42" x2="9.39" y2="30.61"/><line class="sun-ray" x1="10.91" y1="25.25" x2="4.41" y2="29.00"/><line class="sun-ray sun-ray--dotted" x1="9.86" y1="22.72" x2="5.51" y2="23.88"/><line class="sun-ray" x1="9.50" y1="20.00" x2="2.00" y2="20.00"/><line class="sun-ray sun-ray--dotted" x1="9.86" y1="17.28" x2="5.51" y2="16.12"/><line class="sun-ray" x1="10.91" y1="14.75" x2="4.41" y2="11.00"/><line class="sun-ray sun-ray--dotted" x1="12.58" y1="12.58" x2="9.39" y2="9.39"/><line class="sun-ray" x1="14.75" y1="10.91" x2="11.00" y2="4.41"/><line class="sun-ray sun-ray--dotted" x1="17.28" y1="9.86" x2="16.12" y2="5.51"/><line class="sun-ray" x1="20.00" y1="9.50" x2="20.00" y2="2.00"/><line class="sun-ray sun-ray--dotted" x1="22.72" y1="9.86" x2="23.88" y2="5.51"/><line class="sun-ray" x1="25.25" y1="10.91" x2="29.00" y2="4.41"/><line class="sun-ray sun-ray--dotted" x1="27.42" y1="12.58" x2="30.61" y2="9.39"/><line class="sun-ray" x1="29.09" y1="14.75" x2="35.59" y2="11.00"/><line class="sun-ray sun-ray--dotted" x1="30.14" y1="17.28" x2="34.49" y2="16.12"/></svg>
          <span class="home-institute-copy">
            <small>An independent commons</small>
            <strong>Futurism Institute</strong>
          </span>
        </a>
      </div>
    </section>
    <ul class="nexus-row">
        <li class="nexus-item">
          <a class="nexus-head" href="../passport/index.html">Private</a>
          <div class="nexus-panel"><div class="nexus-panel-in">
            <p>There is no account and nothing is tracked. Your rules and saved lists are files on this device. The values file you can export holds weights and deal-breakers, and no name attached to them.</p>
            <ul class="nexus-links">
              <li><a href="../passport/index.html">What is stored, and what never leaves the device</a></li>
              <li><a href="#guide/the-anti-app">Why there is no account and no feed</a></li>
              <li><a href="#you">Set your own rules and deal-breakers</a></li>
            </ul>
          </div></div>
        </li>
        <li class="nexus-item">
          <a class="nexus-head" href="../assembly/index.html">Democratic</a>
          <div class="nexus-panel"><div class="nexus-panel-in">
            <p>Anyone can propose a change, and every proposal names the record it would alter. Discussions stay public, including the ones that reach no agreement. The governance here is an experiment and is labelled as one.</p>
            <ul class="nexus-links">
              <li><a href="../assembly/index.html">The assembly, where proposals are discussed</a></li>
              <li><a href="../workshop/index.html">Update an entry yourself, with a source</a></li>
              <li><a href="#contribute">Open a correction or a question</a></li>
            </ul>
          </div></div>
        </li>
        <li class="nexus-item">
          <a class="nexus-head" href="#guide/how-scores-work">Transparent</a>
          <div class="nexus-panel"><div class="nexus-panel-in">
            <p>Every fact shows its source and the date it was checked. Scores are computed from the weights you set. Corrections keep their history and thin evidence is labelled as thin. Nobody pays to be ranked.</p>
            <ul class="nexus-links">
              <li><a href="#guide/how-scores-work">How a score is built, step by step</a></li>
              <li><a href="./c/">Every verdict in the open, with its sources</a></li>
              <li><a href="../funders/index.html">Who pays for this work</a></li>
            </ul>
          </div></div>
        </li>
        <li class="nexus-item">
          <a class="nexus-head" href="../index.html">Evolving</a>
          <div class="nexus-panel"><div class="nexus-panel-in">
            <p>A working draft, changed by what readers report. It belongs to the Futurism Institute, which builds civic instruments for an age of machine abundance, and the drafts here say they are drafts.</p>
            <ul class="nexus-links">
              <li><a href="https://futurisminstitute.org/" target="_blank" rel="noopener">What the Futurism Institute is for</a></li>
              <li><a href="../index.html">The rest of the Values Commons</a></li>
              <li><a href="#contribute">Tell us what is wrong here</a></li>
            </ul>
          </div></div>
        </li>
        <li class="nexus-item nexus-item--wide">
          <a class="nexus-head nexus-lead" href="#map">Organize anything</a>
          <div class="nexus-panel"><div class="nexus-panel-in">
            <p>One common explorer for the things you buy, use, watch, support, join, and depend upon.</p>
            <p class="nexus-types">Products &middot; Services &middot; Media &middot; Organizations &middot; Initiatives</p>
            <p>Sixteen realms, eighty-five fields, more than a thousand decisions, each with an id that stays put.</p>
            <ul class="nexus-links">
              <li><a href="#map">Open the explorer</a></li>
              <li><a href="../standard/index.html">How the index works, and why the ids stay put</a></li>
              <li><a href="./c/">The five kinds of thing, one at a time</a></li>
            </ul>
          </div></div>
        </li>
      </ul>
    <section class="home-tool" aria-label="Search and browse decisions">
      <form class="hsearch home-search" id="hsearch">
        <label for="hq">What are you choosing?</label>
        <div class="home-search-row"><input type="search" id="hq" placeholder="${tr('home.search')}" autocomplete="off"><button type="submit" class="valuescta">${tr('home.searchBtn')}</button></div>
      </form>
      <div class="homelens-modes">
        <span class="homelens-mode-label">Map view</span>
        <div class="homelens-mode-switch" role="group" aria-label="Choose how to navigate the map">
          <button type="button" data-map-mode="spatial" aria-pressed="${savedMapMode==='spatial'}">Spatial</button>
          <button type="button" data-map-mode="fisheye" aria-pressed="${savedMapMode==='fisheye'}">Fisheye</button>
        </div>
        <p id="homelens-mode-help">${savedMapHelp}</p>
      </div>
      <div class="homelens-trail">
        <span aria-hidden="true">You are here</span>
        <nav class="homelens-trail-path" id="homelens-trail-path" aria-label="Current map location"><span aria-current="location">All needs / areas</span></nav>
        <small id="homelens-trail-hint">Choose an area to see the kinds inside.</small>
      </div>
      <div class="homelens-viewbar">
        <span class="homelens-view-label">View</span>
        <div class="homelens-viewsteps" id="homelens-viewsteps" role="group" aria-label="Choose map depth"></div>
        <button type="button" class="homelens-reset" id="homelens-reset">Start over</button>
      </div>
      <div class="homelens" id="homelens" style="width:100%;max-width:1040px;height:min(660px,66vh,120vw);margin:0 auto .6rem" aria-label="Browse the catalogue map. Spatial shows built decisions; Fisheye opens the whole named map and scrolls through its categorical depth."></div>
      <div class="homelens-lensbar" id="homelens-lenses" role="group" aria-label="Light a measure across the map"></div>
      <p class="homelens-cap" id="homelens-cap">${total} decisions with answers, of those built so far.</p>
      <details class="homelens-about">
        <summary>How this map decides what gets space</summary>
        <p>Colour identifies the need. In Spatial, cell size combines the stakes of a decision with the difference between its choices. Fisheye loads the whole named map only when opened: domains are sized by how many decisions they hold and shaded by how many have answers. Scroll moves through domains, needs, fields, families, decisions, and evidence. Open, held, and refused decisions remain visible but do not pretend to have routes. The selected view and location stay on this device.</p>
      </details>
    </section>
    <article class="home-question" id="home-question">${spotlightHTML(sp)}</article>
    <p class="contribute"><a href="#map">Browse by need</a> &middot; <a href="#you">My rules</a> &middot; <a href="#guide/vote-with-your-money">The two-minute primer</a> &middot; <a href="./c/">All verdicts and sources</a> &middot; <a href="#contribute">Suggest a decision</a></p>`;
  wireSpotlight(sp);
  document.getElementById('hsearch').onsubmit=(e)=>{e.preventDefault();goSearch((document.getElementById('hq').value||'').trim());};
  wireSuggest(document.getElementById('hq'));
  if(CC.homeLens)CC.homeLens.mount('homelens',function(){return CATALOG;});
  (function mapModes(){
    const buttons=[...document.querySelectorAll('[data-map-mode]')];
    const help=document.getElementById('homelens-mode-help');
    const path=document.getElementById('homelens-trail-path');
    const hint=document.getElementById('homelens-trail-hint');
    const viewsteps=document.getElementById('homelens-viewsteps');
    const reset=document.getElementById('homelens-reset');
    const cap=document.getElementById('homelens-cap');
    const mapBox=document.getElementById('homelens');
    const copy={
      spatial:'Zoom from eight needs to areas, kinds, decisions, and evidence.',
      fisheye:'Scroll from domains through needs, fields, families, decisions, and evidence. Move away from centre to travel.'
    };
    if(CC.homeLens&&CC.homeLens.restore&&homeMapState)CC.homeLens.restore(homeMapState);
    buttons.forEach(button=>button.onclick=()=>{
      const mode=button.dataset.mapMode;
      if(!CC.homeLens||!CC.homeLens.setMode)return;
      CC.homeLens.setMode(mode);
    });
    let crumbSignature='',scaleSignature='';
    const titleCase=value=>String(value||'').replace(/^./,letter=>letter.toUpperCase());
    const renderScale=detail=>{
      if(!viewsteps)return;
      const labels=(detail.scale||[]).filter(Boolean);
      const signature=detail.mode+'|'+labels.join('|');
      if(scaleSignature!==signature){
        scaleSignature=signature;
        viewsteps.innerHTML=labels.map((label,index)=>`<button type="button" data-map-view="${index}" aria-pressed="false">${esc(titleCase(label))}</button>`).join('');
        viewsteps.querySelectorAll('[data-map-view]').forEach(button=>button.onclick=()=>{
          if(CC.homeLens&&CC.homeLens.setView)CC.homeLens.setView(Number(button.dataset.mapView));
        });
      }
      viewsteps.querySelectorAll('[data-map-view]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.mapView)===Number(detail.at))));
      viewsteps.setAttribute('aria-label',detail.mode==='fisheye'?'Choose categorical depth':'Choose spatial depth');
    };
    const renderCrumbs=detail=>{
      if(!path)return;
      const crumbs=(detail.crumbs||[]).filter(crumb=>crumb&&crumb.label)
        .filter((crumb,index,all)=>!index||crumb.label!==all[index-1].label);
      const signature=crumbs.map(crumb=>crumb.label+'|'+crumb.level+'|'+!!crumb.current).join('>');
      if(signature===crumbSignature)return;
      crumbSignature=signature;
      path.innerHTML=crumbs.map((crumb,index)=>{
        const last=crumb.current||index===crumbs.length-1;
        const label=esc(crumb.label);
        const part=last?`<span aria-current="location">${label}</span>`:`<button type="button" data-map-crumb="${Number(crumb.level)||0}">${label}</button>`;
        return (index?'<span class="homelens-trail-sep" aria-hidden="true">/</span>':'')+part;
      }).join('');
      path.querySelectorAll('[data-map-crumb]').forEach(button=>button.onclick=()=>{
        if(CC.homeLens&&CC.homeLens.showLevel)CC.homeLens.showLevel(Number(button.dataset.mapCrumb));
      });
    };
    const applyContext=detail=>{
      if(!detail)return;
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapMode===detail.mode)));
      if(help)help.textContent=copy[detail.mode]||copy.spatial;
      renderScale(detail);
      renderCrumbs(detail);
      if(hint)hint.textContent=detail.hint||'';
      if(cap){
        /* A readout, not a caption. The claims that used to live here (sources attached, no paid
           placement, settings local) are made by the Transparent and Private cards two inches
           above, and saying them twice on one screen makes both weaker. */
        const here=detail.here;
        const place=(detail.crumbs||[]).filter(c=>c&&c.label).slice(-1)[0];
        const where=place?place.label:'The whole map';
        if(here&&here.exact){
          cap.textContent=`${where}. ${here.built} of ${here.named} decision${here.named===1?'':'s'} here have a sourced answer.`;
        }else if(here){
          cap.textContent=`${where}. ${here.built} decision${here.built===1?'':'s'} with answers, of those built so far.`;
        }else if(mapBox&&mapBox.dataset.mapDecisions){
          cap.textContent=`${mapBox.dataset.mapDecisions} decisions named, ${mapBox.dataset.mapBuilt||0} with answers.`;
        }else cap.textContent=`${total} decisions have answers.`;
      }
      if(window._ccHomeLensSaveTimer)clearTimeout(window._ccHomeLensSaveTimer);
      window._ccHomeLensSaveTimer=setTimeout(()=>{
        if(CC.homeLens&&CC.homeLens.state)saveHomeMapState(CC.homeLens.state());
      },160);
    };
    if(window._ccHomeLensContext)window.removeEventListener('cc:homelens-context',window._ccHomeLensContext);
    window._ccHomeLensContext=event=>applyContext(event.detail);
    window.addEventListener('cc:homelens-context',window._ccHomeLensContext);
    if(reset)reset.onclick=()=>{if(CC.homeLens&&CC.homeLens.reset)CC.homeLens.reset();};
    if(CC.homeLens&&CC.homeLens.context)applyContext(CC.homeLens.context());
  })();
  /* The lens measures its container at mount, and on the front page it mounts while the view is
     still being laid out, so it sized itself to the canvas default of 300 by 150 and stayed there.
     One resize after layout settles it. Cheap, and the alternative is teaching the lens to observe
     its own box, which is a bigger change than this page needs today. */
  requestAnimationFrame(()=>setTimeout(()=>window.dispatchEvent(new Event('resize')),50));
  (function lensbar(tries){
    const bar=document.getElementById('homelens-lenses');
    if(!bar)return;
    if(!CC.homeLens||!CC.homeLens.lenses){ if((tries||0)<40)setTimeout(()=>lensbar((tries||0)+1),300); return; }
    const defs=CC.homeLens.lenses();
    bar.innerHTML=defs.map(d=>`<button type="button" data-lens="${d.id}" aria-pressed="false">${d.label} <small>${d.count}</small></button>`).join('');
    bar.querySelectorAll('button[data-lens]').forEach(b=>b.onclick=()=>{
      const on=b.getAttribute('aria-pressed')==='true';
      bar.querySelectorAll('button[data-lens]').forEach(x=>x.setAttribute('aria-pressed','false'));
      if(on){CC.homeLens.setLens(null);}
      else{b.setAttribute('aria-pressed','true');CC.homeLens.setLens(b.dataset.lens);}
    });
  })();
}
// The starter lines on home — draw your first line in one tap, right at the front door (Move 1).
const STARTERS=[{kind:'diet',label:'Vegetarian'},{kind:'diet',label:'Vegan'},{kind:'avoid',id:'avoid:nestle',label:'Avoid Nestlé'},{kind:'req',label:'Open source'}];
function renderStarterLines(){
  const box=document.getElementById('starterlines');if(!box)return;
  box.innerHTML=STARTERS.map((s,i)=>{
    const on=s.kind==='avoid'?(YOU.avoid||[]).some(a=>(typeof a==='string'?a:(a&&a.id))===s.id):YOU.diet.includes(s.label);
    return `<button type="button" class="themechip${on?' on':''}" data-starter="${i}" aria-pressed="${on}">${on?'✓ ':''}${esc(s.label)}</button>`;
  }).join('');
  box.querySelectorAll('[data-starter]').forEach(b=>b.onclick=()=>{
    const s=STARTERS[+b.dataset.starter];
    if(s.kind==='avoid'){
      const held=(YOU.avoid||[]).some(a=>(typeof a==='string'?a:(a&&a.id))===s.id);
      if(held)YOU.avoid=(YOU.avoid||[]).filter(a=>(typeof a==='string'?a:(a&&a.id))!==s.id);
      else {YOU.avoid=(YOU.avoid||[]).concat([s.id]);ceremony(lineById(s.id));}
    } else {
      const i=YOU.diet.indexOf(s.label); i<0?YOU.diet.push(s.label):YOU.diet.splice(i,1);
      if(i<0){const L=reqLineForLabel(s.label);if(L)ceremony(L);}
    }
    saveYou();renderStarterLines();
  });
}
// Instant suggestions (interface system §2.2): as-you-type over the in-memory index — local,
// debounced, keyboard-walkable. The largest ease win per line of code on the board.
function wireSuggest(input){
  if(!input||input._sugg)return; input._sugg=true;
  const form=input.form||input.parentElement; if(form&&getComputedStyle(form).position==='static')form.style.position='relative';
  const panel=el('div',{class:'sugg',role:'listbox',hidden:''}); form.appendChild(panel);
  let items=[],sel=-1,t=null;
  const hide=()=>{panel.hidden=true;sel=-1;};
  const show=(hits)=>{
    items=hits; if(!hits.length){hide();return;}
    panel.innerHTML=hits.map((h,i)=>`<a href="${esc(h.hash)}" data-i="${i}" role="option"><span>${esc(h.label)}</span><span class="st">${esc(h.type)}</span></a>`).join('');
    panel.hidden=false; sel=-1;
    panel.querySelectorAll('a').forEach(a=>a.onmousedown=e=>{e.preventDefault();hide();location.hash=items[+a.dataset.i].hash;});
  };
  input.addEventListener('input',()=>{
    clearTimeout(t); loadAskCore();
    t=setTimeout(()=>{
      const nq=askNorm(input.value); if(!nq||nq.length<2){hide();return;}
      const legacy=()=>loadNodes().then(()=>{
        const nqT=nq.split(' '), seen={},out=[];
        for(const e2 of askEntries()){
          if(out.length>=6)break;
          if(seen[e2.hash])continue;
          if(e2.k===nq||e2.k.startsWith(nq)||_tokContains(nqT,e2.k.split(' '))){seen[e2.hash]=1;out.push(e2);}
        }
        show(out);
      });
      loadAskCore().then(()=>{
        const out=resolveAskCoreRows(input.value,6,true);
        if(out.length)show(out);else legacy();
      }).catch(legacy);
    },150);
  });
  input.addEventListener('keydown',e=>{
    if(panel.hidden)return;
    const as=panel.querySelectorAll('a');
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=(sel+(e.key==='ArrowDown'?1:-1)+as.length)%as.length;as.forEach((a,i)=>a.classList.toggle('on',i===sel));}
    else if(e.key==='Enter'&&sel>=0){e.preventDefault();hide();location.hash=items[sel].hash;}
    else if(e.key==='Escape'){hide();}
  });
  input.addEventListener('blur',()=>setTimeout(hide,150));
}
// What's new — the commons' ledger as a quiet home strip (C5's pulse feed). Added, corrected, contested,
// stale: each entry a fact about the data with its source. No streaks, no counters, no bait — a ledger.
let PULSE=null;
function initPulseStrip(){
  const box=document.getElementById('pulsestrip');if(!box)return;
  if(!chDev()){box.innerHTML='';return;} // workbench-only until the ledger's phrasing passes the voice bar
  const paint=()=>{
    const es=(PULSE&&PULSE.entries||[]).slice(0,4);
    if(!es.length){box.innerHTML='';return;}
    const KGLYPH={added:CC.icon('plus'),corrected:CC.icon('edit'),contested:CC.icon('scales'),stale:CC.icon('clock')};
    box.innerHTML=`<div class="pulsestrip"><div class="facet-h" style="margin:0 0 .35rem">What's new in the commons</div>`+
      es.map(e=>{
        const h=idToHash(e.node), cat=String(e.node||'').indexOf('ovs:cat/')===0&&(CATALOG||[]).find(c=>'ovs:cat/'+c.id===e.node);
        const what=`<span class="pl-k" aria-hidden="true">${KGLYPH[e.kind]||'·'}</span> ${esc(e.what)}`;
        return `<div class="pl-row">${h?`<a href="${esc(h)}">${what}</a>`:what}<span class="pl-d">${esc(e.date||'')}${e.source?` · <a href="${esc(e.source)}" target="_blank" rel="noopener">source ↗</a>`:''}</span></div>`;
      }).join('')+`</div>`;
  };
  if(PULSE){paint();return;}
  fetch('./data/pulse.json').then(r=>r.ok?r.json():null).then(j=>{PULSE=j||{entries:[]};paint();}).catch(()=>{PULSE={entries:[]};});
}
// Guides as a learning path: Start here → Foundations (cross-cutting literacy) → By category → Community.
const PRIMER_SLUG='vote-with-your-money';
const FOUNDATION_SLUGS=['how-scores-work','economic-prioritization','digital-literacy','healthy-tech','the-anti-app'];
function renderGuidesList(){
  const G=window.CC_GUIDES||[], find=s=>G.find(g=>g.slug===s);
  const primer=find(PRIMER_SLUG), foundation=FOUNDATION_SLUGS.map(find).filter(Boolean);
  const used=new Set([PRIMER_SLUG,...FOUNDATION_SLUGS]);
  const category=G.filter(g=>!used.has(g.slug)).sort((a,b)=>a.title.localeCompare(b.title));
  const card=g=>`<a class="guidecard" href="#guide/${g.slug}"><div class="gt">${esc(g.title)}</div>${g.category?`<div class="gc">${esc(g.category)}</div>`:''}<p class="gs">${esc(g.summary)}</p></a>`;
  let html=`<h2 class="sectionh">Guides, learn to vote with your money</h2><p class="sectionsub">Start with the basics and wander as deep as you like. Every guide shows its sources, and none of it is sponsored.</p>
  <figure class="imgslot art" data-slot="3" aria-hidden="true"><svg viewBox="0 0 540 150" width="420" height="117" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <g style="stroke:var(--hint)"><path d="M150 110V44c30-10 56-10 78 0v66c-22-8-48-8-78 0z"/><path d="M306 110V44c-30-10-56-10-78 0v66c22-8 48-8 78 0z"/><path d="M170 62h38M170 76h30M170 90h34"/><path d="M366 96l28-34 6 5-28 34-8 3z"/></g>
    <g style="stroke:var(--accent)"><circle cx="262" cy="58" r="14" opacity=".8"/><path d="M246 66h34M246 80h26" /></g>
  </svg></figure>`;
  if(primer)html+=`<div class="gsec">Start here</div><a class="guidecard primer" href="#guide/${primer.slug}"><div class="gt">${esc(primer.title)}</div><p class="gs">${esc(primer.summary)}</p><span class="link">Begin →</span></a>`;
  if(foundation.length)html+=`<div class="gsec">Foundations</div>`+foundation.map(card).join('');
  if(category.length)html+=`<div class="gsec">By category</div>`+category.map(card).join('');
  html+=`<div class="gsec">From the community</div><p class="alts-sub" style="margin-top:0">Soon, guides written and improved by people like you, the commons growing. <a href="#contribute">Suggest one →</a></p>`;
  document.getElementById('view-guides').innerHTML=html;
}
function renderGuide(slug){
  const g=(window.CC_GUIDES||[]).find(x=>x.slug===slug);
  const v=document.getElementById('view-guide');
  if(!g){v.innerHTML='<a class="back" href="#guides">← all guides</a><p>Guide not found.</p>';return;}
  v.innerHTML=`<a class="back" href="#guides">← all guides</a>
    <div class="guidehead">${g.category?`<div class="gcat">${esc(g.category)}</div>`:''}${g.disclosure?`<p class="gdisc">${esc(g.disclosure)}</p>`:''}</div>
    <article class="guide-body">${g.html}</article>`;
}
// Phase C / C2 — the fundamental-category ontology: simple surface, deep index.
function ontologyHTML(){
  const ont=window.CC_BUNDLE&&window.CC_BUNDLE.ontology;
  if(!ont||!ont.domains)return `<div class="commonsmap">${commonsMapHTML()}</div>`;
  const live={}; CATALOG.forEach(c=>live[c.id]=c);
  let out='';
  for(const d of ont.domains){
    out+=`<section class="ont-type"><h3 class="ont-th"><a href="#domain/${encodeURIComponent(d.label)}">${esc(d.label)} →</a></h3><div class="ont-cats">`;
    for(const c of d.categories){
      if(c.cid&&live[c.cid]){
        const href='#explore/'+c.cid+(c.facet?('/'+encodeURIComponent(c.facet)):'');
        out+=`<a class="ont-cat live" href="${href}" title="${esc(c.type||'')}">${esc(c.label)}</a>`;
      } else {
        out+=`<a class="ont-cat growing" href="#contribute/want/${encodeURIComponent(c.label)}" title="Not built yet, tap to request">${esc(c.label)}</a>`;
      }
    }
    out+=`</div></section>`;
  }
  return `<p class="ont-legend">Filled categories are ready to compare; outlined ones are mapped and growing. This is organized by where choices sit in your life, not by catalogue size.</p>`+out;
}
// A dedicated landing page for one life-domain (e.g. "Money", "Home") — its categories grouped by shelf,
// plus the guides for that area. The honest answer to "clicking a domain should go somewhere focused, not a generic list."
// ── component kit · catTile: the first reusable tile pattern — one node of the tree (domain → category → facet) ──
function catTile(n){
  if(n.growing) return `<a class="dcard" href="${n.href}"><span class="dcard-n">${esc(n.label)}</span><span class="dcard-c" style="color:var(--accent)">request it →</span></a>`;
  return `<a class="dcard" href="${n.href}"><span class="dcard-n">${esc(n.label)}</span></a>`;
}
// the honest growing frontier, grouped — the planned shelf for what's mapped but not yet built (never a hollow node)
function growingGridHTML(cats){
  const gg={},go=[];for(const c of cats){const g=c.group||'';if(!(g in gg)){gg[g]=[];go.push(g);}gg[g].push(c);}
  let h='';
  for(const g of go){if(g)h+=`<div class="dsh" style="opacity:.85">${esc(g)}</div>`;h+=`<div class="dgrid">${gg[g].map(c=>catTile({label:c.label,growing:true,href:`#contribute/want/${encodeURIComponent(c.label)}`})).join('')}</div>`;}
  return h;
}
function domainGuides(dl,dsIds){
  const set=new Set(dsIds);
  const guides=(window.CC_GUIDES||[]).filter(gd=>{for(const id of set){if(CAT_GUIDE[id]===gd.slug)return true;}return false;});
  if(!guides.length)return '';
  return `<div class="dsh" style="margin-top:1.7rem">Guides for ${esc(dl)}</div><div class="dguides">`+guides.slice(0,5).map(gd=>`<a class="guidelink" href="#guide/${gd.slug}">${CC.icon('guides')} ${esc(gd.title)} →</a>`).join('')+`</div>`;
}
function domainContribHTML(dl){
  return `<div class="domain-contrib">
    <div><div class="dc-eyebrow">Help this area grow</div>
      <p>Missing a real option, seeing a stale claim, or holding a better source? Save a local suggestion, export it, or open the Workshop. Nothing is uploaded automatically.</p></div>
    <div class="dc-actions">
      <a class="catbtn" href="#contribute/want/${encodeURIComponent(dl)}">Suggest what to add</a>
      <a class="savetag" href="../workshop/index.html">Open Workshop</a>
    </div>
  </div>`;
}
function renderDomain(arg){
  const v=document.getElementById('view-domain');if(!v)return;
  const dl=decodeURIComponent(arg||'');
  const cats=(CATALOG||[]).filter(c=>(c.domain||'Other')===dl);
  const head=`<a class="back" href="#home">← all areas</a><h2 class="sectionh domain-h">${esc(dl)}</h2>`;
  // The fine ontology surfaces the tree: a dataset with facet-children (e.g. Digital services) expands into its kinds
  // rather than collapsing to one tile. Plain datasets render as before; nothing here invents an empty node.
  const ont=window.CC_BUNDLE&&window.CC_BUNDLE.ontology;
  const od=ont&&ont.domains&&ont.domains.find(d=>(d.label||'')===dl);
  if(!cats.length){ // a fully-growing area: show the planned, grouped shelf rather than a bare "still growing" line
    let h=head+`<p class="sectionsub">This whole area is <b>mapped &amp; growing</b>, nothing is built here yet. Tap any to request it first, or <a href="#contribute/want/${encodeURIComponent(dl)}">tell us what you'd like to see →</a></p>`;
    if(od&&od.categories&&od.categories.length)h+=growingGridHTML(od.categories);
    v.innerHTML=h+domainContribHTML(dl);return;
  }
  // One card grammar for the whole tree: a category card and a kind card look the same, differing only
  // in their quiet second line. Faceted categories (e.g. Digital services) render as their OWN block —
  // the old code printed the group header AND a "pick a kind" header back to back, which read as a bug.
  const facetsOf={}; if(od)for(const c of od.categories){if(c.cid&&c.facet)(facetsOf[c.cid]=facetsOf[c.cid]||[]).push(c);}
  const face=DOMAIN_FACE[dl];
  let html=head+`<p class="sectionsub">${face?esc(face.t.charAt(0).toUpperCase()+face.t.slice(1))+'. ':''}${esc(domainDifferencesSentence(cats))}</p>`;
  const card=(label,href,sub)=>`<a class="domcard sm" href="${href}"><span class="dc-body"><span class="dc-n">${esc(label)}</span><span class="dc-m">${esc(sub)}</span></span></a>`;
  const groups={},order=[];for(const c of cats){const g=c.group||'';if(!(g in groups)){groups[g]=[];order.push(g);}groups[g].push(c);}
  const blocks=[];
  for(const g of order){
    const faceted=groups[g].filter(c=>facetsOf[c.id]), plain=groups[g].filter(c=>!facetsOf[c.id]);
    // a faceted category is its own titled block: "All …" first, then its kinds — one grammar, no double header
    for(const c of faceted)blocks.push({title:c.label,cards:[card('All '+c.label.toLowerCase(),`#explore/${c.id}`,categoryMatterLine(c))].concat(facetsOf[c.id].map(f=>card(f.label,`#explore/${c.id}/${encodeURIComponent(f.facet)}`,'A kind of '+c.label.toLowerCase())))});
    if(plain.length)blocks.push({title:g,cards:plain.map(c=>card(c.label,`#explore/${c.id}`,categoryMatterLine(c)))});
  }
  for(const b of blocks)html+=`${b.title?`<div class="domhdr" style="margin-top:1.3rem">${esc(b.title)}</div>`:''}<div class="domgrid">${b.cards.join('')}</div>`;
  // the honest frontier, present but not shouting — mapped categories that aren't built yet
  const liveIds={};(CATALOG||[]).forEach(c=>{liveIds[c.id]=1;});
  const growing=od?od.categories.filter(c=>!c.cid||!liveIds[c.cid]):[];
  if(growing.length)html+=`<details class="allcats"><summary>Mapped but not built yet · request what should grow next</summary>${growingGridHTML(growing)}</details>`;
  v.innerHTML=html+domainGuides(dl,cats.map(c=>c.id))+domainContribHTML(dl);
}
function needExtensionHTML(need){
  const rows=[];
  for(const item of (need.illustrative||[])){
    rows.push(`<a class="need-extra" href="${esc(item.href)}"><span class="need-extra-k">Illustrative</span><b>${esc(item.label)}</b><span>See this need applied beyond shopping &rarr;</span></a>`);
  }
  for(const item of (need.surfaces||[])){
    const href=item.category?((item.kind==='board'?'#rank/':'#explore/')+encodeURIComponent(item.category)):'#map';
    rows.push(`<a class="need-extra" href="${href}"><span class="need-extra-k">Starter patterns</span><b>${esc(item.label)}</b><span>Turn a cause into a concrete ask &rarr;</span></a>`);
  }
  return rows.length?`<div class="need-extras">${rows.join('')}</div>`:'';
}
function renderNeed(arg){
  const v=document.getElementById('view-need');if(!v)return;
  const id=decodeURIComponent(arg||''), need=needById(id);
  if(!need){hopTo('#map');return;}
  const cats=(CATALOG||[]).filter(c=>c.need===id);
  const cards=cats.map(c=>`<a class="need-cat" href="#explore/${encodeURIComponent(c.id)}"><span class="need-cat-name">${esc(c.label)}</span><span class="need-cat-matters">${esc(categoryMatterLine(c))}</span></a>`).join('');
  const ont=window.CC_BUNDLE&&window.CC_BUNDLE.ontology, liveIds=new Set(cats.map(c=>c.id)), seen=new Set(), growing=[];
  for(const domain of ((ont&&ont.domains)||[]))for(const row of (domain.categories||[])){
    if(row.need!==id||(row.cid&&liveIds.has(row.cid)))continue;
    const key=(row.cid||'')+'|'+row.label;if(seen.has(key))continue;seen.add(key);growing.push(row);
  }
  let frontier='';
  if(growing.length)frontier=`<details class="allcats need-frontier"><summary>Mapped next &middot; ask what should grow</summary>${growingGridHTML(growing)}</details>`;
  v.innerHTML=`<a class="back" href="#map">&larr; all needs</a>
    <header class="need-head"><div class="door-kicker">A human need</div><h2 class="sectionh">${esc(need.label)}</h2><p class="need-read">${esc(need.reads)}</p><p class="need-differences">${esc(domainDifferencesSentence(cats))}</p></header>
    ${needExtensionHTML(need)}
    <div class="need-section-label">Decisions ready now</div><div class="need-cats">${cards}</div>${frontier}`;
}
// ── THE DECISION COMPANION ── design backwards from the last screen: turn the live ranking into a decisive, sourced
//    ANSWER — the pick · the one reason · an honest confidence read · the runner-up · what to avoid · your next step.
const DECIDE_VERB={banking:'Move your money',investing:'Move your money',payments:'Switch your payments','digital-services':'Switch the service','ai-assistants':'Switch assistant',vpn:'Switch VPN','password-managers':'Switch manager','music-streaming':'Switch service',phones:'Choose this',laptops:'Choose this',clothing:'Shop this',shoes:'Shop this','causes-to-support':'Give here'};
function decidingAxis(a,b){let best=null,bd=-1e9;for(const cr of DATA.criteria){const w=weights[cr.key]||0;if(!w)continue;const av=a.scores[cr.key],bv=b.scores[cr.key];if(av==null||bv==null)continue;const d=(av-bv)*w;if(d>bd){bd=d;best=cr;}}return bd>0?best:null;}
// J4 / Round 4. The signed decision contract is the only category configuration here. The component
// turns it into a calm zero-setup page: shared floor and personal lines first, practical dials next,
// then computed answer recipes. Categories without a signed contract keep the earlier companion page.
const DECISION_DIAL_KEY='cc.decision.dials.v1', DECISION_FLOOR_KEY='cc.decision.floor.v1', DECISION_LIST_KEY='cc.decision.lists.v1';
let decisionDialState=(function(){try{return JSON.parse(localStorage.getItem(DECISION_DIAL_KEY)||'{}')||{};}catch(e){return {};}})();
let decisionFloorState=(function(){try{const value=JSON.parse(localStorage.getItem(DECISION_FLOOR_KEY)||'{}')||{};return {disabledRuleIds:Array.isArray(value.disabledRuleIds)?value.disabledRuleIds.filter(id=>typeof id==='string'):[]};}catch(e){return {disabledRuleIds:[]};}})();
let _decisionRAF=0;
function decisionContract(){return DATA&&DATA.meta&&DATA.meta.decision||null;}
function decisionSaveDials(){try{localStorage.setItem(DECISION_DIAL_KEY,JSON.stringify(decisionDialState));}catch(e){}}
function decisionSaveFloor(){try{localStorage.setItem(DECISION_FLOOR_KEY,JSON.stringify(decisionFloorState));}catch(e){}}
function decisionSaveList(contract,query){
  const pool=decisionCandidatePool(contract,query), result=decisionRecipes(contract,pool,decisionDialValues(contract));
  /* The saved list has to be the list on screen. Until 2026-07-31 it was rebuilt from the slider
     apparatus, so a reader who weighed low fees most, watched Nationwide take the lead, and saved
     it, got a file that said Triodos. The artifact contradicted the page, and the thing it dropped
     was exactly the weighting that made the ranking theirs rather than ours. The table is the
     ranking now, so the table is what gets saved, and the emphasis is saved beside it. */
  const cid=contract.category, st=decisionTableState[cid];
  let choices=result.ranked.slice(0,12).map(row=>({code:row.product.code,name:row.product.name,score:Math.round(row.score.score)}));
  let weighedMost=[];
  if(st){
    const rows=decisionTableRows(cid,contract,pool);
    if(rows.length){
      choices=rows.slice(0,12).map(r=>({code:r.p.code,name:r.p.name,score:Math.round(r.s.score)}));
      weighedMost=(st.emph||[]).map(k=>decisionCriterionName(k));
    }
  }
  const receipt={
    format:'cc-saved-decision-v1',
    category:contract.category,
    label:DATA&&DATA.meta&&DATA.meta.label||contract.category,
    route:location.hash||('#decide/'+contract.category),
    saved:new Date().toISOString(),
    choices:choices,
    weighedMost:weighedMost,
    dials:decisionDialValues(contract),
    baselineFolded:pool.floorFolded.length,
    personalRules:(pool.personalApplied||[]).slice()
  };
  try{
    const saved=JSON.parse(localStorage.getItem(DECISION_LIST_KEY)||'[]').filter(item=>item&&item.category!==contract.category);
    saved.unshift(receipt);localStorage.setItem(DECISION_LIST_KEY,JSON.stringify(saved));
  }catch(e){}
  return receipt;
}
function decisionFloorRuleEnabled(id){return !decisionFloorState.disabledRuleIds.includes(id);}
function decisionSetFloorRule(id,enabled){
  const disabled=new Set(decisionFloorState.disabledRuleIds);
  if(enabled)disabled.delete(id);else disabled.add(id);
  decisionFloorState={disabledRuleIds:[...disabled].sort()};decisionSaveFloor();
}
function decisionRestoreFloor(){decisionFloorState={disabledRuleIds:[]};decisionSaveFloor();}
function decisionDialValues(contract){
  const saved=decisionDialState[contract.category]||{}, out={};
  for(const axis of (contract.axes||[])){
    const raw=Number(saved[axis.id]), fallback=Number.isFinite(Number(axis.default))?Number(axis.default):50;
    out[axis.id]=Number.isFinite(raw)?Math.max(0,Math.min(100,raw)):fallback;
  }
  return out;
}
function decisionDialsAreDefault(contract,values){return (contract.axes||[]).every(axis=>values[axis.id]===(Number.isFinite(Number(axis.default))?Number(axis.default):50));}
function decisionActivePersonalLines(){
  const out=[];
  for(const tag of (YOU.allergens||[])){
    const line=lineRegistry().find(item=>item.kind==='allergy'&&item.tag===tag)||{id:'allergy:'+tag,kind:'allergy',label:ALLERGEN_LABELS[tag]||tag,reads:'Keep only options explicitly declared '+(ALLERGEN_LABELS[tag]||tag)+'-free; fold declarations and missing evidence for a label check.',tag:tag};
    out.push(Object.assign({},line,{display:'No '+(ALLERGEN_LABELS[tag]||tag)}));
  }
  for(const label of (YOU.diet||[])){
    const line=reqLineForLabel(label)||{id:'require:'+String(label).toLowerCase().replace(/[^a-z0-9]+/g,'-'),kind:'require',label:label,reads:'Only show options carrying '+label+'.',accept:[label]};
    out.push(Object.assign({},line,{display:line.kind==='diet'?line.label:'Require '+line.label}));
  }
  for(const line of activeAvoidLines())if(line&&line.label)out.push(Object.assign({},line,{display:'Avoid '+line.label}));
  const seen=new Set();return out.filter(line=>line.id&&!seen.has(line.id)&&seen.add(line.id));
}
function decisionActiveLineLabels(){return decisionActivePersonalLines().map(line=>line.display);}
function decisionFloorSet(){return ((window.CC&&CC.LINE_SETS)||[]).find(set=>set&&set.tier==='floor'&&set.defaultOn)||null;}
function decisionFloorRuleMatches(p,rule,cid){
  if(!p||!rule||!rule.scope||!(rule.scope.categories||[]).includes(cid))return false;
  const match=rule.match||{}; if(match.type!=='criterion-band'||!match.criterion)return false;
  const value=p.scores&&p.scores[match.criterion], maximum=Number(match.maximumExclusive);
  if(!Number.isFinite(value)||!Number.isFinite(maximum)||value>=maximum)return false;
  const receipt=p.provenance&&p.provenance[match.criterion];
  if(match.requiresSource&&!(receipt&&typeof receipt==='object'&&/^https?:\/\//.test(String(receipt.source||''))))return false;
  if(match.requiresAsOf&&!(receipt&&typeof receipt==='object'&&String(receipt.asof||'').trim()))return false;
  return true;
}
function decisionBaseCandidates(query){
  const q=String(query||'').trim();
  return (DATA.products||[]).filter(p=>productMatchesQuery(p,q)&&(regionFilter==='everywhere'||!p.region||!p.region.length||p.region.includes('global')||p.region.includes(regionFilter)));
}
function decisionPersonalFilter(entries){
  const receipts=decisionActivePersonalLines().map(line=>{
    let supported=true,test=()=>false,status=()=>null;
    if(line.kind==='allergy'){
      supported=!!(DATA.meta&&DATA.meta.allergens);
      status=p=>supported?CC.engine.allergenStatus(p,line.tag):null;
      test=p=>supported&&status(p)!=='declared-free';
    }else if(line.kind==='diet'||line.kind==='require'){
      const accept=Array.isArray(line.accept)&&line.accept.length?line.accept:[line.label];
      supported=entries.some(p=>(p.focuses||p.labels||[]).some(f=>accept.includes(f)));
      test=p=>supported&&!(p.focuses||p.labels||[]).some(f=>accept.includes(f));
    }else if(line.kind==='avoid')test=p=>avoidHit(p,line);
    const hidden=entries.filter(test).length;
    const declares=line.kind==='allergy'?entries.filter(p=>status(p)==='declares').length:0;
    const unknown=line.kind==='allergy'?entries.filter(p=>status(p)==='no-data').length:0;
    return {line:line,supported:supported,hidden:hidden,declares:declares,unknown:unknown,test:test,status:status};
  });
  const kept=[],folded=[];
  for(const p of entries){
    const reasons=receipts.filter(receipt=>receipt.supported&&receipt.test(p));
    if(reasons.length)folded.push({product:p,reasons:reasons.map(receipt=>({line:receipt.line,status:receipt.line.kind==='allergy'?receipt.status(p):'filtered'}))});else kept.push(p);
  }
  return {entries:kept,folded:folded,hidden:folded.length,receipts:receipts,applied:receipts.filter(receipt=>receipt.supported).map(receipt=>receipt.line.display)};
}
function decisionCandidatePool(contract,query){
  const base=decisionBaseCandidates(query), set=decisionFloorSet();
  const rules=set?(set.rules||[]).filter(rule=>(rule.scope&&rule.scope.categories||[]).includes(contract.category)):[];
  const activeRules=rules.filter(rule=>decisionFloorRuleEnabled(rule.id));
  const floorFolded=[], afterFloor=[];
  for(const p of base)(activeRules.some(rule=>decisionFloorRuleMatches(p,rule,contract.category))?floorFolded:afterFloor).push(p);
  const personal=decisionPersonalFilter(afterFloor);
  return {base:base,entries:personal.entries,floorFolded:floorFolded,floorSet:set,floorRules:rules,activeFloorRules:activeRules,personalFolded:personal.folded,personalReceipts:personal.receipts,personalHidden:personal.hidden,personalApplied:personal.applied};
}
function decisionWeights(contract,values){
  return CC.decisionPage.dialWeights(DATA.criteria,contract,values);
}
function decisionBudgetWeights(contract,dialWeights){
  return CC.decisionPage.budgetWeights(DATA.criteria,contract,dialWeights);
}
function decisionScored(entries,recipeWeights){
  const leaningWeights=themeDefaults(DATA.criteria);
  return CC.decisionPage.ranked(CC.engine,DATA,entries,recipeWeights,leaningWeights);
}
function decisionStrictMetric(p,contract){
  return CC.decisionPage.strictMetric(p,contract);
}
function decisionRecipes(contract,pool,values){
  return CC.decisionPage.recipes({engine:CC.engine,dataset:DATA,contract:contract,pool:pool,values:values,tieWeights:themeDefaults(DATA.criteria)});
}
function decisionCriterionName(key){const cr=(DATA.criteria||[]).find(x=>x.key===key);return cr?decisionCriterionLabel(cr):String(key||'factor').replace(/_/g,' ');}
function decisionWhy(recipe,contract){
  return CC.decisionPage.why({engine:CC.engine,dataset:DATA,contract:contract,recipe:recipe,criterionLabel:decisionCriterionLabel});
}
function decisionMathHTML(recipe,contract,pool){
  return CC.decisionPage.mathHTML({dataset:DATA,contract:contract,recipe:recipe,pool:pool,escape:esc,criterionLabel:decisionCriterionLabel});
}
function decisionAnswerCardHTML(group,contract,pool){
  return CC.decisionPage.answerCardHTML({engine:CC.engine,dataset:DATA,contract:contract,group:group,pool:pool,escape:esc,criterionLabel:decisionCriterionLabel,decor:p=>valueBloom(p,84),proof:provenanceChipHTML,href:p=>`#item/${encodeURIComponent(contract.category)}/${encodeURIComponent(p.code)}`});
}
function decisionNextHTML(contract){
  const guide=CAT_GUIDE[contract.category], hasGuide=!!(guide&&(window.CC_GUIDES||[]).some(item=>item.slug===guide));
  return `<section class="decision-next" aria-labelledby="decision-next-title"><div><div class="decision-kicker">Check this result</div><h2 id="decision-next-title">Sources, objections, and corrections</h2><p>Open a score to see its source. Challenge the comparison or suggest a correction when a fact is wrong or missing.</p></div><nav class="decision-review-links" aria-label="Decision evidence and follow-up">${hasGuide?`<a href="#guide/${encodeURIComponent(guide)}">Read the category guide</a>`:''}<button type="button" id="decision-challenge-jump">Challenge this view</button><a href="#guide/how-scores-work">How the facts are scored</a><a href="#contribute/problem/${encodeURIComponent(contract.category)}">Suggest a sourced correction</a></nav><div id="decision-challenge" class="challengebox decision-challenge" data-cid="${esc(contract.category)}" tabindex="-1"></div></section>`;
}
function decisionFloorScopeLabel(rule){
  return ((rule.scope&&rule.scope.categories)||[]).map(cid=>categoryIndexMeta(cid).label||String(cid).replace(/-/g,' ')).join(', ');
}
function decisionFloorRuleHTML(rule,pool,contract){
  const enabled=decisionFloorRuleEnabled(rule.id), applies=(rule.scope&&rule.scope.categories||[]).includes(contract.category);
  const matches=applies?pool.base.filter(p=>decisionFloorRuleMatches(p,rule,contract.category)).length:0;
  const receipt=rule.receipt||{}, status=applies?`${matches} match${matches===1?'':'es'} here`:`For ${decisionFloorScopeLabel(rule)}`;
  return `<article class="decision-floor-rule${applies?' applies':''}${enabled?'':' loosened'}">
    <div class="decision-floor-rule-head"><div><span class="decision-floor-scope">${esc(status)}</span><h4>${esc(rule.label)}</h4></div><label class="decision-floor-switch"><input type="checkbox" data-floor-rule="${esc(rule.id)}"${enabled?' checked':''}><span><b>${enabled?'On':'Loosened'}</b><small>on this device</small></span></label></div>
    <p>${esc(rule.reads)}</p><div class="decision-floor-receipt"><span>${esc(receipt.note||'No rule-level note published.')}</span>${receipt.source?`<a href="${esc(receipt.source)}" target="_blank" rel="noopener">Source${receipt.asof?` &middot; ${esc(receipt.asof)}`:''}</a>`:''}</div>
  </article>`;
}
function decisionPersonalReceiptHTML(receipt){
  const line=receipt.line, kind=line.kind==='allergy'?'Allergy':line.kind==='diet'?'Diet':line.kind==='require'?'Requirement':'Company rule';
  const status=!receipt.supported?'Not represented in this category':line.kind==='allergy'?`${receipt.declares} declare · ${receipt.unknown} need a label check`:`${receipt.hidden} filtered here`;
  return `<article class="decision-personal-rule${receipt.supported?' applies':''}"><div><span>${esc(kind)}</span><h4>${esc(line.display||line.label)}</h4><p>${esc(line.reads||'A personal rule stored on this device.')}</p></div><strong>${esc(status)}</strong></article>`;
}
function decisionLineContextHTML(pool,listHref,contract){
  const personal=pool.personalReceipts||[], chips=personal.map(receipt=>`<span class="decision-context-chip">${esc(receipt.line.display||receipt.line.label)}${receipt.supported&&receipt.hidden?` &middot; ${receipt.hidden}`:''}</span>`).join('');
  const set=pool.floorSet, allRules=set&&Array.isArray(set.rules)?set.rules:[], folded=pool.floorFolded.length;
  const relevant=pool.floorRules.length, active=pool.activeFloorRules.length, disabled=allRules.filter(rule=>!decisionFloorRuleEnabled(rule.id)).length;
  const status=relevant&&!active?'loosened here':`on${folded?` &middot; ${folded} folded`:''}`;
  const context=folded
    ? `${folded} option${folded===1?' is':'s are'} folded from the answers. ${folded===1?'It remains':'They remain'} in the show-anyway section below.`
    : relevant&&!active
      ? 'Every rule for this category is loosened on this device, so nothing is folded here.'
      : relevant
        ? 'The published rules apply here, but no option meets their narrow sourced-and-dated threshold.'
        : 'No published baseline rule applies to this category yet. Unknown or undated evidence stays visible.';
  const ordered=allRules.slice().sort((a,b)=>Number(!((a.scope&&a.scope.categories)||[]).includes(contract.category))-Number(!((b.scope&&b.scope.categories)||[]).includes(contract.category)));
  const floorBody=`<div class="decision-floor-door"><div class="decision-floor-intro"><div><b>${esc((set&&set.label)||'The baseline')}</b><span>${set?`Version ${esc(set.version)} &middot; published ${esc(set.published)}`:'Not published'}</span></div><p>${esc(context)} The baseline only folds a Poor-band claim when that exact claim has a source and date.</p>${disabled?`<button type="button" class="savebtn" id="decision-floor-restore">Restore all ${allRules.length} rules</button>`:''}</div><div class="decision-floor-rules">${ordered.map(rule=>decisionFloorRuleHTML(rule,pool,contract)).join('')}</div><p class="decision-floor-local">Loosening changes this device only. The published set stays intact and can be forked under ${esc((set&&set.fork&&set.fork.license)||'its published license')}. <a href="${esc(listHref)}">Open the full ranking</a>.</p></div>`;
  const personalStatus=personal.length?`${personal.length} active${pool.personalHidden?` &middot; ${pool.personalHidden} filtered`:''}`:'none set';
  const personalBody=`<div class="decision-personal-door"><div class="decision-personal-intro"><div><b>My rules</b><span>Saved on this device and included in an exported file</span></div><p>${personal.length?'A rule acts only where this category carries the fact it needs. The count on each rule is calculated after the baseline, so the same option is never counted twice.':'Add only the few things you refuse or require. You do not need to create a profile.'}</p><a class="savebtn" href="#you">${personal.length?'Set or edit rules':'Set a rule'}</a></div>${personal.length?`<div class="decision-personal-rules">${personal.map(decisionPersonalReceiptHTML).join('')}</div>`:'<p class="decision-personal-empty">No personal rule is filtering this decision. The baseline and the named choices below still produce an answer.</p>'}</div>`;
  return `<div class="decision-context" aria-label="Decision context">
    <details class="decision-floor"><summary><span>The baseline</span><strong>${status}</strong></summary>${floorBody}</details>
    <details class="decision-personal"><summary><span class="decision-personal-summary"><b>My rules</b><span class="decision-personal-chips">${chips}</span></span><strong>${personalStatus}</strong></summary>${personalBody}</details>
  </div>`;
}
function decisionFloorFoldHTML(pool){
  const n=pool.floorFolded.length;if(!n)return '';
  return `<details class="decision-floor-fold" id="decision-floor-fold"><summary>Show ${n} option${n===1?'':'s'} folded by the baseline</summary><p>These options met an active baseline rule's sourced, dated threshold. They are folded from the answers, not erased.</p><div id="decision-floor-fold-list" class="decision-floor-fold-list"></div></details>`;
}
function decisionFloorFoldReason(p,pool,contract){
  return pool.activeFloorRules.filter(rule=>decisionFloorRuleMatches(p,rule,contract.category)).map(rule=>rule.label).join(' · ');
}
function decisionPopulateFloorFold(contract,pool,values){
  const list=document.getElementById('decision-floor-fold-list');if(!list)return;
  const ranked=decisionScored(pool.floorFolded,decisionWeights(contract,values));
  for(const row of ranked){
    const wrap=el('div',{class:'decision-floor-fold-entry'}), reason=decisionFloorFoldReason(row.product,pool,contract);
    if(reason)wrap.appendChild(el('p',{class:'decision-floor-fold-reason'},`Folded under: ${esc(reason)}.`));
    wrap.appendChild(listCard(row.product,row.score));list.appendChild(wrap);
  }
}
function decisionPersonalFoldHTML(pool){
  const n=(pool.personalFolded||[]).length;if(!n)return '';
  return `<details class="decision-personal-fold" id="decision-personal-fold"><summary>Show ${n} option${n===1?'':'s'} filtered by your rules</summary><p>These options failed at least one rule you set. They were filtered after the baseline, not erased, and every reason is named below. For allergies, only an explicit free claim clears the rule; declarations and no-data options stay here for a label check.</p><div id="decision-personal-fold-list" class="decision-personal-fold-list"></div></details>`;
}
function decisionPersonalFoldReason(p,pool){
  const row=(pool.personalFolded||[]).find(item=>item.product===p||item.product.code===p.code);
  return row?(row.reasons||[]).map(reason=>reason.line.kind==='allergy'?allergenStatusText({tag:reason.line.tag,status:reason.status}):(reason.line.display||reason.line.label)).join(' '):'';
}
function decisionPopulatePersonalFold(contract,pool,values){
  const list=document.getElementById('decision-personal-fold-list');if(!list)return;
  const ranked=decisionScored((pool.personalFolded||[]).map(item=>item.product),decisionWeights(contract,values));
  for(const row of ranked){
    const wrap=el('div',{class:'decision-personal-fold-entry'}), reason=decisionPersonalFoldReason(row.product,pool);
    if(reason)wrap.appendChild(el('p',{class:'decision-personal-fold-reason'},`Filtered by your rules: ${esc(reason)}.`));
    wrap.appendChild(listCard(row.product,row.score));list.appendChild(wrap);
  }
}
/* The precedence ladder and close-call priorities used to sit ABOVE the answer, asking to be
   configured before the screen would commit to anything. They now live in the quiet doors below it,
   under Advanced, in the founder-signed wording: the one slider is the priority a person actually
   has, and everything here is consulted only after two results tie. Demoted, not deleted. */
function decisionTieGroups(result){
  const counts=new Map();for(const row of (result.ranked||[]))counts.set(row.score.score,(counts.get(row.score.score)||0)+1);
  return [...counts.values()].filter(count=>count>1).length;
}
function decisionLeaningSummary(){
  const active=THEMES.filter(theme=>(themeWeights[theme.id]||3)>=4).map(theme=>theme.label);
  return active.length?active.join(' · '):'Balanced';
}
function decisionPrecedenceHTML(pool,result){
  const tieGroups=decisionTieGroups(result), afterFloor=pool.base.length-pool.floorFolded.length, active=THEMES.filter(theme=>(themeWeights[theme.id]||3)>=4);
  const chips=THEMES.map(theme=>{const on=active.includes(theme);return `<button type="button" class="themechip${on?' on':''}" data-decision-leaning="${esc(theme.id)}" aria-pressed="${on}">${hueDot(theme.id)}${esc(theme.label)}</button>`;}).join('');
  return `<details class="decision-finetune" id="decision-finetune"><summary><span>Advanced: Close-call priorities</span><strong>${esc(decisionLeaningSummary())}</strong></summary><div class="decision-precedence"><div><div class="decision-kicker">The order, applied</div><h3>Rules decide eligibility. Your choices decide order.</h3><p>Close-call priorities cannot restore an option the baseline folded or one of your rules filtered. They are consulted only after two results tie.</p></div><ol><li><b>1 · The baseline</b><span>${pool.floorFolded.length} folded from ${pool.base.length} first</span></li><li><b>2 · My rules</b><span>${pool.personalHidden} filtered from the ${afterFloor} remaining</span></li><li><b>3 · Your choices</b><span>${result.ranked.length} eligible option${result.ranked.length===1?'':'s'} ranked</span></li><li><b>4 · Close-call priorities</b><span>${tieGroups?`${tieGroups} equal-score group${tieGroups===1?'':'s'} broken last`:'No equal-score group needs them now'}</span></li></ol><div class="decision-leanings"><p><b>Optional close-call priorities</b> · Tap only if you want a preference to break close calls.</p><div class="themechips">${chips}</div></div></div></details>`;
}
function decisionBudgetNote(contract){
  const b=contract.budget||{};
  if(!b.available)return 'No price evidence here yet. This ranking uses the other measures available.';
  const kind=b.mode==='observed-price-rank'?'Observed prices':(b.mode==='assessed-fees-rank'?'Assessed fees':'Assessed affordability');
  return `${kind} exist for ${b.knownEntries} entries. The first choice weighs that cost evidence against the other measures on this page. Missing cost is never guessed.`;
}
/* ---- The one-slider decision screen ---------------------------------------------------------
   One control, one answer. The screen is also required to state its own limits: where the values
   pole of the slider is mostly nutrition data (the auto-derived open-food lenses score Nutri-Score
   axes, not sourcing), or where moving the slider cannot change the answer at all, it says so in
   plain words rather than letting a number imply an overall judgment the evidence does not support. */

/* Criterion keys that measure nutrition rather than sourcing or conduct. Used only to describe
   honestly what the values pole of a slider actually weighs — never to score or filter. */
const DECISION_NUTRITION_KEYS=new Set(['nutrition_grade','protein','low_sugar','processing']);

function decisionPrimaryAxis(contract){
  const axes=(contract&&contract.axes)||[];
  return axes.find(axis=>axis.kind==='cost-values')||axes.find(axis=>axis.kind==='tradeoff')||null;
}
function decisionSecondaryAxes(contract){
  const primary=decisionPrimaryAxis(contract);
  return ((contract&&contract.axes)||[]).filter(axis=>axis!==primary);
}
/* A cost-values axis reads [cost, ...values]; a tradeoff axis reads [thisSide, thatSide]. */
function decisionValuesSideRead(axis){
  const keys=!axis?[]:axis.kind==='cost-values'?(axis.criteria||[]).slice(1):(axis.criteria||[]).slice(1,2);
  const nutrition=keys.filter(key=>DECISION_NUTRITION_KEYS.has(key));
  const values=keys.filter(key=>!DECISION_NUTRITION_KEYS.has(key));
  return {keys:keys,nutrition:nutrition,values:values,nutritionLed:nutrition.length>0&&nutrition.length>=values.length};
}
/* The contract owns the question and both ends of every range. The app does not
   invent a second vocabulary for the same choice. */
const DECISION_PLAIN_VALUES_POLE='Stronger overall fit';
function decisionPlainWords(text){
  return String(text||'');
}
function decisionAxisPoles(axis){
  if(!axis)return ['',''];
  const poles=axis.poles||['',''];
  if(axis.kind==='cost-values'){
    const values=poles[1]||DECISION_PLAIN_VALUES_POLE;
    return [poles[0]||'Lower price',values];
  }
  return poles;
}
function decisionAxisQuestion(axis){
  return axis?decisionPlainWords(axis.question||axis.label||''):'';
}
/* The contract axis, wearing the words a person actually uses. Every range on this screen — the one
   slider included — is rendered from a signed contract axis through the shared component; the app
   supplies vocabulary, never a control of its own. */
function decisionAxisView(raw){
  return raw?Object.assign({},raw,{poles:decisionAxisPoles(raw),question:decisionAxisQuestion(raw)}):raw;
}
function decisionDialPosition(raw,value){
  const axis=decisionAxisView(raw);
  return CC.decisionPage.dialPosition(axis,value);
}
function decisionDialHTML(raw,value){
  const axis=decisionAxisView(raw);
  return CC.decisionPage.dialHTML(axis,value,{escape:esc});
}
/* Does this slider actually change the answer, from where the other controls currently stand?
   Measured, not assumed. Sampled across the whole range rather than just the two ends: the weighting
   is not monotonic, so an option can win the balanced middle without winning either extreme. Testing
   only the ends once produced a screen that said "the answer never changes" directly above a
   different answer. A slider is inert only if every sample returns the same option.
   Cached because this is recomputed on every drag frame and the result cannot depend on where the
   primary slider currently sits — only on the eligible pool and the secondary controls. */
const DECISION_SLIDER_SAMPLES=[0,25,50,75,100];
let _decisionEndsCache=null;
function decisionSliderEnds(contract,pool,axis){
  if(!axis||!pool.entries.length)return null;
  const others={};
  for(const item of decisionSecondaryAxes(contract))others[item.id]=decisionDialValues(contract)[item.id];
  const key=[contract.category,pool.entries.length,JSON.stringify(others)].join('|');
  if(_decisionEndsCache&&_decisionEndsCache.key===key)return _decisionEndsCache.value;
  const at=t=>{
    const values=decisionDialValues(contract); values[axis.id]=t;
    const ranked=decisionScored(pool.entries,decisionWeights(contract,values));
    return ranked[0]?ranked[0].product:null;
  };
  const samples=DECISION_SLIDER_SAMPLES.map(at);
  let value=null;
  if(samples.every(Boolean)){
    const codes=new Set(samples.map(product=>product.code));
    value={cheap:samples[0],best:samples[samples.length-1],moves:codes.size>1};
  }
  _decisionEndsCache={key:key,value:value};
  return value;
}
function decisionNoAxisNote(contract){
  return (contract.budget&&contract.budget.available)
    ? 'This category has no single trade-off yet, so each measure is weighed on its own below.'
    : 'No price data here yet, so there is no cost trade-off to offer. The ranking uses only the evidence available for this category.';
}
function decisionLimitHTML(contract,pool,axis){
  if(!axis)return '';
  const read=decisionValuesSideRead(axis), poles=decisionAxisPoles(axis), out=[];
  if(read.nutritionLed){
    const nutrition=read.nutrition.map(decisionCriterionName), values=read.values.map(decisionCriterionName);
    out.push(`<details class="decision-limit"><summary><span>What &ldquo;${esc(poles[1])}&rdquo; measures here</span><strong>read before comparing</strong></summary>
      <p>This comparison uses open food data. That side is driven mostly by nutrition (${esc(nutrition.join(', '))})${values.length?`, with ${esc(values.join(', '))} as the non-nutrition evidence`:''}.</p>
      <p><b>Organic, fair trade, packaging, and farmer pay are not scored here yet.</b> Read this as a nutrition-led comparison, not a sourcing verdict.</p>
      <p><a href="#contribute/problem/${encodeURIComponent(contract.category)}">Suggest a sourced correction &rarr;</a></p></details>`);
  }
  const ends=decisionSliderEnds(contract,pool,axis);
  if(ends&&!ends.moves&&pool.entries.length>1){
    out.push(`<p class="decision-limit-flat"><b>Moving this slider doesn&rsquo;t change the answer here.</b> ${esc(ends.cheap.name)} leads wherever you put it${read.nutritionLed?', and the values side is mostly nutrition data. See above.':'. It is both the cheaper option and the strongest on the values measured here.'}</p>`);
  }
  return out.join('');
}
function decisionCriterionBarsHTML(product,weights){
  const rows=[], used=Object.values(weights||{}).filter(Number.isFinite);
  /* "Lead" marks what the slider is actually favouring right now, so it must be relative: at the
     balanced midpoint every weight is equal and nothing leads. A fixed threshold marked every bar. */
  const top=used.length?Math.max(...used):0, low=used.length?Math.min(...used):0, spread=top>low;
  for(const criterion of (DATA.criteria||[])){
    const value=product.scores&&product.scores[criterion.key];
    if(!Number.isFinite(value))continue;
    const weight=(weights&&weights[criterion.key])||0;
    rows.push(`<div class="da-bar${spread&&weight===top?' lead':''}"><span class="da-bar-name">${VALUE_PAGES[criterion.key]?`<a href="${valueHref(criterion.key)}">${esc(criterion.label||VALUE_PAGES[criterion.key].label)}</a>`:esc(criterion.label||String(criterion.key).replace(/_/g,' '))}</span><span class="da-bar-track"><span class="da-bar-fill" style="width:${Math.max(0,Math.min(100,value))}%"></span></span><span class="da-bar-val">${value}</span></div>`);
  }
  if(!rows.length)return '';
  const note=spread?'Bars are the measured facts. Highlighted rows are the ones your slider is weighing most.':'Bars are the measured facts. Balanced, so every one counts the same.';
  return `<div class="da-bars">${rows.join('')}</div><p class="da-bars-note">${note}</p>`;
}
function decisionOneAnswerHTML(group,contract,pool){
  const product=group.product, primary=group.recipes[0];
  const proof=provenanceChipHTML(product), bloom=valueBloom(product,72);
  const href=`#item/${encodeURIComponent(contract.category)}/${encodeURIComponent(product.code)}`;
  return `<article class="decision-answer da-one">
    <div class="da-top"><div><div class="da-kicker">Your answer</div><h2>${esc(product.name)}</h2>${product.brand?`<p class="decision-brand">${esc(product.brand)}</p>`:''}</div>${bloom}</div>
    <p class="da-why">${esc(decisionWhy(primary,contract))}</p>
    ${proof?`<div class="decision-answer-proof">${proof}</div>`:''}
    ${decisionCriterionBarsHTML(product,primary.weights)}
    <a class="savebtn decision-verdict" href="${esc(href)}">See why, with sources &rarr;</a>
  </article>`;
}
/* Everything that is not the answer lives below it, closed, and opens only when asked. */
function decisionQuietDoorsHTML(pool,contract,query,result){
  const listHref=rankingHref(contract.category,query), count=(result&&result.ranked&&result.ranked.length)||0;
  const seeAll=count>1?`<details class="decision-all" id="decision-all"><summary>Rank all ${result.ranked.length} with these choices &rarr;</summary><p>The baseline and my rules stay applied. The list below uses the same current settings.</p><div id="decision-ranked-list"></div></details>`:'';
  const others=(result&&result.groups&&result.groups.length>1)
    ? `<details class="decision-other" id="decision-other"><summary>Other ways to read this (${result.groups.length-1})</summary><div class="decision-answer-grid">${result.groups.slice(1).map(group=>decisionAnswerCardHTML(group,contract,pool)).join('')}</div></details>`
    : '';
  return `<div class="decision-quiet">${seeAll}${others}${decisionLineContextHTML(pool,listHref,contract)}${decisionPersonalFoldHTML(pool)}${decisionFloorFoldHTML(pool)}${decisionPrecedenceHTML(pool,result)}</div>`;
}
function renderDecisionAnswers(cid,query){
  const box=document.getElementById('decision-answers'); if(!box||!DATA||DATA.meta.id!==cid)return;
  const contract=decisionContract(); if(!contract)return;
  const values=decisionDialValues(contract), pool=decisionCandidatePool(contract,query), result=decisionRecipes(contract,pool,values);
  const prior=document.getElementById('decision-all'), keepOpen=!!(prior&&prior.open);
  const priorFloor=document.getElementById('decision-floor-fold'), keepFloorOpen=!!(priorFloor&&priorFloor.open);
  const priorPersonal=document.getElementById('decision-personal-fold'), keepPersonalOpen=!!(priorPersonal&&priorPersonal.open);
  const priorOther=document.getElementById('decision-other'), keepOtherOpen=!!(priorOther&&priorOther.open);
  const priorFine=document.getElementById('decision-finetune'), keepFineOpen=!!(priorFine&&priorFine.open);
  const axis=decisionPrimaryAxis(contract);
  const restore=()=>{
    const all=document.getElementById('decision-all');if(all)all.open=keepOpen;
    const other=document.getElementById('decision-other');if(other)other.open=keepOtherOpen;
    const personal=document.getElementById('decision-personal-fold');if(personal)personal.open=keepPersonalOpen;
    const floor=document.getElementById('decision-floor-fold');if(floor)floor.open=keepFloorOpen;
    const fine=document.getElementById('decision-finetune');if(fine)fine.open=keepFineOpen;
    box.querySelectorAll('[data-decision-leaning]').forEach(button=>button.onclick=()=>{
      const id=button.dataset.decisionLeaning;
      themeWeights[id]=(themeWeights[id]||3)>=4?3:5;saveThemes();renderDecisionAnswers(cid,query);
      announce(`${themeById(id).label} ${themeWeights[id]>=4?'will now break close calls':'returned to balanced'}; eligibility and scores did not change.`);
    });
    decisionPopulatePersonalFold(contract,pool,values);
    decisionPopulateFloorFold(contract,pool,values);
  };
  if(!result.recipes.length){
    box.innerHTML='<div class="onboard"><b>No answer clears the baseline and your rules.</b> Loosen a rule, widen the search, or open the folded options below. Nothing was guessed to fill the gap.</div>'+decisionQuietDoorsHTML(pool,contract,query,result);
    restore();return;
  }
  /* The "Your answer" card is retired here. It was computed from the sliders while the table above
     was computed from the reader's weights, so weighing low fees put Nationwide at the top of the
     table and left a card underneath still calling Triodos your answer. Two answers on one page,
     and the stale one wore the label. The table is the answer, every row of it opens its working,
     and the phase brief already settled that. What stays is what the table does not do: the limit
     on what the data can see, and the doors onward. The full ranked list stays too, folded, because
     the shared shell's generality receipt pins it for the other instances. */
  box.innerHTML=decisionLimitHTML(contract,pool,axis)+decisionQuietDoorsHTML(pool,contract,query,result);
  const list=document.getElementById('decision-ranked-list');
  if(list){for(const row of result.ranked.slice(0,40))list.appendChild(listCard(row.product,row.score));if(result.ranked.length>40)list.appendChild(el('p',{class:'decision-ranked-note'},`Showing the first 40 of ${result.ranked.length} ranked options.`));}
  restore();
}
function scheduleDecisionAnswers(cid,query){if(_decisionRAF)return;_decisionRAF=requestAnimationFrame(()=>{_decisionRAF=0;renderDecisionAnswers(cid,query);});}
/* THE COMPARISON TABLE — the list is the page. Column headers carry the standpoint (a weight dot
   per criterion: tap to weigh it most), any header sorts, and pressing a score opens that row's
   working: each fact times its weight, with the source that backs it. Three registers stay
   visible in one familiar surface: facts in the cells, your emphasis in the headers, the computed
   rank in the score column — and every number can show its work. */
var decisionTableState={};
function decisionTableCrits(contract){return (DATA.criteria||[]).slice(0,5);}
function decisionTableWeights(cid){
  const st=decisionTableState[cid]||{emph:[]};const w={};
  for(const c of (DATA.criteria||[]))w[c.key]=st.emph&&st.emph.indexOf(c.key)>=0?5:1;
  return w;}
function decisionEntryLine(p){
  let out=(p.description||'').trim();
  if(!out){const prov=p.provenance||{};
    for(const k in prov){const n=prov[k]&&prov[k].note;if(n&&n.length>out.length&&n.length<=150)out=n;}}
  out=String(out).replace(/\s+[\u2014\u2013]\s+/g,'; ');
  /* 20,718 of 23,689 descriptions end in one of two identical clauses naming the upstream data
     set. Identical on every row of a category, it says nothing a reader can choose between, and
     it eats the line so the part that does distinguish, the brand, gets truncated away. The
     sourcing is not lost: every score opens its own working with the real source and date, and
     on the nutrition-led categories the caveat above the table names the data set outright. */
  const trimmed=out.replace(/,?\s*scored from Open (?:Food|Beauty) Facts[^.]*\.?/ig,'').trim().replace(/[,;:]$/,'');
  // The guard only exists to stop a description that is nothing but the clause from becoming an
  // empty line. It was set at 24 and threw away "Deca Aqua from Malongo" at 22 characters, which
  // left one row still carrying the boilerplate everything else had lost.
  if(trimmed.length>=3)out=trimmed;
  // What is left on those rows opens by repeating the name already set in bold directly above it,
  // so the only new word is the brand. Say the brand.
  const nm=(p.name||'').trim();
  if(nm&&out.toLowerCase().indexOf(nm.toLowerCase())===0){
    const rest=out.slice(nm.length).replace(/^[\s,;:.–—-]+/,'').replace(/^from\s+/i,'').trim();
    if(rest.length>=1)out=rest; // "U" is a real French grocery brand; one letter is still a brand
  }
  if(out.length>140){const cut=out.lastIndexOf(' ',137);out=out.slice(0,cut>80?cut:137).replace(/[,;:]$/,'')+'\u2026';}
  return out;}
function decisionTableRows(cid,contract,pool){
  const st=decisionTableState[cid]||{sort:'score',dir:-1};
  const weights=decisionTableWeights(cid);
  const rows=pool.entries.map(p=>({p:p,s:CC.engine.score(p,{criteria:DATA.criteria,weights:weights,excludes:new Set()})}))
    .filter(r=>r.s);
  const key=st.sort||'score',dir=st.dir||-1;
  rows.sort((a,b)=>{
    const va=key==='score'?a.s.score:(a.p.scores?a.p.scores[key]:null);
    const vb=key==='score'?b.s.score:(b.p.scores?b.p.scores[key]:null);
    if(va==null&&vb==null)return 0;if(va==null)return 1;if(vb==null)return -1;
    return dir<0?(vb-va):(va-vb);});
  return rows;}
function decisionTableSentence(cid,contract,pool){
  const st=decisionTableState[cid]||{emph:[]};
  // The resting sentence is the point of the whole page. Until 2026-07-31 this returned nothing
  // until a weight had already been raised, so the one control that makes this list yours rather
  // than ours explained itself only to readers who had already found it. Measured on the live
  // site: the mark sat at y=457 and its only explanation at y=1912, below the whole table, with
  // nothing but a title tooltip that no touch device fires.
  if(!st.emph||!st.emph.length)return 'Every measure weighs the same here. Tap ○ on any column to weigh it most, and the list re-ranks.';
  const flat={};for(const c of (DATA.criteria||[]))flat[c.key]=1;
  const balanced=pool.entries.map(p=>({p:p,s:CC.engine.score(p,{criteria:DATA.criteria,weights:flat,excludes:new Set()})})).filter(r=>r.s).sort((a,b)=>b.s.score-a.s.score);
  const now=decisionTableRows(cid,contract,pool).slice().sort((a,b)=>b.s.score-a.s.score);
  if(!now.length)return '';
  const names=st.emph.map(k=>decisionCriterionName(k)).join(' and ');
  const lead=now[0].p,was=balanced[0]&&balanced[0].p;
  if(was&&was.code===lead.code)return 'Weighing '+names+' most: '+lead.name+' stays first at '+now[0].s.score+'.';
  return 'Weighing '+names+' most: '+lead.name+' takes the lead at '+now[0].s.score+(was?', ahead of '+was.name:'')+'.';}
function decisionDerivationHTML(p,weights){
  const rows=[];let sw=0,acc=0;
  for(const c of (DATA.criteria||[])){
    const v=p.scores?p.scores[c.key]:null,w=weights[c.key]||1;
    const pr=p.provenance&&p.provenance[c.key];
    const src=pr&&pr.source?String(pr.source):'';
    const dom=src.indexOf('://')>0?src.split('/')[2]:'';
    if(v==null){rows.push('<div class="dtx-row dtx-miss"><span>'+esc(decisionCriterionName(c.key))+'</span><span>no sourced fact; held at neutral, not guessed</span></div>');continue;}
    sw+=w;acc+=v*w;
    rows.push('<div class="dtx-row"><span>'+esc(decisionCriterionName(c.key))+'</span><span class="dtx-m">'+v+' \u00d7 '+w+'</span><span class="dtx-src">'
      +(pr&&pr.note?esc(String(pr.note).slice(0,120)):'')
      +(dom?' <a href="'+esc(src)+'" target="_blank" rel="noopener">'+esc(dom)+'</a>':'')
      +(pr&&pr.asof?' <i>'+esc(String(pr.asof))+'</i>':'')+'</span></div>');
  }
  const ps=p.provenanceSummary||{};
  return '<div class="dtx-box">'+rows.join('')
    +'<div class="dtx-tot">Weighted result '+(sw?Math.round(acc/sw):'0')+' / 100'
    +(ps.factCount?' \u00b7 '+ps.factCount+' sourced facts':'')
    +(ps.sourceDomainCount?' \u00b7 '+ps.sourceDomainCount+' independent source domain'+(ps.sourceDomainCount===1?'':'s'):'')+'</div></div>';}
/* THE SHAPE OF THE CHOICE. A 291 row table is not a decision, it is a filing cabinet, and the
   honest cut is not "the first twelve" but "the ones that could ever win". An option beaten by
   some other option on every single measure can never come first under any weighting a reader
   might choose, so it cannot be the answer to their question. Missing facts are skipped rather
   than counted as zero, which is the same refusal to guess the rest of the page makes, and it
   means an option with thin data stays in the running rather than being quietly eliminated. */
function decisionTableFrontier(rows,crits){
  const keys=crits.map(c=>c.key);
  const vec=r=>keys.map(k=>r.p.scores?r.p.scores[k]:null);
  const cache=rows.map(r=>({r:r,v:vec(r)}));
  const beats=(a,b)=>{let strict=false;
    for(let i=0;i<keys.length;i++){const x=a.v[i],y=b.v[i];
      if(x==null||y==null)continue;
      if(x<y)return false;
      if(x>y)strict=true;}
    return strict;};
  const keep=new Set();
  for(const b of cache){if(!cache.some(a=>a!==b&&beats(a,b)))keep.add(b.r.p.code);}
  return keep;}
function decisionTableShapeSentence(total,front,shown){
  if(total<=shown)return '';
  const dominated=total-front;
  let out='Showing '+shown+' of '+total+'. ';
  out+=front+' of them can come first depending on what you weigh';
  if(dominated>0)out+='; the other '+dominated+' are beaten by one of those on every measure';
  return out+'.';}
function decisionTableHTML(cid,contract,pool){
  const st=decisionTableState[cid]=decisionTableState[cid]||{emph:[],sort:'score',dir:-1,open:null,show:'top'};
  const crits=decisionTableCrits(contract);
  const allRows=decisionTableRows(cid,contract,pool);
  // A list only needs cutting when it is a wall. Banking's 19 rows read fine whole; coffee's 276
  // do not, and truncating both would be carrying a fix forward on the strength of it having
  // worked somewhere else. Measured per category, which is the rule.
  const TOP=12, WALL=26;
  const frontier=decisionTableFrontier(allRows,decisionTableCrits(contract));
  const rows=allRows.length<WALL?allRows
    :st.show==='all'?allRows
    :st.show==='frontier'?allRows.filter(r=>frontier.has(r.p.code))
    :allRows.slice(0,TOP);
  const weights=decisionTableWeights(cid);
  const best={};for(const c of crits){let m=-1;for(const r of rows){const v=r.p.scores?r.p.scores[c.key]:null;if(v!=null&&v>m)m=v;}best[c.key]=m;}
  const sent=decisionTableSentence(cid,contract,pool);
  const arrow=k=>st.sort===k?(st.dir<0?' \u2193':' \u2191'):'';
  let h='<div class="dtable-wrap">';
  if(sent)h+='<p class="dtable-sent" aria-live="polite">'+esc(sent)+'</p>';
  /* The app has always known when a category's values side is really nutrition data. It said so
     inside a collapsed disclosure, which then ended up nested inside the collapsed controls when
     those moved below the table, so the caveat sat two clicks and a screen away from the ranking
     it qualifies. On coffee that ranking recommends instant coffee because processing scores well.
     A limit that a reader has to go looking for is not a disclosure. It goes above the table. */
  // Test the columns the reader is actually looking at, not the contract axis. The axis read is
  // about one slider; the table is the whole answer, and on coffee its columns are processing,
  // protein and low sugar. If most of what is on screen is nutrition, the page says so on screen.
  const nutCols=crits.filter(c=>DECISION_NUTRITION_KEYS.has(c.key));
  if(nutCols.length&&nutCols.length>=crits.length/2){
    const nut=nutCols.map(c=>decisionCriterionLabel(c)).join(', ');
    h+='<p class="dtable-caveat">Scored from open food data, so most of what is compared here is nutrition ('
      +esc(nut)+'). Organic, fair trade, packaging and farmer pay are not scored yet. Read this as a nutrition comparison, not a sourcing verdict.</p>';
  }
  h+='<div class="dtable-scroll"><table class="dtable"><thead><tr><th class="dt-name">'+allRows.length+' compared</th>';
  for(const c of crits){const on=st.emph.indexOf(c.key)>=0;
    h+='<th class="dt-c"><button type="button" class="dt-sort" data-sort="'+esc(c.key)+'">'+esc(decisionCriterionLabel(c))+arrow(c.key)+'</button>'
      +'<button type="button" class="dt-w'+(on?' on':'')+'" data-emph="'+esc(c.key)+'" aria-pressed="'+on+'" aria-label="Weigh '+esc(decisionCriterionLabel(c))+' most" title="Weigh '+esc(decisionCriterionLabel(c))+' most">'+(on?'\u25cf':'\u25cb')+'</button></th>';}
  h+='<th class="dt-s"><button type="button" class="dt-sort" data-sort="score">For you'+arrow('score')+'</button></th></tr></thead><tbody>';
  for(const r of rows){
    const line=decisionEntryLine(r.p);
    h+='<tr class="dt-row"><td class="dt-name"><a href="#item/'+encodeURIComponent(cid)+'/'+encodeURIComponent(r.p.code)+'">'+esc(r.p.name)+'</a>'
      +(line?'<span class="dt-line">'+esc(line)+'</span>':'')+'</td>';
    for(const c of crits){const v=r.p.scores?r.p.scores[c.key]:null;
      h+= v==null?'<td class="dt-c dt-null">&ndash;</td>'
        :'<td class="dt-c'+(v===best[c.key]?' dt-best':'')+(st.emph.indexOf(c.key)>=0?' dt-emph':'')+'" style="--w:'+v+'%">'+v+'</td>';}
    h+='<td class="dt-s"><button type="button" class="dt-open" data-open="'+esc(r.p.code)+'" title="Show the working">'+r.s.score+'</button></td></tr>';
    if(st.open===r.p.code)h+='<tr class="dtx"><td colspan="'+(crits.length+2)+'">'+decisionDerivationHTML(r.p,weights)+'</td></tr>';
  }
  // The weighting instruction moved up into the caption, where it is in the first screen. What is
  // left below the table is the one thing a reader only needs once they are reading a row.
  h+='</tbody></table></div>';
  const shape=decisionTableShapeSentence(allRows.length,frontier.size,rows.length);
  if(shape){
    h+='<p class="dtable-shape">'+esc(shape)+'</p><p class="dtable-more">';
    if(st.show!=='frontier'&&frontier.size>rows.length)
      h+='<button type="button" class="dt-show" data-show="frontier">Show the '+frontier.size+' that can come first</button>';
    if(st.show!=='all')
      h+='<button type="button" class="dt-show" data-show="all">Show all '+allRows.length+'</button>';
    if(st.show!=='top')
      h+='<button type="button" class="dt-show" data-show="top">Back to the top '+TOP+'</button>';
    h+='</p>';
  }
  h+='<p class="dtable-note">Tap any score to see its working.</p></div>';
  return h;}
function wireDecisionTable(cid,facet,contract){
  const v=document.getElementById('view-decide');if(!v)return;
  v.querySelectorAll('.dt-w').forEach(function(b){b.onclick=function(){
    const st=decisionTableState[cid];const k=b.dataset.emph;const i=st.emph.indexOf(k);
    if(i>=0)st.emph.splice(i,1);else st.emph.push(k);
    renderContractDecision(cid,facet,contract);
    const sent=decisionTableSentence(cid,contract,decisionCandidatePool(contract,String(facet||'').trim()));
    announce(sent||'Every measure weighs the same again.');};});
  v.querySelectorAll('.dt-sort').forEach(function(b){b.onclick=function(){
    const st=decisionTableState[cid];const k=b.dataset.sort;
    if(st.sort===k)st.dir=-st.dir;else{st.sort=k;st.dir=-1;}
    renderContractDecision(cid,facet,contract);};});
  v.querySelectorAll('.dt-show').forEach(function(b){b.onclick=function(){
    const st=decisionTableState[cid];st.show=b.dataset.show;
    renderContractDecision(cid,facet,contract);
    announce(b.textContent.trim());};});
  v.querySelectorAll('.dt-open').forEach(function(b){b.onclick=function(){
    const st=decisionTableState[cid];st.open=st.open===b.dataset.open?null:b.dataset.open;
    renderContractDecision(cid,facet,contract);};});
}
function renderContractDecision(cid,facet,contract){
  const v=document.getElementById('view-decide'), query=String(facet||'').trim(), listHref=rankingHref(cid,query), values=decisionDialValues(contract), pool=decisionCandidatePool(contract,query);
  const axis=decisionPrimaryAxis(contract), secondary=decisionSecondaryAxes(contract);
  const dirty=!decisionDialsAreDefault(contract,values);
  const zero=decisionDialsAreDefault(contract,values)&&!decisionActiveLineLabels().length
    ? 'A balanced view. Set a rule or change a choice to make it yours.'
    : 'My rules and these choices stay on this device.';
  const slider=axis
    ? `<section class="decision-slider" aria-labelledby="decision-controls-title"><div class="ds-name"><div class="decision-kicker">For this decision</div><h2 id="decision-controls-title">What matters here</h2></div>${decisionDialHTML(axis,values[axis.id])}<p class="ds-note">${esc(decisionBudgetNote(contract))}</p><button class="ds-reset" id="decision-reset" type="button"${dirty?'':' hidden'}>Reset choices</button></section>`
    : `<section class="decision-slider decision-noaxis" aria-labelledby="decision-controls-title"><div class="ds-name"><div class="decision-kicker">For this decision</div><h2 id="decision-controls-title">What matters here</h2></div><p class="ds-note">${esc(decisionNoAxisNote(contract))}</p></section>`;
  const more=secondary.length
    ? `<details class="decision-more" id="decision-more"><summary>More controls (${secondary.length})</summary><div class="decision-more-body">${secondary.map(item=>decisionDialHTML(item,values[item.id])).join('')}${!axis&&dirty?'<button class="savebtn" id="decision-reset" type="button">Reset choices</button>':''}</div></details>`
    : '';
  const tableHtml=decisionTableHTML(cid,contract,pool);
  const controlsHtml=tableHtml+`<details class="decision-oldcontrols"><summary>What can change the answer</summary>`+slider+more+`<p class="decision-zero">${esc(zero)}</p></details>`;
  const presentation=!query&&CC.presentation&&CC.presentation.current()&&CC.presentation.fixtureFor(CC.presentation.current(),'category','#decide/'+cid)?CC.presentation.current():null;
  if(presentation){
    const guide=CAT_GUIDE[cid], hasGuide=!!(guide&&(window.CC_GUIDES||[]).some(item=>item.slug===guide));
    v.innerHTML=CC.presentation.categoryFrame(presentation,{
      category:cid,
      route:'#decide/'+cid,
      read:contract.reads.text,
      controlsHtml:controlsHtml,
      connectionsHtml:decisionNextHTML(contract),
      datasetHref:'./data/'+cid+'.json',
      guideHref:hasGuide?'#guide/'+encodeURIComponent(guide):''
    });
    const search=v.querySelector('[data-presentation-search-form]');if(search)search.onsubmit=e=>{e.preventDefault();const input=search.querySelector('input[type="search"]'),term=input&&input.value.trim();if(term)location.hash='#search/'+encodeURIComponent(term);};
    const saveList=document.getElementById('decision-save-list');if(saveList)saveList.onclick=()=>{const receipt=decisionSaveList(contract,query),status=document.getElementById('decision-save-status');saveList.textContent='List saved';saveList.classList.add('on');if(status)status.textContent=`Saved ${receipt.choices.length} ranked choices on this device. Your file will include them.`;announce(`${DATA.meta.label} list saved on this device.`);};
  }else{
    v.innerHTML=`<div class="decision-page decision-one${contract.page&&contract.page.primaryRoute?' decision-primary':''}"><a class="back" href="${esc(listHref)}">&larr; all ${esc(DATA.meta.label.toLowerCase())}</a><header class="decision-head"><div class="decision-kicker">Choosing</div><h1>${esc(DATA.meta.label)}</h1><p class="decision-read">${esc(contract.reads.text)}</p></header>${controlsHtml}<section id="decision-answers" aria-live="polite"></section>${decisionNextHTML(contract)}</div>`;
  }
  v.querySelectorAll('[data-decision-axis]').forEach(input=>{
    sliderFill(input);
    input.addEventListener('input',e=>{const axis=(contract.axes||[]).find(x=>x.id===e.target.dataset.decisionAxis);if(!axis)return;const value=+e.target.value;decisionDialState[cid]=Object.assign({},decisionDialState[cid]||{},{[axis.id]:value});decisionSaveDials();sliderFill(e.target);const out=document.getElementById('decision-dial-value-'+axis.id);if(out)out.textContent=decisionDialPosition(axis,value);const reset=document.getElementById('decision-reset');if(reset)reset.hidden=decisionDialsAreDefault(contract,decisionDialValues(contract));scheduleDecisionAnswers(cid,query);});
    input.addEventListener('change',()=>{const latest=decisionRecipes(contract,decisionCandidatePool(contract,query),decisionDialValues(contract));if(latest.recipes[0])announce('Answer updated. '+latest.recipes[0].product.name+' now leads.');});
  });
  v.querySelectorAll('[data-floor-rule]').forEach(input=>input.addEventListener('change',e=>{
    const rule=decisionFloorSet()&&(decisionFloorSet().rules||[]).find(item=>item.id===e.target.dataset.floorRule);if(!rule)return;
    const applies=(rule.scope&&rule.scope.categories||[]).includes(cid);
    decisionSetFloorRule(rule.id,!!e.target.checked);renderContractDecision(cid,facet,contract);
    const door=document.querySelector('.decision-floor');if(door)door.open=true;
    const next=document.querySelector(`[data-floor-rule="${rule.id}"]`);if(next)next.focus();
    announce(`${rule.label} ${e.target.checked?'restored':'loosened'} on this device. ${applies?'Answers updated.':`This applies to ${decisionFloorScopeLabel(rule)}.`}`);
  }));
  const floorRestore=document.getElementById('decision-floor-restore');if(floorRestore)floorRestore.onclick=()=>{decisionRestoreFloor();renderContractDecision(cid,facet,contract);const door=document.querySelector('.decision-floor');if(door)door.open=true;const first=document.querySelector('[data-floor-rule]');if(first)first.focus();announce('All published baseline rules restored on this device.');};
  const reset=document.getElementById('decision-reset');if(reset)reset.onclick=()=>{delete decisionDialState[cid];decisionSaveDials();renderContractDecision(cid,facet,contract);announce('Choices reset to balanced.');};
  wireDecisionTable(cid,facet,contract);
  renderDecisionAnswers(cid,query);
  const challenge=document.getElementById('decision-challenge');if(challenge)renderChallengeBox(cid,challenge);
  const challengeJump=document.getElementById('decision-challenge-jump');if(challengeJump&&challenge)challengeJump.onclick=()=>{challenge.scrollIntoView({behavior:'smooth',block:'start'});challenge.focus({preventScroll:true});announce('Challenge view. Your current choices stay unchanged.');};
}
function renderDecide(cid,facet){
  const v=document.getElementById('view-decide'); if(!v)return;
  if(!DATA||DATA.meta.id!==cid){v.innerHTML='<p class="sectionsub">Loading&hellip;</p>';return;}
  const contract=decisionContract();
  if(contract&&contract.category===cid&&contract.reads&&Array.isArray(contract.axes))return renderContractDecision(cid,facet,contract);
  renderLegacyDecide(cid,facet);
}
function presentationGapRecord(id){
  const presentation=CC.presentation&&CC.presentation.current();
  return presentation&&(presentation.taxonomy.decisions||[]).find(item=>item.id===id&&item.state==='not-yet-covered')||null;
}
function presentationGapFixture(id){
  const presentation=CC.presentation&&CC.presentation.current();
  return presentation&&CC.presentation.fixtureFor(presentation,'category','#not-yet-covered/'+id)||null;
}
function presentationGapPath(record){
  const presentation=CC.presentation.current(), need=(presentation.taxonomy.needs||[]).find(item=>item.id===record.need);
  const category=need&&(need.categories||[]).find(item=>item.id===record.category), subcategory=category&&(category.subcategories||[]).find(item=>item.id===record.subcategory);
  return [need&&need.label,category&&category.label,subcategory&&subcategory.label,record.label].filter(Boolean).map(label=>String(label).toLowerCase().replace(/(^|\s)\S/g,ch=>ch.toUpperCase()));
}
function renderPresentationGap(id){
  const v=document.getElementById('view-decide'), presentation=CC.presentation&&CC.presentation.current(), record=presentationGapRecord(id);if(!v||!presentation||!record)return false;
  const route='#not-yet-covered/'+id, fixture=presentationGapFixture(id)||{pageKind:'category',state:'not-yet-covered',title:record.label,route:route,expected:{coverage:'Not yet covered',action:'Suggest sources',path:presentationGapPath(record),mustShow:[record.label,'We do not have a comparison yet'],mustNotClaim:[]}};
  v.innerHTML=CC.presentation.categoryFrame(presentation,{category:id,route:route,fixture:fixture,parentLabel:(fixture.expected.path||[])[0],needHref:'#need/'+encodeURIComponent(record.need)});
  const search=v.querySelector('[data-presentation-search-form]');if(search)search.onsubmit=e=>{e.preventDefault();const input=search.querySelector('input[type="search"]'),term=input&&input.value.trim();if(term)location.hash='#search/'+encodeURIComponent(term);};
  return true;
}
function renderPresentationUnknown(id){
  const v=document.getElementById('view-decide'), presentation=CC.presentation&&CC.presentation.current();if(!v)return;
  v.innerHTML=CC.presentation&&presentation?CC.presentation.unknownFrame(presentation,{query:id}):'<h1>We could not find this page</h1><p>This address is not valid.</p><a href="#map">Back to Explore</a>';
  const search=v.querySelector('[data-presentation-search-form]');if(search)search.onsubmit=e=>{e.preventDefault();const input=search.querySelector('input[type="search"]'),term=input&&input.value.trim();if(term)location.hash='#search/'+encodeURIComponent(term);};
}
function renderLegacyDecide(cid,facet){
  const v=document.getElementById('view-decide'); if(!v)return;
  if(!DATA||DATA.meta.id!==cid){v.innerHTML='<p class="sectionsub">Loading…</p>';return;}
  const q=String(facet||'').trim(), listHref=exploreHref(cid,q), label=DATA.meta.label.toLowerCase();
  const scopeTitle=q?`${esc(q)} in ${esc(label)}`:esc(label);
  const head=`<a class="back" href="${esc(listHref)}">← the full ranking</a><h2 class="sectionh">Deciding on ${scopeTitle}?</h2>`;
  // The pure values-ranking, scoped to the same facet/search context the list showed.
  const scored=DATA.products.filter(x=>productMatchesQuery(x,q)).map(x=>[x,score(x)]).filter(z=>z[1]).sort((a,b)=>b[1].score-a[1].score);
  if(!scored.length){v.innerHTML=head+`<p class="sectionsub">Nothing clears your needs here, <a href="#you">adjust them →</a> or <a href="${esc(listHref)}">see the list</a>.</p>`;return;}
  const [pick,ps]=scored[0], t=scoreTier(ps.score), reason=headlineReason(pick,DATA,ps);
  const runner=scored[1]||null, last=scored.length>2?scored[scored.length-1]:null;
  const gap=runner?Math.round(ps.score-runner[1].score):99, dxR=runner?decidingAxis(pick,runner[0]):null;
  const conf=!runner?'The one option that fits your values here.'
    :gap>=10?`A clear call, it leads the next by <b>${gap}</b> point${gap===1?'':'s'}.`
    :gap>=4?`It leads, though ${esc(runner[0].name)} is close behind.`
    :`It's close: ${esc(pick.name)} and ${esc(runner[0].name)} nearly tie${dxR?`, and <b>${esc(dxR.label)}</b> is what tips it`:''}.`;
  const verb=DECIDE_VERB[cid], gslug=CAT_GUIDE[cid], hasGuide=!!(gslug&&(window.CC_GUIDES||[]).some(g=>g.slug===gslug));
  const act=hasGuide?{l:(verb||'See how')+', read the guide',h:'#guide/'+gslug}:{l:verb||('Compare all '+DATA.meta.label.toLowerCase()),h:listHref};
  let html=head+`<p class="sectionsub" style="margin-top:-.3rem">Your call${q?` within <b>${esc(q)}</b>`:''}, weighted by <b>your</b> values, never by who pays.</p>
    <div style="background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:14px;padding:1.1rem 1.25rem;margin:.4rem 0 1.1rem">
      <div style="font-size:.74rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)">For your values, choose</div>
      <div style="font-size:1.65rem;font-weight:700;margin:.15rem 0 .4rem">${esc(pick.name)}${pick.brand?` <span style="font-size:.95rem;color:var(--hint);font-weight:400">${esc(pick.brand)}</span>`:''}</div>
      <div style="display:flex;align-items:baseline;gap:.6rem;margin-bottom:.5rem"><span style="font-size:2rem;font-weight:700">${ps.score}</span><span><span class="stier ${t[1]}">${t[0]}</span> <span style="color:var(--muted)">for you</span></span></div>
      ${reason?`<div style="border-left:3px solid var(--accent);background:var(--bg);border-radius:0 8px 8px 0;padding:.5rem .75rem;margin:.3rem 0;font-size:.92rem"><b>${esc(reason.label)}: ${esc(reason.band[0])}</b>, ${esc(reason.note||'')} ${reason.source?`<a href="${esc(reason.source)}" target="_blank" rel="noopener">source ↗</a>`:''}</div>`:''}
      <div style="color:var(--muted);font-size:.92rem;margin:.45rem 0 .85rem">${conf}</div>
      <a class="catbtn" href="#item/${cid}/${encodeURIComponent(pick.code)}">See the full verdict →</a>
    </div>`;
  if(runner){const [rp,rs]=runner, rwhy=rs.why&&rs.why.length?rs.why[0]:null;
    html+=`<div style="margin:0 0 .9rem"><div style="font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--hint);margin-bottom:.25rem">If not ${esc(pick.name)}</div><div style="font-size:.95rem"><b>${esc(rp.name)}</b> <span style="color:var(--hint)">${rs.score}</span>, ${rwhy?`strong on ${esc(rwhy)}, `:''}but ${esc(pick.name)} edges it${dxR?` on <b>${esc(dxR.label)}</b>`:''}.</div></div>`;
  }
  if(last){const [lp,ls]=last, wk=weakestAxis(lp);
    if(wk&&wk[1]<55)html+=`<div style="margin:0 0 1rem"><div style="font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a8432f;margin-bottom:.25rem">Steer clear</div><div style="font-size:.95rem"><b>${esc(lp.name)}</b> <span style="color:var(--hint)">${ls.score}</span>, weakest on <b>${esc(wk[0])}</b> (${wk[1]}/100), which you weigh.</div></div>`;
  }
  html+=`<a class="catbtn" href="${esc(act.h)}" style="display:inline-block">${esc(act.l)} →</a>
    <p class="sectionsub" style="margin-top:1.1rem;font-size:.86rem">Want a different answer? <a href="#you">Weigh your values →</a> · <a href="${esc(listHref)}">see all ${scored.length} →</a></p>`;
  v.innerHTML=html;
}
// ── COMMUNITY-AUTHORED INDEXES — your own forkable way of slicing the commons: the things STRONG on the values
//    you care about, across every category at once. A saved index is a small `open-values-index` file you own —
//    run it, export it, fork someone else's. No official taxonomy, no server, nothing uploaded. (docs/THE-WEAVE.md)
const INDEX_KEY='cc.indexes.v1';
let idxBuild=new Set(), idxName='';
function loadIndexes(){try{return JSON.parse(localStorage.getItem(INDEX_KEY)||'[]')||[];}catch(e){return[];}}
function persistIndexes(a){try{localStorage.setItem(INDEX_KEY,JSON.stringify(a));}catch(e){}}
function _ixid(name){return 'ix-'+String(name||'index').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,20)+'-'+(loadIndexes().length+1);}
function saveIndex(name,values){const a=loadIndexes();const ix={format:'open-values-index',version:'0.1',id:_ixid(name),name:name,values:values,min:60,by:'',created:new Date().toISOString()};a.unshift(ix);persistIndexes(a);return ix;}
function deleteIndex(id){persistIndexes(loadIndexes().filter(x=>x.id!==id));}
function exportIndex(ix){const b=new Blob([JSON.stringify(ix,null,2)],{type:'application/json'});const a=el('a',{href:URL.createObjectURL(b),download:String(ix.name||'index').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.index.json'});a.click();announce('Index exported, a file you own; share or fork it.');}
function importIndexPrompt(){const inp=el('input',{type:'file',accept:'.json,application/json'});inp.onchange=ev=>{const f=ev.target.files&&ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(j&&j.format==='open-values-index'&&Array.isArray(j.values)&&j.values.length){j.id=_ixid(j.name);const a=loadIndexes();a.unshift(j);persistIndexes(a);renderIndexes();announce('Index added, “'+(j.name||'shared index')+'”.');}else announce('That isn’t an open-values index file.');}catch(_){announce('Could not read that index file.');}};r.readAsText(f);};inp.click();}
function runIndexResults(index){
  const box=document.getElementById('idxresults');if(!box)return;
  box.innerHTML='<p class="sectionsub" style="margin-top:1rem">Searching the commons…</p>';
  loadAllCategories().then(()=>{
    const D=(window.CC_BUNDLE&&CC_BUNDLE.data)||{}, matches=[];
    for(const cid in D){const ds=D[cid];for(const pr of (ds.products||ds.resources||[])){
      if(CC.engine.indexMatch(pr,index)){const sig=CC.engine.signature(pr);let s=0,n=0;for(const vv of index.values){if(sig[vv]!=null){s+=sig[vv];n++;}}matches.push({cid:cid,p:pr,label:ds.meta.label,score:n?Math.round(s/n):0});}
    }}
    matches.sort((a,b)=>b.score-a.score);
    const vlabels=index.values.map(k=>{const t=THEMES.find(x=>x.id===k);return t?t.label:k;});
    let h=`<div class="dsh" style="margin-top:1.4rem">“${esc(index.name||'Index')}”, <b>${matches.length}</b> strong on ${esc(vlabels.join(' + '))}${matches.length>48?' · top 48':''}</div>`;
    if(!matches.length){h+='<p class="alts-sub">Nothing in the commons is strong on all of those at once, try fewer values, or just one.</p>';box.innerHTML=h;return;}
    h+='<div id="idxcards"></div>';box.innerHTML=h;
    const c=document.getElementById('idxcards');
    for(const m of matches.slice(0,48)){const card=el('div',{class:'card click'});card.innerHTML=`<div class="top"><div><span class="nm">${esc(m.p.name)}</span>${m.p.brand?` <span class="br">${esc(m.p.brand)}</span>`:''} <span class="catbadge">${esc(m.label)}</span></div><div class="sc">${m.score}<small> /100</small></div></div>`;makeClickable(card,()=>openProductFromSearch(m.cid,m.p.code),`View ${m.p.name}`);c.appendChild(card);}
  });
}
function renderIndexes(){
  const v=document.getElementById('view-indexes');if(!v)return;
  let chips='';for(const t of THEMES){const on=idxBuild.has(t.id);chips+=`<button type="button" class="themechip${on?' on':''}" data-th="${t.id}" aria-pressed="${on}">${hueDot(t.id)}${esc(t.label)}</button>`;}
  const list=loadIndexes();let saved='';
  for(const ix of list){const dots=(ix.values||[]).map(k=>hueDot(k)).join('');
    saved+=`<div class="card idxrow"><div class="idxrow-h"><b>${esc(ix.name)}</b><span class="idxrow-v">${dots}</span></div><div class="idxrow-a"><button class="savebtn" data-run="${esc(ix.id)}">▸ run</button><button class="savebtn" data-exp="${esc(ix.id)}">⤓ export</button><button class="savebtn" data-del="${esc(ix.id)}">delete</button></div></div>`;}
  v.innerHTML=`<a class="back" href="#map">← Explore</a><h2 class="sectionh">Your indexes</h2>`
    +`<p class="sectionsub">Author your own way of slicing the commons, the things <b>strong on the values you care about</b>, across every category at once. An index is a small file you own: run it, export it, and share or fork it. No official taxonomy, no server, nothing uploaded.</p>`
    +`<div class="card"><div class="dsh">Build an index, pick the values it's about</div><div class="themechips" id="idxchips">${chips}</div>`
    +`<div class="idxbuild-row"><input id="idxname" placeholder="Name it, e.g. Planet & fair labour" value="${esc(idxName)}"><button class="catbtn" id="idxsave">Save index</button><button class="savebtn" id="idxprev">Preview</button></div></div>`
    +(list.length?`<div class="dsh" style="margin-top:1.3rem">Saved on this device · <button class="savebtn" id="idximport">⤒ apply a shared one</button></div>${saved}`:`<p class="sectionsub" style="margin-top:1rem">No saved indexes yet, build one above, or <button class="savebtn" id="idximport">⤒ apply a shared index file</button>.</p>`)
    +`<div id="idxresults"></div>`;
  v.querySelectorAll('#idxchips .themechip').forEach(b=>b.onclick=()=>{const id=b.dataset.th;idxBuild.has(id)?idxBuild.delete(id):idxBuild.add(id);renderIndexes();});
  const nm=document.getElementById('idxname');if(nm)nm.oninput=e=>{idxName=e.target.value;};
  const sv=document.getElementById('idxsave');if(sv)sv.onclick=()=>{if(!idxBuild.size){announce('Pick at least one value for your index.');return;}const ix=saveIndex(idxName.trim()||'My index',[...idxBuild]);idxName='';idxBuild=new Set();renderIndexes();runIndexResults(ix);};
  const pv=document.getElementById('idxprev');if(pv)pv.onclick=()=>{if(!idxBuild.size){announce('Pick at least one value to preview.');return;}runIndexResults({name:idxName.trim()||'Preview',values:[...idxBuild],min:60});};
  v.querySelectorAll('[data-run]').forEach(b=>b.onclick=()=>{const ix=loadIndexes().find(x=>x.id===b.dataset.run);if(ix)runIndexResults(ix);});
  v.querySelectorAll('[data-exp]').forEach(b=>b.onclick=()=>{const ix=loadIndexes().find(x=>x.id===b.dataset.exp);if(ix)exportIndex(ix);});
  v.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{deleteIndex(b.dataset.del);renderIndexes();});
  const im=document.getElementById('idximport');if(im)im.onclick=importIndexPrompt;
}
/* renderBrowse retired 2026-07-19: the atlas and the lattice are the browse. The #browse
   route survives as a redirect so old links keep working. */
function discoverInventory(){
  const data=(window.CC_BUNDLE&&window.CC_BUNDLE.data)||{};
  const values={}, labels={}, regions={}, types={};
  for(const cid in data){const ds=data[cid];
    types[ds.meta.type]=(types[ds.meta.type]||0)+ds.products.length;
    for(const c of ds.criteria){if(!values[c.key])values[c.key]={label:c.label,n:0};values[c.key].n++;}
    for(const p of ds.products){
      for(const f of (p.focuses||[]))labels[f]=(labels[f]||0)+1;
      for(const r of (p.region||[]))if(r!=='global')regions[r]=(regions[r]||0)+1;
    }
  }
  return {values,labels,regions,types};
}
function discoverResults(kind,key){
  const data=window.CC_BUNDLE.data, out=[];
  const alg=new Set(YOU.allergens), reg=YOU.region;          // the standing self conditions Discover too
  for(const cid in data){const ds=data[cid];
    for(const p of ds.products){
      if(alg.size&&(p.allergens||[]).some(a=>alg.has(a)))continue;
      if(kind!=='region'&&reg!=='everywhere'&&p.region&&p.region.length&&!p.region.includes('global')&&!p.region.includes(reg))continue;
      if(kind==='value'){const sc=p.scores&&p.scores[key];if(sc!=null)out.push({p,cid,label:ds.meta.label,val:sc});}
      else if(kind==='label'){if((p.focuses||[]).indexOf(key)>=0)out.push({p,cid,label:ds.meta.label,val:null});}
      else if(kind==='region'){if((p.region||[]).indexOf(key)>=0)out.push({p,cid,label:ds.meta.label,val:null});}
      else if(kind==='type'){if(ds.meta.type===key)out.push({p,cid,label:ds.meta.label,val:null});}
    }
  }
  if(kind==='value')out.sort((a,b)=>b.val-a.val);
  return out;
}
function renderDiscover(arg){
  const v=document.getElementById('view-discover');
  if(!(window.CC_BUNDLE&&window.CC_BUNDLE.data)){v.innerHTML='<p class="sectionsub">Loading…</p>';return;}
  const inv=discoverInventory();
  const parts=(arg||'').split('/'), kind=parts[0]||'', key=parts[1]?decodeURIComponent(parts.slice(1).join('/')):'';
  const res=(kind&&key)?discoverResults(kind,key).slice(0,48):[];
  let html=`<a class="back" href="#map">&larr; Explore</a><h2 class="sectionh">Across the commons</h2><p class="sectionsub">Everything carrying this label or value, across every category. ${REGION_SCOPE}</p>`;
  html+=`<p class="alts-sub" style="margin:-.2rem 0 .7rem"><a href="#indexes">${CC.icon('spark')} Or build &amp; save your own index of the values you care about &#8594;</a></p>`;
  // Faceted nav at scale (NN/g / Baymard): lead with the top facets, collapse the long tail, always show counts.
  const fl=(kd,k,lab,n)=>`<a class="facet${kind===kd&&key===k?' on':''}" href="#discover/${kd}/${encodeURIComponent(k)}">${esc(lab)}${n!=null?` <span class="fc">${n}</span>`:''}</a>`;
  const fsec=(title,noun,kd,items,lead)=>{if(!items.length)return '';let h=`<div class="facet-h">${title}</div><div class="facets">${items.slice(0,lead).map(it=>fl(kd,it[0],it[1],it[2])).join('')}</div>`;if(items.length>lead)h+=`<details class="facet-more"><summary>show all ${items.length} ${noun}</summary><div class="facets">${items.slice(lead).map(it=>fl(kd,it[0],it[1],it[2])).join('')}</div></details>`;return h;};
  html+=fsec('By value','values','value',Object.keys(inv.values).sort((a,b)=>inv.values[b].n-inv.values[a].n).map(k=>[k,inv.values[k].label,inv.values[k].n]),12);
  html+=fsec('By type','types','type',Object.keys(inv.types).sort((a,b)=>inv.types[b]-inv.types[a]).map(k=>[k,k,inv.types[k]]),9);
  html+=fsec('By label','labels','label',Object.keys(inv.labels).sort((a,b)=>inv.labels[b]-inv.labels[a]).map(k=>[k,k,inv.labels[k]]),16);
  html+=fsec('By region','regions','region',Object.keys(inv.regions).sort().map(k=>[k,regionLabel(k),inv.regions[k]]),9);
  if(kind&&key){
    const lab=kind==='value'?('Best on “'+esc((inv.values[key]||{label:key}).label)+'” across everything'):kind==='label'?('Everything labelled “'+esc(key)+'”'):kind==='type'?('All '+esc(key)):('Tagged for '+esc(regionLabel(key)));
    html+=`<div class="alts-h">${lab}, ${res.length}${res.length>=48?'+':''}</div><div id="discres"></div>`;
  } else html+=`<p class="alts-sub" style="margin-top:1.4rem">Pick a facet above to slice the commons.</p>`;
  v.innerHTML=html;
  if(kind&&key){const c=v.querySelector('#discres');
    for(const r of res){const card=el('div',{class:'card click'});
      card.innerHTML=`<div class="top"><div><span class="nm">${esc(r.p.name)}</span>${r.p.brand?` <span class="br">${esc(r.p.brand)}</span>`:''} <span class="catbadge">${esc(r.label)}</span></div>${r.val!=null?`<div class="sc">${r.val}<small> /100</small></div>`:''}</div>`;
      makeClickable(card,()=>openProductFromSearch(r.cid,r.p.code),`View ${r.p.name}`);
      c.appendChild(card);}
  }
}

// --- H3: universal search across guides + products (honest across entry types) ---
function searchGuides(q){
  return (window.CC_GUIDES||[]).filter(g=>(g.title+' '+g.category+' '+g.summary+' '+g.html.replace(/<[^>]+>/g,' ')).toLowerCase().includes(q));
}
function searchProducts(q){
  const out=[], data=(window.CC_BUNDLE&&window.CC_BUNDLE.data)||{};
  for(const cid in data){const ds=data[cid];
    for(const p of ds.products){if((p.name+' '+p.brand+' '+(p.focuses||[]).join(' ')).toLowerCase().includes(q))out.push({p,catId:cid,catLabel:ds.meta.label,type:ds.meta.type});}}
  return out;
}
function openProductFromSearch(catId,code){location.hash='item/'+encodeURIComponent(catId)+'/'+encodeURIComponent(code);}
function renderSearch(query){
  const v=document.getElementById('view-search'), q=query.toLowerCase().trim();
  const guides=q?searchGuides(q):[];
  let prods=q?searchProducts(q):[];
  prods.forEach(r=>{r.sameType=(r.type===(DATA&&DATA.meta.type));r.s=r.sameType?score(r.p):null;});
  prods.sort((a,b)=>((b.s?b.s.score:-1)-(a.s?a.s.score:-1)));
  const shown=prods.slice(0,30);
  let html=`<form class="hsearch" id="ssearch" style="margin-bottom:1.25rem"><input type="search" id="sq" placeholder="Search products, brands, guides…" autocomplete="off"><button type="submit">Search</button></form>`;
  // Ask found places this could mean — offer them first, as places, not results
  if(window._askQ===query&&window._askHits&&window._askHits.length){
    html+=`<div class="facet-h" style="margin-top:0">Places this could mean</div><div class="facets" style="margin-bottom:1rem">${window._askHits.map(h=>`<a class="facet" href="${esc(h.hash)}">${esc(h.label)} <span class="fc">${esc(h.type)}</span></a>`).join('')}</div>`;
  }
  html+=`<p class="sectionsub">${q?`Results for “${esc(query)}”, ${guides.length} guide${guides.length!==1?'s':''}, ${prods.length} entr${prods.length!==1?'ies':'y'}${prods.length>30?' (showing 30)':''}`:'Search across guides and everything in the commons.'}</p>`;
  if(q&&!guides.length&&!prods.length){
    // the designed miss — honest scope, nearest doors, one-tap request; never a bare zero (codex.md §5)
    const near=askEntries().filter(e=>e.type==='category').filter((e,i,a)=>a.findIndex(x=>x.hash===e.hash)===i)
      .map(e=>({e:e,hit:e.k.split(' ').some(t=>q.split(/\s+/).some(t2=>t&&t2&&(_dist1(t,t2)||t.includes(t2)||t2.includes(t))))}))
      .filter(x=>x.hit).slice(0,4);
    html+=`<div class="card" style="border-left:3px solid var(--accent)"><b>We don’t cover “${esc(query)}” yet.</b><p class="alts-sub" style="margin:.4rem 0 0">Coverage grows from specific requests. <a href="#contribute/want/${encodeURIComponent(query)}">Request this →</a>${near.length?`</p><div class="facet-h" style="margin-top:.7rem">Closest doors we do have</div><div class="facets">${near.map(x=>`<a class="facet" href="${esc(x.e.hash)}">${esc(x.e.label)}</a>`).join('')}</div><p class="alts-sub" style="margin:.5rem 0 0">`:''}Or walk the <a href="#map">full map →</a></p></div>`;
  }
  if(guides.length) html+=`<div class="alts-h">Guides</div>`+guides.map(g=>`<a class="guidecard" href="#guide/${g.slug}"><div class="gt">${esc(g.title)}</div>${g.category?`<div class="gc">${esc(g.category)}</div>`:''}<p class="gs">${esc(g.summary)}</p></a>`).join('');
  if(shown.length) html+=`<div class="alts-h">Entries</div><div id="sresults"></div>`;
  v.innerHTML=html;
  if(shown.length){const sr=document.getElementById('sresults');for(const r of shown){
    if(r.sameType){sr.appendChild(listCard(r.p,r.s,r.catLabel,()=>openProductFromSearch(r.catId,r.p.code)));}
    else{const c=el('div',{class:'card click'});c.innerHTML=`<div class="top"><div><span class="nm">${esc(r.p.name)}</span>${r.p.brand?` <span class="br">${esc(r.p.brand)}</span>`:''}<span class="catbadge">${esc(r.catLabel)}</span></div></div>`;makeClickable(c,()=>openProductFromSearch(r.catId,r.p.code),`View ${r.p.name}`);sr.appendChild(c);}
  }}
  const si=document.getElementById('sq'); if(si)si.value=query;
  const sf=document.getElementById('ssearch'); if(sf)sf.onsubmit=(e)=>{e.preventDefault();const nq=(si.value||'').trim();if(nq)location.hash='search/'+encodeURIComponent(nq);};
}
function goSearch(q){ // Ask first: resolve to the right page when we confidently can; else honest full search
  if(!q)return;
  resolveAsk(q).then(r=>{
    if(r&&r.kind==='nav'){location.hash=r.hash;return;}
    window._askHits=(r&&r.kind==='multi')?r.hits:null;window._askQ=q;
    location.hash='search/'+encodeURIComponent(q);
    if((location.hash.slice(1)||'').split('/')[0]==='search')route(); // same-hash re-ask still re-renders
  }).catch(()=>{location.hash='search/'+encodeURIComponent(q);});
}

// --- H5: a real, honest contribution loop (local-first, exportable) ---
const CONTRIB_KEY='cc.contrib.v1';
const CONTRIB_KINDS=[
  'Correct a sourced claim',
  'Add a missing option',
  'Request a category',
  'Suggest a guide',
  'Build an instance',
  'Report a bug'
];
const CONTRIB_HINTS={
  'Correct a sourced claim':'Include the category, item, what should change, a source URL, and an as-of date.',
  'Add a missing option':'Name the category and option, why it is mainstream / a values niche / an honest floor, region, and source URLs.',
  'Request a category':'Name the decision, who needs it, 5-10 recognizable options, and any open datasets or trusted sources.',
  'Suggest a guide':'Name the category or values question, the tension people face, and the sources a guide should lean on.',
  'Build an instance':'Name the domain, likely users, starter lens source, license posture, and how the Values Passport should carry over.',
  'Report a bug':'Say what happened, what you expected, the route or category, browser/device, and steps to repeat it.'
};
function loadContrib(){try{return JSON.parse(localStorage.getItem(CONTRIB_KEY)||'[]');}catch(e){return[];}}
let contribList=loadContrib();
function persistContrib(){try{localStorage.setItem(CONTRIB_KEY,JSON.stringify(contribList));}catch(e){}}
function addContrib(kind,text){contribList.unshift({time:new Date().toISOString(),kind,text});persistContrib();}
function exportContrib(){const b=new Blob([JSON.stringify(contribList,null,2)],{type:'application/json'});const a=el('a',{href:URL.createObjectURL(b),download:'conscious-consuming-suggestions.json'});a.click();}
// Maker support is OPT-IN and honest: set this to a Ko-fi / Liberapay / GitHub Sponsors URL to enable the button.
// Empty = no ask, and the section points only to funding the causes the data already covers. Never on the homepage.
const SUPPORT_MAKER_URL='';
// the receiving half made explicit: apply a correction file ANOTHER person sent you (same machinery, same engine).
function applyReceivedEl(){
  const c=el('div',{class:'card'});
  c.innerHTML=`<div class="alts-h" style="margin:0 0 .4rem">Apply a correction someone sent you</div><p class="youmuted">Got a <code>.patch.json</code> correction file? Apply it to your own copy, it merges reproducibly, on this device, and <b>nothing is uploaded</b>.</p>`;
  const lbl=el('label',{class:'catbtn',style:'cursor:pointer'},'Choose a correction file');
  const inp=el('input',{type:'file',accept:'.json,application/json',hidden:'hidden'});
  const note=el('span',{class:'youmuted',style:'margin-left:.6rem'});
  lbl.appendChild(inp); c.appendChild(lbl); c.appendChild(note);
  inp.onchange=e=>{const f=e.target.files&&e.target.files[0]; if(!f){return;} const rd=new FileReader();
    rd.onload=()=>{ let r={ok:false,reason:'invalid'}; try{r=applyPatchLocally(JSON.parse(rd.result));}catch(_){}
      note.textContent = !r.ok ? (r.reason==='duplicate'?"You've already applied that correction.":'That file is not a correction patch (it needs {target, ops}).')
        : r.applied ? ('Applied '+r.applied+' correction'+(r.applied>1?'s':'')+' to your copy of '+r.cid+(r.missed?(' · '+r.missed+" targeted entries you don't have"):'')+'. Open that category to see it; clear anytime.')
        : ('Saved for '+r.cid+', '+(r.missed?'but it targets entries not in your data':'open that category to see it')+'.'); };
    rd.readAsText(f); e.target.value=''; };
  return c;
}
function renderContribute(arg){
  const v=document.getElementById('view-contribute');
  let pkind='',ptext='';
  if(arg&&arg.indexOf('want/')===0){const t=decodeURIComponent(arg.slice(5));pkind='Request a category';ptext=`I'd like to see ${t} in the commons. Useful sources or example options: `;}
  else if(arg&&arg.indexOf('problem/')===0){const t=decodeURIComponent(arg.slice(8));pkind='Correct a sourced claim';ptext=`I want to dispute or correct a rating for ${t}. Source URL and as-of date: `;}
  const opts=CONTRIB_KINDS.map(k=>`<option${k===pkind?' selected':''}>${k}</option>`).join('');
  const hint=CONTRIB_HINTS[pkind||CONTRIB_KINDS[0]]||CONTRIB_HINTS['Correct a sourced claim'];
  let html=`<h2 class="sectionh">Help improve the commons</h2>
    <p class="sectionsub">Save a correction, request, or idea on <b>this device</b>. Nothing is sent automatically. Export the file when you are ready to share it.</p>
    <figure class="imgslot art" data-slot="5" aria-hidden="true"><svg viewBox="0 0 540 150" width="420" height="117" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <g style="stroke:var(--hint)"><circle cx="120" cy="96" r="12"/><circle cx="270" cy="60" r="12"/><circle cx="420" cy="96" r="12"/><path d="M140 88c26-16 62-24 104-24M296 62c42 4 78 14 104 26"/></g>
      <g style="stroke:var(--accent)"><rect x="186" y="44" width="26" height="20" rx="4"/><rect x="330" y="66" width="26" height="20" rx="4"/><path d="M199 54h0M343 76h0" stroke-width="4"/></g>
    </svg></figure>
    <div class="card">
      <div class="rx" style="margin-bottom:.6rem"><select id="ckind" class="ckind">${opts}</select></div>
      <p id="chint" class="youmuted small" style="margin:.2rem 0 .65rem">${esc(hint)}</p>
      <textarea id="ctext" rows="4" placeholder="Include the category or item, what should change, source URL, as-of date, and why it matters.">${esc(ptext)}</textarea>
      <div style="margin-top:.6rem"><button class="catbtn" id="csave">Save suggestion</button></div>
    </div>
    <details class="explain" style="margin-top:1rem"><summary>How do I correct a fact?</summary><p>Food and beauty facts come from <a href="https://world.openfoodfacts.org/" target="_blank" rel="noopener">Open Food Facts</a>. Correct the product there, and the fix can flow back here. For researched categories, save a sourced correction above.</p></details>`;
  if(contribList.length) html+=`<div style="display:flex;justify-content:space-between;align-items:center;margin:1.75rem 0 .6rem"><span class="alts-h" style="margin:0">${contribList.length} suggestion${contribList.length>1?'s':''} · on this device</span><button class="savetag" id="cexport">export</button></div><div id="clist"></div>`;
  html+=`<div class="card support">
      <div class="alts-h" style="margin:0 0 .4rem">Support this commons</div>
      <p class="youmuted">One person maintains this project. No brand sponsors it, and nobody's browsing is sold. If it helped, use it, share it, or tell me what needs fixing.</p>
      <div class="yourow">
        ${SUPPORT_MAKER_URL?`<a class="catbtn" href="${esc(SUPPORT_MAKER_URL)}" target="_blank" rel="noopener">${CC.icon('heart',{cls:'is-filled'})} Support the upkeep</a>`:`<span class="youmuted small">Direct support is not open yet. For now, use the project, share it, or send a concrete correction.</span>`}
        <a class="savetag" href="#explore/causes-to-support">Or fund a cause this data covers →</a>
      </div>
    </div>`;
  v.innerHTML=html;
  const sel=document.getElementById('ckind');
  const h=document.getElementById('chint');
  if(sel)sel.onchange=()=>{if(h)h.textContent=CONTRIB_HINTS[sel.value]||CONTRIB_HINTS['Correct a sourced claim'];};
  document.getElementById('csave').onclick=()=>{const t=document.getElementById('ctext').value.trim();if(!t)return;addContrib(sel.value,t);renderContribute('');};
  const ce=document.getElementById('cexport'); if(ce)ce.onclick=exportContrib;
  const _sup=v.querySelector('.support'), _rc=applyReceivedEl(); if(_sup)v.insertBefore(_rc,_sup); else v.appendChild(_rc);
  const cl=document.getElementById('clist');
  if(cl)for(const c of contribList){
    const card=el('div',{class:'card'});
    card.innerHTML=`<div class="why"><b>${esc(c.kind)}</b></div><div>${esc(c.text)}</div>`;
    const del=el('button',{class:'savebtn',style:'margin-top:.6rem'},'delete');
    del.onclick=()=>{contribList=contribList.filter(x=>x!==c);persistContrib();renderContribute('');};
    card.appendChild(del);cl.appendChild(card);
  }
}

// --- Stage-0: Explore as a MAP — wander the whole commons; your value-themes light up the territory ---
function catCriteria(cid){const c=(CATALOG||[]).find(x=>x.id===cid);if(c&&c.criteria)return c.criteria;const ds=window.CC_BUNDLE&&window.CC_BUNDLE.data[cid];return (ds&&ds.criteria)||[];} // from the lightweight index (no products needed)
function catThemes(cid){const s=new Set();for(const c of catCriteria(cid)){const t=KEY2THEME[c.key];if(t)s.add(t);}return s;}
function priorityThemeIds(){return THEMES.filter(t=>(themeWeights[t.id]||3)>=4).map(t=>t.id);}
function catRelevance(cid){const crit=catCriteria(cid);if(!crit.length)return 0;const pr=new Set(priorityThemeIds());if(!pr.size)return 0;let m=0;for(const c of crit){const t=KEY2THEME[c.key];if(t&&pr.has(t))m++;}return m/crit.length;}
function catIsHot(cid){return catRelevance(cid)>=0.4;}
function mapToggle(active){
  const catHref='#explore'+(DATA?('/'+DATA.meta.id):'');
  return `<div class="modetoggle" role="tablist" aria-label="Explore mode"><a href="#map" class="mt${active==='map'?' on':''}" role="tab" aria-selected="${active==='map'?'true':'false'}">${CC.icon('map')} Map</a><a href="${catHref}" class="mt${active==='cat'?' on':''}" role="tab" aria-selected="${active==='cat'?'true':'false'}">${CC.icon('grid')} Category view</a></div>`;
}
function setExpToggle(){const e=document.getElementById('exptoggle');if(e)e.innerHTML=mapToggle('cat');}
// T3 — the unified Explore: Map, Browse and Discover are ONE destination ("Explore the commons") seen three
// ways. This one switcher rides the top of all three; the old #map/#browse/#discover routes still work as
// deep-links into each lens, so nothing breaks and crumbs/cards/the values-lighting stay valid.
function exploreLens(active){
  const L=[['map','#map',CC.icon('map'),'Explore'],['garden','#garden',CC.icon('sprout'),'Garden']];
  return `<div class="modetoggle" role="tablist" aria-label="Explore the commons, three ways to look">`+
    L.map(function(x){return `<a href="${x[1]}" class="mt${active===x[0]?' on':''}" role="tab" aria-selected="${active===x[0]?'true':'false'}">${x[2]} ${x[3]}</a>`;}).join('')+`</div>`;
}
// A place to choose by area of life — icon + a plain teaser, so a domain card leads with meaning, not a count.
const DOMAIN_FACE={
  'Food & drink':{i:CC.icon('apple'),t:'cheese, coffee, chocolate, milk…'},
  'Money':{i:CC.icon('bank'),t:'banks, payments, pensions'},
  'Tech & digital':{i:CC.icon('monitor'),t:'browsers, AI, VPNs, password managers'},
  'Personal care':{i:CC.icon('droplet'),t:'toothpaste, soap, shampoo, sunscreen'},
  'Learning & media':{i:CC.icon('guides'),t:'learning, news, music, books'},
  'Home':{i:CC.icon('home'),t:'cleaning, laundry, paper goods'},
  'Clothing':{i:CC.icon('shirt'),t:'everyday clothing, shoes'},
  'Giving & causes':{i:CC.icon('heart',{cls:'is-filled'}),t:'causes worth backing'},
  'Companies & makers':{i:CC.icon('leaf'),t:'mission-driven businesses'}
};
let mapLens='all'; // kept for back-compat; the canonical Explore page is now the three-door journey
const EXPLORE_DECISION_DOORS=[
  {label:'Buying groceries',kind:'errand',id:'weekly-groceries',fallback:'Build a useful weekly basket without turning every staple into a research project.'},
  {label:'Switching banks',kind:'errand',id:'pick-a-bank',fallback:'Put fees, access, fossil exposure, and transparency in the same decision.'},
  {label:'Setting up a kitchen',kind:'need',id:'keep-a-home',fallback:'Start with the few things a working kitchen and home actually need.'},
  {label:'Learning something',kind:'need',id:'learn',fallback:'Find resources and tools for understanding, making, and staying informed.'},
  {label:'Want to help',kind:'need',id:'give-and-act',fallback:'Turn money, time, or voice toward a cause or organization.'}
];
function exploreErrandNode(id){return NODES&&NODES.byId&&NODES.byId['ovs:errand/'+id];}
function exploreDecisionDoorHTML(item){
  const node=item.kind==='errand'?exploreErrandNode(item.id):null;
  const href=item.kind==='errand'?('#n/errand/'+encodeURIComponent(item.id)):('#need/'+encodeURIComponent(item.id));
  const kind=item.kind==='errand'?'Task':'Need';
  return `<a class="decision-door" href="${href}"><span class="decision-door-kind">${kind}</span><span class="decision-door-name">${esc(item.label)}</span><span class="decision-door-read">${esc((node&&node.reads)||item.fallback)}</span><span class="decision-door-go">Start here &rarr;</span></a>`;
}
function exploreAllErrandsHTML(){
  const errands=NODES&&NODES.nodes?NODES.nodes.filter(n=>n.type==='errand').slice().sort((a,b)=>a.label.localeCompare(b.label)):[];
  if(!errands.length)return `<p class="door-loading">Loading the tasks&hellip;</p>`;
  return `<div class="errand-links">${errands.map(n=>`<a href="#n/errand/${encodeURIComponent(n.id.replace(/^ovs:errand\//,''))}"><b>${esc(n.label)}</b><span>${esc(n.reads)}</span></a>`).join('')}</div>`;
}
function hydrateExploreErrands(){
  if(currentRouteView()!=='map')return;
  const featured=document.getElementById('explore-decisions'), all=document.getElementById('explore-errands');
  if(featured)featured.innerHTML=EXPLORE_DECISION_DOORS.map(exploreDecisionDoorHTML).join('');
  if(all)all.innerHTML=exploreAllErrandsHTML();
}
/* VALUE PAGES — the first non-category object to become a page. #value/<key> renders a value from
   the standard's own claims: where it is measured, how the standard reads it, and — the ontological
   distinction — whether it PARTITIONS entries (a certification some entries carry, so the link lands
   on a decision scoped to them) or MEASURES whole categories (an assessed criterion of everything
   there, so the link lands on the full decision). Computed live from the index; the page says so,
   and says plainly that editorial does not exist yet rather than faking any. */
const VALUE_PAGES={
  organic:{label:'Organic',kind:'certified',facet:'Organic'},
  fair_trade:{label:'Fair trade',kind:'certified',facet:'Fair Trade'},
  rainforest_alliance:{label:'Rainforest Alliance',kind:'certified',facet:'Rainforest Alliance'},
  vegan:{label:'Vegan',kind:'certified',facet:'Vegan'},
  palm_oil:{label:'Palm-oil-free',kind:'certified',facet:'Palm-oil-free'},
  cruelty_free:{label:'Cruelty-free',kind:'certified'},
  privacy:{label:'Privacy',kind:'assessed'},
  openness:{label:'Openness',kind:'assessed'},
  transparency:{label:'Transparency',kind:'assessed'},
  repairability:{label:'Repairability',kind:'assessed'},
  longevity:{label:'Longevity',kind:'assessed'},
  durability:{label:'Durability',kind:'assessed'},
  packaging:{label:'Packaging',kind:'assessed'},
  environment:{label:'Environment',kind:'assessed'},
  accessibility:{label:'Accessibility',kind:'assessed'}
};
function valueHref(key){return '#value/'+encodeURIComponent(key);}
function valueEditorialHTML(key){
  const valueEditorial=window.CC_BUNDLE&&window.CC_BUNDLE.index&&window.CC_BUNDLE.index.valueEditorial;
  const contract=valueEditorial&&valueEditorial.renderContract, entry=valueEditorial&&valueEditorial.entries&&valueEditorial.entries[key];
  if(!contract||!entry||entry.status!==contract.eligibleStatus)return '';
  const context=contract.classificationCopy&&contract.classificationCopy[entry.classification];
  if(!context||!Array.isArray(entry.sections)||!entry.sections.length)return '';
  const sections=entry.sections.map(section=>{
    const claims=(section.claims||[]).map(claim=>`<li class="value-claim"><p>${esc(claim.text)}</p><a class="value-source" href="${esc(claim.source)}" target="_blank" rel="noopener"><span>${esc(claim.sourceLabel)}</span><time datetime="${esc(claim.asOf)}">Checked ${esc(claim.asOf)}</time><span aria-hidden="true">&nearr;</span></a></li>`).join('');
    return `<section class="value-editorial-section" aria-labelledby="value-${esc(key)}-${esc(section.id)}"><h3 id="value-${esc(key)}-${esc(section.id)}">${esc(section.heading)}</h3><ul class="value-claims">${claims}</ul></section>`;
  }).join('');
  return `<section class="value-editorial" aria-labelledby="value-editorial-${esc(key)}"><div class="value-evidence"><span class="value-evidence-label">${esc(context.label)}</span><p>${esc(context.description)}</p></div><h2 class="sectionh2" id="value-editorial-${esc(key)}">What the evidence says</h2><p class="value-summary">${esc(entry.summary)}</p><div class="value-editorial-grid">${sections}</div></section>`;
}
function renderValue(key){
  const v=document.getElementById('view-value'); if(!v)return;
  const spec=VALUE_PAGES[String(key||'').toLowerCase()];
  if(!spec){v.innerHTML=`<a class="back" href="#map">&larr; Explore</a><h2 class="sectionh">Not a value the standard measures</h2><p class="sectionsub">Nothing is filed under that name. The lattice on <a href="#map">Explore</a> lists every value with live counts.</p>`;return;}
  const cats=(CATALOG||[]).filter(c=>latticeCriteriaKeys(c).includes(key)).sort((a,b)=>a.label.localeCompare(b.label));
  const labelsUsed=[...new Set(cats.flatMap(c=>(c.criteria||[]).filter(x=>x&&x.key===key).map(x=>x.label)).filter(Boolean))];
  const reads=spec.kind==='certified'
    ? 'A label or ingredient value. An entry carries it when its packaging, listing, or ingredient evidence supports the claim; the standard records that evidence, never virtue itself, and an entry without it is unknown or unlabelled, not condemned.'
    : 'An assessed value. Where a category measures it, every entry there is scored on it from sourced facts, and every claim keeps its receipt.';
  const rows=cats.map(c=>{
    const go=spec.facet
      ? `<a class="value-go" href="${esc(decideHref(c.id,spec.facet))}">Decide within ${esc(spec.label)} &rarr;</a>`
      : `<a class="value-go" href="#explore/${encodeURIComponent(c.id)}">Open the decision &rarr;</a>`;
    return `<div class="value-row"><a class="value-cat" href="#explore/${encodeURIComponent(c.id)}">${esc(c.label)}</a>${go}</div>`;
  }).join('');
  const editorial=valueEditorialHTML(key);
  v.innerHTML=`<a class="back" href="#map">&larr; Explore</a>
    <header class="value-head"><div class="decision-kicker">A value in the commons</div><h1>${esc(spec.label)}</h1><p class="value-reads">${esc(reads)}</p>${labelsUsed.length?`<p class="value-aka">Appears in the standard as: ${labelsUsed.map(esc).join(' · ')}.</p>`:''}</header>
    ${editorial}
    <section class="value-where"><h2 class="sectionh2">Where it lives</h2><p class="value-tally">${cats.length===1?'Measured in 1 of 88 decisions.':`Measured in ${cats.length} of 88 decisions.`}</p><div class="value-grid">${rows||'<p class="need-edge">No live decision measures this yet.</p>'}</div></section>
    ${editorial?'':`<section class="value-honesty"><b>What this page is.</b> Computed live from the standard&rsquo;s claims. Sourced editorial is not available for this value yet. <a href="#contribute">Suggest a sourced correction &rarr;</a></section>`}`;
}

/* THE LATTICE — the ontological browse. A tree files each category in one place; the lattice
   classifies by the claims themselves: what a category is FOR (need), what it IS (kind), what is
   MEASURED there (the standard's criteria), whether price and multi-source evidence exist. Facets
   are orthogonal (Hearst); within a facet chips OR, across facets they AND; a chip always shows
   the result count it would produce, and zero-count chips hide rather than dead-end. Session-only
   state, no storage key. */
const LATTICE_MEASURES=[
  ['organic','Organic'],['fair_trade','Fair trade'],['rainforest_alliance','Rainforest Alliance'],
  ['vegan','Vegan'],['palm_oil','Palm-oil-free'],['cruelty_free','Cruelty-free'],
  ['privacy','Privacy'],['openness','Openness'],['transparency','Transparency'],
  ['repairability','Repairability'],['longevity','Longevity'],['durability','Durability'],
  ['packaging','Packaging'],['environment','Environment'],['accessibility','Accessibility']
];
function latticeCriteriaKeys(c){return (c.criteria||[]).map(x=>typeof x==='string'?x:(x&&x.key)).filter(Boolean);}
/* THE INDEX — one tree, many lights. The commons renders as a single recursive outline: needs
   unfold to decisions, a decision unfolds to its actions, its guide, and the values measured
   there — and each value links onward to its own page and its scoped decisions, so the tree
   unfolds into the cross-cutting web rather than a dead end. Values are LIGHTS, not filters:
   lighting one dims what it doesn't touch and re-counts every branch, but hides nothing —
   the whole stays visible while the match glows. Same grammar at every level; native
   details/summary keeps all of it keyboard-first. */
let indexLights={measure:new Set(),price:false};
function indexLit(c){
  if(indexLights.measure.size){const keys=new Set(latticeCriteriaKeys(c));for(const m of indexLights.measure)if(!keys.has(m))return false;}
  if(indexLights.price&&!(((c.decision||{}).budget||{}).available))return false;
  return true;
}
function indexLightWould(cats,group,value){
  const st={measure:new Set(indexLights.measure),price:indexLights.price};
  if(group==='price')st.price=!st.price;else st.measure.has(value)?st.measure.delete(value):st.measure.add(value);
  let n=0;for(const c of cats){let ok=true;
    if(st.measure.size){const keys=new Set(latticeCriteriaKeys(c));for(const m of st.measure)if(!keys.has(m)){ok=false;break;}}
    if(ok&&st.price&&!(((c.decision||{}).budget||{}).available))ok=false;
    if(ok)n++;}
  return n;
}
function indexLightChip(cats,group,value,label){
  const on=group==='price'?indexLights.price:indexLights.measure.has(value);
  const would=indexLightWould(cats,group,value);
  if(!on&&would===0)return '';
  return `<button type="button" class="light-chip" data-light-group="${esc(group)}" data-light-value="${esc(value)}" aria-pressed="${on}">${esc(label)}<span class="light-n">${would}</span></button>`;
}
function indexTreeHTML(){
  const B=window.CC_BUNDLE, needs=(B&&B.ontology&&B.ontology.needs)||[];
  const cats=(CATALOG||[]);
  const anyLight=indexLights.measure.size||indexLights.price;
  const kindsOf={};for(const dom of ((B&&B.ontology&&B.ontology.domains)||[]))for(const k of (dom.categories||[]))if(k.cid&&k.facet)(kindsOf[k.cid]=kindsOf[k.cid]||[]).push(k);
  const byNeed={};for(const c of cats)(byNeed[c.need||'other']=byNeed[c.need||'other']||[]).push(c);
  const lightRail=(()=>{
    const chips=LATTICE_MEASURES.filter(([k])=>cats.some(c=>latticeCriteriaKeys(c).includes(k)))
      .map(([k,l])=>indexLightChip(cats,'measure',k,l)).join('')+indexLightChip(cats,'price','price','Has price data');
    const clear=anyLight?`<button type="button" class="light-clear" id="index-lights-clear">Unlight all</button>`:'';
    const hint=indexLights.measure.size
      ? `<span class="light-about">About: ${[...indexLights.measure].filter(k=>VALUE_PAGES[k]).map(k=>`<a href="${valueHref(k)}">${esc(VALUE_PAGES[k].label)}</a>`).join(' · ')}</span>`
      : `<span class="light-about">Light a value and the index shows where it is measured. Nothing hides; the rest just dims.</span>`;
    return `<div class="value-lights" role="group" aria-label="Light the index by value"><div class="light-rail">${chips}${clear}</div>${hint}</div>`;
  })();
  const catBranch=c=>{
    const lit=!anyLight||indexLit(c);
    // CAT_GUIDE covers all 88; CC_GUIDES loads async so gating on it made guide links flicker
    // out of the first paint. The guide route handles any slug gracefully, so trust the map.
    const guide=CAT_GUIDE[c.id], hasGuide=!!guide;
    const measures=latticeCriteriaKeys(c).filter(k=>VALUE_PAGES[k]);
    const kinds=(kindsOf[c.id]||[]).slice(0,6);
    return `<details class="cat-branch${lit?'':' dim'}"><summary><span class="cat-name">${esc(c.label)}</span><span class="cat-arrow" aria-hidden="true">&rsaquo;</span></summary>
      <div class="cat-unfold">
        <div class="cat-acts"><a class="cat-decide" href="#explore/${encodeURIComponent(c.id)}">Decide &rarr;</a>${hasGuide?`<a class="cat-guide" href="#guide/${encodeURIComponent(guide)}">The guide</a>`:''}</div>
        ${measures.length?`<div class="cat-measures"><span>Measured for</span>${measures.map(k=>`<a href="${valueHref(k)}">${esc(VALUE_PAGES[k].label)}</a>`).join('')}</div>`:''}
        ${kinds.length?`<div class="cat-kinds"><span>Within it</span>${kinds.map(k=>`<a href="#explore/${encodeURIComponent(c.id)}/${encodeURIComponent(k.facet)}">${esc(k.label||k.facet)}</a>`).join('')}</div>`:''}
      </div></details>`;
  };
  const needBranch=(n,i)=>{
    const list=(byNeed[n.id]||[]).slice().sort((a,b)=>a.label.localeCompare(b.label));
    const lit=anyLight?list.filter(indexLit).length:list.length;
    const tally=anyLight?`${lit} of ${list.length} lit`:(list.length===1?'1 decision':list.length+' decisions');
    const edge=list.length<=2?`<p class="need-edge">The growing edge is real: this need holds ${list.length===1?'one decision':'two decisions'} so far.</p>`:'';
    return `<details class="need-branch${anyLight&&!lit?' dim':''}" data-need="${esc(n.id)}">
      <summary><span class="need-ix" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="need-id"><span class="need-name">${esc(n.label)}</span><span class="need-card-read">${esc(n.reads)}</span></span><span class="need-tally">${tally}</span></summary>
      <div class="need-cats">${list.map(catBranch).join('')}${edge}<a class="need-open" href="#need/${encodeURIComponent(n.id)}">Open this need as its own page &rarr;</a></div>
    </details>`;
  };
  return `${lightRail}<div class="needs-map index-tree">${needs.map(needBranch).join('')}</div>`;
}
function mountNeedsRose(){
  const B=window.CC_BUNDLE, needs=(B&&B.ontology&&B.ontology.needs)||[];
  if(!needs.length||!CC.needsRose)return;
  const byNeed={};for(const c of (CATALOG||[]))byNeed[c.need||'other']=(byNeed[c.need||'other']||0)+1;
  CC.needsRose.mount('needsrose',
    needs.map(n=>({id:n.id,label:n.label,count:byNeed[n.id]||0})),
    function(n){
      // open the chosen need in the chart below, and let the rest dim: the page's own rule
      document.querySelectorAll('#index-tree-box .need-branch').forEach(d=>{
        const mine=d.dataset.need===n.id;
        d.open=mine;d.classList.toggle('rose-dim',!mine);
      });
      // No scroll: the chosen branch sits directly under the rose, and scrolling slid the dial
      // beneath the fixed header, where its centre could no longer be tapped to bring things back.
      announce(String(n.label||n.id)+' open below.');
    },
    function(){
      document.querySelectorAll('#index-tree-box .need-branch').forEach(d=>{d.classList.remove('rose-dim');});
      announce('Every need shown again.');
    });
}
function renderIndexTree(){
  const box=document.getElementById('index-tree-box');if(!box)return;
  const openNeeds=new Set([...box.querySelectorAll('.need-branch[open]')].map(d=>d.dataset.need));
  const openCats=new Set([...box.querySelectorAll('.cat-branch[open] .cat-name')].map(e=>e.textContent));
  box.innerHTML=indexTreeHTML();
  box.querySelectorAll('.need-branch').forEach(d=>{if(openNeeds.has(d.dataset.need))d.open=true;});
  box.querySelectorAll('.cat-branch').forEach(d=>{const nm=d.querySelector('.cat-name');if(nm&&openCats.has(nm.textContent))d.open=true;});
  wireIndexLights();
}
function wireIndexLights(){
  document.querySelectorAll('#index-tree-box .light-chip').forEach(b=>b.onclick=()=>{
    const g=b.dataset.lightGroup,v=b.dataset.lightValue;
    if(g==='price')indexLights.price=!indexLights.price;
    else indexLights.measure.has(v)?indexLights.measure.delete(v):indexLights.measure.add(v);
    renderIndexTree();announce('The index re-lit.');
  });
  const c=document.getElementById('index-lights-clear');if(c)c.onclick=()=>{indexLights={measure:new Set(),price:false};renderIndexTree();announce('All lights off; the whole index is bright.');};
}
// THE PORTALS (the browse door, second-pass explore design in docs/design/EXPLORE-PLATE.md).
// One large hexagon per need, in the need's own hue, standing on an unsurveyed grid. The face
// carries the mini-honeycomb: every decision of that need from the whole map, lit if answered,
// tinted if named and open. Counts come from app/data/map.json, fetched only when Explore opens,
// never at boot. Doors are editorial picks recorded here so the choice is versioned; labels
// resolve from the catalogue at render time so they can never go stale.
const PORTAL_HUES={nourish:'#6b8f3d',move:'#2f9e83',connect:'#2f7fa6',protect:'#5560b0',
  learn:'#8455a8',care:'#b05c72','give-and-act':'#c06544','keep-a-home':'#a87a2f'};
const PORTAL_DOORS={
  nourish:['coffee','eggs','plant-based-milk'],
  care:['toothpaste','shampoo','period-products'],
  'keep-a-home':['cleaning-products','washing-machines','direct-drive-solar'],
  connect:['phones','broadband-internet','self-hosting-platforms'],
  move:['bicycles','used-cars','airlines'],
  learn:['books','news-sources','ai-assistants'],
  'give-and-act':['causes-to-support','volunteering','mission-businesses'],
  protect:['banking','password-managers','vpn']
};
let WHOLE_MAP=null,WHOLE_MAP_P=null;
function wholeMap(){
  if(WHOLE_MAP)return Promise.resolve(WHOLE_MAP);
  if(WHOLE_MAP_P)return WHOLE_MAP_P;
  WHOLE_MAP_P=fetch('./data/map.json').then(r=>r.ok?r.json():null).then(j=>{WHOLE_MAP=j;return j;}).catch(()=>null);
  return WHOLE_MAP_P;
}
function portalTitle(id,label){
  // The ontology labels shout in capitals for the rose; a portal title reads in serif case.
  const words=String(label||id).toLowerCase().replace(/&/g,'and');
  return words.replace(/^./,ch=>ch.toUpperCase());
}
// The mini-honeycomb: the need's whole ground drawn small, domains in authored order so they
// read as districts. Below six-pixel cells the hatch reduces to a tint, per the reduction rule
// in the design document; the full four marks belong to the fisheye's deeper rungs.
function portalHoneycombSVG(needId,mapDoc){
  if(!mapDoc)return '';
  const rows=[];
  for(const realm of mapDoc.realms||[]){
    for(const field of realm.fields||[])for(const fam of field.families||[])for(const dec of fam.decisions||[]){
      if(dec.need===needId)rows.push(dec.state);
    }
  }
  if(!rows.length)return '';
  const R=4,SQ3=Math.sqrt(3),cols=Math.max(8,Math.ceil(Math.sqrt(rows.length*1.9)));
  const w=Math.ceil(cols*R*SQ3+R*2),h=Math.ceil(Math.ceil(rows.length/cols)*R*1.5+R*2);
  let cells='';
  rows.forEach((state,i)=>{
    const row=Math.floor(i/cols),col=i%cols;
    const cx=R+col*R*SQ3+(row%2)*R*SQ3/2,cy=R+row*R*1.5;
    let pts='';
    for(let k=0;k<6;k++){const a=(60*k-30)*Math.PI/180;pts+=(cx+(R-0.6)*Math.cos(a)).toFixed(1)+','+(cy+(R-0.6)*Math.sin(a)).toFixed(1)+' ';}
    cells+=state==='built'
      ?`<polygon points="${pts}" fill="#fff" fill-opacity="0.92"/>`
      :`<polygon points="${pts}" fill="#fff" fill-opacity="0.14" stroke="#fff" stroke-opacity="0.28" stroke-width="0.6"/>`;
  });
  return `<svg class="portal-ground" viewBox="0 0 ${w} ${h}" role="img" aria-label="Every decision under this need: bright cells have a sourced answer, faint cells are named and open">${cells}</svg>`;
}
function portalReceipt(needId,mapDoc){
  if(!mapDoc)return '';
  let named=0,answered=0;
  for(const realm of mapDoc.realms||[])for(const field of realm.fields||[])for(const fam of field.families||[])for(const dec of fam.decisions||[]){
    if(dec.need!==needId)continue;named+=1;if(dec.state==='built')answered+=1;
  }
  return `${named} decisions · ${answered} answered`;
}
function portalsHTML(needs){
  const live={};(CATALOG||[]).forEach(cat=>{live[cat.id]=cat;});
  return needs.map(n=>{
    const doors=(PORTAL_DOORS[n.id]||[]).map(cid=>live[cid]).filter(Boolean)
      .map(cat=>`<li><a href="#explore/${encodeURIComponent(cat.id)}">${esc(cat.label)}</a></li>`).join('');
    return `<li class="portal need-${esc(n.id)}" style="--portal:${PORTAL_HUES[n.id]||'#666'}">
      <a class="portal-face" href="#need/${encodeURIComponent(n.id)}">
        <span class="portal-band"><b>${esc(portalTitle(n.id,n.label))}</b>
        <small class="portal-receipt" data-portal-receipt="${esc(n.id)}"></small></span>
        <span class="portal-map" data-portal-map="${esc(n.id)}" aria-hidden="true"></span>
      </a>
      <ul class="portal-doors">${doors}</ul>
    </li>`;
  }).join('');
}
function firePortals(){
  wholeMap().then(mapDoc=>{
    if(!mapDoc)return;
    document.querySelectorAll('[data-portal-map]').forEach(box=>{box.innerHTML=portalHoneycombSVG(box.dataset.portalMap,mapDoc);});
    document.querySelectorAll('[data-portal-receipt]').forEach(el=>{el.textContent=portalReceipt(el.dataset.portalReceipt,mapDoc);});
  });
  // Stellar parallax: the portals are the near layer and shift a few pixels against the grid
  // behind them, which is how nearby stars actually move against far ones. Pointer-driven with
  // no animation loop, so nothing moves unless the reader does; coarse pointers and
  // reduced-motion are switched off in the stylesheet, not here.
  const field=document.querySelector('.map-door');
  if(field&&!field.dataset.plx){
    field.dataset.plx='1';
    field.addEventListener('pointermove',e=>{
      const r=field.getBoundingClientRect();
      field.style.setProperty('--plx',((e.clientX-r.left)/r.width-0.5).toFixed(3));
      field.style.setProperty('--ply',((e.clientY-r.top)/r.height-0.5).toFixed(3));
    });
    field.addEventListener('pointerleave',()=>{field.style.setProperty('--plx','0');field.style.setProperty('--ply','0');});
  }
}
function renderMap(){
  const v=document.getElementById('view-map');if(!v)return;
  const B=window.CC_BUNDLE;if(!B){v.innerHTML='<p class="sectionsub">Loading&hellip;</p>';return;}
  const needs=(B.ontology&&B.ontology.needs)||[];
  let html=`<header class="explore-head"><h2 class="sectionh">Explore</h2><p class="sectionsub">Search by name, browse eight everyday needs, or start with a task. The baseline and any rules you set apply inside each comparison.</p></header>`;
  html+=`<section class="explore-door ask-door" data-door="ask" aria-labelledby="door-ask"><h3 id="door-ask" class="ask-title">Know what you&rsquo;re after?</h3><form class="askbig" id="mapask"><span class="askbig-i" aria-hidden="true">?</span><input type="search" id="maskq" placeholder="Try &ldquo;switch banks&rdquo; or &ldquo;coffee&rdquo;" autocomplete="off" aria-label="Ask about a product, brand, category, or decision"><button type="submit">Ask</button></form><div class="ask-examples" aria-label="Example questions"><span>Try</span><a href="#search/coffee">coffee</a><a href="#search/switch%20banks">switch banks</a><a href="#search/repairable%20phone">repairable phone</a></div></section>`;
  html+=`<section class="explore-door map-door" data-door="map" aria-labelledby="door-map"><div class="door-kicker">Browse</div><h3 id="door-map">Eight everyday needs</h3><p class="atlas-sub">Each portal is one need. Bright cells on its face are decisions with a sourced answer; faint cells are named on the map and open for work. Open a portal for the whole need, or step through a door.</p><ul class="needs-map portals">${portalsHTML(needs)}</ul><p class="portal-key">Lit, answered. Faint, named and waiting. The grid behind is the ground the map has not named yet.</p></section>`;
  html+=`<section class="explore-door decide-door" data-door="decide" aria-labelledby="door-decide"><div class="door-kicker">Start from a task</div><h3 id="door-decide">Tasks</h3><p>A task joins related decisions and produces a list you can save.</p><div class="decision-doors" id="explore-decisions">${EXPLORE_DECISION_DOORS.map(exploreDecisionDoorHTML).join('')}</div><details class="allcats errand-more"><summary>See every task</summary><div id="explore-errands">${exploreAllErrandsHTML()}</div></details></section>`;
  html+=`<p class="explore-quietlinks">More views: <a href="#indexes">your saved indexes</a></p>`;
  v.innerHTML=html;
  const f=document.getElementById('mapask');if(f)f.onsubmit=e=>{e.preventDefault();goSearch((document.getElementById('maskq').value||'').trim());};
  wireSuggest(document.getElementById('maskq'));
  firePortals();
}
// THE GARDEN (a 4th Explore lens) — the commons as a living thing: what's built has GROWN (ranked by your
// values); the honest frontier is SEEDLINGS, waiting to be planted. The biophilic face of "it grows at its
// edges, tended by people, never by advertisers." Same data as the map; a different way of seeing.
function domHue(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return 70+(h%90);} // a natural yellow-green per bed
function plantSVG(grown,hue){
  const stem='hsl('+hue+',40%,38%)', leaf='hsl('+hue+',42%,50%)', bloom='hsl(12,55%,57%)';
  const lf=(cx,cy,rot,op)=>'<ellipse cx="'+cx+'" cy="'+cy+'" rx="6.2" ry="3.1" fill="'+leaf+'" opacity="'+op+'" transform="rotate('+rot+' '+cx+' '+cy+')"/>';
  if(!grown) return '<svg class="psvg" viewBox="0 0 32 40" width="28" height="34" aria-hidden="true"><path d="M16 38 V23" stroke="'+stem+'" stroke-width="2" fill="none" stroke-linecap="round"/>'+lf(10.5,23,-38,0.92)+lf(21.5,21,38,0.82)+'</svg>';
  const pairs=2; let leaves='',top=26;
  for(let i=0;i<pairs;i++){const y=26-i*6;top=y;leaves+=lf(10,y,-38,0.92)+lf(22,y-2,38,0.82);}
  return '<svg class="psvg" viewBox="0 0 32 40" width="28" height="34" aria-hidden="true"><path d="M16 38 V'+(top-8)+'" stroke="'+stem+'" stroke-width="2" fill="none" stroke-linecap="round"/>'+leaves+'<circle cx="16" cy="'+(top-9)+'" r="3.3" fill="'+bloom+'"/></svg>';
}
function renderGarden(){
  const v=document.getElementById('view-garden');if(!v)return;
  const ont=window.CC_BUNDLE&&CC_BUNDLE.ontology;
  if(!ont||!ont.domains){v.innerHTML='<p class="sectionsub">Loading…</p>';return;}
  const live={};(CATALOG||[]).forEach(c=>live[c.id]=c);
  let beds='';
  for(const d of ont.domains){
    const plants=(d.categories||[]).map(c=>{const lc=c.cid&&live[c.cid];return {label:c.label,grown:!!lc,href:lc?('#explore/'+c.cid+(c.facet?'/'+encodeURIComponent(c.facet):'')):('#contribute/want/'+encodeURIComponent(c.label))};});
    plants.sort((a,b)=>(b.grown-a.grown)||a.label.localeCompare(b.label));
    const hue=domHue(d.label); let cells='';
    for(const p of plants){
      cells+=`<a class="plant${p.grown?' grown':' seed'}" href="${p.href}" title="${p.grown?'ready to compare':'a seedling, tap to plant it (request)'}">${plantSVG(p.grown,hue)}<span class="plant-l">${esc(p.label)}</span><span class="plant-s">${p.grown?'ready to compare':'seedling'}</span></a>`;
    }
    beds+=`<section class="gbed"><div class="gbed-h"><a href="#domain/${encodeURIComponent(d.label)}">${esc(d.label)}</a></div><div class="gplots">${cells}</div></section>`;
  }
  v.innerHTML=`<h2 class="sectionh">Explore the commons</h2>${exploreLens('garden')}`
    +`<p class="sectionsub">The garden, the commons as a living thing. What's <b>grown</b> bears fruit you can rank by your values; <b>seedlings</b> are mapped and waiting (tap to plant one). It grows at its edges, tended by people, never by advertisers.</p>`
    +`<p class="gardlegend"><span>${CC.icon('leaf')} grown · ready to compare</span><span>${CC.icon('sprout')} seedlings · mapped and requestable</span></p>`
    +`<div class="garden">${beds}</div>`;
}
// D2 — the ambient lens: a persistent, tappable read of your active values in the chrome (the constitution: values are felt everywhere, never a buried setting).
function updateNavValues(){
  const n=document.getElementById('navvalues');if(!n)return;
  n.innerHTML='<span class="nv-lbl">Advanced</span>';
  n.setAttribute('title','Advanced: close-call priorities');
}
function primaryNavSection(name){
  const sections={home:'home',map:'explore',need:'explore',browse:'explore',discover:'explore',domain:'explore',garden:'explore',explore:'explore',rank:'explore',decide:'explore',card:'explore',node:'explore',search:'explore',guides:'guides',guide:'guides',scan:'scan',you:'you',values:'you'};
  return sections[name]||'';
}
function setNavActive(name){
  const section=primaryNavSection(name);
  document.querySelectorAll('.nav,.tabbar').forEach(root=>{
    let claimed=false;
    root.querySelectorAll('a[data-nav]').forEach(a=>{
      const on=!claimed&&a.dataset.nav===section;if(on)claimed=true;
      a.classList.toggle('active',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
  });
}
// R3 — breadcrumbs: always know where you are and the way up (Home › Money › Banking › Triodos). The orientation spine.
// spine · map a facet value (from #explore/cid/facet) to its ontology label, e.g. "browser" -> "Browsers".
function facetLabel(cid,fv){
  const ont=window.CC_BUNDLE&&window.CC_BUNDLE.ontology;
  if(ont&&ont.domains)for(const d of ont.domains)for(const c of d.categories){if(c.cid===cid&&c.facet===fv)return c.label;}
  return fv?(fv.charAt(0).toUpperCase()+fv.slice(1)):'';
}
function crumbTrail(){
  const parts=(location.hash.slice(1)||'home').split('/'), v=parts[0], here=location.hash||'#home';
  const catOf=cid=>(CATALOG||[]).find(c=>c.id===cid);
  const H={label:'Home',href:'#home'}, EX={label:'Explore',href:'#map'};
  switch(v){
    case 'home': return [];
    case 'map': return [H,{label:'Explore',href:here}];
    case 'need':{const n=needById(decodeURIComponent(parts[1]||''));return [H,EX,{label:n?n.label:'Need',href:here}];}
    case 'discover': return [H,EX,{label:'Across the commons',href:here}];
    case 'garden': return [H,EX,{label:'Garden',href:here}];
    case 'indexes': return [H,EX,{label:'Your indexes',href:here}];
    case 'domain': return [H,EX,{label:decodeURIComponent(parts[1]||'Area'),href:here}];
    case 'decide':{const c=catOf(parts[1]),n=needForCategory(c),T=[H,EX];if(n)T.push({label:n.label,href:'#need/'+encodeURIComponent(n.id)});if(c)T.push({label:c.label,href:'#explore/'+parts[1]});T.push({label:'Decide',href:here});return T;}
    case 'not-yet-covered': return [];
    case 'explore':
    case 'rank':{const c=catOf(parts[1]),n=needForCategory(c);let fv='';try{fv=parts[2]?decodeURIComponent(parts[2]):'';}catch(e){fv=parts[2]||'';}const T=[H,EX];if(n)T.push({label:n.label,href:'#need/'+encodeURIComponent(n.id)});const base=v==='rank'?rankingHref(parts[1]):('#explore/'+parts[1]);T.push({label:c?c.label:'Category',href:fv?base:here});if(fv)T.push({label:facetLabel(parts[1],fv),href:here});return T;}
    case 'item':{const cid=parts[1],c=catOf(cid),n=needForCategory(c),T=[H,EX];if(n)T.push({label:n.label,href:'#need/'+encodeURIComponent(n.id)});if(c)T.push({label:c.label,href:'#explore/'+cid});const p=DATA&&DATA.products&&DATA.products.find(x=>x.code===selected);T.push({label:p?p.name:'Entry',href:here});return T;}
    case 'card':{const cid=parts[1],c=catOf(cid),n=needForCategory(c),T=[H,EX];if(n)T.push({label:n.label,href:'#need/'+encodeURIComponent(n.id)});if(c)T.push({label:c.label,href:'#explore/'+cid});T.push({label:'Verdict card',href:here});return T;}
    case 'guides': return [H,{label:'Guides',href:here}];
    case 'guide':{const g=(window.CC_GUIDES||[]).find(x=>x.slug===parts.slice(1).join('/'));return [H,{label:'Guides',href:'#guides'},{label:g?g.title:'Guide',href:here}];}
    case 'values': return [H,{label:'Your values',href:here}];
    case 'you': return [H,{label:'You',href:here}];
    case 'contribute': return [H,{label:'Contribute',href:here}];
    case 'search': return [H,{label:'Search',href:here}];
    case 'n':{let s='';try{s=decodeURIComponent(parts.slice(2).join('/'));}catch(e){s=parts.slice(2).join('/');}return [H,EX,{label:s?s.replace(/^avoid:/,'avoid ').replace(/-/g,' '):'Node',href:here}];}
    case 'workbench': return [H,{label:'On the workbench',href:here}];
    case 'compare': return [H,{label:'Compare',href:here}];
    case 'recent': return [H,{label:'Recently viewed',href:here}];
    case 'saved': return [H,EX,{label:'Saved',href:here}];
    case 'notes': return [H,EX,{label:'Notes',href:here}];
    default: return [H];
  }
}
function renderCrumbs(){
  const box=document.getElementById('crumbs'); if(!box)return;
  if(document.querySelector('#view-decide [data-presentation-part="path"],#view-explore.leaf [data-presentation-part="path"]')){box.innerHTML='';box.hidden=true;return;}
  const trail=crumbTrail();
  if(trail.length<2){box.innerHTML='';box.hidden=true;return;}
  box.hidden=false;
  box.innerHTML=trail.map((c,i)=>i===trail.length-1?`<span class="crumb cur" aria-current="page">${esc(c.label)}</span>`:`<a class="crumb" href="${esc(c.href)}">${esc(c.label)}</a>`).join('<span class="crumb-sep" aria-hidden="true">›</span>');
}
function closeNavMenu(){const nav=document.querySelector('.nav');if(nav&&nav.classList.contains('open')){nav.classList.remove('open');const nt=document.getElementById('navtoggle');if(nt){nt.setAttribute('aria-expanded','false');nt.innerHTML='&#9776;';}}}
function showView(name){['home','guides','guide','discover','search','contribute','explore','compare','recent','map','you','card','values','need','domain','scan','decide','garden','indexes','node','workbench','value'].forEach(v=>{const e=document.getElementById('view-'+v);if(e)e.style.display=(v===name)?'':'none';});setNavActive(name==='guide'?'guides':name);updateNavValues();}

// --- in-app navigation history: a browser-grade back button + a "recently viewed" trail (device-only) ---
const navTrail=[];
function navLabel(h){
  const parts=(h||'').replace(/^#/,'').split('/'), v=parts[0]||'home';
  const dec=s=>{try{return decodeURIComponent(s||'');}catch(e){return s||'';}};
  const B=window.CC_BUNDLE;
  if(v==='item'){const ds=B&&B.data[parts[1]], p=ds&&ds.products.find(x=>x.code===dec(parts[2])); return p?p.name:'Entry';}
  if(v==='card'){const ds=B&&B.data[parts[1]], p=ds&&ds.products.find(x=>x.code===dec(parts[2])); return p?(p.name+' · verdict'):'Verdict card';}
  if(v==='explore'||v==='rank'){const ds=parts[1]&&B&&B.data[parts[1]];const base=ds?ds.meta.label:'Explore';let fv='';try{fv=parts[2]?dec(parts[2]):'';}catch(e){fv=parts[2]||'';}return fv?(base+' · '+facetLabel(parts[1],fv)):base;}
  if(v==='need'){const n=needById(dec(parts[1]));return n?n.label:'Need';}
  if(v==='guide'){const g=(window.CC_GUIDES||[]).find(x=>x.slug===dec(parts[1])); return g?g.title:'Guide';}
  if(v==='discover'&&parts[2])return 'Discover · '+dec(parts[2]);
  if(v==='search')return 'Search · '+dec(parts[1]);
  return {home:'Home',guides:'Guides',browse:'Browse',discover:'Discover',contribute:'Contribute',lab:'Lab',compare:'Compare',saved:'Saved',notes:'Notes',recent:'Recent',you:'You'}[v]||'Home';
}
function recordNav(){
  const h=location.hash||'#home'; if(h.slice(1)==='recent')return;
  const n=navTrail.length;
  if(n&&navTrail[n-1].hash===h)return;
  if(n>=2&&navTrail[n-2].hash===h){navTrail.pop();return;}
  navTrail.push({hash:h,label:navLabel(h)}); if(navTrail.length>40)navTrail.shift();
}
function goBack(){
  if((location.hash.slice(1)||'home')==='recent'){location.hash=navTrail.length?navTrail[navTrail.length-1].hash:'home';return;}
  location.hash=(navTrail.length>=2)?navTrail[navTrail.length-2].hash:'home';
}
function updateBackBtn(){const b=document.getElementById('backbtn');if(b){b.disabled=navTrail.length<2;b.setAttribute('aria-disabled',String(navTrail.length<2));}}
function announce(t){const l=document.getElementById('live');if(l)l.textContent=t;}
function focusMain(){for(const v of document.querySelectorAll('.view')){if(v.style.display!=='none'){const hd=v.querySelector('h1,h2,.sectionh');if(hd){hd.setAttribute('tabindex','-1');try{hd.focus({preventScroll:true});}catch(e){}}break;}}}
function renderRecent(){
  const v=document.getElementById('view-recent'); if(!v)return;
  const items=navTrail.slice().reverse().slice(0,30);
  let html=`<h2 class="sectionh">Recently viewed</h2><p class="sectionsub">Where you've been, like a browser history, kept only on this device.</p>`;
  html+= items.length ? `<div class="recents">`+items.map(it=>`<a class="recent" href="${esc(it.hash)}"><span class="rl">${esc(it.label)}</span><span class="rh">${esc(it.hash.replace(/^#/,''))}</span></a>`).join('')+`</div>` : `<p class="alts-sub">Nothing yet, as you explore, your trail appears here.</p>`;
  v.innerHTML=html;
}
// --- "You": a local identity & data-dignity page — the honest, no-backend answer to "accounts".
// Your values + everything you've saved live only on this device; export/import is our private "sync"
// (a file you carry, not a server you trust); erase is the right to be forgotten, instant because there's no server. ---
/* THE KEY REGISTRY. Every localStorage key this app writes, with no exceptions: "Export my data"
   promises everything this device holds and "Delete everything" promises a clean slate, and both
   walk this list — so a key written anywhere but registered here makes both of those sentences
   lies. The 2026-07-16 audit found six unregistered keys (Trust Lens, theme, force counter, errand
   state, dev channel, ceremony), which meant delete-all quietly kept data. Add the key here in the
   same commit that introduces it; checkCoreBasics pins the ones that were missed. */
const CC_KEYS=[
  THEMES_KEY,YOU_KEY,STORAGE_KEY,SAVED_KEY,FEEDBACK_KEY,CONTRIB_KEY,DECISION_DIAL_KEY,DECISION_FLOOR_KEY,DECISION_LIST_KEY,
  ONBOARD_KEY,TRUST_LENS_KEY,THEME_KEY,CH_KEY,FORCE_KEY,CEREM_KEY,ERRAND_KEY,MAP_STATE_KEY,
  'cc.locale','cc.patches','cc.indexes.v1',
  'cc.lab.v1',                                     // retired; kept so old devices still wipe it
  'cc:h10-local-evidence-v1','vc:h4-evidence:v1'   // workbench review evidence (device-local QA)
];
function ccExport(){const store={};for(const k of CC_KEYS){try{const val=localStorage.getItem(k);if(val!=null)store[k]=val;}catch(e){}}return {app:'Conscious Consuming',format:'cc-data-v1',exported:new Date().toISOString(),store};}
function exportAll(){const b=new Blob([JSON.stringify(ccExport(),null,2)],{type:'application/json'});const a=el('a',{href:URL.createObjectURL(b),download:'conscious-consuming-my-data.json'});a.click();announce('Your data was exported.');const m=document.getElementById('you-msg');if(m)m.textContent='Exported, a file with everything this device holds.';}
function importAll(file){const r=new FileReader();
  r.onload=()=>{let ok=false;try{const j=JSON.parse(r.result);if(j&&j.store&&typeof j.store==='object'){for(const k of CC_KEYS){if(Object.prototype.hasOwnProperty.call(j.store,k))localStorage.setItem(k,j.store[k]);}ok=true;}}catch(e){}
    const m=document.getElementById('you-msg');
    if(ok){if(m)m.textContent='Restored, reloading…';location.reload();}
    else if(m)m.textContent='Sorry, that file isn’t a Conscious Consuming export.';};
  r.readAsText(file);}
function deleteAll(){for(const k of CC_KEYS){try{localStorage.removeItem(k);}catch(e){}}location.reload();}
function renderYou(){
  const v=document.getElementById('view-you'); if(!v)return;
  const cnt=k=>{try{const a=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(a)?a.length:0;}catch(e){return 0;}};
  const nSaved=cnt(SAVED_KEY), nNotes=cnt(FEEDBACK_KEY), nContrib=cnt(CONTRIB_KEY);
  const pri=THEMES.filter(t=>(themeWeights[t.id]||3)>=4);
  const summary=pri.length?pri.map(t=>`${hueDot(t.id)}${esc(t.label)}`).join('  ·  '):'Balanced, you haven’t prioritised anything yet';
  const chips=THEMES.map(t=>{const on=(themeWeights[t.id]||3)>=4;return `<button type="button" class="themechip${on?' on':''}" data-theme="${t.id}" title="${esc(t.blurb)}" aria-pressed="${on}"><span class="ti">${hueDot(t.id)}</span>${esc(t.label)}</button>`;}).join('');
  const nLines=decisionActivePersonalLines().length;
  const algChips=Object.keys(ALLERGEN_LABELS).map(k=>{const on=YOU.allergens.includes(k);return `<button type="button" class="themechip${on?' on':''}" data-alg="${k}" aria-pressed="${on}">${esc(ALLERGEN_LABELS[k])}</button>`;}).join('');
  // diet + require chips come from the line registry, so a chip's label always matches what the ranker accepts.
  const dietChip=l=>{const on=YOU.diet.includes(l.label);return `<button type="button" class="themechip${on?' on':''}" data-diet="${esc(l.label)}" title="${esc(l.reads)}" aria-pressed="${on}">${esc(l.label)}</button>`;};
  const dietChips=linesByKind('diet').map(dietChip).join('')||DIET_PREFS.slice(0,2).map(d=>`<button type="button" class="themechip${YOU.diet.includes(d)?' on':''}" data-diet="${esc(d)}">${esc(d)}</button>`).join('');
  const reqChips=linesByKind('require').map(dietChip).join('');
  const avKey=a=>String((typeof a==='string'?a:(a&&(a.id||a.label)))||'');
  const activeAv=activeAvoidLines();
  const avoidActiveChips=activeAv.map(a=>`<button type="button" class="themechip on avoidchip" data-avrm="${esc(avKey(a))}" title="${esc(a.reads||('Hide '+a.label))}, knows ${(a.brands||[]).length} brand${(a.brands||[]).length===1?'':'s'}" aria-label="Stop avoiding ${esc(a.label)}">${esc(a.label)} <span class="chip-x" aria-hidden="true">&#10005;</span></button>`).join('');
  const avoidSuggestChips=linesByKind('avoid').filter(l=>!isAvoiding(l)).map(l=>`<button type="button" class="themechip" data-avadd="${esc(l.id)}" title="${esc(l.reads)}">+ ${esc(l.label)}</button>`).join('');
  const regOpts=REGIONS.map(r=>`<option value="${r}"${YOU.region===r?' selected':''}>${regionLabel(r)}</option>`).join('');
  v.innerHTML=`
    <h2 class="sectionh">You</h2>
    <p class="sectionsub">This page lives <b>only on this device</b>. Rules filter decisions; Advanced priorities break only exact ties. There is no account, email, or automatic upload.</p>
    <figure class="imgslot art" data-slot="4" aria-hidden="true"><svg viewBox="0 0 540 150" width="420" height="117" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <g style="stroke:var(--hint)"><path d="M196 118c-18-4-30-14-30-30l6-48c40-14 96-14 136 0l6 48c0 16-12 26-30 30"/><path d="M226 70h88v48c0 6-4 10-10 10h-68c-6 0-10-4-10-10z"/></g>
      <g style="stroke:var(--accent)"><circle cx="270" cy="96" r="12"/><path d="M270 84v24M258 96h24" opacity=".7"/><path d="M410 64c8-8 20-10 28-8-4 10-14 16-28 8z"/></g>
    </svg></figure>
    <div class="youcard">
      <div class="youhd">My rules <span class="youmuted">, set once, applied in every category that can</span></div>
      <p class="youmuted small" style="margin:-.15rem 0 .5rem">A rule is something you won’t eat, something you require, or a company you won’t fund. It filters only where the facts support it, so it never empties a category it does not touch. You set every rule yourself; nothing is applied for you.</p>
      <div class="youneed">
        <div class="youneed-h">Food you won’t eat</div>
        <div class="lineset-lbl">Allergies <span class="youmuted small">, only an explicit free claim clears a rule; declarations and no data fold for a label check</span></div>
        <div class="themechips" id="you-alg">${algChips}</div>
        <div class="lineset-lbl">Diet</div>
        <div class="themechips" id="you-diet">${dietChips}</div>
      </div>
      <div class="youneed">
        <div class="youneed-h">Only show me <span class="youmuted small">, certifications &amp; properties, in categories that track them</span></div>
        <div class="themechips" id="you-req">${reqChips}</div>
      </div>
      <div class="youneed">
        <div class="youneed-h">Companies you avoid <span class="youmuted small">, the brand and what it owns, hidden everywhere</span></div>
        <div class="themechips" id="you-avoid-active"${activeAv.length?'':' hidden'}>${avoidActiveChips}</div>
        ${activeAv.length?'':'<p class="youmuted small" id="you-avoid-empty">None yet. Add one below, or tap “⊘ Avoid this brand” on any verdict.</p>'}
        <div class="avoidadd">
          <input id="you-avoid-in" placeholder="Avoid a company or brand…" aria-label="Avoid a company or brand" autocomplete="off">
          <button class="youbtn" id="you-avoid-go">Add</button>
        </div>
        ${avoidSuggestChips?`<div class="avoidsug"><span class="youmuted small">Or add a well-known parent company:</span><div class="themechips" style="margin-top:.35rem">${avoidSuggestChips}</div></div>`:''}
      </div>
      <div class="youneed">
        <div class="youneed-h">Where you shop</div>
        <select id="you-region" class="youselect" aria-label="Your region">${regOpts}</select>
        <span class="youmuted small">Your default everywhere, you can still change it in any category.</span>
      </div>
      ${FORCE.n?`<p class="forceline">${CC.icon('bolt')} ${forceLine()}</p>`:''}
      <p class="youmuted small">Price limits (“never over $X”) come when open price data lands. What we use has no per-item prices yet, so that rule would be silent. Better to leave it out than fake it.</p>
      <p class="youmuted small"><button class="youbtn" id="you-passport">⤓ Download your file</button> &nbsp;<label class="youbtn" style="cursor:pointer">⤒ Upload a file<input type="file" id="you-passport-in" accept="application/json,.json" hidden></label>. The file carries these ${nLines} rule${nLines===1?'':'s'} plus Advanced close-call priorities, never a name or account. Older compatible files still upload safely.</p>
    </div>
    <details class="youcard youleanings">
      <summary><span>Advanced: Close-call priorities</span><small>${summary}</small></summary>
      <div class="youleanings-body"><div class="youhd">Close-call priorities <span class="youmuted">, optional and consulted last</span></div>
      <p class="youmuted small">These never override the baseline, one of your rules, or the choices in front of you. They only break an exact tie between options that remain eligible.</p>
      <div class="themechips" id="you-themes">${chips}</div>
      </div>
    </details>
    <div class="youcard">
      <div class="youhd">What you’ve made</div>
      <div class="youstats">
        <a class="youstat" href="#saved"><span class="yn">${nSaved}</span><span class="yl">Saved</span></a>
        <a class="youstat" href="#notes"><span class="yn">${nNotes}</span><span class="yl">Notes</span></a>
        <a class="youstat" href="#contribute"><span class="yn">${nContrib}</span><span class="yl">Suggestions</span></a>
      </div>
    </div>
    ${chDev()?`<div class="youcard">
      <div class="youhd">The workbench</div>
      <p class="youmuted">Company pages, errands, and the change log work, but their facts or wording are not ready for the public shelf. <a href="#workbench">Try them on the workbench and see what still needs proof →</a></p>
      <button class="youbtn${chDev()?' on':''}" id="you-workbench">${chDev()?'Workbench is on, turn it off':'Turn the workbench on'}</button>
    </div>`:''}
    <div class="youcard">
      <div class="youhd">Your data, your terms</div>
      <p class="youmuted">This device holds the only copy. <b>Export</b> a file to back it up or move it. <b>Import</b> restores it. <b>Erase</b> removes it.</p>
      <div class="yourow">
        <button class="youbtn" id="you-export">⤓ Export my data</button>
        <button class="youbtn" id="you-import">⤒ Import a backup</button>
        <input type="file" id="you-file" accept="application/json,.json" hidden>
      </div>
      <div class="you-danger">
        <button class="youbtn warn" id="you-del">Erase everything on this device</button>
        <span id="you-delc" class="youconfirm" hidden>Permanently erase my rules, close-call priorities, ${nSaved} saved, ${nNotes} notes, ${nContrib} suggestion${nContrib===1?'':'s'} &amp; every setting this site stores on this device? <button class="youbtn warn" id="you-delyes">Yes, erase</button> <button class="youbtn" id="you-delno">Keep it</button></span>
      </div>
      <p class="youmuted small" id="you-msg" role="status" aria-live="polite"></p>
      <p class="youmuted small">App build: <b>${esc(CC_BUILD)}</b>, if things look old, hard-refresh (Ctrl+Shift+R).</p>
    </div>
    <div class="youcard">
      <div class="youhd">About accounts</div>
      <p class="youmuted">You never need an account here, and you can’t make one yet, on purpose. When the <b>commons</b> opens, so people can write guides and improve ratings together, accounts will exist for that one thing, built as ethically as we know how:</p>
      <ul class="youlist">
        <li><b>Pseudonymous</b>, a handle, never your real name.</li>
        <li><b>Passkey, not passwords</b>, nothing to leak, no email required.</li>
        <li><b>For contributing, not consuming</b>, browsing stays anonymous, always.</li>
        <li><b>Portable &amp; deletable</b>, leave any time; take or erase your work.</li>
      </ul>
      <p class="youmuted small">Until real people want to contribute, there’s nothing to sign into, and that restraint is the point. <a href="#contribute">Suggest something for the commons →</a></p>
    </div>`;
  v.querySelectorAll('#you-themes .themechip').forEach(b=>b.onclick=()=>{const id=b.dataset.theme;themeWeights[id]=(themeWeights[id]||3)>=4?3:5;saveThemes();applyThemes();renderYou();});
  v.querySelectorAll('#you-alg .themechip').forEach(b=>b.onclick=()=>{const k=b.dataset.alg;const i=YOU.allergens.indexOf(k);i<0?YOU.allergens.push(k):YOU.allergens.splice(i,1);excludes=new Set(YOU.allergens);saveYou();renderYou();});
  v.querySelectorAll('[data-diet]').forEach(b=>b.onclick=()=>{const d=b.dataset.diet;const i=YOU.diet.indexOf(d);i<0?YOU.diet.push(d):YOU.diet.splice(i,1);saveYou();renderYou();});
  v.querySelectorAll('[data-avrm]').forEach(b=>b.onclick=()=>{const k=b.dataset.avrm;YOU.avoid=(YOU.avoid||[]).filter(a=>String((typeof a==='string'?a:(a&&(a.id||a.label)))||'')!==k);saveYou();renderYou();});
  v.querySelectorAll('[data-avadd]').forEach(b=>b.onclick=()=>{const id=b.dataset.avadd;if(!(YOU.avoid||[]).some(a=>(typeof a==='string'?a:(a&&a.id))===id)){YOU.avoid=(YOU.avoid||[]).concat([id]);ceremony(lineById(id));saveYou();renderYou();}});
  const avin=document.getElementById('you-avoid-in'), avgo=document.getElementById('you-avoid-go');
  const addAvoid=()=>{const raw=((avin&&avin.value)||'').trim();if(!raw)return;const lc=raw.toLowerCase();const id='avoid:custom:'+lc.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    if((YOU.avoid||[]).some(a=>typeof a==='object'&&a&&a.id===id))return;
    YOU.avoid=(YOU.avoid||[]).concat([{id:id,kind:'avoid',label:raw,reads:'Hide anything from '+raw+'.',brands:[lc],custom:true}]);saveYou();renderYou();};
  if(avgo)avgo.onclick=addAvoid;
  if(avin)avin.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addAvoid();}};
  const yr=document.getElementById('you-region');if(yr)yr.onchange=e=>{YOU.region=e.target.value;regionFilter=YOU.region;saveYou();updateNavRegion();};
  const wbt=document.getElementById('you-workbench'); if(wbt)wbt.onclick=()=>setChannel(chDev()?'public':'dev');
  const ex=document.getElementById('you-export'); if(ex)ex.onclick=exportAll;
  const pb=document.getElementById('you-passport'); if(pb)pb.onclick=exportValuesPassport;
  const pin=document.getElementById('you-passport-in'); if(pin)pin.onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)importValuesPassport(f);};
  const yc=document.getElementById('you-card'); if(yc)yc.onclick=downloadValuesCard;
  const imp=document.getElementById('you-import'), file=document.getElementById('you-file');
  if(imp&&file){imp.onclick=()=>file.click();file.onchange=e=>{if(e.target.files&&e.target.files[0])importAll(e.target.files[0]);};}
  const del=document.getElementById('you-del'), delc=document.getElementById('you-delc');
  if(del&&delc){del.onclick=()=>{delc.hidden=false;del.style.display='none';};
    const no=document.getElementById('you-delno'); if(no)no.onclick=()=>{delc.hidden=true;del.style.display='';};
    const yes=document.getElementById('you-delyes'); if(yes)yes.onclick=deleteAll;}
}
// --- The shareable VERDICT CARD (Masterplan V6): one screenshot-friendly card for a single entity — a balanced
// banded score, the single most-decisive sourced reason, the no-ads promise, and a way into Explore. The "wow
// artifact" the first-users research says every launch needs. Self-contained from the bundle (#card/<cid>/<code>). ---
function headlineReason(p, ds, s){
  const sourced=[];
  for(const cr of ds.criteria){
    const v=p.scores&&p.scores[cr.key]; if(v==null)continue;
    const pr=CC.engine.provOf(p,cr.key), raw=p.provenance&&p.provenance[cr.key];
    if(pr.source)sourced.push({label:cr.label,v,note:pr.note,source:pr.source,asof:pr.asof,band:CC.engine.band(v),applied:!!(raw&&raw._applied)});
  }
  if(!sourced.length)return null;
  if(s&&s.cap){const c=sourced.find(x=>x.label===s.cap.label); if(c)return c;}
  sourced.sort((a,b)=>Math.abs(b.v-50)-Math.abs(a.v-50)); // the most decisive axis (extreme either way)
  return sourced[0];
}
// The generative value-bloom (§H prototype). Grows an organic mark from the entity's values-signature
// (CC.engine.signature → theme:score): one petal per value it carries, petal length = the score on that
// value. Decorative (aria-hidden); the real facts stay in text. The theme→hue map is provisional here,
// to be replaced by the design-token when §H-H4 lands. Blooms nothing rather than a hollow mark when the
// signature is too thin (<2 themes) to be honest.
const BLOOM_HUE={planet:'#3f8f5e',people:'#c98a5a',health:'#c9776f',honesty:'#c9a850',privacy:'#4f8fa9',animals:'#8a7fb5',cost:'#6fa07a',local:'#b0894f'};
const BLOOM_ORDER=['planet','people','health','honesty','privacy','animals','cost','local'];
function valueBloom(p,size){
  size=size||116;
  const sig=(CC.engine&&CC.engine.signature)?CC.engine.signature(p):null; if(!sig)return '';
  const themes=BLOOM_ORDER.filter(t=>sig[t]!=null);
  if(themes.length<2)return '';
  const R=size/2, cx=R, cy=R; let out='';
  themes.forEach((t,i)=>{
    const ang=-90+(i/themes.length)*360, sv=Math.max(0,Math.min(100,sig[t]));
    const len=R*0.20+(sv/100)*R*0.72, w=len*0.34, c=BLOOM_HUE[t]||'#6fa07a';
    const d=`M0,0 C ${(len*0.35).toFixed(1)},${(-w).toFixed(1)} ${(len*0.82).toFixed(1)},${(-w*0.5).toFixed(1)} ${len.toFixed(1)},0 C ${(len*0.82).toFixed(1)},${(w*0.5).toFixed(1)} ${(len*0.35).toFixed(1)},${w.toFixed(1)} 0,0`;
    out+=`<path d="${d}" fill="${c}" fill-opacity="0.5" stroke="${c}" stroke-opacity="0.75" stroke-width="1.1" transform="translate(${cx},${cy}) rotate(${ang.toFixed(1)})"/>`;
  });
  out+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(R*0.08).toFixed(1)}" fill="#7a5a3c"/>`;
  return `<svg class="vbloom" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${out}</svg>`;
}
function renderCard(cid, code){
  const v=document.getElementById('view-card'); if(!v)return;
  const ds=window.CC_BUNDLE&&window.CC_BUNDLE.data[cid];
  if(!ds){const cat=(CATALOG||[]).find(c=>c.id===cid);if(cat){v.innerHTML='<p class="sectionsub">Loading…</p>';getDataset(cat).then(d=>{if(window.CC_BUNDLE)window.CC_BUNDLE.data[cid]=d;renderCard(cid,code);}).catch(()=>{v.innerHTML='<a class="back" href="#home">← home</a><p class="alts-sub">Could not load.</p>';});return;}}
  const p=ds&&ds.products.find(x=>x.code===code);
  if(!ds||!p){v.innerHTML=`<a class="back" href="#home">← home</a><p class="alts-sub">That entry could not be found.</p>`;return;}
  // a BALANCED (all-3) view, so a shared verdict isn't the sharer's idiosyncratic weighting
  const weights={}; for(const cr of ds.criteria)weights[cr.key]=3;
  const s=CC.engine.score(p,{criteria:ds.criteria,weights,excludes:new Set()});
  const t=s?CC.engine.scoreTier(s.score):null, r=s?headlineReason(p,ds,s):null;
  const reasonHTML=r?`<div class="vc-reason">${r.applied?`<span style="color:var(--accent);font-weight:600">${CC.icon('edit')} your correction · </span>`:''}<span class="vc-axis">${esc(r.label)}: <b>${esc(r.band[0])}</b></span>, ${esc(r.note||'')} <a href="${esc(r.source)}" target="_blank" rel="noopener">${r.applied?'your source':'source'}↗${r.asof?' '+esc(r.asof):''}</a></div>`:'';
  // a sourced lens has a static, OG-tagged page + a 1200x630 card image at /c/<cid>/<code>.{html,png}
  // (built by build_cards.js + build_card_images.py) — share THAT so the link previews AS the image everywhere.
  const lensSourced=ds.products.some(x=>x.provenance&&Object.values(x.provenance).some(vv=>vv&&typeof vv==='object'&&vv.source));
  const fileCode=code.replace(/[^a-zA-Z0-9._-]/g,'-');
  const served=location.protocol.indexOf('http')===0;
  const imgRel='./c/'+cid+'/'+fileCode+'.png';                                    // relative → resolves on file:// and when served
  const shareUrl=(lensSourced&&served)?(location.origin+'/c/'+cid+'/'+fileCode):location.href;
  const imgRow=lensSourced?`<div class="vc-sharex"><a class="vc-dl" href="${imgRel}" download="conscious-consuming-${fileCode}.png">⤓ Save card image</a><span class="vc-sharenote">Paste the link anywhere, social, chat, Slack, and this card is the preview image.</span></div>`:'';
  const hint=!lensSourced?'Screenshot this card to share it, or copy the link.':(served?'Share the link, it previews as this card image everywhere. Or save the image to post it directly.':'Save the card image to post it anywhere, or copy the link.');
  // Provenance honesty (§E): show how independently corroborated the score is. Multi-source is a quiet
  // confidence signal; single-source is stated plainly with confidence held, never N rows faking independence.
  const corrHTML=verdictCardProvenanceHTML(p);
  const bloomHTML=valueBloom(p,116);
  v.innerHTML=`<a class="back" href="#explore/${cid}">← all ${esc(ds.meta.label)}</a>
    <div class="vcard">
      <div class="vc-brandbar">Conscious Consuming · sources and scores</div>
      ${bloomHTML}
      <div class="vc-name">${esc(p.name)}</div>${p.brand?`<div class="vc-brand">${esc(p.brand)}</div>`:''}
      ${s?`<div class="vc-score"><span class="vc-num">${s.score}<small>/100</small></span><span class="stier ${t[1]}">${t[0]}</span></div><div class="vc-basis">with equal weight on the measures shown</div>`:`<div class="vc-basis">No equal-weight score is available.</div>`}
      ${reasonHTML}
      ${corrHTML}
      <div class="vc-foot">No ads · No tracking · No brand pays us</div>
    </div>
    <div class="vc-actions"><a class="catbtn" href="#explore/${cid}">Compare ${esc(ds.meta.label)} by <b>your</b> values →</a><button class="savebtn" id="vc-share">↗ Share</button><button class="savebtn ghost" id="vc-copy">Copy link</button></div>
    ${imgRow}
    <p class="vc-hint">${hint}</p>`;
  const cp=document.getElementById('vc-copy'), sh=document.getElementById('vc-share');
  if(sh)sh.onclick=()=>{
    const text=r?`${r.label}: ${r.band[0]}, ${r.note||''}`:`${ds.meta.label} · sources and scores`;
    if(navigator.share){navigator.share({title:p.name+', sources and scores',text,url:shareUrl}).catch(()=>{});}
    else{const ok=()=>{sh.textContent='Link copied ✓';announce('Link copied, paste it to share');};try{navigator.clipboard.writeText(shareUrl).then(ok,ok);}catch(e){ok();}}
  };
  if(cp)cp.onclick=()=>{const done=()=>{cp.textContent='Copied ✓';announce('Link copied');};try{navigator.clipboard.writeText(shareUrl).then(done,done);}catch(e){done();}};
}
// --- 🔦 Scan a barcode → the verdict for THAT product, by your values. Fully offline: the {barcode→category}
// index (app/data/barcodes.json, ~16.5k Open Food Facts products) resolves a scan to its category, and the
// existing #item route loads it and renders the verdict. Camera via the native BarcodeDetector; always a manual
// fallback. Nothing is uploaded; misses link out to OFF (user-initiated), never an automatic API call. ---
const SCAN_CSS=`
.scanpanel{max-width:520px;margin:1rem auto 0}
.scancam{position:relative;aspect-ratio:4/3;background:#000;border-radius:14px;overflow:hidden;border:1px solid var(--line)}
.scancam[hidden]{display:none}.scancam video{width:100%;height:100%;object-fit:cover;display:block}
.scanline{position:absolute;left:8%;right:8%;top:50%;height:2px;background:var(--accent);box-shadow:0 0 12px var(--accent);animation:scanmove 2.2s ease-in-out infinite}
@keyframes scanmove{0%,100%{transform:translateY(-58px)}50%{transform:translateY(58px)}}
@media (prefers-reduced-motion:reduce){.scanline{animation:none;top:50%}}
.scanstart{display:block;width:100%;margin:.7rem 0 0;padding:.7rem;font:inherit;font-weight:600;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer}
.scanstart[hidden]{display:none}
.scanmanual{margin-top:1rem}.scanmanual label{font-size:.85rem;color:var(--muted)}
.scanrow{display:flex;gap:.5rem;margin-top:.3rem}
.scanrow input{flex:1;font:inherit;padding:.55rem .7rem;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink)}
.scanbtn{font:inherit;font-weight:600;padding:.55rem .85rem;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);text-decoration:none;cursor:pointer;display:inline-block}
.scanbtn.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
.scanmsg{margin-top:.9rem;min-height:1.2em;font-size:.92rem}
.scanmiss{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:.9rem 1rem}
.scanmiss-acts{display:flex;flex-wrap:wrap;gap:.5rem;margin:.7rem 0 0}
.scanmiss-note{font-size:.82rem;color:var(--muted);margin:.6rem 0 0}
.scancov{font-size:.8rem;color:var(--hint);margin-top:1rem}
.liveverdict{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:12px;padding:1rem 1.1rem;text-align:left}
.lvtag{font-size:.66rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
.lvnm{font-weight:700;font-size:1.1rem;margin:.3rem 0}.lvbr{color:var(--hint);font-weight:400;font-size:.85rem}
.lvscore{display:flex;align-items:baseline;gap:.6rem;margin:.2rem 0 .5rem}
.lvs{font-size:1.8rem;font-weight:700;color:var(--accent)}.lvt{font-weight:600}.lvfor{color:var(--muted);font-weight:400}
.lvreason{border-left:3px solid var(--accent);background:var(--pill);border-radius:0 8px 8px 0;padding:.5rem .7rem;font-size:.9rem;margin:.3rem 0 .6rem}
.lvbars{display:flex;flex-wrap:wrap;gap:.3rem .7rem;font-size:.78rem;color:var(--hint)}.lvb{display:inline-flex;gap:.3rem;align-items:center}
.lvbd{font-size:.64rem;font-weight:700;padding:.05rem .4rem;border-radius:5px;background:var(--track);color:var(--muted)}.lvbd.hi{background:var(--pill);color:var(--accent)}
.lvalg{font-size:.82rem;color:var(--muted);margin:.5rem 0 0}`;
let _barcodes=null,_barcodesP=null,scanState=null;
function ensureBarcodes(){
  if(_barcodes)return Promise.resolve(_barcodes);
  if(_barcodesP)return _barcodesP;
  _barcodesP=fetch('./data/barcodes.json').then(r=>r.json()).then(j=>{_barcodes=j;return j;}).catch(()=>{_barcodes={};return _barcodes;});
  return _barcodesP;
}
function scanMsg(html){const m=document.getElementById('scan-msg');if(m)m.innerHTML=html;}
function handleCode(code){
  code=String(code||'').replace(/\D/g,'');
  if(code.length<6){scanMsg('That didn’t look like a product barcode.');return;}
  scanMsg('Looking up <code>'+esc(code)+'</code>…');
  ensureBarcodes().then(idx=>{
    const cid=idx[code];
    if(cid){stopScan();location.hash='item/'+encodeURIComponent(cid)+'/'+encodeURIComponent(code);}
    else renderScanMiss(code);
  });
}
function renderScanMiss(code){
  scanMsg('<div class="scanmiss"><b>Not in the local index.</b> We could not match <code>'+esc(code)+'</code>, but Open Food Facts may have it.'+
    '<div class="scanmiss-acts">'+
      '<button class="scanbtn primary" id="scan-live">Check Open Food Facts</button>'+
      '<a class="scanbtn" href="https://world.openfoodfacts.org/product/'+esc(code)+'" target="_blank" rel="noopener">View on OFF ↗</a>'+
      '<a class="scanbtn" href="#search/'+esc(code)+'">Search by name</a>'+
      '<a class="scanbtn" href="#contribute/want/'+esc(code)+'">Request this product</a>'+
    '</div>'+
    '<p class="scanmiss-note">“Check Open Food Facts” sends <b>only this barcode</b> to the open database. Nothing is stored, and your rules never leave this device.</p></div>');
  const b=document.getElementById('scan-live'); if(b)b.onclick=()=>liveLookup(code);
}

// --- Tier 2: OPT-IN live Open Food Facts lookup, so a scan that isn't in our curated set can still get a verdict.
// The OFF→score map below is a faithful port of pipeline/scoring.py (so a live score matches a baked one). Only
// fires on the user's explicit tap; sends only the barcode to OFF (open data), nothing else, stores nothing. ---
const OFF_GRADE={a:100,b:75,c:50,d:25,e:0}, OFF_NOVA={1:100,2:66,3:33,4:0};
const OFF_ETHICAL={'en:organic':1,'en:eu-organic':1,'en:usda-organic':1,'en:fairtrade':1,'en:fair-trade':1,'en:fairtrade-international':1,'en:rainforest-alliance':1};
const OFF_TAGMAP={'en:gluten':'gluten','en:crustaceans':'crustaceans','en:eggs':'eggs','en:fish':'fish','en:peanuts':'peanut','en:soybeans':'soy','en:soya':'soy','en:soy':'soy','en:milk':'milk','en:nuts':'nuts','en:tree-nuts':'nuts','en:celery':'celery','en:mustard':'mustard','en:sesame-seeds':'sesame','en:sesame':'sesame','en:sulphur-dioxide-and-sulphites':'sulphites','en:sulfites':'sulphites','en:sulphites':'sulphites','en:lupin':'lupin','en:molluscs':'molluscs','en:lactose':'lactose'};
const OFF_FREE_LABELMAP={'en:gluten-free':'gluten','en:crustacean-free':'crustaceans','en:crustaceans-free':'crustaceans','en:egg-free':'eggs','en:eggs-free':'eggs','en:fish-free':'fish','en:peanut-free':'peanut','en:peanuts-free':'peanut','en:soy-free':'soy','en:soya-free':'soy','en:soybean-free':'soy','en:milk-free':'milk','en:dairy-free':'milk','en:nut-free':'nuts','en:nuts-free':'nuts','en:celery-free':'celery','en:mustard-free':'mustard','en:sesame-free':'sesame','en:sulphite-free':'sulphites','en:sulphites-free':'sulphites','en:sulfite-free':'sulphites','en:sulfites-free':'sulphites','en:lupin-free':'lupin','en:mollusc-free':'molluscs','en:molluscs-free':'molluscs','en:lactose-free':'lactose','en:coconut-free':'coconut'};
Object.assign(OFF_FREE_LABELMAP,{'en:no-gluten':'gluten','en:certified-gluten-free':'gluten','en:dzg-gluten-free':'gluten','en:gfco-gluten-free':'gluten','en:beyond-celiac-gluten-free':'gluten','en:cert-tm-gluten-free':'gluten','en:sans-gluten':'gluten','it:sin-gluten':'gluten','nl:glutenvrij':'gluten','fr:glutenfrei':'gluten','en:no-crustaceans':'crustaceans','en:no-eggs':'eggs','en:no-fish':'fish','en:no-peanuts':'peanut','en:no-soybeans':'soy','en:no-milk':'milk','en:free-from-dairy-and-gluten':'milk','en:no-nuts':'nuts','en:no-celery':'celery','en:no-mustard':'mustard','en:no-sesame':'sesame','en:no-sulphites':'sulphites','en:no-sulfites':'sulphites','en:without-sulfites':'sulphites','en:no-lupin':'lupin','en:no-molluscs':'molluscs','en:no-lactose':'lactose','en:sans-lactose':'lactose','fr:naturally-lactose-free':'lactose','nl:lactosevrij':'lactose','en:no-coconut':'coconut'});
OFF_FREE_LABELMAP['en:free-from-dairy-and-gluten']='milk';
const FOOD_CRITERIA=[
  {key:'environment',label:'Environment',tier:'measured'},{key:'processing',label:'Processing',tier:'measured'},
  {key:'nutrition_grade',label:'Nutrition',tier:'measured'},{key:'protein',label:'Protein',tier:'measured'},
  {key:'low_sugar',label:'Low sugar',tier:'measured'},{key:'ethics',label:'Ethics',tier:'certified'}];
function _offnum(v){const f=parseFloat(v);return isNaN(f)?null:f;}
function _offsrc(note,code){return {note:note,source:'https://world.openfoodfacts.org/product/'+code,asof:'2026'};}
function offScore(p,code){    // port of scoring.score_category for ONE product
  const name=(p.product_name||'').trim(); if(!name)return null;
  const nutr=p.nutriments||{};
  const eco=p.ecoscore_grade||p.environmental_score_grade;
  const eg=((eco&&eco!=='unknown'&&eco!=='not-applicable')?String(eco):'').toLowerCase();
  const g=String(p.nutriscore_grade||'').toLowerCase(), nova=p.nova_group;
  const protein=_offnum(nutr.proteins_100g), sugar=_offnum(nutr.sugars_100g);
  const labels=p.labels_tags||[]; let n_eth=0; for(const l of labels)if(OFF_ETHICAL[l])n_eth++;
  const scores={
    environment: OFF_GRADE[eg]!=null?OFF_GRADE[eg]:null,
    processing: (typeof nova==='number'&&OFF_NOVA[nova]!=null)?OFF_NOVA[nova]:null,
    nutrition_grade: OFF_GRADE[g]!=null?OFF_GRADE[g]:null,
    protein: protein==null?null:Math.min(100,Math.round(protein*12.5)),
    low_sugar: sugar==null?null:Math.max(0,Math.min(100,Math.round(100-sugar*4))),
    ethics: labels.length?Math.min(100,n_eth*50):null
  };
  let nn=0; for(const k in scores)if(scores[k]!=null)nn++;
  if(nn<2)return null;   // too sparse to score honestly (same rule as the pipeline)
  const prov={};
  if(scores.environment!=null)prov.environment=_offsrc('Open Food Facts reports Green-Score '+eg.toUpperCase()+'.',code);
  if(scores.processing!=null)prov.processing=_offsrc('Open Food Facts reports NOVA group '+nova+'.',code);
  if(scores.nutrition_grade!=null)prov.nutrition_grade=_offsrc('Open Food Facts reports Nutri-Score '+g.toUpperCase()+'.',code);
  if(scores.protein!=null)prov.protein=_offsrc('Open Food Facts nutriments report '+protein.toFixed(1)+' g protein per 100 g.',code);
  if(scores.low_sugar!=null)prov.low_sugar=_offsrc('Open Food Facts nutriments report '+sugar.toFixed(1)+' g sugar per 100 g.',code);
  if(scores.ethics!=null)prov.ethics=_offsrc(n_eth?('Open Food Facts labels include '+n_eth+' organic/fair-trade/Rainforest Alliance tag(s).'):'Open Food Facts labels are present, but none match the organic/fair-trade set.',code);
  const atags=(p.allergens_tags||[]).concat(p.traces_tags||[]); const ag={}, free={};
  for(const t of atags)if(OFF_TAGMAP[t])ag[OFF_TAGMAP[t]]=1;
  for(const t of labels){const mapped=OFF_FREE_LABELMAP[String(t).toLowerCase()];if(mapped&&!ag[mapped])free[mapped]=1;if(String(t).toLowerCase()==='en:free-from-dairy-and-gluten'&&!ag.gluten)free.gluten=1;}
  const brand=((p.brands||'').split(',')[0]||'').slice(0,30);
  const evidence={declares:Object.keys(ag),declaredFree:Object.keys(free)};
  return {code:code,name:name.slice(0,60),brand:brand,scores:scores,provenance:prov,allergens:evidence.declares,allergensDeclared:!!(p.allergens_tags&&p.allergens_tags.length),allergenEvidence:evidence};
}
function liveLookup(code){
  scanMsg('Looking up <code>'+esc(code)+'</code> on Open Food Facts…');
  const fields='product_name,brands,nutriscore_grade,ecoscore_grade,environmental_score_grade,nova_group,nutriments,labels_tags,allergens_tags,traces_tags';
  fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields='+fields)
    .then(r=>r.json())
    .then(j=>{
      if(!j||j.status!==1||!j.product){ scanMsg('<div class="scanmiss">Open Food Facts doesn’t have <code>'+esc(code)+'</code> either, it may not be a food product. <a href="#search/'+esc(code)+'">Search by name</a> instead.</div>'); return; }
      const rec=offScore(j.product,code);
      if(!rec){ scanMsg('<div class="scanmiss">Open Food Facts has this product, but not enough sourced facts to score it honestly. <a href="https://world.openfoodfacts.org/product/'+esc(code)+'" target="_blank" rel="noopener">See what they have ↗</a></div>'); return; }
      renderLiveVerdict(rec);
    })
    .catch(()=>{ scanMsg('<div class="scanmiss">Couldn’t reach Open Food Facts. Check your connection and scan again. The barcode was not saved.</div>'); });
}
function renderLiveVerdict(p){
  const weights=CC.engine.themeDefaults(FOOD_CRITERIA, themeWeights, CC.engine.KEY2THEME);
  const V=CC.engine.verdict(p,{criteria:FOOD_CRITERIA,weights:weights});
  if(!V){ scanMsg('<div class="scanmiss">Not enough of your weighted values have data here to score it honestly, that’s the honest answer.</div>'); return; }
  const dec=V.reason;
  const bars=V.bands.map(b=>'<span class="lvb">'+esc(b.label)+' <span class="lvbd'+(b.v>=70?' hi':'')+'">'+esc(b.band[0])+'</span></span>').join('');
  const alg=allergenLine(p);
  scanMsg('<div class="liveverdict"><div class="lvtag">live from Open Food Facts · scored just now</div>'+
    '<div class="lvnm">'+esc(p.name)+(p.brand?' <span class="lvbr">'+esc(p.brand)+'</span>':'')+'</div>'+
    '<div class="lvscore"><span class="lvs">'+V.score+'</span><span class="lvt">'+esc(V.tier[0])+' <span class="lvfor">for your values</span></span></div>'+
    (dec?'<div class="lvreason"><b>'+esc(dec.label)+': '+esc(dec.band[0])+'</b>, '+esc(dec.note||'')+'</div>':'')+
    '<div class="lvbars">'+bars+'</div>'+
    '<p class="lvalg">'+alg+'</p>'+
    '<p class="scanmiss-note">A temporary score from Open Food Facts, not saved in the local index. <a href="https://world.openfoodfacts.org/product/'+esc(p.code)+'" target="_blank" rel="noopener">View on OFF ↗</a></p></div>');
}
function startScan(){
  const wrap=document.getElementById('scan-cam'),video=document.getElementById('scan-video');
  if(!('BarcodeDetector' in window)){if(wrap)wrap.hidden=true;scanMsg('Live camera scanning isn’t supported in this browser. Type the barcode below, it works exactly the same.');return;}
  if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){if(wrap)wrap.hidden=true;scanMsg('No camera available here. Type the barcode below.');return;}
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}}).then(stream=>{
    let det;try{det=new window.BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39']});}catch(e){det=new window.BarcodeDetector();}
    video.srcObject=stream;video.setAttribute('playsinline','');const pp=video.play();if(pp&&pp.catch)pp.catch(()=>{});
    scanState={stream,raf:0,active:true};
    scanMsg('Point the camera at a barcode…');
    (function tick(){ if(!scanState||!scanState.active)return;
      det.detect(video).then(codes=>{ if(scanState&&scanState.active){ if(codes&&codes.length)handleCode(codes[0].rawValue); else scanState.raf=requestAnimationFrame(tick); } }).catch(()=>{ if(scanState&&scanState.active)scanState.raf=requestAnimationFrame(tick); });
    })();
  }).catch(()=>{if(wrap)wrap.hidden=true;scanMsg('Couldn’t open the camera (permission denied, or none found). Type the barcode below.');});
}
function stopScan(){ if(!scanState)return; scanState.active=false; if(scanState.raf)cancelAnimationFrame(scanState.raf); try{scanState.stream.getTracks().forEach(t=>t.stop());}catch(e){} const v=document.getElementById('scan-video');if(v)v.srcObject=null; scanState=null; }
function renderScan(){
  const v=document.getElementById('view-scan');if(!v)return;
  if(!document.getElementById('scancss')){const s=el('style',{id:'scancss'});s.textContent=SCAN_CSS;document.head.appendChild(s);}
  v.innerHTML=
    '<h2 class="sectionh">Scan a barcode</h2>'+
    '<p class="sectionsub">Scan a product barcode to compare its sourced facts with <b>your</b> rules and priorities. The camera stays in your browser. If the local index has no match, you can choose to send only the barcode number to Open Food Facts.</p>'+
    '<div class="scanpanel">'+
      '<div id="scan-cam" class="scancam"><video id="scan-video" muted playsinline></video><div class="scanline" aria-hidden="true"></div></div>'+
      '<button class="scanstart" id="scan-start">Start camera</button>'+
      '<div class="scanmanual"><label for="scan-in">…or type the barcode</label><div class="scanrow"><input id="scan-in" inputmode="numeric" autocomplete="off" placeholder="e.g. 7622210449283"><button id="scan-go" class="scanbtn primary">Look up</button></div></div>'+
      '<p id="scan-msg" class="scanmsg" aria-live="polite"></p>'+
      '<p class="scancov">Food records come from <a href="https://world.openfoodfacts.org/" target="_blank" rel="noopener">Open Food Facts</a>. Many barcodes are still missing; the scanner says so when it cannot make a match.</p>'+
    '</div>';
  const go=document.getElementById('scan-go'),inp=document.getElementById('scan-in'),st=document.getElementById('scan-start');
  if(go)go.onclick=()=>handleCode(inp.value);
  if(inp)inp.onkeydown=e=>{if(e.key==='Enter')handleCode(inp.value);};
  if(st)st.onclick=()=>{st.hidden=true;startScan();};
}

// ══ N1 · THE NODE SYSTEM (codex.md §4) — everything is a node; every node gets the same six-slot page;
//    #n/<type>/<slug> is the address. The engine already speaks this id space (ovs:…); this makes it walkable.
//    Runtime node data comes from the generated indexes. sample.json remains a schema example only.
//    Lines come straight from the registry; categories/guides/items redirect to their existing (richer) pages. ══
let NODES=null,NODES_P=null,ASK_CORE=null,ASK_CORE_P=null,ASK_INDEX=null,ASK_INDEX_P=null;
function fetchNodeJson(file,optional){
  return fetch('./data/nodes/'+file).then(r=>{
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(data=>({file:file,data:data,optional:!!optional,error:null}))
    .catch(err=>({file:file,data:null,optional:!!optional,error:(err&&err.message)||'load failed'}));
}
function loadAskCore(){
  if(ASK_CORE)return Promise.resolve(ASK_CORE);
  if(ASK_CORE_P)return ASK_CORE_P;
  ASK_CORE_P=fetchNodeJson('ask-core.json',false).then(res=>{
    ASK_CORE=(res.data&&res.data.format==='ovs-ask-core-index')?res.data:{tokens:{},aliases:{},targets:{},failed:true,error:res.error||'invalid ask-core'};
    if(res.error)ASK_CORE.failed=true,ASK_CORE.error=res.error;
    return ASK_CORE;
  });
  return ASK_CORE_P;
}
function loadAskIndex(){
  if(ASK_INDEX)return Promise.resolve(ASK_INDEX);
  if(ASK_INDEX_P)return ASK_INDEX_P;
  ASK_INDEX_P=fetchNodeJson('ask-index.json',false).then(res=>{
    ASK_INDEX=(res.data&&res.data.format==='ovs-ask-index')?res.data:{tokens:{},aliases:{},failed:true,error:res.error||'invalid ask-index'};
    if(res.error)ASK_INDEX.failed=true,ASK_INDEX.error=res.error;
    return ASK_INDEX;
  });
  return ASK_INDEX_P;
}
function loadNodes(){
  if(NODES)return Promise.resolve(NODES);
  if(NODES_P)return NODES_P;
  // The generated indexes: brands + companies + tags + errands, merged into one node pool,
  // plus everyday-phrase synonyms. ask-core.json handles startup Ask; ask-index.json stays lazy.
  const required=['brands.json','companies.json','tags.json','errands.json'];
  NODES_P=Promise.all([fetchNodeJson('manifest.json',true)].concat(required.map(f=>fetchNodeJson(f,false)),[fetchNodeJson('synonyms.json',true)]))
    .then(results=>{
      const byFile={};for(const r of results)byFile[r.file]=r;
      const br=byFile['brands.json'].data,co=byFile['companies.json'].data,tg=byFile['tags.json'].data,er=byFile['errands.json'].data,sy=byFile['synonyms.json'].data;
      const nodes=[].concat((br&&br.nodes)||[],(co&&co.nodes)||[],(tg&&tg.nodes)||[],(er&&er.nodes)||[]);
      const byId={};for(const n of nodes)byId[n.id]=n;
      const failed=results.filter(r=>r.error&&!r.optional).map(r=>r.file);
      NODES={nodes:nodes,byId:byId,syn:(sy&&sy.aliases)||{},manifest:(byFile['manifest.json']||{}).data||null,loaded:results.filter(r=>r.data).map(r=>r.file),failed:failed,degraded:failed.length>0||!nodes.length,ready:failed.length===0&&nodes.length>0};
      return NODES;
    });
  return NODES_P;
}
// Every ovs: id has one address in the app — the graph and the router speak the same names.
function idToHash(id){
  id=String(id||'');
  let m=id.match(/^ovs:item\/([^/]+)\/(.+)$/); if(m)return '#item/'+m[1]+'/'+encodeURIComponent(m[2]);
  m=id.match(/^ovs:cat\/(.+)$/); if(m)return '#explore/'+m[1];
  m=id.match(/^ovs:guide\/(.+)$/); if(m)return '#guide/'+m[1];
  m=id.match(/^ovs:(brand|company|tag|line|errand|value)\/(.+)$/); if(m)return '#n/'+m[1]+'/'+encodeURIComponent(m[2]);
  return null;
}
const NTYPE_LABEL={brand:'Brand',company:'Company',tag:'Label',line:'Line',errand:'Errand',value:'Value'};
function nodeSlug(id){return String(id||'').replace(/^ovs:[a-z]+\//,'');}
function nodeHash(n){return '#n/'+n.type+'/'+encodeURIComponent(nodeSlug(n.id));}
function findNode(type,slug){
  slug=String(slug||'').toLowerCase();
  if(type==='line')return null; // lines resolve from the registry in renderNode
  const direct=NODES&&NODES.byId&&NODES.byId['ovs:'+type+'/'+slug];
  return direct||(NODES&&NODES.nodes||[]).find(n=>n.type===type&&nodeSlug(n.id).toLowerCase()===slug)||null;
}
function nodeLoadProblem(){
  const failed=(NODES&&NODES.failed)||[];
  if(failed.length)return 'Company and brand files could not load: '+failed.join(', ')+'. Category and guide pages still work.';
  if(NODES&&NODES.degraded&&!((NODES.nodes||[]).length))return 'The company and brand index could not load. Category and guide pages still work.';
  return '';
}
// company/brand item-matching shares the avoid machinery: one matcher, one truth
function nodeMatcher(n){
  if(n.type==='brand'){const toks=[n.label.toLowerCase()].concat(n.aliases||[]);return p=>toks.some(t=>_wordHit(((p.brand||'')+' '+(p.name||'')).toLowerCase(),t));}
  if(n.type==='company'){
    const L=n.line&&lineById(n.line);
    const toks=(L&&L.brands)||((n.brandNames||[]).map(s=>s.toLowerCase()));
    return p=>toks.some(t=>_wordHit(((p.brand||'')+' '+(p.name||'')+' '+(p.code||'')).toLowerCase(),t));
  }
  if(n.type==='tag'){const acc=[n.label].concat(n.aliases||[]).map(s=>s.toLowerCase());return p=>(p.focuses||p.labels||[]).some(f=>acc.indexOf(String(f).toLowerCase())>=0);}
  return null;
}
function nodeLensSection(n,box){
  // slot 2, lazily per category — a tap ranks that category's matching items under YOUR values, live
  const cats=(n.categories||[]).filter(cid=>(CATALOG||[]).some(c=>c.id===cid));
  if(!cats.length){box.innerHTML='';return;}
  const wrap=el('div',{});
  wrap.appendChild(el('div',{class:'dsh'},'With your rules and priorities'));
  if(n.top&&n.top.length){
    const t=el('div',{});
    t.innerHTML=`<p class="alts-sub" style="margin:.1rem 0 .4rem">Its strongest, under a <b>balanced</b> lens (every value weighed equally, not your personal score):</p>`
      +n.top.map(x=>`<a class="dcard" href="#item/${esc(x.cat)}/${encodeURIComponent(x.code)}"><span class="dcard-n">${esc(x.name)}</span><span class="dcard-c">${x.score}/100 balanced · ${esc(x.cat)}</span></a>`).join('');
    t.querySelectorAll('.dcard');wrap.appendChild(t);
  }
  const match=nodeMatcher(n);
  if(match)for(const cid of cats){
    const c=(CATALOG||[]).find(x=>x.id===cid); if(!c)continue;
    const row=el('div',{style:'margin-top:.55rem'});
    const b=el('button',{class:'savebtn'},'Compare its '+esc(c.label.toLowerCase())+' with your rules and priorities →');
    b.onclick=()=>{b.disabled=true;b.textContent='Ranking…';
      getDataset(c).then(ds=>{
        const w=CC.engine.themeDefaults(ds.criteria,themeWeights,ds.key2theme||CC.engine.KEY2THEME);
        const hits=(ds.products||[]).filter(match).map(p=>({p:p,s:CC.engine.score(p,{criteria:ds.criteria,weights:w,excludes:new Set(YOU.allergens)})})).filter(x=>x.s).sort((a,b2)=>b2.s.score-a.s.score);
        row.innerHTML='';
        if(!hits.length){row.appendChild(el('p',{class:'alts-sub'},'Nothing of theirs clears your rules in '+esc(c.label.toLowerCase())+'.'));return;}
        row.appendChild(el('div',{class:'alts-sub',style:'margin:.2rem 0 .3rem'},hits.length+' in '+esc(c.label.toLowerCase())+'. Compared with your rules and priorities:'));
        for(const h of hits.slice(0,5)){const card=el('a',{class:'dcard',href:'#item/'+cid+'/'+encodeURIComponent(h.p.code)});card.innerHTML=`<span class="dcard-n">${esc(h.p.name)}</span><span class="dcard-c">${h.s.score}/100 for you</span><span class="provline">${provenanceChipHTML(h.p)}</span>`;row.appendChild(card);}
      }).catch(()=>{row.innerHTML='';row.appendChild(el('p',{class:'alts-sub'},'Couldn’t load that category. Try again.'));});
    };
    row.appendChild(b);wrap.appendChild(row);
  }
  box.innerHTML='';box.appendChild(wrap);
}
function renderNode(arg){
  const v=document.getElementById('view-node'); if(!v)return;
  const parts=(arg||'').split('/'), type=parts[0]||'', slug=decodeURIComponent(parts.slice(1).join('/')||'');
  // richer pages already exist for these node types — the node address just walks you there
  if(type==='category'){location.hash='explore/'+slug;return;}
  if(type==='guide'){location.hash='guide/'+slug;return;}
  if(type==='item'){location.hash='item/'+slug;return;}
  // Public channel: brand / company / tag / errand pages are on the workbench (their generated text
  // hasn't passed the voice bar). Replace with the honest note — and keep the one verb that IS ready.
  if(!chDev()&&type!=='line'&&type!=='value'){
    const label=slug.replace(/-/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
    const L=lineById('avoid:'+slug);
    v.innerHTML=`<a class="back" href="#home">← home</a>
      <div class="ntype">On the workbench</div>
      <h2 class="sectionh" style="margin-top:.1rem">${esc(label)}</h2>
      <p class="sectionsub">This ${esc(type)} page is not ready for public use. Ownership links may be incomplete, large pages may load slowly, and every sentence still needs review. <a href="#workbench">See what remains to be checked →</a></p>`;
    if(L){const w=el('div',{class:'card',style:'border-left:3px solid var(--accent)'});
      const on=isAvoiding(L);
      w.innerHTML=`<b>One thing here is ready now:</b> the line. <p class="alts-sub" style="margin:.35rem 0 .6rem">${esc(L.reads)} It knows ${(L.brands||[]).length} brand names today. <a href="${esc(L.why||'#')}" target="_blank" rel="noopener">why people hold it ↗</a></p>`;
      const b=el('button',{class:'savebtn'+(on?' on':'')},on?'⊘ Avoiding, tap to stop':'⊘ Avoid '+esc(L.label)+' everywhere');
      b.onclick=()=>{if(isAvoiding(L)){YOU.avoid=(YOU.avoid||[]).filter(a=>(typeof a==='string'?a:(a&&a.id))!==L.id);}else{YOU.avoid=(YOU.avoid||[]).concat([L.id]);}saveYou();renderNode(arg);};
      w.appendChild(b);v.appendChild(w);}
    return;
  }
  v.innerHTML='<p class="sectionsub">Loading…</p>';
  loadNodes().then(()=>{
    let n=null;
    if(type==='line'){
      const L=lineById(slug)||activeAvoidLines().find(a=>a.id===slug);
      if(L)n={id:'ovs:line/'+L.id,type:'line',label:(L.kind==='avoid'?'Avoid ':'')+L.label,reads:L.reads,line:L};
    } else n=findNode(type,slug);
    // a company whose boycott line exists in the registry gets the registry line (one truth for matching + Act)
    if(n&&n.type==='company'&&!n.line&&lineById('avoid:'+nodeSlug(n.id)))n=Object.assign({},n,{line:'avoid:'+nodeSlug(n.id)});
    if(!n&&type==='value'){const t=THEMES.find(x=>x.id===slug);if(t)n={id:'ovs:value/'+t.id,type:'value',label:t.label,reads:t.blurb};}
    const loadIssue=nodeLoadProblem();
    if(!n&&loadIssue&&type!=='line'&&type!=='value'){v.innerHTML=`<a class="back" href="#home">← home</a><h2 class="sectionh">Company and brand index unavailable</h2><p class="sectionsub">${esc(loadIssue)} Refresh to retry, or <a href="#map">browse categories →</a>.</p>`;return;}
    if(!n){v.innerHTML=`<a class="back" href="#home">← home</a><h2 class="sectionh">Not a page yet</h2><p class="sectionsub">We don’t have “${esc(slug)}” as a ${esc(NTYPE_LABEL[type]||type)} yet. It may arrive as the commons grows, or <a href="#contribute/want/${encodeURIComponent(slug)}">ask for it →</a></p>`;return;}
    const L=n.line&&(typeof n.line==='object'?n.line:lineById(n.line));
    // slot 1 — what this is + every parent it lives under
    let html=`<a class="back" href="#home">← home</a>
      <div class="ntype">${esc(NTYPE_LABEL[n.type]||n.type)}</div>
      <h2 class="sectionh" style="margin-top:.1rem">${esc(n.label)}</h2>
      ${n.reads?`<p class="sectionsub" style="margin-top:-.2rem">${esc(n.reads)}</p>`:''}`;
    const crumbs=[];
    if(n.ownedBy){const o=(NODES.nodes||[]).find(x=>x.id===n.ownedBy);if(o)crumbs.push(`<a class="facet" href="${nodeHash(o)}">owned by ${esc(o.label)}</a>`);}
    for(const cid of (n.categories||[]).slice(0,8)){const c=(CATALOG||[]).find(x=>x.id===cid);if(c)crumbs.push(`<a class="facet" href="#explore/${cid}">${esc(c.label)}</a>`);}
    if(crumbs.length)html+=`<div class="facets" style="margin:.2rem 0 .8rem">${crumbs.join('')}</div>`;
    v.innerHTML=html;
    // slot 2 — compared with this person's rules and priorities
    const lens=el('div',{});v.appendChild(lens);
    if(n.type==='brand'||n.type==='company'||n.type==='tag')nodeLensSection(n,lens);
    if(n.type==='errand'){
      const stops=(n.steps&&n.steps.length)?n.steps:(n.categories||[]).map(c=>({cat:c,pick:'one'}));
      const e2=el('div',{});e2.innerHTML=`<div class="dsh">The run</div><p class="alts-sub">${stops.length} stop${stops.length===1?'':'s'}, the runner that ends in a printable list arrives next; for now, each stop opens ranked for your values.</p>`+stops.map(s=>{const c=(CATALOG||[]).find(x=>x.id===s.cat);return c?`<a class="dcard" href="#explore/${s.cat}"><span class="dcard-n">${esc(c.label)}</span><span class="dcard-c">${esc(s.note||('pick '+(s.pick||'one')))}</span></a>`:'';}).join('');v.appendChild(e2);}
    if(n.type==='line'&&L&&L.kind==='avoid'){const e3=el('div',{});e3.innerHTML=`<div class="dsh">What it does</div><p class="alts-sub">Hides ${esc(L.label)} and the brands it owns from every ranking. This line currently knows <b>${(L.brands||[]).length}</b> brand name${(L.brands||[]).length===1?'':'s'}, coverage grows as the ownership map does.</p><div class="facets">${(L.brands||[]).slice(0,14).map(b=>`<span class="facet" style="cursor:default">${esc(b)}</span>`).join('')}</div>`;v.appendChild(e3);}
    // slot 3 — receipts
    const rec=[];
    if(n.source)rec.push(`<a href="${esc(n.source)}" target="_blank" rel="noopener">the company’s own brand list ↗${n.asof?' '+esc(n.asof):''}</a>`);
    if(n.receipt)rec.push(`<a href="${esc(n.receipt)}" target="_blank" rel="noopener">what this certification means ↗</a>`);
    if(L&&L.why)rec.push(`<a href="${esc(L.why)}" target="_blank" rel="noopener">why people hold this line ↗</a>`);
    if(rec.length){const r2=el('div',{});r2.innerHTML=`<div class="dsh">Receipts</div><div class="links">${rec.join('')}</div>`;v.appendChild(r2);}
    // slot 4 — connections
    const conn=[];
    if(n.type==='company'){
      for(const bid of (n.brands||[])){const b=(NODES.nodes||[]).find(x=>x.id===bid);if(b)conn.push(`<a class="dcard" href="${nodeHash(b)}"><span class="dcard-n">${esc(b.label)}</span><span class="dcard-c">its brand · ${b.items} item${b.items===1?'':'s'} here</span></a>`);}
      for(const bn of (n.brandNames||[]).slice(0,10)){if(!(NODES.nodes||[]).some(x=>x.type==='brand'&&x.label===bn))conn.push(`<span class="dcard" style="cursor:default"><span class="dcard-n">${esc(bn)}</span><span class="dcard-c">its brand · not on our shelves yet</span></span>`);}
    }
    if(n.type==='brand'&&n.ownedBy){const o=(NODES.nodes||[]).find(x=>x.id===n.ownedBy);if(o)conn.push(`<a class="dcard" href="${nodeHash(o)}"><span class="dcard-n">${esc(o.label)}</span><span class="dcard-c">owns this brand</span></a>`);}
    if(L&&(n.type==='company'||n.type==='brand'||n.type==='line')){/* the line is its own connection, rendered in Act */}
    if(conn.length){const c4=el('div',{});
      const blast=n.type==='company'?`<p class="alts-sub" style="margin-top:.35rem">We stock <b>${(n.brands||[]).length}</b> of the <b>${(n.brandNames||[]).length}</b> ${esc(n.label)} brands the ownership map knows, avoiding ${esc(n.label)} hides every one of them from your rankings. The map is young and still growing.</p>`:'';
      c4.innerHTML=`<div class="dsh">The family</div><div class="dgrid">${conn.join('')}</div>${blast}`;v.appendChild(c4);}
    // slot 5 — letters (v0: write in; publishing arrives with N3)
    const let5=el('div',{});let5.innerHTML=`<div class="dsh">Letters</div><p class="alts-sub">Something to say about this, a fact to fix, a story, a question? <a href="mailto:futurisminstitute@gmail.com?subject=${encodeURIComponent('[letter] '+n.id)}">Write in ${CC.icon('mail')}</a>, good letters get published here, with your consent.</p>`;v.appendChild(let5);
    // slot 6 — act
    const act=el('div',{});act.innerHTML='<div class="dsh">Act</div>';const acts=el('div',{style:'display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.3rem'});
    if(L&&L.kind==='avoid'){
      const on=isAvoiding(L);
      const b=el('button',{class:'savebtn'+(on?' on':'')},on?'⊘ Avoiding, tap to stop':'⊘ Avoid: hide it everywhere');
      b.onclick=()=>{if(isAvoiding(L)){YOU.avoid=(YOU.avoid||[]).filter(a=>(typeof a==='string'?a:(a&&a.id))!==L.id);}else{YOU.avoid=(YOU.avoid||[]).concat([L.id]);}saveYou();renderNode(arg);};
      acts.appendChild(b);
    } else if(n.type==='company'||n.type==='brand'){
      const b=el('button',{class:'savebtn'},'⊘ Avoid '+n.label+' everywhere');
      b.onclick=()=>{toggleAvoidBrand({brand:n.label});renderNode(arg);};
      acts.appendChild(b);
    }
    if(n.type==='tag'){
      const R=reqLineForLabel(n.label);
      if(R){const on=YOU.diet.includes(R.label);const b=el('button',{class:'savebtn'+(on?' on':'')},on?'✓ Requiring this, tap to stop':'Only show me this, where tracked');
        b.onclick=()=>{const i=YOU.diet.indexOf(R.label);i<0?YOU.diet.push(R.label):YOU.diet.splice(i,1);saveYou();renderNode(arg);};acts.appendChild(b);}
    }
    const corr=el('a',{class:'savebtn',href:'#contribute'},CC.icon('edit')+' Correct a fact');acts.appendChild(corr);
    act.appendChild(acts);v.appendChild(act);
  });
}
// ── ASK (codex.md §5) — the spine: one box that resolves a name, a barcode, a question-shaped phrase, or a
//    typo to the right page, honestly. Falls through to full search; a miss is a designed screen, never a zero. ──
const ASK_STOP=new Set(['is','are','the','a','an','best','good','bad','cheapest','most','more','should','i','my','me','for','to','of','in','on','near','ethical','okay','ok','what','which','how','buy','get','find']);
const ASK_SYN={'pop':'soda','soft drink':'soda','soft drinks':'soda','sneakers':'shoes','trainers':'shoes','cell phone':'phones','mobile phone':'phones','mobile':'phones','washing up liquid':'dish-soap','cereal':'breakfast-cereal','chocolate':'dark-chocolate','search engine':'digital-services'};
function askNorm(q){
  let s=String(q||'').toLowerCase();
  try{s=s.normalize('NFD').replace(/[̀-ͯ]/g,'');}catch(e){}
  s=s.replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
  const toks=s.split(' ').filter(t=>t&&!ASK_STOP.has(t)).map(t=>(t.length>3&&t.endsWith('s')&&!t.endsWith('ss'))?t.slice(0,-1):t);
  return toks.join(' ');
}
function _dist1(a,b){ // edit distance ≤ 1, transpositions count as one (nestel→nestle)
  if(a===b)return true; const la=a.length,lb=b.length; if(Math.abs(la-lb)>1)return false;
  if(la===lb){ // one substitution, or one adjacent swap
    let d=[];for(let x=0;x<la;x++)if(a[x]!==b[x])d.push(x);
    if(d.length===1)return true;
    if(d.length===2&&d[1]===d[0]+1&&a[d[0]]===b[d[1]]&&a[d[1]]===b[d[0]])return true;
    return false;
  }
  let i=0,j=0,edits=0;
  while(i<la&&j<lb){ if(a[i]===b[j]){i++;j++;continue;} if(++edits>1)return false; if(la>lb)i++; else j++; }
  return edits+(la-i)+(lb-j)<=1;
}
// whole-token containment with a prefix allowance (bank⊂banking) — substring matching invited "xylophone
// lessons"→phones; tokens don't.
function _tokEq(t1,t2){return t1===t2||(t1.length>=4&&t2.length>=4&&(t1.startsWith(t2)||t2.startsWith(t1)));}
function _tokContains(nqToks,kToks){return kToks.every(kt=>nqToks.some(nt=>_tokEq(nt,kt)))||nqToks.every(nt=>kToks.some(kt=>_tokEq(nt,kt)));}
const ASK_TYPE_PRIORITY={company:9,line:8,category:7,brand:6,tag:5,errand:4,guide:3,item:2};
function askTypeOf(id){
  id=String(id||'');
  if(id.indexOf('ovs:item/')===0)return 'item';
  if(id.indexOf('ovs:cat/')===0)return 'category';
  const m=id.match(/^ovs:([^/]+)\//);
  return m?m[1]:'unknown';
}
function askAddCandidate(candidates,id,score,reason,key){
  if(!id)return;
  const prior=candidates[id];
  if(!prior||score>prior.score)candidates[id]={id:id,score:score,reason:reason,key:key};
}
function askRow(hit,index){
  const t=index&&index.targets&&index.targets[hit.id];
  let type=(t&&t.type)||askTypeOf(hit.id),hash=(t&&t.hash)||idToHash(hit.id),label=(t&&t.label)||hit.id;
  if(!hash)return null;
  if(type==='item'){
    const m=String(hit.id||'').match(/^ovs:item\/([^/]+)\/(.+)$/);
    if(m){
      const cid=m[1],code=m[2],cat=(CATALOG||[]).find(c=>c.id===cid);
      const ds=window.CC_BUNDLE&&window.CC_BUNDLE.data&&window.CC_BUNDLE.data[cid];
      const p=ds&&((ds.products||ds.resources||[]).find(x=>String(x.code)===code));
      label=(p&&p.name)||(cat?cat.label+' entry':'Entry')+' '+code;
    }
  }
  if(!chDev()){
    if(type==='brand'||type==='company'||type==='errand')return null;
    if(type==='tag'){hash='#discover/label/'+encodeURIComponent(label);type='label';}
  }
  return {id:hit.id,hash:hash,label:label,type:NTYPE_LABEL[type]||type,score:hit.score,reason:hit.reason,key:hit.key};
}
function resolveAskIndexRows(q,index,limit,includePrefix){
  if(!index||index.failed)return [];
  const nq=askNorm(q); if(!nq)return [];
  const nqT=nq.split(' '),tokens=index.tokens||{},aliases=index.aliases||{},candidates={};
  if(aliases[nq])askAddCandidate(candidates,aliases[nq],120,'alias',nq);
  for(const id of (tokens[nq]||[]))askAddCandidate(candidates,id,110,'exact',nq);
  for(const token of nqT)for(const id of (tokens[token]||[]))askAddCandidate(candidates,id,95,'query-token',token);
  for(const key in tokens){
    const kt=key.split(' ').filter(Boolean); if(!kt.length)continue;
    let score=0,reason='';
    if(nqT.length===1&&kt.length===1&&_dist1(nqT[0],kt[0])){score=86;reason='fuzzy-1';}
    else if(_tokContains(nqT,kt)){score=76-Math.abs(nqT.length-kt.length);reason='token-containment';}
    else if(includePrefix&&key.indexOf(nq)===0){score=70;reason='prefix';}
    if(!score)continue;
    for(const id of tokens[key])askAddCandidate(candidates,id,score,reason,key);
  }
  const seen={};
  return Object.keys(candidates).map(id=>candidates[id]).sort((a,b)=>{
    if(b.score!==a.score)return b.score-a.score;
    const tp=(ASK_TYPE_PRIORITY[askTypeOf(b.id)]||0)-(ASK_TYPE_PRIORITY[askTypeOf(a.id)]||0);
    return tp||a.id.localeCompare(b.id);
  }).map(hit=>askRow(hit,index)).filter(Boolean).filter(row=>{if(seen[row.hash])return false;seen[row.hash]=1;return true;}).slice(0,limit||6);
}
function resolveAskCoreRows(q,limit,includePrefix){
  return resolveAskIndexRows(q,ASK_CORE,limit,includePrefix);
}
function resolveAskFullRows(q,limit,includePrefix){
  return resolveAskIndexRows(q,ASK_INDEX,limit,includePrefix).filter(row=>row.id.indexOf('ovs:item/')===0);
}
function askEntries(){
  const E=[];
  const add=(k,hash,label,type)=>{k=askNorm(k);if(k)E.push({k:k,hash:hash,label:label,type:type});};
  for(const c of (CATALOG||[])){add(c.label,'#explore/'+c.id,c.label,'category');add(c.id.replace(/-/g,' '),'#explore/'+c.id,c.label,'category');}
  for(const syn in ASK_SYN){const cid=ASK_SYN[syn];const c=(CATALOG||[]).find(x=>x.id===cid);if(c)add(syn,'#explore/'+cid,c.label,'category');}
  for(const g of (window.CC_GUIDES||[]))add(g.title,'#guide/'+g.slug,g.title,'guide');
  for(const l of lineRegistry()){
    add(l.label,'#n/line/'+encodeURIComponent(l.id),(l.kind==='avoid'?'Avoid ':'')+l.label,'line');
    if(l.kind==='avoid')for(const b of (l.brands||[]).slice(0,10))add(b,'#n/line/'+encodeURIComponent(l.id),'Avoid '+l.label,'line');
  }
  for(const n of ((NODES&&NODES.nodes)||[])){
    // public channel: brand/company/errand pages are workbench-only (generated prose, unreviewed);
    // tags route to the curated label slice instead of the tag node page. Dev sees everything.
    if(!chDev()&&(n.type==='brand'||n.type==='company'||n.type==='errand'))continue;
    if(!chDev()&&n.type==='tag'){const h='#discover/label/'+encodeURIComponent(n.label);add(n.label,h,n.label,'label');for(const a of (n.aliases||[]))add(a,h,n.label,'label');continue;}
    add(n.label,nodeHash(n),n.label,NTYPE_LABEL[n.type]||n.type);for(const a of (n.aliases||[]))add(a,nodeHash(n),n.label,NTYPE_LABEL[n.type]||n.type);
  }
  // the everyday-phrase synonyms (C4): "almond milk" → the category, "2fa app" → password managers
  for(const ph in ((NODES&&NODES.syn)||{})){
    const id=NODES.syn[ph], h=idToHash(id); if(!h)continue;
    const tn=NODES.byId&&NODES.byId[id];
    const cat=id.indexOf('ovs:cat/')===0&&(CATALOG||[]).find(c=>'ovs:cat/'+c.id===id);
    add(ph,h,(tn&&tn.label)||(cat&&cat.label)||ph,cat?'category':(tn?(NTYPE_LABEL[tn.type]||tn.type):'place'));
  }
  return E;
}
function resolveAskLegacy(q){
  return loadNodes().then(()=>{
    const nq=askNorm(q); if(!nq)return null;
    const E=askEntries(), seen={},uniq=h=>{if(seen[h.hash])return false;seen[h.hash]=1;return true;};
    let hits=E.filter(e=>e.k===nq).filter(uniq);
    if(hits.length===1)return {kind:'nav',hash:hits[0].hash};
    if(hits.length>1)return {kind:'multi',hits:hits.slice(0,6)};
    const nqT=nq.split(' ');
    if(nq.length>3){
      hits=E.filter(e=>{const kt=e.k.split(' ');return nqT.length===1&&kt.length===1&&_dist1(kt[0],nqT[0]);}).filter(uniq);
      if(hits.length===1)return {kind:'nav',hash:hits[0].hash};
      if(hits.length>1)return {kind:'multi',hits:hits.slice(0,6)};
    }
    hits=E.filter(e=>_tokContains(nqT,e.k.split(' '))).filter(uniq);
    if(hits.length===1)return {kind:'nav',hash:hits[0].hash};
    if(hits.length>=2&&hits.length<=6)return {kind:'multi',hits:hits};
    return null;
  });
}
function resolveAsk(q){
  q=String(q||'').trim();
  const digits=q.replace(/\D/g,'');
  if(digits.length>=6&&digits.length===q.replace(/\s/g,'').length){ // a barcode, typed or pasted
    return loadAskIndex().then(()=>{
      const hits=resolveAskFullRows(q,6,false);
      if(hits.length===1)return {kind:'nav',hash:hits[0].hash};
      if(hits.length>1)return {kind:'multi',hits:hits};
      return ensureBarcodes().then(idx=>idx[digits]?{kind:'nav',hash:'#item/'+encodeURIComponent(idx[digits])+'/'+encodeURIComponent(digits)}:null);
    }).catch(()=>ensureBarcodes().then(idx=>idx[digits]?{kind:'nav',hash:'#item/'+encodeURIComponent(idx[digits])+'/'+encodeURIComponent(digits)}:null));
  }
  return loadAskCore().then(()=>{
    const hits=resolveAskCoreRows(q,6,false);
    if(hits.length===1)return {kind:'nav',hash:hits[0].hash};
    if(hits.length>1)return {kind:'multi',hits:hits};
    return loadAskIndex().then(()=>{
      const fullHits=resolveAskFullRows(q,6,false);
      if(fullHits.length===1)return {kind:'nav',hash:fullHits[0].hash};
      if(fullHits.length>1)return {kind:'multi',hits:fullHits};
      return resolveAskLegacy(q);
    }).catch(()=>resolveAskLegacy(q));
  }).catch(()=>resolveAskLegacy(q));
}
let NODE_QA=null,NODE_QA_P=null;
function loadNodeQaContracts(){
  if(NODE_QA)return Promise.resolve(NODE_QA);
  if(NODE_QA_P)return NODE_QA_P;
  NODE_QA_P=Promise.all([
    fetchNodeJson('node-preview-matrix.json',false),
    fetchNodeJson('node-runtime-states.json',false),
    fetchNodeJson('node-integration-checklist.json',false),
    fetchNodeJson('node-route-fixtures.json',false),
    fetchNodeJson('node-route-guardrails.json',false),
    fetchNodeJson('ask-fixtures.json',false),
    fetchNodeJson('node-walkthroughs.json',false)
  ]).then(results=>{
    const byFile={};for(const r of results)byFile[r.file]=r;
    const failed=results.filter(r=>r.error).map(r=>r.file);
    NODE_QA={
      preview:byFile['node-preview-matrix.json'].data,
      runtime:byFile['node-runtime-states.json'].data,
      checklist:byFile['node-integration-checklist.json'].data,
      routes:byFile['node-route-fixtures.json'].data,
      routeGuardrails:byFile['node-route-guardrails.json'].data,
      askFixtures:byFile['ask-fixtures.json'].data,
      walkthroughs:byFile['node-walkthroughs.json'].data,
      failed:failed
    };
    return NODE_QA;
  });
  return NODE_QA_P;
}
function h4NodeRouteSelfCheck(routeCases,guardrails){
  const nodeCases=(routeCases||[]).filter(c=>c&&c.expect&&c.expect.route==='node');
  const ok=nodeCases.filter(c=>{
    const e=c.expect||{},type=e.type,id=String(e.id||'');
    if(type==='line')return !!lineById(id.replace(/^ovs:line\//,''));
    if(type==='value')return (THEMES||[]).some(t=>'ovs:value/'+t.id===id);
    return !!(NODES&&NODES.byId&&NODES.byId[id]);
  }).length;
  const canonical=(guardrails||[]).filter(c=>c&&c.kind==='canonicalize'&&c.expect&&c.expect.route==='node');
  const cok=canonical.filter(c=>{
    const e=c.expect||{},type=e.type,id=String(e.id||'');
    if(type==='line')return !!lineById(id.replace(/^ovs:line\//,''));
    return !!(NODES&&NODES.byId&&NODES.byId[id]);
  }).length;
  return {nodeTotal:nodeCases.length,nodeOk:ok,canonicalTotal:canonical.length,canonicalOk:cok};
}
function h4NodeRouteSelfCheckPassed(self){
  self=self||{};
  return !!self.nodeTotal&&self.nodeOk===self.nodeTotal&&self.canonicalOk===self.canonicalTotal;
}
function h4LoaderPlanSelfCheck(loader,loadedFiles,askCore){
  loader=loader||{};const stages=loader.stages||[],loaded=new Set(loadedFiles||[]);
  const runtime=stages.filter(s=>s&&s.runtime!==false),dev=stages.filter(s=>s&&s.runtime===false),totals=loader.totals||{};
  const stageOk=!!stages.length&&stages.every((s,i)=>s&&s.step===i+1&&s.id&&s.loadHint&&Array.isArray(s.files)&&s.files.length);
  const cacheOk=stages.every(s=>(s.files||[]).every(f=>f&&f.file&&(f.file==='manifest.json'?f.integrity==='self-unhashed':(!!f.sha256&&f.cacheKey===f.file+':'+f.sha256))));
  const eagerOk=['manifest.json','tags.json','errands.json','synonyms.json'].every(f=>loaded.has(f));
  const pageNodeOk=['brands.json','companies.json'].every(f=>loaded.has(f));
  const askCoreOk=askCore&&askCore.format==='ovs-ask-core-index';
  const lazyBoundaryOk=!loaded.has('ask-index.json')&&!loaded.has('sample.json');
  const totalsOk=totals.stages===stages.length&&totals.runtimeStages===runtime.length&&totals.devContractStages===dev.length;
  return {pass:stageOk&&cacheOk&&eagerOk&&pageNodeOk&&askCoreOk&&lazyBoundaryOk&&totalsOk,total:stages.length,stageOk:stageOk,cacheOk:cacheOk,eagerOk:eagerOk,pageNodeOk:pageNodeOk,askCoreOk:askCoreOk,lazyBoundaryOk:lazyBoundaryOk,totalsOk:totalsOk};
}
function h4AskCoreSelfCheck(qa){
  const cases=((qa.askFixtures&&qa.askFixtures.cases)||[]).filter(c=>c.layer==='core');
  const ok=cases.filter(c=>{
    const rows=resolveAskCoreRows(c.query,c.expectOneInTop||5,false);
    return rows.some(r=>(c.expectAny||[]).indexOf(r.id)>=0);
  }).length;
  return {coreTotal:cases.length,coreOk:ok};
}
function h4RunLazyAskSelfCheck(qa,box,evidenceItems){
  const cases=((qa.askFixtures&&qa.askFixtures.cases)||[]).filter(c=>c.layer==='full');
  box.textContent='Loading the lazy product/barcode index...';
  loadAskIndex().then(()=>{
    const ok=cases.filter(c=>{
      const rows=resolveAskFullRows(c.query,c.expectOneInTop||5,false);
      return rows.some(r=>(c.expectAny||[]).indexOf(r.id)>=0);
    }).length;
    box.innerHTML=`Lazy product Ask self-check: <b>${ok}/${cases.length}</b> full-index fixture target${cases.length===1?'':'s'} resolved. This loaded ask-index.json only after you asked for this check.`;
    if(cases.length&&ok===cases.length)h4MarkEvidence(evidenceItems,'lazy-product-ask','Lazy product Ask evidence recorded from the self-check.');
  }).catch(()=>{box.textContent='Lazy product Ask self-check could not load ask-index.json. Core Ask results still work.';});
}
function h4QaList(label,items){
  items=(items||[]).filter(Boolean);
  return items.length?`<p class="alts-sub" style="margin:.35rem 0 .15rem"><b>${esc(label)}:</b></p><ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
}
function h4ScenarioDetail(id,scenario,open){
  scenario=scenario||{};
  return `<details class="h4-scenario"${open?' open':''}><summary><code>${esc(id)}</code>${scenario.title?`: ${esc(scenario.title)}`:''}</summary>${h4QaList('Steps',scenario.steps)}${h4QaList('Acceptance',scenario.acceptanceCriteria)}${h4QaList('Must not',scenario.mustNot)}</details>`;
}
function h4RunGroupDetail(group,scenarioById){
  const ids=(group.scenarioIds||[]).filter(Boolean);
  return `<details class="h4-run-group"${group.step===1?' open':''}><summary>${group.step}. ${esc(group.group)} (${ids.length})</summary>${ids.map((id,i)=>h4ScenarioDetail(id,scenarioById[id],group.step===1&&i===0)).join('')}</details>`;
}
function h4PublicGateDetail(gate){
  gate=gate||{};
  return `<details class="h4-public-gate"${gate.step===1?' open':''}><summary>${gate.step}. ${esc(gate.label||gate.surfaceId||'Public gate')}</summary><p class="alts-sub" style="margin:.35rem 0 .15rem"><b>Surface:</b> ${esc(gate.surfaceId||'unknown')}${gate.voiceStatus?` · voice ${esc(gate.voiceStatus)}`:''}</p>${h4QaList('Evidence required',gate.evidenceRequired)}${h4QaList('Release when',gate.releaseWhen)}${h4QaList('Must not',gate.mustNot)}</details>`;
}
function h4DrainStepDetail(step){
  step=step||{};
  return `<details class="h4-drain-step"${step.step===1||step.id==='final-h4-drain-decision'?' open':''}><summary>${step.step}. ${esc(step.label||step.id||'H4 drain step')}</summary><p class="alts-sub" style="margin:.35rem 0 .15rem"><b>Contract:</b> ${esc(step.contractPointer||'unlisted')}</p>${h4QaList('App-owned evidence',step.appOwnedEvidence)}${h4QaList('Pass when',step.passWhen)}${h4QaList('Must not',step.mustNot)}</details>`;
}
function h4RuntimeCaseDetail(id,state){
  state=state||{};
  return `<details class="h4-runtime-case"><summary><code>${esc(id)}</code>${state.family?` · ${esc(state.family)}`:''}${state.stage?` · ${esc(state.stage)}`:''}</summary>${state.trigger?`<p class="alts-sub" style="margin:.35rem 0 .15rem"><b>Trigger:</b> ${esc(state.trigger)}</p>`:''}${h4QaList('Required behavior',state.requiredBehavior)}${h4QaList('Must not',state.mustNot)}</details>`;
}
function h4RuntimeModeDetail(mode,stateById){
  mode=mode||{};
  const ids=(mode.caseIds||[]).filter(Boolean);
  return `<details class="h4-runtime-mode"${mode.id==='startup-smoke'?' open':''}><summary>${esc(mode.id||'runtime-mode')} (${ids.length})</summary>${h4QaList('Pass when',mode.passWhen)}${h4QaList('Must not',mode.mustNot)}${ids.map(id=>h4RuntimeCaseDetail(id,stateById[id])).join('')}</details>`;
}
function h4LoaderStageDetail(stage){
  stage=stage||{};
  const files=(stage.files||[]).filter(Boolean);
  const size=Number.isFinite(stage.bytes)?`, ${stage.bytes} bytes`:'';
  return `<details class="h4-loader-stage"${stage.step===1?' open':''}><summary>${stage.step}. ${esc(stage.label||stage.id||'Loader stage')} (${files.length})</summary><p class="alts-sub" style="margin:.35rem 0 .15rem"><b>Load hint:</b> ${esc(stage.loadHint||'unlisted')}; runtime ${stage.runtime===false?'no':'yes'}${size}</p>${stage.trigger?`<p class="alts-sub" style="margin:.2rem 0"><b>Trigger:</b> ${esc(stage.trigger)}</p>`:''}${stage.failureMode?`<p class="alts-sub" style="margin:.2rem 0"><b>Failure mode:</b> ${esc(stage.failureMode)}</p>`:''}<ul>${files.map(f=>`<li><code>${esc(f.file||'unknown')}</code>: ${esc(f.type||'file')}, ${esc(f.loadHint||stage.loadHint||'unlisted')}${Number.isFinite(f.bytes)?`, ${f.bytes} bytes`:''}${f.cacheKey?`, cache ${esc(f.cacheKey)}`:''}${f.integrity?`, integrity ${esc(f.integrity)}`:''}</li>`).join('')}</ul></details>`;
}
function h4RouteCaseDetail(c,open){
  c=c||{};const e=c.expect||{};
  return `<details class="h4-route-case"${open?' open':''}><summary><code>${esc(c.hash||'')}</code>${c.label?`: ${esc(c.label)}`:''}</summary><p class="alts-sub" style="margin:.35rem 0 .15rem"><b>Expected route:</b> ${esc(e.route||'unknown')}${e.type?` / ${esc(e.type)}`:''}${e.id?` / ${esc(e.id)}`:''}</p>${c.source?`<p class="alts-sub" style="margin:.2rem 0"><b>Source:</b> ${esc(c.source)}</p>`:''}</details>`;
}
function h4RouteGuardrailDetail(c,open){
  c=c||{};const e=c.expect||{},hash=c.hash||'(empty hash)';
  return `<details class="h4-route-guardrail"${open?' open':''}><summary>${esc(c.kind||'guardrail')}: <code>${esc(hash)}</code></summary>${c.reason?`<p class="alts-sub" style="margin:.35rem 0 .15rem"><b>Reason:</b> ${esc(c.reason)}</p>`:''}<p class="alts-sub" style="margin:.2rem 0"><b>Expected:</b> parseable ${e.parseable?'yes':'no'}, target ${e.targetExists?'yes':'no'}${e.route?`, route ${esc(e.route)}`:''}${e.type?`, type ${esc(e.type)}`:''}${e.id?`, id ${esc(e.id)}`:''}${e.canonicalHash?`, canonical ${esc(e.canonicalHash)}`:''}</p></details>`;
}
function h4WalkthroughDetail(w,open){
  w=w||{};const expected=w.expected||{},pages=w.pages||{},company=pages.company||{},line=pages.line||{};
  const brands=(pages.brands||[]).slice(0,3);
  const expectedParts=[
    expected.company?`company ${expected.company}`:'',
    expected.line?`line ${expected.line}`:'',
    (expected.brands||[]).length?`${expected.brands.length} brand target${expected.brands.length===1?'':'s'}`:'',
    Number.isFinite(expected.minCompanyBrands)?`min company brands ${expected.minCompanyBrands}`:'',
    Number.isFinite(expected.minCategories)?`min categories ${expected.minCategories}`:''
  ].filter(Boolean);
  const askTop=(w.askTop||[]).slice(0,5).map(r=>`${r.label||r.id||'result'} (${r.type||'node'}; ${r.reason||'match'}; score ${r.score||0})`);
  const checks=Object.keys(w.checks||{}).map(k=>`${k}: ${w.checks[k]?'pass':'fail'}`);
  const companyLink=company.hash?`<a href="${esc(company.hash)}">${esc(company.label||company.id)}</a>`:esc(company.label||company.id||'not captured');
  const lineLink=line.hash?`<a href="${esc(line.hash)}">${esc(line.label||line.id)}</a>`:esc(line.label||line.id||'not captured');
  const brandLinks=brands.map(b=>b.hash?`<a href="${esc(b.hash)}">${esc(b.label||b.id)}</a>`:esc(b.label||b.id||'brand')).join(', ');
  return `<details class="h4-walkthrough"${open?' open':''}><summary>${esc(w.label||w.id||'Flagship walkthrough')}${w.query?`: "${esc(w.query)}"`:''}</summary>${w.purpose?`<p class="alts-sub" style="margin:.35rem 0 .15rem"><b>Purpose:</b> ${esc(w.purpose)}</p>`:''}<p class="alts-sub" style="margin:.2rem 0"><b>Expected pages:</b> company ${companyLink}; line ${lineLink}${brandLinks?`; brand samples ${brandLinks}`:''}</p>${h4QaList('Expected targets',expectedParts)}${h4QaList('Required line tokens',expected.requiredLineTokens)}${h4QaList('Ask top results',askTop)}${h4QaList('Generated checks',checks)}</details>`;
}
const H4_EVIDENCE_KEY='vc:h4-evidence:v1';
const H4_FINAL_EVIDENCE_ID='final-h4-drain-decision';
function h4ReadEvidence(){
  try{return JSON.parse(localStorage.getItem(H4_EVIDENCE_KEY)||'{}')||{};}catch(e){return {};}
}
function h4WriteEvidence(data){
  try{localStorage.setItem(H4_EVIDENCE_KEY,JSON.stringify(data||{}));}catch(e){}
}
function h4EvidenceItems(run,modes,gates,loaderStages,routeCases,guardrails,walkthroughs,drainSteps){
  const items=[
    {id:'startup-ask-core',label:'Startup Ask core fixtures walked'},
    {id:'lazy-product-ask',label:'Lazy product Ask check run after the button-gated load'},
    {id:'node-routes',label:`Node routes and guardrails walked (${(routeCases||[]).length} fixtures, ${(guardrails||[]).length} guardrails)`},
    {id:'loader-plan',label:`Loader plan stages checked (${(loaderStages||[]).length})`}
  ];
  for(const m of (modes||[]))items.push({id:'runtime:'+m.id,label:`Runtime mode reviewed: ${m.id} (${(m.caseIds||[]).length} cases)`});
  for(const g of (run||[]))items.push({id:'preview:'+g.group,label:`Preview group reviewed ${g.step}: ${g.group} (${(g.scenarioIds||[]).length} scenarios)`});
  for(const w of (walkthroughs||[]))items.push({id:'walkthrough:'+w.id,label:`Flagship walkthrough reviewed: ${w.label||w.id}${w.query?` (${w.query})`:''}`});
  for(const g of (gates||[]))items.push({id:'gate:'+(g.surfaceId||g.label),label:`Public gate reviewed: ${g.label||g.surfaceId}`});
  if((drainSteps||[]).some(s=>s&&s.id===H4_FINAL_EVIDENCE_ID))items.push({id:H4_FINAL_EVIDENCE_ID,label:'Final H4 drain decision recorded by app/design',final:true});
  return items;
}
function h4RuntimeContractSelfCheck(modes,stateById){
  modes=modes||[];stateById=stateById||{};
  const seen=new Set();let detailsOk=!!modes.length;
  for(const m of modes){
    const ids=(m&&m.caseIds)||[];
    if(!(m&&m.id&&m.owner==='app/design'&&ids.length&&(m.passWhen||[]).length&&(m.mustNot||[]).length))detailsOk=false;
    for(const id of ids){
      seen.add(id);
      const state=stateById[id]||{};
      if(!(state.id&&state.trigger&&(state.requiredBehavior||[]).length&&(state.mustNot||[]).length))detailsOk=false;
    }
  }
  const pass=detailsOk&&seen.size===Object.keys(stateById).length;
  return {pass:pass,summary:pass?`${modes.length} modes render ${seen.size} runtime cases for review.`:`Runtime contract is missing rendered mode or case details.`};
}
function h4PreviewContractSelfCheck(run,scenarioById){
  run=run||[];scenarioById=scenarioById||{};
  const seen=new Set();let detailsOk=!!run.length,duplicate=false;
  for(const group of run){
    const ids=(group&&group.scenarioIds)||[];
    if(!(group&&group.group&&group.step&&ids.length&&(group.passWhen||[]).length&&(group.mustNot||[]).length))detailsOk=false;
    for(const id of ids){
      if(seen.has(id))duplicate=true;seen.add(id);
      const s=scenarioById[id]||{};
      if(!(s.id&&s.title&&(s.steps||[]).length&&(s.acceptanceCriteria||[]).length&&(s.mustNot||[]).length))detailsOk=false;
    }
  }
  const last=run[run.length-1]||{},lastIds=last.scenarioIds||[];
  const pass=detailsOk&&!duplicate&&seen.size===Object.keys(scenarioById).length&&lastIds.indexOf('h4-drain-decision')>=0;
  return {pass:pass,summary:pass?`${run.length} groups render ${seen.size} preview scenarios, with h4-drain-decision last.`:`Preview contract is missing scenario details, unique coverage, or the last drain scenario.`};
}
function h4WalkthroughContractSelfCheck(walkthroughs){
  walkthroughs=walkthroughs||[];let detailsOk=!!walkthroughs.length;
  for(const w of walkthroughs){
    const expected=(w&&w.expected)||{},pages=(w&&w.pages)||{},checks=Object.keys((w&&w.checks)||{});
    if(!(w&&w.id&&w.query&&expected.company&&expected.line&&(expected.brands||[]).length&&pages.company&&pages.company.hash&&pages.line&&pages.line.hash&&(w.askTop||[]).length&&checks.length))detailsOk=false;
    for(const key of checks){if(w.checks[key]!==true)detailsOk=false;}
  }
  return {pass:detailsOk,summary:detailsOk?`${walkthroughs.length} flagship Ask-to-node walkthroughs render with passing generated checks.`:`Flagship walkthrough contract is missing expected pages, Ask results, or passing checks.`};
}
function h4PublicGateContractSelfCheck(gates){
  gates=gates||[];let detailsOk=!!gates.length;
  for(let i=0;i<gates.length;i++){
    const g=gates[i]||{};
    if(!(g.step===i+1&&g.surfaceId&&g.label&&g.voiceStatus&&(g.sourceFiles||[]).length&&(g.evidenceRequired||[]).length&&(g.releaseWhen||[]).length&&(g.mustNot||[]).length))detailsOk=false;
  }
  return {pass:detailsOk,summary:detailsOk?`${gates.length} public gates render in one-surface-at-a-time order.`:`Public gate contract is missing ordered surface evidence, release, or must-not details.`};
}
function h4ContractShortcut(label,status,buttonId){
  status=status||{};
  return `<p class="alts-sub" style="margin:.3rem 0"><b>${esc(label)}:</b> ${esc(status.summary||'Contract not checked.')} <button class="savebtn" id="${esc(buttonId)}" type="button"${status.pass?'':' disabled'}>Record ${esc(label.toLowerCase())}</button></p>`;
}
function h4EvidenceReady(items,data){
  const prereqs=(items||[]).filter(i=>i.id!==H4_FINAL_EVIDENCE_ID);
  return !!prereqs.length&&prereqs.every(i=>data&&data[i.id]);
}
function h4EvidenceStatus(items,data){
  const done=(items||[]).filter(i=>data&&data[i.id]).length,ready=h4EvidenceReady(items,data);
  if(data&&data[H4_FINAL_EVIDENCE_ID]&&ready)return 'All local checks are recorded. Copy the summary for final review.';
  if(ready)return 'The evidence walk is complete enough to record the final H4 decision.';
  return 'The final H4 decision stays locked until the preceding checks are recorded.';
}
function h4EvidenceTimestamp(value){
  if(!value)return '';
  const raw=(value&&value.at)||value,d=new Date(raw);
  return isNaN(d.getTime())?String(raw):d.toLocaleString();
}
function h4EvidenceContext(){
  const hash=(typeof location==='object'&&location.hash)||'#home';
  return {channel:chDev()?'dev/workbench':'public',hash:hash};
}
function h4EvidenceContextLines(ctx){
  ctx=ctx||h4EvidenceContext();
  return [`Channel: ${ctx.channel}`,`Hash: ${ctx.hash}`];
}
function h4EvidenceRecord(){
  const ctx=h4EvidenceContext();
  return {at:new Date().toISOString(),channel:ctx.channel,hash:ctx.hash};
}
function h4EvidenceStamp(value){
  if(!value)return '';
  const stamp=h4EvidenceTimestamp(value);
  if(value&&typeof value==='object'){
    const bits=[stamp];if(value.channel)bits.push(value.channel);if(value.hash)bits.push(value.hash);
    return bits.join(' | ');
  }
  return stamp;
}
function h4EvidenceMissing(items,data,includeFinal){
  return (items||[]).filter(i=>(includeFinal||i.id!==H4_FINAL_EVIDENCE_ID)&&!(data&&data[i.id])).map(i=>({id:i.id,label:i.label,final:!!i.final}));
}
function h4EvidenceMissingLine(items,data){
  const missing=h4EvidenceMissing(items,data,false);
  return `Missing before final: ${missing.length?missing.map(i=>i.id).join(', '):'none'}`;
}
function h4EvidenceSummary(items,data){
  data=data||{};const done=(items||[]).filter(i=>data[i.id]).length;
  return ['H4 evidence tracker',`Checked ${done}/${(items||[]).length}`].concat(h4EvidenceContextLines(),[h4EvidenceMissingLine(items,data),h4EvidenceStatus(items,data),`Exported ${new Date().toISOString()}`],(items||[]).map(i=>`[${data[i.id]?'x':' '}] ${i.label}${data[i.id]?` (${h4EvidenceStamp(data[i.id])})`:''}`)).join('\n');
}
function h4EvidenceReceipt(items,data){
  data=data||{};const done=(items||[]).filter(i=>data[i.id]).length;
  const records=(items||[]).map(i=>({id:i.id,label:i.label,final:!!i.final,checked:!!data[i.id],evidence:data[i.id]||null}));
  return {app:'Conscious Consuming',format:'h4-local-evidence-v1',exported:new Date().toISOString(),build:CC_BUILD,context:h4EvidenceContext(),status:h4EvidenceStatus(items,data),checked:done,total:(items||[]).length,readyForFinalDecision:h4EvidenceReady(items,data),finalRecorded:!!(data&&data[H4_FINAL_EVIDENCE_ID]),checkedIds:records.filter(r=>r.checked).map(r=>r.id),missingPrerequisites:h4EvidenceMissing(items,data,false),missing:h4EvidenceMissing(items,data,true),records:records};
}
function h4CopyEvidenceText(text){
  try{
    const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();
    const ok=document.execCommand('copy');ta.remove();return ok;
  }catch(e){return false;}
}
function h4DownloadEvidence(items){
  const day=new Date().toISOString().slice(0,10),payload=h4EvidenceReceipt(items,h4ReadEvidence());
  const b=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=el('a',{href:URL.createObjectURL(b),download:`h4-local-evidence-${day}.json`});a.click();
}
function h4EvidenceChecklist(items){
  let data=h4ReadEvidence();const ready=h4EvidenceReady(items,data);
  if(!ready&&data[H4_FINAL_EVIDENCE_ID]){delete data[H4_FINAL_EVIDENCE_ID];h4WriteEvidence(data);}
  const done=items.filter(i=>data[i.id]).length;
  return `<div id="h4evidence" class="h4-evidence" style="margin-top:.6rem"><p class="alts-sub" style="margin:.25rem 0"><b>Local evidence tracker:</b> <span id="h4evidencecount">${done}/${items.length}</span> checked in this browser. This records what was walked; it does not drain H4 by itself.</p><p class="alts-sub" id="h4evidencestatus" style="margin:.2rem 0">${esc(h4EvidenceStatus(items,data))}</p><div style="display:grid;gap:.25rem">${items.map(i=>`<label class="alts-sub" style="display:flex;gap:.45rem;align-items:flex-start;margin:0"><input type="checkbox" data-h4e="${esc(i.id)}"${data[i.id]?' checked':''}${i.final&&!ready?' disabled':''}> <span>${esc(i.label)} <span class="fc h4-evidence-stamp" data-h4estamp="${esc(i.id)}">${data[i.id]?`Recorded ${esc(h4EvidenceStamp(data[i.id]))}`:''}</span></span></label>`).join('')}</div><p class="alts-sub" style="margin:.45rem 0 0"><button class="savebtn" id="h4evidencecopy" type="button">Copy evidence summary</button> <button class="savebtn" id="h4evidencedownload" type="button">Download JSON receipt</button> <button class="savebtn" id="h4evidenceclear" type="button">Clear local checks</button> <span id="h4evidenceout">Stored only on this device.</span></p></div>`;
}
function h4UpdateEvidenceState(items){
  const data=h4ReadEvidence(),ready=h4EvidenceReady(items,data),el=document.getElementById('h4evidencecount'),status=document.getElementById('h4evidencestatus'),final=document.querySelector(`input[data-h4e="${H4_FINAL_EVIDENCE_ID}"]`);
  if(!ready&&data[H4_FINAL_EVIDENCE_ID]){delete data[H4_FINAL_EVIDENCE_ID];h4WriteEvidence(data);}
  if(el)el.textContent=`${items.filter(i=>data[i.id]).length}/${items.length}`;
  if(status)status.textContent=h4EvidenceStatus(items,data);
  document.querySelectorAll('[data-h4estamp]').forEach(stamp=>{const id=stamp.getAttribute('data-h4estamp'),value=data[id];stamp.textContent=value?'Recorded '+h4EvidenceStamp(value):'';});
  if(final){final.disabled=!ready;if(!ready)final.checked=false;}
}
function h4EvidenceInput(id){
  const inputs=document.querySelectorAll('input[data-h4e]');
  for(const input of inputs){if(input.getAttribute('data-h4e')===id)return input;}
  return null;
}
function h4MarkEvidence(items,id,message){
  if(!(items||[]).some(i=>i.id===id))return;
  const data=h4ReadEvidence();data[id]=h4EvidenceRecord();h4WriteEvidence(data);
  const input=h4EvidenceInput(id);if(input)input.checked=true;
  h4UpdateEvidenceState(items);
  const out=document.getElementById('h4evidenceout');if(out&&message)out.textContent=message;
}
function h4EvidenceIds(items,prefix){
  return (items||[]).filter(i=>String(i.id||'').indexOf(prefix)===0).map(i=>i.id);
}
function h4MarkEvidenceMany(items,ids,message){
  const allowed=new Set((items||[]).map(i=>i.id)),data=h4ReadEvidence(),record=h4EvidenceRecord();
  let count=0;
  for(const id of (ids||[])){
    if(id===H4_FINAL_EVIDENCE_ID||!allowed.has(id))continue;
    if(!data[id])count++;
    data[id]=record;
  }
  h4WriteEvidence(data);
  for(const id of (ids||[])){const input=h4EvidenceInput(id);if(input&&data[id])input.checked=true;}
  h4UpdateEvidenceState(items);
  const out=document.getElementById('h4evidenceout');if(out&&message)out.textContent=message.replace('{count}',String(count));
}
function h4BindEvidenceBulkButton(items,buttonId,ids,message,status){
  const btn=document.getElementById(buttonId);if(!btn)return;
  if(status&&!status.pass)return;
  btn.onclick=()=>h4MarkEvidenceMany(items,ids,message);
}
function h4BindEvidence(items){
  const root=document.getElementById('h4evidence');if(!root)return;
  const out=document.getElementById('h4evidenceout');
  root.onchange=e=>{
    const t=e.target;if(!t||!t.getAttribute||!t.hasAttribute('data-h4e'))return;
    const data=h4ReadEvidence(),id=t.getAttribute('data-h4e');
    if(id===H4_FINAL_EVIDENCE_ID&&!h4EvidenceReady(items,data)){t.checked=false;h4UpdateEvidenceState(items);if(out)out.textContent='Record the preceding evidence before the final decision.';return;}
    if(t.checked)data[id]=h4EvidenceRecord();else delete data[id];
    h4WriteEvidence(data);h4UpdateEvidenceState(items);if(out)out.textContent='Local check updated.';
  };
  const copy=document.getElementById('h4evidencecopy');
  if(copy)copy.onclick=()=>{
    const text=h4EvidenceSummary(items,h4ReadEvidence()),ok=!!(navigator.clipboard&&navigator.clipboard.writeText);
    if(ok)navigator.clipboard.writeText(text).then(()=>{if(out)out.textContent='Evidence summary copied.';}).catch(()=>{if(out)out.textContent=h4CopyEvidenceText(text)?'Evidence summary copied.':'Copy failed; select the checklist text manually.';});
    else if(out)out.textContent=h4CopyEvidenceText(text)?'Evidence summary copied.':'Copy failed; select the checklist text manually.';
  };
  const download=document.getElementById('h4evidencedownload');
  if(download)download.onclick=()=>{h4DownloadEvidence(items);if(out)out.textContent='Evidence receipt downloaded as JSON.';};
  const clear=document.getElementById('h4evidenceclear');
  if(clear)clear.onclick=()=>{h4WriteEvidence({});root.querySelectorAll('input[data-h4e]').forEach(i=>{i.checked=false;});h4UpdateEvidenceState(items);if(out)out.textContent='Local checks cleared.';};
  h4UpdateEvidenceState(items);
}
function initH4WorkbenchQA(){
  const box=document.getElementById('h4qa');if(!box)return;
  if(!chDev()){
    box.innerHTML='<p class="alts-sub" style="margin:.45rem 0 0">Turn on the workbench to open the company and search checklist.</p>';
    return;
  }
  box.innerHTML='<p class="alts-sub" style="margin:.45rem 0 0">Loading the company and search checklist...</p>';
  Promise.all([loadNodeQaContracts(),loadNodes(),loadAskCore()]).then(([qa,nodes,askCore])=>{
    if(qa.failed.length){
      box.innerHTML='<p class="alts-sub" style="margin:.45rem 0 0">The checklist could not load: '+esc(qa.failed.join(', '))+'. Category and guide pages still work.</p>';
      return;
    }
    const run=((qa.preview&&qa.preview.runContract)||{}).runOrder||[];
    const cov=((qa.preview&&qa.preview.runContract)||{}).coverage||{};
    const modes=(((qa.runtime&&qa.runtime.qaContract)||{}).modes||[]).filter(m=>m.owner==='app/design');
    const gates=((((qa.checklist&&qa.checklist.publicGates)||{}).releaseContract||{}).releaseOrder)||[];
    const drain=(qa.checklist&&qa.checklist.h4DrainContract)||{};
    const drainSteps=drain.steps||[];
    const loader=(NODES&&NODES.manifest&&NODES.manifest.loaderPlan)||{};
    const loaderStages=loader.stages||[];
    const loaderSelf=h4LoaderPlanSelfCheck(loader,(nodes&&nodes.loaded)||[],askCore);
    const routeCases=(qa.routes&&qa.routes.cases)||[];
    const guardrails=(qa.routeGuardrails&&qa.routeGuardrails.cases)||[];
    const guardKinds=(qa.routeGuardrails&&qa.routeGuardrails.totals&&qa.routeGuardrails.totals.byKind)||{};
    const walkthroughs=(qa.walkthroughs&&qa.walkthroughs.walkthroughs)||[];
    const scenarioById={};for(const s of ((qa.preview&&qa.preview.scenarios)||[])){if(s&&s.id)scenarioById[s.id]=s;}
    const stateById={};for(const s of ((qa.runtime&&qa.runtime.cases)||[])){if(s&&s.id)stateById[s.id]=s;}
    const runtimeContract=h4RuntimeContractSelfCheck(modes,stateById);
    const previewContract=h4PreviewContractSelfCheck(run,scenarioById);
    const walkthroughContract=h4WalkthroughContractSelfCheck(walkthroughs);
    const gateContract=h4PublicGateContractSelfCheck(gates);
    const smoke=routeCases.filter(c=>c.hash&&c.expect&&c.expect.route==='node').slice(0,6);
    const smokeLinks=smoke.length?`<div class="facets" style="margin-top:.45rem"><span class="facet" style="cursor:default">Route smoke links</span>${smoke.map(c=>`<a class="facet" href="${esc(c.hash)}">try ${esc(c.label||c.hash)}</a>`).join('')}</div>`:'';
    const self=h4NodeRouteSelfCheck(routeCases,guardrails);
    const selfLine=`<p class="alts-sub" style="margin:.45rem 0 0"><b>Route check:</b> ${self.nodeOk}/${self.nodeTotal} named pages resolve in the loaded index${self.canonicalTotal?`, and ${self.canonicalOk}/${self.canonicalTotal} malformed routes return to a valid page`:''}. This confirms the route, not the final review.</p>`;
    const askSelf=h4AskCoreSelfCheck(qa);
    const askLine=`<p class="alts-sub" style="margin:.45rem 0 0"><b>Start-page search:</b> ${askSelf.coreOk}/${askSelf.coreTotal} sample result${askSelf.coreTotal===1?'':'s'} resolve from the small search file. <button class="savebtn" id="h4asklazy" type="button">Check the larger product search</button> <span id="h4asklazyout">Not checked yet; the larger index loads only when this button is pressed.</span></p>`;
    const modeLine=modes.length?`<p class="alts-sub" style="margin:.45rem 0 0"><b>Runtime QA modes:</b> ${modes.map(m=>esc(m.id)+' '+((m.caseIds||[]).length)+' case'+((m.caseIds||[]).length===1?'':'s')).join(' · ')}.</p>`:'';
    const routeList=(routeCases.length||guardrails.length)?`<div class="h4-route-list" style="margin-top:.6rem"><p class="alts-sub" style="margin:.25rem 0"><b>Route contract checklist:</b> ${routeCases.length} positive fixture${routeCases.length===1?'':'s'} and ${guardrails.length} guardrail${guardrails.length===1?'':'s'} from route contracts.</p><details class="h4-route-group" open><summary>Positive fixtures (${routeCases.length})</summary>${routeCases.map((c,i)=>h4RouteCaseDetail(c,i===0)).join('')}</details><details class="h4-route-guardrail-group"><summary>Guardrails (${guardrails.length})</summary>${guardrails.map((c,i)=>h4RouteGuardrailDetail(c,i===0)).join('')}</details></div>`:'';
    const loaderList=loaderStages.length?`<div class="h4-loader-list" style="margin-top:.6rem"><p class="alts-sub" style="margin:.25rem 0"><b>Loader-plan checklist:</b> ${loaderStages.length} stages from manifest.loaderPlan. Cache key: <code>${esc((loader.integrity&&loader.integrity.cacheKey)||'<file>:<sha256>')}</code>.</p>${loaderStages.map(h4LoaderStageDetail).join('')}</div>`:'';
    const runtimeList=modes.length?`<div class="h4-runtime-list" style="margin-top:.6rem"><p class="alts-sub" style="margin:.25rem 0"><b>Runtime-state checklist:</b> ${Object.keys(stateById).length} cases from node-runtime-states.json.</p>${modes.map(m=>h4RuntimeModeDetail(m,stateById)).join('')}</div>`:'';
    const gateLine=gates.length?`<p class="alts-sub" style="margin:.45rem 0 0"><b>Public-gate order:</b> ${gates.map((g,i)=>(i+1)+'. '+esc(g.label||g.surfaceId||g)).join(' · ')}. Move one surface at a time.</p>`:'';
    const gateList=gates.length?`<div class="h4-gate-list" style="margin-top:.6rem"><p class="alts-sub" style="margin:.25rem 0"><b>Public-gate checklist:</b> ${gates.length} workbench surface${gates.length===1?'':'s'} from publicGates.releaseContract.</p>${gates.map(h4PublicGateDetail).join('')}</div>`:'';
    const scenarioList=run.length?`<div class="h4-run-list" style="margin-top:.6rem"><p class="alts-sub" style="margin:.25rem 0"><b>Preview scenario checklist:</b> ${run.reduce((n,g)=>n+((g.scenarioIds||[]).length),0)} scenarios from runContract.</p>${run.map(g=>h4RunGroupDetail(g,scenarioById)).join('')}</div>`:'';
    const walkthroughList=walkthroughs.length?`<div class="h4-walkthrough-list" style="margin-top:.6rem"><p class="alts-sub" style="margin:.25rem 0"><b>Flagship walkthrough checklist:</b> ${walkthroughs.length} Ask-to-node path${walkthroughs.length===1?'':'s'} from node-walkthroughs.json.</p>${walkthroughs.map((w,i)=>h4WalkthroughDetail(w,i===0)).join('')}</div>`:'';
    const drainList=drainSteps.length?`<div class="h4-drain-list" style="margin-top:.6rem"><p class="alts-sub" style="margin:.25rem 0"><b>Final review:</b> ${drainSteps.length} app-owned step${drainSteps.length===1?'':'s'}. A data file alone is <b>${drain.h4DrainableFromDataAlone?'enough':'not enough'}</b> to finish this check.</p>${drainSteps.map(h4DrainStepDetail).join('')}</div>`:'';
    const evidenceItems=h4EvidenceItems(run,modes,gates,loaderStages,routeCases,guardrails,walkthroughs,drainSteps);
    const evidenceShortcuts=`<div class="h4-evidence-shortcuts" style="margin-top:.6rem"><p class="alts-sub" style="margin:.25rem 0"><b>Evidence shortcuts:</b> use these only after walking the visible details above. They record review groups in this browser; they do not touch the lazy Ask check or the final H4 decision.</p>${h4ContractShortcut('Runtime modes',runtimeContract,'h4recordruntime')}${h4ContractShortcut('Preview groups',previewContract,'h4recordpreview')}${h4ContractShortcut('Flagship walkthroughs',walkthroughContract,'h4recordwalkthroughs')}${h4ContractShortcut('Public gates',gateContract,'h4recordgates')}</div>`;
    const evidenceList=h4EvidenceChecklist(evidenceItems);
    const rows=run.map(g=>`<span class="facet" style="cursor:default">${g.step}. ${esc(g.group)} <span class="fc">${(g.scenarioIds||[]).length}</span></span>`).join('');
    box.innerHTML=`<details class="h4-full-checklist" style="margin-top:.55rem"><summary>Open the full technical checklist</summary><div class="facets" style="margin-top:.55rem">${rows}</div>
      ${smokeLinks}
      ${selfLine}
      ${routeList}
      ${askLine}
      ${modeLine}
      ${loaderList}
      ${runtimeList}
      ${gateLine}
      ${gateList}
      ${scenarioList}
      ${walkthroughList}
      ${drainList}
      ${evidenceShortcuts}
      ${evidenceList}
      <p class="alts-sub" style="margin:.55rem 0 0">Checklist loaded: ${(cov.scenarioCount||run.reduce((n,g)=>n+(g.scenarioIds||[]).length,0))} scenarios, ${modes.length} browser modes, ${gates.length} public checks, ${walkthroughs.length} full walkthroughs, ${routeCases.length} named routes, and ${guardrails.length} failure cases. Failure cases cover malformed, unsupported, unknown-target, and corrected routes: ${Object.keys(guardKinds).map(k=>esc(k)+' '+guardKinds[k]).join(', ')}. The final decision comes only after search, routes, browser states, and full walkthroughs have recorded evidence.</p></details>`;
    const lazy=document.getElementById('h4asklazy'),out=document.getElementById('h4asklazyout');
    if(lazy&&out)lazy.onclick=()=>{lazy.disabled=true;h4RunLazyAskSelfCheck(qa,out,evidenceItems);};
    h4BindEvidence(evidenceItems);
    h4BindEvidenceBulkButton(evidenceItems,'h4recordruntime',h4EvidenceIds(evidenceItems,'runtime:'),'Runtime-mode review evidence recorded ({count} updated).',runtimeContract);
    h4BindEvidenceBulkButton(evidenceItems,'h4recordpreview',h4EvidenceIds(evidenceItems,'preview:'),'Preview-group review evidence recorded ({count} updated).',previewContract);
    h4BindEvidenceBulkButton(evidenceItems,'h4recordwalkthroughs',h4EvidenceIds(evidenceItems,'walkthrough:'),'Flagship walkthrough review evidence recorded ({count} updated).',walkthroughContract);
    h4BindEvidenceBulkButton(evidenceItems,'h4recordgates',h4EvidenceIds(evidenceItems,'gate:'),'Public-gate review evidence recorded ({count} updated).',gateContract);
    if(askSelf.coreTotal&&askSelf.coreOk===askSelf.coreTotal)h4MarkEvidence(evidenceItems,'startup-ask-core','Startup Ask evidence recorded from the self-check.');
    if(h4NodeRouteSelfCheckPassed(self))h4MarkEvidence(evidenceItems,'node-routes','Node route evidence recorded from the route self-check.');
    if(loaderSelf.pass)h4MarkEvidence(evidenceItems,'loader-plan','Loader-plan evidence recorded from the manifest loader-plan self-check.');
  }).catch(()=>{box.innerHTML='<p class="alts-sub" style="margin:.45rem 0 0">The company and search checklist could not load. Category and guide pages still work.</p>';});
}
const H10_EVIDENCE_KEY='cc:h10-local-evidence-v1';
function h10Contract(){
  return (window.CC_BUNDLE&&window.CC_BUNDLE.index&&window.CC_BUNDLE.index.provenanceDisplayContract)||null;
}
function h10ScenarioById(contract){
  const by={};for(const s of ((((contract||{}).reviewMatrix||{}).scenarios)||[])){if(s&&s.id)by[s.id]=s;}
  return by;
}
function h10ScenarioIds(contract){
  return ((((contract||{}).reviewMatrix||{}).scenarios)||[]).map(s=>s&&s.id).filter(Boolean);
}
function h10FinalEvidenceId(contract){
  return (((((contract||{}).reviewKit||{}).evidenceTracker||{}).finalDecisionLock||{}).itemId)||'h10-evidence-final-h10-drain-decision';
}
function h10EvidenceItems(contract){
  const tracker=(((contract||{}).reviewKit||{}).evidenceTracker)||{},finalId=h10FinalEvidenceId(contract);
  return (tracker.items||[]).map(i=>Object.assign({},i,{final:i.id===finalId||i.recordMode==='locked-final-decision'}));
}
function h10ReadEvidence(){
  try{
    const j=JSON.parse(localStorage.getItem(H10_EVIDENCE_KEY)||'{}')||{};
    return {steps:j.steps||{},scenarios:j.scenarios||{}};
  }catch(e){return {steps:{},scenarios:{}};}
}
function h10WriteEvidence(data){
  try{localStorage.setItem(H10_EVIDENCE_KEY,JSON.stringify({steps:(data&&data.steps)||{},scenarios:(data&&data.scenarios)||{}}));}catch(e){}
}
function h10EvidenceContext(){
  return {channel:chDev()?'dev/workbench':'public',hash:(typeof location==='object'&&location.hash)||'#home',build:CC_BUILD||''};
}
function h10EvidenceRecord(){
  const ctx=h10EvidenceContext();
  return {at:new Date().toISOString(),channel:ctx.channel,hash:ctx.hash,build:ctx.build};
}
function h10EvidenceStamp(value){
  if(!value)return '';
  const raw=(value&&value.at)||value,d=new Date(raw),stamp=isNaN(d.getTime())?String(raw):d.toLocaleString();
  if(value&&typeof value==='object'){
    const bits=[stamp];if(value.channel)bits.push(value.channel);if(value.hash)bits.push(value.hash);
    return bits.join(' | ');
  }
  return stamp;
}
function h10EvidenceBuildFresh(value,currentBuild){
  if(!value)return true;
  currentBuild=currentBuild==null?h10EvidenceContext().build:currentBuild;
  if(!currentBuild)return true;
  return !!(value&&typeof value==='object'&&value.build===currentBuild);
}
function h10EvidenceStampWithFreshness(value){
  if(!value)return '';
  const stamp=h10EvidenceStamp(value);
  return h10EvidenceBuildFresh(value)?stamp:`${stamp} | stale for current build`;
}
function h10StaleEvidenceIds(contract,items,data){
  data=data||h10ReadEvidence();
  const currentBuild=h10EvidenceContext().build||'',steps=(items||[]).filter(i=>data.steps&&data.steps[i.id]&&!h10EvidenceBuildFresh(data.steps[i.id],currentBuild)).map(i=>i.id);
  const scenarios=h10ScenarioIds(contract).filter(id=>data.scenarios&&data.scenarios[id]&&!h10EvidenceBuildFresh(data.scenarios[id],currentBuild));
  return {currentBuild:currentBuild,steps:steps,scenarios:scenarios,count:steps.length+scenarios.length};
}
function h10ClearStaleEvidence(contract,items){
  const data=h10ReadEvidence(),stale=h10StaleEvidenceIds(contract,items,data);
  for(const id of stale.steps)delete data.steps[id];
  for(const id of stale.scenarios)delete data.scenarios[id];
  h10WriteEvidence(data);
  return stale;
}
function h10LockedUntil(contract,items){
  const lock=(((((contract||{}).reviewKit||{}).evidenceTracker||{}).finalDecisionLock)||{}).lockedUntil;
  return (lock&&lock.length)?lock:(items||[]).filter(i=>!i.final).map(i=>i.id);
}
function h10MissingStepIds(contract,items,data,includeFinal){
  data=data||h10ReadEvidence();const finalId=h10FinalEvidenceId(contract);
  return (items||[]).filter(i=>(includeFinal||i.id!==finalId)&&(!(data.steps&&data.steps[i.id])||!h10EvidenceBuildFresh(data.steps[i.id]))).map(i=>i.id);
}
function h10MissingScenarioIds(contract,data){
  data=data||h10ReadEvidence();
  return h10ScenarioIds(contract).filter(id=>!(data.scenarios&&data.scenarios[id])||!h10EvidenceBuildFresh(data.scenarios[id]));
}
function h10EvidenceReady(contract,items,data){
  data=data||h10ReadEvidence();
  const steps=h10LockedUntil(contract,items),scenarios=h10ScenarioIds(contract);
  return !!steps.length&&steps.every(id=>data.steps&&data.steps[id]&&h10EvidenceBuildFresh(data.steps[id]))&&!!scenarios.length&&scenarios.every(id=>data.scenarios&&data.scenarios[id]&&h10EvidenceBuildFresh(data.scenarios[id]));
}
function h10EvidenceStatus(contract,items,data){
  data=data||h10ReadEvidence();const finalId=h10FinalEvidenceId(contract),ready=h10EvidenceReady(contract,items,data),stale=h10StaleEvidenceIds(contract,items,data);
  if(stale.count)return `${stale.count} local H10 row${stale.count===1?' is':'s are'} stale for the current build (${stale.currentBuild||'unavailable'}). Refresh or clear stale rows before the final H10 decision.`;
  if(data.steps&&data.steps[finalId]&&ready)return 'All local H10 checks are recorded. Copy or download for app/design review; this still does not drain H10 by itself.';
  if(ready)return 'Ready for app/design final decision. H10 moves only in docs/CONTENT-HANDOFF.md.';
  return 'The final H10 decision stays locked until every surface check and scenario row is recorded.';
}
function h10ScenarioLabel(s){
  const t=(s&&s.target)||{},e=(s&&s.expected)||{};
  return `${s&&s.id?s.id:'scenario'}${t.name?` - ${t.name}`:''}${e.chip?` (${e.chip})`:''}`;
}
function h10ScenarioRoutes(s){
  const t=(s&&s.target)||{},routes=t.routes?Object.values(t.routes):[];
  return [...new Set([s&&s.route].concat(routes||[]).filter(Boolean))];
}
function h10EvidenceItemForScenario(items,scenarioId){
  return (items||[]).find(i=>!i.final&&((i.scenarioIds||[]).indexOf(scenarioId)>=0||(i.receiptRows||[]).indexOf(scenarioId)>=0))||null;
}
function h10RecordScenarioEvidence(contract,items,scenarioId){
  const data=h10ReadEvidence(),record=h10EvidenceRecord(),item=h10EvidenceItemForScenario(items,scenarioId);
  data.scenarios[scenarioId]=record;
  let stepRecorded=false;
  if(item){
    const ids=(item.scenarioIds||item.receiptRows||[]).filter(Boolean);
    if(ids.length&&ids.every(id=>data.scenarios&&data.scenarios[id]&&h10EvidenceBuildFresh(data.scenarios[id]))){
      if(!(data.steps&&data.steps[item.id]&&h10EvidenceBuildFresh(data.steps[item.id]))){
        data.steps[item.id]=record;
        stepRecorded=true;
      }
    }
  }
  h10WriteEvidence(data);
  return {item:item,stepRecorded:stepRecorded};
}
function h10RecordStepEvidence(contract,items,itemId){
  const data=h10ReadEvidence(),item=(items||[]).find(i=>i.id===itemId),finalId=h10FinalEvidenceId(contract);
  if(!item)return {ok:false,reason:'Unknown H10 evidence step.'};
  if(item.id===finalId&&!h10EvidenceReady(contract,items,data))return {ok:false,item:item,reason:'Record every prerequisite and scenario row before the final H10 decision.'};
  const ids=(item.scenarioIds||item.receiptRows||[]).filter(Boolean),missing=ids.filter(id=>!(data.scenarios&&data.scenarios[id]));
  const stale=ids.filter(id=>data.scenarios&&data.scenarios[id]&&!h10EvidenceBuildFresh(data.scenarios[id]));
  if(ids.length&&(missing.length||stale.length))return {ok:false,item:item,reason:'Record the linked scenario rows for this build first: '+missing.concat(stale).join(', ')};
  data.steps[item.id]=h10EvidenceRecord();
  h10WriteEvidence(data);
  return {ok:true,item:item,final:item.id===finalId};
}
function h10RouteWalkerHTML(contract,items,data){
  data=data||h10ReadEvidence();
  const scenarios=((((contract||{}).reviewMatrix||{}).scenarios)||[]);
  const rows=scenarios.map(s=>{
    const e=s.expected||{},t=s.target||{},item=h10EvidenceItemForScenario(items,s.id),ids=item?((item.scenarioIds||item.receiptRows||[]).filter(Boolean)):[],done=ids.filter(id=>data.scenarios&&data.scenarios[id]).length,routes=h10ScenarioRoutes(s);
    const record=data.scenarios&&data.scenarios[s.id],fresh=record&&h10EvidenceBuildFresh(record),freshDone=ids.filter(id=>data.scenarios&&data.scenarios[id]&&h10EvidenceBuildFresh(data.scenarios[id])).length;
    const status=record?(fresh?`Recorded ${h10EvidenceStamp(record)}`:`Stale ${h10EvidenceStampWithFreshness(record)}`):'Open a route, check the visible surface, then record this row.';
    const stepRecord=item&&(data.steps&&data.steps[item.id]),stepFresh=stepRecord&&h10EvidenceBuildFresh(stepRecord);
    const step=item?(stepRecord?(stepFresh?`Surface step recorded: ${item.label||item.id}`:`Surface step stale for current build: ${item.label||item.id}`):`Surface step ${freshDone}/${ids.length} current-build rows recorded${ids.length&&freshDone===ids.length?' - ready to record':''}`):'No linked surface step';
    return `<div class="h10-walk-row">
      <div class="h10-walk-main"><b><code>${esc(s.id||'scenario')}</code>${t.name?`: ${esc(t.name)}`:''}</b>
        <span class="fc">${esc(s.surface||'surface')} - expected ${esc(e.chip||e.default||'Trust Lens behavior')} / ${esc(e.confidenceMode||e.keepRule||'not applicable')}</span>
        ${routes.length?`<div class="facets h10-walk-routes">${routes.map(r=>`<a class="facet" href="${esc(r)}">${esc(r)}</a>`).join('')}</div>`:''}
        <span class="fc">${esc(step)}</span>
      </div>
      <div class="h10-walk-act"><button class="savebtn" type="button" data-h10recordscenario="${esc(s.id||'')}">${record?(fresh?'Refresh row evidence':'Refresh stale row'):'Record row observed'}</button><span class="fc" data-h10walkstamp="${esc(s.id||'')}">${esc(status)}</span></div>
    </div>`;
  }).join('');
  return `<details class="h10-checks" open><summary>Route walker (${scenarios.length})</summary>
    <p class="alts-sub" style="margin:.35rem 0">Walk the real fixture routes, then record each row. A surface step records only after all scenario rows linked to that step have been recorded. This is a manual local observation, not generated-data auto evidence.</p>
    <div class="h10-walk">${rows}</div>
  </details>`;
}
function h10ReviewQueueHTML(contract,items,data){
  data=data||h10ReadEvidence();
  const finalId=h10FinalEvidenceId(contract),finalDone=!!(data.steps&&data.steps[finalId]&&h10EvidenceBuildFresh(data.steps[finalId])),ready=h10EvidenceReady(contract,items,data),scenarios=((((contract||{}).reviewMatrix||{}).scenarios)||[]),scenarioById=h10ScenarioById(contract),stale=h10StaleEvidenceIds(contract,items,data);
  const stepDone=(items||[]).filter(i=>data.steps&&data.steps[i.id]&&h10EvidenceBuildFresh(data.steps[i.id])).length,scenarioDone=scenarios.filter(s=>data.scenarios&&data.scenarios[s.id]&&h10EvidenceBuildFresh(data.scenarios[s.id])).length;
  let title='H10 review queue',body='Everything local is recorded. Copy or download the receipt for app/design review.',actions='',meta='';
  const contractStep=(items||[]).find(i=>i.stepId==='load-generated-contract'||i.id==='h10-evidence-load-generated-contract');
  if(stale.count){
    title='Next: refresh stale H10 evidence';
    body='Some local rows were recorded against an older app build. Refresh the named routes or clear stale rows before recording the final decision.';
    actions='<button class="savebtn" type="button" data-h10clearstale="1">Clear stale rows</button>';
    meta=`Stale rows: ${stale.steps.concat(stale.scenarios).join(', ')}`;
  }else if(contractStep&&!(data.steps&&data.steps[contractStep.id]&&h10EvidenceBuildFresh(data.steps[contractStep.id]))){
    title='Next: confirm the generated H10 contract is loaded';
    body='The workbench can read render rules, review scenarios, the Trust Lens rule, and receipt contracts. Record this only after you see the H10 panel render in the running app.';
    actions=`<button class="savebtn" type="button" data-h10recordstep="${esc(contractStep.id)}">Record contract loaded</button>`;
    meta='Manual local observation; not generated-data auto evidence.';
  }else{
    let nextScenario=null,nextItem=null;
    for(const item of (items||[]).filter(i=>!i.final).sort((a,b)=>(a.order||0)-(b.order||0))){
      const ids=(item.scenarioIds||item.receiptRows||[]).filter(Boolean);
      const missing=ids.find(id=>!(data.scenarios&&data.scenarios[id]&&h10EvidenceBuildFresh(data.scenarios[id])));
      if(missing){nextScenario=scenarioById[missing]||{id:missing};nextItem=item;break;}
      if(!ids.length&&!(data.steps&&data.steps[item.id]&&h10EvidenceBuildFresh(data.steps[item.id]))){nextItem=item;break;}
    }
    if(nextScenario){
      const e=nextScenario.expected||{},routes=h10ScenarioRoutes(nextScenario),label=nextItem&&(nextItem.label||nextItem.id);
      title='Next: walk '+(nextScenario.id||'scenario');
      body=`Open the fixture route, check ${nextScenario.surface||'the surface'} against ${e.chip||e.default||'Trust Lens behavior'} / ${e.confidenceMode||e.keepRule||'not applicable'}, then record the row.`;
      actions=(routes.length?routes.map(r=>`<a class="facet" href="${esc(r)}">${esc(r)}</a>`).join(''):'')+` <button class="savebtn" type="button" data-h10recordscenario="${esc(nextScenario.id||'')}">Record next row observed</button>`;
      meta=label?'Linked step: '+label:'Linked step unavailable.';
    }else if(nextItem&&!(data.steps&&data.steps[nextItem.id])){
      title='Next: record '+(nextItem.label||nextItem.id);
      body='All linked scenario rows for this evidence step are recorded. Record the step only after reviewing the visible running-app surface.';
      actions=`<button class="savebtn" type="button" data-h10recordstep="${esc(nextItem.id)}">Record evidence step</button>`;
      meta='Manual local observation; still not an H10 drain.';
    }else if(ready&&!finalDone){
      title='Next: record the final local H10 decision';
      body='Every prerequisite and scenario row is recorded. This creates a local ready-for-review receipt, but H10 still moves only through docs/CONTENT-HANDOFF.md.';
      actions=`<button class="savebtn" type="button" data-h10recordstep="${esc(finalId)}">Record final local decision</button>`;
      meta='Final local evidence, not automatic handoff movement.';
    }else if(finalDone&&ready){
      title='Local H10 receipt is ready for app/design review';
      body='Copy or download the local receipt and transcript. The handoff file still owns whether H10 moves to drained.';
      meta='All local rows and the final local decision are recorded.';
    }
  }
  return `<div class="h10-queue"><div><b>${esc(title)}</b><p class="alts-sub" style="margin:.25rem 0">${esc(body)}</p><p class="fc" style="margin:.15rem 0">${esc(meta)} Steps ${stepDone}/${(items||[]).length}; scenario rows ${scenarioDone}/${scenarios.length}.</p></div>${actions?`<div class="h10-queue-actions">${actions}</div>`:''}</div>`;
}
function h10EvidenceSummary(contract,items,data){
  data=data||h10ReadEvidence();
  const stepDone=(items||[]).filter(i=>data.steps&&data.steps[i.id]&&h10EvidenceBuildFresh(data.steps[i.id])).length,scenarioIds=h10ScenarioIds(contract),scenarioDone=scenarioIds.filter(id=>data.scenarios&&data.scenarios[id]&&h10EvidenceBuildFresh(data.scenarios[id])).length;
  const ctx=h10EvidenceContext(),missingSteps=h10MissingStepIds(contract,items,data,false),missingScenarios=h10MissingScenarioIds(contract,data),stale=h10StaleEvidenceIds(contract,items,data);
  const result=h10ValidateReceipt(contract,h10EvidenceReceipt(contract,items,data));
  return ['H10 local evidence tracker',`Steps checked for current build ${stepDone}/${(items||[]).length}`,`Scenario rows checked for current build ${scenarioDone}/${scenarioIds.length}`,`Channel: ${ctx.channel}`,`Hash: ${ctx.hash}`,`Build: ${ctx.build}`,`Missing or stale prerequisite ids: ${missingSteps.length?missingSteps.join(', '):'none'}`,`Missing or stale scenario ids: ${missingScenarios.length?missingScenarios.join(', '):'none'}`,`Stale step ids: ${stale.steps.length?stale.steps.join(', '):'none'}`,`Stale scenario ids: ${stale.scenarios.length?stale.scenarios.join(', '):'none'}`,`Validator valid: ${result.valid?'yes':'no'}`,`Validator finalStatus: ${result.finalStatus}`,`Ready to drain: ${result.readyToDrain?'yes, pending app/design handoff':'no'}`,h10EvidenceStatus(contract,items,data),'Local H10 evidence only; final drain belongs to app/design.',`Exported ${new Date().toISOString()}`].concat((items||[]).map(i=>{const r=data.steps&&data.steps[i.id],mark=r?(h10EvidenceBuildFresh(r)?'x':'!'):' ';return `[${mark}] ${i.label||i.id}${r?` (${h10EvidenceStampWithFreshness(r)})`:''}`;})).join('\n');
}
function h10ReceiptTemplate(contract){
  const t=(((contract||{}).drainContract||{}).receiptTemplate)||{};
  return t&&t.schema?t:null;
}
function h10ScenarioObservation(row,record){
  if(!record)return {observedChip:null,observedConfidenceMode:null,passed:null,notes:'',recordedAt:null};
  if(!h10EvidenceBuildFresh(record))return {observedChip:null,observedConfidenceMode:null,passed:null,notes:`Stale local observation from ${record.build||'unknown build'}; refresh this scenario for ${h10EvidenceContext().build||'the current build'}.`,recordedAt:record.at||new Date().toISOString()};
  const chip=row.expectedChip||'Trust Lens behavior observed as generated';
  const mode=row.expectedConfidenceMode||'not applicable';
  return {
    observedChip:chip,
    observedConfidenceMode:mode,
    passed:true,
    notes:'Observed in the running app against the generated H10 review row.',
    recordedAt:record.at||new Date().toISOString()
  };
}
function h10StepObservation(row,item,record,finalReady){
  if(!record)return {passed:null,notes:'',recordedAt:null};
  if(!h10EvidenceBuildFresh(record))return {passed:null,notes:`Stale local evidence from ${record.build||'unknown build'}; refresh this step for ${h10EvidenceContext().build||'the current build'}.`,recordedAt:record.at||new Date().toISOString()};
  const isFinal=(row.stepId==='final-h10-drain-decision')||(item&&item.final);
  return {
    passed:true,
    notes:isFinal?(finalReady?'Final local H10 decision recorded for app/design review; handoff still moves explicitly.':'Final decision was recorded locally but prerequisites were not complete.'):'Observed in the running app against the generated H10 evidence step.',
    recordedAt:record.at||new Date().toISOString()
  };
}
function h10ItemForStep(items,stepId){
  return (items||[]).find(i=>(i.stepId||i.id)===stepId)||null;
}
function h10EvidenceReceipt(contract,items,data){
  data=data||h10ReadEvidence();const template=h10ReceiptTemplate(contract),ctx=h10EvidenceContext(),ready=h10EvidenceReady(contract,items,data),finalId=h10FinalEvidenceId(contract),finalRecord=data.steps&&data.steps[finalId];
  const scenarioRows=(template&&template.scenarioResults)||((((contract||{}).reviewMatrix||{}).scenarios)||[]).map(s=>({
    scenarioId:s.id,surface:s.surface,route:s.route,category:(s.target&&s.target.category)||'',code:(s.target&&s.target.code)||null,
    expectedChip:(s.expected&&s.expected.chip)||null,expectedConfidenceMode:(s.expected&&s.expected.confidenceMode)||null,expectedDefaultVisibility:(s.expected&&s.expected.defaultVisibility)||null,
    observedChip:null,observedConfidenceMode:null,passed:null,notes:'',recordedAt:null,mustShow:s.mustShow||[],mustNot:s.mustNot||[]
  }));
  const stepRows=(template&&template.stepResults)||(items||[]).map((i,n)=>({step:n+1,stepId:i.stepId||i.id,label:i.label||i.id,scenarioIds:i.scenarioIds||[],passed:null,notes:'',recordedAt:null}));
  const scenarioResults=scenarioRows.map(row=>Object.assign({},row,h10ScenarioObservation(row,data.scenarios&&data.scenarios[row.scenarioId])));
  const stepResults=stepRows.map(row=>{
    const item=h10ItemForStep(items,row.stepId),record=item&&(data.steps&&data.steps[item.id]);
    return Object.assign({},row,h10StepObservation(row,item,record,ready));
  });
  const missingSteps=h10MissingStepIds(contract,items,data,false),missingScenarios=h10MissingScenarioIds(contract,data),finalReady=!!(finalRecord&&ready);
  return {
    schema:(template&&template.schema)||'h10-local-evidence-v1',
    createdAt:new Date().toISOString(),
    channel:(template&&template.channel)||'local-review',
    buildHash:ctx.build,
    contractStatus:(template&&template.contractStatus)||(((contract||{}).drainContract||{}).status)||((contract||{}).status)||'pending-app-integration',
    scenarioResults:scenarioResults,
    stepResults:stepResults,
    finalDecision:{
      status:finalReady?'passed-ready-to-drain':'pending',
      readyToDrain:finalReady,
      decidedBy:finalReady?'app/design local review':null,
      decidedAt:finalReady?((finalRecord&&finalRecord.at)||new Date().toISOString()):null,
      notes:finalReady?'Local receipt is structurally ready; docs/CONTENT-HANDOFF.md still owns the H10 movement.':'Local H10 review is still in progress.',
      remainingBlockers:finalReady?[]:missingSteps.concat(missingScenarios).map(id=>'Missing local H10 evidence: '+id)
    }
  };
}
function h10ArraySame(a,b){
  a=a||[];b=b||[];
  return a.length===b.length&&a.every((x,i)=>x===b[i]);
}
function h10PushErr(errors,code,detail){
  if(errors.indexOf(code)<0)errors.push(code);
  if(detail&&errors.indexOf(code+': '+detail)<0)errors.push(code+': '+detail);
}
function h10ScanForbidden(obj,forbidden,path,out){
  if(!obj||typeof obj!=='object')return;
  forbidden=forbidden||[];out=out||[];
  if(Array.isArray(obj)){obj.forEach((v,i)=>h10ScanForbidden(v,forbidden,path+'['+i+']',out));return out;}
  for(const k of Object.keys(obj)){
    const p=path?path+'.'+k:k;
    if(forbidden.indexOf(k)>=0)out.push(p);
    h10ScanForbidden(obj[k],forbidden,p,out);
  }
  return out;
}
function h10ValidateReceipt(contract,receipt){
  const validator=((((contract||{}).reviewKit||{}).evidenceTracker||{}).receiptValidator)||{},shape=validator.requiredShape||{},rules=validator.rowRules||{},privacy=validator.privacyRules||{};
  const errors=[],warnings=[],forbidden=(privacy.forbiddenFields||[]),top=shape.topLevelFields||['schema','createdAt','channel','buildHash','contractStatus','scenarioResults','stepResults','finalDecision'];
  receipt=receipt||{};
  if(receipt.schema!==((validator&&validator.schema)||'h10-local-evidence-v1'))errors.push('schema-mismatch');
  for(const f of top)if(!(f in receipt))h10PushErr(errors,'missing-top-level-field',f);
  const expectedScenarios=shape.scenarioIds||h10ScenarioIds(contract),expectedSteps=shape.stepIds||(((contract||{}).drainContract||{}).steps||[]).map(s=>s.stepId||s.id).filter(Boolean);
  const scenarioRows=Array.isArray(receipt.scenarioResults)?receipt.scenarioResults:[],stepRows=Array.isArray(receipt.stepResults)?receipt.stepResults:[];
  const scenarioIds=scenarioRows.map(r=>r&&r.scenarioId),stepIds=stepRows.map(r=>r&&r.stepId);
  if(!h10ArraySame(scenarioIds,expectedScenarios)||!h10ArraySame(stepIds,expectedSteps))errors.push('template-id-mismatch');
  for(const r of scenarioRows){
    if(r&&r.passed===true){
      const need=rules.observedFieldsRequiredWhenPassed||['observedChip','observedConfidenceMode','recordedAt'];
      for(const f of need)if(!r[f])h10PushErr(errors,'missing-required-observation',r.scenarioId||'scenario');
      if(!('notes' in r))h10PushErr(errors,'missing-required-observation',r.scenarioId||'scenario');
    }
  }
  for(const r of stepRows){
    if(r&&r.passed===true){
      for(const f of ['stepId','notes','recordedAt'])if(!r[f])h10PushErr(errors,'missing-step-field',r.stepId||'step');
    }
  }
  const seen=h10ScanForbidden(receipt,forbidden,'',[]);
  if(seen.length)errors.push('forbidden-privacy-field');
  const finalStepId=shape.finalStepId||rules.finalStepId||'final-h10-drain-decision',locked=rules.finalStepLockedUntil||[];
  const stepById={};for(const r of stepRows)if(r&&r.stepId)stepById[r.stepId]=r;
  const finalStep=stepById[finalStepId],lockedMissing=locked.filter(id=>!(stepById[id]&&stepById[id].passed===true));
  if(finalStep&&finalStep.passed===true&&lockedMissing.length)errors.push('final-step-locked');
  const missingScenarioIds=expectedScenarios.filter(id=>!(scenarioRows.find(r=>r&&r.scenarioId===id&&r.passed===true)));
  const missingStepIds=expectedSteps.filter(id=>!(stepRows.find(r=>r&&r.stepId===id&&r.passed===true)));
  const finalDecision=receipt.finalDecision||{},allowed=(validator.statusRules||[]).map(s=>s.status).filter(Boolean),status=finalDecision.status||'pending';
  if(allowed.length&&allowed.indexOf(status)<0)errors.push('invalid-final-status');
  if(!!finalDecision.readyToDrain !== (status==='passed-ready-to-drain'))errors.push('ready-status-mismatch');
  const uniqueErrors=[...new Set(errors.map(e=>String(e).split(': ')[0]))];
  const valid=uniqueErrors.length===0;
  return {schema:'h10-validator-result-v1',valid:valid,readyToDrain:valid&&status==='passed-ready-to-drain',finalStatus:valid?status:'invalid',errors:uniqueErrors,warnings:warnings,missingScenarioIds:missingScenarioIds,missingStepIds:missingStepIds,forbiddenFieldsSeen:seen,lockedFinalStep:!!(finalStep&&finalStep.passed===true&&lockedMissing.length),checkedAt:new Date().toISOString()};
}
function h10ValidationCopy(contract,result){
  const copy=((((((contract||{}).reviewKit||{}).evidenceTracker||{}).receiptValidator||{}).resultCopy)||{}),state=(result&&result.valid)?result.finalStatus:'invalid';
  const stateRow=(copy.resultStates||[]).find(r=>r.state===state)||{label:state,headline:'Local H10 receipt checked.',body:'Review the local result before moving H10.',action:'Review locally.'};
  const errMap={};for(const e of (copy.errorCopy||[]))errMap[e.code]=e;
  return {state:state,stateRow:stateRow,errorRows:(result.errors||[]).map(code=>errMap[code]||{code:code,label:code,message:'Receipt validation issue.',repairHint:'Review the local receipt against the generated contract.'})};
}
function h10ValidationHTML(contract,items){
  const receipt=h10EvidenceReceipt(contract,items,h10ReadEvidence()),result=h10ValidateReceipt(contract,receipt),copy=h10ValidationCopy(contract,result),row=copy.stateRow;
  const errs=copy.errorRows.length?`<ul class="h10-errors">${copy.errorRows.map(e=>`<li><b>${esc(e.label||e.code)}:</b> ${esc(e.message||'Validation issue.')} <span class="fc">${esc(e.repairHint||'Repair locally.')}</span></li>`).join('')}</ul>`:'';
  const missing=[(result.missingStepIds||[]).length?`${result.missingStepIds.length} step${result.missingStepIds.length===1?'':'s'}`:'',(result.missingScenarioIds||[]).length?`${result.missingScenarioIds.length} scenario row${result.missingScenarioIds.length===1?'':'s'}`:''].filter(Boolean).join(', ');
  return `<div class="h10-validation h10-validation-${esc(copy.state)}"><p class="alts-sub" style="margin:.25rem 0"><b>${esc(row.label||copy.state)}:</b> ${esc(row.headline||'Local H10 receipt checked.')}</p><p class="alts-sub" style="margin:.2rem 0">${esc(row.body||'Review locally.')} ${missing?`Missing: ${esc(missing)}.`:''}</p>${errs}<p class="alts-sub" style="margin:.2rem 0"><b>Validator:</b> ${result.valid?'valid':'needs repair'}; readyToDrain ${result.readyToDrain?'true':'false'}; checked locally, no upload.</p></div>`;
}
function h10ClipLine(text,max){
  text=String(text==null?'':text).replace(/\s+/g,' ').trim();
  max=max||220;
  return text.length>max?text.slice(0,Math.max(0,max-1)).trim()+'...':text;
}
function h10BoolWord(value){
  return value===true?'true':(value===false?'false':'blank');
}
function h10IssueRows(contract,result){
  const transcript=h10ReviewTranscript(contract),by={};
  for(const row of transcript.issueRows||[])by[row.code]=row;
  return (result.errors||[]).map(code=>by[code]||{code:code,severity:'error',label:code,message:'Receipt validation issue.',repairHint:'Review the local receipt against the generated contract.',fixtureIds:[]});
}
function h10TranscriptState(contract,result){
  const copy=h10ValidationCopy(contract,result),transcript=h10ReviewTranscript(contract),summary=(transcript.stateSummaries||[]).find(row=>row.state===copy.state)||{};
  return Object.assign({},copy.stateRow||{},summary,{state:copy.state});
}
function h10TranscriptLinesFromReceipt(contract,receipt){
  const transcript=h10ReviewTranscript(contract),max=transcript.maxLengths||{},result=h10ValidateReceipt(contract,receipt),state=h10TranscriptState(contract,result),issues=h10IssueRows(contract,result),sections=transcript.sections||[];
  const title=(transcript.lineTemplates&&transcript.lineTemplates.title?transcript.lineTemplates.title:'H10 local receipt review - {stateLabel}').replace('{stateLabel}',state.label||state.state||result.finalStatus);
  const out=[h10ClipLine(title,max.title||80),''];
  const sectionLabel=(id,fallback)=>((sections.find(s=>s.id===id)||{}).label)||fallback;
  const sectionInstruction=id=>((sections.find(s=>s.id===id)||{}).instruction)||'';
  const addSection=(id,fallback,lines)=>{
    out.push(h10ClipLine(sectionLabel(id,fallback),max.sectionLabel||48));
    const inst=sectionInstruction(id);if(inst)out.push(h10ClipLine(inst,max.instruction||160));
    for(const line of lines)out.push('- '+h10ClipLine(line,max.line||220));
    out.push('');
  };
  addSection('context','Review context',[
    `schema ${receipt.schema||'blank'}; channel ${receipt.channel||'blank'}; build ${receipt.buildHash||'blank'}`,
    `contractStatus ${receipt.contractStatus||'blank'}; createdAt ${receipt.createdAt||'blank'}`,
    `finalDecision ${((receipt.finalDecision||{}).status)||'blank'}; readyToDrain ${h10BoolWord((receipt.finalDecision||{}).readyToDrain)}`
  ]);
  addSection('validator-result','Validator result',[
    `state ${state.state||result.finalStatus}; readyToDrain ${h10BoolWord(result.readyToDrain)}`,
    `${state.headline||''} ${state.body||''}`,
    `action ${state.action||'Review locally.'}`
  ]);
  addSection('issues','Issues to repair',issues.length?issues.map(i=>`${i.code}: ${i.message||'Validation issue.'} Repair: ${i.repairHint||'Repair locally.'}`):['No validator error codes in this local receipt.']);
  const scenarios=(receipt.scenarioResults||[]).map(row=>`${row.scenarioId}: surface ${row.surface||'unknown'}; expected ${row.expectedChip||'blank'}; observed ${row.observedChip||'blank'}; mode ${row.observedConfidenceMode||'blank'}; passed ${h10BoolWord(row.passed)}; recorded ${row.recordedAt||'blank'}`);
  addSection('scenario-evidence','Scenario evidence',scenarios.length?scenarios:['No scenario rows in receipt.']);
  const steps=(receipt.stepResults||[]).map(row=>`${row.stepId}: ${row.label||'unlabeled'}; passed ${h10BoolWord(row.passed)}; scenarios ${(row.scenarioIds||[]).join(', ')||'none'}; recorded ${row.recordedAt||'blank'}`);
  addSection('step-evidence','Step evidence',steps.length?steps:['No step rows in receipt.']);
  addSection('handoff-boundary','Handoff boundary',[
    'Active handoff H10; handoff file docs/CONTENT-HANDOFF.md.',
    'Local receipt only; no automatic upload; app/design decides H10.',
    `Validator output readyToDrain ${h10BoolWord(result.readyToDrain)} is evidence only, not a movement.`
  ]);
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function h10TranscriptLines(contract,items,data){
  return h10TranscriptLinesFromReceipt(contract,h10EvidenceReceipt(contract,items,data||h10ReadEvidence()));
}
function h10TranscriptHTML(contract,items){
  const text=h10TranscriptLines(contract,items,h10ReadEvidence());
  return `<details class="h10-transcript-box"><summary>Local H10 review transcript</summary>
    <p class="alts-sub" style="margin:.35rem 0">Bounded local transcript from the generated review contract. Copy or download for app/design review; this does not upload or drain H10.</p>
    <pre class="h10-transcript">${esc(text)}</pre>
    <p class="alts-sub" style="margin:.4rem 0 0"><button class="savebtn" id="h10transcriptcopy" type="button">Copy review transcript</button> <button class="savebtn" id="h10transcriptdownload" type="button">Download transcript</button> <span id="h10transcriptout">Generated locally.</span></p>
  </details>`;
}
function h10DownloadTranscript(contract,items){
  const day=new Date().toISOString().slice(0,10),text=h10TranscriptLines(contract,items,h10ReadEvidence());
  const b=new Blob([text],{type:'text/plain'});
  const a=el('a',{href:URL.createObjectURL(b),download:`h10-review-transcript-${day}.txt`});a.click();
}
function h10Clone(obj){
  try{return JSON.parse(JSON.stringify(obj));}catch(e){return obj;}
}
function h10ObservedScenario(row,passed){
  return Object.assign({},row,{observedChip:row.expectedChip||'Observed H10 provenance chip',observedConfidenceMode:row.expectedConfidenceMode||'Observed H10 confidence mode',passed:passed,notes:passed?'Synthetic fixture row: expected observation present.':'Synthetic fixture row: blocker named for app/design review.',recordedAt:new Date().toISOString()});
}
function h10ObservedStep(row,passed){
  return Object.assign({},row,{passed:passed,notes:passed?'Synthetic fixture step: expected local evidence present.':'Synthetic fixture step: blocker named for app/design review.',recordedAt:new Date().toISOString()});
}
function h10SetFixtureFinal(receipt,status,ready,note){
  receipt.finalDecision=Object.assign({},receipt.finalDecision||{},{status:status,readyToDrain:ready,decidedBy:ready?'app/design local review':null,decidedAt:ready?new Date().toISOString():null,notes:note||'Synthetic local validator fixture.',remainingBlockers:ready?[]:['Synthetic H10 fixture blocker.']});
  return receipt;
}
function h10BaseFixtureReceipt(contract){
  const template=h10Clone(h10ReceiptTemplate(contract)||h10EvidenceReceipt(contract,[],{steps:{},scenarios:{}}))||{};
  template.createdAt=template.createdAt||new Date().toISOString();
  template.buildHash=template.buildHash||h10EvidenceContext().build;
  template.scenarioResults=Array.isArray(template.scenarioResults)?template.scenarioResults:[];
  template.stepResults=Array.isArray(template.stepResults)?template.stepResults:[];
  template.finalDecision=Object.assign({status:'pending',readyToDrain:false,decidedBy:null,decidedAt:null,notes:'',remainingBlockers:[]},template.finalDecision||{});
  return template;
}
function h10FixtureReceipt(contract,fixture){
  const r=h10BaseFixtureReceipt(contract),id=fixture&&fixture.id;
  if(id==='blocked-with-named-surface'){
    const sids=fixture.scenarioIds||[],steps=fixture.stepIds||[];
    r.scenarioResults=r.scenarioResults.map(row=>sids.indexOf(row.scenarioId)>=0?h10ObservedScenario(row,false):row);
    r.stepResults=r.stepResults.map(row=>steps.indexOf(row.stepId)>=0?h10ObservedStep(row,false):row);
    return h10SetFixtureFinal(r,'blocked',false,'Synthetic blocked receipt with a named surface blocker.');
  }
  if(id==='all-evidence-ready'){
    r.scenarioResults=r.scenarioResults.map(row=>h10ObservedScenario(row,true));
    r.stepResults=r.stepResults.map(row=>h10ObservedStep(row,true));
    return h10SetFixtureFinal(r,'passed-ready-to-drain',true,'Synthetic ready receipt; app/design still reviews before moving H10.');
  }
  if(id==='final-step-locked-too-early'){
    const missing=fixture.missingPrerequisiteStepIds||[],finalId=fixture.finalStepId||'final-h10-drain-decision';
    r.scenarioResults=r.scenarioResults.map(row=>h10ObservedScenario(row,true));
    r.stepResults=r.stepResults.map(row=>missing.indexOf(row.stepId)>=0?row:h10ObservedStep(row,true));
    return h10SetFixtureFinal(r,'passed-ready-to-drain',true,'Synthetic invalid receipt: final step marked before every prerequisite step.');
  }
  if(id==='privacy-field-leak'){
    h10SetFixtureFinal(r,'pending',false,'Synthetic invalid receipt containing a forbidden local privacy field.');
    const f=fixture.containsForbiddenField||'screenshots';
    r.localDebug={};r.localDebug[f]=['forbidden fixture field'];
    return r;
  }
  if(id==='unknown-receipt-row-id'){
    if(r.scenarioResults[0])r.scenarioResults[0].scenarioId=(fixture.unknownScenarioIds||['unknown-scenario'])[0];
    if(r.stepResults[0])r.stepResults[0].stepId=(fixture.unknownStepIds||['unknown-step'])[0];
    return h10SetFixtureFinal(r,'pending',false,'Synthetic invalid receipt with unknown row IDs.');
  }
  if(id==='passed-scenario-missing-observation'){
    const target=(fixture.scenarioIds||[])[0]||(r.scenarioResults[0]&&r.scenarioResults[0].scenarioId);
    r.scenarioResults=r.scenarioResults.map(row=>{
      if(row.scenarioId!==target)return row;
      const x=h10ObservedScenario(row,true);
      for(const f of (fixture.missingFields||[]))delete x[f];
      return x;
    });
    return h10SetFixtureFinal(r,'pending',false,'Synthetic invalid receipt with a passed scenario missing observations.');
  }
  return h10SetFixtureFinal(r,'pending',false,'Synthetic blank pending receipt.');
}
function h10Sorted(arr){
  return (arr||[]).slice().sort();
}
function h10SameSet(a,b){
  a=h10Sorted(a);b=h10Sorted(b);
  return h10ArraySame(a,b);
}
function h10FixtureExpectations(contract){
  const validator=((((contract||{}).reviewKit||{}).evidenceTracker||{}).receiptValidator)||{},recipe=validator.implementationRecipe||{},copy=validator.resultCopy||{};
  const byId={};
  for(const row of recipe.fixtureExpectations||[])byId[row.fixtureId]=Object.assign({},byId[row.fixtureId]||{},row);
  for(const row of copy.fixtureCopyExpectations||[])byId[row.fixtureId]=Object.assign({},byId[row.fixtureId]||{},row);
  return byId;
}
function h10FixtureSelfCheck(contract){
  const validator=((((contract||{}).reviewKit||{}).evidenceTracker||{}).receiptValidator)||{},fixtures=validator.fixtureCases||[],expect=h10FixtureExpectations(contract);
  const rows=fixtures.map(f=>{
    const receipt=h10FixtureReceipt(contract,f),result=h10ValidateReceipt(contract,receipt),state=result.valid?result.finalStatus:'invalid',e=expect[f.id]||{};
    const expectedErrors=e.expectedErrorCodes||((f.expectValid===false&&f.reasonCode)?[f.reasonCode]:[]);
    const readyMatches=result.valid?(result.readyToDrain===f.readyToDrain):(result.readyToDrain===false);
    const pass=result.valid===f.expectValid&&readyMatches&&state===(e.expectedState||f.attemptedFinalStatus||state)&&h10SameSet(result.errors,expectedErrors);
    return {id:f.id,description:f.description||'',pass:pass,result:result,state:state,expectedErrors:expectedErrors,reason:f.reasonCode||'',ready:f.readyToDrain};
  });
  return {rows:rows,pass:rows.length>0&&rows.every(r=>r.pass),count:rows.length,passed:rows.filter(r=>r.pass).length};
}
function h10FixtureSelfCheckHTML(contract){
  const check=h10FixtureSelfCheck(contract);
  const rows=check.rows.map(r=>`<div class="h10-fixture ${r.pass?'':'h10-fixture-fail'}"><span><b>${r.pass?'Pass':'Check'}</b> <code>${esc(r.id)}</code></span><span>${esc(r.state)}${r.result.errors.length?` - ${esc(r.result.errors.join(', '))}`:''}</span></div>`).join('');
  return `<details class="h10-checks" open><summary>Validator fixture self-check (${check.passed}/${check.count})</summary>
    <p class="alts-sub" style="margin:.35rem 0">Runs the generated H10 receipt fixture vectors through the browser validator. This is local implementation evidence only, not an H10 drain.</p>
    <div class="h10-fixtures">${rows}</div>
  </details>`;
}
function h10ReviewTranscript(contract){
  return ((((((contract||{}).reviewKit||{}).evidenceTracker||{}).receiptValidator||{}).reviewTranscript)||{});
}
function h10SmokeValidator(contract){
  return h10ReviewTranscript(contract).runtimeAssertionReceiptValidator||{};
}
function h10SmokeAssertions(contract){
  return h10ReviewTranscript(contract).runtimeAssertions||[];
}
function h10SmokeTemplate(contract){
  const t=h10ReviewTranscript(contract).runtimeAssertionReceiptTemplate||{};
  return t&&t.schema?t:null;
}
function h10SmokeExpectationByFixture(contract){
  const by={};for(const a of h10SmokeAssertions(contract))if(a&&a.fixtureId)by[a.fixtureId]=a;
  return by;
}
function h10ApplySmokeObservation(row,passed){
  const observed=Object.assign({},row,{passed:passed,notes:passed?'Synthetic smoke row: rendered transcript matched generated assertion.':'Synthetic smoke row: rendered transcript mismatch recorded for app/design review.',recordedAt:new Date().toISOString()});
  if(passed){
    observed.observedTitle=row.expectedTitle;
    observed.observedSectionIds=(row.expectedSectionIds||[]).slice();
    observed.observedIssueCodes=(row.expectedIssueCodes||[]).slice();
    observed.observedReadyToDrain=!!row.expectedReadyToDrain;
  }
  return observed;
}
function h10RecomputeSmokeSummary(receipt){
  const rows=Array.isArray(receipt&&receipt.fixtureResults)?receipt.fixtureResults:[],passed=rows.filter(r=>r&&r.passed===true).length,failed=rows.filter(r=>r&&r.passed===false).length,blocked=rows.filter(r=>r&&r.passed==null&&r.notes).length,total=rows.length;
  return {totalFixtures:total,passedFixtures:passed,failedFixtures:failed,blockedFixtures:blocked,readyForH10Review:total>0&&passed===total&&failed===0&&blocked===0};
}
function h10SetSmokeSummary(receipt){
  receipt.summary=Object.assign({},receipt.summary||{},h10RecomputeSmokeSummary(receipt));
  return receipt;
}
function h10BaseSmokeReceipt(contract){
  const r=h10Clone(h10SmokeTemplate(contract)||{})||{};
  r.createdAt=r.createdAt||new Date().toISOString();
  r.buildHash=r.buildHash||h10EvidenceContext().build;
  r.fixtureResults=Array.isArray(r.fixtureResults)?r.fixtureResults:[];
  r.summary=Object.assign({totalFixtures:r.fixtureResults.length,passedFixtures:0,failedFixtures:0,blockedFixtures:0,readyForH10Review:false},r.summary||{});
  r.finalDecision=Object.assign({status:'pending',decidedBy:'app/design',decidedAt:null,readyToDrainH10:false,remainingBlockers:['App/design must run the local transcript smoke and decide H10 in docs/CONTENT-HANDOFF.md.']},r.finalDecision||{});
  return r;
}
function h10SmokeAllPassReceipt(contract){
  const r=h10BaseSmokeReceipt(contract);
  r.fixtureResults=r.fixtureResults.map(row=>h10ApplySmokeObservation(row,true));
  h10SetSmokeSummary(r);
  r.finalDecision=Object.assign({},r.finalDecision,{status:'pending',readyToDrainH10:false,decidedAt:null});
  return r;
}
function h10SmokeFixtureReceipt(contract,fixture){
  fixture=fixture||{};const id=fixture.id,first=(fixture.fixtureIds||[])[0];
  if(id==='not-json-smoke-input')return 'not-json smoke receipt';
  const completed=/completed-local-json/.test(fixture.inputKind||''),r=completed?h10SmokeAllPassReceipt(contract):h10BaseSmokeReceipt(contract);
  if(id==='all-smoke-fixtures-pass')return r;
  if(id==='one-smoke-fixture-failed-with-note'){
    r.fixtureResults=r.fixtureResults.map(row=>row.fixtureId===first?Object.assign({},row,{passed:false,notes:'Synthetic smoke row failed with a named transcript mismatch.',recordedAt:new Date().toISOString()}):row);
    return h10SetSmokeSummary(r);
  }
  if(id==='schema-boundary-mismatch'){
    Object.assign(r,fixture.mutation||{});
    return r;
  }
  if(id==='missing-smoke-fixture-row'){
    const missing=(fixture.mutation||{}).missingFixtureId;
    r.fixtureResults=r.fixtureResults.filter(row=>row.fixtureId!==missing);
    return r;
  }
  if(id==='expected-title-edited'){
    r.fixtureResults=r.fixtureResults.map(row=>row.fixtureId===first?Object.assign({},row,{expectedTitle:(fixture.mutation||{}).expectedTitle||'Edited local title'}):row);
    return r;
  }
  if(id==='passed-row-missing-observed-fields'){
    r.fixtureResults=r.fixtureResults.map(row=>{
      if(row.fixtureId!==first)return row;
      const x=Object.assign({},row,{passed:true,notes:'Synthetic smoke row with missing observed fields.'});
      for(const f of ((fixture.mutation||{}).missingFields||[]))delete x[f];
      return x;
    });
    return h10SetSmokeSummary(r);
  }
  if(id==='passed-row-observed-mismatch'){
    r.fixtureResults=r.fixtureResults.map(row=>row.fixtureId===first?Object.assign({},row,{passed:true,observedTitle:(fixture.mutation||{}).observedTitle||'Different local transcript title',notes:'Synthetic smoke row with observed mismatch.',recordedAt:new Date().toISOString()}):row);
    return h10SetSmokeSummary(r);
  }
  if(id==='smoke-receipt-privacy-field-leak'){
    const f=fixture.containsForbiddenField||'screenshots';
    r.localDebug={};r.localDebug[f]=['forbidden smoke fixture field'];
    return r;
  }
  if(id==='smoke-summary-count-drift'){
    Object.assign(r.summary,fixture.mutation||{});
    return r;
  }
  if(id==='smoke-final-decision-overreach'){
    r.finalDecision=Object.assign({},r.finalDecision,{status:(fixture.mutation||{})['finalDecision.status']||'passed-ready-to-drain',readyToDrainH10:!!(fixture.mutation||{}).readyToDrainH10,decidedAt:new Date().toISOString()});
    return r;
  }
  return r;
}
function h10SmokePush(errors,code){
  if(errors.indexOf(code)<0)errors.push(code);
}
function h10ValidateSmokeReceipt(contract,receipt){
  const transcript=h10ReviewTranscript(contract),validator=h10SmokeValidator(contract),shape=validator.requiredShape||{},template=h10SmokeTemplate(contract)||{},assertions=h10SmokeAssertions(contract),by=h10SmokeExpectationByFixture(contract);
  const errors=[],warnings=[],missingFixtureIds=[],mismatchedFixtureIds=[];
  let forbiddenFieldsSeen=[];
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)){
    return {schema:validator.resultSchema||'h10-transcript-smoke-validation-result-v1',valid:false,readyForH10Review:false,errors:['malformed-smoke-receipt'],warnings:warnings,passedFixtures:0,failedFixtures:0,blockedFixtures:0,missingFixtureIds:missingFixtureIds,mismatchedFixtureIds:mismatchedFixtureIds,forbiddenFieldsSeen:forbiddenFieldsSeen,checkedAt:new Date().toISOString()};
  }
  const top=shape.topLevelFields||['schema','createdAt','channel','buildHash','activeHandoff','contractPointer','runtimeAssertionsPointer','localOnly','noServerAuthority','h10DrainableFromReceiptAlone','fixtureResults','summary','finalDecision','redactionRules','mustInclude','mustNot'];
  for(const f of top)if(!(f in receipt))h10SmokePush(errors,'smoke-schema-mismatch');
  if(receipt.schema!==template.schema||receipt.activeHandoff!=='H10'||receipt.contractPointer!==template.contractPointer||receipt.runtimeAssertionsPointer!==template.runtimeAssertionsPointer||receipt.localOnly!==true||receipt.noServerAuthority!==true||receipt.h10DrainableFromReceiptAlone!==false)h10SmokePush(errors,'smoke-schema-mismatch');
  const expectedIds=shape.fixtureIds||assertions.map(a=>a.fixtureId),rows=Array.isArray(receipt.fixtureResults)?receipt.fixtureResults:[],rowIds=rows.map(r=>r&&r.fixtureId);
  for(const id of expectedIds)if(rowIds.indexOf(id)<0)missingFixtureIds.push(id);
  if(!h10ArraySame(rowIds,expectedIds)||rows.length!==(shape.fixtureResultCount||expectedIds.length))h10SmokePush(errors,'fixture-row-count-mismatch');
  if(errors.indexOf('fixture-row-count-mismatch')<0){
    for(const row of rows){
      const a=by[row.fixtureId];if(!a)continue;
      const expectationMismatch=row.mode!==a.mode||row.expectedTitle!==a.expectedTitle||row.expectedState!==a.expectedState||row.expectedReadyToDrain!==a.expectedReadyToDrain||!h10ArraySame(row.expectedSectionIds||[],a.expectedSectionIds||[])||row.expectedIssueCount!==a.expectedIssueCount||!h10ArraySame(row.expectedIssueCodes||[],a.expectedIssueCodes||[])||!h10ArraySame(row.mustNot||[],a.mustNot||[]);
      if(expectationMismatch){h10SmokePush(errors,'generated-expectation-mismatch');mismatchedFixtureIds.push(row.fixtureId);}
      if(row.passed===true){
        const missing=(!row.observedTitle)||!Array.isArray(row.observedSectionIds)||!Array.isArray(row.observedIssueCodes)||typeof row.observedReadyToDrain!=='boolean'||!row.recordedAt;
        if(missing){h10SmokePush(errors,'missing-observed-transcript-fields');mismatchedFixtureIds.push(row.fixtureId);}
        else if(row.observedTitle!==row.expectedTitle||!h10ArraySame(row.observedSectionIds||[],row.expectedSectionIds||[])||!h10ArraySame(row.observedIssueCodes||[],row.expectedIssueCodes||[])||row.observedReadyToDrain!==row.expectedReadyToDrain){
          h10SmokePush(errors,'observed-transcript-mismatch');mismatchedFixtureIds.push(row.fixtureId);
        }
      }
    }
    const summary=h10RecomputeSmokeSummary(receipt),s=receipt.summary||{};
    if(s.totalFixtures!==summary.totalFixtures||s.passedFixtures!==summary.passedFixtures||s.failedFixtures!==summary.failedFixtures||s.blockedFixtures!==summary.blockedFixtures||s.readyForH10Review!==summary.readyForH10Review)h10SmokePush(errors,'summary-count-mismatch');
  }
  const forbidden=((receipt.redactionRules||{}).forbiddenFields)||((transcript.runtimeAssertionReceiptTemplate||{}).redactionRules||{}).forbiddenFields||((((contract||{}).reviewKit||{}).evidenceTracker||{}).storage||{}).forbiddenFields||[];
  forbiddenFieldsSeen=h10ScanForbidden(receipt,forbidden,'',[]);
  if(forbiddenFieldsSeen.length)h10SmokePush(errors,'forbidden-privacy-field');
  const fd=receipt.finalDecision||{};
  if(fd.readyToDrainH10===true||fd.status==='passed-ready-to-drain')h10SmokePush(errors,'final-decision-overreach');
  const summary=h10RecomputeSmokeSummary(receipt),unique=[...new Set(errors)],valid=unique.length===0;
  return {schema:validator.resultSchema||'h10-transcript-smoke-validation-result-v1',valid:valid,readyForH10Review:valid&&summary.readyForH10Review,errors:unique,warnings:warnings,passedFixtures:summary.passedFixtures,failedFixtures:summary.failedFixtures,blockedFixtures:summary.blockedFixtures,missingFixtureIds:[...new Set(missingFixtureIds)],mismatchedFixtureIds:[...new Set(mismatchedFixtureIds)],forbiddenFieldsSeen:forbiddenFieldsSeen,checkedAt:new Date().toISOString()};
}
function h10ReceiptFixtureById(contract){
  const validator=((((contract||{}).reviewKit||{}).evidenceTracker||{}).receiptValidator)||{},by={};
  for(const row of validator.fixtureCases||[])if(row&&row.id)by[row.id]=row;
  return by;
}
function h10SmokeObservedSectionIds(contract,text){
  const labels={};
  for(const s of h10ReviewTranscript(contract).sections||[])if(s&&s.label&&s.id)labels[s.label]=s.id;
  return String(text||'').split(/\n/).map(line=>line.trim()).filter(line=>labels[line]).map(line=>labels[line]);
}
function h10SmokeObservedIssueCodes(contract,text){
  const sections=h10ReviewTranscript(contract).sections||[],issue=(sections.find(s=>s.id==='issues')||{}).label||'Issues to repair',labels=new Set(sections.map(s=>s&&s.label).filter(Boolean));
  const codes=[];let inIssues=false;
  for(const line of String(text||'').split(/\n/)){
    const clean=line.trim();
    if(clean===issue){inIssues=true;continue;}
    if(inIssues&&labels.has(clean))break;
    if(!inIssues||clean.indexOf('- ')!==0)continue;
    const code=clean.slice(2).split(':')[0].trim();
    if(code&&code.indexOf(' ')<0&&codes.indexOf(code)<0)codes.push(code);
  }
  return codes;
}
function h10RuntimeSmokeObservation(contract,row){
  const fixtures=h10ReceiptFixtureById(contract),fixture=fixtures[row.fixtureId]||{id:row.fixtureId},receipt=h10FixtureReceipt(contract,fixture),text=h10TranscriptLinesFromReceipt(contract,receipt),result=h10ValidateReceipt(contract,receipt);
  const observedTitle=(String(text||'').split(/\n/)[0]||'').trim(),observedSectionIds=h10SmokeObservedSectionIds(contract,text),observedIssueCodes=h10SmokeObservedIssueCodes(contract,text),observedReadyToDrain=!!result.readyToDrain;
  const expectedIssues=row.expectedIssueCodes||[],expectedIssueCount=Number.isFinite(row.expectedIssueCount)?row.expectedIssueCount:expectedIssues.length;
  const checks=[
    observedTitle===row.expectedTitle,
    h10ArraySame(observedSectionIds,row.expectedSectionIds||[]),
    h10ArraySame(observedIssueCodes,expectedIssues),
    observedIssueCodes.length===expectedIssueCount,
    observedReadyToDrain===!!row.expectedReadyToDrain,
    /docs\/CONTENT-HANDOFF\.md/i.test(text),
    /local receipt only/i.test(text),
    /app\/design decides H10/i.test(text)
  ];
  const pass=checks.every(Boolean),problems=[];
  if(!checks[0])problems.push('title');
  if(!checks[1])problems.push('sections');
  if(!checks[2]||!checks[3])problems.push('issue codes');
  if(!checks[4])problems.push('ready flag');
  if(!checks[5]||!checks[6]||!checks[7])problems.push('handoff boundary');
  return Object.assign({},row,{
    observedTitle:observedTitle,
    observedSectionIds:observedSectionIds,
    observedIssueCodes:observedIssueCodes,
    observedReadyToDrain:observedReadyToDrain,
    passed:pass,
    notes:pass?'Runtime renderer matched the generated transcript assertion; local evidence only.':'Runtime renderer mismatch: '+problems.join(', ')+'.',
    recordedAt:new Date().toISOString()
  });
}
function h10RuntimeSmokeReceipt(contract){
  const r=h10BaseSmokeReceipt(contract);
  r.fixtureResults=(r.fixtureResults||[]).map(row=>h10RuntimeSmokeObservation(contract,row));
  h10SetSmokeSummary(r);
  r.finalDecision=Object.assign({},r.finalDecision||{},{status:'pending',decidedBy:'app/design',decidedAt:null,readyToDrainH10:false,remainingBlockers:['App/design must decide H10 in docs/CONTENT-HANDOFF.md; runtime smoke alone cannot drain it.']});
  return r;
}
function h10RuntimeSmokeSummaryText(contract){
  const receipt=h10RuntimeSmokeReceipt(contract),result=h10ValidateSmokeReceipt(contract,receipt),copy=h10SmokeCopyState(contract,result,receipt),bad=(receipt.fixtureResults||[]).filter(r=>r.passed!==true).map(r=>r.fixtureId);
  return ['H10 transcript runtime smoke receipt',`State: ${copy.state}`,`Validator: ${result.valid?'valid':'needs repair'}`,`Fixtures: ${result.passedFixtures}/${receipt.summary.totalFixtures} passed`,bad.length?`Mismatched fixture ids: ${bad.join(', ')}`:'Mismatched fixture ids: none',`Ready for H10 review: ${result.readyForH10Review?'yes, evidence only':'no'}`,'Local receipt only; no upload; app/design decides H10 in docs/CONTENT-HANDOFF.md.',`Checked ${result.checkedAt}`].join('\n');
}
function h10RuntimeSmokeHTML(contract){
  const receipt=h10RuntimeSmokeReceipt(contract),result=h10ValidateSmokeReceipt(contract,receipt),copy=h10SmokeCopyState(contract,result,receipt),row=copy.row||{},rows=(receipt.fixtureResults||[]).map(r=>`<div class="h10-fixture ${r.passed?'':'h10-fixture-fail'}"><span><b>${r.passed?'Pass':'Check'}</b> <code>${esc(r.fixtureId||'fixture')}</code></span><span>${esc(r.observedTitle||'missing title')}${r.passed?'':` - ${esc(r.notes||'mismatch')}`}</span></div>`).join('');
  return `<details class="h10-checks" open><summary>Runtime transcript smoke (${result.passedFixtures}/${receipt.summary.totalFixtures})</summary>
    <p class="alts-sub" style="margin:.35rem 0"><b>${esc(row.label||copy.state)}:</b> ${esc(row.headline||'Transcript smoke checked locally.')} ${esc(row.body||'')}</p>
    <p class="alts-sub" style="margin:.25rem 0">This renders the generated receipt fixtures through the app transcript renderer, extracts observed title, section ids, issue codes, and ready state, then validates a local <code>h10-transcript-smoke-receipt-v1</code> receipt. It is evidence only.</p>
    <div class="h10-fixtures">${rows}</div>
    <p class="alts-sub" style="margin:.4rem 0 0"><button class="savebtn" id="h10runtimesmokecopy" type="button">Copy smoke summary</button> <button class="savebtn" id="h10runtimesmokedownload" type="button">Download smoke receipt</button> <span id="h10runtimesmokeout">Generated locally; no upload.</span></p>
  </details>`;
}
function h10DownloadRuntimeSmokeReceipt(contract){
  const day=new Date().toISOString().slice(0,10),payload=h10RuntimeSmokeReceipt(contract);
  const b=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=el('a',{href:URL.createObjectURL(b),download:`h10-transcript-smoke-${day}.json`});a.click();
}
function h10BindRuntimeSmokeButtons(contract){
  const out=document.getElementById('h10runtimesmokeout'),copy=document.getElementById('h10runtimesmokecopy'),download=document.getElementById('h10runtimesmokedownload');
  if(copy)copy.onclick=()=>{
    const text=h10RuntimeSmokeSummaryText(contract),ok=!!(navigator.clipboard&&navigator.clipboard.writeText);
    if(ok)navigator.clipboard.writeText(text).then(()=>{if(out)out.textContent='H10 runtime smoke summary copied.';}).catch(()=>{if(out)out.textContent=h4CopyEvidenceText(text)?'H10 runtime smoke summary copied.':'Copy failed; select the text manually.';});
    else if(out)out.textContent=h4CopyEvidenceText(text)?'H10 runtime smoke summary copied.':'Copy failed; select the text manually.';
  };
  if(download)download.onclick=()=>{h10DownloadRuntimeSmokeReceipt(contract);if(out)out.textContent='H10 transcript smoke receipt downloaded.';};
}
function h10SmokeCopyState(contract,result,receipt){
  const copy=(h10SmokeValidator(contract).resultCopy)||{},states=copy.resultStates||[];
  let state='not-ready-for-h10-review';
  if(!result.valid)state='invalid';
  else if(result.readyForH10Review)state='ready-for-h10-review';
  else if(receipt&&receipt.summary&&receipt.summary.passedFixtures===0&&receipt.summary.failedFixtures===0)state='pending-smoke-template';
  return {state:state,row:states.find(r=>r.state===state)||{label:state,headline:'Smoke receipt checked.',body:'Review locally.',action:'Review locally.'}};
}
function h10SmokeFixtureExpectations(contract){
  const by={};for(const row of (((h10SmokeValidator(contract).resultCopy)||{}).fixtureCopyExpectations||[]))by[row.fixtureId]=row;
  return by;
}
function h10SmokeFixtureSelfCheck(contract){
  const validator=h10SmokeValidator(contract),fixtures=validator.fixtureCases||[],expect=h10SmokeFixtureExpectations(contract);
  const rows=fixtures.map(f=>{
    const receipt=h10SmokeFixtureReceipt(contract,f),result=h10ValidateSmokeReceipt(contract,receipt),copy=h10SmokeCopyState(contract,result,receipt),e=expect[f.id]||{},expectedErrors=e.expectedErrorCodes||f.expectedErrorCodes||[];
    const pass=result.valid===f.expectValid&&result.readyForH10Review===f.expectReadyForH10Review&&copy.state===(e.expectedState||copy.state)&&h10SameSet(result.errors,expectedErrors);
    return {id:f.id,pass:pass,state:copy.state,result:result,expectedErrors:expectedErrors};
  });
  return {rows:rows,pass:rows.length>0&&rows.every(r=>r.pass),count:rows.length,passed:rows.filter(r=>r.pass).length};
}
function h10SmokeFixtureSelfCheckHTML(contract){
  const check=h10SmokeFixtureSelfCheck(contract);
  const rows=check.rows.map(r=>`<div class="h10-fixture ${r.pass?'':'h10-fixture-fail'}"><span><b>${r.pass?'Pass':'Check'}</b> <code>${esc(r.id)}</code></span><span>${esc(r.state)}${r.result.errors.length?` - ${esc(r.result.errors.join(', '))}`:''}</span></div>`).join('');
  return `<details class="h10-checks" open><summary>Transcript-smoke validator self-check (${check.passed}/${check.count})</summary>
    <p class="alts-sub" style="margin:.35rem 0">Runs the generated transcript-smoke receipt vectors through the browser smoke validator. This checks the review transcript layer; it is still local implementation evidence only.</p>
    <div class="h10-fixtures">${rows}</div>
  </details>`;
}
function h10ReviewPacket(contract,items,data){
  data=data||h10ReadEvidence();
  const ctx=h10EvidenceContext(),scenarios=((((contract||{}).reviewMatrix||{}).scenarios)||[]),receipt=h10EvidenceReceipt(contract,items,data),receiptValidation=h10ValidateReceipt(contract,receipt),reviewTranscript=h10TranscriptLinesFromReceipt(contract,receipt);
  const transcriptSmokeReceipt=h10RuntimeSmokeReceipt(contract),transcriptSmokeValidation=h10ValidateSmokeReceipt(contract,transcriptSmokeReceipt),smokeTemplate=h10SmokeTemplate(contract)||{},missingStepIds=h10MissingStepIds(contract,items,data,false),missingScenarioIds=h10MissingScenarioIds(contract,data),finalId=h10FinalEvidenceId(contract);
  const stepDone=(items||[]).filter(i=>data.steps&&data.steps[i.id]&&h10EvidenceBuildFresh(data.steps[i.id])).length,scenarioDone=scenarios.filter(s=>data.scenarios&&data.scenarios[s.id]&&h10EvidenceBuildFresh(data.scenarios[s.id])).length;
  return {
    schema:'h10-local-review-packet-v1',
    createdAt:new Date().toISOString(),
    channel:'local-review',
    activeHandoff:'H10',
    handoffFile:'docs/CONTENT-HANDOFF.md',
    localOnly:true,
    noServerAuthority:true,
    h10DrainableFromPacketAlone:false,
    appDesignOwnsHandoff:true,
    context:{
      workbenchChannel:ctx.channel,
      hash:ctx.hash,
      buildHash:ctx.build,
      contractStatus:(((contract||{}).drainContract||{}).status)||((contract||{}).status)||'pending-app-integration',
      scenarioRowCount:scenarios.length,
      evidenceItemCount:(items||[]).length,
      surfaceGroupCount:(((((contract||{}).reviewKit||{}).coverage)||{}).surfaceGroupCount)||((((contract||{}).reviewKit||{}).surfaceGroups)||[]).length
    },
    sourcePointers:{
      contractPointer:'app/data/index.json.provenanceDisplayContract',
      receiptSchema:receipt.schema,
      receiptValidatorSchema:((((((contract||{}).reviewKit||{}).evidenceTracker||{}).receiptValidator||{}).resultSchema)||'h10-validator-result-v1'),
      reviewTranscriptSchema:(h10ReviewTranscript(contract)||{}).schema||'h10-validator-review-transcript-v1',
      runtimeAssertionsPointer:smokeTemplate.runtimeAssertionsPointer||'app/data/index.json.provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertions',
      transcriptSmokeSchema:transcriptSmokeReceipt.schema
    },
    summary:{
      stepDone:stepDone,
      stepTotal:(items||[]).length,
      scenarioDone:scenarioDone,
      scenarioTotal:scenarios.length,
      receiptValid:!!receiptValidation.valid,
      receiptReadyToDrain:!!receiptValidation.readyToDrain,
      readyToDrainLocalReceipt:!!receiptValidation.readyToDrain,
      transcriptSmokeValid:!!transcriptSmokeValidation.valid,
      smokeReadyForH10Review:!!transcriptSmokeValidation.readyForH10Review,
      finalLocalDecisionRecorded:!!(data.steps&&data.steps[finalId]&&h10EvidenceBuildFresh(data.steps[finalId])&&receiptValidation.readyToDrain),
      missingStepIds:missingStepIds,
      missingScenarioIds:missingScenarioIds
    },
    boundary:'Local review packet only. It may support app/design review, but it is not uploaded, not server-authoritative, and cannot move H10 from docs/CONTENT-HANDOFF.md by itself.',
    receipt:receipt,
    receiptValidation:receiptValidation,
    reviewTranscript:reviewTranscript,
    transcriptSmokeReceipt:transcriptSmokeReceipt,
    transcriptSmokeValidation:transcriptSmokeValidation
  };
}
function h10PacketPush(errors,code){
  if(errors.indexOf(code)<0)errors.push(code);
}
function h10PacketSameJSON(a,b){
  return JSON.stringify(a==null?null:a)===JSON.stringify(b==null?null:b);
}
function h10PacketResultMismatch(a,b,fields){
  a=a||{};b=b||{};
  return fields.some(f=>!h10PacketSameJSON(a[f],b[f]));
}
function h10PacketExpectedPointers(contract,smokeReceipt){
  const smokeTemplate=h10SmokeTemplate(contract)||{},receiptTemplate=h10ReceiptTemplate(contract)||{};
  return {
    contractPointer:'app/data/index.json.provenanceDisplayContract',
    receiptSchema:receiptTemplate.schema||'h10-local-evidence-v1',
    receiptValidatorSchema:((((((contract||{}).reviewKit||{}).evidenceTracker||{}).receiptValidator||{}).resultSchema)||'h10-validator-result-v1'),
    reviewTranscriptSchema:(h10ReviewTranscript(contract)||{}).schema||'h10-validator-review-transcript-v1',
    runtimeAssertionsPointer:smokeTemplate.runtimeAssertionsPointer||'app/data/index.json.provenanceDisplayContract.reviewKit.evidenceTracker.receiptValidator.reviewTranscript.runtimeAssertions',
    transcriptSmokeSchema:(smokeReceipt&&smokeReceipt.schema)||smokeTemplate.schema||'h10-transcript-smoke-receipt-v1'
  };
}
function h10PacketExpectedSummary(contract,items,packet,receiptResult,smokeResult){
  const receipt=(packet||{}).receipt||{},scenarioRows=Array.isArray(receipt.scenarioResults)?receipt.scenarioResults:[],stepRows=Array.isArray(receipt.stepResults)?receipt.stepResults:[],stepById={};
  for(const row of stepRows)if(row&&row.stepId)stepById[row.stepId]=row;
  const finalId=h10FinalEvidenceId(contract),finalItem=(items||[]).find(i=>i.id===finalId||i.final),finalStepId=(finalItem&&(finalItem.stepId||finalItem.id))||finalId,missingStepIds=(items||[]).filter(i=>!i.final&&!(stepById[i.stepId||i.id]&&stepById[i.stepId||i.id].passed===true)).map(i=>i.id);
  const missingScenarioIds=h10ScenarioIds(contract).filter(id=>!(scenarioRows.find(row=>row&&row.scenarioId===id&&row.passed===true)));
  return {
    stepDone:(items||[]).filter(i=>stepById[i.stepId||i.id]&&stepById[i.stepId||i.id].passed===true).length,
    stepTotal:(items||[]).length,
    scenarioDone:scenarioRows.filter(row=>row&&row.passed===true).length,
    scenarioTotal:h10ScenarioIds(contract).length,
    receiptValid:!!(receiptResult&&receiptResult.valid),
    receiptReadyToDrain:!!(receiptResult&&receiptResult.readyToDrain),
    readyToDrainLocalReceipt:!!(receiptResult&&receiptResult.readyToDrain),
    transcriptSmokeValid:!!(smokeResult&&smokeResult.valid),
    smokeReadyForH10Review:!!(smokeResult&&smokeResult.readyForH10Review),
    finalLocalDecisionRecorded:!!(receiptResult&&receiptResult.readyToDrain&&stepById[finalStepId]&&stepById[finalStepId].passed===true),
    missingStepIds:missingStepIds,
    missingScenarioIds:missingScenarioIds
  };
}
function h10ValidateReviewPacket(contract,items,packet){
  const errors=[],warnings=[];
  if(!packet||typeof packet!=='object'||Array.isArray(packet)){
    return {schema:'h10-local-review-packet-validation-v1',valid:false,readyForAppDesignReview:false,errors:['malformed-review-packet'],warnings:warnings,checkedAt:new Date().toISOString()};
  }
  const required=['schema','createdAt','channel','activeHandoff','handoffFile','localOnly','noServerAuthority','h10DrainableFromPacketAlone','appDesignOwnsHandoff','context','sourcePointers','summary','boundary','receipt','receiptValidation','reviewTranscript','transcriptSmokeReceipt','transcriptSmokeValidation'];
  for(const f of required)if(!(f in packet))h10PacketPush(errors,'packet-schema-mismatch');
  if(packet.schema!=='h10-local-review-packet-v1'||packet.channel!=='local-review'||packet.activeHandoff!=='H10'||packet.handoffFile!=='docs/CONTENT-HANDOFF.md'||packet.localOnly!==true||packet.noServerAuthority!==true||packet.h10DrainableFromPacketAlone!==false||packet.appDesignOwnsHandoff!==true)h10PacketPush(errors,'packet-boundary-mismatch');
  if(!packet.createdAt||isNaN(Date.parse(packet.createdAt)))h10PacketPush(errors,'packet-created-at-invalid');
  const boundary=String(packet.boundary||'');
  if(!/docs\/CONTENT-HANDOFF\.md/i.test(boundary)||!/no upload|not uploaded/i.test(boundary)||!/not server-authoritative|no server/i.test(boundary)||!/cannot move H10/i.test(boundary))h10PacketPush(errors,'packet-boundary-copy-mismatch');
  const ctx=packet.context||{},expectedScenarioTotal=h10ScenarioIds(contract).length,expectedItemTotal=(items||[]).length,expectedGroups=(((((contract||{}).reviewKit||{}).coverage)||{}).surfaceGroupCount)||((((contract||{}).reviewKit||{}).surfaceGroups)||[]).length;
  if(ctx.scenarioRowCount!==expectedScenarioTotal||ctx.evidenceItemCount!==expectedItemTotal||ctx.surfaceGroupCount!==expectedGroups)h10PacketPush(errors,'packet-context-mismatch');
  const expectedStatus=(((contract||{}).drainContract||{}).status)||((contract||{}).status)||'pending-app-integration';
  if(ctx.contractStatus!==expectedStatus)h10PacketPush(errors,'packet-context-mismatch');
  const currentBuildHash=(h10EvidenceContext().build||''),packetBuildHash=(ctx.buildHash||'');
  let freshForCurrentBuild=true;
  if(!packetBuildHash){h10PacketPush(warnings,'packet-build-missing');freshForCurrentBuild=false;}
  else if(currentBuildHash&&packetBuildHash!==currentBuildHash){h10PacketPush(warnings,'packet-build-mismatch');freshForCurrentBuild=false;}
  const expectedPointers=h10PacketExpectedPointers(contract,packet.transcriptSmokeReceipt),pointers=packet.sourcePointers||{};
  for(const k of Object.keys(expectedPointers))if(pointers[k]!==expectedPointers[k])h10PacketPush(errors,'packet-source-pointer-mismatch');
  const receiptResult=h10ValidateReceipt(contract,packet.receipt),smokeResult=h10ValidateSmokeReceipt(contract,packet.transcriptSmokeReceipt);
  if(h10PacketResultMismatch(packet.receiptValidation,receiptResult,['schema','valid','readyToDrain','finalStatus','errors','missingScenarioIds','missingStepIds','forbiddenFieldsSeen','lockedFinalStep']))h10PacketPush(errors,'packet-receipt-validation-mismatch');
  if(h10PacketResultMismatch(packet.transcriptSmokeValidation,smokeResult,['schema','valid','readyForH10Review','errors','passedFixtures','failedFixtures','blockedFixtures','missingFixtureIds','mismatchedFixtureIds','forbiddenFieldsSeen']))h10PacketPush(errors,'packet-smoke-validation-mismatch');
  const expectedTranscript=h10TranscriptLinesFromReceipt(contract,packet.receipt);
  if(packet.reviewTranscript!==expectedTranscript)h10PacketPush(errors,'packet-transcript-mismatch');
  const expectedSummary=h10PacketExpectedSummary(contract,items,packet,receiptResult,smokeResult);
  if(!h10PacketSameJSON(packet.summary,expectedSummary))h10PacketPush(errors,'packet-summary-mismatch');
  const forbidden=[...new Set((((((contract||{}).reviewKit||{}).evidenceTracker||{}).storage||{}).forbiddenFields||[]).concat(((((h10ReviewTranscript(contract)||{}).runtimeAssertionReceiptTemplate||{}).redactionRules||{}).forbiddenFields)||[]))];
  const seen=h10ScanForbidden(packet,forbidden,'',[]);
  if(seen.length)h10PacketPush(errors,'forbidden-privacy-field');
  const valid=errors.length===0,ready=valid&&freshForCurrentBuild&&!!receiptResult.readyToDrain&&!!smokeResult.readyForH10Review&&!!expectedSummary.finalLocalDecisionRecorded;
  return {schema:'h10-local-review-packet-validation-v1',valid:valid,readyForAppDesignReview:ready,freshForCurrentBuild:freshForCurrentBuild,packetBuildHash:packetBuildHash,currentBuildHash:currentBuildHash,errors:errors,warnings:warnings,receiptReadyToDrain:!!receiptResult.readyToDrain,smokeReadyForH10Review:!!smokeResult.readyForH10Review,summary:expectedSummary,forbiddenFieldsSeen:seen,checkedAt:new Date().toISOString()};
}
function h10ValidatePacketText(contract,items,text){
  const raw=String(text||'').trim();
  if(!raw)return {schema:'h10-local-review-packet-validation-v1',valid:false,readyForAppDesignReview:false,errors:['empty-packet-json'],warnings:[],checkedAt:new Date().toISOString()};
  try{return h10ValidateReviewPacket(contract,items,JSON.parse(raw));}
  catch(e){return {schema:'h10-local-review-packet-validation-v1',valid:false,readyForAppDesignReview:false,errors:['invalid-json'],warnings:[String((e&&e.message)||e||'JSON parse failed')],checkedAt:new Date().toISOString()};}
}
function h10PacketValidationSummaryText(result){
  result=result||{};const s=result.summary||{};
  return ['H10 packet JSON check',
    `Packet validator: ${result.valid?'valid':'needs repair'}`,
    `Ready for app/design review: ${result.readyForAppDesignReview?'yes, evidence only':'no'}`,
    `Fresh for current build: ${result.freshForCurrentBuild?'yes':'no'}`,
    `Packet build: ${result.packetBuildHash||'unavailable'}`,
    `Current build: ${result.currentBuildHash||'unavailable'}`,
    `Receipt readyToDrain: ${result.receiptReadyToDrain?'true, evidence only':'false'}`,
    `Transcript smoke readyForH10Review: ${result.smokeReadyForH10Review?'true, evidence only':'false'}`,
    Number.isFinite(s.stepDone)?`Steps: ${s.stepDone}/${s.stepTotal}`:'Steps: unavailable',
    Number.isFinite(s.scenarioDone)?`Scenario rows: ${s.scenarioDone}/${s.scenarioTotal}`:'Scenario rows: unavailable',
    `Errors: ${result.errors&&result.errors.length?result.errors.join(', '):'none'}`,
    `Warnings: ${result.warnings&&result.warnings.length?result.warnings.join(', '):'none'}`,
    `Forbidden fields seen: ${result.forbiddenFieldsSeen&&result.forbiddenFieldsSeen.length?result.forbiddenFieldsSeen.join(', '):'none'}`,
    'Boundary: local check only; no upload, no storage, no automatic H10 movement.',
    `Checked: ${result.checkedAt||new Date().toISOString()}`].join('\n');
}
function h10PacketImportResultHTML(result){
  result=result||{};const s=result.summary||{},errs=(result.errors||[]),warns=(result.warnings||[]),forbidden=(result.forbiddenFieldsSeen||[]);
  const issues=errs.concat(warns.map(w=>'warning: '+w),forbidden.map(f=>'forbidden field: '+f));
  const issueHTML=issues.length?`<ul class="h10-errors">${issues.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`:'';
  return `<div class="h10-packet-result ${result.valid?'':'h10-packet-invalid'}">
    <p class="alts-sub" style="margin:.2rem 0"><b>Packet check:</b> ${result.valid?'valid':'needs repair'}; ready for app/design review ${result.readyForAppDesignReview?'yes, evidence only':'no'}.</p>
    <p class="fc" style="margin:.15rem 0">Fresh for current build ${result.freshForCurrentBuild?'yes':'no'}${result.packetBuildHash||result.currentBuildHash?`; packet ${esc(result.packetBuildHash||'unavailable')} / current ${esc(result.currentBuildHash||'unavailable')}`:''}.</p>
    <p class="fc" style="margin:.15rem 0">Receipt readyToDrain ${result.receiptReadyToDrain?'true':'false'}; transcript smoke readyForH10Review ${result.smokeReadyForH10Review?'true':'false'}${Number.isFinite(s.stepDone)?`; steps ${s.stepDone}/${s.stepTotal}; scenario rows ${s.scenarioDone}/${s.scenarioTotal}`:''}.</p>
    ${issueHTML}
    <p class="fc" style="margin:.15rem 0">Local check only; pasted JSON is not stored or uploaded and cannot move H10.</p>
  </div>`;
}
function h10ReadPacketFile(file,done,fail){
  if(!file){if(fail)fail('No packet file selected.');return;}
  if(typeof FileReader==='undefined'){if(fail)fail('This browser cannot read local files in the workbench. Paste the JSON instead.');return;}
  const reader=new FileReader();
  reader.onload=()=>done(String(reader.result||''));
  reader.onerror=()=>{if(fail)fail('Could not read the selected packet file.');};
  reader.readAsText(file);
}
function h10PacketImportHTML(){
  return `<details class="h10-checks h10-packet-import"><summary>Check packet JSON</summary>
    <p class="alts-sub" style="margin:.35rem 0">Choose or paste a downloaded <code>h10-local-review-packet-v1</code> JSON packet, or load the current local packet, then validate it against this app's generated H10 contract. This does not store, upload, or drain H10.</p>
    <input id="h10packetfile" class="h10-file-input" type="file" accept=".json,application/json">
    <textarea id="h10packetinput" class="h10-packet-textarea" spellcheck="false" autocomplete="off" placeholder="Paste H10 review packet JSON here"></textarea>
    <p class="alts-sub h10-packet-tools" style="margin:.4rem 0 0"><button class="savebtn" id="h10packetvalidate" type="button">Validate packet JSON</button> <button class="savebtn" id="h10packetloadcurrent" type="button">Load current local packet</button> <button class="savebtn" id="h10packetsummarycopy" type="button">Copy validation summary</button> <button class="savebtn" id="h10packetclear" type="button">Clear pasted JSON</button> <span id="h10packetimportstatus">No packet checked.</span></p>
    <div id="h10packetimportout"></div>
  </details>`;
}
function h10BindPacketImportButtons(contract,items){
  const input=document.getElementById('h10packetinput'),fileInput=document.getElementById('h10packetfile'),validate=document.getElementById('h10packetvalidate'),load=document.getElementById('h10packetloadcurrent'),copy=document.getElementById('h10packetsummarycopy'),clear=document.getElementById('h10packetclear'),out=document.getElementById('h10packetimportout'),status=document.getElementById('h10packetimportstatus');
  if(!input)return;
  const runCheck=()=>{
    const result=h10ValidatePacketText(contract,items,input.value||'');
    input.dataset.lastValidation=JSON.stringify(result);
    if(out)out.innerHTML=h10PacketImportResultHTML(result);
    if(status)status.textContent=result.valid?(result.freshForCurrentBuild?'Packet JSON validated locally.':'Packet JSON validates but is stale for this build.'):'Packet JSON needs repair.';
    return result;
  };
  if(validate)validate.onclick=runCheck;
  if(fileInput)fileInput.onchange=()=>{
    const file=fileInput.files&&fileInput.files[0];
    h10ReadPacketFile(file,text=>{
      input.value=text;
      const result=runCheck();
      if(status)status.textContent=(result.valid?(result.freshForCurrentBuild?'Packet file checked locally.':'Packet file validates but is stale for this build.'):'Packet file needs repair.')+(file&&file.name?' File: '+file.name:'');
    },msg=>{if(status)status.textContent=msg;});
  };
  if(load)load.onclick=()=>{input.value=JSON.stringify(h10ReviewPacket(contract,items,h10ReadEvidence()),null,2);runCheck();};
  if(copy)copy.onclick=()=>{
    let result=null;try{result=JSON.parse(input.dataset.lastValidation||'null');}catch(e){}
    if(!result)result=runCheck();
    const text=h10PacketValidationSummaryText(result),ok=!!(navigator.clipboard&&navigator.clipboard.writeText);
    if(ok)navigator.clipboard.writeText(text).then(()=>{if(status)status.textContent='Packet validation summary copied.';}).catch(()=>{if(status)status.textContent=h4CopyEvidenceText(text)?'Packet validation summary copied.':'Copy failed; select the packet summary manually.';});
    else if(status)status.textContent=h4CopyEvidenceText(text)?'Packet validation summary copied.':'Copy failed; select the packet summary manually.';
  };
  if(clear)clear.onclick=()=>{input.value='';if(fileInput)fileInput.value='';delete input.dataset.lastValidation;if(out)out.innerHTML='';if(status)status.textContent='Packet JSON cleared; nothing stored.';};
}
function h10HandoffMemoState(contract,items){
  const packet=h10ReviewPacket(contract,items,h10ReadEvidence()),validation=h10ValidateReviewPacket(contract,items,packet),s=validation.summary||packet.summary||{},blockers=[];
  if(!validation.valid)blockers.push(`Current packet needs repair: ${validation.errors&&validation.errors.length?validation.errors.join(', '):'validator returned invalid'}.`);
  if(!validation.freshForCurrentBuild)blockers.push(`Packet is stale or missing build freshness: ${validation.warnings&&validation.warnings.length?validation.warnings.join(', '):'freshness missing'}.`);
  if(!validation.receiptReadyToDrain)blockers.push('Local receipt is not readyToDrain.');
  if(!validation.smokeReadyForH10Review)blockers.push('Runtime transcript smoke is not readyForH10Review.');
  if(!s.finalLocalDecisionRecorded)blockers.push('Final local H10 decision is not recorded.');
  if(s.missingStepIds&&s.missingStepIds.length)blockers.push(`Missing evidence steps: ${s.missingStepIds.join(', ')}.`);
  if(s.missingScenarioIds&&s.missingScenarioIds.length)blockers.push(`Missing scenario rows: ${s.missingScenarioIds.join(', ')}.`);
  return {packet:packet,validation:validation,summary:s,blockers:blockers,ready:blockers.length===0};
}
function h10HandoffMemoText(contract,items){
  const state=h10HandoffMemoState(contract,items),packet=state.packet||{},validation=state.validation||{},s=state.summary||{},errors=validation.errors||[],warnings=validation.warnings||[];
  return ['H10 app/design review memo',
    'Active handoff: H10 via docs/CONTENT-HANDOFF.md',
    `Packet schema: ${packet.schema||'unavailable'}`,
    `Current build: ${validation.currentBuildHash||'unavailable'}`,
    `Packet build: ${validation.packetBuildHash||(((packet.context||{}).buildHash)||'unavailable')}`,
    `Packet validator: ${validation.valid?'valid':'needs repair'}`,
    `Fresh for current build: ${validation.freshForCurrentBuild?'yes':'no'}`,
    `Ready for app/design review: ${validation.readyForAppDesignReview?'yes, evidence only':'no'}`,
    `Receipt readyToDrain: ${validation.receiptReadyToDrain?'true, evidence only':'false'}`,
    `Runtime transcript smoke readyForH10Review: ${validation.smokeReadyForH10Review?'true, evidence only':'false'}`,
    `Final local H10 decision recorded: ${s.finalLocalDecisionRecorded?'yes':'no'}`,
    Number.isFinite(s.stepDone)?`Steps: ${s.stepDone}/${s.stepTotal}`:'Steps: unavailable',
    Number.isFinite(s.scenarioDone)?`Scenario rows: ${s.scenarioDone}/${s.scenarioTotal}`:'Scenario rows: unavailable',
    `Errors: ${errors.length?errors.join(', '):'none'}`,
    `Warnings: ${warnings.length?warnings.join(', '):'none'}`,
    `Blockers:${state.blockers.length?'\n- '+state.blockers.join('\n- '):' none'}`,
    'Boundary: This memo is local evidence only; it is not uploaded, not server-authoritative, and does not move H10.',
    `Created: ${packet.createdAt||new Date().toISOString()}`].join('\n');
}
function h10HandoffMemoHTML(contract,items){
  const state=h10HandoffMemoState(contract,items),validation=state.validation||{},s=state.summary||{},blockers=state.blockers||[];
  const blockerHTML=blockers.length?`<ul class="h10-errors">${blockers.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`:'';
  return `<div class="h10-memo ${state.ready?'h10-memo-ready':'h10-packet-invalid'}">
    <div><b>App/design handoff memo</b><p class="alts-sub" style="margin:.25rem 0">${state.ready?'Ready to hand to app/design review as evidence.':'Still blocked for app/design review.'} This memo summarizes the current local packet and validator state.</p>
      <p class="fc" style="margin:.15rem 0">Packet validator ${validation.valid?'valid':'needs repair'}; build freshness ${validation.freshForCurrentBuild?'current':'stale or missing'}; ready for app/design review ${validation.readyForAppDesignReview?'yes, evidence only':'no'}.</p>
      <p class="fc" style="margin:.15rem 0">Receipt readyToDrain ${validation.receiptReadyToDrain?'true':'false'}; transcript smoke readyForH10Review ${validation.smokeReadyForH10Review?'true':'false'}; final local decision ${s.finalLocalDecisionRecorded?'recorded':'not recorded'}.</p>
      <p class="fc" style="margin:.15rem 0">Steps ${Number.isFinite(s.stepDone)?`${s.stepDone}/${s.stepTotal}`:'unavailable'}; scenario rows ${Number.isFinite(s.scenarioDone)?`${s.scenarioDone}/${s.scenarioTotal}`:'unavailable'}; blockers ${blockers.length||'none'}.</p>${blockerHTML}
      <p class="fc" style="margin:.15rem 0">Local evidence only; this memo is not uploaded, is not server-authoritative, and does not move H10.</p></div>
    <div class="h10-memo-actions"><button class="savebtn" id="h10handoffmemocopy" type="button">Copy review memo</button><span class="fc" id="h10handoffmemoout">Stored only on this device.</span></div>
  </div>`;
}
function h10BindHandoffMemoButtons(contract,items){
  const out=document.getElementById('h10handoffmemoout'),copy=document.getElementById('h10handoffmemocopy');
  if(copy)copy.onclick=()=>{
    const text=h10HandoffMemoText(contract,items),ok=!!(navigator.clipboard&&navigator.clipboard.writeText);
    if(ok)navigator.clipboard.writeText(text).then(()=>{if(out)out.textContent='H10 app/design review memo copied.';}).catch(()=>{if(out)out.textContent=h4CopyEvidenceText(text)?'H10 app/design review memo copied.':'Copy failed; select the memo manually.';});
    else if(out)out.textContent=h4CopyEvidenceText(text)?'H10 app/design review memo copied.':'Copy failed; select the memo manually.';
  };
}
function h10DrainDecisionState(contract,items){
  const memo=h10HandoffMemoState(contract,items),validation=memo.validation||{},s=memo.summary||{},ready=!!(memo.ready&&validation.readyForAppDesignReview);
  return {ready:ready,status:ready?'ready-for-human-drain-review':'blocked-for-human-drain-review',memo:memo,validation:validation,summary:s,blockers:memo.blockers||[],date:new Date().toISOString().slice(0,10)};
}
function h10DrainDecisionText(contract,items){
  const state=h10DrainDecisionState(contract,items),v=state.validation||{},s=state.summary||{},blockers=state.blockers||[];
  const facts=[
    `Packet validator: ${v.valid?'valid':'needs repair'}`,
    `Fresh for current build: ${v.freshForCurrentBuild?'yes':'no'}`,
    `Packet build: ${v.packetBuildHash||'unavailable'}`,
    `Current build: ${v.currentBuildHash||'unavailable'}`,
    `Receipt readyToDrain: ${v.receiptReadyToDrain?'true':'false'}`,
    `Transcript smoke readyForH10Review: ${v.smokeReadyForH10Review?'true':'false'}`,
    `Final local decision recorded: ${s.finalLocalDecisionRecorded?'yes':'no'}`,
    Number.isFinite(s.stepDone)?`Steps: ${s.stepDone}/${s.stepTotal}`:'Steps: unavailable',
    Number.isFinite(s.scenarioDone)?`Scenario rows: ${s.scenarioDone}/${s.scenarioTotal}`:'Scenario rows: unavailable'
  ];
  if(!state.ready){
    return ['H10 app/design decision draft',
      'Manual decision: DO NOT DRAIN H10 YET.',
      'Reason: the current local evidence packet is not ready for human drain review.',
      '',
      'Current validator facts:',
      ...facts.map(f=>`- ${f}`),
      '',
      `Blockers:${blockers.length?'\n- '+blockers.join('\n- '):' none reported, but readiness is false'}`,
      '',
      'Boundary: This is a local draft only. It does not edit docs/CONTENT-HANDOFF.md, does not upload evidence, and does not move H10.'].join('\n');
  }
  const drainedLine=`- ${state.date} - drained H10 after app/design review of the running provenance/source-independence surfaces. Local packet validated for build ${v.packetBuildHash||'unavailable'}; receipt readyToDrain true; transcript smoke readyForH10Review true; final local decision recorded; no server authority or data-alone drain was used.`;
  return ['H10 app/design decision draft',
    'Manual decision available: reviewer may drain H10 in docs/CONTENT-HANDOFF.md after inspecting the running app evidence.',
    '',
    'Current validator facts:',
    ...facts.map(f=>`- ${f}`),
    '',
    'Candidate drained-section line (paste only after human app/design approval):',
    drainedLine,
    '',
    'Boundary: This draft is local evidence only. It does not edit docs/CONTENT-HANDOFF.md, does not upload evidence, and does not move H10.'].join('\n');
}
function h10DrainDecisionHTML(contract,items){
  const state=h10DrainDecisionState(contract,items),v=state.validation||{},s=state.summary||{},blockers=state.blockers||[];
  const blockerHTML=blockers.length?`<ul class="h10-errors">${blockers.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`:'';
  return `<div class="h10-decision ${state.ready?'h10-decision-ready':'h10-packet-invalid'}">
    <div><b>Manual H10 decision draft</b><p class="alts-sub" style="margin:.25rem 0">${state.ready?'A reviewer can copy a candidate drained-section line after human app/design approval.':'Do not drain H10 yet; copy the blocker draft for review.'}</p>
      <p class="fc" style="margin:.15rem 0">Decision state: ${esc(state.status)}; packet ${v.valid?'valid':'needs repair'}; build ${v.freshForCurrentBuild?'current':'stale or missing'}; app/design review ${v.readyForAppDesignReview?'ready, evidence only':'not ready'}.</p>
      <p class="fc" style="margin:.15rem 0">Receipt readyToDrain ${v.receiptReadyToDrain?'true':'false'}; transcript smoke readyForH10Review ${v.smokeReadyForH10Review?'true':'false'}; final local decision ${s.finalLocalDecisionRecorded?'recorded':'not recorded'}; blockers ${blockers.length||'none'}.</p>${blockerHTML}
      <p class="fc" style="margin:.15rem 0">Local draft only; it cannot edit the handoff file, upload evidence, or move H10.</p></div>
    <div class="h10-decision-actions"><button class="savebtn" id="h10decisiondraftcopy" type="button">Copy decision draft</button><span class="fc" id="h10decisiondraftout">Stored only on this device.</span></div>
  </div>`;
}
function h10BindDrainDecisionButtons(contract,items){
  const out=document.getElementById('h10decisiondraftout'),copy=document.getElementById('h10decisiondraftcopy');
  if(copy)copy.onclick=()=>{
    const text=h10DrainDecisionText(contract,items),ok=!!(navigator.clipboard&&navigator.clipboard.writeText);
    if(ok)navigator.clipboard.writeText(text).then(()=>{if(out)out.textContent='H10 decision draft copied.';}).catch(()=>{if(out)out.textContent=h4CopyEvidenceText(text)?'H10 decision draft copied.':'Copy failed; select the draft manually.';});
    else if(out)out.textContent=h4CopyEvidenceText(text)?'H10 decision draft copied.':'Copy failed; select the draft manually.';
  };
}
function h10ClosureGateState(contract,items){
  const data=h10ReadEvidence(),stale=h10StaleEvidenceIds(contract,items,data),receipt=h10EvidenceReceipt(contract,items,data),receiptResult=h10ValidateReceipt(contract,receipt),packet=h10ReviewPacket(contract,items,data),packetResult=h10ValidateReviewPacket(contract,items,packet),memo=h10HandoffMemoState(contract,items),decision=h10DrainDecisionState(contract,items),smokeResult=packetResult.transcriptSmokeValidation||packet.transcriptSmokeValidation||{},s=packetResult.summary||packet.summary||{};
  const smokeFailures=Number.isFinite(smokeResult.failedFixtures)?smokeResult.failedFixtures:((smokeResult.failedFixtures||[]).length||0);
  const checks=[
    {id:'freshness',label:'Current-build evidence',pass:stale.count===0,detail:stale.count?`${stale.count} stale row${stale.count===1?'':'s'}: ${stale.steps.concat(stale.scenarios).join(', ')}`:`No stale local rows for ${stale.currentBuild||'the current build'}.`},
    {id:'receipt-valid',label:'Local receipt validator',pass:!!receiptResult.valid,detail:receiptResult.errors&&receiptResult.errors.length?receiptResult.errors.join(', '):'Receipt schema and rows validate.'},
    {id:'receipt-ready',label:'Receipt readyToDrain',pass:!!receiptResult.readyToDrain,detail:`finalStatus ${receiptResult.finalStatus||'unknown'}; missing steps ${(receiptResult.missingStepIds||[]).length}; missing scenarios ${(receiptResult.missingScenarioIds||[]).length}.`},
    {id:'packet-valid',label:'Review packet validator',pass:!!packetResult.valid,detail:packetResult.errors&&packetResult.errors.length?packetResult.errors.join(', '):'Review packet validates.'},
    {id:'packet-fresh',label:'Packet build freshness',pass:!!packetResult.freshForCurrentBuild,detail:`packet ${packetResult.packetBuildHash||'unavailable'} / current ${packetResult.currentBuildHash||'unavailable'}.`},
    {id:'runtime-smoke',label:'Runtime transcript smoke',pass:!!packetResult.smokeReadyForH10Review,detail:`valid ${packetResult.smokeReadyForH10Review?'and ready':'state requires review'}; fixture failures ${smokeFailures}.`},
    {id:'memo-ready',label:'App/design memo',pass:!!memo.ready,detail:memo.blockers&&memo.blockers.length?memo.blockers.join(' '):'Memo has no blockers.'},
    {id:'decision-draft',label:'Decision draft',pass:!!decision.ready,detail:`${decision.status}; final local decision ${s.finalLocalDecisionRecorded?'recorded':'not recorded'}.`}
  ];
  const blockers=checks.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
  return {schema:'h10-closure-gate-report-v1',ready:blockers.length===0,checkedAt:new Date().toISOString(),currentBuild:stale.currentBuild||h10EvidenceContext().build||'',checks:checks,blockers:blockers,summary:{stepDone:s.stepDone,stepTotal:s.stepTotal,scenarioDone:s.scenarioDone,scenarioTotal:s.scenarioTotal,receiptReadyToDrain:!!receiptResult.readyToDrain,packetReadyForAppDesignReview:!!packetResult.readyForAppDesignReview,smokeReadyForH10Review:!!packetResult.smokeReadyForH10Review,finalLocalDecisionRecorded:!!s.finalLocalDecisionRecorded},boundary:'Local closure gate report only; no upload, no server authority, and no automatic H10 movement.'};
}
function h10ClosureGateText(contract,items){
  const state=h10ClosureGateState(contract,items),s=state.summary||{};
  return ['H10 closure gate report',
    `Schema: ${state.schema}`,
    `Gate status: ${state.ready?'ready for human app/design decision':'blocked'}`,
    `Current build: ${state.currentBuild||'unavailable'}`,
    Number.isFinite(s.stepDone)?`Steps: ${s.stepDone}/${s.stepTotal}`:'Steps: unavailable',
    Number.isFinite(s.scenarioDone)?`Scenario rows: ${s.scenarioDone}/${s.scenarioTotal}`:'Scenario rows: unavailable',
    `Receipt readyToDrain: ${s.receiptReadyToDrain?'true, evidence only':'false'}`,
    `Packet readyForAppDesignReview: ${s.packetReadyForAppDesignReview?'true, evidence only':'false'}`,
    `Transcript smoke readyForH10Review: ${s.smokeReadyForH10Review?'true, evidence only':'false'}`,
    `Final local decision recorded: ${s.finalLocalDecisionRecorded?'yes':'no'}`,
    '',
    'Checks:',
    ...state.checks.map(c=>`- ${c.pass?'PASS':'BLOCK'} ${c.label}: ${c.detail}`),
    '',
    `Blockers:${state.blockers.length?'\n- '+state.blockers.join('\n- '):' none'}`,
    `Boundary: ${state.boundary}`,
    `Checked: ${state.checkedAt}`].join('\n');
}
function h10ClosureGateHTML(contract,items){
  const state=h10ClosureGateState(contract,items),s=state.summary||{};
  const rows=state.checks.map(c=>`<li><b>${c.pass?'Pass':'Block'} - ${esc(c.label)}:</b> <span class="fc">${esc(c.detail)}</span></li>`).join('');
  return `<div class="h10-gate ${state.ready?'h10-gate-ready':'h10-packet-invalid'}">
    <div><b>Closure gate report</b><p class="alts-sub" style="margin:.25rem 0">${state.ready?'All local H10 gates are green for human app/design decision.':'H10 is still blocked; review the failed gate rows.'}</p>
      <p class="fc" style="margin:.15rem 0">Steps ${Number.isFinite(s.stepDone)?`${s.stepDone}/${s.stepTotal}`:'unavailable'}; scenario rows ${Number.isFinite(s.scenarioDone)?`${s.scenarioDone}/${s.scenarioTotal}`:'unavailable'}; receipt ${s.receiptReadyToDrain?'ready':'not ready'}; packet ${s.packetReadyForAppDesignReview?'ready':'not ready'}; smoke ${s.smokeReadyForH10Review?'ready':'not ready'}; final ${s.finalLocalDecisionRecorded?'recorded':'not recorded'}.</p>
      <ul class="h10-errors h10-gate-list">${rows}</ul>
      <p class="fc" style="margin:.15rem 0">Local report only; it cannot edit the handoff file, upload evidence, or move H10.</p></div>
    <div class="h10-gate-actions"><button class="savebtn" id="h10gatecopy" type="button">Copy gate report</button><span class="fc" id="h10gateout">Stored only on this device.</span></div>
  </div>`;
}
function h10BindClosureGateButtons(contract,items){
  const out=document.getElementById('h10gateout'),copy=document.getElementById('h10gatecopy');
  if(copy)copy.onclick=()=>{
    const text=h10ClosureGateText(contract,items),ok=!!(navigator.clipboard&&navigator.clipboard.writeText);
    if(ok)navigator.clipboard.writeText(text).then(()=>{if(out)out.textContent='H10 closure gate report copied.';}).catch(()=>{if(out)out.textContent=h4CopyEvidenceText(text)?'H10 closure gate report copied.':'Copy failed; select the report manually.';});
    else if(out)out.textContent=h4CopyEvidenceText(text)?'H10 closure gate report copied.':'Copy failed; select the report manually.';
  };
}
function h10ClosureBundle(contract,items){
  const data=h10ReadEvidence(),ctx=h10EvidenceContext(),receipt=h10EvidenceReceipt(contract,items,data),receiptValidation=h10ValidateReceipt(contract,receipt),packet=h10ReviewPacket(contract,items,data),packetValidation=h10ValidateReviewPacket(contract,items,packet),gate=h10ClosureGateState(contract,items);
  const bundleReady=!!(gate.ready&&packetValidation.readyForAppDesignReview&&receiptValidation.readyToDrain);
  return {
    schema:'h10-local-closure-bundle-v1',
    createdAt:new Date().toISOString(),
    channel:'local-review',
    activeHandoff:'H10',
    handoffFile:'docs/CONTENT-HANDOFF.md',
    localOnly:true,
    noServerAuthority:true,
    h10DrainableFromBundleAlone:false,
    appDesignOwnsHandoff:true,
    readyForHumanAppDesignReview:bundleReady,
    context:{
      workbenchChannel:ctx.channel,
      hash:ctx.hash,
      buildHash:ctx.build,
      contractStatus:(((contract||{}).drainContract||{}).status)||((contract||{}).status)||'pending-app-integration',
      evidenceItemCount:(items||[]).length,
      scenarioRowCount:h10ScenarioIds(contract).length
    },
    summary:{
      gateReady:!!gate.ready,
      receiptValid:!!receiptValidation.valid,
      receiptReadyToDrain:!!receiptValidation.readyToDrain,
      packetValid:!!packetValidation.valid,
      packetFreshForCurrentBuild:!!packetValidation.freshForCurrentBuild,
      packetReadyForAppDesignReview:!!packetValidation.readyForAppDesignReview,
      smokeReadyForH10Review:!!packetValidation.smokeReadyForH10Review,
      finalLocalDecisionRecorded:!!(((packetValidation.summary||{}).finalLocalDecisionRecorded)),
      blockerCount:(gate.blockers||[]).length
    },
    sourcePointers:{
      contractPointer:'app/data/index.json.provenanceDisplayContract',
      handoffPointer:'docs/CONTENT-HANDOFF.md',
      receiptSchema:receipt.schema,
      reviewPacketSchema:packet.schema,
      gateReportSchema:gate.schema
    },
    artifacts:{
      closureGateReport:gate,
      closureGateText:h10ClosureGateText(contract,items),
      localReceipt:receipt,
      receiptValidation:receiptValidation,
      reviewPacket:packet,
      reviewPacketValidation:packetValidation,
      handoffMemoText:h10HandoffMemoText(contract,items),
      decisionDraftText:h10DrainDecisionText(contract,items),
      evidenceSummaryText:h10EvidenceSummary(contract,items,data),
      reviewTranscript:h10TranscriptLinesFromReceipt(contract,receipt)
    },
    boundary:'Local closure bundle only. It may support human app/design review, but it is not uploaded, not server-authoritative, and cannot move H10 from docs/CONTENT-HANDOFF.md by itself.'
  };
}
function h10ClosureBundleSummaryText(contract,items){
  const bundle=h10ClosureBundle(contract,items),s=bundle.summary||{},gate=((bundle.artifacts||{}).closureGateReport)||{};
  return ['H10 local closure bundle',
    `Schema: ${bundle.schema}`,
    `Ready for human app/design review: ${bundle.readyForHumanAppDesignReview?'yes, evidence only':'no'}`,
    `Build: ${((bundle.context||{}).buildHash)||'unavailable'}`,
    `Gate ready: ${s.gateReady?'yes':'no'}`,
    `Receipt valid: ${s.receiptValid?'yes':'no'}`,
    `Receipt readyToDrain: ${s.receiptReadyToDrain?'true, evidence only':'false'}`,
    `Packet valid: ${s.packetValid?'yes':'no'}`,
    `Packet fresh for current build: ${s.packetFreshForCurrentBuild?'yes':'no'}`,
    `Packet readyForAppDesignReview: ${s.packetReadyForAppDesignReview?'true, evidence only':'false'}`,
    `Transcript smoke readyForH10Review: ${s.smokeReadyForH10Review?'true, evidence only':'false'}`,
    `Final local decision recorded: ${s.finalLocalDecisionRecorded?'yes':'no'}`,
    `Blockers: ${gate.blockers&&gate.blockers.length?gate.blockers.join('; '):'none'}`,
    'Artifacts included: closure gate report, local receipt, receipt validation, review packet, packet validation, handoff memo text, decision draft text, evidence summary, review transcript.',
    `Boundary: ${bundle.boundary}`,
    `Created: ${bundle.createdAt}`].join('\n');
}
function h10ClosureBundleHTML(contract,items){
  const bundle=h10ClosureBundle(contract,items),s=bundle.summary||{},gate=((bundle.artifacts||{}).closureGateReport)||{},ready=!!bundle.readyForHumanAppDesignReview;
  const blockers=gate.blockers&&gate.blockers.length?`<ul class="h10-errors">${gate.blockers.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`:'';
  return `<div class="h10-bundle ${ready?'h10-bundle-ready':'h10-packet-invalid'}">
    <div><b>Local closure bundle</b><p class="alts-sub" style="margin:.25rem 0">${ready?'Bundle is ready to hand to app/design review as evidence.':'Bundle is collecting the current H10 closure state; blockers remain.'}</p>
      <p class="fc" style="margin:.15rem 0">Gate ${s.gateReady?'ready':'blocked'}; receipt ${s.receiptReadyToDrain?'ready':'not ready'}; packet ${s.packetReadyForAppDesignReview?'ready':'not ready'}; smoke ${s.smokeReadyForH10Review?'ready':'not ready'}; final ${s.finalLocalDecisionRecorded?'recorded':'not recorded'}.</p>${blockers}
      <p class="fc" style="margin:.15rem 0">Includes the closure gate report, local receipt, validators, packet, memo, decision draft, evidence summary, and transcript. Local bundle only; no upload, no server authority, no automatic H10 movement.</p></div>
    <div class="h10-bundle-actions"><button class="savebtn" id="h10bundlecopy" type="button">Copy bundle summary</button> <button class="savebtn" id="h10bundledownload" type="button">Download closure bundle JSON</button><span class="fc" id="h10bundleout">Stored only on this device.</span></div>
  </div>`;
}
function h10DownloadClosureBundle(contract,items){
  const day=new Date().toISOString().slice(0,10),payload=h10ClosureBundle(contract,items);
  const b=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=el('a',{href:URL.createObjectURL(b),download:`h10-local-closure-bundle-${day}.json`});a.click();
}
function h10BindClosureBundleButtons(contract,items){
  const out=document.getElementById('h10bundleout'),copy=document.getElementById('h10bundlecopy'),download=document.getElementById('h10bundledownload');
  if(copy)copy.onclick=()=>{
    const text=h10ClosureBundleSummaryText(contract,items),ok=!!(navigator.clipboard&&navigator.clipboard.writeText);
    if(ok)navigator.clipboard.writeText(text).then(()=>{if(out)out.textContent='H10 closure bundle summary copied.';}).catch(()=>{if(out)out.textContent=h4CopyEvidenceText(text)?'H10 closure bundle summary copied.':'Copy failed; select the bundle summary manually.';});
    else if(out)out.textContent=h4CopyEvidenceText(text)?'H10 closure bundle summary copied.':'Copy failed; select the bundle summary manually.';
  };
  if(download)download.onclick=()=>{h10DownloadClosureBundle(contract,items);if(out)out.textContent='H10 local closure bundle downloaded.';};
}
function h10ReviewPacketSummaryText(contract,items){
  const packet=h10ReviewPacket(contract,items,h10ReadEvidence()),s=packet.summary||{},validation=h10ValidateReviewPacket(contract,items,packet);
  return ['H10 local review packet',
    `Schema: ${packet.schema}`,
    `Packet validator: ${validation.valid?'valid':'needs repair'}; readyForAppDesignReview ${validation.readyForAppDesignReview?'true, evidence only':'false'}`,
    `Build: ${packet.context.buildHash||'blank'}`,
    `Steps: ${s.stepDone}/${s.stepTotal}`,
    `Scenario rows: ${s.scenarioDone}/${s.scenarioTotal}`,
    `Receipt validator: ${s.receiptValid?'valid':'needs repair'}; readyToDrain ${s.readyToDrainLocalReceipt?'true, evidence only':'false'}`,
    `Transcript smoke: ${s.transcriptSmokeValid?'valid':'needs repair'}; readyForH10Review ${s.smokeReadyForH10Review?'true, evidence only':'false'}`,
    `Final local decision recorded: ${s.finalLocalDecisionRecorded?'yes':'no'}`,
    `Missing steps: ${s.missingStepIds&&s.missingStepIds.length?s.missingStepIds.join(', '):'none'}`,
    `Missing scenario rows: ${s.missingScenarioIds&&s.missingScenarioIds.length?s.missingScenarioIds.join(', '):'none'}`,
    `Packet validator errors: ${validation.errors.length?validation.errors.join(', '):'none'}`,
    'Boundary: local packet only; no upload; no server authority; app/design decides H10 in docs/CONTENT-HANDOFF.md.',
    `Created: ${packet.createdAt}`].join('\n');
}
function h10ReviewPacketHTML(contract,items){
  const packet=h10ReviewPacket(contract,items,h10ReadEvidence()),s=packet.summary||{},validation=h10ValidateReviewPacket(contract,items,packet),ready=validation.readyForAppDesignReview;
  const missing=[(s.missingStepIds||[]).length?`${s.missingStepIds.length} step${s.missingStepIds.length===1?'':'s'}`:'',(s.missingScenarioIds||[]).length?`${s.missingScenarioIds.length} scenario row${s.missingScenarioIds.length===1?'':'s'}`:''].filter(Boolean).join(', ');
  const errs=validation.errors.length?`<ul class="h10-errors">${validation.errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`:'';
  return `<div class="h10-packet ${validation.valid?'':'h10-packet-invalid'}">
    <div><b>Local review packet</b><p class="alts-sub" style="margin:.25rem 0">${ready?'Packet is ready for app/design review.':'Packet is collecting the current local evidence state.'} ${missing?`Missing: ${esc(missing)}.`:'No prerequisite rows are missing.'}</p>
      <p class="fc" style="margin:.15rem 0">Steps ${s.stepDone}/${s.stepTotal}; scenario rows ${s.scenarioDone}/${s.scenarioTotal}; receipt ${s.receiptValid?'valid':'needs repair'}; transcript smoke ${s.transcriptSmokeValid?'valid':'needs repair'}; final local decision ${s.finalLocalDecisionRecorded?'recorded':'not recorded'}.</p>
      <p class="fc" style="margin:.15rem 0">Packet validator ${validation.valid?'valid':'needs repair'}; ready for app/design review ${validation.readyForAppDesignReview?'yes, evidence only':'no'}.</p>${errs}
      <p class="fc" style="margin:.15rem 0">Local packet only; no upload, no server authority, and no automatic H10 drain.</p></div>
    <div class="h10-packet-actions"><button class="savebtn" id="h10reviewpacketcopy" type="button">Copy packet summary</button> <button class="savebtn" id="h10reviewpacketdownload" type="button">Download packet JSON</button><span class="fc" id="h10reviewpacketout">Stored only on this device.</span></div>
  </div>`;
}
function h10DownloadReviewPacket(contract,items){
  const day=new Date().toISOString().slice(0,10),payload=h10ReviewPacket(contract,items,h10ReadEvidence());
  const b=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=el('a',{href:URL.createObjectURL(b),download:`h10-local-review-packet-${day}.json`});a.click();
}
function h10BindReviewPacketButtons(contract,items){
  const out=document.getElementById('h10reviewpacketout'),copy=document.getElementById('h10reviewpacketcopy'),download=document.getElementById('h10reviewpacketdownload');
  if(copy)copy.onclick=()=>{
    const text=h10ReviewPacketSummaryText(contract,items),ok=!!(navigator.clipboard&&navigator.clipboard.writeText);
    if(ok)navigator.clipboard.writeText(text).then(()=>{if(out)out.textContent='H10 review packet summary copied.';}).catch(()=>{if(out)out.textContent=h4CopyEvidenceText(text)?'H10 review packet summary copied.':'Copy failed; select the packet text manually.';});
    else if(out)out.textContent=h4CopyEvidenceText(text)?'H10 review packet summary copied.':'Copy failed; select the packet text manually.';
  };
  if(download)download.onclick=()=>{h10DownloadReviewPacket(contract,items);if(out)out.textContent='H10 local review packet downloaded.';};
}
function h10DownloadEvidence(contract,items){
  const day=new Date().toISOString().slice(0,10),payload=h10EvidenceReceipt(contract,items,h10ReadEvidence());
  const b=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=el('a',{href:URL.createObjectURL(b),download:`h10-local-evidence-${day}.json`});a.click();
}
function h10RouteLinks(routes){
  routes=(routes||[]).filter(Boolean);
  return routes.length?`<div class="facets" style="margin:.35rem 0">${routes.map(r=>`<a class="facet" href="${esc(r)}">${esc(r)}</a>`).join('')}</div>`:'';
}
function h10ScenarioDetail(s,open){
  s=s||{};const t=s.target||{},e=s.expected||{},summary=t.summary||{};
  const sourceBits=[Number.isFinite(summary.factCount)?`${summary.factCount} facts`:'',Number.isFinite(summary.sourceDomainCount)?`${summary.sourceDomainCount} source domain${summary.sourceDomainCount===1?'':'s'}`:'',summary.primarySource?`primary ${summary.primarySource}`:''].filter(Boolean);
  const routes=t.routes?Object.values(t.routes).filter(Boolean):(s.route?[s.route]:[]);
  return `<details class="h10-scenario"${open?' open':''}><summary><code>${esc(s.id||'scenario')}</code>${t.name?`: ${esc(t.name)}`:''}</summary>
    <p class="alts-sub" style="margin:.35rem 0 .15rem"><b>Surface:</b> ${esc(s.surface||'unknown')}${e.chip?` - expected chip ${esc(e.chip)}`:''}${e.confidenceMode?` - mode ${esc(e.confidenceMode)}`:''}</p>
    ${sourceBits.length?`<p class="alts-sub" style="margin:.2rem 0"><b>Generated summary:</b> ${esc(sourceBits.join(', '))}</p>`:''}
    ${h10RouteLinks(routes)}
    ${h4QaList('Must show',s.mustShow)}
    ${h4QaList('Must not',s.mustNot)}
  </details>`;
}
function h10SurfaceGroupDetail(group,scenarioById,open){
  group=group||{};const ids=(group.scenarioIds||[]).filter(Boolean);
  return `<details class="h10-surface"${open?' open':''}><summary>${esc(group.surface||group.id||'surface')} (${ids.length})</summary>
    <p class="alts-sub" style="margin:.35rem 0 .15rem"><b>Placement:</b> ${esc(group.placement||'unlisted')}</p>
    <p class="alts-sub" style="margin:.2rem 0">${esc(group.primaryCopy||'')}</p>
    ${group.detailCopy?`<p class="alts-sub" style="margin:.2rem 0">${esc(group.detailCopy)}</p>`:''}
    ${h10RouteLinks(group.routes)}
    ${h4QaList('Pass when',group.passWhen)}
    ${h4QaList('Must not',group.mustNot)}
    ${ids.map((id,i)=>h10ScenarioDetail(scenarioById[id],open&&i===0)).join('')}
  </details>`;
}
function h10ContractSelfCheck(contract){
  contract=contract||{};const matrix=contract.reviewMatrix||{},kit=contract.reviewKit||{},tracker=kit.evidenceTracker||{};
  const groups=kit.surfaceGroups||[],scenarios=matrix.scenarios||[],surfaces=matrix.surfaces||[],items=tracker.items||[];
  const pass=!!(contract.renderRules&&contract.trustLensControl&&matrix.surfaces&&matrix.scenarios&&contract.drainContract&&kit.evidenceTracker&&groups.length&&scenarios.length&&items.length);
  return {pass:pass,summary:pass?`${groups.length} H10 surface groups, ${scenarios.length} scenario rows, ${surfaces.length} review surfaces, and ${items.length} local evidence items are available in the generated contract.`:'The generated H10 contract is missing a review kit, matrix, Trust Lens rule, or evidence tracker.'};
}
function h10BuildFreshnessHTML(contract,items,data){
  const stale=h10StaleEvidenceIds(contract,items,data),current=stale.currentBuild||'unavailable',names=stale.steps.concat(stale.scenarios);
  if(!stale.count)return `<div class="h10-buildfresh h10-buildfresh-ok"><b>Build freshness</b><p class="fc" style="margin:.15rem 0">Current build ${esc(current)}; no stale local H10 rows recorded in this browser.</p></div>`;
  return `<div class="h10-buildfresh h10-packet-invalid"><div><b>Build freshness</b><p class="alts-sub" style="margin:.2rem 0">${stale.count} local H10 row${stale.count===1?' was':'s were'} recorded against another build. Refresh the relevant routes or clear stale rows before the final H10 decision.</p><p class="fc" style="margin:.15rem 0">Current build ${esc(current)}; stale rows: ${esc(names.join(', '))}.</p></div><div class="h10-buildfresh-actions"><button class="savebtn" id="h10clearstale" type="button">Clear stale rows</button></div></div>`;
}
function h10EvidenceChecklist(contract,items){
  let data=h10ReadEvidence();const finalId=h10FinalEvidenceId(contract),ready=h10EvidenceReady(contract,items,data);
  if(!ready&&data.steps&&data.steps[finalId]){delete data.steps[finalId];h10WriteEvidence(data);}
  data=h10ReadEvidence();
  const scenarios=((((contract||{}).reviewMatrix||{}).scenarios)||[]),stepDone=(items||[]).filter(i=>data.steps&&data.steps[i.id]&&h10EvidenceBuildFresh(data.steps[i.id])).length,scenarioDone=scenarios.filter(s=>data.scenarios&&data.scenarios[s.id]&&h10EvidenceBuildFresh(data.scenarios[s.id])).length;
  return `<div id="h10evidence" class="h10-evidence" style="margin-top:.6rem">
    <p class="alts-sub" style="margin:.25rem 0"><b>Local H10 evidence tracker:</b> <span id="h10evidencecount">${stepDone}/${items.length}</span> current-build steps and <span id="h10scenarioCount">${scenarioDone}/${scenarios.length}</span> current-build scenario rows checked in this browser. This records what was walked; it does not drain H10 by itself.</p>
    <p class="alts-sub" id="h10evidencestatus" style="margin:.2rem 0">${esc(h10EvidenceStatus(contract,items,data))}</p>
    <div id="h10buildfresh">${h10BuildFreshnessHTML(contract,items,data)}</div>
    <div id="h10reviewqueue">${h10ReviewQueueHTML(contract,items,data)}</div>
    <div id="h10validation">${h10ValidationHTML(contract,items)}</div>
    <div id="h10transcript">${h10TranscriptHTML(contract,items)}</div>
    <div id="h10reviewpacket">${h10ReviewPacketHTML(contract,items)}</div>
    <div id="h10packetimport">${h10PacketImportHTML()}</div>
    <div id="h10handoffmemo">${h10HandoffMemoHTML(contract,items)}</div>
    <div id="h10decisiondraft">${h10DrainDecisionHTML(contract,items)}</div>
    <div id="h10closuregate">${h10ClosureGateHTML(contract,items)}</div>
    <div id="h10closurebundle">${h10ClosureBundleHTML(contract,items)}</div>
    <div id="h10routewalker">${h10RouteWalkerHTML(contract,items,data)}</div>
    <details class="h10-checks" open><summary>Scenario rows (${scenarios.length})</summary><div class="h10-checkgrid">${scenarios.map(s=>`<label class="alts-sub h10-check"><input type="checkbox" data-h10s="${esc(s.id)}"${data.scenarios&&data.scenarios[s.id]?' checked':''}> <span>${esc(h10ScenarioLabel(s))} <span class="fc h10-scenario-stamp" data-h10sstamp="${esc(s.id)}">${data.scenarios&&data.scenarios[s.id]?`Recorded ${esc(h10EvidenceStamp(data.scenarios[s.id]))}`:''}</span></span></label>`).join('')}</div></details>
    <details class="h10-checks" open><summary>Evidence steps (${items.length})</summary><div class="h10-checkgrid">${(items||[]).map(i=>`<label class="alts-sub h10-check"><input type="checkbox" data-h10e="${esc(i.id)}"${data.steps&&data.steps[i.id]?' checked':''}${i.final&&!ready?' disabled':''}> <span>${esc(i.label||i.id)} <span class="fc h10-evidence-stamp" data-h10estamp="${esc(i.id)}">${data.steps&&data.steps[i.id]?`Recorded ${esc(h10EvidenceStamp(data.steps[i.id]))}`:''}</span></span></label>`).join('')}</div></details>
    <p class="alts-sub" style="margin:.45rem 0 0"><button class="savebtn" id="h10evidencecopy" type="button">Copy H10 evidence summary</button> <button class="savebtn" id="h10evidencedownload" type="button">Download H10 JSON receipt</button> <button class="savebtn" id="h10evidenceclear" type="button">Clear H10 local checks</button> <span id="h10evidenceout">Stored only on this device.</span></p>
  </div>`;
}
function h10UpdateEvidenceState(contract,items){
  let data=h10ReadEvidence();const finalId=h10FinalEvidenceId(contract),ready=h10EvidenceReady(contract,items,data);
  if(!ready&&data.steps&&data.steps[finalId]){delete data.steps[finalId];h10WriteEvidence(data);data=h10ReadEvidence();}
  const scenarios=((((contract||{}).reviewMatrix||{}).scenarios)||[]),count=document.getElementById('h10evidencecount'),scount=document.getElementById('h10scenarioCount'),status=document.getElementById('h10evidencestatus'),freshness=document.getElementById('h10buildfresh'),queue=document.getElementById('h10reviewqueue'),validation=document.getElementById('h10validation'),transcript=document.getElementById('h10transcript'),packet=document.getElementById('h10reviewpacket'),memo=document.getElementById('h10handoffmemo'),decision=document.getElementById('h10decisiondraft'),gate=document.getElementById('h10closuregate'),bundle=document.getElementById('h10closurebundle'),walker=document.getElementById('h10routewalker'),final=document.querySelector(`input[data-h10e="${finalId}"]`);
  if(count)count.textContent=`${(items||[]).filter(i=>data.steps&&data.steps[i.id]&&h10EvidenceBuildFresh(data.steps[i.id])).length}/${(items||[]).length}`;
  if(scount)scount.textContent=`${scenarios.filter(s=>data.scenarios&&data.scenarios[s.id]&&h10EvidenceBuildFresh(data.scenarios[s.id])).length}/${scenarios.length}`;
  if(status)status.textContent=h10EvidenceStatus(contract,items,data);
  if(freshness)freshness.innerHTML=h10BuildFreshnessHTML(contract,items,data);
  if(queue)queue.innerHTML=h10ReviewQueueHTML(contract,items,data);
  if(validation)validation.innerHTML=h10ValidationHTML(contract,items);
  if(transcript)transcript.innerHTML=h10TranscriptHTML(contract,items);
  if(packet)packet.innerHTML=h10ReviewPacketHTML(contract,items);
  if(memo)memo.innerHTML=h10HandoffMemoHTML(contract,items);
  if(decision)decision.innerHTML=h10DrainDecisionHTML(contract,items);
  if(gate)gate.innerHTML=h10ClosureGateHTML(contract,items);
  if(bundle)bundle.innerHTML=h10ClosureBundleHTML(contract,items);
  if(walker)walker.innerHTML=h10RouteWalkerHTML(contract,items,data);
  document.querySelectorAll('input[data-h10e]').forEach(input=>{const id=input.getAttribute('data-h10e');input.checked=!!(data.steps&&data.steps[id]);});
  document.querySelectorAll('input[data-h10s]').forEach(input=>{const id=input.getAttribute('data-h10s');input.checked=!!(data.scenarios&&data.scenarios[id]);});
  document.querySelectorAll('[data-h10estamp]').forEach(stamp=>{const id=stamp.getAttribute('data-h10estamp'),value=data.steps&&data.steps[id];stamp.textContent=value?(h10EvidenceBuildFresh(value)?'Recorded ':'Stale ')+h10EvidenceStampWithFreshness(value):'';});
  document.querySelectorAll('[data-h10sstamp]').forEach(stamp=>{const id=stamp.getAttribute('data-h10sstamp'),value=data.scenarios&&data.scenarios[id];stamp.textContent=value?(h10EvidenceBuildFresh(value)?'Recorded ':'Stale ')+h10EvidenceStampWithFreshness(value):'';});
  if(final){final.disabled=!ready;if(!ready)final.checked=false;}
  h10BindTranscriptButtons(contract,items);
  h10BindReviewPacketButtons(contract,items);
  h10BindPacketImportButtons(contract,items);
  h10BindHandoffMemoButtons(contract,items);
  h10BindDrainDecisionButtons(contract,items);
  h10BindClosureGateButtons(contract,items);
  h10BindClosureBundleButtons(contract,items);
}
function h10BindTranscriptButtons(contract,items){
  const out=document.getElementById('h10transcriptout'),copy=document.getElementById('h10transcriptcopy'),download=document.getElementById('h10transcriptdownload');
  if(copy)copy.onclick=()=>{
    const text=h10TranscriptLines(contract,items,h10ReadEvidence()),ok=!!(navigator.clipboard&&navigator.clipboard.writeText);
    if(ok)navigator.clipboard.writeText(text).then(()=>{if(out)out.textContent='H10 review transcript copied.';}).catch(()=>{if(out)out.textContent=h4CopyEvidenceText(text)?'H10 review transcript copied.':'Copy failed; select the transcript manually.';});
    else if(out)out.textContent=h4CopyEvidenceText(text)?'H10 review transcript copied.':'Copy failed; select the transcript manually.';
  };
  if(download)download.onclick=()=>{h10DownloadTranscript(contract,items);if(out)out.textContent='H10 review transcript downloaded.';};
}
function h10BindEvidence(contract,items){
  const root=document.getElementById('h10evidence');if(!root)return;
  const out=document.getElementById('h10evidenceout');
  root.onchange=e=>{
    const t=e.target;if(!t||!t.getAttribute)return;
    const data=h10ReadEvidence();
    if(t.hasAttribute('data-h10s')){
      const id=t.getAttribute('data-h10s');if(t.checked)data.scenarios[id]=h10EvidenceRecord();else delete data.scenarios[id];
    }else if(t.hasAttribute('data-h10e')){
      const id=t.getAttribute('data-h10e');
      if(id===h10FinalEvidenceId(contract)&&!h10EvidenceReady(contract,items,data)){t.checked=false;h10UpdateEvidenceState(contract,items);if(out)out.textContent='Record every prerequisite and scenario row before the final H10 decision.';return;}
      if(t.checked)data.steps[id]=h10EvidenceRecord();else delete data.steps[id];
    }else return;
    h10WriteEvidence(data);h10UpdateEvidenceState(contract,items);if(out)out.textContent='Local H10 check updated.';
  };
  const copy=document.getElementById('h10evidencecopy');
  if(copy)copy.onclick=()=>{
    const text=h10EvidenceSummary(contract,items,h10ReadEvidence()),ok=!!(navigator.clipboard&&navigator.clipboard.writeText);
    if(ok)navigator.clipboard.writeText(text).then(()=>{if(out)out.textContent='H10 evidence summary copied.';}).catch(()=>{if(out)out.textContent=h4CopyEvidenceText(text)?'H10 evidence summary copied.':'Copy failed; select the checklist text manually.';});
    else if(out)out.textContent=h4CopyEvidenceText(text)?'H10 evidence summary copied.':'Copy failed; select the checklist text manually.';
  };
  const download=document.getElementById('h10evidencedownload');
  if(download)download.onclick=()=>{h10DownloadEvidence(contract,items);if(out)out.textContent='H10 evidence receipt downloaded as JSON.';};
  const clear=document.getElementById('h10evidenceclear');
  if(clear)clear.onclick=()=>{h10WriteEvidence({steps:{},scenarios:{}});root.querySelectorAll('input[data-h10e],input[data-h10s]').forEach(i=>{i.checked=false;});h10UpdateEvidenceState(contract,items);if(out)out.textContent='H10 local checks cleared.';};
  root.onclick=e=>{
    const t=e.target;if(!t||!t.getAttribute)return;
    if(t.id==='h10clearstale'||t.hasAttribute('data-h10clearstale')){
      const stale=h10ClearStaleEvidence(contract,items);
      h10UpdateEvidenceState(contract,items);
      if(out)out.textContent=stale.count?`Cleared ${stale.count} stale H10 row${stale.count===1?'':'s'}; refresh current-build evidence before final review.`:'No stale H10 rows to clear.';
      return;
    }
    if(!t.hasAttribute('data-h10recordscenario'))return;
    const id=t.getAttribute('data-h10recordscenario'),result=h10RecordScenarioEvidence(contract,items,id);
    root.querySelectorAll(`input[data-h10s="${id}"]`).forEach(i=>{i.checked=true;});
    h10UpdateEvidenceState(contract,items);
    if(out)out.textContent=result.stepRecorded&&result.item?`Recorded ${id}; ${result.item.label||result.item.id} is now recorded.`:`Recorded ${id}.`;
  };
  root.addEventListener('click',e=>{
    const t=e.target;if(!t||!t.getAttribute||!t.hasAttribute('data-h10recordstep'))return;
    const id=t.getAttribute('data-h10recordstep'),result=h10RecordStepEvidence(contract,items,id);
    h10UpdateEvidenceState(contract,items);
    if(out)out.textContent=result.ok?`Recorded ${result.item.label||result.item.id}.`:result.reason;
  });
  h10UpdateEvidenceState(contract,items);
}
function initH10WorkbenchQA(){
  const box=document.getElementById('h10qa');if(!box)return;
  if(!chDev()){
    box.innerHTML='<p class="alts-sub" style="margin:.45rem 0 0">Turn on the workbench to open the evidence display checklist.</p>';
    return;
  }
  const contract=h10Contract();
  if(!contract){
    box.innerHTML='<p class="alts-sub" style="margin:.45rem 0 0">The evidence display checklist could not load. Until it does, the app should make the narrowest claim the sources support.</p>';
    return;
  }
  const kit=contract.reviewKit||{},matrix=contract.reviewMatrix||{},groups=kit.surfaceGroups||[],scenarios=matrix.scenarios||[],scenarioById=h10ScenarioById(contract),items=h10EvidenceItems(contract),self=h10ContractSelfCheck(contract),trust=contract.trustLensControl||{},coverage=kit.coverage||{};
  const quick=(kit.quickStart||[]).length?h4QaList('Review order',kit.quickStart):'';
  const routes=[...new Set(groups.flatMap(g=>g.routes||[]))].filter(Boolean);
  const chips=[...new Set(scenarios.map(s=>s.expected&&s.expected.chip).filter(Boolean))];
  const groupList=groups.length?`<div class="h10-surface-list" style="margin-top:.6rem"><p class="alts-sub" style="margin:.25rem 0"><b>Pages to review:</b> ${groups.length} group${groups.length===1?'':'s'}.</p>${groups.map((g,i)=>h10SurfaceGroupDetail(g,scenarioById,i===0)).join('')}</div>`:'';
  const evidenceList=h10EvidenceChecklist(contract,items);
  const fixtureSelfCheck=h10FixtureSelfCheckHTML(contract);
  const smokeSelfCheck=h10SmokeFixtureSelfCheckHTML(contract);
  const runtimeSmoke=h10RuntimeSmokeHTML(contract);
  box.innerHTML=`<p class="alts-sub" style="margin:.45rem 0 0"><b>The check is ready.</b> Review the source labels on each named page. A data file alone is <b>${contract.h10DrainableFromDataAlone?'enough':'not enough'}</b> to finish this review.</p>
    <details class="h10-full-checklist" style="margin-top:.55rem"><summary>Open the full evidence checklist</summary><div class="facets" style="margin-top:.45rem"><span class="facet" style="cursor:default">Labels to confirm</span>${chips.map(c=>`<span class="facet" style="cursor:default">${esc(c)}</span>`).join('')}</div>
    ${h10RouteLinks(routes)}
    <p class="alts-sub" style="margin:.45rem 0 0"><b>Trust Lens:</b> starts ${esc(trust.default||'unlisted')}. Its rule is <code>${esc(trust.keepRule||'unlisted')}</code>. ${esc(trust.foldRule||'The folding rule is not listed.')}</p>
    ${quick}
    ${groupList}
    ${evidenceList}
    ${fixtureSelfCheck}
    ${smokeSelfCheck}
    ${runtimeSmoke}
    <p class="alts-sub" style="margin:.55rem 0 0">This checklist covers ${coverage.surfaceGroupCount||groups.length} page groups, ${coverage.scenarioReceiptRows||scenarios.length} cases, and ${coverage.itemCount||items.length} evidence steps. It remains open until every page has been reviewed and the decision is recorded in the content handoff.</p></details>`;
  h10BindEvidence(contract,items);
  h10BindRuntimeSmokeButtons(contract);
}
// ── THE WORKBENCH (#workbench) — the public description of what's being built and why it isn't public
//    yet. When a surface is gated from the public channel, this page carries its intentions and design
//    considerations, in our own words — being honest about the unfinished is part of the product. ──
function renderWorkbench(){
  const v=document.getElementById('view-workbench');if(!v)return;
  const dev=chDev();
  v.innerHTML=`<a class="back" href="#home">← home</a>
    <h2 class="sectionh">On the workbench</h2>
    <p class="sectionsub">These parts work, but their facts or wording are not ready for the public shelf. You can try them here. Each one says what still needs to be checked.</p>

    <div class="card"><b>Company &amp; brand pages</b>
      <p class="alts-sub" style="margin:.4rem 0 0">A useful company page shows what a company owns, what it makes, and how those options fit your rules, with sources. The ownership map is still incomplete, and large pages are slow. This stays here until the major parent companies are covered and every sentence is ready to sign.</p></div>
    <div class="card"><b>Errands</b>
      <p class="alts-sub" style="margin:.4rem 0 0">People shop for a task: groceries for the week, a new bank, a working kitchen. An errand joins the few choices that task requires and gives you a list to carry. The routes work, but nobody has walked every instruction from start to finish. One wrong step is worse than no checklist. This stays here until each errand has been used for the job it names.</p></div>
    <div class="card"><b>What's new, the ledger</b>
      <p class="alts-sub" style="margin:.4rem 0 0">A change log should say what was added, corrected, challenged, or allowed to go stale. No streaks, counters, or bait. This stays here until each entry reads like a record someone actually kept.</p></div>
    <div class="card"><b>Asking about any product by name</b>
      <p class="alts-sub" style="margin:.4rem 0 0">Name or scan a product and the app should find it without making the start page heavy. The fast search and larger lookup both work. This stays here until failed searches, misspellings, and offline use have been checked on a real device.</p></div>
    <div class="card"><b>Letters</b>
      <p class="alts-sub" style="margin:.4rem 0 0">People should be able to question a claim without a developer account. With permission, a useful letter can appear beside the subject, and a sourced correction can change the record. This stays here until the first letters and the publishing path exist.</p></div>

    <div class="card" style="border-left:3px solid var(--accent)"><b>See it anyway</b>
      <p class="alts-sub" style="margin:.4rem 0 .6rem">The workbench is open, but unfinished work is marked plainly. ${dev?'You have it <b>on</b> right now.':'Turn it on to try the parts listed above.'}</p>
      <button class="savebtn${dev?' on':''}" id="wb-toggle">${dev?'Turn the workbench off':'Turn the workbench on'}</button>
      <p class="alts-sub" style="margin:.5rem 0 0">Saved on this device only, like everything here.</p></div>
    <div class="card"><b>Company and search checks</b>
      <p class="alts-sub" style="margin:.4rem 0 0">Before these pages move forward, walk each named route, check failed lookups, and record what happened.</p>
      <div id="h4qa"></div></div>
    <div class="card"><b>Evidence display checks</b>
      <p class="alts-sub" style="margin:.4rem 0 0">Before the evidence labels move forward, check lists, item pages, shared cards, company pages, and Trust Lens. Record what the source wording actually says.</p>
      <div id="h10qa"></div></div>`;
  const t=document.getElementById('wb-toggle');if(t)t.onclick=()=>setChannel(dev?'public':'dev');
  initH4WorkbenchQA();
  initH10WorkbenchQA();
}
function route(){
  const parts=(location.hash.slice(1)||'home').split('/');
  const view=parts[0], arg=parts.slice(1).join('/');
  selected=null;viewingSaved=false;viewingFeedback=false;if(scanState)stopScan();
  if(view==='guide'){renderGuide(arg);showView('guide');}
  else if(view==='guides'){renderGuidesList();showView('guides');}
  else if(view==='browse'){location.replace('#map');return;}
  else if(view==='search'){showView('search');document.getElementById('view-search').innerHTML='<p class="sectionsub">Searching the full commons…</p>';loadAllCategories().then(()=>renderSearch(decodeURIComponent(arg||'')));}
  else if(view==='contribute'){renderContribute(arg);showView('contribute');}
  else if(view==='discover'){if(!arg){location.replace('#map');return;}showView('discover');document.getElementById('view-discover').innerHTML='<p class="sectionsub">Loading the full commons…</p>';loadAllCategories().then(()=>renderDiscover(arg));}
  else if(view==='compare'){renderCompare();showView('compare');}
  else if(view==='recent'){renderRecent();showView('recent');}
  else if(view==='map'){renderMap();showView('map');if(!NODES)loadNodes().then(hydrateExploreErrands);}
  else if(view==='need'){renderNeed(arg);showView('need');}
  else if(view==='value'){renderValue(arg);showView('value');}
  else if(view==='garden'){renderGarden();showView('garden');}
  else if(view==='indexes'){renderIndexes();showView('indexes');}
  else if(view==='domain'){const target=legacyDomainNeedId(arg);if(target){location.replace('#need/'+encodeURIComponent(target));return;}renderDomain(arg);showView('domain');}
  else if(view==='saved'){viewingSaved=true;showView('explore');if(DATA)render();}
  else if(view==='notes'){viewingFeedback=true;showView('explore');if(DATA)render();}
  else if(view==='item'){
    const segs=arg?arg.split('/'):[], cid=segs[0], code=segs[1]?decodeURIComponent(segs[1]):'';
    selected=code; const c=CATALOG.find(x=>x.id===cid);
    if(c&&(!DATA||DATA.meta.id!==cid)){setActiveCat(cid);loadCategory(c).then(()=>{selected=code;render();});}
    else {setActiveCat(cid);render();}
    showView('explore');
  }
  else if(view==='explore'){
    const segs=arg?arg.split('/'):[], cid=segs[0], facet=segs.length>1?decodeURIComponent(segs.slice(1).join('/')):'';
    if(cid&&decisionPrimaryCategory(cid)){hopTo(decideHref(cid,facet));return;}
    const applyFacet=()=>{const qi=document.getElementById('q'); if(qi)qi.value=facet||''; if(DATA)render();};
    if(cid){const c=CATALOG.find(x=>x.id===cid);
      if(c&&(!DATA||DATA.meta.id!==cid)){setActiveCat(cid);loadCategory(c).then(applyFacet);}
      else {setActiveCat(cid);applyFacet();}
    } else if(DATA){render();}
    showView('explore');
  }
  else if(view==='rank'){
    const segs=arg?arg.split('/'):[], cid=segs[0], facet=segs.length>1?decodeURIComponent(segs.slice(1).join('/')):'';
    const applyFacet=()=>{const qi=document.getElementById('q'); if(qi)qi.value=facet||''; if(DATA)render();};
    if(cid){const c=CATALOG.find(x=>x.id===cid);
      if(c&&(!DATA||DATA.meta.id!==cid)){setActiveCat(cid);loadCategory(c).then(applyFacet);}
      else {setActiveCat(cid);applyFacet();}
    } else if(DATA){render();}
    showView('explore');
  }
  else if(view==='workbench'){if(!chDev()){location.replace('#you');return;}renderWorkbench();showView('workbench');}
  else if(view==='n'){renderNode(arg);showView('node');}
  else if(view==='you'){renderYou();showView('you');}
  else if(view==='values'){if(arg==='quiz'){startValues();}else{quizPhase='studio';renderValues();}showView('values');}
  else if(view==='card'){const segs=arg?arg.split('/'):[];renderCard(segs[0],segs[1]?decodeURIComponent(segs[1]):'');showView('card');}
  else if(view==='decide'){const segs=arg?arg.split('/'):[], cid=segs[0], facet=segs.length>1?decodeURIComponent(segs.slice(1).join('/')):'';const c=cid&&CATALOG.find(x=>x.id===cid);if(!c){location.hash='map';return;}if(!DATA||DATA.meta.id!==cid){setActiveCat(cid);loadCategory(c).then(()=>renderDecide(cid,facet));}else{renderDecide(cid,facet);}showView('decide');}
  else if(view==='not-yet-covered'){let id='';try{id=decodeURIComponent(arg||'');}catch(e){}if(!renderPresentationGap(id))renderPresentationUnknown(id);showView('decide');}
  else if(view==='scan'){renderScan();showView('scan');}
  else {renderHome();showView('home');}
  const homeView=document.getElementById('view-home'),nav=document.querySelector('.nav');if(nav)nav.classList.toggle('at-home',!!homeView&&homeView.style.display!=='none');
  renderCrumbs();recordNav();updateBackBtn();announce(navLabel(location.hash));focusMain();closeNavMenu();
  window.scrollTo(0,0);
}

function boot(){
  const presentationReady=CC.presentation?CC.presentation.load().catch(()=>null):Promise.resolve(null);
  return fetch('./data/index.json').then(r=>r.ok?r.json():Promise.reject(new Error('HTTP '+r.status))).then(idx=>{
      window.CC_BUNDLE={index:{categories:idx.categories,attribution:idx.attribution,regionDecisionContract:idx.regionDecisionContract,provenanceDisplayContract:idx.provenanceDisplayContract,valueEditorial:idx.valueEditorial},ontology:idx.ontology,data:{}};
      return idx;
    }).catch(()=>  // file:// blocks fetch, inject the full bundle script instead (works offline / double-clicked)
      new Promise((res,rej)=>{const s=document.createElement('script');s.src='./data.js';s.onload=()=>res(window.CC_BUNDLE&&window.CC_BUNDLE.index);s.onerror=rej;document.head.appendChild(s);})
    ).then(idx=>{
    CATALOG=idx.categories;
    overlayAllLoaded();   // apply any locally-saved corrections to preloaded (file://) data, consistent with served mode
    const sv=loadProfile();
    const hashParts=(location.hash.slice(1)||'home').split('/'), routeView=hashParts[0], requestedId=hashParts[1]?decodeURIComponent(hashParts[1]):'';
    const categoryRoute=['decide','explore','rank','item','card'].includes(routeView), requested=categoryRoute&&idx.categories.some(c=>c.id===requestedId)?requestedId:'';
    const startId=requested||(categoryRoute&&sv&&sv.category&&idx.categories.some(c=>c.id===sv.category)?sv.category:'');
    const cats=document.getElementById('cats');
    // The category sidebar follows the same human-needs spine as Explore. Legacy domains stay in
    // the data and redirect safely, but no longer organize the person's primary decision path.
    const needs=(window.CC_BUNDLE&&window.CC_BUNDLE.ontology&&window.CC_BUNDLE.ontology.needs)||[], needMeta={};
    needs.forEach(n=>needMeta[n.id]=n);
    const byNeed={};idx.categories.forEach(c=>{const id=c.need||'other';(byNeed[id]=byNeed[id]||[]).push(c);});
    const needIds=needs.map(n=>n.id).filter(id=>byNeed[id]).concat(Object.keys(byNeed).filter(id=>!needMeta[id]).sort());
    const activeNeed=(idx.categories.find(c=>c.id===startId)||{}).need;
    for(const id of needIds){
      const label=(needMeta[id]&&needMeta[id].label)||'Other';
      const d=el('details',{class:'tree side','data-need':id});if(id===activeNeed)d.setAttribute('open','');
      d.innerHTML=`<summary><span>${esc(label)}</span></summary>`;
      byNeed[id].slice().sort((a,b)=>a.label.localeCompare(b.label)).forEach(c=>{
        const r=el('a',{class:'tr-row'+(c.id===startId?' on':''),'data-cid':c.id,href:'#explore/'+c.id});
        r.innerHTML=`<span>${esc(c.label)}</span>`;
        d.appendChild(r);
      });
      cats.appendChild(d);
    }
    const extra=el('div',{class:'catextra'});
    const sbtn=el('button',{class:'savetag first',id:'savedbtn'});sbtn.onclick=()=>{location.hash='saved';};
    extra.appendChild(sbtn);
    const nbtn=el('button',{class:'savetag',id:'notesbtn'});nbtn.onclick=()=>{location.hash='notes';};
    extra.appendChild(nbtn);
    cats.appendChild(extra);updateSavedBtn();updateNotesBtn();setExpToggle();
    const start=startId&&idx.categories.find(c=>c.id===startId);
    return start?loadCategory(start):Promise.resolve();
  }).then(()=>presentationReady);
}
boot().then(()=>{
  loadAskCore();
  applyNavI18n();
  const ls=document.getElementById('locale');if(ls)ls.addEventListener('change',e=>setLocale(e.target.value));
  const bb=document.getElementById('backbtn');if(bb)bb.onclick=goBack;
  const nt=document.getElementById('navtoggle');if(nt)nt.onclick=()=>{const nav=document.querySelector('.nav');const open=nav.classList.toggle('open');nt.setAttribute('aria-expanded',String(open));nt.innerHTML=open?'&#10005;':'&#9776;';};
  const tb=document.getElementById('themebtn');if(tb)tb.onclick=cycleTheme; applyTheme();
  // the standing region control, in the chrome on every screen
  if(tb&&!document.getElementById('navregion')){const nr=el('button',{id:'navregion',class:'navbtn navregion','aria-label':'Region coverage'});nr.onclick=toggleRegionMenu;tb.parentNode.insertBefore(nr,tb);updateNavRegion();}
  // the workbench badge — when the internal channel is on, say so in the chrome (never a hidden mode)
  if(chDev()){const wb=el('a',{href:'#workbench',class:'wbbadge',title:'The workbench is on, you see in-progress surfaces. Tap to read or turn off.'},'workbench');const nv=document.querySelector('.navutil');if(nv)nv.insertBefore(wb,nv.firstChild);}
  if(window.matchMedia){try{window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(theme==='system')applyTheme();});}catch(e){}}
  const tt=document.getElementById('totop');if(tt)tt.onclick=()=>window.scrollTo({top:0,behavior:prefersReduced()?'auto':'smooth'});
  window.addEventListener('scroll',()=>{const e=document.getElementById('totop');if(e)e.classList.toggle('show',window.scrollY>500);},{passive:true});
  document.addEventListener('keydown',e=>{
    const t=e.target||{}, typing=/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName||'')||t.isContentEditable;
    if(e.key==='/'&&!typing){const v=['hq','q'].map(id=>document.getElementById(id)).filter(Boolean).find(el=>el.offsetParent!==null);if(v){e.preventDefault();v.focus();if(v.select)v.select();}}
    else if(e.key==='Escape'&&typing&&t.type==='search'){t.value='';t.blur();}
  });
  window.addEventListener('hashchange',route);route();
  // guides.js is deferred (it's the largest bundle; deferring it lets the app boot without waiting on it).
  // Everything reads window.CC_GUIDES||[] so it's safe before it loads; this just re-renders a guides view
  // if someone cold-deep-linked to one before the bundle finished.
  if(!window.CC_GUIDES){const gs=document.querySelector('script[src*="guides.js"]');
    if(gs)gs.addEventListener('load',()=>{const v=(location.hash.slice(1)||'').split('/')[0];if(v==='guides'||v==='guide')route();});}
})
  .catch(e=>{document.getElementById('attr').textContent='Could not load data, run: python pipeline/build_datasets.py';});

// Phase A: register the service worker so the commons installs & works offline — but ONLY on a real (non-localhost)
// http(s) deploy. In dev/preview a caching SW gets in the way, so there we make sure none is active (self-healing).
if('serviceWorker' in navigator){
  var _host=location.hostname, _local=(_host==='localhost'||_host==='127.0.0.1'||_host==='::1'||_host==='');
  if(location.protocol.indexOf('http')===0 && !_local){
    window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js').catch(function(){});});
  } else {
    navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});}).catch(function(){});
    if(window.caches&&caches.keys)caches.keys().then(function(ks){ks.forEach(function(k){if(k==='cc-v1')caches.delete(k);});}).catch(function(){});
  }
}

// --- Opt-in, privacy-respecting usage signal: OFF until you set CC_ANALYTICS on deploy, and NEVER on localhost.
// Recommended: hosted GoatCounter — cookieless, IP hashed-then-discarded daily, no consent banner. It answers only
// "is anyone here, what did they land on" — aggregate, never a person (the no-proxy-capture rule). See docs/PATH-TO-FIRST-USERS.md.
var CC_ANALYTICS='';  // e.g. 'https://YOURCODE.goatcounter.com/count', set this one string on deploy to learn if anyone visits
(function(){
  if(!CC_ANALYTICS)return;
  var host=location.hostname, local=(host==='localhost'||host==='127.0.0.1'||host==='::1'||host==='');
  if(location.protocol.indexOf('http')!==0||local)return;
  var s=document.createElement('script');
  s.async=true; s.src='//gc.zgo.at/count.js'; s.setAttribute('data-goatcounter',CC_ANALYTICS);
  document.head.appendChild(s);
})();
