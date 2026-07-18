/* ============================================================
   Accounting (P&L) · Customers & Loyalty · Backup/Restore ·
   Settings · Ghana GRA tax helpers
   ============================================================ */

/* ---------------- Settings (shared config) ---------------- */

/* Settings are SHARED across devices via Firestore, with a localStorage cache
   so the app still works before the first sync lands and while offline.

   This matters more than it looks: every cost calculation reads these. When
   they lived only in localStorage, Ivan's laptop and the shop tablet quoted
   different costs for the same loaf — one said a loss, the other a profit. */
function getSettings() {
  let cfg = {};
  const shared = (typeof store !== "undefined" && store.app_settings || []).find(d => d && d.id === "config");
  if (shared) {
    cfg = shared;
  } else {
    try { cfg = JSON.parse(localStorage.getItem("elmundo_settings") || "{}"); } catch (e) { cfg = {}; }
  }
  return {
    business_name: cfg.business_name || "El Mundo Bakery",
    address: cfg.address || "Powerland, Madina — Accra",
    phone: cfg.phone || "0556492858",
    receipt_footer: cfg.receipt_footer || "Our goodness in everyday bite — thank you for your business.",
    fda_number: cfg.fda_number || "",        // printed on product labels if you have one
    social_handle: cfg.social_handle || "",  // e.g. @elmundobakery
    label_template: cfg.label_template || "classic",
    label_colors: cfg.label_colors || null,  // null = use the brand palette
    label_art: cfg.label_art || "loaf",
    label_logo: cfg.label_logo !== false,
    tax_enabled: cfg.tax_enabled || false,
    vat: cfg.vat ?? 15,          // VAT %
    nhil: cfg.nhil ?? 2.5,       // National Health Insurance Levy
    getfund: cfg.getfund ?? 2.5, // GETFund Levy
    covid: cfg.covid ?? 1,       // COVID-19 Health Recovery Levy
    loyalty_enabled: cfg.loyalty_enabled ?? true,
    loyalty_rate: cfg.loyalty_rate ?? 1,   // points per GHS 1 spent
    loyalty_value: cfg.loyalty_value ?? 0.05, // GHS value per point when redeemed
    monthly_overhead: cfg.monthly_overhead ?? 0, // rent + admin + delivery pool, spread per unit
    monthly_fixed_costs: cfg.monthly_fixed_costs ?? 0, // for break-even (rent, salaries, etc.)

    // ---- Auto-costing: work labour and gas out from the baking method ----
    auto_costing: cfg.auto_costing ?? false,
    bakers_per_batch: cfg.bakers_per_batch ?? 1,
    work_hours_per_day: cfg.work_hours_per_day ?? 8,
    work_days_per_month: cfg.work_days_per_month ?? 26,
    lpg_cylinder_kg: cfg.lpg_cylinder_kg ?? 14.5,   // the common Ghanaian size
    lpg_refill_cost: cfg.lpg_refill_cost ?? 0,      // what YOU paid last refill
    lpg_bake_hours: cfg.lpg_bake_hours ?? 0,        // bake-hours one cylinder lasts
    oven_capacity: cfg.oven_capacity ?? 0           // units per oven load; 0 = whole batch fits
  };
}

function saveSettings(cfg) {
  // Cache on this device first — instant, and survives being offline.
  try { localStorage.setItem("elmundo_settings", JSON.stringify(cfg)); } catch (e) { /* private mode */ }
  // Then share it, so the POS and the office agree on what a loaf costs.
  const shared = { ...cfg };
  delete shared.id;
  if (typeof setDoc === "function") {
    setDoc("app_settings", "config", shared).catch(err => {
      console.error("Settings sync failed:", err);
      if (err && err.code === "permission-denied") {
        // Two different causes, two different fixes — don't guess wrong.
        const canShare = ["master", "admin", "manager"].includes((currentStaff || {}).role);
        showToast(canShare
          ? "Saved on this device only — publish your firestore.rules to share settings across every device."
          : "Saved on this device only — ask an admin to change the shared settings.", true);
      }
    });
  }
}

// GRA tax: levies (NHIL+GETFund+COVID) apply on base; VAT applies on (base + levies)
function computeGraTax(base) {
  const s = getSettings();
  if (!s.tax_enabled) return { base, levies: 0, vat: 0, total: base, breakdown: [] };
  const levyPct = (s.nhil + s.getfund + s.covid) / 100;
  const levies = base * levyPct;
  const vat = (base + levies) * (s.vat / 100);
  return {
    base, levies, vat, total: base + levies + vat,
    breakdown: [
      { label: `NHIL (${s.nhil}%)`, amount: base * s.nhil / 100 },
      { label: `GETFund (${s.getfund}%)`, amount: base * s.getfund / 100 },
      { label: `COVID Levy (${s.covid}%)`, amount: base * s.covid / 100 },
      { label: `VAT (${s.vat}%)`, amount: vat }
    ]
  };
}

function renderSettings(root) {
  root = root || document.getElementById("moduleContent");
  const s = getSettings();
  root.innerHTML = `
    <div class="panel-head"><h2>Settings</h2><p class="panel-sub">Business details, tax, and loyalty — used across receipts, invoices, and the POS.</p></div>

    <div class="dash-columns">
      <div class="dash-col">
        <h3 class="dash-col-title">Business details</h3>
        <form id="bizForm" class="modal-form">
          <label>Business name <input type="text" id="setName" value="${esc(s.business_name)}"></label>
          <label>Address <input type="text" id="setAddress" value="${esc(s.address)}"></label>
          <label>Phone <input type="text" id="setPhone" value="${esc(s.phone)}"></label>
          <label>Receipt footer message <input type="text" id="setFooter" value="${esc(s.receipt_footer)}"></label>
          <button type="submit" class="btn btn-primary">Save business details</button>
        </form>
      </div>

      <div class="dash-col">
        <h3 class="dash-col-title">Ghana GRA tax</h3>
        <form id="taxForm" class="modal-form">
          <label class="checkbox-label"><input type="checkbox" id="setTaxEnabled" ${s.tax_enabled ? "checked" : ""}> Charge VAT + levies on invoices</label>
          <div class="form-row-2">
            <label>VAT % <input type="number" step="0.1" id="setVat" value="${s.vat}"></label>
            <label>NHIL % <input type="number" step="0.1" id="setNhil" value="${s.nhil}"></label>
          </div>
          <div class="form-row-2">
            <label>GETFund % <input type="number" step="0.1" id="setGetfund" value="${s.getfund}"></label>
            <label>COVID Levy % <input type="number" step="0.1" id="setCovid" value="${s.covid}"></label>
          </div>
          <button type="submit" class="btn btn-primary">Save tax settings</button>
        </form>

        <h3 class="dash-col-title" style="margin-top:24px;">Costing &amp; break-even</h3>
        <form id="costForm" class="modal-form">
          <label>Monthly overhead to spread per unit (GHS)
            <input type="number" step="1" min="0" id="setOverhead" value="${s.monthly_overhead}">
          </label>
          <p class="modal-hint">Rent, admin salaries, delivery running costs — anything not already on a recipe. Divided across units sold to get true per-unit cost.</p>
          <label>Monthly fixed costs for break-even (GHS)
            <input type="number" step="1" min="0" id="setFixed" value="${s.monthly_fixed_costs}">
          </label>
          <p class="modal-hint">Total you must cover each month regardless of sales — used to calculate your break-even point.</p>
          <button type="submit" class="btn btn-primary">Save costing settings</button>
        </form>

        <h3 class="dash-col-title" style="margin-top:24px;">Automatic labour &amp; gas costing</h3>
        <form id="autoCostForm" class="modal-form">
          <label class="checkbox-label">
            <input type="checkbox" id="setAutoCosting" ${s.auto_costing ? "checked" : ""}>
            Work labour and gas out automatically from each recipe's baking method
          </label>
          <p class="modal-hint">Instead of typing a guess on every recipe, labour is charged on the <strong>hands-on minutes</strong> the method needs (not the hours dough spends proving), and gas on the <strong>minutes the oven is actually lit</strong>. Recipes with a typed-in figure keep using it until this can be worked out.</p>

          <div class="autocost-warn">
            <strong>⚠ Don't count your bakers twice.</strong> If you switch this on, take baker wages <em>out</em> of "Monthly fixed costs" above — otherwise break-even charges them once as a fixed cost and again inside each loaf. Keep rent, admin and power there; move baker pay here.
          </div>

          <h4 class="autocost-sub">Labour</h4>
          <div class="form-row-2">
            <label>Bakers working one batch
              <input type="number" step="1" min="1" id="setBakers" value="${s.bakers_per_batch}">
            </label>
            <label>Working hours per day
              <input type="number" step="0.5" min="1" id="setHoursDay" value="${s.work_hours_per_day}">
            </label>
          </div>
          <label>Working days per month
            <input type="number" step="1" min="1" id="setDaysMonth" value="${s.work_days_per_month}">
          </label>
          <p class="modal-hint">Rates come from your staff records — anyone whose role is baker or production manager. Monthly salaries and daily wages are converted to an hourly rate using the figures above. ${(() => {
            const r = bakerHourlyRate();
            return r > 0
              ? `Right now that works out to <strong>${fmtMoney(r)}/hour</strong> per baker.`
              : `<span style="color:var(--oven);">No baker pay rates found yet — add staff with the baker role and a wage, or labour will keep using the typed-in figures.</span>`;
          })()}</p>

          <h4 class="autocost-sub">Gas (LPG)</h4>
          <div class="form-row-2">
            <label>Cylinder size (kg)
              <input type="number" step="0.5" min="0" id="setCylKg" value="${s.lpg_cylinder_kg}">
            </label>
            <label>What a refill costs you (GHS)
              <input type="number" step="1" min="0" id="setCylCost" value="${s.lpg_refill_cost}">
            </label>
          </div>
          <div class="form-row-2">
            <label>Bake-hours one cylinder lasts
              <input type="number" step="0.5" min="0" id="setBakeHours" value="${s.lpg_bake_hours}">
            </label>
            <label>Oven capacity (units per load)
              <input type="number" step="1" min="0" id="setOvenCap" value="${s.oven_capacity}">
            </label>
          </div>
          <p class="modal-hint">Enter what <em>you</em> actually paid — not a national average. Prices move constantly and vary by vendor, so your receipt is the only figure worth trusting. ${(() => {
            const perKg = lpgPricePerKg(), perHr = gasCostPerHour();
            let out = "";
            if (perKg > 0) out += `That's <strong>${fmtMoney(perKg)}/kg</strong>. `;
            if (perHr > 0) out += `Oven time costs <strong>${fmtMoney(perHr)}/hour</strong>.`;
            else out += `<span style="color:var(--oven);">Set the bake-hours per cylinder to switch gas costing on.</span>`;
            return out;
          })()}</p>
          <p class="modal-hint"><strong>Don't know the bake-hours?</strong> Write today's date on your next cylinder when you fit it. When it runs out, check Manufacturing — add up the bake times of every batch since that date. That number is your bake-hours per cylinder. Leave 0 until you know; gas will keep using your typed-in figures. Oven capacity 0 means the whole batch fits in one load.</p>

          <button type="submit" class="btn btn-primary">Save auto-costing</button>
        </form>

        <h3 class="dash-col-title" style="margin-top:24px;">Loyalty</h3>
        <form id="loyaltyForm" class="modal-form">
          <label class="checkbox-label"><input type="checkbox" id="setLoyaltyEnabled" ${s.loyalty_enabled ? "checked" : ""}> Award loyalty points on sales</label>
          <div class="form-row-2">
            <label>Points per GHS 1 <input type="number" step="0.1" id="setLoyaltyRate" value="${s.loyalty_rate}"></label>
            <label>GHS value per point <input type="number" step="0.01" id="setLoyaltyValue" value="${s.loyalty_value}"></label>
          </div>
          <button type="submit" class="btn btn-primary">Save loyalty settings</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById("bizForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettings({ ...getSettings(),
      business_name: document.getElementById("setName").value.trim(),
      address: document.getElementById("setAddress").value.trim(),
      phone: document.getElementById("setPhone").value.trim(),
      receipt_footer: document.getElementById("setFooter").value.trim() });
    showToast("Business details saved.");
  });
  document.getElementById("taxForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettings({ ...getSettings(),
      tax_enabled: document.getElementById("setTaxEnabled").checked,
      vat: Number(document.getElementById("setVat").value),
      nhil: Number(document.getElementById("setNhil").value),
      getfund: Number(document.getElementById("setGetfund").value),
      covid: Number(document.getElementById("setCovid").value) });
    showToast("Tax settings saved.");
  });
  document.getElementById("costForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettings({ ...getSettings(),
      monthly_overhead: Number(document.getElementById("setOverhead").value || 0),
      monthly_fixed_costs: Number(document.getElementById("setFixed").value || 0) });
    showToast("Costing settings saved.");
  });
  document.getElementById("autoCostForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettings({ ...getSettings(),
      auto_costing: document.getElementById("setAutoCosting").checked,
      bakers_per_batch: Number(document.getElementById("setBakers").value || 1),
      work_hours_per_day: Number(document.getElementById("setHoursDay").value || 8),
      work_days_per_month: Number(document.getElementById("setDaysMonth").value || 26),
      lpg_cylinder_kg: Number(document.getElementById("setCylKg").value || 0),
      lpg_refill_cost: Number(document.getElementById("setCylCost").value || 0),
      lpg_bake_hours: Number(document.getElementById("setBakeHours").value || 0),
      oven_capacity: Number(document.getElementById("setOvenCap").value || 0) });
    showToast("Auto-costing saved — recipe sheets will update.");
    renderSettings();
  });
  document.getElementById("loyaltyForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettings({ ...getSettings(),
      loyalty_enabled: document.getElementById("setLoyaltyEnabled").checked,
      loyalty_rate: Number(document.getElementById("setLoyaltyRate").value),
      loyalty_value: Number(document.getElementById("setLoyaltyValue").value) });
    showToast("Loyalty settings saved.");
  });
}

/* ---------------- Accounting — Profit & Loss ---------------- */

let plPreset = "month";

function renderAccounting(root) {
  root = root || document.getElementById("moduleContent");
  const presets = { month: "This month", quarter: "This quarter", year: "This year", all: "All time" };

  let start, end;
  if (plPreset === "all") { start = new Date(0); end = new Date(8640000000000000); }
  else if (plPreset === "quarter") {
    const now = new Date(); const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1); end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
  } else if (plPreset === "year") {
    const y = new Date().getFullYear(); start = new Date(y, 0, 1); end = new Date(y, 11, 31, 23, 59, 59);
  } else { const r = rangeFor("month"); start = r.start; end = r.end; }

  const sales = store.sales.filter(s => withinRange(s.timestamp, start, end));
  const revenue = sales.reduce((s, x) => s + (x.total || 0), 0);
  const cogs = sales.reduce((s, x) => s + (x.items || []).reduce((c, i) => c + (i.unit_cost || 0) * i.qty, 0), 0);
  const grossProfit = revenue - cogs;

  // Operating expenses grouped by category (excluding COGS-style purchases already in COGS)
  const exp = store.expenses.filter(e => withinRange(e.date, start, end));
  const byCat = {};
  exp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + (e.amount || 0); });
  const totalExpenses = exp.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;
  const otherIncome = store.transfers.filter(t => withinRange(t.date, start, end)).reduce((s, t) => s + (t.amount_ghs || 0), 0);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div><h2>Accounting — Profit &amp; Loss</h2><p class="panel-sub">${presets[plPreset]}. Revenue, cost of goods, expenses, and net profit.</p></div>
      <div>
        <span class="segmented">${Object.entries(presets).map(([k, v]) => `<button class="seg-btn ${plPreset === k ? "is-active" : ""}" data-pl="${k}">${v}</button>`).join("")}</span>
        <button class="btn btn-ghost btn-small" id="plPdf">Export PDF</button>
      </div>
    </div>

    <div class="pl-statement">
      <div class="pl-row pl-head"><span>Revenue</span><span></span></div>
      <div class="pl-row"><span>Sales revenue</span><span>${fmtMoney(revenue)}</span></div>
      <div class="pl-row pl-sub"><span>Less: Cost of goods sold</span><span>(${fmtMoney(cogs)})</span></div>
      <div class="pl-row pl-total"><span>Gross profit</span><span>${fmtMoney(grossProfit)}</span></div>
      <div class="pl-row pl-note"><span>Gross margin</span><span>${revenue ? (grossProfit / revenue * 100).toFixed(1) : 0}%</span></div>

      <div class="pl-row pl-head" style="margin-top:16px;"><span>Operating expenses</span><span></span></div>
      ${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) =>
        `<div class="pl-row"><span>${esc(cat)}</span><span>(${fmtMoney(amt)})</span></div>`).join("") || `<div class="pl-row pl-note"><span>No expenses recorded</span><span>—</span></div>`}
      <div class="pl-row pl-total"><span>Total operating expenses</span><span>(${fmtMoney(totalExpenses)})</span></div>

      <div class="pl-row pl-grand ${netProfit < 0 ? "pl-loss" : ""}" style="margin-top:16px;">
        <span>Net ${netProfit < 0 ? "loss" : "profit"}</span><span>${fmtMoney(netProfit)}</span>
      </div>
      <div class="pl-row pl-note"><span>Net margin</span><span>${revenue ? (netProfit / revenue * 100).toFixed(1) : 0}%</span></div>
      ${otherIncome ? `<div class="pl-row pl-note"><span>Memo: capital/transfers received in period</span><span>${fmtMoney(otherIncome)}</span></div>` : ""}
    </div>
  `;

  root.querySelectorAll("[data-pl]").forEach(btn => btn.addEventListener("click", () => { plPreset = btn.dataset.pl; renderAccounting(root); }));
  document.getElementById("plPdf").addEventListener("click", () => {
    const rows = [["Revenue", fmtMoney(revenue)], ["Cost of goods sold", "(" + fmtMoney(cogs) + ")"], ["Gross profit", fmtMoney(grossProfit)],
      ...Object.entries(byCat).map(([c, a]) => [c, "(" + fmtMoney(a) + ")"]),
      ["Total expenses", "(" + fmtMoney(totalExpenses) + ")"], ["NET " + (netProfit < 0 ? "LOSS" : "PROFIT"), fmtMoney(netProfit)]];
    exportRowsToPDF("Profit & Loss — " + presets[plPreset], ["Item", "Amount"], rows);
  });
}

/* ---------------- Customers & Loyalty ---------------- */

function customerById(id) { return store.customers.find(c => c.id === id); }

const renderCustomers = genericModule({
  title: "Customers", collection: "customers",
  sub: "Repeat customers, their purchase history and loyalty points.",
  addLabel: "Add customer",
  fields: [
    { id: "name", label: "Name", type: "text", required: true },
    { id: "phone", label: "Phone", type: "text" },
    { id: "email", label: "Email (optional)", type: "text" },
    { id: "notes", label: "Notes / preferences", type: "textarea" }
  ],
  columns: [
    { label: "Customer", render: c => esc(c.name) },
    { label: "Phone", render: c => esc(c.phone || "") },
    { label: "Total spent", num: true, render: c => fmtMoney(customerSpend(c.id)) },
    { label: "Orders", num: true, render: c => customerOrderCount(c.id) },
    { label: "Loyalty points", num: true, render: c => `<strong>${Math.floor(c.points || 0)}</strong>` },
    { label: "Points value", num: true, render: c => fmtMoney((c.points || 0) * getSettings().loyalty_value) }
  ],
  summary: rows => {
    const totalPts = rows.reduce((s, c) => s + (c.points || 0), 0);
    return `<div class="kpi-card"><span class="kpi-label">Customers</span><span class="kpi-value">${rows.length}</span></div>
      <div class="kpi-card"><span class="kpi-label">Points outstanding</span><span class="kpi-value">${Math.floor(totalPts)}</span><span class="kpi-sub">worth ${fmtMoney(totalPts * getSettings().loyalty_value)}</span></div>`;
  }
});

function customerSpend(id) {
  return store.sales.filter(s => s.customer_id === id).reduce((s, x) => s + (x.total || 0), 0);
}
function customerOrderCount(id) {
  return store.sales.filter(s => s.customer_id === id).length;
}

/* ---------------- Backup & Restore ---------------- */

const BACKUP_COLLECTIONS = [
  "ingredients","products","production_log","sales","expenses","staff","employees","shifts",
  "payroll_runs","deliveries","suppliers","purchase_orders","campaigns","social_posts",
  "assets_register","maintenance_log","vendor_debts","waste_log","cash_recon","transfers",
  "crm_leads","invoices","equity_records","esg_log","signatures","timesheets","tickets",
  "quality_checks","fleet_vehicles","attendance","timeoff","candidates","appraisals",
  "approvals","documents","sms_campaigns","email_campaigns","online_orders","staff_documents",
  "stock_movements","production_plans","customers"
];

function renderBackup(root) {
  root = root || document.getElementById("moduleContent");
  const counts = BACKUP_COLLECTIONS.reduce((s, c) => s + (store[c] ? store[c].length : 0), 0);
  root.innerHTML = `
    <div class="panel-head"><h2>Backup &amp; Restore</h2><p class="panel-sub">Download a complete copy of all your business data, or restore from a backup file.</p></div>

    <div class="dash-columns">
      <div class="dash-col">
        <h3 class="dash-col-title">Download backup</h3>
        <p>Saves everything — ${counts.toLocaleString()} records across ${BACKUP_COLLECTIONS.length} areas — into one JSON file you can keep safe.</p>
        <button class="btn btn-primary" id="downloadBackupBtn">Download full backup</button>
        <p class="modal-hint" style="margin-top:10px;">Do this weekly. Keep the file somewhere safe (Google Drive, email to yourself).</p>
      </div>
      <div class="dash-col">
        <h3 class="dash-col-title">Restore from backup</h3>
        <p style="color:var(--oven);"><strong>Careful:</strong> restoring adds the records from a backup file back into the system. Use only to recover lost data.</p>
        <label>Backup file <input type="file" id="restoreFile" accept="application/json,.json"></label>
        <button class="btn btn-ghost" id="restoreBtn">Restore from file</button>
        <p class="modal-hint" id="restoreStatus"></p>
      </div>
    </div>

    ${currentStaff.role === "master" ? `
    <div class="danger-zone">
      <h3 class="dash-col-title" style="color:var(--oven);">⚠ Clear test data (before going live)</h3>
      <p>Removes all <strong>trial transactions</strong> so you start clean for real business:
      sales, online orders, invoices, deliveries, expenses, production logs, stock movements,
      waste, purchase orders, customers, CRM leads, payroll and cash records.</p>
      <p style="color:var(--pine);"><strong>Your setup is kept safe:</strong> products, recipes, ingredients,
      suppliers, staff and employees are <u>not</u> touched. Finished stock is reset to 0 so you can
      re-bake for real.</p>
      <p style="color:var(--oven);font-weight:600;">This cannot be undone. Download a backup first.</p>
      <label>Confirmation <input type="text" id="clearConfirmInput" placeholder="click button to fill" style="max-width:200px;"></label>
      <button class="btn" id="clearTestDataBtn" style="background:var(--oven);color:#fff;margin-top:8px;">Clear ALL test data now</button>
      <p class="modal-hint">Click once to fill the confirmation, then click again to clear.</p>
      <p class="modal-hint" id="clearStatus"></p>

      <hr style="border:none;border-top:1px solid rgba(198,40,40,0.2);margin:18px 0;">
      <h4 style="margin:0 0 6px;color:var(--oven);">Or clear just one type</h4>
      <p class="modal-hint" style="margin-bottom:10px;">Removes only that type of test record. Setup data stays safe. No "CLEAR" typing needed, but each asks for confirmation.</p>
      <div class="clear-one-grid">
        ${[
          ["sales", "Sales"],
          ["online_orders", "Online orders"],
          ["invoices", "Invoices"],
          ["deliveries", "Deliveries"],
          ["expenses", "Expenses"],
          ["production_log", "Production logs + reset stock"],
          ["customers", "Customers"],
          ["purchase_orders", "Purchase orders"],
          ["waste_log", "Waste records"]
        ].map(([coll, label]) => {
          const n = (store[coll] || []).length;
          return `<button class="btn btn-ghost btn-small clear-one-btn" data-clear-one="${coll}" data-label="${label}" ${n ? "" : "disabled"}>${label} (${n})</button>`;
        }).join("")}
      </div>
    </div>` : ""}
  `;

  document.getElementById("downloadBackupBtn").addEventListener("click", () => {
    const data = { _meta: { app: "El Mundo Bakery", exported_at: new Date().toISOString(), by: currentStaff.name } };
    BACKUP_COLLECTIONS.forEach(c => { data[c] = store[c] || []; });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `elmundo-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Backup downloaded.");
  });

  document.getElementById("restoreBtn").addEventListener("click", () => {
    const file = document.getElementById("restoreFile").files[0];
    if (!file) { showToast("Choose a backup file first.", true); return; }
    if (!confirm("Restore will re-add records from this file into your live data. Continue?")) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { showToast("That's not a valid backup file.", true); return; }
      const status = document.getElementById("restoreStatus");
      let restored = 0;
      for (const c of BACKUP_COLLECTIONS) {
        if (!Array.isArray(data[c])) continue;
        for (const rec of data[c]) {
          try {
            const { id, ...rest } = rec;
            if (id) await setDoc(c, id, rest); else await addDoc(c, rest);
            restored++;
            if (restored % 25 === 0) status.textContent = `Restored ${restored} records…`;
          } catch (e) { /* skip bad record */ }
        }
      }
      status.textContent = `Restore complete — ${restored} records written.`;
      showToast("Restore complete.");
    };
    reader.readAsText(file);
  });

  // ---- Clear test data (master only) ----
  const clearBtn = document.getElementById("clearTestDataBtn");
  if (clearBtn) clearBtn.addEventListener("click", async () => {
    const statusEl = document.getElementById("clearStatus");
    if (currentStaff.role !== "master") { showToast("Only the master admin can clear data.", true); return; }
    const inputEl = document.getElementById("clearConfirmInput");
    const typed = (inputEl.value || "").trim().toUpperCase();
    // First click on an empty box: fill in CLEAR for the user, then ask them to click again.
    if (typed !== "CLEAR") {
      inputEl.value = "CLEAR";
      inputEl.style.borderColor = "var(--oven, #c62828)";
      if (statusEl) statusEl.textContent = 'Confirmation filled in — click "Clear ALL test data now" once more to proceed.';
      showToast("Click the button once more to confirm clearing.");
      return;
    }
    if (!confirm("Last check: permanently delete ALL test transactions? Your products, recipes, ingredients, suppliers and staff are kept. This cannot be undone.")) return;

    clearBtn.disabled = true;
    let deleted = 0, failed = 0;
    for (const coll of TEST_DATA_COLLECTIONS) {
      const records = (store[coll] || []).slice();
      for (const rec of records) {
        try { await deleteDoc(coll, rec.id); deleted++; }
        catch (e) { failed++; console.error("Clear failed on", coll, rec.id, e); }
      }
      if (statusEl) statusEl.textContent = `Clearing… ${deleted} records removed so far.`;
    }
    // Reset finished stock to 0 (test bakes/sales moved it around)
    for (const p of (store.products || []).slice()) {
      const patch = zeroStockPatch(p);
      if (patch) { try { await updateDoc("products", p.id, patch); } catch (e) { /* non-fatal */ } }
    }
    if (statusEl) statusEl.textContent = `Done. Removed ${deleted} test record${deleted !== 1 ? "s" : ""}${failed ? `, ${failed} failed (check permissions)` : ""}. Finished stock reset to 0. You're ready for real business.`;
    showToast(`Test data cleared — ${deleted} records removed.`, failed > 0);
    clearBtn.disabled = false;
  });

  // ---- Clear ONE type of test data (master only) ----
  // First click on a type fills the confirmation field with its name and arms it.
  // Second click on the SAME type actually clears. Clicking a different type re-arms.
  let armedType = null;
  document.querySelectorAll("[data-clear-one]").forEach(btn => btn.addEventListener("click", async () => {
    if (currentStaff.role !== "master") { showToast("Only the master admin can clear data.", true); return; }
    const coll = btn.dataset.clearOne;
    const label = btn.dataset.label;
    const records = (store[coll] || []).slice();
    const inputEl = document.getElementById("clearConfirmInput");
    const statusEl = document.getElementById("clearStatus");
    if (!records.length) { showToast(`No ${label.toLowerCase()} to clear.`); return; }

    // FIRST click on this type: fill the input field and arm it (don't delete yet).
    if (armedType !== coll) {
      armedType = coll;
      if (inputEl) { inputEl.value = label + " — click again to clear"; inputEl.style.borderColor = "var(--oven, #c62828)"; }
      // Reset all type buttons to normal, highlight this one as armed
      document.querySelectorAll("[data-clear-one]").forEach(b => b.classList.remove("armed"));
      btn.classList.add("armed");
      if (statusEl) statusEl.textContent = `Ready to clear ${records.length} ${label.toLowerCase()} record${records.length !== 1 ? "s" : ""}. Click "${label}" again to confirm.`;
      showToast(`Click "${label}" again to confirm clearing.`);
      return;
    }

    // SECOND click on the same type: clear it.
    btn.disabled = true;
    let deleted = 0, failed = 0;
    for (const rec of records) {
      try { await deleteDoc(coll, rec.id); deleted++; }
      catch (e) { failed++; console.error("Clear failed on", coll, rec.id, e); }
    }
    // Clearing production logs? Reset finished stock to 0 too, since that stock
    // came from these bakes and is what shows as sellable in the POS.
    let stockReset = 0;
    if (coll === "production_log") {
      for (const p of (store.products || []).slice()) {
        const patch = zeroStockPatch(p);
        if (patch) {
          try { await updateDoc("products", p.id, patch); stockReset++; }
          catch (e) { /* non-fatal */ }
        }
      }
    }
    armedType = null;
    btn.classList.remove("armed");
    if (inputEl) { inputEl.value = ""; inputEl.style.borderColor = ""; }
    if (statusEl) statusEl.textContent = `Removed ${deleted} ${label.toLowerCase()} record${deleted !== 1 ? "s" : ""}${stockReset ? `, reset stock on ${stockReset} product${stockReset !== 1 ? "s" : ""} to 0` : ""}${failed ? `, ${failed} failed (check permissions)` : ""}.`;
    showToast(`${label} cleared — ${deleted} removed${stockReset ? `, stock reset` : ""}.`, failed > 0);
    btn.disabled = false;
  }));
}

// Transactional collections cleared by "Clear test data". Setup collections
// (products, ingredients, recipes, suppliers, staff, employees) are deliberately NOT here.
const TEST_DATA_COLLECTIONS = [
  "sales", "online_orders", "invoices", "deliveries", "expenses",
  "production_log", "stock_movements", "waste_log", "purchase_orders",
  "customers", "crm_leads", "payroll_runs", "cash_recon", "transfers",
  "vendor_debts", "production_plans", "attendance", "timesheets"
];


/* expose generic-module renderers globally for app.js routing */
window.renderCustomers = renderCustomers;

/* Build a patch that zeroes a product's finished stock — both the per-size
   stocks and the standard field. Returns null if there's nothing to reset. */
function zeroStockPatch(product) {
  const patch = {};
  if ((product.finished_stock_qty || 0) !== 0) patch.finished_stock_qty = 0;
  const sizes = (product.sizes || []).filter(s => s && s.name);
  if (sizes.some(s => (Number(s.stock) || 0) !== 0)) {
    patch.sizes = (product.sizes || []).map(s => ({ ...s, stock: 0 }));
  }
  return Object.keys(patch).length ? patch : null;
}
