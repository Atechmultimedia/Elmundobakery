/* ============================================================
   Recipes & Products
   Each product is both a recipe (raw ingredients + yield) and
   a sellable item (selling price + finished stock on hand).
   ============================================================ */

function renderRecipes(root) {
  root = root || document.getElementById("moduleContent");
  const canEdit = ["master", "admin", "manager", "baker", "production_manager"].includes(currentStaff.role);
  const canManage = ["master", "admin"].includes(currentStaff.role);

  // Detect duplicate product names (case-insensitive)
  const prodNameCounts = {};
  store.products.forEach(p => {
    const key = (p.name || "").trim().toLowerCase();
    prodNameCounts[key] = (prodNameCounts[key] || 0) + 1;
  });
  const prodDupCount = Object.values(prodNameCounts).filter(c => c > 1).length;

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Recipes &amp; Costing</h2>
        <p class="panel-sub">What El Mundo bakes and sells, with cost, price, and margin per unit.</p>
      </div>
      ${canManage && prodDupCount > 0 ? `<button class="btn btn-ghost" id="mergeProdDupBtn" style="color:var(--oven);">Merge ${prodDupCount} duplicate${prodDupCount > 1 ? "s" : ""}</button>` : ""}
      ${canEdit ? `<button class="btn btn-ghost" id="genRecipeBtn">📖 Recipe Library</button>
      <button class="btn btn-primary" id="addProductBtn">Add product</button>` : ""}
    </div>

    ${businessDynamicsPanel()}

    <div class="recipe-list">
      ${store.products.map(p => {
        const unitCost = productUnitCost(p);
        const fullCost = productFullCost(p);
        const margin = (p.selling_price || 0) - fullCost;
        const marginPct = p.selling_price ? (margin / p.selling_price * 100) : 0;
        return `
          <article class="recipe-card">
            <div class="recipe-card-top">
              <div>
                <span class="recipe-yield">Yields ${p.yield_qty} ${p.yield_unit} · ${productTotalStock(p)} in stock${(p.sizes || []).filter(s => s && s.name).length ? ` (${productSizes(p).map(s => `${esc(s.name)}: ${s.stock}`).join(", ")})` : ""}</span>
                <h3>${esc(p.name)}</h3>
              </div>
              ${canEdit ? `<button class="btn btn-ghost btn-small" data-edit-prod="${p.id}">Edit</button>` : ""}
            </div>
            <p class="recipe-desc">${esc(p.description || "")}</p>
            <table class="recipe-ing-table">
              <tbody>
                ${(p.ingredients || []).map(ri => {
                  const ing = ingredientById(ri.ingredient_id);
                  if (!ing) return "";
                  return `<tr><td>${esc(ing.name)}</td><td class="num">${fmtQty(ri.qty_required, ing.unit)}</td><td class="num">${fmtMoney(ri.qty_required * ing.cost_per_unit)}</td></tr>`;
                }).join("")}
              </tbody>
              ${(p.ingredients || []).length ? (() => {
                const dd = doughEconomics(p);
                const perUnit = p.yield_qty ? dd.totalDoughCost / p.yield_qty : 0;
                return `<tfoot>
                  <tr class="recipe-ing-total">
                    <td><strong>Total ingredients — one batch</strong></td>
                    <td class="num">${dd.rawWeightKg > 0 ? dd.rawWeightKg.toFixed(2) + " kg" : ""}</td>
                    <td class="num"><strong>${fmtMoney(dd.totalDoughCost)}</strong></td>
                  </tr>
                  <tr class="recipe-ing-sub">
                    <td>Per ${esc(p.yield_unit || "unit")} (÷ ${p.yield_qty || 0})</td>
                    <td class="num"></td>
                    <td class="num">${fmtMoney(perUnit)}</td>
                  </tr>
                </tfoot>`;
              })() : ""}
            </table>
            ${(() => {
              const b = productCostBreakdown(p);
              return `
                <div class="recipe-cost-lines">
                  <div class="recipe-costline"><span>Ingredients</span><span>${fmtMoney(b.ingredient)}</span></div>
                  ${b.labour ? `<div class="recipe-costline"><span>Labour${autoLabourPerUnit(p) != null ? ` <span class="auto-tag" title="${methodTimeSplit(p).active} min hands-on × ${fmtMoney(bakerHourlyRate())}/hr × ${getSettings().bakers_per_batch} baker(s) ÷ ${p.yield_qty} ${esc(p.yield_unit || "unit")}">auto</span>` : ""}</span><span>${fmtMoney(b.labour)}</span></div>` : ""}
                  ${b.energy ? `<div class="recipe-costline"><span>Energy${autoEnergyPerUnit(p) != null ? ` <span class="auto-tag" title="${methodTimeSplit(p).oven} min oven × ${fmtMoney(gasCostPerHour())}/hr gas ÷ ${p.yield_qty} ${esc(p.yield_unit || "unit")}">auto</span>` : ""}</span><span>${fmtMoney(b.energy)}</span></div>` : ""}
                  ${b.packaging ? `<div class="recipe-costline"><span>Packaging</span><span>${fmtMoney(b.packaging)}</span></div>` : ""}
                  ${b.overhead ? `<div class="recipe-costline"><span>Overhead (allocated)</span><span>${fmtMoney(b.overhead)}</span></div>` : ""}
                  ${(autoLabourPerUnit(p) != null || autoEnergyPerUnit(p) != null) ? (() => {
                    const t = methodTimeSplit(p);
                    return `<div class="recipe-auto-note">From the baking method: <strong>${t.active} min</strong> hands-on, <strong>${t.oven} min</strong> oven${t.waiting ? `, ${t.waiting} min proving/cooling (costs nothing)` : ""}.</div>`;
                  })() : ""}
                </div>`;
            })()}
            <div class="recipe-total">
              <span>Full cost / unit</span><span>${fmtMoney(fullCost)}</span>
            </div>
            <div class="recipe-total">
              <span>Selling price</span><span>${fmtMoney(p.selling_price || 0)}</span>
            </div>
            <div class="recipe-total margin-${margin >= 0 ? "good" : "bad"}">
              <span>True margin</span><span>${fmtMoney(margin)} (${marginPct.toFixed(0)}%)</span>
            </div>
            ${margin < 0 ? `<p class="recipe-warn">⚠ Selling below true cost — losing ${fmtMoney(-margin)} per unit.</p>` : ""}

            ${(() => {
              const d = doughEconomics(p);
              if (d.rawWeightKg <= 0) return "";
              const sellRate = p.dough_sell_rate || 0;
              return `
                <div class="dough-panel">
                  <div class="dough-panel-head">🍞 Dough economics ${d.estimated ? '<span class="dough-est">(includes estimated piece weights)</span>' : ""}</div>
                  <div class="dough-row">
                    <span>Raw dough this recipe makes</span>
                    <strong>${d.rawWeightKg.toFixed(2)} kg</strong>
                  </div>
                  <div class="dough-row">
                    <span>Raw dough cost per kg</span>
                    <strong>${fmtMoney(d.rawCostPerKg)}/kg</strong>
                  </div>
                  ${sellRate ? `<div class="dough-row dough-sell">
                    <span>Raw dough sell value (@ ${fmtMoney(sellRate)}/kg)</span>
                    <strong>${fmtMoney(d.rawWeightKg * sellRate)}</strong>
                  </div>` : ""}
                  <div class="dough-divider"></div>
                  <div class="dough-row">
                    <span>Finished baked weight (after ${(d.lossPct * 100).toFixed(0)}% loss)</span>
                    <strong>${d.finishedWeightKg.toFixed(2)} kg</strong>
                  </div>
                  <div class="dough-row">
                    <span>Finished cost per kg</span>
                    <strong>${fmtMoney(d.finishedCostPerKg)}/kg</strong>
                  </div>
                  ${canEdit ? `<button class="btn btn-ghost btn-small dough-price-btn" data-pricing="${p.id}">💰 Pricing studio — weight &amp; price models</button>
                  <button class="btn btn-ghost btn-small dough-method-btn" data-method="${p.id}">📋 Baking method — steps, times &amp; temperature</button>
                  <button class="btn btn-ghost btn-small dough-label-btn" data-label="${p.id}">🏷 Label designer — print product labels</button>` : ""}
                </div>`;
            })()}

            <div class="recipe-calc" data-calc="${p.id}">
              <div class="recipe-calc-head">🧮 Batch calculator</div>
              ${(p.sizes && p.sizes.length) ? `
                <label class="calc-size-label">Size
                  <select class="calc-size" data-calc-size="${p.id}">
                    <option value="1">${esc(p.yield_unit)} (standard)</option>
                    ${productSizes(p).filter(sz => !sz.isStandard).map(sz => {
                      const stdW = standardUnitWeightG(p);
                      const factor = stdW > 0 ? (sz.weight_g / stdW) : 1;
                      return `<option value="${factor.toFixed(4)}">${esc(sz.name)} — ${Math.round(sz.weight_g)} g @ ${fmtMoney(sz.price)}</option>`;
                    }).join("")}
                  </select>
                </label>` : ""}
              <div class="calc-row">
                <label>Make how many? <input type="number" min="0" step="1" class="calc-qty" data-calc-qty="${p.id}" placeholder="${p.yield_qty}"></label>
                <span class="calc-or">or</span>
                <label>Batch ×<input type="number" min="0" step="0.25" class="calc-mult" data-calc-mult="${p.id}" placeholder="1"></label>
              </div>
              <div class="calc-result" data-calc-result="${p.id}">
                <p class="calc-hint">Enter a quantity or multiplier to see the ingredients you need.</p>
              </div>
              <div class="calc-max" data-calc-max="${p.id}"></div>
            </div>
          </article>
        `;
      }).join("") || `<p class="empty-state">No products yet.</p>`}
    </div>
  `;

  const mergeProdBtn = document.getElementById("mergeProdDupBtn");
  if (mergeProdBtn) mergeProdBtn.addEventListener("click", mergeDuplicateProducts);

  if (canEdit) {
    document.getElementById("addProductBtn").addEventListener("click", () => openProductForm());
    document.getElementById("genRecipeBtn").addEventListener("click", () => openRecipeGenerator());
    root.querySelectorAll("[data-edit-prod]").forEach(btn => {
      btn.addEventListener("click", () => openProductForm(productById(btn.dataset.editProd)));
    });
    root.querySelectorAll("[data-pricing]").forEach(btn => {
      btn.addEventListener("click", () => openPricingStudio(btn.dataset.pricing));
    });
    root.querySelectorAll("[data-method]").forEach(btn => {
      btn.addEventListener("click", () => openBakingMethod(btn.dataset.method));
    });
    root.querySelectorAll("[data-label]").forEach(btn => {
      btn.addEventListener("click", () => openLabelDesigner(btn.dataset.label));
    });
  }

  // ---- Batch calculators ----
  store.products.forEach(p => {
    const qtyInput = root.querySelector(`[data-calc-qty="${p.id}"]`);
    const multInput = root.querySelector(`[data-calc-mult="${p.id}"]`);
    const sizeSelect = root.querySelector(`[data-calc-size="${p.id}"]`);
    const resultEl = root.querySelector(`[data-calc-result="${p.id}"]`);
    const maxEl = root.querySelector(`[data-calc-max="${p.id}"]`);
    if (!qtyInput || !resultEl) return;

    const sizeFactor = () => sizeSelect ? Number(sizeSelect.value) || 1 : 1;

    function recalc(source) {
      const yieldQty = p.yield_qty || 1;
      const sf = sizeFactor();
      let batches = 0, loaves = 0;

      if (source === "mult") {
        const m = Number(multInput.value);
        if (multInput.value !== "" && m >= 0) { batches = m; loaves = m * yieldQty / sf; qtyInput.value = ""; }
      } else {
        const want = Number(qtyInput.value);
        if (qtyInput.value !== "" && want >= 0) { loaves = want; batches = (want * sf) / yieldQty; if (multInput) multInput.value = ""; }
      }

      if (batches <= 0) { resultEl.innerHTML = `<p class="calc-hint">Enter a quantity or multiplier to see the ingredients you need.</p>`; return; }

      const rows = (p.ingredients || []).map(ri => {
        const ing = ingredientById(ri.ingredient_id);
        if (!ing) return "";
        const need = ri.qty_required * batches;
        const short = need > (ing.stock_qty || 0);
        return `<tr class="${short ? "row-low" : ""}">
          <td>${esc(ing.name)}</td>
          <td class="num"><strong>${fmtQty(need, ing.unit)}</strong></td>
          <td class="num">${fmtQty(ing.stock_qty || 0, ing.unit)}${short ? ` <span class="status-pill status-low">short ${fmtQty(need - (ing.stock_qty||0), ing.unit)}</span>` : ""}</td>
        </tr>`;
      }).join("");

      const totalCost = (p.ingredients || []).reduce((s, ri) => {
        const ing = ingredientById(ri.ingredient_id);
        return s + (ing ? ri.qty_required * batches * ing.cost_per_unit : 0);
      }, 0);

      resultEl.innerHTML = `
        <p class="calc-summary">For <strong>${Math.round(loaves).toLocaleString()} ${esc(p.yield_unit)}${sf !== 1 && sizeSelect ? " (" + sizeSelect.options[sizeSelect.selectedIndex].text.split(" (")[0] + ")" : ""}</strong> = ${batches.toFixed(2)} batch${batches === 1 ? "" : "es"}:</p>
        <table class="recipe-ing-table calc-table">
          <thead><tr><th>Ingredient</th><th>Need</th><th>In stock</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td>Ingredient cost</td><td class="num"><strong>${fmtMoney(totalCost)}</strong></td><td></td></tr></tfoot>
        </table>`;
    }

    qtyInput.addEventListener("input", () => recalc("qty"));
    if (multInput) multInput.addEventListener("input", () => recalc("mult"));
    if (sizeSelect) sizeSelect.addEventListener("change", () => recalc(qtyInput.value !== "" ? "qty" : "mult"));

    // ---- Max loaves from current stock + limiting ingredient ----
    if (maxEl) {
      const ings = (p.ingredients || []).filter(ri => ri.qty_required > 0);
      if (ings.length) {
        let maxBatches = Infinity, limiter = null;
        ings.forEach(ri => {
          const ing = ingredientById(ri.ingredient_id);
          if (!ing) return;
          const possible = (ing.stock_qty || 0) / ri.qty_required;
          if (possible < maxBatches) { maxBatches = possible; limiter = ing; }
        });
        if (maxBatches === Infinity) maxBatches = 0;
        const maxLoaves = Math.floor(maxBatches * (p.yield_qty || 1) / sizeFactor());
        maxEl.innerHTML = `
          <div class="calc-max-inner">
            <span class="calc-max-num">${maxLoaves.toLocaleString()}</span>
            <span class="calc-max-txt">${esc(p.yield_unit)}s you can make with current stock${limiter ? ` — limited by <strong>${esc(limiter.name)}</strong>` : ""}</span>
          </div>`;
        if (sizeSelect) sizeSelect.addEventListener("change", () => {
          const ml = Math.floor(maxBatches * (p.yield_qty || 1) / sizeFactor());
          maxEl.querySelector(".calc-max-num").textContent = ml.toLocaleString();
        });
      }
    }
  });
}

function openProductForm(product) {
  // A product with an id is an existing record (edit). A product object
  // WITHOUT an id is a prefill draft (e.g. from the AI generator) — treat as new.
  const isEdit = !!(product && product.id);
  const prefill = product && !product.id ? product : null;
  const src = product || null;
  const rows = (src && src.ingredients) ? src.ingredients.slice() : [];

  const sizeRows = src && src.sizes ? src.sizes.slice() : [];
  const stdW = src ? standardUnitWeightG(src) : 0;
  const renderSizeRows = () => sizeRows.map((sz, idx) => {
    // Old sizes stored a dough_factor — show the price/weight it implies.
    const factor = sz.dough_factor || 1;
    const price = sz.price != null ? sz.price : ((src && src.selling_price || 0) * factor);
    const weight = sz.weight_g != null ? sz.weight_g : Math.round(stdW * factor);
    return `
    <div class="ing-row size-row" data-sidx="${idx}">
      <input type="text" class="size-row-name" value="${esc(sz.name || "")}" placeholder="e.g. GHS 5 loaf">
      <input type="number" class="size-row-price" step="0.5" min="0" value="${price || ""}" placeholder="price">
      <input type="number" class="size-row-weight" step="10" min="0" value="${weight ? Math.round(weight) : ""}" placeholder="grams">
      <span class="size-row-stock" title="Stock is set by Manufacturing">${Number(sz.stock) || 0} in stock</span>
      <button type="button" class="btn btn-ghost btn-small size-row-remove">✕</button>
    </div>`;
  }).join("");

  const renderRows = () => rows.map((r, idx) => {
    const ing = ingredientById(r.ingredient_id);
    const baseUnit = ing ? ing.unit : "";
    // Compatible units the user can enter in (converted to base unit on save)
    const unitOptions = { kg: ["kg", "g"], g: ["g", "kg"], L: ["L", "ml"], ml: ["ml", "L"], pcs: ["pcs"] }[baseUnit] || [baseUnit];
    const chosenUnit = r.qty_unit || baseUnit;
    return `
      <div class="ing-row" data-idx="${idx}">
        <select class="ing-row-select">
          ${store.ingredients.map(i => `<option value="${i.id}" ${ing && ing.id === i.id ? "selected" : ""}>${esc(i.name)}</option>`).join("")}
        </select>
        <input type="number" class="ing-row-qty" step="0.01" min="0" value="${r.qty_display != null ? r.qty_display : r.qty_required}" placeholder="Qty">
        <select class="ing-row-unit">
          ${unitOptions.map(u => `<option value="${u}" ${chosenUnit === u ? "selected" : ""}>${u}</option>`).join("")}
        </select>
        <button type="button" class="btn btn-ghost btn-small ing-row-remove">✕</button>
      </div>
    `;
  }).join("");

  openModal(`
    <h3>${isEdit ? "Edit" : "Add"} product</h3>
    <form id="prodForm" class="modal-form">
      <label>Name <input type="text" id="prodName" value="${src ? esc(src.name || "") : ""}" required></label>
      <label>Description <input type="text" id="prodDesc" value="${src ? esc(src.description || "") : ""}"></label>
      <div class="form-row-2">
        <label>Yield quantity <input type="number" step="0.01" min="0.01" id="prodYieldQty" value="${src ? src.yield_qty : "1"}" required></label>
        <label>Yield unit <input type="text" id="prodYieldUnit" value="${src ? esc(src.yield_unit || "loaf") : "loaf"}" required></label>
      </div>
      <div class="form-row-2">
        <label>Selling price (GHS) <input type="number" step="0.01" min="0" id="prodPrice" value="${src ? src.selling_price : ""}" required></label>
        ${src
          ? `<label>Finished stock on hand <input type="number" id="prodStock" value="${productTotalStock(src)}" readonly style="background:#f0ede6;color:var(--char-soft);cursor:not-allowed;"><span style="font-size:0.72rem;color:var(--char-soft);">Managed by Manufacturing &amp; Sales${(src.sizes || []).filter(s => s && s.name).length ? " — counted per size" : ""}. Record a bake to add stock.</span></label>`
          : `<label>Starting finished stock <input type="number" step="0.01" min="0" id="prodStock" value="0"><span style="font-size:0.72rem;color:var(--char-soft);">Usually 0 — you'll add stock by recording production.</span></label>`}
      </div>

      <div class="ing-editor" style="margin-top:4px;">
        <div class="ing-editor-head"><span>Other costs per ${isEdit ? esc(product.yield_unit || "unit") : "unit"} (for true profit)</span></div>
        <div class="form-row-2">
          <label>Labour cost <input type="number" step="0.01" min="0" id="prodLabour" value="${src ? (src.labour_cost_per_unit || 0) : "0"}" placeholder="baker's time">${(src && autoLabourPerUnit(src) != null) ? `<span class="auto-override">Auto-costed at ${fmtMoney(autoLabourPerUnit(src))} — this box is ignored</span>` : ""}</label>
          <label>Energy cost <input type="number" step="0.01" min="0" id="prodEnergy" value="${src ? (src.energy_cost_per_unit || 0) : "0"}" placeholder="oven gas/electric">${(src && autoEnergyPerUnit(src) != null) ? `<span class="auto-override">Auto-costed at ${fmtMoney(autoEnergyPerUnit(src))} — this box is ignored</span>` : ""}</label>
        </div>
        <div class="form-row-2">
          <label>Packaging cost <input type="number" step="0.01" min="0" id="prodPackaging" value="${src ? (src.packaging_cost_per_unit || 0) : "0"}" placeholder="box/bag/label"></label>
          <span></span>
        </div>
        <p class="modal-hint">Rent, admin and delivery are added automatically as overhead — set the monthly figure in Settings.</p>
      </div>

      <div class="cost-section">
        <p class="cost-section-title">🍞 Dough (optional)</p>
        <div class="form-row-2">
          <label>Raw dough sell rate (GHS/kg) <input type="number" step="0.01" min="0" id="prodDoughRate" value="${src ? (src.dough_sell_rate || "") : ""}" placeholder="e.g. 2 — if you sell dough by weight"></label>
          <label>Baking loss % (blank = auto by type) <input type="number" step="1" min="0" max="60" id="prodBakingLoss" value="${src ? (src.baking_loss_pct != null ? src.baking_loss_pct : "") : ""}" placeholder="auto"></label>
        </div>
        <p class="modal-hint">The system works out raw dough weight, cost/kg, finished baked weight and finished cost/kg automatically. Fill baking loss % only if you know your exact figure.</p>
      </div>

      <div class="ing-editor" style="margin-top:4px;">
        <div class="ing-editor-head">
          <span>Sizes from the same dough (optional)</span>
          <button type="button" class="btn btn-ghost btn-small" id="addSizeRowBtn">+ Add size</button>
        </div>
        <div id="sizeRows">${renderSizeRows()}</div>
        <p class="modal-hint">One dough, several priced loaves — e.g. <strong>GHS 5 loaf / 300 g</strong> and <strong>GHS 10 loaf / 600 g</strong>. Each size gets its own button and its own stock at the Point of Sale. ${src && stdW ? `This batch makes <strong>${(doughEconomics(src).finishedWeightKg).toFixed(2)} kg</strong> baked — so a 300 g loaf yields about <strong>${Math.floor(doughEconomics(src).finishedWeightKg * 1000 / 300)}</strong> per batch. Leave empty to sell one standard ${esc(src.yield_unit || "unit")} at ${fmtMoney(src.selling_price || 0)}.` : "Leave empty to sell one standard size at the selling price above."}</p>
      </div>

      <div class="ing-editor">
        <div class="ing-editor-head">
          <span>Ingredients per batch</span>
          <button type="button" class="btn btn-ghost btn-small" id="addIngRowBtn">+ Add ingredient</button>
        </div>
        <div id="ingRows">${renderRows()}</div>
      </div>

      <div class="modal-actions">
        ${isEdit ? `<button type="button" class="btn btn-ghost" id="prodDeleteBtn">Delete</button>` : "<span></span>"}
        <div>
          <button type="button" class="btn btn-ghost" id="prodCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save" : "Add"}</button>
        </div>
      </div>
    </form>
  `);

  // Read current DOM values back into rows[] so re-renders don't lose edits
  function syncRowsFromDOM() {
    document.querySelectorAll("#ingRows .ing-row").forEach(rowEl => {
      const idx = Number(rowEl.dataset.idx);
      if (isNaN(idx) || !rows[idx]) return;
      const sel = rowEl.querySelector(".ing-row-select");
      const qtyEl = rowEl.querySelector(".ing-row-qty");
      const unitEl = rowEl.querySelector(".ing-row-unit");
      if (sel) rows[idx].ingredient_id = sel.value;
      if (qtyEl) rows[idx].qty_display = Number(qtyEl.value) || 0;
      if (unitEl) rows[idx].qty_unit = unitEl.value;
    });
  }

  function bindRowRemovers() {
    document.querySelectorAll(".ing-row-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        syncRowsFromDOM();
        const idx = Number(btn.closest(".ing-row").dataset.idx);
        rows.splice(idx, 1);
        document.getElementById("ingRows").innerHTML = renderRows();
        bindRowRemovers();
      });
    });
    // When the ingredient changes, refresh the unit options to match its base unit
    document.querySelectorAll(".ing-row-select").forEach(sel => {
      sel.addEventListener("change", () => {
        syncRowsFromDOM();
        const idx = Number(sel.closest(".ing-row").dataset.idx);
        if (rows[idx]) { rows[idx].qty_unit = null; } // reset to new ingredient's base unit
        document.getElementById("ingRows").innerHTML = renderRows();
        bindRowRemovers();
      });
    });
  }
  bindRowRemovers();

  document.getElementById("addIngRowBtn").addEventListener("click", () => {
    if (!store.ingredients.length) { showToast("Add an ingredient in Inventory first.", true); return; }
    syncRowsFromDOM();
    rows.push({ ingredient_id: store.ingredients[0].id, qty_required: 0 });
    document.getElementById("ingRows").innerHTML = renderRows();
    bindRowRemovers();
  });

  function bindSizeRemovers() {
    document.querySelectorAll(".size-row-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.closest(".size-row").dataset.sidx);
        sizeRows.splice(idx, 1);
        document.getElementById("sizeRows").innerHTML = renderSizeRows();
        bindSizeRemovers();
      });
    });
  }
  bindSizeRemovers();
  document.getElementById("addSizeRowBtn").addEventListener("click", () => {
    sizeRows.push({ name: "", price: 0, weight_g: 0, stock: 0 });
    document.getElementById("sizeRows").innerHTML = renderSizeRows();
    bindSizeRemovers();
  });

  document.getElementById("prodCancelBtn").addEventListener("click", closeModal);
  if (isEdit) {
    document.getElementById("prodDeleteBtn").addEventListener("click", async () => {
      if (!confirm(`Delete ${product.name}? This can't be undone.`)) return;
      try {
        await deleteDoc("products", product.id);
        closeModal();
        showToast("Product deleted.");
      } catch (err) {
        console.error("Delete failed:", err);
        showToast("Could not delete — check your permissions and try again.", true);
      }
    });
  }

  document.getElementById("prodForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    // read current row values from the DOM before saving.
    // NOTE: use :not(.size-row) — size rows also carry the .ing-row class,
    // and reading .ing-row-select from them returns null and crashes the save.
    const liveRows = [...document.querySelectorAll(".ing-row:not(.size-row)")]
      .map(rowEl => {
        const sel = rowEl.querySelector(".ing-row-select");
        const qtyEl = rowEl.querySelector(".ing-row-qty");
        const unitEl = rowEl.querySelector(".ing-row-unit");
        if (!sel || !qtyEl) return null;
        const ing = ingredientById(sel.value);
        const baseUnit = ing ? ing.unit : "";
        const chosenUnit = unitEl ? unitEl.value : baseUnit;
        const typed = Number(qtyEl.value) || 0;
        // Convert what the user typed (in chosenUnit) to the ingredient's base unit
        const CONVERT = { "g->kg": 0.001, "kg->g": 1000, "ml->L": 0.001, "L->ml": 1000 };
        const factor = CONVERT[chosenUnit + "->" + baseUnit] || 1;
        const qtyInBase = typed * factor;
        return { ingredient_id: sel.value, qty_required: qtyInBase, qty_unit: chosenUnit, qty_display: typed };
      })
      .filter(r => r && r.ingredient_id);

    const data = {
      name: document.getElementById("prodName").value.trim(),
      description: document.getElementById("prodDesc").value.trim(),
      yield_qty: Number(document.getElementById("prodYieldQty").value),
      yield_unit: document.getElementById("prodYieldUnit").value.trim(),
      selling_price: Number(document.getElementById("prodPrice").value),
      sizes: [...document.querySelectorAll(".size-row")].map(el => {
        const name = el.querySelector(".size-row-name").value.trim();
        // Stock belongs to Manufacturing — never let the recipe form reset it.
        // Match on name so it survives rows being added or reordered.
        const prior = ((src && src.sizes) || []).find(s =>
          (s.name || "").trim().toLowerCase() === name.toLowerCase());
        return {
          name,
          price: Number(el.querySelector(".size-row-price").value) || 0,
          weight_g: Number(el.querySelector(".size-row-weight").value) || 0,
          stock: prior ? (Number(prior.stock) || 0) : 0
        };
      }).filter(sz => sz.name),
      labour_cost_per_unit: Number(document.getElementById("prodLabour").value || 0),
      energy_cost_per_unit: Number(document.getElementById("prodEnergy").value || 0),
      packaging_cost_per_unit: Number(document.getElementById("prodPackaging").value || 0),
      dough_sell_rate: Number(document.getElementById("prodDoughRate").value || 0),
      baking_loss_pct: document.getElementById("prodBakingLoss").value === "" ? null : Number(document.getElementById("prodBakingLoss").value),
      ingredients: liveRows
    };
    // Finished stock is managed by Manufacturing (production) and the POS (sales).
    // Only set it when CREATING a product — never overwrite the live value on edit,
    // otherwise editing a recipe would wipe out stock you've baked.
    if (!isEdit) {
      data.finished_stock_qty = Number(document.getElementById("prodStock").value) || 0;
    }
    if (src && src.method) data.method = src.method;
    if (src && src.tier) data.tier = src.tier;
    if (!data.name) { showToast("Please enter a product name.", true); return; }

    // The yield unit is a word ("loaf", "cake", "pack"), not a number — the
    // quantity goes in the field beside it. A number here reads as "40 12.5(s)".
    if (/^[\d.,\s]+$/.test(data.yield_unit || "")) {
      showToast(`"${data.yield_unit}" looks like a number. The yield unit should be a word — e.g. "loaf". The quantity per batch goes in "Yield quantity".`, true);
      return;
    }

    // Size names must be unique: stock, POS buttons and waste all match by name,
    // so two sizes called the same thing would share one stock count and the
    // second would silently never sell down.
    const sizeNames = (data.sizes || []).map(sz => sz.name.trim().toLowerCase());
    const dupeName = sizeNames.find((n, i) => sizeNames.indexOf(n) !== i);
    if (dupeName) {
      showToast(`Two sizes are both called "${dupeName}". Give each size its own name — stock is tracked by name.`, true);
      return;
    }
    // A size with no weight can't be baked (production scales by weight).
    const noWeight = (data.sizes || []).filter(sz => !(sz.weight_g > 0)).map(sz => sz.name);
    if (noWeight.length) {
      showToast(`Set a weight in grams for: ${noWeight.join(", ")}. Production and costing both scale by weight.`, true);
      return;
    }
    const noPrice = (data.sizes || []).filter(sz => !(sz.price > 0)).map(sz => sz.name);
    if (noPrice.length) {
      showToast(`Set a price for: ${noPrice.join(", ")}.`, true);
      return;
    }

    try {
      if (isEdit) await setDoc("products", product.id, data);
      else await addDoc("products", data);
      closeModal();
      showToast(isEdit ? "Product updated." : "Product added.");
    } catch (err) {
      console.error("Recipe save failed:", err);
      showToast("Could not save the recipe — check your permissions and try again.", true);
    }
  });
}


/* Merge duplicate products/recipes (same name). Keeps the first record, sums any
   finished stock into it, and deletes the extras. Master/admin only.
   Recipes are definitions, so we keep one definition rather than combining them. */
async function mergeDuplicateProducts() {
  if (!["master", "admin"].includes(currentStaff.role)) {
    showToast("Only an admin can merge duplicates.", true);
    return;
  }
  const groups = {};
  store.products.forEach(p => {
    const key = (p.name || "").trim().toLowerCase();
    (groups[key] = groups[key] || []).push(p);
  });
  const dupGroups = Object.values(groups).filter(g => g.length > 1);
  if (!dupGroups.length) { showToast("No duplicate products found."); return; }

  const totalExtras = dupGroups.reduce((s, g) => s + (g.length - 1), 0);
  if (!confirm(`Found ${dupGroups.length} duplicated product${dupGroups.length > 1 ? "s" : ""} (${totalExtras} extra record${totalExtras > 1 ? "s" : ""}).\n\nMerge them? One copy of each recipe is kept (any finished stock is added together) and the duplicates removed. This cannot be undone.`)) return;

  try {
    let merged = 0;
    for (const group of dupGroups) {
      const keep = group[0];
      const extras = group.slice(1);
      // Sum the standard stock, and sum each size's stock by name, so merging
      // duplicates never loses baked goods.
      const summedStock = group.reduce((s, p) => s + (p.finished_stock_qty || 0), 0);
      const patch = { finished_stock_qty: summedStock };
      const keepSizes = (keep.sizes || []).filter(sz => sz && sz.name);
      if (keepSizes.length) {
        patch.sizes = keepSizes.map(sz => {
          const total = group.reduce((s, p) => {
            const match = (p.sizes || []).find(x =>
              (x.name || "").trim().toLowerCase() === (sz.name || "").trim().toLowerCase());
            return s + (match ? (Number(match.stock) || 0) : 0);
          }, 0);
          return { ...sz, stock: total };
        });
      }
      await db.collection("products").doc(keep.id).update(patch);
      for (const ex of extras) {
        await db.collection("products").doc(ex.id).delete();
        merged++;
      }
    }
    showToast(`Merged and removed ${merged} duplicate product${merged > 1 ? "s" : ""}.`);
  } catch (err) {
    console.error(err);
    showToast("Could not merge duplicates — check permissions and try again.", true);
  }
}

/* ============================================================
   BUSINESS DYNAMICS SUMMARY (top of Recipes page)
   Three views: (1) every product ranked by profit/loss,
   (2) what current inventory can produce and its profit,
   (3) real profit from actual sales (last 30 days).
   ============================================================ */
function businessDynamicsPanel() {
  const products = store.products || [];
  if (!products.length) return "";

  // ---- View 1: profit/loss per SIZE (each priced loaf stands on its own) ----
  const rows = products.flatMap(p => productSizes(p).map(sz => {
    const fullCost = sizeFullCost(p, sz);
    const price = sz.price || 0;
    const margin = price - fullCost;
    return {
      p, sz,
      label: p.name + (sz.isStandard ? "" : " — " + sz.name),
      fullCost, price, margin,
      marginPct: price ? (margin / price * 100) : 0
    };
  }));
  const profitable = rows.filter(r => r.margin > 0).sort((a, b) => b.margin - a.margin);
  const losing = rows.filter(r => r.margin < 0).sort((a, b) => a.margin - b.margin);

  // ---- View 2: what can we produce NOW from current stock, and its profit ----
  // How many full batches will the ingredients on hand support?
  const batchesPossible = (p) => {
    const ings = (p.ingredients || []).filter(ri => ri.qty_required > 0);
    if (!ings.length) return 0;
    let maxBatches = Infinity;
    ings.forEach(ri => {
      const ing = ingredientById(ri.ingredient_id);
      const canDo = ing ? (ing.stock_qty || 0) / ri.qty_required : 0;
      if (canDo < maxBatches) maxBatches = canDo;
    });
    return isFinite(maxBatches) ? maxBatches : 0;
  };
  // One dough can only be baked ONCE. If a recipe has three sizes we must not
  // count all three — that would claim the same flour three times over. So take
  // the best-earning size per recipe as the realistic plan.
  const bestPerProduct = {};
  rows.forEach(r => {
    const perBatch = r.sz.isStandard ? (r.p.yield_qty || 0) : sizeUnitsPerBatch(r.p, r.sz);
    const units = Math.floor(batchesPossible(r.p) * perBatch);
    if (units <= 0) return;
    const profit = units * r.margin;
    const cur = bestPerProduct[r.p.id];
    if (!cur || profit > cur.profit) {
      bestPerProduct[r.p.id] = { name: r.label, units, profit, margin: r.margin, alts: 0 };
    }
  });
  // Note how many other sizes each recipe could have been baked as instead.
  rows.forEach(r => { if (bestPerProduct[r.p.id]) bestPerProduct[r.p.id].alts++; });

  let producibleProfit = 0, producibleUnits = 0;
  const producible = Object.values(bestPerProduct).sort((a, b) => b.profit - a.profit);
  producible.forEach(x => { producibleProfit += x.profit; producibleUnits += x.units; });

  // ---- View 3: REAL profit from actual sales (last 30 days) ----
  const cutoff = new Date(Date.now() - 30 * 86400000);
  let realRevenue = 0, realCost = 0, realUnits = 0;
  (store.sales || []).forEach(sl => {
    if (new Date(sl.timestamp) < cutoff) return;
    (sl.items || []).forEach(it => {
      realRevenue += (it.unit_price || 0) * (it.qty || 0);
      realCost += (it.unit_cost || 0) * (it.qty || 0);
      realUnits += (it.qty || 0);
    });
  });
  const realProfit = realRevenue - realCost;
  const realMarginPct = realRevenue ? (realProfit / realRevenue * 100) : 0;

  return `
    <div class="biz-dynamics">
      <div class="biz-head">📊 Business dynamics</div>
      <div class="biz-grid">

        <div class="biz-card">
          <div class="biz-card-title">Profit per unit</div>
          <div class="biz-stat biz-good">${profitable.length} making profit</div>
          <div class="biz-stat ${losing.length ? "biz-bad" : ""}">${losing.length} selling at a loss</div>
          ${losing.length ? `<div class="biz-detail">⚠ Losing money on: ${losing.slice(0, 3).map(r => esc(r.label)).join(", ")}${losing.length > 3 ? "…" : ""}</div>` : `<div class="biz-detail">✓ Every product is priced above cost.</div>`}
          ${profitable.length ? `<div class="biz-detail">Best margin: <strong>${esc(profitable[0].label)}</strong> at ${fmtMoney(profitable[0].margin)}/unit (${profitable[0].marginPct.toFixed(0)}%)</div>` : ""}
        </div>

        <div class="biz-card">
          <div class="biz-card-title">Producible from current stock</div>
          <div class="biz-stat">${producibleUnits.toLocaleString()} units</div>
          <div class="biz-stat ${producibleProfit >= 0 ? "biz-good" : "biz-bad"}">${fmtMoney(producibleProfit)} potential profit</div>
          ${producible.length
            ? `<div class="biz-detail">Best to bake now: <strong>${esc(producible[0].name)}</strong> (${producible[0].units} units, ${fmtMoney(producible[0].profit)})</div>
               <div class="biz-detail" style="font-size:0.72rem;opacity:0.75;">Assumes the best-earning size per recipe, and that each recipe gets the ingredients it needs — you can't bake every recipe to its maximum at once.</div>`
            : `<div class="biz-detail">Add ingredient stock to see what you can produce.</div>`}
        </div>

        <div class="biz-card">
          <div class="biz-card-title">Real profit — last 30 days</div>
          <div class="biz-stat">${fmtMoney(realRevenue)} sales</div>
          <div class="biz-stat ${realProfit >= 0 ? "biz-good" : "biz-bad"}">${fmtMoney(realProfit)} profit (${realMarginPct.toFixed(0)}%)</div>
          <div class="biz-detail">${realUnits.toLocaleString()} units sold · cost of goods ${fmtMoney(realCost)}</div>
          ${realUnits === 0 ? `<div class="biz-detail">No sales recorded in the last 30 days yet.</div>` : ""}
        </div>

      </div>
    </div>
  `;
}
