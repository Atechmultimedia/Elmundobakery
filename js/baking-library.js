/* ============================================================
   BAKING METHOD LIBRARY — built in, no AI, no internet, no key
   ------------------------------------------------------------
   Each method is a template per product type. bakingMethodFor()
   fills it with the recipe's REAL numbers: actual ingredients,
   actual dough weight, actual loaf sizes, actual bake times.

   Why a library and not AI: the timings below are fixed craft
   knowledge, and the numbers come from the recipe itself. A
   library gives the same answer every time, costs nothing, and
   works on Live Server. Your head baker can then edit it and
   their version is what sticks.

   Climate note: these proof times assume a typical Accra kitchen
   (28-32°C). That is warmer than most European recipes assume,
   so doughs prove noticeably faster — the times reflect that.
   ============================================================ */

const ACCRA_CLIMATE_NOTE = "Times assume a normal Accra kitchen (28–32°C). Dough proves faster here than in cooler climates — judge by how the dough looks, not only the clock.";

const BAKING_METHOD_LIBRARY = {
  bread: {
    label: "Bread",
    oven_c: 180,
    // Minutes to bake, per 500 g of loaf. Scaled per size below.
    bake_min_per_500g: 22,
    bake_min_floor: 14,
    steps: [
      { title: "Weigh everything first", minutes: 10,
        detail: "Weigh every ingredient before you start — scaling by eye is where costs and quality drift. Set the flour aside; keep the yeast away from salt and sugar until mixing." },
      { title: "Activate the yeast", minutes: 10,
        detail: "Warm the water to about body temperature (lukewarm, not hot — hot water kills yeast). Stir in the yeast and a pinch of the sugar. Leave 8–10 minutes until it froths. No froth means dead yeast — start again rather than waste a batch." },
      { title: "Mix to a shaggy dough", minutes: 8,
        detail: "Combine flour, salt and the rest of the sugar. Pour in the yeast liquid and any fat. Mix until no dry flour is left. It should look rough, not smooth — that comes next." },
      { title: "Knead until it passes the windowpane", minutes: 12,
        detail: "Knead 10–12 minutes by hand (6–8 in a mixer on low). Test it: stretch a small piece thin. If light passes through without tearing, the gluten is ready. Under-kneaded dough gives a crumbly, dense loaf." },
      { title: "First proof (bulk rise)", minutes: 50,
        detail: "Cover and leave until roughly doubled — about 45–60 minutes in Accra heat, less on a very hot afternoon. Press a floured finger in: the dent should spring back slowly. Fast spring-back means it needs longer." },
      { title: "Knock back and divide", minutes: 10,
        detail: "Press the air out gently. Divide and weigh each piece — weighing is what keeps every loaf the price you set. Round each piece into a ball and rest 10 minutes so it shapes without fighting you." },
      { title: "Shape and pan", minutes: 12,
        detail: "Shape each piece tightly and place seam-side down in a greased tin. A slack shape gives a flat loaf. Fill tins about two-thirds — the rest of the rise happens in the oven." },
      { title: "Second proof (final)", minutes: 40,
        detail: "Cover lightly and prove until the dough crowns just above the tin — roughly 35–50 minutes. Do not over-prove: if it collapses when touched, it has gone too far and will sink in the oven." },
      { title: "Bake", minutes: 25,
        detail: "Preheat properly — a cold oven ruins the rise. Bake until deep golden and hollow-sounding when tapped underneath. Rotate the tins halfway if your oven has hot spots." },
      { title: "Cool before bagging", minutes: 45,
        detail: "Turn out onto a rack immediately. Cool completely before bagging — bagging warm bread traps steam, softens the crust and grows mould early. This step protects your shelf life." }
    ],
    troubleshooting: [
      { problem: "Didn't rise", cause: "Dead yeast, water too hot, or the room was cold", fix: "Froth-test the yeast before mixing. Use lukewarm water only. Check the yeast's expiry and store it sealed and cool." },
      { problem: "Dense, heavy crumb", cause: "Under-kneaded, under-proved, or too much flour", fix: "Knead to the windowpane test. Let the bulk rise finish properly. Weigh flour rather than scooping." },
      { problem: "Collapsed in the oven", cause: "Over-proved on the second rise", fix: "Bake when the dough crowns the tin, not when it peaks. In Accra heat check 10 minutes earlier than the clock says." },
      { problem: "Burnt base, pale top", cause: "Oven runs hot underneath, or the tin sits too low", fix: "Move the rack up. Put a tray on the shelf below to shield the base. Check your oven with a thermometer — dials drift." },
      { problem: "Loaves come out different sizes", cause: "Dough divided by eye", fix: "Weigh every piece. This is what keeps a GHS 5 loaf a GHS 5 loaf and protects your margin." },
      { problem: "Goes mouldy in a day or two", cause: "Bagged while still warm", fix: "Cool completely on a rack first. Bag only when fully cold to the touch." }
    ]
  },

  cake: {
    label: "Cake",
    oven_c: 170,
    bake_min_per_500g: 30,
    bake_min_floor: 20,
    steps: [
      { title: "Bring everything to room temperature", minutes: 20,
        detail: "Butter, eggs and milk must be at room temperature or the batter curdles and traps less air. In Accra this takes little time — 15–20 minutes out of the fridge is enough." },
      { title: "Prepare the tins and oven", minutes: 8,
        detail: "Grease and line the tins now, not later — a creamed batter must not sit waiting. Preheat the oven fully." },
      { title: "Cream the butter and sugar", minutes: 8,
        detail: "Beat until pale and noticeably lighter — 5–8 minutes. This is where the cake's lift comes from. Rushing this gives a tight, heavy crumb." },
      { title: "Add the eggs one at a time", minutes: 5,
        detail: "Beat each egg in fully before adding the next. If it looks curdled, add a spoonful of the flour to bring it back." },
      { title: "Fold in the dry ingredients", minutes: 5,
        detail: "Sift the flour in and fold gently — do not beat. Over-mixing at this stage develops gluten and toughens the cake. Stop as soon as no flour shows." },
      { title: "Fill the tins", minutes: 5,
        detail: "Divide by weight, not by eye, so layers bake evenly. Fill about two-thirds. Level the top and tap the tin once to release large bubbles." },
      { title: "Bake without opening the door", minutes: 30,
        detail: "Do not open the oven for the first two-thirds of the bake — the rush of cool air makes cakes sink. Test with a skewer: it should come out clean with a few dry crumbs." },
      { title: "Cool in the tin, then out", minutes: 40,
        detail: "Rest 10 minutes in the tin, then turn onto a rack. Cake is fragile while hot. Cool completely before icing or the icing slides off." }
    ],
    troubleshooting: [
      { problem: "Sank in the middle", cause: "Oven door opened early, or under-baked", fix: "Keep the door shut for the first two-thirds. Test with a skewer before removing." },
      { problem: "Dry and crumbly", cause: "Over-baked or too much flour", fix: "Check 5 minutes before the time is up. Weigh the flour." },
      { problem: "Tough, tight crumb", cause: "Over-mixed after the flour went in", fix: "Fold gently and stop as soon as the flour disappears." },
      { problem: "Curdled batter", cause: "Cold eggs, or added too fast", fix: "Room-temperature eggs, one at a time, with a spoon of flour to rescue it." },
      { problem: "Domed and cracked on top", cause: "Oven too hot", fix: "Drop the temperature by 10°C and bake a little longer. Verify with an oven thermometer." }
    ]
  },

  pastry: {
    label: "Pastry",
    oven_c: 200,
    bake_min_per_500g: 20,
    bake_min_floor: 12,
    steps: [
      { title: "Keep everything cold", minutes: 5,
        detail: "This is the whole game with pastry, and it is harder in Accra. Chill the fat and the water. Work quickly and in the coolest part of the day if you can." },
      { title: "Rub the fat into the flour", minutes: 8,
        detail: "Work fat into flour until it looks like coarse breadcrumbs. Leave some pea-sized lumps — those become the flaky layers. Use fingertips, not palms; palms are warm." },
      { title: "Bring together with cold water", minutes: 5,
        detail: "Add cold water a little at a time until it just comes together. Do not knead. Overworking makes pastry tough and shrink in the tin." },
      { title: "Rest in the fridge", minutes: 30,
        detail: "Wrap and chill at least 30 minutes. This relaxes the gluten so it does not shrink, and re-firms the fat. Skipping this is why pastry pulls away from the sides." },
      { title: "Roll and line", minutes: 12,
        detail: "Roll on a lightly floured surface, turning often, to an even thickness. Ease it into the tin — never stretch it, or it shrinks back when baked." },
      { title: "Chill again before baking", minutes: 20,
        detail: "Chill the lined tin once more. Cold pastry going into a hot oven is what makes it flaky." },
      { title: "Bake hot", minutes: 20,
        detail: "Pastry needs a hot oven so the fat steams and lifts the layers before it melts out. Bake until evenly golden — pale pastry tastes raw." },
      { title: "Cool", minutes: 20,
        detail: "Cool on a rack so the base stays crisp. Sitting in the tin steams the bottom soggy." }
    ],
    troubleshooting: [
      { problem: "Tough, not flaky", cause: "Overworked, or the fat melted in", fix: "Handle less. Keep fat and water cold. Leave pea-sized lumps of fat." },
      { problem: "Shrinks in the tin", cause: "Stretched when lining, or not rested", fix: "Ease it in, never stretch. Chill before baking." },
      { problem: "Soggy bottom", cause: "Oven not hot enough, or cooled in the tin", fix: "Bake hot. Cool on a rack." },
      { problem: "Fat leaks out while baking", cause: "Pastry went in warm", fix: "Chill the lined tin properly first — especially on hot days." }
    ]
  },

  doughnut: {
    label: "Doughnut",
    oven_c: 0,
    fry_c: 175,
    bake_min_per_500g: 0,
    bake_min_floor: 0,
    steps: [
      { title: "Activate the yeast", minutes: 10,
        detail: "Lukewarm liquid, yeast, pinch of sugar. Wait for froth. No froth, no doughnuts." },
      { title: "Mix and knead", minutes: 15,
        detail: "Mix to a soft, slightly sticky dough and knead until smooth. Doughnut dough is softer than bread dough — resist adding extra flour." },
      { title: "First proof", minutes: 50,
        detail: "Cover and rise until doubled — about 45–60 minutes in Accra warmth." },
      { title: "Roll, cut and weigh", minutes: 15,
        detail: "Roll to an even thickness and cut. Weigh a few to check they match your selling size. Uneven doughnuts fry unevenly and cost you margin." },
      { title: "Second proof", minutes: 30,
        detail: "Prove on floured trays until puffy but still springy — about 25–35 minutes. Over-proved doughnuts drink oil and go greasy." },
      { title: "Fry", minutes: 5,
        detail: "Oil at about 175°C. Too cool and they soak up oil; too hot and they brown raw. Fry roughly 60–90 seconds a side until golden. Fry in small batches — crowding drops the oil temperature." },
      { title: "Drain and finish", minutes: 15,
        detail: "Drain on a rack, not paper — paper steams the base soft. Sugar them while just warm so it sticks; glaze only once cool." }
    ],
    troubleshooting: [
      { problem: "Greasy and heavy", cause: "Oil too cool, or over-proved", fix: "Keep oil near 175°C and fry in small batches. Prove until puffy, not collapsing." },
      { problem: "Raw in the middle, dark outside", cause: "Oil too hot", fix: "Lower the heat and let them fry a little longer." },
      { problem: "Pale and tough", cause: "Under-proved", fix: "Give the second proof its full time." },
      { problem: "Different sizes", cause: "Cut by eye", fix: "Roll to an even thickness and weigh-check a few from each tray." }
    ]
  },

  cookie: {
    label: "Cookie",
    oven_c: 175,
    bake_min_per_500g: 12,
    bake_min_floor: 8,
    steps: [
      { title: "Cream the butter and sugar", minutes: 6,
        detail: "Beat until light. Less air here than a cake — you want chew, not lift." },
      { title: "Add eggs and flavouring", minutes: 3, detail: "Beat in until smooth." },
      { title: "Fold in the dry ingredients", minutes: 4,
        detail: "Mix only until combined. Over-mixing makes cookies tough and cakey." },
      { title: "Chill the dough", minutes: 30,
        detail: "Chill at least 30 minutes — important in Accra heat. Warm dough spreads into flat, joined-up cookies." },
      { title: "Portion by weight", minutes: 10,
        detail: "Scoop or weigh even portions and space them well apart — they spread. Even portions bake evenly." },
      { title: "Bake", minutes: 12,
        detail: "Bake until the edges are set and the centres still look slightly under — they finish on the hot tray." },
      { title: "Cool on the tray, then a rack", minutes: 15,
        detail: "Rest 5 minutes on the tray to firm up, then move to a rack. Moving too early breaks them." }
    ],
    troubleshooting: [
      { problem: "Spread into one big sheet", cause: "Dough too warm, or too little flour", fix: "Chill the dough. Space them further apart. Weigh the flour." },
      { problem: "Hard and dry", cause: "Over-baked", fix: "Pull them while the centres still look soft — they set as they cool." },
      { problem: "Cakey, not chewy", cause: "Over-creamed or over-mixed", fix: "Cream less, fold the flour in just until combined." }
    ]
  },

  muffin: {
    label: "Muffin",
    oven_c: 190,
    bake_min_per_500g: 22,
    bake_min_floor: 15,
    steps: [
      { title: "Prepare tins and oven", minutes: 5,
        detail: "Line the tins and preheat fully. Muffin batter must go in as soon as it is mixed." },
      { title: "Mix dry and wet separately", minutes: 6,
        detail: "Whisk the dry ingredients in one bowl, the wet in another. This is the muffin method — it is what keeps them tender." },
      { title: "Combine with as few strokes as possible", minutes: 2,
        detail: "Fold wet into dry until only just combined. Lumps are fine and expected. Over-mixing gives tunnels and tough, peaked muffins." },
      { title: "Fill and bake straight away", minutes: 5,
        detail: "Fill about three-quarters. Bake immediately — the raising agent starts working the moment it meets the liquid." },
      { title: "Bake", minutes: 22,
        detail: "Bake hot for a good dome. Skewer should come out clean." },
      { title: "Cool", minutes: 15, detail: "Five minutes in the tin, then onto a rack." }
    ],
    troubleshooting: [
      { problem: "Tough with tunnels inside", cause: "Over-mixed", fix: "Fold until only just combined. Lumpy batter is correct." },
      { problem: "Flat, no dome", cause: "Oven too cool, or batter sat too long", fix: "Bake hot and bake immediately after mixing." },
      { problem: "Stuck to the tin", cause: "Under-greased or turned out too soon", fix: "Line properly and rest 5 minutes before turning out." }
    ]
  },

  biscuit: {
    label: "Biscuit",
    oven_c: 170,
    bake_min_per_500g: 15,
    bake_min_floor: 10,
    steps: [
      { title: "Rub or cream the fat", minutes: 8, detail: "Work fat and flour to fine crumbs, or cream fat and sugar for a richer biscuit." },
      { title: "Bring the dough together", minutes: 5, detail: "Add liquid sparingly and bring together without kneading." },
      { title: "Chill", minutes: 30, detail: "Chill before rolling — essential in Accra heat, or the dough will not hold a cut edge." },
      { title: "Roll to an even thickness and cut", minutes: 12, detail: "Even thickness matters more than anything: uneven biscuits burn at the thin edge while the thick middle stays raw." },
      { title: "Bake", minutes: 15, detail: "Bake until evenly pale gold. Biscuits crisp as they cool — do not chase crispness in the oven." },
      { title: "Cool on a rack", minutes: 20, detail: "Cool completely, then store airtight straight away or they soften in humid air." }
    ],
    troubleshooting: [
      { problem: "Burnt edges, raw middles", cause: "Uneven thickness", fix: "Use rolling guides or a measured gap. Consistency beats speed." },
      { problem: "Soft, not crisp", cause: "Under-baked, or left out in humid air", fix: "Bake a little longer and store airtight as soon as they are cold." },
      { problem: "Spread and lost their shape", cause: "Dough too warm", fix: "Chill before and after cutting." }
    ]
  }
};

const DEFAULT_METHOD_TYPE = "bread";

/* Which method template fits this product? Uses the same name/type
   sniffing as the baking-loss logic, so they always agree. */
function methodTypeFor(product) {
  const hay = ((product.type || "") + " " + (product.name || "")).toLowerCase();
  for (const key in BAKING_METHOD_LIBRARY) { if (hay.includes(key)) return key; }
  // Common Ghanaian names that don't contain the type word
  if (/\bpie\b|meat pie|spring roll|samosa/.test(hay)) return "pastry";
  if (/bofrot|bofloat|puff|chin ?chin/.test(hay)) return "doughnut";
  if (/tea bread|sugar bread|butter bread|loaf/.test(hay)) return "bread";
  return DEFAULT_METHOD_TYPE;
}

/* Build the method for a product, filled in with its REAL numbers.
   If the recipe has a saved (edited) method, that wins. */
function bakingMethodFor(product) {
  if (product.baking_method && Array.isArray(product.baking_method.steps) && product.baking_method.steps.length) {
    return { ...product.baking_method, saved: true };
  }

  const typeKey = methodTypeFor(product);
  const tpl = BAKING_METHOD_LIBRARY[typeKey] || BAKING_METHOD_LIBRARY[DEFAULT_METHOD_TYPE];
  const d = doughEconomics(product);
  const sizes = productSizes(product);

  // Bake time scales with the loaf weight — a 300 g loaf is not a 1.2 kg loaf.
  const bakeFor = (grams) => {
    if (!tpl.bake_min_per_500g) return 0;
    return Math.max(tpl.bake_min_floor, Math.round((grams / 500) * tpl.bake_min_per_500g));
  };

  const steps = tpl.steps.map(s => ({ ...s }));

  // Make the generic steps specific to this recipe.
  const ingList = (product.ingredients || []).map(ri => {
    const ing = ingredientById(ri.ingredient_id);
    return ing ? `${fmtQty(ri.qty_required, ing.unit)} ${ing.name.toLowerCase()}` : null;
  }).filter(Boolean);

  const weighStep = steps.find(s => /weigh|room temperature|cold|prepare tins|cream|rub/i.test(s.title));
  if (weighStep && ingList.length) {
    weighStep.detail += ` For one batch of ${product.name}: ${ingList.join(", ")}.`;
  }

  const divideStep = steps.find(s => /divide|portion|cut|fill/i.test(s.title));
  if (divideStep && d.finishedWeightKg > 0) {
    const lines = sizes.map(sz => {
      const rawG = sz.weight_g / (1 - d.lossPct); // dough weight before baking loss
      return `${sz.name}: scale ${Math.round(rawG)} g of dough (bakes to about ${Math.round(sz.weight_g)} g)`;
    });
    divideStep.detail += ` This batch gives about ${d.rawWeightKg.toFixed(2)} kg of dough. ${lines.join(". ")}.`;
  }

  const bakeStep = steps.find(s => /^bake|^fry/i.test(s.title));
  if (bakeStep) {
    if (tpl.fry_c) {
      bakeStep.detail += ` Oil temperature: ${tpl.fry_c}°C.`;
    } else {
      const times = sizes.map(sz => `${sz.name} (${Math.round(sz.weight_g)} g): about ${bakeFor(sz.weight_g)} min`);
      bakeStep.detail += ` At ${tpl.oven_c}°C — ${times.join("; ")}. Times are a guide; colour and a hollow tap are the real test.`;
      bakeStep.minutes = bakeFor(sizes[0] ? sizes[0].weight_g : 500);
    }
  }

  const totalMin = steps.reduce((s, x) => s + (x.minutes || 0), 0);

  return {
    type: typeKey,
    type_label: tpl.label,
    oven_c: tpl.oven_c,
    fry_c: tpl.fry_c || 0,
    steps,
    troubleshooting: tpl.troubleshooting.map(t => ({ ...t })),
    total_minutes: totalMin,
    climate_note: ACCRA_CLIMATE_NOTE,
    bake_times: sizes.map(sz => ({ name: sz.name, weight_g: Math.round(sz.weight_g), minutes: bakeFor(sz.weight_g) })),
    saved: false
  };
}

/* Split a method's time into the three kinds that cost different things:
     active  — a baker is working. This is what LABOUR should be charged on.
     waiting — dough proves, bread cools. Nobody is paid, no gas burns.
     oven    — the oven is lit. This is what ENERGY should be charged on.

   Charging labour for elapsed time instead of active time overstates it by
   about 3.6x on bread (222 min elapsed vs 62 min of actual work). */
function methodTimeSplit(product) {
  const m = bakingMethodFor(product);
  let active = 0, waiting = 0, oven = 0;
  (m.steps || []).forEach(s => {
    const mins = Number(s.minutes) || 0;
    if (/^bake|^fry/i.test(s.title)) oven += mins;
    else if (/proof|cool|chill|rest\b/i.test(s.title)) waiting += mins;
    else active += mins;
  });
  return { active, waiting, oven, total: active + waiting + oven };
}

function fmtDuration(mins) {
  mins = Math.round(mins || 0);
  if (mins < 60) return mins + " min";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h + "h" + (m ? " " + m + "m" : "");
}
