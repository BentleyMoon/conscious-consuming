/* Shared presentation-package consumer.

   The renderer stays deliberately small: the generated package owns public words,
   paths, page-kind furniture, and fixtures; app.js supplies the live decision
   engine and its current answer. The JSON fetch keeps served mode light. The
   generated presentation-data.js fallback keeps double-clicked file:// use honest.
*/
const DISPLAY_NEED={'NOURISH':'Food & drink','CARE':'Personal care','KEEP A HOME':'Home','CONNECT':'Phones & internet','MOVE':'Getting around','LEARN':'Media & learning','GIVE & ACT':'Giving','PROTECT':'Money & privacy'};
function displayNeed(label){return DISPLAY_NEED[String(label||'').toUpperCase()]||label;}
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.CC=root.CC||{};root.CC.presentation=api;}
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';

  let value=root&&root.CC_PRESENTATION||null;
  let pending=null;

  function esc(input){
    return String(input==null?'':input).replace(/[&<>"']/g,function(char){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function loadFallback(){
    if(!root||!root.document)return Promise.reject(new Error('presentation fallback requires a browser'));
    if(root.CC_PRESENTATION){value=root.CC_PRESENTATION;return Promise.resolve(value);}
    return new Promise(function(resolve,reject){
      const script=root.document.createElement('script');
      script.src='./presentation-data.js';
      script.onload=function(){
        value=root.CC_PRESENTATION||null;
        value?resolve(value):reject(new Error('presentation fallback did not register a package'));
      };
      script.onerror=function(){reject(new Error('presentation fallback could not load'));};
      root.document.head.appendChild(script);
    });
  }

  function load(){
    if(value)return Promise.resolve(value);
    if(pending)return pending;
    if(!root||typeof root.fetch!=='function')return Promise.reject(new Error('presentation package is not loaded'));
    pending=root.fetch('./data/presentation.json')
      .then(function(response){if(!response.ok)throw new Error('HTTP '+response.status);return response.json();})
      .then(function(packageValue){value=packageValue;return value;})
      .catch(loadFallback)
      .finally(function(){pending=null;});
    return pending;
  }

  function current(){return value;}

  function fixtureFor(packageValue,pageKind,route){
    const set=(packageValue.fixtures||[]).find(function(item){return item.pageKind===pageKind;});
    return set&&(set.cases||[]).find(function(item){return item.route===route;})||null;
  }

  function categoryFrame(packageValue,model){
    const route=model.route||('#decide/'+model.category);
    const fixture=model.fixture||fixtureFor(packageValue,'category',route);
    if(!fixture)throw new Error('No presentation category fixture for '+route);
    const strings=packageValue.strings||{}, search=strings.search||{}, actions=strings.actions||{};
    const pageKind=(packageValue.pageKinds||[]).find(function(item){return item.id==='category';});
    const coverageKey=fixture.state==='not-yet-covered'?'notCovered':fixture.state;
    const coverage=(strings.coverage||{})[coverageKey]||(strings.coverage||{}).rich||{};
    const facts=(fixture.expected&&fixture.expected.mustShow||[]).filter(function(text){return text!==fixture.title;});
    const path=(fixture.expected&&fixture.expected.path||[]);
    const sourceText=model.sourceText||'The source notes used by this comparison are available on each choice.';
    const guideLink=model.guideHref?'<a href="'+esc(model.guideHref)+'">Read the category guide</a>':'';
    const linksHere=guideLink||'<span>No published guide links to this decision yet.</span>';
    const datasetHref=model.datasetHref||('./data/'+model.category+'.json');
    const stateCopy=pageKind&&pageKind.stateCopy&&(pageKind.stateCopy[fixture.state]||pageKind.stateCopy[coverageKey])||'';

    if(fixture.state==='not-yet-covered'){
      const parent=(fixture.expected&&fixture.expected.path&&fixture.expected.path[0])||model.parentLabel||'this need';
      const missing=(fixture.expected&&fixture.expected.mustShow||[]).filter(function(text){return text!==fixture.title;});
      const action=fixture.expected&&fixture.expected.action||coverage.action||'Suggest sources';
      return '<article class="presentation-page presentation-category presentation-gap"'+
        ' data-presentation-kind="category" data-presentation-state="not-yet-covered"'+
        ' data-presentation-route="'+esc(route)+'" data-presentation-instance="'+esc(model.instance||'conscious-consuming')+'">'+
        '<form class="presentation-search" data-presentation-part="search" data-presentation-search-form role="search"><label for="presentation-search-input">'+esc(search.label||'Search')+'</label><span><input id="presentation-search-input" type="search" placeholder="'+esc(search.placeholder||'Search')+'" autocomplete="off"><button type="submit">'+esc(search.submit||'Search')+'</button></span></form>'+
        '<nav class="presentation-path" data-presentation-part="path" aria-label="Decision path">'+path.map(function(label,index){return '<span'+(index===path.length-1?' aria-current="page"':'')+'>'+esc(displayNeed(label))+'</span>';}).join('<i aria-hidden="true">›</i>')+'</nav>'+
        '<header class="decision-head presentation-lead" data-presentation-part="lead"><div class="decision-kicker">Decision</div><h1>'+esc(fixture.title)+'</h1><p class="decision-read">Mapped under '+esc(parent)+'. We do not have a comparison yet.</p></header>'+
        '<div class="presentation-coverage" data-presentation-part="coverage"><strong>'+esc(coverage.label||'Not yet covered')+'</strong><span>'+esc(stateCopy.replace('{decision}',fixture.title).replace('{parent}',parent))+'</span></div>'+
        '<div class="presentation-main-action" data-presentation-part="main-action"><a class="savebtn" href="#contribute/want/'+encodeURIComponent(fixture.title)+'" data-presentation-main-action>'+esc(action)+'</a><span>Add a source and date for the first factual comparison.</span></div>'+
        '<section class="presentation-facts presentation-gap-facts" data-presentation-part="facts"><div class="decision-kicker">What is missing</div><h2>A source-backed comparison</h2>'+missing.map(function(text){return '<p>'+esc(text)+'</p>';}).join('')+'<div data-presentation-part="applied-values"><h3>Why there is no answer</h3><p>The baseline, My rules, and practical choices cannot rank options until comparable facts exist.</p></div></section>'+
        '<section class="presentation-support" data-presentation-part="sources"><div class="decision-kicker">Sources</div><h2>Sources</h2><p>No source-backed comparison has been accepted for '+esc(fixture.title)+' yet.</p><a href="#contribute/want/'+encodeURIComponent(fixture.title)+'">'+esc(action)+'</a></section>'+
        '<section class="presentation-support" data-presentation-part="connections"><h2>Connections</h2><p>This decision remains mapped under '+esc(parent)+' so it can be found before coverage exists.</p>'+((model.needHref)?'<a href="'+esc(model.needHref)+'">Open '+esc(parent)+'</a>':'')+'</section>'+
        '<section class="presentation-support" data-presentation-part="links-here"><h2>What links here</h2><p>The taxonomy and this stable address link to the same missing decision.</p></section>'+
        '<section class="presentation-support" data-presentation-part="correction-history"><h2>Corrections and history</h2><p>'+esc((strings.fieldStates||{}).noRecentChanges||'No recent changes are recorded for this page.')+'</p><a href="#contribute/want/'+encodeURIComponent(fixture.title)+'">'+esc(action)+'</a></section>'+
        '<section class="presentation-support presentation-machine" data-presentation-part="machine-twin"><h2>'+esc(actions.dataForAgents||'Data for agents')+'</h2><p>The machine-readable taxonomy records this decision as not yet covered.</p><a href="./data/presentation.json">presentation.json</a></section></article>';
    }

    return '<article class="presentation-page presentation-category"'+
      ' data-presentation-kind="category"'+
      ' data-presentation-state="'+esc(fixture.state)+'"'+
      ' data-presentation-route="'+esc(route)+'"'+
      ' data-presentation-instance="'+esc(model.instance||'conscious-consuming')+'">'+
      '<form class="presentation-search" data-presentation-part="search" data-presentation-search-form role="search">'+
        '<label for="presentation-search-input">'+esc(search.label||'Search')+'</label>'+
        '<span><input id="presentation-search-input" type="search" placeholder="'+esc(search.placeholder||'Search')+'" autocomplete="off">'+
        '<button type="submit">'+esc(search.submit||'Search')+'</button></span></form>'+
      '<nav class="presentation-path" data-presentation-part="path" aria-label="Decision path">'+
        path.map(function(label,index){return '<span'+(index===path.length-1?' aria-current="page"':'')+'>'+esc(displayNeed(label))+'</span>';}).join('<i aria-hidden="true">›</i>')+'</nav>'+
      '<header class="decision-head presentation-lead" data-presentation-part="lead"><div class="decision-kicker">Decision</div><h1>'+esc(fixture.title)+'</h1><p class="decision-read">'+esc(model.read||'')+'</p></header>'+
      '<div class="presentation-coverage" data-presentation-part="coverage"><strong>'+esc(coverage.label||fixture.expected.coverage)+'</strong><span>'+esc(stateCopy)+'</span></div>'+
      '<div class="presentation-main-action" data-presentation-part="main-action"><button class="savebtn" id="decision-save-list" type="button" data-presentation-main-action>'+esc(pageKind&&pageKind.mainAction||actions.saveList||fixture.expected.action)+'</button><span id="decision-save-status" aria-live="polite">Saves on this device and travels with Your file.</span></div>'+
      '<section class="presentation-facts" data-presentation-part="facts" aria-labelledby="presentation-facts-title"><div class="presentation-facts-head"><div><div class="decision-kicker">Compare</div><h2 id="presentation-facts-title">What can change the answer</h2></div><div class="presentation-fact-chips">'+facts.map(function(fact){return '<span>'+esc(fact)+'</span>';}).join('')+'</div></div>'+
        '<div data-presentation-slot="controls">'+(model.controlsHtml||'')+'</div>'+
        '<section id="decision-answers" data-presentation-part="applied-values" aria-live="polite"></section></section>'+
      '<section class="presentation-support" data-presentation-part="sources"><div class="decision-kicker">Sources</div><h2>Sources</h2><p>'+esc(sourceText)+'</p><a href="'+esc(datasetHref)+'">Open the comparison data</a></section>'+
      '<section data-presentation-part="connections">'+(model.connectionsHtml||'<h2>Connections</h2><p>This decision is connected to its entries and source notes.</p>')+'</section>'+
      '<section class="presentation-support" data-presentation-part="links-here"><h2>What links here</h2><p>'+linksHere+'</p></section>'+
      '<section class="presentation-support presentation-history" data-presentation-part="correction-history"><h2>Corrections and history</h2><p>'+
        esc((strings.fieldStates||{}).noRecentChanges||'No recent changes are recorded for this page.')+'</p><a href="#contribute/problem/'+esc(model.category)+'">'+esc(actions.suggestCorrection||'Suggest a correction')+'</a></section>'+
      '<section class="presentation-support presentation-machine" data-presentation-part="machine-twin"><h2>'+esc(actions.dataForAgents||'Data for agents')+'</h2><p>The page and the machine-readable comparison use the same generated facts.</p><a href="'+esc(datasetHref)+'">'+esc(model.category)+'.json</a><a href="./data/presentation.json">presentation.json</a></section>'+
      '</article>';
  }

  function entryFrame(packageValue,model){
    const route=model.route, fixture=model.fixture||fixtureFor(packageValue,'entry',route);
    if(!fixture)throw new Error('No presentation entry fixture for '+route);
    const strings=packageValue.strings||{}, search=strings.search||{}, actions=strings.actions||{};
    const pageKind=(packageValue.pageKinds||[]).find(function(item){return item.id==='entry';});
    const coverageKey=fixture.state==='not-yet-covered'?'notCovered':fixture.state;
    const coverage=(strings.coverage||{})[coverageKey]||(strings.coverage||{}).rich||{};
    const stateCopy=pageKind&&pageKind.stateCopy&&(pageKind.stateCopy[fixture.state]||pageKind.stateCopy[coverageKey])||'';
    const path=fixture.expected&&fixture.expected.path||[];
    const action=fixture.expected&&fixture.expected.action||pageKind&&pageKind.mainAction||actions.saveChoice||'Save this choice';
    if(fixture.state==='not-yet-covered'){
      const decision=path[path.length-1]||fixture.title;
      return '<article class="presentation-page presentation-entry presentation-gap" data-presentation-kind="entry" data-presentation-state="not-yet-covered" data-presentation-route="'+esc(route)+'" data-presentation-instance="'+esc(model.instance||'conscious-consuming')+'">'+
        '<form class="presentation-search" data-presentation-part="search" data-presentation-search-form role="search"><label for="presentation-search-input">'+esc(search.label||'Search')+'</label><span><input id="presentation-search-input" type="search" placeholder="'+esc(search.placeholder||'Search')+'" autocomplete="off"><button type="submit">'+esc(search.submit||'Search')+'</button></span></form>'+
        '<nav class="presentation-path" data-presentation-part="path" aria-label="Entry path">'+path.map(function(label,index){return '<span'+(index===path.length-1?' aria-current="page"':'')+'>'+esc(displayNeed(label))+'</span>';}).join('<i aria-hidden="true">›</i>')+'</nav>'+
        '<header class="decision-head presentation-lead" data-presentation-part="lead"><div class="decision-kicker">Entry</div><h1>'+esc(decision)+'</h1><p class="decision-read">We do not have a comparison yet, so no entry page has been fabricated.</p></header>'+
        '<div class="presentation-coverage" data-presentation-part="coverage"><strong>'+esc(coverage.label||'Not yet covered')+'</strong><span>'+esc(stateCopy)+'</span></div>'+
        '<div class="presentation-main-action" data-presentation-part="main-action"><a class="savebtn" href="#contribute/want/'+encodeURIComponent(decision)+'" data-presentation-main-action>'+esc(action)+'</a><span>Add a source-backed record to begin coverage.</span></div>'+
        '<section class="presentation-support" data-presentation-part="sources"><h2>Sources</h2><p>No source-backed entry has been supplied.</p></section>'+
        '<section class="presentation-support" data-presentation-part="connections"><h2>Connections</h2><p>The missing entry remains attached to '+esc(decision)+' rather than appearing as a product.</p></section>'+
        '<section class="presentation-support" data-presentation-part="links-here"><h2>What links here</h2><p>The mapped decision is the only current parent.</p></section>'+
        '<section class="presentation-support" data-presentation-part="correction-history"><h2>Corrections and history</h2><p>'+esc((strings.fieldStates||{}).noRecentChanges||'No recent changes are recorded for this page.')+'</p><a href="#contribute/want/'+encodeURIComponent(decision)+'">'+esc(action)+'</a></section>'+
        '<section class="presentation-support presentation-machine" data-presentation-part="machine-twin"><h2>'+esc(actions.dataForAgents||'Data for agents')+'</h2><p>The taxonomy records a missing decision, not an invented entry.</p><a href="./data/presentation.json">presentation.json</a></section></article>';
    }
    const facts=(model.facts||[]).map(function(fact){
      const evidence=fact.source?'<a href="'+esc(fact.source)+'" target="_blank" rel="noopener">Source'+(fact.asof?' · '+esc(fact.asof):'')+'</a>':'<strong>'+esc(fact.missing||((strings.fieldStates||{}).sourceMissing||'Source not supplied'))+'</strong>';
      return '<div class="presentation-entry-fact"><div><span>'+esc(fact.label)+'</span><b>'+esc(fact.band||'')+'</b></div><p>'+esc(fact.note||'')+'</p>'+evidence+'</div>';
    }).join('');
    const sourceLinks=(model.sources||[]).map(function(source){return '<a href="'+esc(source.url)+'" target="_blank" rel="noopener">'+esc(source.label)+(source.asof?' · '+esc(source.asof):'')+'</a>';}).join('');
    const mainAction=model.saved?'Remove saved choice':action;
    return '<article class="presentation-page presentation-entry" data-presentation-kind="entry" data-presentation-state="'+esc(fixture.state)+'" data-presentation-route="'+esc(route)+'" data-presentation-instance="'+esc(model.instance||'conscious-consuming')+'">'+
      '<form class="presentation-search" data-presentation-part="search" data-presentation-search-form role="search"><label for="presentation-search-input">'+esc(search.label||'Search')+'</label><span><input id="presentation-search-input" type="search" placeholder="'+esc(search.placeholder||'Search')+'" autocomplete="off"><button type="submit">'+esc(search.submit||'Search')+'</button></span></form>'+
      '<nav class="presentation-path" data-presentation-part="path" aria-label="Entry path">'+path.map(function(label,index){return '<span'+(index===path.length-1?' aria-current="page"':'')+'>'+esc(displayNeed(label))+'</span>';}).join('<i aria-hidden="true">›</i>')+'</nav>'+
      '<header class="decision-head presentation-lead" data-presentation-part="lead"><div class="decision-kicker">'+esc(model.type||'Entry')+'</div><h1>'+esc(fixture.title)+'</h1><p class="decision-read">'+esc(model.displayName||model.description||'')+'</p></header>'+
      '<div class="presentation-coverage" data-presentation-part="coverage"><strong>'+esc(coverage.label||fixture.expected.coverage)+'</strong><span>'+esc(stateCopy)+'</span></div>'+
      '<div class="presentation-main-action" data-presentation-part="main-action"><button class="savebtn'+(model.saved?' on':'')+'" id="entry-save-choice" type="button" data-presentation-main-action>'+esc(mainAction)+'</button><span>Saved choices stay on this device and travel with Your file.</span></div>'+
      '<section class="presentation-entry-answer" data-presentation-part="applied-values"><div class="decision-kicker">Current answer</div><h2>'+esc(model.answer||'A starting view')+'</h2><p>'+esc(model.why||'The answer uses the baseline, My rules, and the practical choices for this decision.')+'</p><a href="'+esc(model.allHref||'#map')+'">Show every choice</a></section>'+
      '<section class="presentation-entry-facts" data-presentation-part="facts"><div class="decision-kicker">Facts</div><h2>What matters here</h2>'+facts+'</section>'+
      '<section class="presentation-support" data-presentation-part="sources"><div class="decision-kicker">Sources</div><h2>Sources</h2><p>Sources sit beside the facts they support. Note-only fields are marked above.</p>'+sourceLinks+'</section>'+
      '<section class="presentation-support" data-presentation-part="connections"><h2>Connections</h2>'+(model.connectionsHtml||'<p>No typed connections are recorded for this entry.</p>')+'</section>'+
      '<section class="presentation-support" data-presentation-part="links-here"><h2>What links here</h2><p><a href="'+esc(model.allHref||'#map')+'">'+esc(model.categoryLabel||'Decision')+'</a>'+(model.guideHref?' · <a href="'+esc(model.guideHref)+'">Category guide</a>':'')+'</p></section>'+
      '<section class="presentation-support" data-presentation-part="correction-history"><h2>Corrections and history</h2><p>'+esc((strings.fieldStates||{}).noRecentChanges||'No recent changes are recorded for this page.')+'</p><a href="#contribute/problem/'+encodeURIComponent(model.category||'')+'">'+esc(actions.suggestCorrection||'Suggest a correction')+'</a></section>'+
      '<section class="presentation-support presentation-machine" data-presentation-part="machine-twin"><h2>'+esc(actions.dataForAgents||'Data for agents')+'</h2><p>The page and machine-readable entry use the same facts and missing-field states.</p><a href="'+esc(model.datasetHref||'./data/presentation.json')+'">'+esc(model.category||'entry')+'.json</a></section></article>';
  }

  function unknownFrame(packageValue,model){
    const strings=packageValue&&packageValue.strings||{}, search=strings.search||{}, errors=strings.errors||{};
    return '<article class="presentation-page presentation-miss"><form class="presentation-search" data-presentation-search-form role="search"><label for="presentation-search-input">'+esc(search.label||'Search')+'</label><span><input id="presentation-search-input" type="search" placeholder="'+esc(search.placeholder||'Search')+'" value="'+esc(model.query||'')+'" autocomplete="off"><button type="submit">'+esc(search.submit||'Search')+'</button></span></form><header class="decision-head"><div class="decision-kicker">Address</div><h1>'+esc(errors.unknownPage||search.missTitle||'We could not find this page')+'</h1><p class="decision-read">'+esc(errors.invalidRoute||'This address is not valid.')+'</p></header><a class="savebtn" href="#map">Back to Explore</a></article>';
  }

  return {load:load,current:current,fixtureFor:fixtureFor,categoryFrame:categoryFrame,entryFrame:entryFrame,unknownFrame:unknownFrame};
});
