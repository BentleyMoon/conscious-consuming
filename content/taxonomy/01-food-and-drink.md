realm: food-and-drink
label: Food and drink
need: nourish
type: P
mode: buy
cadence: weekly
coicop: 01, 02, 11
edge: Everything eaten or drunk, where it is bought, and where it is eaten. Food grown at home belongs here; the tools for growing it belong to Home. Food for animals belongs to Animals. Infant formula belongs to Family and care, because the decision there is about feeding a baby, not about groceries.

## Groceries | cadence: weekly

### Dairy and alternatives
- Milk | cid: milk
- Plant-based milk | cid: plant-based-milk | aka: oat milk, soy milk, almond milk, dairy-free milk
- Yogurt | cid: yogurt
- Plant-based yogurt | cid: plant-based-yogurt
- Cheese | cid: cheese
- Plant-based cheese | aka: vegan cheese
- Butter and spreads | cid: butter | aka: butter, margarine
- Cream and creamers
- Eggs | cid: eggs
- Egg replacers | aka: egg substitute

### Breakfast and bread
- Bread | cid: bread
- Breakfast cereal | cid: breakfast-cereal
- Granola and muesli | cid: granola
- Oats | cid: oats | aka: porridge oats
- Bakery and pastries
- Flatbreads and tortillas | aka: wraps, pita

### Fruit and vegetables | cadence: weekly
- Fresh fruit
- Fresh vegetables
- Salad and leaves | aka: bagged salad
- Fresh herbs
- Potatoes and roots
- Frozen vegetables | cid: frozen-vegetables
- Frozen fruit
- Canned vegetables | cid: canned-vegetables
- Canned tomatoes | cid: canned-tomatoes
- Canned fruit

### Meat, fish and protein
- Meat and poultry | aka: beef, chicken, pork
- Fish and seafood | cid: fish-seafood
- Canned fish | cid: canned-fish | aka: canned tuna and fish, tinned tuna
- Deli and cured meat | aka: ham, salami, charcuterie
- Plant-based meat | cid: plant-based-meat | aka: meat alternatives, vegan meat
- Tofu | cid: tofu
- Tempeh and seitan
- Beans and legumes | cid: legumes | aka: lentils, chickpeas, pulses

### Store cupboard | aka: pantry staples, pantry and cooking
- Rice | cid: rice
- Pasta | cid: pasta
- Noodles
- Flour and baking | cid: flour-baking | aka: baking ingredients
- Olive oil | cid: olive-oil
- Cooking oil | aka: sunflower oil, rapeseed oil, vegetable oil
- Vinegar
- Spices and seasonings | cid: spices-seasoning
- Stock and bouillon | aka: stock cubes, broth
- Sugar and sweeteners
- Salt
- Dried and instant meals | aka: instant noodles, couscous

### Jars, cans and sauces
- Pasta sauce | cid: pasta-sauce
- Cooking sauces and pastes | aka: curry paste, stir fry sauce
- Soups | cid: soups
- Pickles | cid: pickles | aka: pickled vegetables
- Olives and antipasti

### Spreads and condiments
- Nut butter | cid: nut-butter | aka: peanut butter
- Honey | cid: honey
- Fruit jam | cid: fruit-jam | aka: preserves, marmalade
- Chocolate spread | cid: chocolate-spread
- Ketchup | cid: ketchup
- Mayonnaise | cid: mayonnaise
- Mustard
- Hot sauce
- Salad dressing | cid: salad-dressing
- Syrups and toppings

### Prepared and frozen meals
- Ready meals | cid: ready-meals | aka: microwave meals
- Frozen pizza | cid: frozen-pizza
- Chilled pizza and dough
- Hummus and dips | cid: hummus
- Fresh soup and salad pots
- Meal kits | mode: subscribe | aka: recipe boxes, meal kit subscriptions

### Snacks and confectionery
- Dark chocolate | cid: dark-chocolate
- Chocolate bars | aka: confectionery, candy bars
- Sweets and candy | aka: gummies, jellies
- Biscuits and cookies | cid: biscuits
- Crisps and chips | cid: crisps
- Crackers | cid: crackers
- Popcorn and savoury snacks
- Nuts | cid: nuts
- Dried fruit | cid: dried-fruit
- Cereal and granola bars | cid: cereal-bars
- Ice cream | cid: ice-cream
- Frozen desserts and lollies

## Drinks | cadence: weekly

### Hot drinks
- Coffee | cid: coffee | aka: ground coffee, coffee beans
- Coffee pods and capsules | aka: nespresso pods
- Instant coffee
- Tea | cid: tea | aka: black tea, tea bags
- Herbal and fruit tea
- Hot chocolate and malt drinks

### Cold drinks
- Soda | cid: soda | aka: soft drinks, fizzy drinks, cola
- Fruit juice | cid: fruit-juice
- Smoothies
- Energy drinks | cid: energy-drinks
- Sports and electrolyte drinks
- Squash and cordial
- Iced tea and coffee
- Kombucha and fermented drinks

### Water
- Bottled water | aka: still water
- Sparkling water
- Water at home | aka: tap water, drinking water | hold: The decision here is a water supplier or a filter, and both are already decisions in Home. This line exists so the map does not imply drinking water is only something you buy in a bottle.

### Alcohol | coicop: 02
- Beer
- Wine
- Spirits | aka: liquor, vodka, whisky, gin
- Cider and perry
- Low and no alcohol drinks
- Ready-to-drink and mixers

### Tobacco and nicotine | coicop: 02
- Tobacco and cigarettes | out: The catalogue ranks options inside a decision so a reader can choose a better one. There is no better cigarette on the axes this site measures, and building the comparison would dress a health decision as a values decision. Named here so its absence is a position rather than an oversight.
- Vapes and nicotine pouches | out: Same reason as tobacco. The environmental case for a rechargeable vape over a disposable one is real, and it belongs in a guide about waste rather than in a ranking that would read as a recommendation to buy either.

## Eating out | coicop: 11 | type: S | mode: buy | cadence: weekly

### Restaurants and cafes
- Coffee shop chains
- Fast food chains
- Restaurant chains
- Independent restaurants and cafes | hold: Ranking individual local restaurants needs local data the catalogue does not have and could not keep fresh. The useful unit here is a guide to reading a menu and a kitchen, not a national league table.
- Pubs and bars

### Delivery and takeaway
- Food delivery platforms | aka: takeaway apps, delivery apps
- Grocery delivery services
- Takeaway packaging | type: P

### Food away from home
- Workplace catering | actor: organization
- School meals | actor: organization
- Vending and forecourt food
- Airline and station food

## Where food comes from | type: S

### Shops and suppliers
- Supermarkets | aka: grocery stores
- Discount supermarkets
- Online grocery
- Food co-operatives | aka: food co-ops, buying clubs
- Farmers markets | mode: buy
- Vegetable box schemes | mode: subscribe | aka: veg boxes, produce boxes
- Zero-waste and refill shops | aka: refill stores, package-free shops
- Wholesale and bulk buying | actor: household
- Butchers, bakers and greengrocers | aka: independent food shops

### Growing and gathering | type: P | mode: make
- Vegetable seeds and plants | aka: seeds
- Fruit trees and bushes
- Allotments and community gardens | type: S | actor: community
- Foraging | mode: free | hold: There is nothing to compare and nothing to buy. This belongs in a guide, and it sits on the map so that the free way of getting food is visible next to the paid ones.

### Surplus and waste | type: S
- Surplus food apps | aka: too good to go, food waste apps
- Food banks and pantries | type: I | mode: free | actor: community
- Community fridges | type: I | actor: community
- Composting food waste | mode: make
