/* ============================================================
   Suppliers & Purchasing
   ============================================================ */

function renderSuppliers(root) {
  root = root || document.getElementById("moduleContent");

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Suppliers &amp; Purchasing</h2>
        <p class="panel-sub">Order raw materials. Marking a purchase order received restocks inventory automatically.</p>
      </div>
      <div>
        <button class="btn btn-ghost" id="addSupplierBtn">Add supplier</button>
        <button class="btn btn-primary" id="addPOBtn">New purchase order</button>
      </div>
    </div>

    <h3 class="dash-col-title">Purchase orders</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Supplier</th><th>Items</th><th>Total</th><th>Status</th><th>Ordered</th><th></th></tr></thead>
        <tbody>
          ${[...store.purchase_orders].sort((a,b) => new Date(b.order_date) - new Date(a.order_date)).map(po => `
            <tr>
              <td>${esc(po.supplier_name)}</td>
              <td>${(po.items || []).map(i => esc(i.name)).join(", ")}</td>
              <td class="num">${fmtMoney(po.total_cost)}</td>
              <td><span class="status-pill ${po.status === "received" ? "status-ok" : "status-low"}">${po.status}</span></td>
              <td class="num">${fmtDate(po.order_date)}</td>
              <td>${po.status === "ordered" ? `<button class="btn btn-ghost btn-small" data-receive="${po.id}">Mark received</button>` : ""}</td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="empty-state">No purchase orders yet.</td></tr>`}
        </tbody>
      </table>
    </div>

    <h3 class="dash-col-title" style="margin-top:28px;">Ingredient price history</h3>
    <p class="modal-hint" style="margin-top:-8px;margin-bottom:12px;">Unit prices paid over time, from your purchase orders — spot when a supplier's prices creep up.</p>
    ${renderPriceHistory()}

    <h3 class="dash-col-title" style="margin-top:28px;">Suppliers</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th></tr></thead>
        <tbody>
          ${store.suppliers.map(s => `
            <tr><td>${esc(s.name)}</td><td>${esc(s.contact_person || "")}</td><td>${esc(s.phone || "")}</td><td>${esc(s.email || "")}</td></tr>
          `).join("") || `<tr><td colspan="4" class="empty-state">No suppliers yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("addSupplierBtn").addEventListener("click", openSupplierForm);
  document.getElementById("addPOBtn").addEventListener("click", openPOForm);
  root.querySelectorAll("[data-receive]").forEach(btn => {
    btn.addEventListener("click", () => receivePurchaseOrder(btn.dataset.receive));
  });
}

function renderPriceHistory() {
  // Build price series per ingredient from PO line items (each has name, qty, line_total or price)
  const series = {};
  [...store.purchase_orders]
    .filter(po => po.items && po.items.length)
    .sort((a, b) => new Date(a.order_date) - new Date(b.order_date))
    .forEach(po => {
      po.items.forEach(it => {
        const unitPrice = it.price != null ? it.price : (it.qty ? (it.line_total || 0) / it.qty : 0);
        if (!unitPrice) return;
        const key = it.name || it.ingredient_id;
        if (!series[key]) series[key] = { name: it.name || key, supplier: po.supplier_name, points: [] };
        series[key].points.push({ date: po.order_date, price: unitPrice });
      });
    });

  const rows = Object.values(series).map(sr => {
    const first = sr.points[0], last = sr.points[sr.points.length - 1];
    const change = last.price - first.price;
    const changePct = first.price ? (change / first.price * 100) : 0;
    return { ...sr, first, last, change, changePct, latest: last.price };
  }).sort((a, b) => b.changePct - a.changePct);

  if (!rows.length) return `<p class="modal-hint">No purchase history yet — price trends appear once you receive purchase orders.</p>`;

  return `
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Ingredient</th><th>Supplier</th><th>First price</th><th>Latest price</th><th>Change</th><th>Orders</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr class="${r.changePct > 10 ? "row-low" : ""}">
              <td><strong>${esc(r.name)}</strong></td>
              <td>${esc(r.supplier || "")}</td>
              <td class="num">${fmtMoney(r.first.price)}</td>
              <td class="num">${fmtMoney(r.latest)}</td>
              <td class="num" style="color:${r.change > 0 ? "var(--oven)" : r.change < 0 ? "var(--herb)" : "inherit"};">
                ${r.change > 0 ? "▲" : r.change < 0 ? "▼" : ""} ${r.changePct.toFixed(0)}%
              </td>
              <td class="num">${r.points.length}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

function openSupplierForm(supplier) {
  const isEdit = !!(supplier && supplier.id);
  openModal(`
    <h3>${isEdit ? "Edit supplier" : "Add supplier"}</h3>
    <form id="supForm" class="modal-form">
      <label>Name <input type="text" id="supName" value="${isEdit ? esc(supplier.name || "") : ""}" required></label>
      <label>Contact person <input type="text" id="supContact" value="${isEdit ? esc(supplier.contact_person || "") : ""}"></label>
      <label>Phone <input type="text" id="supPhone" value="${isEdit ? esc(supplier.phone || "") : ""}"></label>
      <label>Email <input type="email" id="supEmail" value="${isEdit ? esc(supplier.email || "") : ""}"></label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="supCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save changes" : "Add"}</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("supCancelBtn").addEventListener("click", closeModal);
  document.getElementById("supForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("supName").value.trim(),
      contact_person: document.getElementById("supContact").value.trim(),
      phone: document.getElementById("supPhone").value.trim(),
      email: document.getElementById("supEmail").value.trim()
    };
    if (isEdit) {
      await updateDoc("suppliers", supplier.id, data);
      showToast("Supplier updated.");
    } else {
      await addDoc("suppliers", data);
      showToast("Supplier added.");
    }
    closeModal();
  });
}

function openPOForm(prefillIngredientId) {
  if (!store.suppliers.length) { showToast("Add a supplier first.", true); return; }
  if (!store.ingredients.length) { showToast("Add an ingredient first.", true); return; }

  const prefillIng = prefillIngredientId ? ingredientById(prefillIngredientId) : null;
  let rows = prefillIng
    ? [{ ingredient_id: prefillIng.id,
         qty: Math.max((prefillIng.reorder_level || 0) * 2 - (prefillIng.stock_qty || 0), prefillIng.reorder_level || 1),
         unit_cost: prefillIng.cost_per_unit || 0 }]
    : [{ ingredient_id: store.ingredients[0].id, qty: 0, unit_cost: 0 }];

  const renderRows = () => rows.map((r, idx) => `
    <div class="ing-row" data-idx="${idx}">
      <select class="po-ing-select">
        ${store.ingredients.map(i => `<option value="${i.id}" ${i.id === r.ingredient_id ? "selected" : ""}>${esc(i.name)}</option>`).join("")}
      </select>
      <input type="number" class="po-qty" step="0.01" min="0" value="${r.qty}" placeholder="Qty">
      <input type="number" class="po-cost" step="0.0001" min="0" value="${r.unit_cost}" placeholder="Unit cost">
      <button type="button" class="btn btn-ghost btn-small po-row-remove">✕</button>
    </div>
  `).join("");

  openModal(`
    <h3>New purchase order</h3>
    <form id="poForm" class="modal-form">
      <label>Supplier
        <select id="poSupplier">${store.suppliers.map(s => `<option value="${s.id}" ${prefillIng && prefillIng.supplier_id === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
      </label>
      <div class="ing-editor">
        <div class="ing-editor-head">
          <span>Items</span>
          <button type="button" class="btn btn-ghost btn-small" id="addPORowBtn">+ Add item</button>
        </div>
        <div id="poRows">${renderRows()}</div>
      </div>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="poCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Create order</button>
        </div>
      </div>
    </form>
  `);

  function bindRemovers() {
    document.querySelectorAll(".po-row-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.closest(".ing-row").dataset.idx);
        rows.splice(idx, 1);
        document.getElementById("poRows").innerHTML = renderRows();
        bindRemovers();
      });
    });
  }
  bindRemovers();

  document.getElementById("addPORowBtn").addEventListener("click", () => {
    rows.push({ ingredient_id: store.ingredients[0].id, qty: 0, unit_cost: 0 });
    document.getElementById("poRows").innerHTML = renderRows();
    bindRemovers();
  });

  document.getElementById("poCancelBtn").addEventListener("click", closeModal);
  document.getElementById("poForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const liveRows = [...document.querySelectorAll(".ing-row")].map(rowEl => {
      const ing = ingredientById(rowEl.querySelector(".po-ing-select").value);
      const qty = Number(rowEl.querySelector(".po-qty").value) || 0;
      const unit_cost = Number(rowEl.querySelector(".po-cost").value) || 0;
      return { ingredient_id: ing.id, name: ing.name, qty, unit_cost, line_total: qty * unit_cost };
    }).filter(r => r.qty > 0);

    if (!liveRows.length) { showToast("Add at least one item with a quantity.", true); return; }

    const supplier = supplierById(document.getElementById("poSupplier").value);
    await addDoc("purchase_orders", {
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      items: liveRows,
      total_cost: liveRows.reduce((s, r) => s + r.line_total, 0),
      status: "ordered",
      order_date: new Date().toISOString()
    });
    closeModal();
    showToast("Purchase order created.");
  });
}

async function receivePurchaseOrder(id) {
  const po = store.purchase_orders.find(p => p.id === id);
  if (!po) return;
  // Ask how it's being paid: now (cash/momo/bank) or on credit (pay supplier later)
  const onCredit = confirm(`Mark this order from ${po.supplier_name} as received?\n\nClick OK if you are PAYING NOW.\nClick Cancel if buying ON CREDIT (pay the supplier later).`) ? false : true;

  try {
    await runTransaction(async (tx) => {
      const ingRefs = po.items.map(it => db.collection("ingredients").doc(it.ingredient_id));
      const ingSnaps = await Promise.all(ingRefs.map(ref => tx.get(ref)));
      ingSnaps.forEach((snap, i) => {
        const data = snap.data();
        tx.update(ingRefs[i], { stock_qty: data.stock_qty + po.items[i].qty });
        tx.set(db.collection("stock_movements").doc(), {
          ingredient_id: snap.id, ingredient_name: data.name, unit: data.unit,
          change: po.items[i].qty, reason: `Purchase order — ${po.supplier_name}`,
          by: currentStaff.name, created_at: new Date().toISOString()
        });
      });
      tx.update(db.collection("purchase_orders").doc(po.id), {
        status: "received", received_date: new Date().toISOString(),
        payment_terms: onCredit ? "credit" : "paid", paid: !onCredit
      });
      if (onCredit) {
        // Record a payable instead of a cash expense
        tx.set(db.collection("vendor_debts").doc(), {
          vendor: po.supplier_name, amount_owed: po.total_cost, paid: 0,
          reason: `Purchase order (credit) — ${po.supplier_name}`,
          created_at: new Date().toISOString(), po_id: po.id, direction: "payable"
        });
      } else {
        tx.set(db.collection("expenses").doc(), {
          category: "Supplies",
          description: `Purchase order — ${po.supplier_name}`,
          amount: po.total_cost,
          date: todayISO(),
          vendor: po.supplier_name,
          created_by: currentStaff.name
        });
      }
    });
    showToast(onCredit ? "Stock updated. Recorded as money owed to supplier." : "Stock updated and expense logged.");
  } catch (err) {
    console.error(err);
    showToast("Could not receive this order.", true);
  }
}
