/* ============================================================
   Inventory — raw ingredients (top-notch edition)
   Supplier links · stock value · movement log · days-left
   forecasting · one-click reorder · search · export
   ============================================================ */

let invSearch = "";
let invLowOnly = false;

function ingredientUsageLast30(ingredientId) {
  // Estimated usage from the production log over the last 30 days
  const cutoff = new Date(Date.now() - 30 * 86400000);
  let used = 0;
  store.production_log.forEach(entry => {
    if (new Date(entry.timestamp) < cutoff) return;
    const product = productById(entry.product_id);
    if (!product || !product.ingredients) return;
    const ri = product.ingredients.find(x => x.ingredient_id === ingredientId);
    if (ri) used += ri.qty_required * (entry.qty_baked / (product.yield_qty || 1));
  });
  return used;
}

let inventoryTab = "stock";

function renderInventory(root) {
  root = root || document.getElementById("moduleContent");
  const soon = (typeof expiringBatches === "function") ? expiringBatches(7) : [];
  const expiredCount = soon.filter(b => b.expired).length;
  const low = store.ingredients.filter(i => (i.stock_qty || 0) <= (i.reorder_level || 0) && (i.reorder_level || 0) > 0).length;

  const tabs = [
    { key: "stock", label: "Stock" },
    { key: "suppliers", label: "Suppliers" + (store.suppliers.length ? ` (${store.suppliers.length})` : "") },
    { key: "expiry", label: "Batch Expiry" + (soon.length ? ` (${soon.length})` : "") },
    { key: "reorder", label: "Reorder List" + (low ? ` (${low})` : "") },
    { key: "stocktake", label: "Stock Take" },
    { key: "costs", label: "Cost History" }
  ];

  root.innerHTML = `
    <div class="inv-tabs">
      ${tabs.map(t => `<button class="inv-tab ${inventoryTab === t.key ? "is-active" : ""}" data-inv-tab="${t.key}">${t.label}</button>`).join("")}
    </div>
    <div id="invTabContent"></div>
  `;
  root.querySelectorAll("[data-inv-tab]").forEach(btn => {
    btn.addEventListener("click", () => { inventoryTab = btn.dataset.invTab; renderInventory(root); });
  });

  const content = document.getElementById("invTabContent");
  if (inventoryTab === "stock") renderInventoryStock(content);
  else if (inventoryTab === "suppliers") renderSupplierDirectory(content);
  else if (inventoryTab === "expiry") renderBatchExpiry(content);
  else if (inventoryTab === "reorder") renderReorderList(content);
  else if (inventoryTab === "stocktake") renderStockTake(content);
  else if (inventoryTab === "costs") renderIngredientCostHistory(content);
}

function renderInventoryStock(root) {
  const canEdit = ["master", "admin", "manager", "baker", "production_manager"].includes(currentStaff.role);

  let rows = store.ingredients.map(ing => {
    const low = ing.stock_qty <= ing.reorder_level;
    const value = (ing.stock_qty || 0) * (ing.cost_per_unit || 0);
    const used30 = ingredientUsageLast30(ing.id);
    const daysLeft = used30 > 0 ? (ing.stock_qty / (used30 / 30)) : null;
    return { ...ing, low, value, daysLeft };
  });

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const lowCount = rows.filter(r => r.low).length;
  const critical = rows.filter(r => r.daysLeft !== null && r.daysLeft < 7).length;

  // Detect duplicate ingredient names (case-insensitive) so they can be merged
  const nameCounts = {};
  store.ingredients.forEach(i => {
    const key = (i.name || "").trim().toLowerCase();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  });
  const dupCount = Object.values(nameCounts).filter(c => c > 1).length;
  const canManage = ["master", "admin"].includes(currentStaff.role);

  if (invSearch) {
    const q = invSearch.toLowerCase();
    rows = rows.filter(r => (r.name || "").toLowerCase().includes(q) || (r.supplier_name || "").toLowerCase().includes(q));
  }
  if (invLowOnly) rows = rows.filter(r => r.low);
  rows.sort((a, b) => (a.low === b.low) ? a.name.localeCompare(b.name) : (a.low ? -1 : 1));

  const headers = ["Ingredient", "Supplier", "Pack price", "Pack size", "Stock", "Value", "Cost/unit", "Reorder level", "Date added", "Status"];
  const exportRows = rows.map(r => [
    r.name, r.supplier_name || "", r.pack_price || "", r.pack_size ? `${r.pack_size} ${r.unit}` : "",
    `${r.stock_qty} ${r.unit}`, r.value.toFixed(2),
    r.cost_per_unit, `${r.reorder_level} ${r.unit}`,
    r.created_at ? fmtDateTime(r.created_at) : (r.updated_at ? fmtDateTime(r.updated_at) : ""),
    r.low ? "LOW" : "OK"
  ]);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Inventory</h2>
        <p class="panel-sub">Raw ingredient stock. Levels update automatically from production, purchase orders, and adjustments.</p>
      </div>
      <div>
        <button class="btn btn-ghost btn-small" id="invXls">Export Excel</button>
        <button class="btn btn-ghost btn-small" id="invPdf">Export PDF</button>
        ${canManage && dupCount > 0 ? `<button class="btn btn-ghost" id="mergeDupBtn" style="color:var(--oven);">Merge ${dupCount} duplicate${dupCount > 1 ? "s" : ""}</button>` : ""}
        ${canEdit ? `<button class="btn btn-ghost" id="adjustStockBtn">Adjust stock</button>
        <button class="btn btn-primary" id="addIngredientBtn">Add ingredient</button>` : ""}
      </div>
    </div>

    <div class="kpi-grid" style="margin-bottom:20px;">
      <div class="kpi-card"><span class="kpi-label">Inventory value</span><span class="kpi-value">${fmtMoney(totalValue)}</span><span class="kpi-sub">${store.ingredients.length} ingredients</span></div>
      <div class="kpi-card ${lowCount ? "kpi-bad" : ""}"><span class="kpi-label">Below reorder level</span><span class="kpi-value">${lowCount}</span></div>
      <div class="kpi-card ${critical ? "kpi-bad" : ""}"><span class="kpi-label">Under 7 days of stock</span><span class="kpi-value">${critical}</span><span class="kpi-sub">based on last 30 days' baking</span></div>
    </div>

    <div class="inv-toolbar">
      <input type="search" id="invSearch" placeholder="Search ingredient or supplier…" value="${esc(invSearch)}">
      <label class="checkbox-label" style="margin:0;"><input type="checkbox" id="invLowOnly" ${invLowOnly ? "checked" : ""}> Low stock only</label>
    </div>

    <div class="table-wrap">
      <table class="ledger-table">
        <thead>
          <tr><th>Ingredient</th><th>Supplier</th><th>Pack price</th><th>Stock on hand</th><th>Value</th><th>Cost/unit</th><th>Reorder level</th><th>Added</th><th>Status</th>${canEdit ? "<th></th>" : ""}</tr>
        </thead>
        <tbody>
          ${rows.map(ing => {
            const cpu = ing.cost_per_unit || 0;
            // For tiny per-unit costs (e.g. ml or g), 2 decimals rounds to 0.00 —
            // show enough decimals to be meaningful.
            const cpuStr = cpu > 0 && cpu < 0.1
              ? "GHS " + cpu.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })
              : fmtMoney(cpu);
            const costDisplay = cpuStr + "/" + (ing.unit || "unit");
            return `
              <tr class="${ing.low ? "row-low" : ""}">
                <td><strong>${esc(ing.name)}</strong></td>
                <td>${esc(ing.supplier_name || "—")}</td>
                <td class="num">${ing.pack_price ? fmtMoney(ing.pack_price) + " / " + fmtQty(ing.pack_size, ing.unit) : "—"}</td>
                <td class="num">${(() => {
                  const size = ing.pack_size || 0;
                  const pName = ing.pack_name || "";
                  if (size > 0 && pName) {
                    const fullPacks = Math.floor((ing.stock_qty || 0) / size);
                    const loose = (ing.stock_qty || 0) - fullPacks * size;
                    return `<strong>${fullPacks} ${esc(pName)}${fullPacks !== 1 ? "s" : ""}</strong>${loose > 0.001 ? " + " + fmtQty(Math.round(loose * 100) / 100, ing.unit) : ""}<br><small style="color:var(--char-soft);">${fmtQty(ing.stock_qty, ing.unit)}</small>`;
                  }
                  return fmtQty(ing.stock_qty, ing.unit);
                })()}</td>
                <td class="num">${fmtMoney(ing.value)}</td>
                <td class="num">${costDisplay}</td>
                <td class="num">${fmtQty(ing.reorder_level, ing.unit)}</td>
                <td class="num" style="font-size:0.8rem;">${ing.created_at ? fmtDateTime(ing.created_at) : (ing.updated_at ? fmtDateTime(ing.updated_at) : "—")}</td>
                <td>${ing.low ? '<span class="status-pill status-low">Low stock</span>' : '<span class="status-pill status-ok">OK</span>'}</td>
                ${canEdit ? `<td>
                  ${ing.low ? `<button class="btn btn-ghost btn-small" data-reorder-ing="${ing.id}">Reorder</button>` : ""}
                  <button class="btn btn-ghost btn-small" data-edit-ing="${ing.id}">Edit</button>
                </td>` : ""}
              </tr>
            `;
          }).join("") || `<tr><td colspan="${canEdit ? 10 : 9}" class="empty-state">${invSearch || invLowOnly ? "Nothing matches your filter." : "No ingredients yet."}</td></tr>`}
        </tbody>
        ${rows.length ? `<tfoot><tr><td colspan="4">Total value shown</td><td class="num">${fmtMoney(rows.reduce((s, r) => s + r.value, 0))}</td><td colspan="${canEdit ? 5 : 4}"></td></tr></tfoot>` : ""}
      </table>
    </div>

    <h3 class="dash-col-title" style="margin-top:30px;">Recent stock movements</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>When</th><th>Ingredient</th><th>Change</th><th>Reason</th><th>By</th><th>Notes</th></tr></thead>
        <tbody>
          ${[...store.stock_movements].sort((a,b) => (b.created_at||"").localeCompare(a.created_at||"")).slice(0, 15).map(m => `
            <tr>
              <td class="num">${fmtDateTime(m.created_at)}</td>
              <td>${esc(m.ingredient_name)}</td>
              <td class="num" style="color:${m.change >= 0 ? "var(--herb)" : "var(--oven)"};"><strong>${m.change >= 0 ? "+" : ""}${fmtQty(m.change, m.unit || "")}</strong></td>
              <td>${esc(m.reason || "")}</td>
              <td>${esc(m.by || "")}</td>
              <td>${esc(m.notes || "")}</td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="empty-state">No movements logged yet — they'll appear as you bake, receive orders, and adjust stock.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("invSearch").addEventListener("input", debounce((e) => {
    invSearch = e.target.value; renderInventory(root);
    setTimeout(() => { const el = document.getElementById("invSearch"); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0);
  }, 250));
  document.getElementById("invLowOnly").addEventListener("change", (e) => { invLowOnly = e.target.checked; renderInventory(root); });
  document.getElementById("invXls").addEventListener("click", () => exportRowsToExcel("Inventory", headers, exportRows));
  document.getElementById("invPdf").addEventListener("click", () => exportRowsToPDF("Inventory", headers, exportRows));

  const mergeBtn = document.getElementById("mergeDupBtn");
  if (mergeBtn) mergeBtn.addEventListener("click", mergeDuplicateIngredients);

  if (canEdit) {
    document.getElementById("addIngredientBtn").addEventListener("click", () => openIngredientForm());
    document.getElementById("adjustStockBtn").addEventListener("click", openStockAdjustForm);
    root.querySelectorAll("[data-edit-ing]").forEach(btn => {
      btn.addEventListener("click", () => openIngredientForm(ingredientById(btn.dataset.editIng)));
    });
    root.querySelectorAll("[data-reorder-ing]").forEach(btn => {
      btn.addEventListener("click", () => openPOForm(btn.dataset.reorderIng));
    });
  }
}

function openIngredientForm(ing) {
  const isEdit = !!ing;
  openModal(`
    <h3>${isEdit ? "Edit" : "Add"} ingredient</h3>
    <form id="ingForm" class="modal-form">
      <label>Name <input type="text" id="ingName" value="${isEdit ? esc(ing.name) : ""}" required></label>
      <div class="form-row-2">
        <label>Unit
          <select id="ingUnit">
            <option value="kg" ${isEdit && ing.unit === "kg" ? "selected" : ""}>kilograms (kg)</option>
            <option value="g" ${isEdit && ing.unit === "g" ? "selected" : ""}>grams (g)</option>
            <option value="L" ${isEdit && ing.unit === "L" ? "selected" : ""}>litres (L)</option>
            <option value="ml" ${isEdit && ing.unit === "ml" ? "selected" : ""}>millilitres (ml)</option>
            <option value="pcs" ${isEdit && ing.unit === "pcs" ? "selected" : ""}>pieces (pcs)</option>
          </select>
          <span style="font-size:0.72rem;color:var(--char-soft);">Tip: use L for liquids and kg for solids — costs stay readable (ml/g make per-unit cost very tiny).</span>
        </label>
        <label>Supplier
          <select id="ingSupplier">
            <option value="">— None / market —</option>
            ${store.suppliers.map(su => `<option value="${su.id}" ${isEdit && ing.supplier_id === su.id ? "selected" : ""}>${esc(su.name)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="pack-cost-box">
        <p class="pack-cost-label">How you buy it — a pack/bag, its price, and how much it holds</p>
        <div class="form-row-2">
          <label>Pack name <input type="text" id="ingPackName" value="${isEdit ? esc(ing.pack_name || "bag") : "bag"}" placeholder="e.g. bag, sack, carton"></label>
          <label>Pack price (GHS) <input type="number" step="0.01" min="0" id="ingPackPrice" value="${isEdit ? (ing.pack_price || (ing.cost_per_unit && ing.pack_size ? ing.cost_per_unit * ing.pack_size : "")) : ""}" placeholder="e.g. 670" required></label>
        </div>
        <label>Pack size — how much one pack holds (in the unit above) <input type="number" step="0.01" min="0.01" id="ingPackSize" value="${isEdit ? (ing.pack_size || 1) : ""}" placeholder="e.g. 50" required></label>
        <p class="pack-cost-result" id="packCostResult">Cost per unit will be calculated automatically.</p>
      </div>
      <div class="pack-cost-box" style="background:rgba(8,48,13,0.04);border-color:var(--line);">
        <p class="pack-cost-label">Stock on hand — count in packs, plus any loose amount</p>
        <div class="form-row-2">
          <label>Whole packs <input type="number" step="1" min="0" id="ingStockPacks" value="${isEdit ? (ing.stock_packs != null ? ing.stock_packs : "") : ""}" placeholder="e.g. 50"></label>
          <label>Loose amount (in the unit) <input type="number" step="0.01" min="0" id="ingStockLoose" value="${isEdit ? (ing.stock_loose != null ? ing.stock_loose : "") : ""}" placeholder="e.g. 20"></label>
        </div>
        <p class="pack-cost-result" id="stockTotalResult">Total stock will be calculated automatically.</p>
      </div>
      <label>Reorder level (total, in the unit) <input type="number" step="0.01" min="0" id="ingReorder" value="${isEdit ? ing.reorder_level : "0"}" required></label>
      <div class="modal-actions">
        ${isEdit ? `<button type="button" class="btn btn-ghost" id="ingDeleteBtn">Delete</button>` : "<span></span>"}
        <div>
          <button type="button" class="btn btn-ghost" id="ingCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save" : "Add"}</button>
        </div>
      </div>
    </form>
  `);

  // Live per-unit cost calculation as they type
  const packPriceEl = document.getElementById("ingPackPrice");
  const packSizeEl = document.getElementById("ingPackSize");
  const resultEl = document.getElementById("packCostResult");
  const unitEl = document.getElementById("ingUnit");
  const updatePackCost = () => {
    const price = Number(packPriceEl.value);
    const size = Number(packSizeEl.value);
    const unit = unitEl.value;
    if (price > 0 && size > 0) {
      const per = price / size;
      resultEl.innerHTML = `= <strong>${fmtMoney(per)} per ${unit}</strong> (${fmtMoney(price)} ÷ ${size} ${unit})`;
      resultEl.style.color = "var(--pine)";
    } else {
      resultEl.textContent = "Cost per unit will be calculated automatically.";
      resultEl.style.color = "";
    }
  };
  packPriceEl.addEventListener("input", updatePackCost);
  packSizeEl.addEventListener("input", updatePackCost);
  unitEl.addEventListener("change", updatePackCost);
  updatePackCost();

  // Live total-stock calculation: packs × pack size + loose
  const packsEl = document.getElementById("ingStockPacks");
  const looseEl = document.getElementById("ingStockLoose");
  const stockResultEl = document.getElementById("stockTotalResult");
  const packNameEl = document.getElementById("ingPackName");
  const updateStockTotal = () => {
    const packs = Number(packsEl.value) || 0;
    const loose = Number(looseEl.value) || 0;
    const size = Number(packSizeEl.value) || 0;
    const unit = unitEl.value;
    const packName = (packNameEl.value || "pack").trim();
    const total = packs * size + loose;
    if (packs > 0 || loose > 0) {
      let parts = [];
      if (packs > 0 && size > 0) parts.push(`${packs} ${packName}${packs !== 1 ? "s" : ""} × ${size} ${unit}`);
      if (loose > 0) parts.push(`${loose} ${unit} loose`);
      stockResultEl.innerHTML = `= <strong>${total.toLocaleString()} ${unit}</strong> total (${parts.join(" + ")})`;
      stockResultEl.style.color = "var(--pine)";
    } else {
      stockResultEl.textContent = "Total stock will be calculated automatically.";
      stockResultEl.style.color = "";
    }
  };
  packsEl.addEventListener("input", updateStockTotal);
  looseEl.addEventListener("input", updateStockTotal);
  packSizeEl.addEventListener("input", updateStockTotal);
  unitEl.addEventListener("change", updateStockTotal);
  updateStockTotal();

  // ---- Automatic unit conversion when switching units ----
  // If you switch kg→g (or L→ml), the amounts you typed convert so the real
  // quantity stays the same: 50 (kg) pack size becomes 50000 (g).
  const CONVERT = { "kg->g": 1000, "g->kg": 0.001, "L->ml": 1000, "ml->L": 0.001 };
  let prevUnit = unitEl.value;
  const reloadStamp = document.getElementById("ingReorder");
  unitEl.addEventListener("change", () => {
    const newUnit = unitEl.value;
    const key = prevUnit + "->" + newUnit;
    const factor = CONVERT[key];
    if (factor) {
      // Convert the quantity fields (not price — price stays the same total)
      const convert = (el) => { if (el && el.value !== "") el.value = +(Number(el.value) * factor).toFixed(6); };
      convert(packSizeEl);   // pack holds X of the unit
      convert(looseEl);      // loose amount
      convert(reloadStamp);  // reorder level
      updatePackCost();
      updateStockTotal();
    }
    prevUnit = newUnit;
  });

  document.getElementById("ingCancelBtn").addEventListener("click", closeModal);
  if (isEdit) {
    document.getElementById("ingDeleteBtn").addEventListener("click", async () => {
      if (!confirm(`Delete ${ing.name}? This can't be undone.`)) return;
      await deleteDoc("ingredients", ing.id);
      closeModal();
      showToast("Ingredient deleted.");
    });
  }

  document.getElementById("ingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const supplier = supplierById(document.getElementById("ingSupplier").value);
    const packPrice = Number(document.getElementById("ingPackPrice").value);
    let packSize = Number(document.getElementById("ingPackSize").value) || 1;
    let stockPacks = Number(document.getElementById("ingStockPacks").value) || 0;
    let stockLoose = Number(document.getElementById("ingStockLoose").value) || 0;
    let reorderLevel = Number(document.getElementById("ingReorder").value) || 0;

    /* ---- Unit change: convert, don't corrupt. ----
       Recipes store quantities in this ingredient's base unit, stock and pack
       size are in it, and every cost divides by it. Switching kg→g without
       converting makes the SAME numbers mean 1000× less: cost per unit jumps
       1000×, stock crashes 1000×, and every recipe silently shrinks. So the
       numbers on the form (still in the OLD unit) are converted here, and the
       recipes and open stock batches are converted right after saving. */
    const newUnit = document.getElementById("ingUnit").value;
    const oldUnit = isEdit ? ing.unit : newUnit;
    let unitFactor = 1;
    if (isEdit && oldUnit !== newUnit) {
      const toBase = { kg: 1000, g: 1, L: 1000, ml: 1 };  // grams / millilitres
      if (!(oldUnit in toBase) || !(newUnit in toBase)) {
        showToast(`Can't convert ${oldUnit} to ${newUnit} automatically — pieces have no fixed weight. Keep the unit, or add it as a new ingredient.`, true);
        return;
      }
      unitFactor = toBase[oldUnit] / toBase[newUnit];
      const recipeCount = store.products.filter(pr => (pr.ingredients || []).some(ri => ri.ingredient_id === ing.id)).length;
      const batchCount = (store.ingredient_batches || []).filter(b => b.ingredient_id === ing.id && (b.qty_remaining || 0) > 0).length;
      const ok = confirm(
        `Change ${ing.name} from ${oldUnit} to ${newUnit}?\n\n` +
        `Everything converts automatically:\n` +
        `\u2022 Pack size: ${packSize} ${oldUnit}/${(document.getElementById("ingPackName").value || "bag").trim()} \u2192 ${packSize * unitFactor} ${newUnit}\n` +
        `\u2022 Loose stock, reorder level\n` +
        `\u2022 ${recipeCount} recipe(s) that use it\n` +
        `\u2022 ${batchCount} open stock batch(es)\n\n` +
        `Costs, stock on hand and dough weights stay EXACTLY the same \u2014 only the unit they're written in changes.`);
      if (!ok) return;
      packSize = packSize * unitFactor;
      stockLoose = stockLoose * unitFactor;
      reorderLevel = reorderLevel * unitFactor;
    }

    const perUnit = packSize > 0 ? packPrice / packSize : 0;
    const totalStock = stockPacks * packSize + stockLoose;   // bags × size + loose → base units
    const nowISO = new Date().toISOString();
    const data = {
      name: document.getElementById("ingName").value.trim(),
      unit: document.getElementById("ingUnit").value,
      supplier_id: supplier ? supplier.id : null,
      supplier_name: supplier ? supplier.name : "",
      pack_name: (document.getElementById("ingPackName").value || "bag").trim(),
      pack_price: packPrice,          // GHS 670 per bag
      pack_size: packSize,            // 50 (kg per bag)
      cost_per_unit: perUnit,         // 13.40/kg — auto-calculated, used by recipes
      stock_packs: stockPacks,        // 50 bags
      stock_loose: stockLoose,        // 20 kg loose
      stock_qty: totalStock,          // 2520 kg total — what recipes/costing use
      reorder_level: reorderLevel,
      updated_at: nowISO,
      updated_by: currentStaff.name
    };
    if (isEdit) {
      // keep the original created stamp; only refresh updated stamp
      await setDoc("ingredients", ing.id, data);

      // Cascade the unit change: recipes and open batches store quantities in
      // the OLD unit and would silently mean the wrong amount without this.
      if (unitFactor !== 1) {
        let recipesFixed = 0, batchesFixed = 0;
        for (const pr of store.products) {
          if (!(pr.ingredients || []).some(ri => ri.ingredient_id === ing.id)) continue;
          const converted = pr.ingredients.map(ri =>
            ri.ingredient_id === ing.id
              ? { ...ri, qty_required: (ri.qty_required || 0) * unitFactor }
              : ri);
          await setDoc("products", pr.id, { ingredients: converted });
          recipesFixed++;
        }
        for (const b of (store.ingredient_batches || []).filter(b => b.ingredient_id === ing.id)) {
          const patch = {};
          if (b.qty_remaining != null) patch.qty_remaining = (b.qty_remaining || 0) * unitFactor;
          if (b.qty_received != null) patch.qty_received = (b.qty_received || 0) * unitFactor;
          if (Object.keys(patch).length) { await updateDoc("ingredient_batches", b.id, patch); batchesFixed++; }
        }
        showToast(`${data.name}: ${oldUnit} \u2192 ${newUnit}. Converted ${recipesFixed} recipe(s) and ${batchesFixed} batch(es) \u2014 costs unchanged.`);
      }
    } else {
      data.created_at = nowISO;
      data.created_by = currentStaff.name;
      await addDoc("ingredients", data);
    }
    closeModal();
    showToast(isEdit ? "Ingredient updated." : "Ingredient added.");
  });
}

function openStockAdjustForm() {
  if (!store.ingredients.length) { showToast("Add an ingredient first.", true); return; }
  openModal(`
    <h3>Adjust stock</h3>
    <p class="modal-hint">For corrections, spoilage, or stock you added outside a purchase order. Use + to add, − to remove.</p>
    <form id="adjForm" class="modal-form">
      <label>Ingredient
        <select id="adjIngredient">${store.ingredients.map(i => `<option value="${i.id}">${esc(i.name)} — ${fmtQty(i.stock_qty, i.unit)} on hand</option>`).join("")}</select>
      </label>
      <div class="form-row-2">
        <label>Direction
          <select id="adjDirection"><option value="1">+ Add stock</option><option value="-1">− Remove stock</option></select>
        </label>
        <label>Quantity <input type="number" step="0.01" min="0.01" id="adjQty" required></label>
      </div>
      <label>Reason
        <select id="adjReason"><option>Stock count correction</option><option>Purchase (no PO)</option><option>Spoilage / damage</option><option>Transfer</option><option>Other</option></select>
      </label>
      <label>Notes <input type="text" id="adjNotes"></label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="adjCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Apply</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("adjCancelBtn").addEventListener("click", closeModal);
  document.getElementById("adjForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ing = ingredientById(document.getElementById("adjIngredient").value);
    const change = Number(document.getElementById("adjQty").value) * Number(document.getElementById("adjDirection").value);
    const newQty = (ing.stock_qty || 0) + change;
    if (newQty < 0) { showToast(`That would take ${ing.name} below zero.`, true); return; }
    await updateDoc("ingredients", ing.id, { stock_qty: newQty });
    await addDoc("stock_movements", {
      ingredient_id: ing.id, ingredient_name: ing.name, unit: ing.unit,
      change, reason: document.getElementById("adjReason").value,
      notes: document.getElementById("adjNotes").value.trim(), by: currentStaff.name
    });
    closeModal();
    showToast("Stock adjusted.");
  });
}


/* Merge duplicate ingredients (same name). Keeps the oldest record, sums the stock
   quantities into it, repoints nothing else (recipes keep working via the kept id),
   and deletes the extras. Master/admin only. */
async function mergeDuplicateIngredients() {
  if (!["master", "admin"].includes(currentStaff.role)) {
    showToast("Only an admin can merge duplicates.", true);
    return;
  }
  // Group by normalized name
  const groups = {};
  store.ingredients.forEach(i => {
    const key = (i.name || "").trim().toLowerCase();
    (groups[key] = groups[key] || []).push(i);
  });
  const dupGroups = Object.values(groups).filter(g => g.length > 1);
  if (!dupGroups.length) { showToast("No duplicates found."); return; }

  const totalExtras = dupGroups.reduce((s, g) => s + (g.length - 1), 0);
  if (!confirm(`Found ${dupGroups.length} duplicated ingredient${dupGroups.length > 1 ? "s" : ""} (${totalExtras} extra record${totalExtras > 1 ? "s" : ""}).\n\nMerge them? The stock quantities will be added together into one record, and the duplicates removed. This cannot be undone.`)) return;

  try {
    let merged = 0;
    for (const group of dupGroups) {
      // Keep the first as the master record; sum stock from the rest into it.
      const keep = group[0];
      const extras = group.slice(1);
      const summedStock = group.reduce((s, i) => s + (i.stock_qty || 0), 0);
      await db.collection("ingredients").doc(keep.id).update({ stock_qty: summedStock });
      for (const ex of extras) {
        await db.collection("ingredients").doc(ex.id).delete();
        merged++;
      }
    }
    showToast(`Merged and removed ${merged} duplicate record${merged > 1 ? "s" : ""}.`);
  } catch (err) {
    console.error(err);
    showToast("Could not merge duplicates — check permissions and try again.", true);
  }
}
