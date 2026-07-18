/* ============================================================
   Production
   ============================================================ */

function renderProduction(root) {
  root = root || document.getElementById("moduleContent");

  root.innerHTML = `
    <div class="panel-head">
      <h2>Record Production</h2>
      <p class="panel-sub">Logs a bake, deducts the raw ingredients it used, and adds to finished stock.</p>
    </div>
    <form id="produceForm" class="ledger-form">
      <label>Product
        <select id="produceProduct" required>
          ${store.products.map((p, i) => `<option value="${p.id}" ${i === 0 ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
        </select>
      </label>
      <div id="produceDoughInput"></div>
      <div id="produceSizes"></div>
      <div id="produceDough" class="produce-dough"></div>
      <div class="form-row-2">
        <label>Batch code
          <div class="batch-code-row">
            <input type="text" id="produceBatch" placeholder="Type or click Generate">
            <button type="button" class="btn btn-ghost btn-small" id="genBatchBtn">Generate</button>
          </div>
        </label>
        <label>Shelf life (days) <input type="number" id="produceShelf" min="0" value="3"></label>
      </div>
      <button type="submit" class="btn btn-primary">Log bake</button>
    </form>
    <div id="produceResult" class="ticket-slot"></div>

    <h3 class="dash-col-title" style="margin-top:32px;">Recent bakes</h3>
    <div class="ticket-list">
      ${[...store.production_log]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
        .map(entry => {
          const product = productById(entry.product_id);
          // Older logs only stored a plain qty; newer ones store the sizes baked.
          const sizesBaked = Array.isArray(entry.sizes_baked) ? entry.sizes_baked : null;
          const batches = (product && entry.baked_weight_kg)
            ? (doughEconomics(product).finishedWeightKg > 0
                ? entry.baked_weight_kg / doughEconomics(product).finishedWeightKg : 0)
            : 0;
          return `
            <div class="ticket">
              <div class="ticket-title">${product ? esc(product.name) : "Unknown product"}</div>
              ${sizesBaked
                ? sizesBaked.map(sb => `<div class="ticket-row"><span>${esc(sb.name)}${sb.weight_g ? ` · ${Math.round(sb.weight_g)} g` : ""}</span><span>${sb.qty} baked</span></div>`).join("")
                : `<div class="ticket-row"><span>Quantity baked</span><span>${entry.qty_baked} ${product ? esc(product.yield_unit) + "(s)" : ""}</span></div>`}
              ${entry.actual_dough_kg
                ? `<div class="ticket-row"><span>Dough weighed</span><span>${entry.actual_dough_kg.toFixed(2)} kg${entry.scale_factor ? ` · ${entry.scale_factor.toFixed(2)} × recipe` : ""}</span></div>`
                : ""}
              ${entry.baked_weight_kg
                ? `<div class="ticket-row"><span>Baked weight</span><span>${entry.baked_weight_kg.toFixed(2)} kg${(!entry.actual_dough_kg && batches) ? ` · ${batches.toFixed(2)} × recipe` : ""}</span></div>`
                : ""}
              ${entry.batch_code ? `<div class="ticket-row"><span>Batch</span><span>${esc(entry.batch_code)}</span></div>` : ""}
              ${entry.expiry_date ? `<div class="ticket-row"><span>Best before</span><span style="color:${entry.expiry_date < todayISO() ? "var(--oven)" : "inherit"};">${fmtDate(entry.expiry_date)}${entry.expiry_date < todayISO() ? " · EXPIRED" : ""}</span></div>` : ""}
              <div class="ticket-row total"><span>Ingredient cost — this bake${(entry.scale_factor || batches) ? ` (${(entry.scale_factor || batches).toFixed(2)} × recipe)` : ""}</span><span>${fmtMoney(entry.total_ingredient_cost)}</span></div>
              <div class="ticket-meta">${esc(entry.baker_name || "")} · ${fmtDateTime(entry.timestamp)}</div>
            </div>
          `;
        }).join("") || `<p class="empty-state">No bakes logged yet.</p>`}
    </div>
  `;

  // Batch expiry watch: highlight batches expiring within 1 day or already expired
  const soon = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const expiring = store.production_log.filter(e => e.expiry_date && e.expiry_date <= soon);
  if (expiring.length) {
    const banner = document.createElement("div");
    banner.className = "expiry-banner";
    banner.innerHTML = `<strong>⚠ ${expiring.length} batch${expiring.length > 1 ? "es" : ""}</strong> expired or expiring within a day — check finished stock and move to Waste if needed.`;
    root.prepend(banner);
  }

  document.getElementById("produceForm").addEventListener("submit", handleProduceSubmit);

  // Size quantity boxes — fill one for a single-size bake, or several to
  // split one batch of dough across sizes.
  const prodSelect = document.getElementById("produceProduct");
  const drawSizes = () => {
    const product = productById(prodSelect.value);
    if (!product) return;
    const sizes = productSizes(product);
    const d = doughEconomics(product);

    // Actual weighed dough — the truth of what was mixed. Optional, but when
    // given it drives the ingredient deduction instead of us inferring it
    // backwards from the loaves reported.
    const dboxEl = document.getElementById("produceDoughInput");
    if (dboxEl) {
      dboxEl.innerHTML = `
        <label>Raw dough weight after mixing &amp; kneading (kg) <span class="produce-opt">optional</span>
          <input type="number" id="produceDoughKg" step="0.01" min="0" placeholder="e.g. ${d.rawWeightKg ? d.rawWeightKg.toFixed(2) : "12.20"}">
          <span class="produce-hint">One batch of this recipe should weigh about <strong>${d.rawWeightKg.toFixed(2)} kg</strong> raw. Weigh the real dough and enter it — ingredients are then deducted on what you actually mixed, not on what the loaves imply.</span>
        </label>`;
      const inp = document.getElementById("produceDoughKg");
      if (inp) inp.addEventListener("input", () => drawDough(product));
    }

    const box = document.getElementById("produceSizes");
    box.innerHTML = `
      <div class="produce-sizes-head">How many did you bake?</div>
      ${sizes.map((sz, i) => `
        <label class="produce-size-row">
          <span class="produce-size-name">
            ${esc(sz.name)}${sz.weight_g ? ` <span class="produce-size-meta">${Math.round(sz.weight_g)} g · ${fmtMoney(sz.price)}</span>` : ""}
          </span>
          <input type="number" class="produce-size-qty" data-size-qty="${esc(sz.name)}" min="0" step="1" value="" placeholder="0">
          <span class="produce-size-have">${sz.stock} in stock</span>
        </label>`).join("")}
    `;
    box.querySelectorAll(".produce-size-qty").forEach(inp =>
      inp.addEventListener("input", () => drawDough(product)));
    drawDough(product);
  };
  if (prodSelect) {
    prodSelect.addEventListener("change", drawSizes);
    drawSizes();
  }

  // "Generate" button: fill the batch field with a code based on the selected product
  const genBtn = document.getElementById("genBatchBtn");
  if (genBtn) genBtn.addEventListener("click", () => {
    const productId = document.getElementById("produceProduct").value;
    const product = productById(productId);
    document.getElementById("produceBatch").value = makeBatchCode(product);
  });
}

/* Build a batch code: 3-letter product prefix + YYMMDD + 3 random digits.
   e.g. Premium Sugar Bread on 15 Jul 2026 -> PRE-260715-947
   Used by the Generate button, and as the fallback when the field is left blank.

   Batch codes are traceability records — two bakes must never share one. With
   only 900 possible suffixes, same-day repeats of a product would collide by
   chance, so we check what's already logged and retry. */
function makeBatchCode(product) {
  const prefix = ((product && product.name) || "BAT")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const d = new Date();
  const stamp = String(d.getFullYear()).slice(2)
    + String(d.getMonth() + 1).padStart(2, "0")
    + String(d.getDate()).padStart(2, "0");

  const taken = new Set((store.production_log || []).map(e => e.batch_code).filter(Boolean));
  for (let attempt = 0; attempt < 60; attempt++) {
    const code = prefix + "-" + stamp + "-" + String(Math.floor(Math.random() * 900) + 100);
    if (!taken.has(code)) return code;
  }
  // The 900 three-digit suffixes are exhausted for this product today. Walk
  // four-digit suffixes instead — deterministic, so it can't repeat. (A clock
  // suffix can: two calls in the same millisecond produce the same code.)
  for (let n = 1000; n < 100000; n++) {
    const code = prefix + "-" + stamp + "-" + n;
    if (!taken.has(code)) return code;
  }
  return prefix + "-" + stamp + "-" + Date.now();
}

/* Read the size quantity boxes. Returns [{ size, qty }] for anything > 0. */
function readProduceSizes(product) {
  const out = [];
  document.querySelectorAll("[data-size-qty]").forEach(inp => {
    const qty = Number(inp.value) || 0;
    if (qty <= 0) return;
    out.push({ size: findSize(product, inp.dataset.sizeQty), qty });
  });
  return out;
}

/* Live readout. Two modes:
   - Dough weighed  -> that IS the scale. We check the loaves fit the dough.
   - Not weighed    -> fall back to inferring the scale from the loaves. */
function drawDough(product) {
  const el = document.getElementById("produceDough");
  if (!el) return;
  const picked = readProduceSizes(product);
  const actualKg = Number((document.getElementById("produceDoughKg") || {}).value) || 0;
  if (!picked.length && !actualKg) { el.innerHTML = ""; return; }

  const d = doughEconomics(product);
  const claimedBakedKg = picked.reduce((s, p) => s + (p.size.weight_g || 0) / 1000 * p.qty, 0);

  // The scale factor: weighed dough wins, because it's what actually happened.
  const batches = actualKg > 0
    ? (d.rawWeightKg > 0 ? actualKg / d.rawWeightKg : 0)
    : (d.finishedWeightKg > 0 ? claimedBakedKg / d.finishedWeightKg : 0);

  // Ingredient sufficiency at that scale
  const short = (product.ingredients || []).map(ri => {
    const ing = ingredientById(ri.ingredient_id);
    if (!ing) return null;
    const need = (ri.qty_required || 0) * batches;
    return need > (ing.stock_qty || 0)
      ? `${esc(ing.name)} (need ${fmtQty(need, ing.unit)}, have ${fmtQty(ing.stock_qty || 0, ing.unit)})`
      : null;
  }).filter(Boolean);

  let doughRows = "";
  let reconcile = "";

  if (actualKg > 0) {
    const expectedRaw = d.rawWeightKg * batches;
    const variancePct = expectedRaw > 0 ? ((actualKg - expectedRaw) / expectedRaw) * 100 : 0;
    // What that dough can actually become once baked
    const maxBakedKg = actualKg * (1 - d.lossPct);
    const usedPct = maxBakedKg > 0 ? (claimedBakedKg / maxBakedKg) * 100 : 0;

    doughRows = `
      <div class="produce-dough-row"><span>Dough you weighed</span><strong>${actualKg.toFixed(2)} kg</strong></div>
      <div class="produce-dough-row"><span>That is</span><strong>${batches.toFixed(2)} × this recipe</strong></div>
      <div class="produce-dough-row"><span>Bakes down to (−${(d.lossPct * 100).toFixed(0)}%)</span><strong>${maxBakedKg.toFixed(2)} kg</strong></div>
      ${picked.length ? `<div class="produce-dough-row"><span>Your loaves account for</span><strong>${claimedBakedKg.toFixed(2)} kg · ${usedPct.toFixed(0)}%</strong></div>` : ""}
    `;

    if (picked.length) {
      if (claimedBakedKg > maxBakedKg * 1.05) {
        const over = claimedBakedKg - maxBakedKg;
        reconcile = `<div class="produce-dough-short">✗ These loaves weigh ${claimedBakedKg.toFixed(2)} kg but ${actualKg.toFixed(2)} kg of dough can only make ${maxBakedKg.toFixed(2)} kg. You're ${over.toFixed(2)} kg over — check the count, the loaf weights, or the dough weight.</div>`;
      } else if (usedPct < 85) {
        reconcile = `<div class="produce-dough-warn">⚠ Only ${usedPct.toFixed(0)}% of the dough is accounted for — about ${(maxBakedKg - claimedBakedKg).toFixed(2)} kg unaccounted. Trimmings and testers are normal, but this is a lot. Log the rest under Waste Tracker if it was lost.</div>`;
      } else {
        reconcile = `<div class="produce-dough-ok">✓ Loaves reconcile with the dough (${usedPct.toFixed(0)}% used)</div>`;
      }
    }

    if (Math.abs(variancePct) > 8 && picked.length) {
      reconcile += `<div class="produce-dough-warn">⚠ That's ${variancePct >= 0 ? "+" : ""}${variancePct.toFixed(0)}% vs the ${expectedRaw.toFixed(2)} kg this recipe predicts at ${batches.toFixed(2)}× — check your scaling, or the recipe's quantities may need updating.</div>`;
    }
  } else {
    doughRows = `
      <div class="produce-dough-row"><span>Baked weight for this bake</span><strong>${claimedBakedKg.toFixed(2)} kg</strong></div>
      <div class="produce-dough-row"><span>That is</span><strong>${batches.toFixed(2)} × this recipe</strong></div>
      <div class="produce-dough-row"><span>Raw dough needed</span><strong>${(d.rawWeightKg * batches).toFixed(2)} kg</strong></div>
      <div class="produce-dough-note">Weigh your dough and enter it above for a more accurate record.</div>
    `;
  }

  el.innerHTML = doughRows + (short.length
    ? `<div class="produce-dough-short">⚠ Not enough: ${short.join(" · ")}</div>`
    : `<div class="produce-dough-ok">✓ Ingredients cover this bake</div>`) + reconcile;
}

async function handleProduceSubmit(e) {
  e.preventDefault();
  const productId = document.getElementById("produceProduct").value;
  const product = productById(productId);
  const resultEl = document.getElementById("produceResult");
  if (!product) return;

  const picked = readProduceSizes(product);
  if (!picked.length) {
    showToast("Enter how many you baked of at least one size.", true);
    return;
  }

  const shelfDays = Number(document.getElementById("produceShelf").value) || 0;
  const batchInput = document.getElementById("produceBatch").value.trim();
  const batchCode = batchInput || makeBatchCode(product);
  const expiryDate = shelfDays > 0 ? new Date(Date.now() + shelfDays * 86400000).toISOString().slice(0, 10) : null;

  const d = doughEconomics(product);
  const bakedKg = picked.reduce((s, x) => s + ((x.size.weight_g || 0) / 1000) * x.qty, 0);
  const actualDoughKg = Number((document.getElementById("produceDoughKg") || {}).value) || 0;

  // If the baker weighed the dough, THAT is what was mixed, so that is what
  // came out of inventory. Only fall back to inferring the scale from the
  // loaves when no weight was given.
  const scaleFactor = actualDoughKg > 0
    ? (d.rawWeightKg > 0 ? actualDoughKg / d.rawWeightKg : 0)
    : (d.finishedWeightKg > 0 ? bakedKg / d.finishedWeightKg : 0);

  // Physical sanity: you cannot get more baked bread out than the dough allows.
  if (actualDoughKg > 0 && bakedKg > 0) {
    const maxBakedKg = actualDoughKg * (1 - d.lossPct);
    if (bakedKg > maxBakedKg * 1.05) {
      showToast(`${actualDoughKg.toFixed(2)} kg of dough can only make about ${maxBakedKg.toFixed(2)} kg of baked bread, but these loaves come to ${bakedKg.toFixed(2)} kg. Check the count, the loaf weights, or the dough weight.`, true);
      return;
    }
  }

  if (!(scaleFactor > 0)) {
    // Work out WHICH thing is missing rather than blaming the recipe blindly.
    const noSizeWeight = picked.some(x => !(x.size.weight_g > 0));
    showToast(noSizeWeight
      ? `Set a weight (in grams) for ${picked.filter(x => !(x.size.weight_g > 0)).map(x => x.size.name).join(", ")} under Recipes — production scales by weight.`
      : "This recipe's ingredients have no weighable units (kg/g/L/ml), so dough weight can't be worked out.", true);
    return;
  }

  const insufficient = (product.ingredients || []).filter(ri => {
    const ing = ingredientById(ri.ingredient_id);
    return !ing || ri.qty_required * scaleFactor > ing.stock_qty;
  });

  if (insufficient.length) {
    resultEl.innerHTML = `
      <div class="ticket ticket-bad">
        <div class="ticket-title">Bake aborted — insufficient stock</div>
        ${insufficient.map(ri => {
          const ing = ingredientById(ri.ingredient_id);
          const needed = ri.qty_required * scaleFactor;
          return `<div class="ticket-row"><span>${ing ? esc(ing.name) : "?"}</span><span>need ${fmtQty(needed, ing ? ing.unit : "")}, have ${ing ? fmtQty(ing.stock_qty, ing.unit) : "0"}</span></div>`;
        }).join("")}
      </div>
    `;
    showToast("Bake aborted — not enough stock.", true);
    return;
  }

  let totalCost = 0;
  // Per-unit economics for THIS bake — computed inside the transaction once
  // totalCost is known, but declared here so both the log and the ticket see it.
  let economics = [];
  const bakedG = bakedKg * 1000;
  const perUnitOverheads = effectiveLabourPerUnit(product)
    + effectiveEnergyPerUnit(product)
    + (product.packaging_cost_per_unit || 0)
    + overheadPerUnit();

  try {
    await runTransaction(async (tx) => {
      const ingRefs = product.ingredients.map(ri => db.collection("ingredients").doc(ri.ingredient_id));
      const productRef = db.collection("products").doc(product.id);

      // ---- EVERY READ FIRST ----
      // Firestore requires all reads in a transaction to happen before any
      // write. Reading the product after updating the ingredients throws
      // "transactions require all reads to be executed before all writes".
      const ingSnaps = await Promise.all(ingRefs.map(ref => tx.get(ref)));
      const fresh = await tx.get(productRef);

      // ---- THEN EVERY WRITE ----
      ingSnaps.forEach((snap, i) => {
        const ri = product.ingredients[i];
        const needed = ri.qty_required * scaleFactor;
        const data = snap.data();
        const newStock = data.stock_qty - needed;
        totalCost += needed * data.cost_per_unit;
        tx.update(ingRefs[i], { stock_qty: newStock });
        tx.set(db.collection("stock_movements").doc(), {
          ingredient_id: snap.id, ingredient_name: data.name, unit: data.unit,
          change: -needed, reason: `Production — ${product.name}`,
          by: currentStaff.name, created_at: new Date().toISOString()
        });
      });

      // Add the baked units to each size's own stock (one write for the product).
      const data = fresh.exists ? fresh.data() : {};
      const sizes = (data.sizes || []).map(s => ({ ...s }));
      let stdStock = data.finished_stock_qty || 0;
      let touchedSizes = false, touchedStd = false;

      picked.forEach(x => {
        if (!x.size.isStandard) {
          const idx = sizes.findIndex(s =>
            (s.name || "").trim().toLowerCase() === (x.size.name || "").trim().toLowerCase());
          if (idx >= 0) { sizes[idx].stock = (Number(sizes[idx].stock) || 0) + x.qty; touchedSizes = true; return; }
        }
        stdStock += x.qty;
        touchedStd = true;
      });

      const patch = {};
      if (touchedSizes) patch.sizes = sizes;
      if (touchedStd) patch.finished_stock_qty = stdStock;
      if (Object.keys(patch).length) tx.update(productRef, patch);

      // totalCost is final now — allocate it across the loaves by weight.
      economics = picked.map(x => {
        const ing = bakedG > 0 ? totalCost * (x.size.weight_g || 0) / bakedG : 0;
        const full = ing + perUnitOverheads;
        const price = x.size.price || 0;
        const margin = price - full;
        return {
          name: x.size.name, qty: x.qty, weightG: x.size.weight_g,
          ing, full, price, margin,
          marginPct: price > 0 ? (margin / price) * 100 : 0,
          atLoss: price > 0 && margin < 0
        };
      });

      const logRef = db.collection("production_log").doc();
      tx.set(logRef, {
        product_id: product.id,
        qty_baked: picked.reduce((s, x) => s + x.qty, 0),
        sizes_baked: picked.map(x => ({ name: x.size.name, qty: x.qty, weight_g: x.size.weight_g })),
        baked_weight_kg: bakedKg,
        actual_dough_kg: actualDoughKg || null,
        expected_dough_kg: d.rawWeightKg * scaleFactor,
        scale_factor: scaleFactor,
        unit_economics: economics.map(e => ({ name: e.name, ing_cost: e.ing, full_cost: e.full, price: e.price, margin: e.margin })),
        batch_code: batchCode,
        expiry_date: expiryDate,
        timestamp: new Date().toISOString(),
        total_ingredient_cost: totalCost,
        baker_name: currentStaff.name,
        baker_id: currentStaff.id
      });
    });
  } catch (err) {
    console.error("Production failed:", err);
    let msg = "Could not log this bake — try again.";
    if (err.code === "permission-denied") {
      msg = "Bake blocked by database permissions — publish your firestore.rules in Firebase, then retry.";
    } else if (err.message) {
      msg = "Could not log this bake: " + err.message;
    }
    if (resultEl) resultEl.innerHTML = `<div class="ticket ticket-bad"><div class="ticket-title">${esc(msg)}</div></div>`;
    showToast(msg, true);
    return;
  }

  // Verify the write actually landed by re-reading the product from Firestore
  let verified = null;
  try {
    const fresh = await db.collection("products").doc(product.id).get();
    if (fresh.exists) verified = productSizes({ ...product, ...fresh.data() });
  } catch (e) { /* read check is best-effort */ }

  resultEl.innerHTML = `
    <div class="ticket">
      <div class="ticket-title">Bake logged ✓</div>
      ${picked.map(x => `<div class="ticket-row"><span>${esc(product.name)}${x.size.isStandard ? "" : " — " + esc(x.size.name)}</span><span>${x.qty} baked</span></div>`).join("")}
      ${actualDoughKg > 0
        ? `<div class="ticket-row"><span>Dough weighed</span><span>${actualDoughKg.toFixed(2)} kg</span></div>
           <div class="ticket-row"><span>Loaves account for</span><span>${bakedKg.toFixed(2)} kg of ${(actualDoughKg * (1 - d.lossPct)).toFixed(2)} kg baked</span></div>`
        : `<div class="ticket-row"><span>Baked weight</span><span>${bakedKg.toFixed(2)} kg</span></div>`}
      <div class="ticket-row total"><span>Ingredient cost — this bake</span><span>${fmtMoney(totalCost)}</span></div>
      <div class="ticket-row ticket-working"><span>How that's worked out</span><span>${scaleFactor.toFixed(4)} × ${fmtMoney(d.totalDoughCost)} (one batch)</span></div>

      <div class="ticket-divider"></div>
      <div class="ticket-row"><span><strong>What each one cost today</strong></span><span></span></div>
      ${economics.map(e => `
        <div class="ticket-row"><span>${esc(e.name)}${e.weightG ? ` · ${Math.round(e.weightG)} g` : ""}</span><span>${fmtMoney(e.ing)} ingredients</span></div>
        <div class="ticket-row ticket-working"><span>+ labour, energy, packaging, overhead</span><span>${fmtMoney(perUnitOverheads)}</span></div>
        <div class="ticket-row"><span>Full cost per unit</span><span><strong>${fmtMoney(e.full)}</strong></span></div>
        <div class="ticket-row"><span>Sells for</span><span>${fmtMoney(e.price)}</span></div>
        <div class="ticket-row ${e.atLoss ? "ticket-loss" : "ticket-gain"}">
          <span>${e.atLoss ? "⚠ LOSS per unit" : "Margin per unit"}</span>
          <span><strong>${fmtMoney(e.margin)} · ${e.marginPct.toFixed(0)}%</strong></span>
        </div>
        ${e.atLoss ? `<div class="ticket-alert">Every ${esc(e.name)} sold at ${fmtMoney(e.price)} loses ${fmtMoney(Math.abs(e.margin))}. Across ${e.qty} baked that's ${fmtMoney(Math.abs(e.margin) * e.qty)}. Raise the price, cut the weight, or check your ingredient costs.</div>` : ""}
      `).join('<div class="ticket-divider"></div>')}

      ${verified
        ? `<div class="ticket-divider"></div>
           <div class="ticket-row"><span><strong>Now in stock — ready to sell</strong></span><span></span></div>
           ${verified.map(sz => `<div class="ticket-row"><span>${esc(sz.name)}</span><span><strong>${sz.stock}</strong> @ ${fmtMoney(sz.price)}</span></div>`).join("")}`
        : `<div class="ticket-row"><span style="color:var(--oven,#c62828)">⚠ Could not confirm the saved stock — if POS still shows 0, your firestore.rules likely need publishing.</span></div>`}
    </div>
  `;

  const totalBaked = picked.reduce((s, x) => s + x.qty, 0);
  showToast(`Logged: ${totalBaked} unit${totalBaked !== 1 ? "s" : ""} of ${product.name} — now sellable at the POS.`);
  document.getElementById("produceForm").reset();
}
