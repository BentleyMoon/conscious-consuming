#!/usr/bin/env python3
"""Unit tests for the scoring engine. Run: python test_scoring.py

Locks in the design/dev-critique fixes: absolute (stable) sub-scores, structured
allergen tags as primary, and the keyword false-positives (oat/malt -> gluten) gone.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scoring as S

passed = 0
def check(name, cond):
    global passed
    print(('  ok   ' if cond else 'FAIL  ') + name)
    assert cond, 'FAILED: ' + name
    passed += 1

# --- absolute sub-scores (stable across data refreshes) ---
check('protein 0g -> 0', S._protein_score(0) == 0)
check('protein 8g -> 100 (cap)', S._protein_score(8) == 100)
check('protein 4g -> 50', S._protein_score(4) == 50)
check('protein None -> None', S._protein_score(None) is None)
check('low_sugar 0g -> 100', S._low_sugar_score(0) == 100)
check('low_sugar 25g -> 0', S._low_sugar_score(25) == 0)
check('low_sugar 5g -> 80', S._low_sugar_score(5) == 80)

# --- keyword fallback: the critique's false positives MUST be gone ---
check('Mandel (German) -> nuts', 'nuts' in S.detect_allergens('Zutaten: Mandel, Wasser'))
check('oat is NOT flagged gluten', 'gluten' not in S.detect_allergens('oat base, avoine'))
check('maltodextrin is NOT flagged gluten', 'gluten' not in S.detect_allergens('maltodextrine, sucre'))
check('wheat IS gluten', 'gluten' in S.detect_allergens('wheat flour'))
check('sans gluten is NOT a gluten declaration', 'gluten' not in S.detect_allergens('flocons avoine sans gluten'))
check('gluten-free is NOT a gluten declaration', 'gluten' not in S.detect_allergens('gluten-free oats'))
check('concrete wheat still declares gluten beside free wording', 'gluten' in S.detect_allergens('gluten-free wheat flour'))
check('soja -> soy', 'soy' in S.detect_allergens('boisson soja'))
check('eggplant is NOT flagged eggs', 'eggs' not in S.detect_allergens('eggplant, tomato'))
check('shrimp -> crustaceans', 'crustaceans' in S.detect_allergens('shrimp, salt'))
check('milk and lactose remain distinct', set(S.detect_allergens('milk, lactose')) >= {'milk', 'lactose'})
check('sans lactose is NOT a lactose declaration', 'lactose' not in S.detect_allergens('lait sans lactose'))
check('lactose-free milk still declares milk', S.detect_allergens('lactose-free milk') == ['milk'])

# --- allergen_info: structured tags primary; declared flag honest ---
a, d = S.allergen_info({'allergens_tags': ['en:nuts'], 'ingredients_text': 'Mandel'})
check('declared tags -> nuts + declared', a == ['nuts'] and d is True)
a, d = S.allergen_info({'ingredients_text': 'amande, eau'})
check('no tags -> keyword fallback, NOT declared', a == ['nuts'] and d is False)
a, d = S.allergen_info({'allergens_tags': ['en:milk'], 'ingredients_text': 'lait'})
check('milk tag -> milk + declared', a == ['milk'] and d is True)
a, d = S.allergen_info({'ingredients_text': ''})
check('no data -> [] + not declared (=> "unavailable" in UI)', a == [] and d is False)
e = S.allergen_evidence({'labels_tags': ['en:lactose-free'], 'ingredients_text': ''})
check('explicit lactose-free claim is distinct', e == {'declares': [], 'declaredFree': ['lactose']})
e = S.allergen_evidence({'labels_tags': ['en:no-gluten', 'en:no-lactose'], 'ingredients_text': 'oats'})
check('OFF no-* labels become explicit free claims', e == {'declares': [], 'declaredFree': ['gluten', 'lactose']})
e = S.allergen_evidence({'labels_tags': ['en:free-from-dairy-and-gluten'], 'ingredients_text': ''})
check('combined dairy/gluten claim clears both', e == {'declares': [], 'declaredFree': ['gluten', 'milk']})
e = S.allergen_evidence({'allergens_tags': ['en:milk'], 'labels_tags': ['en:milk-free'], 'ingredients_text': ''})
check('declaration wins over contradictory free claim', e == {'declares': ['milk'], 'declaredFree': []})

# --- score_category end-to-end ---
prod = {'code': '1', 'product_name': 'Test soy drink', 'brands': 'X', 'nutriscore_grade': 'b',
        'nova_group': 1, 'ecoscore_grade': 'a', 'labels_tags': ['en:organic'],
        'ingredients_text': 'soja, eau', 'allergens_tags': ['en:soybeans'],
        'nutriments': {'proteins_100g': 3.5, 'sugars_100g': 2.5}}
out = S.score_category([prod])
check('one valid product scored', len(out) == 1)
r = out[0]
check('nutrition_grade b -> 75', r['scores']['nutrition_grade'] == 75)
check('nova 1 -> 100', r['scores']['processing'] == 100)
check('environment a -> 100', r['scores']['environment'] == 100)
check('protein 3.5 -> 44', r['scores']['protein'] == round(3.5 * 12.5))
check('allergens from tags = [soy], declared', r['allergens'] == ['soy'] and r['allergensDeclared'] is True)
check('three-state evidence emitted', r['allergenEvidence'] == {'declares': ['soy'], 'declaredFree': []})
check('provenance protein is sourced object',
      r['provenance']['protein']['source'].endswith('/product/1') and
      r['provenance']['protein']['asof'] == S.ASOF and
      '3.5 g' in r['provenance']['protein']['note'])
check('product metadata has source link + region',
      r['links'][0]['url'].endswith('/product/1') and r['region'] == ['global'] and bool(r['description']))
check('sparse product (1 known sub-score) is dropped',
      len(S.score_category([{'product_name': 'x', 'nutriscore_grade': 'a'}])) == 0)

# --- category assignment: a broad OFF parent tag cannot overrule the product's own identity ---
check('spices admits a named seasoning',
      S.product_belongs_to_category({'product_name': 'Sel de table iodé'}, 'spices-seasoning'))
check('spices rejects hummus even under a broad spices tag',
      not S.product_belongs_to_category(
          {'product_name': 'Houmous bio', 'categories_tags': ['en:spices']}, 'spices-seasoning'))
check('spices rejects an unplaced generic name',
      not S.product_belongs_to_category({'product_name': 'Classique'}, 'spices-seasoning'))
check('fruit jam admits a named preserve',
      S.product_belongs_to_category({'product_name': 'Marmellata albicocca'}, 'fruit-jam'))
check('fruit jam rejects tomato concentrate',
      not S.product_belongs_to_category({'product_name': 'Double concentré de tomates'}, 'fruit-jam'))
check('honey admits a named honey',
      S.product_belongs_to_category({'product_name': 'Miel de fleurs'}, 'honey'))
check('honey rejects hummus',
      not S.product_belongs_to_category({'product_name': 'reduced fat houmous'}, 'honey'))
check('pasta sauce rejects the measured oats leak',
      not S.product_belongs_to_category({'product_name': 'Steel Cut Oats Quick'}, 'pasta-sauce'))
check('fruit juice rejects the measured soy-drink leak',
      not S.product_belongs_to_category({'product_name': 'Soja Bio'}, 'fruit-juice'))
check('butter rejects peanut butter across measured languages',
      all(not S.product_belongs_to_category({'product_name': name}, 'butter')
          for name in ("Burro d'arachidi", 'Manteiga 100% Amendoim', 'peanut butter crunchy')))
check('cereal bars reject loose cereal but retain an explicitly named bar',
      not S.product_belongs_to_category({'product_name': "Flocons d'avoine"}, 'cereal-bars') and
      not S.product_belongs_to_category({'product_name': 'Muesli croustillant chocolat'}, 'cereal-bars') and
      S.product_belongs_to_category({'product_name': 'Nature Valley Crunchy Oats & Honey'}, 'cereal-bars'))
check('dried fruit rejects peanut-only identities but retains a date bite',
      not S.product_belongs_to_category(
          {'product_name': "Arachides en coques, grillees d'Egypte"}, 'dried-fruit') and
      S.product_belongs_to_category({'product_name': 'DATE BITES PEANUT & COCOA'}, 'dried-fruit'))
check('bounded category guards leave unfamiliar names unchanged',
      S.product_belongs_to_category({'product_name': 'Maison classique'}, 'pasta-sauce'))
check('unguarded categories remain unchanged',
      S.product_belongs_to_category({'product_name': 'Anything'}, 'coffee'))

# --- S8 certification split: three facts, with unknown kept distinct from absent ---
split = S.score_category([prod], split_certifications=True)[0]
check('split removes the collapsed ethics score', 'ethics' not in split['scores'])
check('organic label scores only organic',
      split['scores']['organic'] == 100 and split['scores']['fair_trade'] == 0 and
      split['scores']['rainforest_alliance'] == 0)
check('each known certification fact has dated provenance',
      all(split['provenance'][key]['asof'] == S.ASOF
          for key in ('organic', 'fair_trade', 'rainforest_alliance')))
check('split focus agrees with the certification score',
      'Organic' in split['focuses'] and 'Fair Trade' not in split['focuses'])
variant = dict(prod, labels_tags=['en:fairtrade-cocoa', 'en:rainforest-alliance-cocoa'])
variant_split = S.score_category([variant], split_certifications=True)[0]
check('named cocoa certification tags remain distinct',
      variant_split['scores']['organic'] == 0 and variant_split['scores']['fair_trade'] == 100 and
      variant_split['scores']['rainforest_alliance'] == 100)
unknown = dict(prod, labels_tags=[])
unknown_split = S.score_category([unknown], split_certifications=True)[0]
check('no OFF labels means unknown, not an absent certification',
      all(unknown_split['scores'][key] is None
          for key in ('organic', 'fair_trade', 'rainforest_alliance')) and
      all(key not in unknown_split['provenance']
          for key in ('organic', 'fair_trade', 'rainforest_alliance')))
check('split labels count once for roster admission',
      S.score_category([{'product_name': 'label only', 'labels_tags': ['en:organic']}],
                       split_certifications=True) == [])
check('legacy scoring stays collapsed outside the pilot',
      S.score_category([prod])[0]['scores']['ethics'] == 50)
check('certification helper keeps missing labels unknown',
      all(value is None for value in S.certification_scores([]).values()))
check('certification helper treats an unmatched present label as known absent',
      all(value == 0 for value in S.certification_scores(['en:vegan']).values()))
check('certification helper recognizes named certification variants',
      S.certification_scores(['en:soil-association-organic', 'en:fair-for-life',
                              'en:rainforest-alliance-tea']) == {
          'organic': 100, 'fair_trade': 100, 'rainforest_alliance': 100})

print(f'\nAll {passed} scoring tests passed.')
