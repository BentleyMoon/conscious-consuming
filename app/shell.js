/* Open Values instance shell (L2).
   A lens supplies resources, criteria, lines, and a practical decision contract.
   The shared decision page owns weighting, recipes, math, and dial language;
   this shell supplies only instance state and the distinct presentation skin. */
(function(){
  'use strict';
  const mount=document.getElementById('list');
  if(!(window.CC&&CC.engine&&CC.decisionPage)){
    if(mount)mount.innerHTML='<p class="error">Couldn\'t load the shared decision component. Try refreshing the page.</p>';
    return;
  }

  const L=window.OVS_LENS||window.KOSPLORA_LENS||{}, META=L.meta||{};
  const CRITERIA=L.criteria||[], THEMES=L.themes||[], KEY2THEME=L.key2theme||{};
  const RESOURCES=L.resources||[], CONTRACT=L.decision||{}, LINES=L.lines||[];
  const ENGINE=CC.engine, DECISION=CC.decisionPage;
  const DATA={meta:{id:CONTRACT.category||META.id||'instance',label:META.title||'Learning resources'},criteria:CRITERIA,products:RESOURCES};
  const STORE_KEY=META.storeKey||((META.id||'ovs')+'.values');
  const DIAL_KEY=(META.id||'ovs')+'.decision.dials.v1';
  const LINE_KEY=(META.id||'ovs')+'.decision.lines.v1';
  const U2L=L.universalToLocal||{};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  if(!RESOURCES.length||!CONTRACT.axes){
    if(mount)mount.innerHTML='<p class="error">This illustrative list has no decision contract yet.</p>';
    return;
  }

  function readStore(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'?value:fallback;}catch(_){return fallback;}}
  function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(_){}}
  let leanings=readStore(STORE_KEY,{}), savedDials=readStore(DIAL_KEY,{}), activeLines=new Set(readStore(LINE_KEY,[]));
  for(const theme of THEMES)if(!Number.isFinite(leanings[theme.id]))leanings[theme.id]=3;

  function announce(message){const live=document.getElementById('instance-live');if(live)live.textContent=message;}
  function values(){return DECISION.dialValues(CONTRACT,savedDials);}
  function tieWeights(){return ENGINE.themeDefaults(CRITERIA,leanings,KEY2THEME);}
  function lineMatches(resource,line){const value=resource.scores&&resource.scores[line.criterion];return Number.isFinite(value)&&value>=line.minimum;}
  function candidatePool(){
    const floorFolded=[], afterFloor=RESOURCES.slice();
    const chosen=LINES.filter(line=>activeLines.has(line.id)), entries=[], personalFolded=[];
    for(const resource of afterFloor){
      const reasons=chosen.filter(line=>!lineMatches(resource,line));
      if(reasons.length)personalFolded.push({product:resource,reasons});else entries.push(resource);
    }
    return {
      base:RESOURCES.slice(),entries,floorFolded,personalFolded,
      personalHidden:personalFolded.length,personalApplied:chosen.map(line=>line.label)
    };
  }

  function floorAndLinesHTML(pool){
    const floor=CONTRACT.floor||{}, chips=LINES.map(line=>{
      const on=activeLines.has(line.id);
      return `<button type="button" class="linechip${on?' on':''}" data-instance-line="${esc(line.id)}" aria-pressed="${on}"><b>${esc(line.label)}</b><span>${esc(line.reads)}</span></button>`;
    }).join('');
    return `<section class="instance-context" aria-label="Decision rules">
      <details class="decision-floor"><summary><span><b>The baseline is on</b><small>${pool.floorFolded.length} folded · read it</small></span><span aria-hidden="true">⌄</span></summary><div class="context-body"><h3>${esc(floor.label||'The baseline')} <span>v${esc(floor.version||'1')}</span></h3><p>${esc(floor.reads||'Evidence gaps remain visible.')}</p><p class="scope-note">This is an illustrative list, not a published exclusion set.</p></div></details>
      <div class="instance-lines"><div><div class="decision-kicker">My rules</div><h2>Keep only what must be true</h2><p>Optional rules, stored on this device. Anything they filter stays one tap away.</p></div><div class="linechips">${chips}</div></div>
    </section>`;
  }

  function proofHTML(product){
    const known=CRITERIA.filter(criterion=>product.provenance&&String(product.provenance[criterion.key]||'').trim()).length;
    return `<span class="proof-chip">Illustrative list · ${known}/${CRITERIA.length} criteria annotated</span>`;
  }

  function rankedRow(row,index){
    const tier=ENGINE.scoreTier(row.score.score);
    return `<article class="rank-row"><span class="rank-number">${index+1}</span><div><h3>${esc(row.product.name)}</h3><p>${esc(row.product.brand||'learning resource')} · ${esc(tier[0])} with these choices</p></div><strong>${row.score.score}<small>/100</small></strong></article>`;
  }

  function foldsHTML(pool){
    if(!pool.personalFolded.length)return '';
    const rows=pool.personalFolded.map(row=>`<article class="fold-row"><div><h3>${esc(row.product.name)}</h3><p>Filtered by your rules: ${esc(row.reasons.map(line=>line.label).join(', '))}.</p></div><span>Still visible</span></article>`).join('');
    return `<details class="decision-personal-fold"><summary>${pool.personalFolded.length} filtered by your rules · show anyway</summary><p>These resources are filtered from the answers, not erased.</p><div>${rows}</div></details>`;
  }

  function precedenceHTML(pool,result){
    const afterFloor=pool.base.length-pool.floorFolded.length;
    return `<details class="decision-finetune"><summary><span>Advanced: Close-call priorities</span><strong>${THEMES.filter(theme=>leanings[theme.id]>=4).length?'Priorities set':'Balanced'}</strong></summary><div class="precedence-grid"><div><div class="decision-kicker">The order, applied</div><h3>Rules decide eligibility. Your choices decide order.</h3><p>Close-call priorities are consulted only after equal scores. They cannot restore a filtered resource.</p></div><ol><li><b>1 · The baseline</b><span>${pool.floorFolded.length} folded from ${pool.base.length}</span></li><li><b>2 · My rules</b><span>${pool.personalHidden} filtered from ${afterFloor}</span></li><li><b>3 · Your choices</b><span>${result.ranked.length} eligible resources ranked</span></li><li><b>4 · Close-call priorities</b><span>Equal scores only</span></li></ol><div class="leaning-panel"><p><b>Optional close-call priorities</b></p><div class="leaning-chips">${THEMES.map(theme=>`<button type="button" data-instance-leaning="${esc(theme.id)}" aria-pressed="${leanings[theme.id]>=4}" class="leaning-chip${leanings[theme.id]>=4?' on':''}">${esc(theme.label)}</button>`).join('')}</div><label class="passport-action">Upload your file<input type="file" id="passfile" accept="application/json,.json" hidden></label><span id="passnote"></span></div></div></details>`;
  }

  function renderAnswers(){
    const box=document.getElementById('instance-answers');if(!box)return;
    const pool=candidatePool(), current=values();
    const result=DECISION.recipes({engine:ENGINE,dataset:DATA,contract:CONTRACT,pool,values:current,tieWeights:tieWeights()});
    if(!result.recipes.length){
      box.innerHTML=precedenceHTML(pool,result)+'<div class="empty-answer"><b>No answer clears every current rule.</b><p>Loosen a rule or inspect the filtered resources below. Nothing was guessed to fill the gap.</p></div>'+foldsHTML(pool);
      wireAnswerControls();return;
    }
    const title=result.recipes.length===3?'Three good answers':result.recipes.length===2?'Two good answers':'A good answer';
    const collapse=result.groups.length<result.recipes.length?'<p class="decision-collapse">More than one recipe reached the same resource, so the duplicate collapsed into one card.</p>':'';
    box.innerHTML=`${precedenceHTML(pool,result)}<div class="answer-heading"><div><div class="decision-kicker">Computed, not editorial</div><h2>${title}</h2></div><p>Change a choice and the answers are worked again.</p></div>${collapse}<div class="decision-answer-grid">${result.groups.map(group=>DECISION.answerCardHTML({engine:ENGINE,dataset:DATA,contract:CONTRACT,group,pool,escape:esc,proof:proofHTML})).join('')}</div><details class="decision-all"><summary>Rank all ${result.ranked.length} eligible learning resources with these choices →</summary><p>The baseline and your rules stay applied. Every score below uses the same current settings.</p><div>${result.ranked.map(rankedRow).join('')}</div></details>${foldsHTML(pool)}`;
    wireAnswerControls();
  }

  function applyPassport(passport){
    if(!passport||!passport.values)return false;
    const base={}; for(const theme of THEMES)base[theme.id]=3;
    const result=ENGINE.passportApply(passport,U2L,base);
    leanings=result.weights;writeStore(STORE_KEY,leanings);renderPage();
    const note=document.getElementById('passnote');
    if(note)note.textContent=result.applied.length?`Applied ${result.applied.length} close-call priorit${result.applied.length===1?'y':'ies'} as tie-breakers.`:'No priority in this file maps to this list.';
    return true;
  }

  function wireAnswerControls(){
    document.querySelectorAll('[data-instance-leaning]').forEach(button=>button.onclick=()=>{
      const id=button.dataset.instanceLeaning;leanings[id]=leanings[id]>=4?3:5;writeStore(STORE_KEY,leanings);renderAnswers();announce(`${button.textContent.trim()} ${leanings[id]>=4?'will break equal dial scores':'returned to balanced'}.`);
    });
    const pass=document.getElementById('passfile');if(pass)pass.onchange=event=>{
      const file=event.target.files&&event.target.files[0];if(!file)return;
      const reader=new FileReader();reader.onload=()=>{try{applyPassport(JSON.parse(reader.result));}catch(_){const note=document.getElementById('passnote');if(note)note.textContent='That file is not readable here.';}};reader.readAsText(file);
    };
  }

  function renderPage(){
    const current=values(), pool=candidatePool();
    const zero=DECISION.dialsAreDefault(CONTRACT,current)&&activeLines.size===0?'A balanced view. Set a rule or change a choice to make it yours.':'My rules and these choices stay on this device.';
    mount.innerHTML=`<main class="decision-page illustrative-decision"><header class="decision-head"><div class="decision-kicker">Illustrative generality receipt</div><h2>Choose somewhere to learn</h2><p class="decision-read">${esc(CONTRACT.reads.text)}</p><p class="illustrative-note"><b>Illustrative, not an endorsement.</b> The scores test whether the component transfers; they are not release-grade evidence.</p></header>${floorAndLinesHTML(pool)}<p class="decision-zero">${esc(zero)}</p><section class="decision-controls" aria-labelledby="instance-controls-title"><div class="control-heading"><div><div class="decision-kicker">For this decision</div><h2 id="instance-controls-title">What matters here</h2></div><button type="button" id="decision-reset">Reset choices</button></div>${(CONTRACT.axes||[]).map(axis=>DECISION.dialHTML(axis,current[axis.id],{escape:esc,idPrefix:'kosplora-dial'})).join('')}<p class="budget-note">No budget answer here: this illustrative list has no dependable price facts.</p></section><section id="instance-answers" aria-live="polite"></section><section class="review-next"><div class="decision-kicker">The proof</div><h2>One component, another domain</h2><p>Conscious Consuming and this page call the same <code>decision.js</code> recipes, controls, explanations, and math. Only the list and skin change.</p><nav><a href="../app/#need/learn">Return to the LEARN need</a><a href="../docs/DECISION-REFRAME-FOUNDER-REVIEW.md">Open the founder review</a></nav></section></main>`;
    mount.querySelectorAll('[data-decision-axis]').forEach(input=>input.addEventListener('input',event=>{
      const axis=(CONTRACT.axes||[]).find(row=>row.id===event.target.dataset.decisionAxis);if(!axis)return;
      savedDials[axis.id]=Number(event.target.value);writeStore(DIAL_KEY,savedDials);
      const output=document.getElementById('kosplora-dial-value-'+axis.id);if(output)output.textContent=DECISION.dialPosition(axis,savedDials[axis.id]);
      renderAnswers();
    }));
    mount.querySelectorAll('[data-decision-axis]').forEach(input=>input.addEventListener('change',()=>{const result=DECISION.recipes({engine:ENGINE,dataset:DATA,contract:CONTRACT,pool:candidatePool(),values:values(),tieWeights:tieWeights()});if(result.recipes[0])announce(`${result.recipes[0].product.name} is now best for most with these choices.`);}));
    mount.querySelectorAll('[data-instance-line]').forEach(button=>button.onclick=()=>{const id=button.dataset.instanceLine;if(activeLines.has(id))activeLines.delete(id);else activeLines.add(id);writeStore(LINE_KEY,[...activeLines]);renderPage();announce(`${button.textContent.trim()} ${activeLines.has(id)?'set':'removed'}.`);});
    const reset=document.getElementById('decision-reset');if(reset)reset.onclick=()=>{savedDials={};writeStore(DIAL_KEY,savedDials);renderPage();announce('Choices reset to balanced.');};
    renderAnswers();
  }

  const foot=document.getElementById('foot');
  if(foot)foot.innerHTML=`Running Values Engine v${esc(ENGINE.VERSION)} and Decision Page v${esc(DECISION.VERSION)} · ${META.footer||'shared open components, configured by this list.'} <span class="attribution">· ${META.attribution||''}</span>`;
  renderPage();
})();
