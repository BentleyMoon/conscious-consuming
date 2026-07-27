'use strict';

function entityArray(lens) {
  return lens.products || lens.resources || [];
}

function rankEntities(lens, weights, engine) {
  const criteria = lens.criteria || [];
  return entityArray(lens)
    .map(entity => ({ entity, result: engine.score(entity, { criteria, weights }) }))
    .filter(row => row.result)
    .sort((a, b) => b.result.score - a.result.score || String(a.entity.code).localeCompare(String(b.entity.code)));
}

function buildTagMap(tags) {
  const out = new Map();
  for (const tag of tags || []) out.set(tag.id, tag);
  return out;
}

function steelmanCandidates(test, tags) {
  const weights = (test && test.userView && test.userView.weights) || {};
  const top = test && test.userView && test.userView.expectedTop;
  return Array.from(tags.values())
    .filter(tag => tag.category === test.category)
    .filter(tag => tag.entity === top)
    .filter(tag => tag.polarity === 'steelman-weakness')
    .filter(tag => (weights[tag.axis] || 0) <= 2)
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
}

function selectSteelmanTag(test, tags) {
  return steelmanCandidates(test, tags)[0] || null;
}

function selectOppositeStrengthTag(test, tags) {
  const expectedTop = test && test.oppositeView && test.oppositeView.expectedTop;
  return Array.from(tags.values())
    .filter(tag => tag.category === test.category)
    .filter(tag => tag.entity === expectedTop)
    .filter(tag => tag.polarity === 'opposite-view-strength')
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))[0] || null;
}

module.exports = {
  entityArray,
  rankEntities,
  buildTagMap,
  steelmanCandidates,
  selectSteelmanTag,
  selectOppositeStrengthTag
};
