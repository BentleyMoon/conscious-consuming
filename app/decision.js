/* Open Values decision page — domain-neutral decision recipes and rendering atoms.
   Conscious Consuming and illustrative instances provide a lens, practical axes,
   an eligibility pool, and optional presentation slots. The component owns the
   dial weighting, answer recipes, explanation math, and range language. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root){root.CC=root.CC||{};root.CC.decisionPage=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='1.0';
  const clamp=value=>Math.max(0,Math.min(100,Number(value)));
  const defaultEscape=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function dialValues(contract,saved){
    const out={}, source=saved||{};
    for(const axis of (contract.axes||[])){
      const fallback=Number.isFinite(Number(axis.default))?Number(axis.default):50;
      const raw=Number(source[axis.id]);
      out[axis.id]=Number.isFinite(raw)?clamp(raw):fallback;
    }
    return out;
  }

  function dialsAreDefault(contract,values){
    return (contract.axes||[]).every(axis=>values[axis.id]===(Number.isFinite(Number(axis.default))?Number(axis.default):50));
  }

  function dialWeights(criteria,contract,values){
    const contributions={}; for(const criterion of (criteria||[]))contributions[criterion.key]=[];
    for(const axis of (contract.axes||[])){
      const value=values[axis.id]==null?50:clamp(values[axis.id]), keys=axis.criteria||[];
      if(axis.kind==='cost-values'&&keys.length>=2){
        if(contributions[keys[0]])contributions[keys[0]].push(1+4*(1-value/100));
        for(const key of keys.slice(1))if(contributions[key])contributions[key].push(1+4*(value/100));
      }else if(axis.kind==='tradeoff'&&keys.length===2){
        if(contributions[keys[0]])contributions[keys[0]].push(1+4*(1-value/100));
        if(contributions[keys[1]])contributions[keys[1]].push(1+4*(value/100));
      }else if(keys.length===1&&contributions[keys[0]])contributions[keys[0]].push(1+4*(value/100));
    }
    const out={}; for(const key in contributions){const rows=contributions[key];out[key]=rows.length?rows.reduce((sum,item)=>sum+item,0)/rows.length:0;}
    for(const key in out)out[key]=Math.round(out[key]*10)/10;
    return out;
  }

  function budgetWeights(criteria,contract,current){
    const out={}; for(const criterion of (criteria||[]))out[criterion.key]=0;
    for(const key in (current||{}))if(current[key]>0)out[key]=Math.min(2,current[key]);
    if(contract.budget&&contract.budget.criterion)out[contract.budget.criterion]=5;
    return out;
  }

  function ranked(engine,dataset,entries,weights,tieWeights){
    const criteria=dataset.criteria||[], tie=tieWeights||engine.themeDefaults(criteria);
    return (entries||[]).map(product=>({
      product,
      score:engine.score(product,{criteria,weights,excludes:new Set()}),
      tie:engine.score(product,{criteria,weights:tie,excludes:new Set()})
    })).filter(row=>row.score).sort((a,b)=>
      b.score.score-a.score.score||
      ((b.tie&&b.tie.score)||0)-((a.tie&&a.tie.score)||0)||
      a.product.name.localeCompare(b.product.name)
    );
  }

  function strictMetric(product,contract){
    const keys=Array.from(new Set(((contract.reads&&contract.reads.basis)||[]).map(row=>row.criterion).filter(Boolean)));
    const values=keys.map(key=>product.scores&&product.scores[key]);
    return values.length&&values.every(Number.isFinite)?Math.min(...values):-1;
  }

  function recipes(options){
    const {engine,dataset,contract,pool,values,tieWeights}=options;
    const weights=dialWeights(dataset.criteria,contract,values||{});
    const primary=ranked(engine,dataset,pool.entries,weights,tieWeights), answers=[];
    const slots=new Set(contract.archetypes||[]);
    if(slots.has('best-for-most')&&primary[0])answers.push({
      id:'best-for-most',label:'Best for most',
      definition:'The baseline and your rules first, then the choices you made here.',
      product:primary[0].product,score:primary[0].score,weights
    });
    if(slots.has('strictest-match')&&primary.length){
      const strict=primary.slice().sort((a,b)=>strictMetric(b.product,contract)-strictMetric(a.product,contract)||b.score.score-a.score.score)[0];
      if(strict)answers.push({
        id:'strictest-match',label:'Strictest match',
        definition:'The baseline and every rule, then the option with the strongest weakest reading.',
        product:strict.product,score:strict.score,weights,metric:strictMetric(strict.product,contract)
      });
    }
    if(slots.has('budget-honest')&&contract.budget&&contract.budget.available){
      const key=contract.budget.criterion;
      const known=(pool.entries||[]).filter(product=>Number.isFinite(product.scores&&product.scores[key]));
      const costWeights=budgetWeights(dataset.criteria,contract,weights);
      const costRank=ranked(engine,dataset,known,costWeights,tieWeights);
      if(costRank[0])answers.push({
        id:'budget-honest',label:'Budget, honest',
        definition:'The baseline and your rules, then a price-forward rank using only options with budget data.',
        product:costRank[0].product,score:costRank[0].score,weights:costWeights,budgetKnown:known.length
      });
    }
    const groups=[], seen=new Map();
    for(const answer of answers){
      const code=answer.product.code;
      if(seen.has(code))seen.get(code).recipes.push(answer);
      else{const group={product:answer.product,recipes:[answer]};seen.set(code,group);groups.push(group);}
    }
    return {groups,recipes:answers,ranked:primary,weights};
  }

  function criterionName(dataset,key,labeler){
    const criterion=(dataset.criteria||[]).find(row=>row.key===key);
    if(criterion)return labeler?labeler(criterion):(criterion.label||criterion.key);
    return String(key||'factor').replace(/_/g,' ');
  }

  /* Criterion labels are authored lowercase for mid-sentence use ("...where cost is strong"), so a
     sentence that opens with one has to be capitalised here rather than in the label itself. */
  const sentence=text=>String(text||'').replace(/^[a-z]/,ch=>ch.toUpperCase());

  function why(options){
    const {engine,dataset,contract,recipe}=options, product=recipe.product;
    const labeler=options.criterionLabel;
    if(recipe.id==='strictest-match'){
      const keys=((contract.reads&&contract.reads.basis)||[]).map(row=>row.criterion).filter(key=>Number.isFinite(product.scores&&product.scores[key]));
      keys.sort((a,b)=>product.scores[a]-product.scores[b]);
      const key=keys[0], value=key&&product.scores[key];
      if(key)return `Its weakest signed difference is ${criterionName(dataset,key,labeler)} at ${engine.band(value)[0].toLowerCase()}, stronger than the other eligible options.`;
    }
    if(recipe.id==='budget-honest'){
      const key=contract.budget&&contract.budget.criterion, value=key&&product.scores&&product.scores[key];
      if(Number.isFinite(value))return sentence(`${criterionName(dataset,key,labeler)} is ${engine.band(value)[0].toLowerCase()}; missing budget data never becomes a cheap guess.`);
    }
    const keys=Object.keys(recipe.weights||{}).filter(key=>Number.isFinite(product.scores&&product.scores[key]));
    keys.sort((a,b)=>(product.scores[b]-50)*(recipe.weights[b]||0)-(product.scores[a]-50)*(recipe.weights[a]||0));
    const key=keys[0], value=key&&product.scores[key];
    return key?sentence(`${criterionName(dataset,key,labeler)} is ${engine.band(value)[0].toLowerCase()} and does the most work with these choices.`):'This is the strongest eligible result with these choices.';
  }

  function mathHTML(options){
    const {dataset,contract,recipe,pool}=options, esc=options.escape||defaultEscape, product=recipe.product, rows=[];
    const labeler=options.criterionLabel;
    for(const criterion of (dataset.criteria||[])){
      const value=product.scores&&product.scores[criterion.key], weight=recipe.weights&&recipe.weights[criterion.key];
      if(!Number.isFinite(value)||!weight)continue;
      rows.push(`<div class="decision-math-row"><span>${esc(labeler?labeler(criterion):(criterion.label||criterion.key))}</span><span>${value} &times; ${weight}</span></div>`);
    }
    const strict=recipe.id==='strictest-match'&&recipe.metric>=0?`<p>Weakest signed difference: <b>${recipe.metric}/100</b>.</p>`:'';
    const budget=recipe.id==='budget-honest'?`<p>Budget facts available for <b>${recipe.budgetKnown}</b> eligible option${recipe.budgetKnown===1?'':'s'}; missing values were left out.</p>`:'';
    const floorCount=(pool.floorFolded||[]).length, personalCount=Number(pool.personalHidden||0);
    return `<section class="decision-math-recipe"><h4>${esc(recipe.label)}</h4><p>${esc(recipe.definition)}</p>${rows.join('')}<p class="decision-math-total">Weighted result: <b>${recipe.score.score}/100</b>.</p>${strict}${budget}<p>${floorCount?`${floorCount} folded by the baseline. `:''}${personalCount?`${personalCount} filtered by your rules. `:''}Unknown evidence stayed visible.</p></section>`;
  }

  function answerCardHTML(options){
    const {engine,dataset,contract,group,pool}=options, esc=options.escape||defaultEscape, product=group.product, primary=group.recipes[0];
    const labels=group.recipes.map(row=>row.label), merged=group.recipes.length>1?'<p class="decision-merge">These recipes reached the same option, so they share one card.</p>':'';
    const decor=options.decor?options.decor(product):'', proof=options.proof?options.proof(product):'';
    const href=options.href?options.href(product):'', action=href?`<a class="savebtn decision-verdict" href="${esc(href)}">${esc(options.actionLabel||'Open the full verdict')}</a>`:'';
    return `<article class="decision-answer">
      <div class="decision-answer-top"><div><div class="decision-recipe">${esc(labels.join(' + '))}</div><h3>${esc(product.name)}</h3>${product.brand?`<p class="decision-brand">${esc(product.brand)}</p>`:''}</div>${decor}</div>
      ${proof?`<div class="decision-answer-proof">${proof}</div>`:''}
      <p class="decision-answer-why">${esc(why({engine,dataset,contract,recipe:primary,criterionLabel:options.criterionLabel}))}</p>${merged}
      <details class="decision-math"><summary>Show the math</summary>${group.recipes.map(recipe=>mathHTML({dataset,contract,recipe,pool,escape:esc,criterionLabel:options.criterionLabel})).join('')}</details>${action}
    </article>`;
  }

  function dialPosition(axis,value){
    if(Number(value)===50)return 'Balanced';
    const pole=Number(value)<50?axis.poles[0]:axis.poles[1], strength=Math.abs(Number(value)-50)>=35?'Strongly':'Leaning';
    return `${strength} toward ${String(pole).toLowerCase()}`;
  }

  function dialHTML(axis,value,options={}){
    const esc=options.escape||defaultEscape, prefix=options.idPrefix||'decision-dial';
    return `<div class="decision-dial"><div class="decision-dial-head"><label for="${esc(prefix+'-'+axis.id)}">${esc(axis.question)}</label><output id="${esc(prefix+'-value-'+axis.id)}">${esc(dialPosition(axis,value))}</output></div><div class="decision-dial-control"><span>${esc(axis.poles[0])}</span><input id="${esc(prefix+'-'+axis.id)}" data-decision-axis="${esc(axis.id)}" type="range" min="0" max="100" step="5" value="${value}" aria-label="${esc(axis.question)} ${esc(axis.poles[0])} to ${esc(axis.poles[1])}"><span>${esc(axis.poles[1])}</span></div></div>`;
  }

  return {VERSION,dialValues,dialsAreDefault,dialWeights,budgetWeights,ranked,strictMetric,recipes,criterionName,why,mathHTML,answerCardHTML,dialPosition,dialHTML};
});
