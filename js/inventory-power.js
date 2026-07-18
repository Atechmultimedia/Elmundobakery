/* ============================================================
   Inventory Power features for El Mundo Bakery
   ------------------------------------------------------------
   1. Batch-level expiry tracking (ingredient_batches)
   2. Auto-reorder shopping list (grouped by supplier)
   3. Stock take / physical count with variance
   4. Ingredient cost history
   These render inside the Inventory module via tabs.
   ============================================================ */

/* ---------- Shared: which ingredient batches are expiring ---------- */
function ingredientBatchesFor(ingredientId) {
  return store.ingredient_batches
    .filter(b => b.ingredient_id === ingredientId && (b.qty_remaining || 0) > 0)
    .sort((a, b) => (a.expiry_date || "9999").localeCompare(b.expiry_date || "9999")); // FEFO: oldest first
}

function expiringBatches(withinDays) {
  const cutoff = new Date(Date.now() + (withinDays || 7) * 86400000).toISOString().slice(0, 10);
  const today = todayISO();
  return store.ingredient_batches
    .filter(b => (b.qty_remaining || 0) > 0 && b.expiry_date && b.expiry_date <= cutoff)
    .map(b => ({ ...b, expired: b.expiry_date < today }))
    .sort((a, b) => (a.expiry_date || "").localeCompare(b.expiry_date || ""));
}

/* ============================================================
   1. BATCH EXPIRY
   ============================================================ */
function renderBatchExpiry(root) {
  const canEdit = ["master", "admin", "manager", "baker", "production_manager"].includes(currentStaff.role);
  const soon = expiringBatches(7);
  const allActive = store.ingredient_batches.filter(b => (b.qty_remaining || 0) > 0);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h3>Batch expiry tracking</h3>
        <p class="panel-sub">Each delivery is a batch with its own expiry. Use the oldest batch first (FEFO).</p>
      </div>
      ${canEdit ? `<button class="btn btn-primary" id="addBatchBtn">Record new batch</button>` : ""}
    </div>

    ${soon.length ? `
    <div class="alerts-card" style="margin-bottom:18px;">
      ${soon.map(b => {
        const ing = ingredientById(b.ingredient_id);
        return `<div class="alert-line ${b.expired ? "alert-bad" : "alert-warn"}">
          <span>${b.expired ? "⛔" : "⏰"}</span>
          <span><strong>${esc(ing ? ing.name : "?")}</strong> — batch ${esc(b.batch_code || "")} ${b.expired ? "EXPIRED" : "expires"} ${fmtDate(b.expiry_date)} · ${fmtQty(b.qty_remaining, ing ? ing.unit : "")} left</span>
        </div>`;
      }).join("")}
    </div>` : `<p class="panel-sub" style="margin-bottom:16px;">✓ No batches expiring in the next 7 days.</p>`}

    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Ingredient</th><th>Batch</th><th>Received</th><th>Expiry</th><th>Remaining</th><th>Status</th>${canEdit ? "<th></th>" : ""}</tr></thead>
        <tbody>
          ${[...allActive].sort((a, b) => (a.expiry_date || "9999").localeCompare(b.expiry_date || "9999")).map(b => {
            const ing = ingredientById(b.ingredient_id);
            const today = todayISO();
            const expired = b.expiry_date && b.expiry_date < today;
            const soonFlag = b.expiry_date && b.expiry_date <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
            return `<tr>
              <td><strong>${esc(ing ? ing.name : "?")}</strong></td>
              <td class="num">${esc(b.batch_code || "")}</td>
              <td class="num">${fmtDate(b.received_date)}</td>
              <td class="num">${fmtDate(b.expiry_date)}</td>
              <td class="num">${fmtQty(b.qty_remaining, ing ? ing.unit : "")}</td>
              <td><span class="status-pill ${expired ? "status-low" : soonFlag ? "status-low" : "status-ok"}">${expired ? "Expired" : soonFlag ? "Use soon" : "Good"}</span></td>
              ${canEdit ? `<td><button class="btn btn-ghost btn-small" data-use-batch="${b.id}">Use / discard</button></td>` : ""}
            </tr>`;
          }).join("") || `<tr><td colspan="${canEdit ? 7 : 6}" class="empty-state">No batches recorded yet. Record a batch when you receive stock.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  if (canEdit) {
    const addBtn = document.getElementById("addBatchBtn");
    if (addBtn) addBtn.addEventListener("click", () => openBatchForm());
    root.querySelectorAll("[data-use-batch]").forEach(btn => {
      btn.addEventListener("click", () => openUseBatchForm(btn.dataset.useBatch));
    });
  }
}

function openBatchForm() {
  openModal(`
    <div class="modal-card">
      <h3>Record a batch</h3>
      <p class="modal-hint">Log a delivery of an ingredient with its own expiry date. This also adds the quantity to stock.</p>
      <form id="batchForm" class="modal-form">
        <label>Ingredient
          <select id="btIngredient" required>
            <option value="">Choose…</option>
            ${store.ingredients.map(i => `<option value="${i.id}">${esc(i.name)}</option>`).join("")}
          </select>
        </label>
        <div class="form-row-2">
          <label>Batch code / reference <input type="text" id="btCode" placeholder="e.g. LOT-2026-04"></label>
          <label>Quantity received <input type="number" step="0.01" min="0" id="btQty" required></label>
        </div>
        <div class="form-row-2">
          <label>Received date <input type="date" id="btReceived" value="${todayISO()}"></label>
          <label>Expiry date <input type="date" id="btExpiry" required></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="btCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save batch &amp; add to stock</button>
        </div>
      </form>
    </div>
  `);
  document.getElementById("btCancel").addEventListener("click", closeModal);
  document.getElementById("batchForm").addEventListener("submit", saveBatch);
}

async function saveBatch(e) {
  e.preventDefault();
  const ingId = document.getElementById("btIngredient").value;
  const qty = Number(document.getElementById("btQty").value);
  const expiry = document.getElementById("btExpiry").value;
  if (!ingId || !qty || !expiry) { showToast("Please fill in ingredient, quantity and expiry.", true); return; }
  const ing = ingredientById(ingId);
  try {
    await addDoc("ingredient_batches", {
      ingredient_id: ingId,
      ingredient_name: ing ? ing.name : "",
      batch_code: document.getElementById("btCode").value.trim(),
      qty_received: qty,
      qty_remaining: qty,
      received_date: document.getElementById("btReceived").value || todayISO(),
      expiry_date: expiry,
      created_by: currentStaff.name,
      created_at: new Date().toISOString()
    });
    // Add to the ingredient's total stock
    await updateDoc("ingredients", ingId, { stock_qty: (ing.stock_qty || 0) + qty });
    await addDoc("stock_movements", {
      ingredient_id: ingId, ingredient_name: ing ? ing.name : "", unit: ing ? ing.unit : "",
      change: qty, reason: "New batch received", by: currentStaff.name, created_at: new Date().toISOString()
    });
    closeModal();
    showToast("Batch recorded and added to stock.");
  } catch (err) {
    console.error(err); showToast("Could not save the batch.", true);
  }
}

function openUseBatchForm(batchId) {
  const b = store.ingredient_batches.find(x => x.id === batchId);
  if (!b) return;
  const ing = ingredientById(b.ingredient_id);
  openModal(`
    <div class="modal-card">
      <h3>Use or discard from batch</h3>
      <p class="modal-hint">${esc(ing ? ing.name : "")} — batch ${esc(b.batch_code || "")}, ${fmtQty(b.qty_remaining, ing ? ing.unit : "")} remaining, expires ${fmtDate(b.expiry_date)}.</p>
      <form id="useBatchForm" class="modal-form">
        <label>Quantity to remove <input type="number" step="0.01" min="0" max="${b.qty_remaining}" id="ubQty" required></label>
        <label>Reason
          <select id="ubReason">
            <option value="used">Used in production</option>
            <option value="discarded">Discarded / expired</option>
            <option value="waste">Waste / spoilage</option>
          </select>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="ubCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Remove</button>
        </div>
      </form>
    </div>
  `);
  document.getElementById("ubCancel").addEventListener("click", closeModal);
  document.getElementById("useBatchForm").addEventListener("submit", (ev) => useBatch(ev, batchId));
}

async function useBatch(e, batchId) {
  e.preventDefault();
  const b = store.ingredient_batches.find(x => x.id === batchId);
  if (!b) return;
  const ing = ingredientById(b.ingredient_id);
  const qty = Number(document.getElementById("ubQty").value);
  const reason = document.getElementById("ubReason").value;
  if (!qty || qty > (b.qty_remaining || 0)) { showToast("Enter a valid quantity.", true); return; }
  try {
    await updateDoc("ingredient_batches", batchId, { qty_remaining: (b.qty_remaining || 0) - qty });
    await updateDoc("ingredients", b.ingredient_id, { stock_qty: Math.max(0, (ing.stock_qty || 0) - qty) });
    await addDoc("stock_movements", {
      ingredient_id: b.ingredient_id, ingredient_name: ing ? ing.name : "", unit: ing ? ing.unit : "",
      change: -qty, reason: "Batch " + reason + " (" + (b.batch_code || "") + ")", by: currentStaff.name, created_at: new Date().toISOString()
    });
    // If discarded/waste, also log to waste tracker for costing
    if (reason === "discarded" || reason === "waste") {
      await addDoc("waste_log", {
        item: (ing ? ing.name : "") + " (batch " + (b.batch_code || "") + ")",
        qty, unit: ing ? ing.unit : "", reason: "Expired / spoiled",
        loss_value: qty * (ing ? ing.cost_per_unit || 0 : 0),
        date: todayISO(), logged_by: currentStaff.name
      });
    }
    closeModal();
    showToast("Batch updated.");
  } catch (err) {
    console.error(err); showToast("Could not update the batch.", true);
  }
}

/* ============================================================
   2. AUTO-REORDER SHOPPING LIST
   ============================================================ */
function renderReorderList(root) {
  const low = store.ingredients.filter(i => (i.stock_qty || 0) <= (i.reorder_level || 0) && (i.reorder_level || 0) > 0);

  // Group by supplier
  const bySupplier = {};
  low.forEach(i => {
    const sup = i.supplier_name || "No supplier set";
    (bySupplier[sup] = bySupplier[sup] || []).push(i);
  });

  root.innerHTML = `
    <div class="panel-head">
      <h3>Reorder shopping list</h3>
      <p class="panel-sub">Everything at or below its reorder level, grouped by supplier. Suggested order quantity brings you back to a safe level.</p>
    </div>
    ${low.length === 0 ? `<p class="panel-sub">✓ Nothing needs reordering right now — all stock is above reorder levels.</p>` :
      Object.entries(bySupplier).map(([sup, items]) => `
        <div class="reorder-supplier">
          <div class="reorder-supplier-head">
            <h4>${esc(sup)}</h4>
            <button class="btn btn-ghost btn-small" data-copy-supplier="${esc(sup)}">Copy list</button>
          </div>
          <table class="ledger-table">
            <thead><tr><th>Ingredient</th><th>On hand</th><th>Reorder at</th><th>Suggested order</th><th>Est. cost</th></tr></thead>
            <tbody>
              ${items.map(i => {
                const suggested = Math.max((i.reorder_level || 0) * 2 - (i.stock_qty || 0), i.reorder_level || 1);
                const cost = suggested * (i.cost_per_unit || 0);
                return `<tr>
                  <td><strong>${esc(i.name)}</strong></td>
                  <td class="num">${fmtQty(i.stock_qty, i.unit)}</td>
                  <td class="num">${fmtQty(i.reorder_level, i.unit)}</td>
                  <td class="num">${fmtQty(Math.ceil(suggested), i.unit)}</td>
                  <td class="num">${fmtMoney(cost)}</td>
                </tr>`;
              }).join("")}
            </tbody>
            <tfoot><tr><td colspan="4">Supplier total</td><td class="num">${fmtMoney(items.reduce((s, i) => {
              const suggested = Math.max((i.reorder_level || 0) * 2 - (i.stock_qty || 0), i.reorder_level || 1);
              return s + suggested * (i.cost_per_unit || 0);
            }, 0))}</td></tr></tfoot>
          </table>
        </div>
      `).join("")
    }
  `;

  root.querySelectorAll("[data-copy-supplier]").forEach(btn => {
    btn.addEventListener("click", () => {
      const sup = btn.dataset.copySupplier;
      const items = bySupplier[sup] || [];
      const text = `Order for ${sup} — ${fmtDate(todayISO())}\n` + items.map(i => {
        const suggested = Math.ceil(Math.max((i.reorder_level || 0) * 2 - (i.stock_qty || 0), i.reorder_level || 1));
        return `• ${i.name}: ${suggested} ${i.unit}`;
      }).join("\n");
      navigator.clipboard.writeText(text).then(() => showToast("Order list copied — paste into WhatsApp or email."));
    });
  });
}

/* ============================================================
   3. STOCK TAKE / PHYSICAL COUNT
   ============================================================ */
function renderStockTake(root) {
  const canEdit = ["master", "admin", "manager", "baker", "production_manager"].includes(currentStaff.role);
  const recent = [...store.stock_takes].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 10);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h3>Stock take (physical count)</h3>
        <p class="panel-sub">Count what's actually on the shelf and compare it to the system. Variances reveal waste, theft, or miscounts.</p>
      </div>
      ${canEdit ? `<button class="btn btn-primary" id="startStockTakeBtn">Start a stock take</button>` : ""}
    </div>

    <h4 style="margin-top:20px;">Recent stock takes</h4>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Date</th><th>By</th><th>Items counted</th><th>Total variance value</th></tr></thead>
        <tbody>
          ${recent.map(st => `
            <tr>
              <td class="num">${fmtDate(st.date)}</td>
              <td>${esc(st.by || "")}</td>
              <td class="num">${(st.lines || []).length}</td>
              <td class="num" style="color:${(st.total_variance_value || 0) < 0 ? "var(--oven)" : "inherit"};">${fmtMoney(st.total_variance_value || 0)}</td>
            </tr>
          `).join("") || `<tr><td colspan="4" class="empty-state">No stock takes yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  if (canEdit) {
    const btn = document.getElementById("startStockTakeBtn");
    if (btn) btn.addEventListener("click", openStockTakeForm);
  }
}

function openStockTakeForm() {
  openModal(`
    <div class="modal-card" style="max-width:640px;">
      <h3>Stock take</h3>
      <p class="modal-hint">Enter the actual counted quantity for each ingredient. Leave blank to skip. The system records the variance vs current stock.</p>
      <form id="stockTakeForm" class="modal-form">
        <div class="table-wrap" style="max-height:50vh;overflow:auto;">
          <table class="ledger-table">
            <thead><tr><th>Ingredient</th><th>System says</th><th>Counted</th></tr></thead>
            <tbody>
              ${store.ingredients.map(i => `
                <tr>
                  <td>${esc(i.name)}</td>
                  <td class="num">${fmtQty(i.stock_qty, i.unit)}</td>
                  <td><input type="number" step="0.01" min="0" data-count="${i.id}" style="width:90px;" placeholder="—"></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="stCancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save stock take &amp; update stock</button>
        </div>
      </form>
    </div>
  `);
  document.getElementById("stCancel").addEventListener("click", closeModal);
  document.getElementById("stockTakeForm").addEventListener("submit", saveStockTake);
}

async function saveStockTake(e) {
  e.preventDefault();
  const lines = [];
  let totalVarValue = 0;
  document.querySelectorAll("[data-count]").forEach(inp => {
    if (inp.value === "") return;
    const ing = ingredientById(inp.dataset.count);
    if (!ing) return;
    const counted = Number(inp.value);
    const system = ing.stock_qty || 0;
    const variance = counted - system;
    const varValue = variance * (ing.cost_per_unit || 0);
    totalVarValue += varValue;
    lines.push({ ingredient_id: ing.id, name: ing.name, system, counted, variance, variance_value: varValue });
  });
  if (!lines.length) { showToast("Enter at least one count.", true); return; }
  try {
    await addDoc("stock_takes", {
      date: todayISO(), by: currentStaff.name, lines,
      total_variance_value: totalVarValue, created_at: new Date().toISOString()
    });
    // Update each ingredient's stock to the counted figure, and log movements
    for (const ln of lines) {
      await updateDoc("ingredients", ln.ingredient_id, { stock_qty: ln.counted });
      if (ln.variance !== 0) {
        const ing = ingredientById(ln.ingredient_id);
        await addDoc("stock_movements", {
          ingredient_id: ln.ingredient_id, ingredient_name: ln.name, unit: ing ? ing.unit : "",
          change: ln.variance, reason: "Stock take adjustment", by: currentStaff.name, created_at: new Date().toISOString()
        });
      }
    }
    closeModal();
    showToast(`Stock take saved. Net variance ${fmtMoney(totalVarValue)}.`);
  } catch (err) {
    console.error(err); showToast("Could not save the stock take.", true);
  }
}

/* ============================================================
   4. INGREDIENT COST HISTORY
   ============================================================ */
function renderIngredientCostHistory(root) {
  // Derive cost points from purchase orders (line items) per ingredient over time
  const series = {};
  [...store.purchase_orders]
    .filter(po => po.items && po.items.length)
    .sort((a, b) => new Date(a.order_date) - new Date(b.order_date))
    .forEach(po => {
      po.items.forEach(it => {
        const unitPrice = it.price != null ? it.price : (it.qty ? (it.line_total || 0) / it.qty : 0);
        if (!unitPrice) return;
        const key = it.ingredient_id || it.name;
        if (!series[key]) series[key] = { name: it.name || key, points: [] };
        series[key].points.push({ date: po.order_date, price: unitPrice });
      });
    });

  const rows = Object.values(series).map(sr => {
    const first = sr.points[0], last = sr.points[sr.points.length - 1];
    const change = last.price - first.price;
    const pct = first.price ? (change / first.price * 100) : 0;
    const avg = sr.points.reduce((s, p) => s + p.price, 0) / sr.points.length;
    return { ...sr, first: first.price, last: last.price, change, pct, avg, count: sr.points.length };
  }).sort((a, b) => b.pct - a.pct);

  root.innerHTML = `
    <div class="panel-head">
      <h3>Ingredient cost history</h3>
      <p class="panel-sub">How each ingredient's unit cost has moved over time, from your purchase orders. Rising costs are flagged.</p>
    </div>
    ${rows.length === 0 ? `<p class="panel-sub">No purchase history yet — cost trends appear once you receive purchase orders.</p>` : `
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Ingredient</th><th>First cost</th><th>Latest cost</th><th>Average</th><th>Change</th><th>Data points</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr class="${r.pct > 10 ? "row-low" : ""}">
              <td><strong>${esc(r.name)}</strong></td>
              <td class="num">${fmtMoney(r.first)}</td>
              <td class="num">${fmtMoney(r.last)}</td>
              <td class="num">${fmtMoney(r.avg)}</td>
              <td class="num" style="color:${r.change > 0 ? "var(--oven)" : r.change < 0 ? "var(--herb)" : "inherit"};">${r.change > 0 ? "▲" : r.change < 0 ? "▼" : ""} ${r.pct.toFixed(0)}%</td>
              <td class="num">${r.count}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`}
  `;
}

/* ============================================================
   5. SUPPLIER DIRECTORY (inside Inventory)
   Shows suppliers, their contacts, and the ingredients each supplies.
   ============================================================ */
function renderSupplierDirectory(root) {
  const canEdit = ["master", "admin", "manager", "baker", "production_manager", "finance_manager"].includes(currentStaff.role);

  // Group ingredients by supplier
  const bySupplier = {};
  store.ingredients.forEach(i => {
    const key = i.supplier_id || "_none";
    (bySupplier[key] = bySupplier[key] || []).push(i);
  });

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h3>Suppliers</h3>
        <p class="panel-sub">Your suppliers and the ingredients each one provides. Assign a supplier to an ingredient on the Stock tab.</p>
      </div>
      ${canEdit ? `<button class="btn btn-primary" id="addSupplierInvBtn">Add supplier</button>` : ""}
    </div>

    ${store.suppliers.length === 0 ? `
      <div class="empty-state" style="padding:30px;text-align:center;">
        <p>No suppliers yet.</p>
        <p class="panel-sub">Add your first supplier to start linking ingredients, purchase orders, and reorder lists.</p>
      </div>` :
      store.suppliers.map(sup => {
        const items = bySupplier[sup.id] || [];
        return `
        <div class="reorder-supplier">
          <div class="reorder-supplier-head">
            <div>
              <h4>${esc(sup.name)}</h4>
              <p class="panel-sub" style="margin:2px 0 0;">
                ${sup.contact_person ? esc(sup.contact_person) + " · " : ""}
                ${sup.phone ? esc(sup.phone) + " · " : ""}
                ${sup.email ? esc(sup.email) : ""}
              </p>
            </div>
            <div>
              ${sup.phone ? `<a class="btn btn-ghost btn-small" href="https://wa.me/${(sup.phone || "").replace(/[^0-9]/g, "")}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
              ${canEdit ? `<button class="btn btn-ghost btn-small" data-edit-sup="${sup.id}">Edit</button>` : ""}
            </div>
          </div>
          ${items.length ? `
            <table class="ledger-table">
              <thead><tr><th>Ingredient</th><th>On hand</th><th>Cost</th><th>Status</th></tr></thead>
              <tbody>
                ${items.map(i => {
                  const low = (i.stock_qty || 0) <= (i.reorder_level || 0);
                  return `<tr>
                    <td>${esc(i.name)}</td>
                    <td class="num">${fmtQty(i.stock_qty, i.unit)}</td>
                    <td class="num">${fmtMoney(i.cost_per_unit || 0)}/${esc(i.unit)}</td>
                    <td><span class="status-pill ${low ? "status-low" : "status-ok"}">${low ? "Low" : "OK"}</span></td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>` : `<p class="panel-sub">No ingredients linked to this supplier yet.</p>`}
        </div>`;
      }).join("")
    }

    ${(bySupplier["_none"] && bySupplier["_none"].length) ? `
      <div class="reorder-supplier" style="border-style:dashed;">
        <div class="reorder-supplier-head"><h4>Unassigned ingredients</h4></div>
        <p class="panel-sub">These have no supplier set — edit them on the Stock tab to link a supplier.</p>
        <table class="ledger-table">
          <tbody>
            ${bySupplier["_none"].map(i => `<tr><td>${esc(i.name)}</td><td class="num">${fmtQty(i.stock_qty, i.unit)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>` : ""}
  `;

  if (canEdit) {
    const addBtn = document.getElementById("addSupplierInvBtn");
    if (addBtn) addBtn.addEventListener("click", () => openSupplierForm());
    root.querySelectorAll("[data-edit-sup]").forEach(btn => {
      btn.addEventListener("click", () => openSupplierForm(supplierById(btn.dataset.editSup)));
    });
  }
}
