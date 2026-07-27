#!/usr/bin/env node
/*
  Build the explicit Round 8 decision-contract batch from the scored category
  datasets and publish its Round 9 page posture. Five founder-reviewed pilot
  contracts remain hand-authored; this script applies the approved grammar to
  every other live category and rejects criteria that do not have both coverage
  and real spread.

  Usage:
    node pipeline/build_decisions.js
    node pipeline/build_decisions.js --check
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'app', 'data');
const INDEX_FILE = path.join(DATA, 'index.json');
const DECISIONS_FILE = path.join(ROOT, 'content', 'decisions.json');
const CHECK = process.argv.includes('--check');
const PUBLISHED = '2026-07-15';
const HAND_AUTHORED_IDS = new Set(['coffee', 'banking', 'cheese', 'phones', 'learning-resources']);
const PAGE_PILOT_IDS = new Set(['coffee', 'banking']);
const CERTIFICATION_LIMIT_PILOTS = new Set(['coffee', 'dark-chocolate', 'tea']);
const CERTIFICATION_KEYS = ['organic', 'fair_trade', 'rainforest_alliance'];

// S8 practical-copy pilot. These five representative reads were signed before
// the plain-language grammar was applied to the rest of the cost-aware batch.
// Keep this keyed by category: each question should name the practical choice
// in front of the person, not invent a universal name for everything else.
const COST_COPY_PILOT = {
  'breakfast-cereal': {
    label: 'Price or sugar',
    question: 'Lower observed price or less sugar?',
    poles: ['Lower price', 'Less sugar'],
    valueCriteria: ['low_sugar'],
  },
  coffee: {
    label: 'Price or sourcing',
    question: 'Lower observed price or certified sourcing?',
    poles: ['Lower price', 'Certified sourcing'],
    valueCriteria: ['fair_trade', 'organic', 'rainforest_alliance'],
  },
  razors: {
    label: 'Cost or durability',
    question: 'Lower cost or longer useful life?',
    poles: ['Lower cost', 'Longer life'],
    valueCriteria: ['durability'],
  },
  'learning-resources': {
    label: 'Cost or teaching quality',
    question: 'Lower cost or stronger teaching quality?',
    poles: ['Lower cost', 'Teaching quality'],
    valueCriteria: ['educational'],
  },
  'mobile-carriers': {
    label: 'Fees or privacy',
    question: 'Lower fees or less data exposure?',
    poles: ['Lower fees', 'Less exposure'],
    valueCriteria: ['privacy'],
  },
};

// The five hand-authored contracts keep their category-specific axes. Refresh
// their questions here so a rebuild cannot restore the old "should X lead"
// grammar from an earlier decisions file.
const HAND_AXIS_QUESTIONS = {
  coffee: {
    'ingredient-simplicity': 'Do you want fewer additives?',
  },
  cheese: {
    processing: 'Does simpler processing matter more?',
  },
  'learning-resources': {
    'attention-load': 'Do you want the calmer option?',
  },
  phones: {
    'keep-it-longer': 'Do you want longer software support?',
    repairability: 'Does easier repair matter more?',
    'ease-of-use': 'Do you need easier everyday use?',
  },
  banking: {
    'account-access': 'Do you need easier account access?',
  },
};

const COPY = {
  accessibility: ['everyday access', 'Access', 'Do you need easier everyday access?', 'Flexible', 'Easier access'],
  artist_pay: ['artist pay', 'Artist pay', 'Should fairer artist pay count more?', 'Flexible', 'Fairer artist pay'],
  calm: ['attention load', 'Attention load', 'Do you want the calmer option?', 'Flexible', 'Calmer experience'],
  catalog: ['catalog size', 'Catalog size', 'How much choice do you need?', 'Flexible', 'Larger catalog'],
  certification: ['certification', 'Certification', 'Do you want stronger certification?', 'Flexible', 'Stronger certification'],
  cruelty_free: ['animal-testing evidence', 'Animal-testing evidence', 'Do you need clearer animal-testing evidence?', 'Flexible', 'Stronger evidence'],
  depth: ['depth', 'Depth', 'Do you want deeper coverage?', 'Flexible', 'Deeper coverage'],
  durability: ['durability', 'Durability', 'Do you want a longer useful life?', 'Flexible', 'Longer life'],
  economical: ['cost', 'Cost', 'Does lower cost matter more?', 'Flexible', 'Lower cost'],
  educational: ['teaching quality', 'Teaching quality', 'Does teaching quality matter more?', 'Flexible', 'Teaching quality'],
  environment: ['environmental impact', 'Environmental impact', 'Does lower environmental impact matter more?', 'Flexible', 'Lower impact'],
  ethics: ['labor and sourcing', 'Labor and sourcing', 'Does stronger sourcing matter more?', 'Flexible', 'Stronger sourcing'],
  fair_trade: ['fair-trade certification', 'Fair-trade certification', 'Do you require fair-trade certification?', 'Flexible', 'Fair-trade certified'],
  fees: ['fees', 'Fees', 'Do lower fees matter more?', 'Flexible', 'Lower fees'],
  forest: ['forest sourcing', 'Forest sourcing', 'Do you want stronger forest sourcing?', 'Flexible', 'Stronger sourcing'],
  health: ['body safety', 'Body safety', 'Does body safety matter more?', 'Flexible', 'Body safety'],
  impact: ['demonstrated impact', 'Demonstrated impact', 'Does demonstrated impact matter more?', 'Flexible', 'Demonstrated impact'],
  independence: ['editorial independence', 'Editorial independence', 'Does editorial independence matter more?', 'Flexible', 'More independent'],
  jurisdiction: ['jurisdiction', 'Jurisdiction', 'Do you want the safer jurisdiction?', 'Flexible', 'Safer jurisdiction'],
  labor: ['labor practices', 'Labor practices', 'Do stronger labor practices matter more?', 'Flexible', 'Stronger labor'],
  local: ['local support', 'Local support', 'Does local support matter more?', 'Flexible', 'More local'],
  longevity: ['support life', 'Support life', 'Do you want longer support?', 'Flexible', 'Longer support'],
  low_sugar: ['sugar', 'Sugar', 'Does less sugar matter more?', 'Flexible', 'Less sugar'],
  nonprofit: ['nonprofit structure', 'Nonprofit structure', 'Do you prefer nonprofit ownership?', 'Flexible', 'Nonprofit'],
  nutrition_grade: ['nutrition', 'Nutrition', 'Does stronger nutrition matter more?', 'Flexible', 'Stronger nutrition'],
  openness: ['openness', 'Openness', 'Does openness matter more?', 'Flexible', 'More open'],
  organic: ['organic certification', 'Organic certification', 'Do you require organic certification?', 'Flexible', 'Organic certified'],
  ownership: ['ownership', 'Ownership', 'Does accountable ownership matter more?', 'Flexible', 'More accountable'],
  packaging: ['packaging', 'Packaging', 'Does lower-impact packaging matter more?', 'Flexible', 'Better packaging'],
  palm_oil: ['palm-oil signals', 'Palm-oil signals', 'Do you need palm-oil-free evidence?', 'Flexible', 'Palm-oil-free'],
  portability: ['data portability', 'Data portability', 'Does data portability matter more?', 'Flexible', 'More portable'],
  price: ['price', 'Price', 'Does lower price matter more?', 'Flexible', 'Lower price'],
  privacy: ['privacy', 'Privacy', 'Does less data exposure matter more?', 'Flexible', 'Less exposure'],
  processing: ['processing', 'Processing', 'Does simpler processing matter more?', 'Flexible', 'Simpler processing'],
  protein: ['protein', 'Protein', 'Does more protein matter more?', 'Flexible', 'More protein'],
  rainforest_alliance: ['Rainforest Alliance certification', 'Rainforest Alliance certification', 'Do you require Rainforest Alliance certification?', 'Flexible', 'Rainforest Alliance certified'],
  repairability: ['repairability', 'Repairability', 'Does easier repair matter more?', 'Flexible', 'Easier repair'],
  respect: ['respect for attention', 'Respect for attention', 'Do you want the more respectful option?', 'Flexible', 'More respectful'],
  safety: ['safety', 'Safety', 'Does stronger safety matter more?', 'Flexible', 'Stronger safety'],
  security: ['security', 'Security', 'Does stronger security matter more?', 'Flexible', 'Stronger security'],
  selection: ['selection', 'Selection', 'Do you need wider selection?', 'Flexible', 'Wider selection'],
  transparency: ['disclosure', 'Disclosure', 'Does stronger disclosure matter more?', 'Flexible', 'Stronger disclosure'],
  vegan: ['vegan formulas', 'Vegan formulas', 'Do you require a vegan formula?', 'Flexible', 'Vegan formulas'],
  ways_to_help: ['ways to help', 'Ways to help', 'Do you want more ways to help?', 'Flexible', 'More ways to help'],
};

const TRADEOFFS = {
  'accessibility|privacy': ['access-or-privacy', 'Access or privacy', 'Easier access or less data exposure?', ['Easier access', 'Less exposure']],
  'accessibility|security': ['access-or-security', 'Access or security', 'Easier access or stronger security?', ['Easier access', 'Stronger security']],
  'catalog|artist_pay': ['catalog-or-artist-pay', 'Catalog or artist pay', 'Larger catalog or fairer artist pay?', ['Larger catalog', 'Fairer artist pay']],
  'economical|certification': ['cost-or-certification', 'Cost or certification', 'Lower cost or stronger certification?', ['Lower cost', 'Stronger certification']],
  'economical|durability': ['cost-or-durability', 'Cost or durability', 'Lower cost or longer useful life?', ['Lower cost', 'Longer life']],
  'economical|educational': ['cost-or-teaching', 'Cost or teaching quality', 'Lower cost or stronger teaching quality?', ['Lower cost', 'Teaching quality']],
  'economical|environment': ['price-or-impact', 'Price or impact', 'Lower observed price or lower impact?', ['Lower price', 'Lower impact']],
  'economical|ethics': ['price-or-sourcing', 'Price or sourcing', 'Lower observed price or stronger sourcing?', ['Lower price', 'Stronger sourcing']],
  'economical|fair_trade': ['price-or-fair-trade', 'Price or fair trade', 'Lower observed price or fair-trade certification?', ['Lower price', 'Fair-trade certified']],
  'economical|health': ['cost-or-safety', 'Cost or body safety', 'Lower cost or stronger body safety?', ['Lower cost', 'Body safety']],
  'economical|low_sugar': ['price-or-sugar', 'Price or sugar', 'Lower observed price or less sugar?', ['Lower price', 'Less sugar']],
  'economical|nutrition_grade': ['price-or-nutrition', 'Price or nutrition', 'Lower observed price or stronger nutrition?', ['Lower price', 'Stronger nutrition']],
  'economical|privacy': ['cost-or-privacy', 'Cost or privacy', 'Lower cost or less data exposure?', ['Lower cost', 'Less exposure']],
  'economical|protein': ['price-or-protein', 'Price or protein', 'Lower observed price or more protein?', ['Lower price', 'More protein']],
  'fees|accessibility': ['fees-or-access', 'Fees or access', 'Lower fees or broader availability?', ['Lower fees', 'Broader access']],
  'fees|environment': ['fees-or-money-use', 'Fees or money use', 'Lower fees or cleaner use of money?', ['Lower fees', 'Cleaner money']],
  'fees|privacy': ['fees-or-privacy', 'Fees or privacy', 'Lower fees or less data exposure?', ['Lower fees', 'Less exposure']],
  'price|local': ['price-or-local', 'Price or local support', 'Lower price or stronger local support?', ['Lower price', 'More local']],
  'privacy|accessibility': ['privacy-or-setup', 'Privacy or setup', 'Less data exposure or easier setup?', ['Less exposure', 'Easier setup']],
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function statsFor(dataset, criterion) {
  const values = dataset.products
    .map((product) => product.scores && product.scores[criterion])
    .filter((value) => Number.isFinite(value));
  if (!values.length) return { known: 0, minimum: null, maximum: null, spread: 0 };
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return { known: values.length, minimum, maximum, spread: maximum - minimum };
}

function unique(items) {
  return [...new Set(items)];
}

function joinPhrases(items) {
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function decisionObjectLabel(category) {
  if (category.id === 'ai-assistants') return 'AI assistants';
  if (category.id === 'vpn') return 'VPNs';
  return category.label.toLowerCase();
}

function criterionAxis(criterion) {
  const copy = COPY[criterion];
  if (!copy) throw new Error(`Missing decision copy for criterion ${criterion}`);
  return {
    id: criterion.replaceAll('_', '-'),
    kind: 'criterion',
    label: copy[1],
    question: copy[2],
    criteria: [criterion],
    poles: [copy[3], copy[4]],
    default: 50,
  };
}

function tradeoffAxis(criteria) {
  const key = criteria.join('|');
  const copy = TRADEOFFS[key];
  if (!copy) throw new Error(`Missing decision copy for tradeoff ${key}`);
  return {
    id: copy[0],
    kind: 'tradeoff',
    label: copy[1],
    question: copy[2],
    criteria,
    poles: copy[3],
    default: 50,
  };
}

function costValuesAxis(category, budget, candidates) {
  const pilot = COST_COPY_PILOT[category];
  const availableValues = candidates.filter((criterion) => criterion !== budget.criterion);
  const values = pilot ? pilot.valueCriteria : availableValues;
  if (pilot) {
    const missing = values.filter((criterion) => !availableValues.includes(criterion));
    if (missing.length) throw new Error(`${category}: named S8 choice lacks populated criteria: ${missing.join(', ')}`);
  }
  if (!values.length) throw new Error(`No populated value criteria accompany ${budget.criterion}`);
  const costPole = budget.mode === 'observed-price-rank'
    ? 'Lower observed price'
    : (budget.mode === 'assessed-fees-rank' ? 'Lower fees' : 'Lower cost');
  const costLabel = budget.mode === 'observed-price-rank'
    ? 'Price'
    : (budget.mode === 'assessed-fees-rank' ? 'Fees' : 'Cost');
  return {
    id: 'cost-or-values',
    kind: 'cost-values',
    label: pilot ? pilot.label : `${costLabel} or overall fit`,
    question: pilot ? pilot.question : `${costPole} or a stronger overall fit?`,
    criteria: [budget.criterion, ...values],
    poles: pilot ? pilot.poles : [costPole, 'Stronger overall fit'],
    default: 50,
  };
}

function candidateCriteria(dataset) {
  const declared = dataset.criteria.map((criterion) => criterion.key);
  const tradeoff = Array.isArray(dataset.meta.tradeoff) ? dataset.meta.tradeoff : [];
  let ordered;
  if (dataset.meta.source === 'Open Food Facts') {
    ordered = [dataset.meta.primaryAxis, 'processing', 'nutrition_grade', 'economical', ...declared];
  } else if (dataset.meta.source === 'Open Beauty Facts') {
    ordered = ['transparency', 'vegan', 'palm_oil', 'organic', 'cruelty_free', ...declared];
  } else {
    ordered = [dataset.meta.primaryAxis, ...tradeoff, ...declared];
  }
  return unique(ordered.filter(Boolean)).filter((criterion) => {
    const stats = statsFor(dataset, criterion);
    return stats.known > 0 && stats.spread > 0;
  });
}

function budgetFor(dataset) {
  const choices = dataset.meta.source === 'Open Food Facts'
    ? [['economical', 'observed-price-rank']]
    : [['fees', 'assessed-fees-rank'], ['economical', 'assessed-affordability-rank'], ['price', 'assessed-affordability-rank']];
  for (const [criterion, mode] of choices) {
    const stats = statsFor(dataset, criterion);
    if (stats.known >= 5 && stats.spread > 0) {
      return { available: true, mode, criterion, minimumKnown: 5 };
    }
  }
  return { available: false, mode: 'none' };
}

function applyEvidenceLimits(contract, dataset) {
  delete contract.evidenceLimits;
  if (!CERTIFICATION_LIMIT_PILOTS.has(contract.category)) return contract;

  const evidence = dataset.meta && dataset.meta.certificationEvidence;
  if (!evidence || evidence.source !== 'Open Food Facts labels' || !/^20\d{2}$/.test(String(evidence.asOf || ''))) {
    throw new Error(`${contract.category}: certification evidence receipt is missing or invalid`);
  }
  if (evidence.entryCount !== dataset.products.length) {
    throw new Error(`${contract.category}: certification evidence entry count does not match the dataset`);
  }

  const declared = new Set(dataset.criteria.map((criterion) => criterion.key));
  const criteria = {};
  for (const criterion of CERTIFICATION_KEYS) {
    if (!declared.has(criterion)) throw new Error(`${contract.category}: evidence limit lacks declared ${criterion}`);
    const values = dataset.products
      .map((product) => product.scores && product.scores[criterion])
      .filter(Number.isFinite);
    if (values.some((value) => value !== 0 && value !== 100)) {
      throw new Error(`${contract.category}: ${criterion} certification scores must be binary when known`);
    }
    const positive = values.filter((value) => value === 100).length;
    const sourceReceipt = evidence.criteria && evidence.criteria[criterion];
    if (!sourceReceipt || sourceReceipt.known !== values.length || sourceReceipt.positive !== positive) {
      throw new Error(`${contract.category}: ${criterion} certification receipt drifted from product evidence`);
    }
    criteria[criterion] = {
      known: values.length,
      positive,
      knownCoverage: Number((values.length / dataset.products.length).toFixed(4)),
      positiveCoverage: Number((positive / dataset.products.length).toFixed(4)),
    };
  }

  contract.evidenceLimits = {
    state: 'partial',
    scoredCriteria: CERTIFICATION_KEYS,
    unscoredTopics: ['packaging', 'farmer pay'],
    summary: 'Organic, fair-trade and Rainforest Alliance certification are scored when product label data exists.',
    detail: 'Packaging and farmer pay are not scored. Missing certification labels remain unknown.',
    receipt: {
      source: evidence.source,
      asOf: evidence.asOf,
      entryCount: dataset.products.length,
      missingRule: evidence.missingRule,
      criteria,
    },
  };
  return contract;
}

function buildContract(category, dataset) {
  const candidates = candidateCriteria(dataset);
  if (candidates.length < 2) {
    throw new Error(`${category.id}: fewer than two criteria have coverage and spread`);
  }
  const basisKeys = candidates.slice(0, 4);
  const basis = basisKeys.map((criterion) => ({ criterion, readsAs: COPY[criterion][0] }));
  const text = `Compare ${decisionObjectLabel(category)} by ${joinPhrases(basis.map((item) => item.readsAs))}.`;
  if (text.length > 140 || text.trim().split(/\s+/).length > 24) {
    throw new Error(`${category.id}: generated read is too long: ${text}`);
  }

  const axes = [];
  const used = new Set();
  const tradeoff = Array.isArray(dataset.meta.tradeoff) ? dataset.meta.tradeoff : [];
  if (tradeoff.length === 2 && tradeoff.every((criterion) => candidates.includes(criterion))) {
    axes.push(tradeoffAxis(tradeoff));
    tradeoff.forEach((criterion) => used.add(criterion));
  }
  for (const criterion of candidates) {
    if (axes.length >= 2) break;
    if (used.has(criterion)) continue;
    axes.push(criterionAxis(criterion));
    used.add(criterion);
  }

  const budget = budgetFor(dataset);
  const archetypes = ['best-for-most', 'strictest-match'];
  if (budget.available) archetypes.push('budget-honest');

  return applyCostDefault({
    category: category.id,
    reads: {
      text,
      basis,
      signature: { by: 'Conscious Consuming', on: PUBLISHED, status: 'approved-batch' },
    },
    axes,
    budget,
    archetypes,
    page: { stage: 'approved-batch', primaryRoute: true },
  }, dataset);
}

function applyCostDefault(contract, dataset) {
  const budget = budgetFor(dataset);
  contract.budget = budget;
  contract.archetypes = ['best-for-most', 'strictest-match'];
  if (!budget.available) return contract;

  const candidates = candidateCriteria(dataset);
  const first = costValuesAxis(contract.category, budget, candidates);
  const remaining = (contract.axes || [])
    .filter((axis) => axis.id !== first.id && !(axis.criteria || []).includes(budget.criterion))
    .slice(0, 2);
  contract.axes = [first, ...remaining];
  contract.archetypes.push('budget-honest');
  return contract;
}

function refreshHandAuthoredQuestions(contract) {
  const questions = HAND_AXIS_QUESTIONS[contract.category] || {};
  for (const axis of contract.axes || []) {
    if (questions[axis.id]) axis.question = questions[axis.id];
  }
  return contract;
}

function main() {
  const current = readJson(DECISIONS_FILE);
  const pilots = new Map(current.contracts
    .filter((contract) => HAND_AUTHORED_IDS.has(contract.category))
    .map((contract) => [contract.category, contract]));
  for (const id of HAND_AUTHORED_IDS) {
    if (!pilots.has(id)) throw new Error(`Missing hand-authored pilot contract ${id}`);
  }

  const index = readJson(INDEX_FILE);
  const contracts = index.categories.map((category) => {
    const dataset = readJson(path.join(DATA, category.file));
    let contract;
    if (pilots.has(category.id)) {
      contract = JSON.parse(JSON.stringify(pilots.get(category.id)));
      contract.page = PAGE_PILOT_IDS.has(category.id)
        ? { stage: 'approved-pilot', primaryRoute: true }
        : { stage: 'approved-batch', primaryRoute: true };
      contract = refreshHandAuthoredQuestions(applyCostDefault(contract, dataset));
    } else {
      contract = buildContract(category, dataset);
    }
    return applyEvidenceLimits(contract, dataset);
  });

  const output = {
    format: 'open-values-decision-contracts',
    version: '0.2.0',
    published: PUBLISHED,
    status: 'founder-approved',
    approval: {
      on: PUBLISHED,
      scope: 'S4 cost-or-values default for every live category with dependable cost evidence, preserving Coffee and Banking as the founder-approved pilot baseline.',
      signal: 'Founder continued the program through Round 6, the Round 8 contract batch, and the Round 9 rollout, then continued the gated core program to development Round 7 after signing the plain-words batch.',
    },
    copyPilot: {
      status: 'approved-batch',
      on: '2026-07-18',
      scope: 'Five representative S8 cost-choice reads were signed, then the plain-language grammar was applied to every cost-aware category.',
      categories: Object.keys(COST_COPY_PILOT),
      batchGate: 'Cleared: the five representative labels, questions, and pole pairs were signed before the batch changed.',
    },
    consumer: {
      reads: 'Round 8 approved category differences reads.',
      axes: 'Round 8 practical decision dials, with the S4 cost-or-values default where evidence permits.',
      budget: 'Round 8 honest budget eligibility, with S4 refusing to guess missing cost data.',
      archetypes: 'Round 8 computed answer slots matched to available category evidence.',
      page: 'Round 7 personal precedence extended in Round 9 to the shared decision page for every live category.',
    },
    contracts,
  };
  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  const existing = fs.readFileSync(DECISIONS_FILE, 'utf8');
  if (CHECK) {
    if (existing !== serialized) {
      console.error('DECISION CONTRACT CHECK FAIL: content/decisions.json is out of date.');
      process.exit(1);
    }
    console.log(`DECISION CONTRACT CHECK PASS: ${contracts.length} category contracts are current.`);
    return;
  }
  fs.writeFileSync(DECISIONS_FILE, serialized, 'utf8');
  console.log(`Wrote ${contracts.length} category contracts to ${path.relative(ROOT, DECISIONS_FILE)}.`);
}

main();
