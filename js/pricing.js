/* ============================================================
   Pricing Studio — dough weight & price models for Ghanaian bakeries
   ------------------------------------------------------------
   Everything here is pure MATH and built-in rules: exact, free,
   instant, and works offline. No API key, no account, no PHP,
   no internet. The adviser at the bottom reasons over YOUR
   numbers rather than asking a model to guess.

   Models:
     1. Price point   — fix the price, work out the loaf weight
     2. Cost-plus     — cost x markup, rounded to a Ghana price point
     3. Wholesale     — hawker/vendor price + who makes what
     4. Dough by kg   — sell raw dough vs bake and sell
   ============================================================ */

// Prices Ghanaian customers actually expect to pay
const GHANA_PRICE_POINTS = [0.5, 1, 2, 3, 5, 10, 15, 20, 30, 50, 100];

function nearestPricePoint(value) {
  if (!(value > 0)) return 0;
  return GHANA_PRICE_POINTS.reduce((best, p) =>
    Math.abs(p - value) < Math.abs(best - value) ? p : best, GHANA_PRICE_POINTS[0]);
}

/* Shared figures every model needs. */
function pricingSnapshot(product) {
  const d = doughEconomics(product);
  const fullCost = productFullCost(product);      // ingredients + labour + energy + packaging
  const ingCost = productUnitCost(product);       // ingredients only, per unit
  const overhead = Math.max(0, fullCost - ingCost); // the non-ingredient part, per unit
  const unitWeightKg = product.yield_qty ? d.finishedWeightKg / product.yield_qty : 0;
  return { d, fullCost, ingCost, overhead, unitWeightKg };
}

/* MODEL 1 — Price point (reverse costing).
   "I must sell at GHS 5 and keep 30% margin — how heavy should the loaf be?"
   This is what Ghanaian bakeries do when flour moves: hold the price, change the weight. */
function modelPricePoint(product, targetPrice, targetMarginPct) {
  const { d, overhead, unitWeightKg } = pricingSnapshot(product);
  const allowedFullCost = targetPrice * (1 - targetMarginPct / 100);
  const allowedIngCost = allowedFullCost - overhead;

  if (!(d.finishedCostPerKg > 0)) {
    return { possible: false, reason: "This recipe has no ingredient weights yet — add ingredients first." };
  }
  if (allowedIngCost <= 0) {
    return {
      possible: false,
      reason: `At GHS ${targetPrice.toFixed(2)} with ${targetMarginPct}% margin you'd only have ${fmtMoney(allowedFullCost)} of cost to play with — but labour, energy and packaging alone are ${fmtMoney(overhead)}. Lower the margin, or raise the price.`
    };
  }

  const newWeightKg = allowedIngCost / d.finishedCostPerKg;
  const unitsPerBatch = newWeightKg > 0 ? d.finishedWeightKg / newWeightKg : 0;
  const changePct = unitWeightKg > 0 ? ((newWeightKg - unitWeightKg) / unitWeightKg) * 100 : 0;

  return {
    possible: true,
    newWeightKg, newWeightG: newWeightKg * 1000,
    currentWeightG: unitWeightKg * 1000,
    changePct,
    unitsPerBatch,
    allowedFullCost, allowedIngCost, overhead
  };
}

/* MODEL 2 — Cost-plus markup, snapped to a price customers recognise. */
function modelCostPlus(product, markupPct) {
  const { fullCost } = pricingSnapshot(product);
  const rawPrice = fullCost * (1 + markupPct / 100);
  const rounded = nearestPricePoint(rawPrice);
  const actualMarginPct = rounded > 0 ? ((rounded - fullCost) / rounded) * 100 : 0;
  const actualMarkupPct = fullCost > 0 ? ((rounded - fullCost) / fullCost) * 100 : 0;
  return { fullCost, rawPrice, rounded, actualMarginPct, actualMarkupPct, losesMoney: rounded < fullCost };
}

/* MODEL 3 — Wholesale / hawker tier.
   Vendors buy at a discount and resell at your retail price. */
function modelWholesale(product, retailPrice, discountPct) {
  const { fullCost } = pricingSnapshot(product);
  const hawkerPrice = retailPrice * (1 - discountPct / 100);
  const yourProfit = hawkerPrice - fullCost;
  const yourMarginPct = hawkerPrice > 0 ? (yourProfit / hawkerPrice) * 100 : 0;
  const hawkerProfit = retailPrice - hawkerPrice;
  const hawkerMarginPct = retailPrice > 0 ? (hawkerProfit / retailPrice) * 100 : 0;
  return {
    fullCost, hawkerPrice, yourProfit, yourMarginPct,
    hawkerProfit, hawkerMarginPct,
    viable: hawkerPrice > fullCost
  };
}

/* MODEL 4 — Sell raw dough by the kg vs bake it and sell finished.
   Raw dough skips baking labour/energy/packaging, so we compare fairly. */
function modelDoughSale(product, ratePerKg) {
  const { d, fullCost } = pricingSnapshot(product);
  const doughRevenue = d.rawWeightKg * ratePerKg;
  const doughProfit = doughRevenue - d.totalDoughCost;   // ingredients only
  const bakedRevenue = (product.yield_qty || 0) * (product.selling_price || 0);
  const bakedProfit = (product.yield_qty || 0) * ((product.selling_price || 0) - fullCost);
  const breakEvenRate = d.rawWeightKg > 0 ? d.totalDoughCost / d.rawWeightKg : 0;
  return {
    rawWeightKg: d.rawWeightKg, doughRevenue, doughProfit,
    bakedRevenue, bakedProfit, breakEvenRate,
    better: doughProfit > bakedProfit ? "dough" : "baked",
    gap: Math.abs(doughProfit - bakedProfit)
  };
}

/* ---------------- The Pricing Studio modal ---------------- */

let pricingState = { tab: "pricepoint", targetPrice: 5, targetMargin: 30, markup: 45, retail: 0, discount: 20, doughRate: 0 };

function openPricingStudio(productId) {
  const product = productById(productId);
  if (!product) { showToast("Product not found.", true); return; }
  if (!(product.ingredients || []).length) {
    showToast("Add ingredients to this recipe first — pricing needs them.", true);
    return;
  }
  // Seed sensible starting values from the product itself
  if (!pricingState.retail) pricingState.retail = product.selling_price || 5;
  if (!pricingState.doughRate) pricingState.doughRate = product.dough_sell_rate || Math.ceil(doughEconomics(product).rawCostPerKg * 1.4);
  renderPricingStudio(product);
}

function renderPricingStudio(product) {
  const { d, fullCost, overhead, unitWeightKg } = pricingSnapshot(product);
  const tabs = [
    ["pricepoint", "Price point"],
    ["costplus", "Cost-plus"],
    ["wholesale", "Wholesale"],
    ["dough", "Dough by kg"]
  ];

  openModal(`
    <div class="modal-head">
      <h3>Pricing studio — ${esc(product.name)}</h3>
      <button class="btn btn-ghost btn-small" onclick="closeModal()">✕</button>
    </div>

    <div class="ps-facts">
      <div><span>Raw dough</span><strong>${d.rawWeightKg.toFixed(2)} kg</strong></div>
      <div><span>Baked (−${(d.lossPct * 100).toFixed(0)}%)</span><strong>${d.finishedWeightKg.toFixed(2)} kg</strong></div>
      <div><span>Cost per baked kg</span><strong>${fmtMoney(d.finishedCostPerKg)}</strong></div>
      <div><span>Current unit</span><strong>${(unitWeightKg * 1000).toFixed(0)} g · ${fmtMoney(fullCost)}</strong></div>
    </div>

    <div class="seg ps-tabs">
      ${tabs.map(([k, label]) => `<button class="seg-btn ${pricingState.tab === k ? "is-active" : ""}" data-pstab="${k}">${label}</button>`).join("")}
    </div>

    <div id="psBody">${pricingBody(product)}</div>

    <div class="ps-ai">
      <button class="btn btn-ghost btn-small" id="psAskAi">💡 Should I shrink, raise the price, or both?</button>
      <div id="psAiOut" class="ps-ai-out"></div>
    </div>
  `);

  document.querySelectorAll("[data-pstab]").forEach(b => b.addEventListener("click", () => {
    pricingState.tab = b.dataset.pstab;
    renderPricingStudio(product);
  }));
  bindPricingInputs(product);
  const aiBtn = document.getElementById("psAskAi");
  if (aiBtn) aiBtn.addEventListener("click", () => showPricingAdvice(product));
}

function pricingBody(product) {
  const s = pricingState;
  if (s.tab === "pricepoint") {
    const r = modelPricePoint(product, Number(s.targetPrice) || 0, Number(s.targetMargin) || 0);
    return `
      <p class="ps-hint">Hold the price customers expect, and let the <strong>weight</strong> move. This is what to do when flour prices shift.</p>
      <div class="ps-inputs">
        <label>Target price (GHS)
          <input type="number" step="0.5" min="0" id="psTargetPrice" value="${s.targetPrice}">
        </label>
        <label>Target margin (%)
          <input type="number" step="1" min="0" max="95" id="psTargetMargin" value="${s.targetMargin}">
        </label>
        <div class="ps-chips">${GHANA_PRICE_POINTS.slice(0, 8).map(p => `<button class="ps-chip ${Number(s.targetPrice) === p ? "on" : ""}" data-pp="${p}">GHS ${p}</button>`).join("")}</div>
      </div>
      ${!r.possible
        ? `<div class="ps-warn">${esc(r.reason)}</div>`
        : `<div class="ps-result">
            <div class="ps-big">${r.newWeightG.toFixed(0)} g per unit</div>
            <div class="ps-sub">
              ${r.currentWeightG > 0 ? `Now: ${r.currentWeightG.toFixed(0)} g →
              <strong style="color:${r.changePct < 0 ? "var(--oven,#c62828)" : "var(--herb,#2e7d32)"}">
              ${r.changePct >= 0 ? "+" : ""}${r.changePct.toFixed(0)}%</strong>` : ""}
            </div>
            <div class="ps-rows">
              <div><span>Units per batch</span><strong>${r.unitsPerBatch.toFixed(1)}</strong></div>
              <div><span>Cost allowed per unit</span><strong>${fmtMoney(r.allowedFullCost)}</strong></div>
              <div><span>— of which ingredients</span><strong>${fmtMoney(r.allowedIngCost)}</strong></div>
              <div><span>— labour/energy/packaging</span><strong>${fmtMoney(r.overhead)}</strong></div>
            </div>
            ${r.changePct < -10 ? `<div class="ps-warn">That's a big shrink. Customers notice weight drops over ~10% — consider a small price rise instead, or both.</div>` : ""}
          </div>`}
    `;
  }

  if (s.tab === "costplus") {
    const r = modelCostPlus(product, Number(s.markup) || 0);
    return `
      <p class="ps-hint">Add a markup to your cost, then snap to a price customers recognise.</p>
      <div class="ps-inputs">
        <label>Markup on cost (%)
          <input type="number" step="5" min="0" id="psMarkup" value="${s.markup}">
        </label>
      </div>
      <div class="ps-result">
        <div class="ps-big">${fmtMoney(r.rounded)}</div>
        <div class="ps-sub">Raw calculation: ${fmtMoney(r.rawPrice)} → rounded to a Ghana price point</div>
        <div class="ps-rows">
          <div><span>Full cost per unit</span><strong>${fmtMoney(r.fullCost)}</strong></div>
          <div><span>Profit per unit</span><strong>${fmtMoney(r.rounded - r.fullCost)}</strong></div>
          <div><span>Actual margin</span><strong>${r.actualMarginPct.toFixed(0)}%</strong></div>
          <div><span>Actual markup</span><strong>${r.actualMarkupPct.toFixed(0)}%</strong></div>
        </div>
        ${r.losesMoney ? `<div class="ps-warn">Rounding down puts this below cost — pick the next price point up, or cut the recipe cost.</div>` : ""}
        <button class="btn btn-primary btn-small" data-apply-price="${r.rounded}">Use ${fmtMoney(r.rounded)} as selling price</button>
      </div>
    `;
  }

  if (s.tab === "wholesale") {
    const r = modelWholesale(product, Number(s.retail) || 0, Number(s.discount) || 0);
    return `
      <p class="ps-hint">Hawkers and table-top sellers buy below retail and resell at your price. Check you still profit.</p>
      <div class="ps-inputs">
        <label>Retail price (GHS)
          <input type="number" step="0.5" min="0" id="psRetail" value="${s.retail}">
        </label>
        <label>Vendor discount (%)
          <input type="number" step="1" min="0" max="80" id="psDiscount" value="${s.discount}">
        </label>
      </div>
      <div class="ps-result">
        <div class="ps-big">${fmtMoney(r.hawkerPrice)} <span class="ps-big-note">to the vendor</span></div>
        <div class="ps-rows">
          <div><span>Your cost</span><strong>${fmtMoney(r.fullCost)}</strong></div>
          <div><span>Your profit per unit</span><strong style="color:${r.viable ? "var(--herb,#2e7d32)" : "var(--oven,#c62828)"}">${fmtMoney(r.yourProfit)}</strong></div>
          <div><span>Your margin</span><strong>${r.yourMarginPct.toFixed(0)}%</strong></div>
          <div><span>Vendor's profit per unit</span><strong>${fmtMoney(r.hawkerProfit)}</strong></div>
          <div><span>Vendor's margin</span><strong>${r.hawkerMarginPct.toFixed(0)}%</strong></div>
        </div>
        ${!r.viable
          ? `<div class="ps-warn">At this discount you're selling below cost. Lower the discount, or raise retail.</div>`
          : r.hawkerMarginPct < 10
            ? `<div class="ps-warn">Only ${r.hawkerMarginPct.toFixed(0)}% for the vendor — that's thin, they may not take it.</div>`
            : ""}
      </div>
    `;
  }

  // dough by kg
  const r = modelDoughSale(product, Number(s.doughRate) || 0);
  return `
    <p class="ps-hint">Sell the raw dough by weight instead of baking it. Compares both routes for one batch.</p>
    <div class="ps-inputs">
      <label>Dough price (GHS per kg)
        <input type="number" step="0.5" min="0" id="psDoughRate" value="${s.doughRate}">
      </label>
      <div class="ps-note">Break-even is ${fmtMoney(r.breakEvenRate)}/kg — below that you lose money on every kg.</div>
    </div>
    <div class="ps-result">
      <div class="ps-compare">
        <div class="ps-compare-col ${r.better === "dough" ? "wins" : ""}">
          <div class="ps-compare-title">Sell as raw dough</div>
          <div><span>Weight</span><strong>${r.rawWeightKg.toFixed(2)} kg</strong></div>
          <div><span>Revenue</span><strong>${fmtMoney(r.doughRevenue)}</strong></div>
          <div><span>Profit</span><strong>${fmtMoney(r.doughProfit)}</strong></div>
        </div>
        <div class="ps-compare-col ${r.better === "baked" ? "wins" : ""}">
          <div class="ps-compare-title">Bake and sell</div>
          <div><span>Units</span><strong>${product.yield_qty || 0}</strong></div>
          <div><span>Revenue</span><strong>${fmtMoney(r.bakedRevenue)}</strong></div>
          <div><span>Profit</span><strong>${fmtMoney(r.bakedProfit)}</strong></div>
        </div>
      </div>
      <div class="ps-sub">${r.better === "dough"
        ? `Selling dough earns <strong>${fmtMoney(r.gap)}</strong> more per batch — but you lose the baked margin and the customer relationship.`
        : `Baking earns <strong>${fmtMoney(r.gap)}</strong> more per batch. Sell dough only for spare capacity.`}</div>
      <button class="btn btn-primary btn-small" data-apply-dough="${Number(pricingState.doughRate) || 0}">Save ${fmtMoney(Number(pricingState.doughRate) || 0)}/kg as this recipe's dough rate</button>
    </div>
  `;
}

function bindPricingInputs(product) {
  const wire = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      pricingState[key] = Number(el.value) || 0;
      const body = document.getElementById("psBody");
      if (body) { body.innerHTML = pricingBody(product); bindPricingInputs(product); }
    });
  };
  wire("psTargetPrice", "targetPrice");
  wire("psTargetMargin", "targetMargin");
  wire("psMarkup", "markup");
  wire("psRetail", "retail");
  wire("psDiscount", "discount");
  wire("psDoughRate", "doughRate");

  document.querySelectorAll("[data-pp]").forEach(chip => chip.addEventListener("click", () => {
    pricingState.targetPrice = Number(chip.dataset.pp);
    const body = document.getElementById("psBody");
    if (body) { body.innerHTML = pricingBody(product); bindPricingInputs(product); }
  }));

  const applyPrice = document.querySelector("[data-apply-price]");
  if (applyPrice) applyPrice.addEventListener("click", async () => {
    const price = Number(applyPrice.dataset.applyPrice) || 0;
    if (!confirm(`Set ${product.name}'s selling price to ${fmtMoney(price)}?`)) return;
    try {
      await setDoc("products", product.id, { selling_price: price });
      showToast(`Selling price set to ${fmtMoney(price)}.`);
      closeModal();
    } catch (err) { showToast(err.message || "Could not save the price.", true); }
  });

  const applyDough = document.querySelector("[data-apply-dough]");
  if (applyDough) applyDough.addEventListener("click", async () => {
    const rate = Number(applyDough.dataset.applyDough) || 0;
    try {
      await setDoc("products", product.id, { dough_sell_rate: rate });
      showToast(`Dough rate saved at ${fmtMoney(rate)}/kg.`);
      closeModal();
    } catch (err) { showToast(err.message || "Could not save the dough rate.", true); }
  });
}

/* ============================================================
   BUILT-IN ADVISER — no AI, no key, no internet
   ------------------------------------------------------------
   "Flour went up. Do I shrink the loaf, raise the price, or both?"
   That is a judgement call, but it is not a mystery: it follows
   from your cost, your margin, and what Ghanaian customers will
   accept. So it is written as rules over YOUR numbers, not sent
   to a model to guess at.
   ============================================================ */

// The next familiar price above a given one (GHS 5 -> GHS 10).
function nextPricePointAbove(value) {
  return GHANA_PRICE_POINTS.find(p => p > value + 0.001) || value;
}
function prevPricePointBelow(value) {
  const lower = GHANA_PRICE_POINTS.filter(p => p < value - 0.001);
  return lower.length ? lower[lower.length - 1] : value;
}

/* How noticeable is a weight change to a customer?
   Under ~5% nobody notices. 5-10% regulars notice. Beyond 10%
   people talk, and beyond 25% they stop buying. */
function shrinkVerdict(changePct) {
  if (changePct > 5) return { level: "grow", text: "a bigger loaf than now — customers gain" };
  if (changePct >= -1) return { level: "none", text: "no real change" };
  if (changePct > -5) return { level: "safe", text: "too small to notice" };
  if (changePct > -10) return { level: "watch", text: "regulars will notice" };
  if (changePct > -25) return { level: "risky", text: "customers will talk" };
  return { level: "no", text: "far too much — you'd lose customers" };
}

/* The adviser. Returns a headline, the options with real numbers,
   and one recommendation. Everything is derived, nothing guessed. */
function pricingAdvice(product, targetPrice, targetMarginPct) {
  const { d, fullCost, overhead, unitWeightKg } = pricingSnapshot(product);
  const currentPrice = product.selling_price || 0;
  const currentG = unitWeightKg * 1000;
  const currentMarginPct = currentPrice > 0 ? ((currentPrice - fullCost) / currentPrice) * 100 : 0;

  if (!(d.finishedCostPerKg > 0)) {
    return { headline: "Add ingredients to this recipe first — there's nothing to price yet.", options: [], recommendation: null };
  }

  const options = [];

  // ---- Option A: hold the price, change the weight ----
  const a = modelPricePoint(product, targetPrice, targetMarginPct);
  if (a.possible) {
    const v = shrinkVerdict(a.changePct);
    options.push({
      key: "weight",
      label: "Hold the price, change the weight",
      headline: `${fmtMoney(targetPrice)} for a ${a.newWeightG.toFixed(0)} g loaf`,
      detail: `Now ${currentG.toFixed(0)} g → ${a.newWeightG.toFixed(0)} g (${a.changePct >= 0 ? "+" : ""}${a.changePct.toFixed(0)}%) — ${v.text}. You'd get ${a.unitsPerBatch.toFixed(0)} per batch.`,
      changePct: a.changePct,
      verdict: v.level,
      viable: v.level !== "no"
    });
  } else {
    options.push({
      key: "weight", label: "Hold the price, change the weight",
      headline: "Not possible at this price", detail: a.reason,
      verdict: "no", viable: false
    });
  }

  // ---- Option B: hold the weight, change the price ----
  const needPrice = (unitWeightKg * d.finishedCostPerKg + overhead) / (1 - targetMarginPct / 100);
  const roundedB = nearestPricePoint(needPrice) < needPrice ? nextPricePointAbove(needPrice) : nearestPricePoint(needPrice);
  const marginB = roundedB > 0 ? ((roundedB - fullCost) / roundedB) * 100 : 0;
  const riseB = currentPrice > 0 ? ((roundedB - currentPrice) / currentPrice) * 100 : 0;
  options.push({
    key: "price",
    label: "Hold the weight, change the price",
    headline: `${fmtMoney(roundedB)} for the same ${currentG.toFixed(0)} g loaf`,
    detail: currentPrice > 0 && Math.abs(roundedB - currentPrice) > 0.01
      ? `Now ${fmtMoney(currentPrice)} → ${fmtMoney(roundedB)} (${riseB >= 0 ? "+" : ""}${riseB.toFixed(0)}%), giving ${marginB.toFixed(0)}% margin. A price customers already recognise.`
      : `Your current price already gives ${marginB.toFixed(0)}% margin at this weight.`,
    changePct: riseB,
    verdict: riseB > 50 ? "risky" : riseB > 0 ? "watch" : "safe",
    viable: roundedB > fullCost
  });

  // ---- Option C: a bit of both (raise one step, shrink less) ----
  // Only worth offering when holding the price would mean a real shrink.
  const needsRealShrink = a.possible && a.changePct < -5;
  const stepUp = nextPricePointAbove(targetPrice);
  const c = modelPricePoint(product, stepUp, targetMarginPct);
  if (needsRealShrink && c.possible && stepUp > targetPrice) {
    const v = shrinkVerdict(c.changePct);
    options.push({
      key: "both",
      label: "A bit of both",
      headline: `${fmtMoney(stepUp)} for a ${c.newWeightG.toFixed(0)} g loaf`,
      detail: c.changePct >= 0
        ? `Step the price up to ${fmtMoney(stepUp)} and the loaf actually grows ${c.changePct.toFixed(0)}% — ${v.text}. You charge more but give more.`
        : `Step the price up to ${fmtMoney(stepUp)} and the loaf only shrinks ${Math.abs(c.changePct).toFixed(0)}% — ${v.text}. Splits the pain between price and size.`,
      changePct: c.changePct,
      verdict: v.level,
      viable: v.level !== "no"
    });
  }

  // ---- Pick one ----
  let recommendation, headline;

  const askingAboutCurrentPrice = currentPrice > 0 && Math.abs(targetPrice - currentPrice) < 0.01;

  if (askingAboutCurrentPrice && currentMarginPct >= targetMarginPct - 0.5) {
    headline = `You're already at ${currentMarginPct.toFixed(0)}% margin — above your ${targetMarginPct}% target.`;
    recommendation = { key: null, text: `No change needed. ${esc(product.name)} at ${fmtMoney(currentPrice)} is doing its job. Revisit if flour moves again.` };
  } else if (currentMarginPct < 0) {
    const best = options.filter(o => o.viable).sort((x, y) => (y.changePct || 0) - (x.changePct || 0))[0];
    headline = `You're losing ${fmtMoney(fullCost - currentPrice)} on every one you sell.`;
    recommendation = { key: best ? best.key : "price", text: best
      ? `Fix this now — ${best.label.toLowerCase()}: ${best.headline}.`
      : `This recipe can't be sold profitably at anything near ${fmtMoney(targetPrice)}. Cut the ingredient cost or drop the product.` };
  } else {
    const optA = options.find(o => o.key === "weight");
    const optC = options.find(o => o.key === "both");
    if (optA && optA.viable && optA.changePct > -5) {
      headline = `You can hold ${fmtMoney(targetPrice)} without anyone noticing.`;
      recommendation = { key: "weight", text: `Change the weight only — ${optA.newWeightG || ""}${optA.headline}. A move that small stays invisible to customers.` };
    } else if (optA && optA.viable && optA.changePct > -10) {
      headline = `Holding ${fmtMoney(targetPrice)} means a noticeable shrink.`;
      recommendation = { key: "weight", text: `${optA.headline} works, but regulars will spot it. Do it once — if flour rises again, move the price instead of shrinking twice.` };
    } else if (optC && optC.viable) {
      headline = `${fmtMoney(targetPrice)} is too tight — shrinking alone would go too far.`;
      recommendation = { key: "both", text: `Do a bit of both: ${optC.headline}. Splitting it keeps the loaf respectable and the margin intact.` };
    } else {
      const optB = options.find(o => o.key === "price");
      headline = `${fmtMoney(targetPrice)} doesn't work for this recipe.`;
      recommendation = { key: "price", text: optB && optB.viable
        ? `Move the price: ${optB.headline}. The loaf stays honest and the maths works.`
        : `Neither shrinking nor a price rise fixes this. The recipe itself costs too much — check your ingredient prices.` };
    }
  }

  return {
    headline, options, recommendation,
    currentPrice, currentG, currentMarginPct, fullCost, overhead,
    costPerKg: d.finishedCostPerKg
  };
}

/* Render the adviser panel — built in, instant, no network. */
function showPricingAdvice(product) {
  const out = document.getElementById("psAiOut");
  if (!out) return;
  const adv = pricingAdvice(product, Number(pricingState.targetPrice) || 0, Number(pricingState.targetMargin) || 0);

  if (!adv.options.length) {
    out.innerHTML = `<div class="ps-warn">${esc(adv.headline)}</div>`;
    return;
  }

  const badge = { safe: "ps-v-safe", watch: "ps-v-watch", risky: "ps-v-risky", no: "ps-v-no", none: "ps-v-safe", grow: "ps-v-safe" };

  out.innerHTML = `
    <div class="ps-advice">
      <div class="ps-advice-head">${esc(adv.headline)}</div>
      <div class="ps-advice-sub">
        Now: ${adv.currentG.toFixed(0)} g at ${fmtMoney(adv.currentPrice)} · costs ${fmtMoney(adv.fullCost)} · ${adv.currentMarginPct.toFixed(0)}% margin
      </div>

      <div class="ps-advice-opts">
        ${adv.options.map(o => `
          <div class="ps-advice-opt ${adv.recommendation && adv.recommendation.key === o.key ? "picked" : ""} ${!o.viable ? "dead" : ""}">
            <div class="ps-advice-opt-top">
              <span class="ps-advice-opt-label">${esc(o.label)}</span>
              <span class="ps-badge ${badge[o.verdict] || ""}">${o.verdict === "no" ? "don't" : o.verdict === "risky" ? "risky" : o.verdict === "watch" ? "noticeable" : o.verdict === "grow" ? "bigger" : "safe"}</span>
            </div>
            <div class="ps-advice-opt-head">${esc(o.headline)}</div>
            <div class="ps-advice-opt-detail">${esc(o.detail)}</div>
          </div>`).join("")}
      </div>

      ${adv.recommendation ? `
        <div class="ps-advice-rec">
          <strong>What I'd do:</strong> ${esc(adv.recommendation.text)}
        </div>` : ""}
    </div>
  `;
}
