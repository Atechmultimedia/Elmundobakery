/* ============================================================
   Free built-in recipe library — Ghanaian bakery varieties.
   Structure: TYPE -> [ VARIETY -> { Standard, Premium, Luxury } ]
   Every recipe: batch yield, ingredients (g/kg/ml/L/pcs),
   method, suggested price. Works offline, no API, no cost.
   Ingredient NAMES are chosen to match common inventory items
   so auto-linking to your stock works well.
   ============================================================ */

function _r(name, desc, yq, yu, price, ings, method, notes) {
  return { name, description: desc, yield_qty: yq, yield_unit: yu,
           suggested_price_ghs: price, ingredients: ings, method: method, notes: notes || "" };
}

const RECIPE_LIBRARY = {
  "Bread": [
    { variety: "Sugar Bread", tiers: {
      Standard: _r("Sugar Bread (Standard)", "Soft, lightly sweet everyday loaf.", 20, "loaf", 12,
        [{name:"Flour",qty:5,unit:"kg"},{name:"Sugar",qty:750,unit:"g"},{name:"Yeast",qty:100,unit:"g"},{name:"Salt",qty:60,unit:"g"},{name:"Butter",qty:400,unit:"g"},{name:"Milk Powder",qty:250,unit:"g"},{name:"Water",qty:2.6,unit:"L"}],
        ["Froth yeast in warm water with a little sugar.","Mix flour, sugar, salt, milk powder.","Add yeast and butter; knead 12–15 min.","Prove 1 hr, knock back, divide into 20.","Prove 40 min; bake 180°C for 25–30 min."],
        "Brush with sugar-water glaze out of the oven for shine."),
      Premium: _r("Sugar Bread (Premium)", "Richer sugar bread with butter and eggs.", 20, "loaf", 18,
        [{name:"Flour",qty:5,unit:"kg"},{name:"Sugar",qty:900,unit:"g"},{name:"Yeast",qty:110,unit:"g"},{name:"Salt",qty:60,unit:"g"},{name:"Butter",qty:800,unit:"g"},{name:"Milk Powder",qty:400,unit:"g"},{name:"Eggs",qty:6,unit:"pcs"},{name:"Water",qty:2.3,unit:"L"}],
        ["Activate yeast.","Combine dry, add eggs, yeast, butter.","Knead 15 min to smooth dough.","Prove, divide into 20, prove again.","Bake 180°C 28–32 min; butter tops warm."],
        "Extra butter/eggs shorten shelf life — bake to demand."),
      Luxury: _r("Sugar Brioche (Luxury)", "Buttery brioche-style sweet loaf.", 12, "loaf", 35,
        [{name:"Flour",qty:3,unit:"kg"},{name:"Sugar",qty:500,unit:"g"},{name:"Yeast",qty:90,unit:"g"},{name:"Salt",qty:45,unit:"g"},{name:"Butter",qty:1.5,unit:"kg"},{name:"Eggs",qty:24,unit:"pcs"},{name:"Milk",qty:500,unit:"ml"}],
        ["Warm milk, activate yeast.","Mix flour, sugar, salt; add eggs and yeast-milk.","Add butter in stages until silky.","Prove, then cold-prove overnight.","Divide into 12; bake 170°C 30–35 min."],
        "Overnight cold prove is essential for texture.") } },

    { variety: "Wheat Bread", tiers: {
      Standard: _r("Wheat Bread (Standard)", "Wholesome everyday wheat loaf.", 20, "loaf", 15,
        [{name:"Wheat Flour",qty:3,unit:"kg"},{name:"Flour",qty:2,unit:"kg"},{name:"Sugar",qty:400,unit:"g"},{name:"Yeast",qty:100,unit:"g"},{name:"Salt",qty:60,unit:"g"},{name:"Butter",qty:300,unit:"g"},{name:"Water",qty:2.8,unit:"L"}],
        ["Froth yeast in warm water.","Mix wheat and white flour, sugar, salt.","Add yeast and butter; knead well (wheat needs more).","Prove 1 hr, divide into 20.","Bake 180°C 30–35 min."],
        "Blend of wheat and white flour keeps it light, not dense."),
      Premium: _r("Wheat Bread (Premium)", "Higher-wheat loaf with honey and seeds.", 18, "loaf", 22,
        [{name:"Wheat Flour",qty:4,unit:"kg"},{name:"Flour",qty:1,unit:"kg"},{name:"Honey",qty:400,unit:"g"},{name:"Yeast",qty:110,unit:"g"},{name:"Salt",qty:60,unit:"g"},{name:"Butter",qty:500,unit:"g"},{name:"Water",qty:2.9,unit:"L"}],
        ["Activate yeast with honey in warm water.","Mix flours and salt; add yeast, butter.","Knead thoroughly; prove 1.5 hr.","Divide into 18; prove.","Bake 180°C 32–36 min."],
        "Honey adds moisture and a soft crust."),
      Luxury: _r("Whole-Grain Multiseed (Luxury)", "Dense, nutritious multiseed wholegrain loaf.", 14, "loaf", 30,
        [{name:"Wheat Flour",qty:4.5,unit:"kg"},{name:"Honey",qty:500,unit:"g"},{name:"Yeast",qty:100,unit:"g"},{name:"Salt",qty:60,unit:"g"},{name:"Butter",qty:400,unit:"g"},{name:"Mixed Seeds",qty:600,unit:"g"},{name:"Water",qty:3,unit:"L"}],
        ["Activate yeast with honey.","Mix flour, salt, most seeds.","Add wet; knead; prove 1.5 hr.","Shape into 14, top with seeds.","Bake 185°C 35–40 min."],
        "Soak seeds briefly so they don't scorch.") } },

    { variety: "Tea Bread", tiers: {
      Standard: _r("Tea Bread (Standard)", "Firm, mildly sweet loaf for tea and sandwiches.", 24, "loaf", 10,
        [{name:"Flour",qty:5,unit:"kg"},{name:"Sugar",qty:500,unit:"g"},{name:"Yeast",qty:100,unit:"g"},{name:"Salt",qty:70,unit:"g"},{name:"Butter",qty:250,unit:"g"},{name:"Water",qty:2.7,unit:"L"}],
        ["Froth yeast.","Mix dry; add yeast and butter.","Knead; prove 1 hr.","Divide into 24, shape long.","Bake 180°C 25–28 min."],
        "Bake slightly firmer — tea bread is meant to hold up to spreads."),
      Premium: _r("Tea Bread (Premium)", "Softer, buttery tea loaf.", 24, "loaf", 14,
        [{name:"Flour",qty:5,unit:"kg"},{name:"Sugar",qty:650,unit:"g"},{name:"Yeast",qty:110,unit:"g"},{name:"Salt",qty:70,unit:"g"},{name:"Butter",qty:500,unit:"g"},{name:"Milk Powder",qty:300,unit:"g"},{name:"Water",qty:2.5,unit:"L"}],
        ["Activate yeast.","Mix dry incl. milk powder; add butter.","Knead; prove; divide into 24.","Prove; bake 180°C 26–30 min."],
        "Milk powder softens the crumb."),
      Luxury: _r("Milk Tea Loaf (Luxury)", "Rich milk-enriched soft tea loaf.", 18, "loaf", 22,
        [{name:"Flour",qty:4,unit:"kg"},{name:"Sugar",qty:600,unit:"g"},{name:"Yeast",qty:100,unit:"g"},{name:"Salt",qty:55,unit:"g"},{name:"Butter",qty:800,unit:"g"},{name:"Milk",qty:1.5,unit:"L"},{name:"Eggs",qty:8,unit:"pcs"}],
        ["Warm milk, activate yeast.","Mix dry; add eggs, milk, butter.","Knead to soft dough; prove.","Divide into 18; prove.","Bake 175°C 28–32 min."],
        "All-milk (no water) gives a tender, rich crumb.") } },

    { variety: "Coconut Bread", tiers: {
      Standard: _r("Coconut Bread (Standard)", "Sweet loaf with grated coconut.", 20, "loaf", 15,
        [{name:"Flour",qty:5,unit:"kg"},{name:"Sugar",qty:800,unit:"g"},{name:"Yeast",qty:100,unit:"g"},{name:"Salt",qty:55,unit:"g"},{name:"Butter",qty:400,unit:"g"},{name:"Grated Coconut",qty:800,unit:"g"},{name:"Water",qty:2.4,unit:"L"}],
        ["Froth yeast.","Mix dry; fold in coconut.","Add yeast and butter; knead.","Prove; divide into 20.","Bake 180°C 28–32 min."],
        "Toast some coconut for topping and extra aroma."),
      Premium: _r("Coconut Bread (Premium)", "Richer coconut loaf with milk.", 20, "loaf", 20,
        [{name:"Flour",qty:5,unit:"kg"},{name:"Sugar",qty:900,unit:"g"},{name:"Yeast",qty:110,unit:"g"},{name:"Salt",qty:55,unit:"g"},{name:"Butter",qty:600,unit:"g"},{name:"Grated Coconut",qty:1,unit:"kg"},{name:"Coconut Milk",qty:1,unit:"L"},{name:"Water",qty:1.5,unit:"L"}],
        ["Activate yeast.","Mix dry and coconut.","Add coconut milk, butter; knead.","Prove; divide into 20; prove.","Bake 180°C 30–34 min."],
        "Coconut milk deepens the flavour."),
      Luxury: _r("Coconut Custard Plait (Luxury)", "Enriched plaited loaf with coconut custard.", 12, "loaf", 32,
        [{name:"Flour",qty:3,unit:"kg"},{name:"Sugar",qty:600,unit:"g"},{name:"Yeast",qty:90,unit:"g"},{name:"Salt",qty:45,unit:"g"},{name:"Butter",qty:1,unit:"kg"},{name:"Eggs",qty:16,unit:"pcs"},{name:"Grated Coconut",qty:600,unit:"g"},{name:"Custard Powder",qty:200,unit:"g"},{name:"Milk",qty:800,unit:"ml"}],
        ["Make enriched dough; prove.","Cook coconut custard filling; cool.","Roll, fill, plait into 12.","Prove; egg-wash.","Bake 175°C 30–34 min."],
        "Cool the custard fully before filling.") } },

    { variety: "Butter Bread", tiers: {
      Standard: _r("Butter Bread (Standard)", "Soft buttery pull-apart loaf.", 20, "loaf", 14,
        [{name:"Flour",qty:5,unit:"kg"},{name:"Sugar",qty:700,unit:"g"},{name:"Yeast",qty:100,unit:"g"},{name:"Salt",qty:60,unit:"g"},{name:"Butter",qty:700,unit:"g"},{name:"Milk Powder",qty:300,unit:"g"},{name:"Water",qty:2.4,unit:"L"}],
        ["Froth yeast.","Mix dry; add butter and yeast.","Knead; prove.","Divide into 20; prove.","Bake 180°C 26–30 min; brush with butter."],
        "Brush with melted butter twice — before and after baking."),
      Premium: _r("Butter Bread (Premium)", "Extra-rich butter loaf with eggs.", 18, "loaf", 20,
        [{name:"Flour",qty:5,unit:"kg"},{name:"Sugar",qty:800,unit:"g"},{name:"Yeast",qty:110,unit:"g"},{name:"Salt",qty:60,unit:"g"},{name:"Butter",qty:1,unit:"kg"},{name:"Eggs",qty:10,unit:"pcs"},{name:"Milk",qty:1.8,unit:"L"}],
        ["Activate yeast in warm milk.","Mix dry; add eggs and butter.","Knead; prove; divide into 18.","Prove; bake 180°C 28–32 min."],
        "Rich dough browns fast — watch the last 5 minutes."),
      Luxury: _r("French Butter Brioche (Luxury)", "Classic all-butter brioche.", 12, "loaf", 35,
        [{name:"Flour",qty:3,unit:"kg"},{name:"Sugar",qty:500,unit:"g"},{name:"Yeast",qty:90,unit:"g"},{name:"Salt",qty:45,unit:"g"},{name:"Butter",qty:1.5,unit:"kg"},{name:"Eggs",qty:24,unit:"pcs"},{name:"Milk",qty:500,unit:"ml"}],
        ["Activate yeast in warm milk.","Mix flour, sugar, salt; add eggs, yeast.","Add butter in stages until silky.","Prove, cold-prove overnight.","Bake 170°C 30–35 min."],
        "The overnight prove makes the brioche.") } }
  ],

  "Cake": [
    { variety: "Vanilla Cake", tiers: {
      Standard: _r("Vanilla Butter Cake (Standard)", "Classic moist vanilla cake.", 2, "cake", 80,
        [{name:"Flour",qty:1,unit:"kg"},{name:"Sugar",qty:800,unit:"g"},{name:"Butter",qty:700,unit:"g"},{name:"Eggs",qty:16,unit:"pcs"},{name:"Baking Powder",qty:40,unit:"g"},{name:"Milk",qty:400,unit:"ml"},{name:"Vanilla",qty:30,unit:"ml"}],
        ["Cream butter and sugar.","Add eggs one at a time.","Fold flour and baking powder with milk.","Add vanilla; divide into 2 tins.","Bake 170°C 40–45 min."],
        "Don't overmix once flour is in."),
      Premium: _r("Vanilla Bean Cake (Premium)", "Fine-crumb cake with real vanilla and buttermilk.", 2, "cake", 120,
        [{name:"Flour",qty:1,unit:"kg"},{name:"Sugar",qty:850,unit:"g"},{name:"Butter",qty:800,unit:"g"},{name:"Eggs",qty:18,unit:"pcs"},{name:"Baking Powder",qty:40,unit:"g"},{name:"Buttermilk",qty:500,unit:"ml"},{name:"Vanilla",qty:50,unit:"ml"}],
        ["Cream butter and sugar until pale.","Beat in eggs and vanilla.","Fold flour with buttermilk.","Bake 165°C 45–50 min."],
        "Buttermilk gives a tender, fine crumb."),
      Luxury: _r("Vanilla Celebration Cake (Luxury)", "Tall layered cake with vanilla buttercream.", 2, "cake", 200,
        [{name:"Flour",qty:1.2,unit:"kg"},{name:"Sugar",qty:1,unit:"kg"},{name:"Butter",qty:1.2,unit:"kg"},{name:"Eggs",qty:20,unit:"pcs"},{name:"Baking Powder",qty:45,unit:"g"},{name:"Milk",qty:400,unit:"ml"},{name:"Vanilla",qty:60,unit:"ml"},{name:"Icing Sugar",qty:1,unit:"kg"}],
        ["Bake three vanilla layers.","Make vanilla buttercream (butter + icing sugar + vanilla).","Cool layers fully.","Stack and crumb-coat.","Finish with a smooth buttercream layer."],
        "Chill between coats for sharp edges.") } },

    { variety: "Chocolate Cake", tiers: {
      Standard: _r("Chocolate Cake (Standard)", "Everyday cocoa cake.", 2, "cake", 90,
        [{name:"Flour",qty:900,unit:"g"},{name:"Sugar",qty:850,unit:"g"},{name:"Butter",qty:600,unit:"g"},{name:"Eggs",qty:14,unit:"pcs"},{name:"Cocoa Powder",qty:200,unit:"g"},{name:"Baking Powder",qty:35,unit:"g"},{name:"Milk",qty:500,unit:"ml"}],
        ["Cream butter and sugar.","Beat in eggs.","Sift flour, cocoa, baking powder; fold with milk.","Bake 170°C 40–45 min."],
        "Good cocoa is everything here."),
      Premium: _r("Chocolate Fudge Cake (Premium)", "Rich, dense chocolate cake.", 2, "cake", 130,
        [{name:"Flour",qty:800,unit:"g"},{name:"Sugar",qty:900,unit:"g"},{name:"Butter",qty:600,unit:"g"},{name:"Eggs",qty:16,unit:"pcs"},{name:"Cocoa Powder",qty:300,unit:"g"},{name:"Baking Powder",qty:30,unit:"g"},{name:"Milk",qty:500,unit:"ml"},{name:"Chocolate",qty:400,unit:"g"}],
        ["Melt chocolate.","Cream butter and sugar; beat in eggs.","Fold dry with milk; stir in chocolate.","Bake 165°C 45–50 min.","Ice with ganache when cool."],
        "Use good cocoa and real chocolate."),
      Luxury: _r("Triple Chocolate Gateau (Luxury)", "Layered dark/milk/white chocolate showpiece.", 2, "cake", 220,
        [{name:"Flour",qty:800,unit:"g"},{name:"Sugar",qty:900,unit:"g"},{name:"Butter",qty:800,unit:"g"},{name:"Eggs",qty:18,unit:"pcs"},{name:"Cocoa Powder",qty:300,unit:"g"},{name:"Chocolate",qty:1,unit:"kg"},{name:"Cream",qty:1,unit:"L"},{name:"Baking Powder",qty:30,unit:"g"}],
        ["Bake rich chocolate layers.","Make dark, milk and white ganaches.","Layer with dark ganache.","Coat in milk ganache.","Decorate with white chocolate."],
        "Keep cool — ganache softens in Accra heat.") } },

    { variety: "Red Velvet", tiers: {
      Standard: _r("Red Velvet (Standard)", "Red cocoa sponge with simple frosting.", 2, "cake", 110,
        [{name:"Flour",qty:900,unit:"g"},{name:"Sugar",qty:850,unit:"g"},{name:"Butter",qty:500,unit:"g"},{name:"Eggs",qty:12,unit:"pcs"},{name:"Cocoa Powder",qty:70,unit:"g"},{name:"Buttermilk",qty:500,unit:"ml"},{name:"Red Food Colouring",qty:50,unit:"ml"},{name:"Icing Sugar",qty:500,unit:"g"}],
        ["Cream butter and sugar; beat in eggs.","Mix cocoa, colouring, buttermilk into paste.","Fold in flour.","Bake 170°C 35–40 min.","Frost when cool."],
        "Colour intensity depends on your cocoa's darkness."),
      Premium: _r("Red Velvet (Premium)", "Classic with cream-cheese frosting.", 2, "cake", 160,
        [{name:"Flour",qty:900,unit:"g"},{name:"Sugar",qty:900,unit:"g"},{name:"Butter",qty:500,unit:"g"},{name:"Eggs",qty:12,unit:"pcs"},{name:"Cocoa Powder",qty:80,unit:"g"},{name:"Buttermilk",qty:600,unit:"ml"},{name:"Red Food Colouring",qty:60,unit:"ml"},{name:"Cream Cheese",qty:1,unit:"kg"},{name:"Icing Sugar",qty:800,unit:"g"}],
        ["Bake red velvet layers.","Beat cream cheese, butter, icing sugar.","Cool fully.","Layer and coat with cream-cheese frosting."],
        "Frost only fully-cooled cakes."),
      Luxury: _r("Red Velvet Tower (Luxury)", "Tall 4-layer red velvet showpiece.", 2, "cake", 240,
        [{name:"Flour",qty:1.2,unit:"kg"},{name:"Sugar",qty:1.1,unit:"kg"},{name:"Butter",qty:700,unit:"g"},{name:"Eggs",qty:16,unit:"pcs"},{name:"Cocoa Powder",qty:100,unit:"g"},{name:"Buttermilk",qty:700,unit:"ml"},{name:"Red Food Colouring",qty:80,unit:"ml"},{name:"Cream Cheese",qty:1.5,unit:"kg"},{name:"Icing Sugar",qty:1.2,unit:"kg"}],
        ["Bake four thin layers.","Make silky cream-cheese frosting.","Stack with frosting between.","Crumb-coat, chill, final coat.","Decorate with red crumbs."],
        "A tall cake needs a central dowel for stability.") } }
  ],

  "Pastry": [
    { variety: "Meat Pie", tiers: {
      Standard: _r("Meat Pie (Standard)", "Flaky Ghanaian meat pie.", 40, "piece", 6,
        [{name:"Flour",qty:3,unit:"kg"},{name:"Butter",qty:1.2,unit:"kg"},{name:"Salt",qty:40,unit:"g"},{name:"Water",qty:800,unit:"ml"},{name:"Minced Meat",qty:1.5,unit:"kg"},{name:"Onions",qty:500,unit:"g"},{name:"Eggs",qty:4,unit:"pcs"}],
        ["Rub butter into flour; add water; rest.","Cook minced meat with onion; cool.","Roll, cut, fill, crimp.","Egg-wash; bake 180°C 25–30 min."],
        "Filling must be cool and dry."),
      Premium: _r("Chicken Pie (Premium)", "Buttery pie with seasoned chicken.", 36, "piece", 9,
        [{name:"Flour",qty:3,unit:"kg"},{name:"Butter",qty:1.4,unit:"kg"},{name:"Salt",qty:40,unit:"g"},{name:"Water",qty:750,unit:"ml"},{name:"Chicken",qty:2,unit:"kg"},{name:"Onions",qty:500,unit:"g"},{name:"Eggs",qty:4,unit:"pcs"}],
        ["Make short pastry; rest.","Cook diced chicken with seasoning; cool.","Fill, seal, egg-wash.","Bake 185°C 25–28 min."],
        "Dice chicken small so pies seal well."),
      Luxury: _r("Beef & Mushroom Pie (Luxury)", "Puff-pastry pie with rich beef filling.", 30, "piece", 14,
        [{name:"Flour",qty:2.5,unit:"kg"},{name:"Butter",qty:1.6,unit:"kg"},{name:"Salt",qty:35,unit:"g"},{name:"Water",qty:700,unit:"ml"},{name:"Beef",qty:2,unit:"kg"},{name:"Mushrooms",qty:600,unit:"g"},{name:"Onions",qty:400,unit:"g"},{name:"Eggs",qty:4,unit:"pcs"}],
        ["Make rough-puff pastry with folds.","Braise beef with mushrooms; reduce; cool.","Fill, seal, egg-wash, score.","Bake 200°C 25 min."],
        "Reduce the filling well or the puff goes soggy.") } },

    { variety: "Sausage Roll", tiers: {
      Standard: _r("Sausage Roll (Standard)", "Everyday sausage roll.", 40, "piece", 5,
        [{name:"Flour",qty:2.5,unit:"kg"},{name:"Butter",qty:1.2,unit:"kg"},{name:"Salt",qty:30,unit:"g"},{name:"Water",qty:750,unit:"ml"},{name:"Sausage Meat",qty:2,unit:"kg"},{name:"Eggs",qty:4,unit:"pcs"}],
        ["Make short pastry; rest.","Roll sausage into logs; wrap.","Cut, egg-wash.","Bake 190°C 25 min."],
        "Keep pastry cold for flake."),
      Premium: _r("Puff Sausage Roll (Premium)", "Buttery puff-pastry sausage roll.", 30, "piece", 9,
        [{name:"Flour",qty:2,unit:"kg"},{name:"Butter",qty:1.4,unit:"kg"},{name:"Salt",qty:30,unit:"g"},{name:"Water",qty:700,unit:"ml"},{name:"Sausage Meat",qty:2,unit:"kg"},{name:"Eggs",qty:4,unit:"pcs"}],
        ["Make rough-puff with folds.","Season sausage; roll and wrap.","Cut, egg-wash, score.","Bake 200°C 25 min."],
        "Everything cold — warm butter kills the puff."),
      Luxury: _r("Gourmet Herb Sausage Roll (Luxury)", "Puff roll with herbed premium sausage.", 28, "piece", 12,
        [{name:"Flour",qty:2,unit:"kg"},{name:"Butter",qty:1.5,unit:"kg"},{name:"Salt",qty:30,unit:"g"},{name:"Water",qty:700,unit:"ml"},{name:"Sausage Meat",qty:2.2,unit:"kg"},{name:"Onions",qty:300,unit:"g"},{name:"Eggs",qty:5,unit:"pcs"}],
        ["Make fine puff pastry.","Mix sausage with herbs and onion.","Wrap, cut, egg-wash, seed tops.","Bake 200°C 24 min."],
        "Sautee onions first for sweetness.") } },

    { variety: "Croissant", tiers: {
      Standard: _r("Croissant (Standard)", "Simple crescent rolls.", 30, "piece", 8,
        [{name:"Flour",qty:2.5,unit:"kg"},{name:"Butter",qty:800,unit:"g"},{name:"Sugar",qty:300,unit:"g"},{name:"Yeast",qty:70,unit:"g"},{name:"Salt",qty:45,unit:"g"},{name:"Milk",qty:1.2,unit:"L"},{name:"Eggs",qty:3,unit:"pcs"}],
        ["Make yeasted dough; chill.","Laminate with 2 folds.","Cut triangles; roll up.","Prove; egg-wash; bake 190°C 16–18 min."],
        "Fewer folds = simpler, still flaky."),
      Premium: _r("Butter Croissant (Premium)", "Proper laminated all-butter croissant.", 24, "piece", 12,
        [{name:"Flour",qty:2,unit:"kg"},{name:"Butter",qty:1.2,unit:"kg"},{name:"Sugar",qty:250,unit:"g"},{name:"Yeast",qty:60,unit:"g"},{name:"Salt",qty:40,unit:"g"},{name:"Milk",qty:1,unit:"L"},{name:"Eggs",qty:3,unit:"pcs"}],
        ["Yeasted dough; overnight chill.","Encase butter; 3 letter-folds.","Cut, shape, prove 2 hr.","Egg-wash; bake 190°C 18–20 min."],
        "Keep butter and dough equally cool."),
      Luxury: _r("Almond Croissant (Luxury)", "Butter croissant filled with almond cream.", 20, "piece", 18,
        [{name:"Flour",qty:2,unit:"kg"},{name:"Butter",qty:1.3,unit:"kg"},{name:"Sugar",qty:400,unit:"g"},{name:"Yeast",qty:60,unit:"g"},{name:"Salt",qty:40,unit:"g"},{name:"Milk",qty:1,unit:"L"},{name:"Ground Almonds",qty:600,unit:"g"},{name:"Eggs",qty:8,unit:"pcs"}],
        ["Make laminated croissants.","Make almond cream (butter, sugar, almonds, egg).","Fill baked croissants; top with cream and flaked almonds.","Bake again 180°C 10 min."],
        "A great way to use day-old croissants.") } }
  ],

  "Doughnut": [
    { variety: "Sugar Doughnut", tiers: {
      Standard: _r("Sugar Doughnut (Standard)", "Classic fried ring in sugar.", 40, "piece", 3,
        [{name:"Flour",qty:3,unit:"kg"},{name:"Sugar",qty:600,unit:"g"},{name:"Yeast",qty:90,unit:"g"},{name:"Butter",qty:300,unit:"g"},{name:"Eggs",qty:6,unit:"pcs"},{name:"Milk",qty:1.2,unit:"L"},{name:"Oil",qty:3,unit:"L"}],
        ["Activate yeast in warm milk.","Make soft dough; prove.","Cut rings; prove.","Fry 175°C; toss in sugar."],
        "Steady 175°C oil is key."),
      Premium: _r("Filled Doughnut (Premium)", "Soft doughnut filled with jam.", 36, "piece", 5,
        [{name:"Flour",qty:3,unit:"kg"},{name:"Sugar",qty:700,unit:"g"},{name:"Yeast",qty:100,unit:"g"},{name:"Butter",qty:400,unit:"g"},{name:"Eggs",qty:8,unit:"pcs"},{name:"Milk",qty:1,unit:"L"},{name:"Jam",qty:1,unit:"kg"},{name:"Oil",qty:3,unit:"L"}],
        ["Make enriched dough; prove.","Cut discs; prove; fry.","Cool; pipe jam; dust sugar."],
        "Fill only when cool."),
      Luxury: _r("Glazed Brioche Doughnut (Luxury)", "Rich brioche doughnut, glossy glaze.", 30, "piece", 8,
        [{name:"Flour",qty:2.5,unit:"kg"},{name:"Sugar",qty:500,unit:"g"},{name:"Yeast",qty:80,unit:"g"},{name:"Butter",qty:800,unit:"g"},{name:"Eggs",qty:18,unit:"pcs"},{name:"Milk",qty:600,unit:"ml"},{name:"Icing Sugar",qty:800,unit:"g"},{name:"Oil",qty:3,unit:"L"}],
        ["Brioche dough; cold-prove overnight.","Cut, prove, fry gently 170°C.","Dip in icing-sugar glaze."],
        "Overnight prove gives the tender crumb.") } },

    { variety: "Bofrot (Puff-Puff)", tiers: {
      Standard: _r("Bofrot (Standard)", "Ghanaian puff-puff — round fried dough.", 60, "piece", 1,
        [{name:"Flour",qty:3,unit:"kg"},{name:"Sugar",qty:700,unit:"g"},{name:"Yeast",qty:80,unit:"g"},{name:"Salt",qty:20,unit:"g"},{name:"Nutmeg",qty:20,unit:"g"},{name:"Water",qty:2,unit:"L"},{name:"Oil",qty:3,unit:"L"}],
        ["Mix flour, sugar, yeast, salt, nutmeg.","Add water to a thick batter; prove 1–2 hr.","Scoop rounds into 175°C oil.","Fry until deep gold; drain."],
        "Batter should be thick but droppable."),
      Premium: _r("Spiced Bofrot (Premium)", "Puff-puff with extra spice and milk.", 55, "piece", 2,
        [{name:"Flour",qty:3,unit:"kg"},{name:"Sugar",qty:800,unit:"g"},{name:"Yeast",qty:90,unit:"g"},{name:"Salt",qty:20,unit:"g"},{name:"Nutmeg",qty:25,unit:"g"},{name:"Milk",qty:1,unit:"L"},{name:"Water",qty:1,unit:"L"},{name:"Oil",qty:3,unit:"L"}],
        ["Mix dry with spice.","Add milk and water; prove.","Fry rounds at 175°C."],
        "Milk enriches the crumb."),
      Luxury: _r("Filled Bofrot (Luxury)", "Puff-puff filled with chocolate or cream.", 45, "piece", 4,
        [{name:"Flour",qty:3,unit:"kg"},{name:"Sugar",qty:800,unit:"g"},{name:"Yeast",qty:90,unit:"g"},{name:"Salt",qty:20,unit:"g"},{name:"Nutmeg",qty:25,unit:"g"},{name:"Milk",qty:1.5,unit:"L"},{name:"Chocolate",qty:500,unit:"g"},{name:"Oil",qty:3,unit:"L"}],
        ["Make enriched batter; prove.","Fry larger rounds; cool.","Pipe chocolate or cream inside."],
        "Make them bigger so there's room to fill.") } }
  ],

  "Cookie / Biscuit": [
    { variety: "Butter Cookie", tiers: {
      Standard: _r("Butter Cookies (Standard)", "Crisp buttery cookies.", 80, "piece", 2,
        [{name:"Flour",qty:2,unit:"kg"},{name:"Sugar",qty:800,unit:"g"},{name:"Butter",qty:1,unit:"kg"},{name:"Eggs",qty:6,unit:"pcs"},{name:"Vanilla",qty:20,unit:"ml"}],
        ["Cream butter and sugar.","Beat in eggs, vanilla.","Mix in flour; pipe shapes.","Bake 170°C 12–15 min."],
        "Rotate trays for even colour."),
      Premium: _r("Chocolate Chip Cookies (Premium)", "Chewy chocolate chip cookies.", 70, "piece", 4,
        [{name:"Flour",qty:2,unit:"kg"},{name:"Sugar",qty:1,unit:"kg"},{name:"Butter",qty:900,unit:"g"},{name:"Eggs",qty:6,unit:"pcs"},{name:"Chocolate",qty:800,unit:"g"},{name:"Vanilla",qty:20,unit:"ml"}],
        ["Cream butter and sugar.","Beat in eggs.","Fold flour then chocolate.","Bake 175°C 11–13 min."],
        "Pull early for chew."),
      Luxury: _r("Almond Shortbread (Luxury)", "Melt-in-mouth almond shortbread.", 60, "piece", 6,
        [{name:"Flour",qty:1.5,unit:"kg"},{name:"Icing Sugar",qty:600,unit:"g"},{name:"Butter",qty:1.2,unit:"kg"},{name:"Ground Almonds",qty:400,unit:"g"},{name:"Vanilla",qty:15,unit:"ml"}],
        ["Beat butter, icing sugar.","Mix flour and almonds; chill.","Roll, cut, bake 160°C 15–18 min."],
        "Keep pale — don't brown.") } },

    { variety: "Shortbread", tiers: {
      Standard: _r("Shortbread Fingers (Standard)", "Classic buttery shortbread.", 60, "piece", 3,
        [{name:"Flour",qty:2,unit:"kg"},{name:"Sugar",qty:600,unit:"g"},{name:"Butter",qty:1.2,unit:"kg"},{name:"Salt",qty:15,unit:"g"}],
        ["Beat butter and sugar.","Mix in flour and salt; don't overwork.","Press into trays; cut fingers.","Bake 160°C 18–20 min."],
        "Prick tops before baking."),
      Premium: _r("Chocolate-Dipped Shortbread (Premium)", "Shortbread half-dipped in chocolate.", 50, "piece", 5,
        [{name:"Flour",qty:1.8,unit:"kg"},{name:"Sugar",qty:600,unit:"g"},{name:"Butter",qty:1.2,unit:"kg"},{name:"Chocolate",qty:600,unit:"g"}],
        ["Make and bake shortbread; cool.","Melt chocolate.","Dip halves; set on parchment."],
        "Temper chocolate for a snap."),
      Luxury: _r("Millionaire's Shortbread (Luxury)", "Shortbread, caramel and chocolate layers.", 48, "piece", 8,
        [{name:"Flour",qty:1.5,unit:"kg"},{name:"Sugar",qty:1.2,unit:"kg"},{name:"Butter",qty:1.5,unit:"kg"},{name:"Condensed Milk",qty:1.5,unit:"kg"},{name:"Chocolate",qty:800,unit:"g"}],
        ["Bake shortbread base.","Cook caramel from butter, sugar, condensed milk.","Spread caramel; cool.","Top with melted chocolate; slice."],
        "Let caramel set fully before chocolate.") } }
  ],

  "Muffin / Cupcake": [
    { variety: "Vanilla Cupcake", tiers: {
      Standard: _r("Vanilla Cupcakes (Standard)", "Light everyday cupcakes.", 48, "piece", 4,
        [{name:"Flour",qty:1.5,unit:"kg"},{name:"Sugar",qty:1,unit:"kg"},{name:"Butter",qty:800,unit:"g"},{name:"Eggs",qty:16,unit:"pcs"},{name:"Baking Powder",qty:60,unit:"g"},{name:"Milk",qty:500,unit:"ml"},{name:"Vanilla",qty:30,unit:"ml"}],
        ["Cream butter and sugar; beat in eggs.","Fold flour with milk; add vanilla.","Fill cases 2/3.","Bake 175°C 18–20 min."],
        "Fill evenly for a uniform batch."),
      Premium: _r("Frosted Cupcakes (Premium)", "Cupcakes with piped buttercream.", 40, "piece", 6,
        [{name:"Flour",qty:1.4,unit:"kg"},{name:"Sugar",qty:1,unit:"kg"},{name:"Butter",qty:900,unit:"g"},{name:"Eggs",qty:14,unit:"pcs"},{name:"Baking Powder",qty:50,unit:"g"},{name:"Milk",qty:400,unit:"ml"},{name:"Icing Sugar",qty:800,unit:"g"},{name:"Vanilla",qty:30,unit:"ml"}],
        ["Bake vanilla cupcakes; cool.","Beat butter and icing sugar to buttercream.","Pipe swirls; decorate."],
        "Chill buttercream slightly for firm piping."),
      Luxury: _r("Lemon Drizzle Cupcakes (Luxury)", "Zesty lemon cupcakes soaked in syrup.", 36, "piece", 8,
        [{name:"Flour",qty:1.4,unit:"kg"},{name:"Sugar",qty:1,unit:"kg"},{name:"Butter",qty:900,unit:"g"},{name:"Eggs",qty:14,unit:"pcs"},{name:"Baking Powder",qty:50,unit:"g"},{name:"Lemons",qty:12,unit:"pcs"},{name:"Icing Sugar",qty:500,unit:"g"}],
        ["Cream butter, sugar, lemon zest; beat in eggs.","Fold flour; bake 175°C 18–20 min.","Warm lemon juice and icing sugar; soak warm cakes."],
        "Drizzle while warm to absorb.") } },

    { variety: "Fruit Muffin", tiers: {
      Standard: _r("Banana Muffins (Standard)", "Moist banana muffins.", 40, "piece", 4,
        [{name:"Flour",qty:1.8,unit:"kg"},{name:"Sugar",qty:800,unit:"g"},{name:"Butter",qty:500,unit:"g"},{name:"Eggs",qty:10,unit:"pcs"},{name:"Baking Powder",qty:70,unit:"g"},{name:"Bananas",qty:2,unit:"kg"},{name:"Milk",qty:400,unit:"ml"}],
        ["Mash bananas.","Whisk wet ingredients.","Fold in dry until just combined.","Fill cases; bake 190°C 22–25 min."],
        "Riper bananas = sweeter muffins."),
      Premium: _r("Blueberry Muffins (Premium)", "Muffins studded with fruit, crunchy top.", 40, "piece", 6,
        [{name:"Flour",qty:1.8,unit:"kg"},{name:"Sugar",qty:900,unit:"g"},{name:"Butter",qty:600,unit:"g"},{name:"Eggs",qty:12,unit:"pcs"},{name:"Baking Powder",qty:70,unit:"g"},{name:"Milk",qty:700,unit:"ml"},{name:"Blueberries",qty:800,unit:"g"}],
        ["Whisk wet.","Fold dry until lumpy.","Fold fruit; fill full; sugar tops.","Bake 190°C 22–25 min."],
        "Don't overmix — stop while lumpy."),
      Luxury: _r("Double Chocolate Muffins (Luxury)", "Rich chocolate muffins with chunks.", 36, "piece", 8,
        [{name:"Flour",qty:1.6,unit:"kg"},{name:"Sugar",qty:1,unit:"kg"},{name:"Butter",qty:700,unit:"g"},{name:"Eggs",qty:12,unit:"pcs"},{name:"Cocoa Powder",qty:250,unit:"g"},{name:"Baking Powder",qty:60,unit:"g"},{name:"Milk",qty:700,unit:"ml"},{name:"Chocolate",qty:800,unit:"g"}],
        ["Whisk wet.","Fold dry incl. cocoa.","Fold chocolate chunks; fill full.","Bake 190°C 24–26 min."],
        "Push a few chunks on top for a bakery look.") } }
  ]
};

/* Lookup helpers (support both new array structure) */
function libraryTypes() { return Object.keys(RECIPE_LIBRARY); }

function libraryVarieties(type) {
  const group = RECIPE_LIBRARY[type];
  if (!group) return [];
  return group.map(v => v.variety);
}

function libraryRecipe(type, variety, tier) {
  const group = RECIPE_LIBRARY[type];
  if (!group) return null;
  const v = group.find(x => x.variety === variety) || group[0];
  if (!v) return null;
  const r = v.tiers[tier] || v.tiers[Object.keys(v.tiers)[0]];
  return r ? JSON.parse(JSON.stringify(r)) : null;
}
