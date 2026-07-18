/* Straight-line depreciation helpers */
function assetMonthlyDepreciation(a) {
  const life = (a.useful_life_years || 0) * 12;
  if (life <= 0) return 0;
  const depreciable = (a.cost || 0) - (a.salvage_value || 0);
  return Math.max(0, depreciable / life);
}
function assetAccumulatedDepreciation(a, asOf) {
  const monthly = assetMonthlyDepreciation(a);
  if (monthly <= 0 || !a.purchase_date) return 0;
  const start = new Date(a.purchase_date);
  const end = asOf ? new Date(asOf) : new Date();
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  months = Math.max(0, months);
  const depreciable = (a.cost || 0) - (a.salvage_value || 0);
  return Math.min(depreciable, monthly * months);
}
function assetBookValue(a, asOf) {
  return (a.cost || 0) - assetAccumulatedDepreciation(a, asOf);
}

/* ============================================================
   Assets register + equipment maintenance
   Mirrors the "Assets" and "Equipment Maintenance" sheets.
   ============================================================ */

function renderAssets(root) {
  root = root || document.getElementById("moduleContent");
  const totalAssets = store.assets_register.reduce((s, a) => s + (a.cost || 0), 0);
  const totalBookValue = store.assets_register.reduce((s, a) => s + assetBookValue(a), 0);
  const totalMonthlyDep = store.assets_register.reduce((s, a) => s + assetMonthlyDepreciation(a), 0);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Assets</h2>
        <p class="panel-sub">Everything the bakery owns — cost ${fmtMoney(totalAssets)}, current book value ${fmtMoney(totalBookValue)} after depreciation.</p>
      </div>
      <div>
        <button class="btn btn-ghost" id="addMaintBtn">Log maintenance</button>
        <button class="btn btn-primary" id="addAssetBtn">Add asset</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Purchase date</th><th>Asset</th><th>Category</th><th>Cost</th><th>Depreciation/mo</th><th>Book value now</th><th>Condition</th><th></th></tr></thead>
        <tbody>
          ${[...store.assets_register].sort((a,b) => (b.purchase_date||"").localeCompare(a.purchase_date||"")).map(a => `
            <tr>
              <td class="num">${fmtDate(a.purchase_date)}</td>
              <td>${esc(a.name)}</td>
              <td>${esc(a.category || "")}</td>
              <td class="num">${fmtMoney(a.cost || 0)}</td>
              <td class="num">${assetMonthlyDepreciation(a) > 0 ? fmtMoney(assetMonthlyDepreciation(a)) : "—"}</td>
              <td class="num">${fmtMoney(assetBookValue(a))}</td>
              <td><span class="status-pill ${a.condition === "Needs Repair" || a.condition === "Retired" ? "status-low" : "status-ok"}">${esc(a.condition || "—")}</span></td>
              <td><button class="btn btn-ghost btn-small" data-edit-asset="${a.id}">Edit</button></td>
            </tr>
          `).join("") || `<tr><td colspan="8" class="empty-state">No assets recorded yet.</td></tr>`}
        </tbody>
        ${store.assets_register.length ? `<tfoot><tr><td colspan="3">Totals</td><td class="num">${fmtMoney(totalAssets)}</td><td class="num">${fmtMoney(totalMonthlyDep)}</td><td class="num">${fmtMoney(totalBookValue)}</td><td colspan="2"></td></tr></tfoot>` : ""}
      </table>
    </div>

    <h3 class="dash-col-title" style="margin-top:32px;">Equipment maintenance log</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Date</th><th>Equipment</th><th>Issue</th><th>Repair cost</th><th>Technician</th><th>Next service</th></tr></thead>
        <tbody>
          ${[...store.maintenance_log].sort((a,b) => (b.date||"").localeCompare(a.date||"")).map(m => `
            <tr>
              <td class="num">${fmtDate(m.date)}</td>
              <td>${esc(m.equipment)}</td>
              <td>${esc(m.issue)}</td>
              <td class="num">${fmtMoney(m.repair_cost || 0)}</td>
              <td>${esc(m.technician || "")}</td>
              <td class="num">${m.next_service ? fmtDate(m.next_service) : "—"}</td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="empty-state">No maintenance logged yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("addAssetBtn").addEventListener("click", () => openAssetForm());
  document.getElementById("addMaintBtn").addEventListener("click", openMaintenanceForm);
  root.querySelectorAll("[data-edit-asset]").forEach(btn => {
    btn.addEventListener("click", () => openAssetForm(store.assets_register.find(a => a.id === btn.dataset.editAsset)));
  });
}

function categoryOptionsHtml(map, selectedCat) {
  return Object.keys(map).map(c => `<option ${c === selectedCat ? "selected" : ""}>${esc(c)}</option>`).join("");
}

function subcategoryOptionsHtml(map, cat, selectedSub) {
  return (map[cat] || []).map(s => `<option ${s === selectedSub ? "selected" : ""}>${esc(s)}</option>`).join("");
}

function openAssetForm(asset) {
  const isEdit = !!asset;
  const initialCat = isEdit ? asset.category : Object.keys(ASSET_CATEGORIES)[0];
  openModal(`
    <h3>${isEdit ? "Edit" : "Add"} asset</h3>
    <form id="assetForm" class="modal-form">
      <label>Asset name <input type="text" id="asName" value="${isEdit ? esc(asset.name) : ""}" required></label>
      <div class="form-row-2">
        <label>Category
          <select id="asCategory">${categoryOptionsHtml(ASSET_CATEGORIES, initialCat)}</select>
        </label>
        <label>Subcategory
          <select id="asSubcategory">${subcategoryOptionsHtml(ASSET_CATEGORIES, initialCat, isEdit ? asset.subcategory : null)}</select>
        </label>
      </div>
      <div class="form-row-2">
        <label>Purchase date <input type="date" id="asDate" value="${isEdit ? (asset.purchase_date || "") : todayISO()}"></label>
        <label>Cost (GHS) <input type="number" step="0.01" min="0" id="asCost" value="${isEdit ? asset.cost : ""}" required></label>
      </div>
      <div class="form-row-2">
        <label>Useful life (years, for depreciation) <input type="number" step="1" min="0" id="asLife" value="${isEdit ? (asset.useful_life_years || 5) : 5}"></label>
        <label>Salvage value at end (GHS) <input type="number" step="0.01" min="0" id="asSalvage" value="${isEdit ? (asset.salvage_value || 0) : 0}"></label>
      </div>
      <div class="form-row-2">
        <label>Supplier <input type="text" id="asSupplier" value="${isEdit ? esc(asset.supplier || "") : ""}"></label>
        <label>Condition
          <select id="asCondition">${ASSET_CONDITIONS.map(c => `<option ${isEdit && asset.condition === c ? "selected" : ""}>${c}</option>`).join("")}</select>
        </label>
      </div>
      <label>Notes <input type="text" id="asNotes" value="${isEdit ? esc(asset.notes || "") : ""}"></label>
      <div class="modal-actions">
        ${isEdit ? `<button type="button" class="btn btn-ghost" id="asDeleteBtn">Delete</button>` : "<span></span>"}
        <div>
          <button type="button" class="btn btn-ghost" id="asCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save" : "Add"}</button>
        </div>
      </div>
    </form>
  `);

  document.getElementById("asCategory").addEventListener("change", (e) => {
    document.getElementById("asSubcategory").innerHTML = subcategoryOptionsHtml(ASSET_CATEGORIES, e.target.value, null);
  });
  document.getElementById("asCancelBtn").addEventListener("click", closeModal);
  if (isEdit) {
    document.getElementById("asDeleteBtn").addEventListener("click", async () => {
      if (!confirm(`Delete ${asset.name}?`)) return;
      await deleteDoc("assets_register", asset.id);
      closeModal(); showToast("Asset deleted.");
    });
  }
  document.getElementById("assetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("asName").value.trim(),
      category: document.getElementById("asCategory").value,
      subcategory: document.getElementById("asSubcategory").value,
      purchase_date: document.getElementById("asDate").value,
      cost: Number(document.getElementById("asCost").value),
      useful_life_years: Number(document.getElementById("asLife").value || 0),
      salvage_value: Number(document.getElementById("asSalvage").value || 0),
      supplier: document.getElementById("asSupplier").value.trim(),
      condition: document.getElementById("asCondition").value,
      notes: document.getElementById("asNotes").value.trim()
    };
    if (isEdit) await setDoc("assets_register", asset.id, data);
    else await addDoc("assets_register", data);
    closeModal(); showToast(isEdit ? "Asset updated." : "Asset added.");
  });
}

function openMaintenanceForm() {
  openModal(`
    <h3>Log maintenance</h3>
    <form id="maintForm" class="modal-form">
      <label>Equipment
        ${store.assets_register.length
          ? `<select id="mtEquipment">${store.assets_register.map(a => `<option>${esc(a.name)}</option>`).join("")}<option>Other</option></select>`
          : `<input type="text" id="mtEquipment" required>`}
      </label>
      <label>Issue <input type="text" id="mtIssue" required></label>
      <div class="form-row-2">
        <label>Date <input type="date" id="mtDate" value="${todayISO()}" required></label>
        <label>Repair cost (GHS) <input type="number" step="0.01" min="0" id="mtCost" value="0"></label>
      </div>
      <div class="form-row-2">
        <label>Technician <input type="text" id="mtTech"></label>
        <label>Next service <input type="date" id="mtNext"></label>
      </div>
      <label class="checkbox-label"><input type="checkbox" id="mtLogExpense" checked> Also log the repair cost as an expense</label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="mtCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Log</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("mtCancelBtn").addEventListener("click", closeModal);
  document.getElementById("maintForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const equipmentEl = document.getElementById("mtEquipment");
    const cost = Number(document.getElementById("mtCost").value || 0);
    const entry = {
      equipment: equipmentEl.value.trim ? equipmentEl.value.trim() : equipmentEl.value,
      issue: document.getElementById("mtIssue").value.trim(),
      date: document.getElementById("mtDate").value,
      repair_cost: cost,
      technician: document.getElementById("mtTech").value.trim(),
      next_service: document.getElementById("mtNext").value || null
    };
    await addDoc("maintenance_log", entry);
    if (cost > 0 && document.getElementById("mtLogExpense").checked) {
      await addDoc("expenses", {
        category: "Factory Operations", subcategory: "Equipment Servicing",
        description: `Maintenance — ${entry.equipment}: ${entry.issue}`,
        amount: cost, date: entry.date, vendor: entry.technician,
        payment_method: "Cash", created_by: currentStaff.name
      });
    }
    closeModal(); showToast("Maintenance logged.");
  });
}
