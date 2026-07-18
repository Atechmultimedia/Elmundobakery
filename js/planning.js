/* ============================================================
   Production Planning — targets, projections, shopping list.
   Targets are suggested from the last 30 days of sales and
   fully editable. Everything downstream calculates itself.
   ============================================================ */

let planState = null;

function nextMonthISO() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

function suggestMonthlyQty(productId) {
  // Suggestion = units sold in the last 30 days (sales history),
  // falling back to units baked if there are no sales yet.
  const cutoff = new Date(Date.now() - 30 * 86400000);
  let sold = 0;
  store.sales.forEach(sl => {
    if (new Date(sl.timestamp) < cutoff) return;
    (sl.items || []).forEach(i => { if (i.product_id === productId) sold += i.qty; });
  });
  if (sold > 0) return Math.round(sold);
  let baked = 0;
  store.production_log.forEach(en => {
    if (new Date(en.timestamp) < cutoff) return;
    if (en.product_id === productId) baked += en.qty_baked;
  });
  return Math.round(baked);
}

function initPlanState() {
  const month = nextMonthISO();
  const saved = store.production_plans.find(p => p.id === month);
  planState = {
    month,
    horizon: 3,
    growth: saved ? (saved.growth_pct ?? 5) : 5,
    workingDays: saved ? (saved.working_days ?? 26) : 26,
    targets: {}
  };
  store.products.forEach(p => {
    planState.targets[p.id] = saved && saved.targets && saved.targets[p.id] !== undefined
      ? saved.targets[p.id]
      : suggestMonthlyQty(p.id);
  });
}

function avgMonthlyExpenses() {
  if (!store.expenses.length) return 0;
  const byMonth = {};
  store.expenses.forEach(e => {
    const m = (e.date || "").slice(0, 7);
    if (!m) return;
    byMonth[m] = (byMonth[m] || 0) + (e.amount || 0);
  });
  const months = Object.values(byMonth);
  return months.length ? months.reduce((a, b) => a + b, 0) / months.length : 0;
}

function renderPlanning(root) {
  root = root || document.getElementById("moduleContent");
  if (!planState) initPlanState();
  const ps = planState;

  /* ---- per-recipe rows for the base month ---- */
  const recipeRows = store.products.map(p => {
    const qty = Number(ps.targets[p.id]) || 0;
    const unitCost = productUnitCost(p);
    const revenue = qty * (p.selling_price || 0);
    const cost = qty * unitCost;
    const daily = ps.workingDays ? qty / ps.workingDays : 0;
    const batchesDay = p.yield_qty ? daily / p.yield_qty : 0;
    return { p, qty, unitCost, revenue, cost, gross: revenue - cost, daily, batchesDay, suggested: suggestMonthlyQty(p.id) };
  });

  const baseRevenue = recipeRows.reduce((s, r) => s + r.revenue, 0);
  const baseCost = recipeRows.reduce((s, r) => s + r.cost, 0);
  const baseGross = baseRevenue - baseCost;
  const opex = avgMonthlyExpenses();

  /* ---- multi-month projection ---- */
  const months = [];
  const [startY, startM] = ps.month.split("-").map(Number);
  for (let i = 0; i < ps.horizon; i++) {
    const d = new Date(startY, startM - 1 + i, 1);
    const factor = Math.pow(1 + (ps.growth / 100), i);
    const revenue = baseRevenue * factor;
    const cost = baseCost * factor;
    const gross = revenue - cost;
    months.push({
      label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      qty: recipeRows.reduce((s, r) => s + r.qty, 0) * factor,
      revenue, cost, gross, net: gross - opex
    });
  }
  const cumNet = months.reduce((s, m) => s + m.net, 0);

  /* ---- ingredient requirements & shortfalls for the base month ---- */
  const needs = {}; // ingredient_id -> qty needed
  recipeRows.forEach(r => {
    (r.p.ingredients || []).forEach(ri => {
      const batches = r.p.yield_qty ? r.qty / r.p.yield_qty : 0;
      needs[ri.ingredient_id] = (needs[ri.ingredient_id] || 0) + ri.qty_required * batches;
    });
  });
  const shopping = Object.entries(needs).map(([ingId, needed]) => {
    const ing = ingredientById(ingId);
    if (!ing) return null;
    const shortfall = Math.max(0, needed - (ing.stock_qty || 0));
    return { ing, needed, shortfall, cost: shortfall * (ing.cost_per_unit || 0) };
  }).filter(Boolean);
  const shoppingBudget = shopping.reduce((s, x) => s + x.cost, 0);

  /* ---- FORWARD FORECAST: total ingredient needs across the whole horizon ----
     Each future month grows by the growth %, so total = base * sum of growth factors. */
  let horizonFactor = 0;
  for (let i = 0; i < ps.horizon; i++) horizonFactor += Math.pow(1 + (ps.growth / 100), i);
  const forecast = Object.entries(needs).map(([ingId, monthlyNeed]) => {
    const ing = ingredientById(ingId);
    if (!ing) return null;
    const totalNeed = monthlyNeed * horizonFactor;
    const toBuy = Math.max(0, totalNeed - (ing.stock_qty || 0));
    return { ing, monthlyNeed, totalNeed, toBuy, cost: toBuy * (ing.cost_per_unit || 0),
             avgPerMonth: totalNeed / ps.horizon };
  }).filter(Boolean).sort((a, b) => b.cost - a.cost);
  const forecastBudget = forecast.reduce((s, x) => s + x.cost, 0);

  // group shortfalls by supplier for one-click POs
  const bySupplier = {};
  shopping.filter(x => x.shortfall > 0).forEach(x => {
    const key = x.ing.supplier_id || "__none";
    if (!bySupplier[key]) bySupplier[key] = { name: x.ing.supplier_name || "No supplier set", supplier_id: x.ing.supplier_id || null, items: [] };
    bySupplier[key].items.push(x);
  });

  const projHeaders = ["Month", "Units", "Revenue", "Ingredient cost", "Gross profit", "Est. net (after avg expenses)"];
  const projExport = months.map(m => [m.label, Math.round(m.qty), m.revenue.toFixed(2), m.cost.toFixed(2), m.gross.toFixed(2), m.net.toFixed(2)]);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Production Planning</h2>
        <p class="panel-sub">Set monthly targets per recipe — quantities, ingredients, purchasing, and profit project themselves.</p>
      </div>
      <div>
        <button class="btn btn-ghost btn-small" id="planXls">Export Excel</button>
        <button class="btn btn-ghost btn-small" id="planPdf">Export PDF</button>
        <button class="btn btn-primary" id="planSave">Save plan</button>
      </div>
    </div>

    <div class="ledger-form" style="margin-bottom:22px;">
      <label>Planning month <input type="month" id="planMonth" value="${ps.month}"></label>
      <label>Forecast horizon (auto-projects ingredients)
        <select id="planHorizon">
          ${[1,3,6,12].map(h => `<option value="${h}" ${ps.horizon === h ? "selected" : ""}>${h} month${h > 1 ? "s" : ""}</option>`).join("")}
        </select>
      </label>
      <label>Growth per month (%) <input type="number" step="0.5" id="planGrowth" value="${ps.growth}"></label>
      <label>Working days / month <input type="number" min="1" max="31" id="planDays" value="${ps.workingDays}"></label>
    </div>

    <h3 class="dash-col-title">Recipe targets — ${new Date(startY, startM - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
    <div class="table-wrap" style="margin-bottom:26px;">
      <table class="ledger-table">
        <thead><tr><th>Recipe</th><th>Monthly target</th><th>Suggested*</th><th>Per day</th><th>Batches/day</th><th>Revenue</th><th>Ingredient cost</th><th>Gross profit</th></tr></thead>
        <tbody>
          ${recipeRows.map(r => `
            <tr>
              <td><strong>${esc(r.p.name)}</strong></td>
              <td><input type="number" min="0" class="plan-target" data-plan-target="${r.p.id}" value="${r.qty}" style="width:90px;padding:6px 8px;border:1px solid var(--line);border-radius:4px;font-family:var(--font-mono);"></td>
              <td class="num" style="color:var(--char-soft);">${r.suggested}</td>
              <td class="num">${r.daily.toFixed(1)} ${esc(r.p.yield_unit)}(s)</td>
              <td class="num">${r.batchesDay.toFixed(1)}</td>
              <td class="num">${fmtMoney(r.revenue)}</td>
              <td class="num">${fmtMoney(r.cost)}</td>
              <td class="num"><strong>${fmtMoney(r.gross)}</strong></td>
            </tr>
          `).join("") || `<tr><td colspan="8" class="empty-state">Add products under Recipes &amp; Costing first.</td></tr>`}
        </tbody>
        ${recipeRows.length ? `<tfoot><tr><td colspan="5">Totals</td><td class="num">${fmtMoney(baseRevenue)}</td><td class="num">${fmtMoney(baseCost)}</td><td class="num">${fmtMoney(baseGross)}</td></tr></tfoot>` : ""}
      </table>
    </div>
    <p class="modal-hint" style="margin-top:-18px;margin-bottom:26px;">*Suggested = what actually sold (or was baked) in the last 30 days. Edit any target — everything recalculates instantly.</p>

    <h3 class="dash-col-title">Projection — next ${ps.horizon} month${ps.horizon > 1 ? "s" : ""} at ${ps.growth}% monthly growth</h3>
    <div class="table-wrap" style="margin-bottom:10px;">
      <table class="ledger-table">
        <thead><tr>${projHeaders.map(h => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${months.map(m => `
            <tr>
              <td><strong>${m.label}</strong></td>
              <td class="num">${Math.round(m.qty).toLocaleString()}</td>
              <td class="num">${fmtMoney(m.revenue)}</td>
              <td class="num">${fmtMoney(m.cost)}</td>
              <td class="num">${fmtMoney(m.gross)}</td>
              <td class="num" style="color:${m.net < 0 ? "var(--oven)" : "var(--herb)"};"><strong>${fmtMoney(m.net)}</strong></td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot><tr><td colspan="5">Cumulative projected net over ${ps.horizon} month${ps.horizon > 1 ? "s" : ""}</td><td class="num"><strong>${fmtMoney(cumNet)}</strong></td></tr></tfoot>
      </table>
    </div>
    <p class="modal-hint" style="margin-bottom:26px;">Est. net subtracts your average monthly operating expenses (${fmtMoney(opex)}, from the Finance ledger) each month.</p>

    <h3 class="dash-col-title">Ingredient shopping list — ${new Date(startY, startM - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
    <div class="table-wrap" style="margin-bottom:16px;">
      <table class="ledger-table">
        <thead><tr><th>Ingredient</th><th>Needed</th><th>In stock</th><th>To buy</th><th>Est. cost</th><th>Supplier</th></tr></thead>
        <tbody>
          ${shopping.map(x => `
            <tr class="${x.shortfall > 0 ? "row-low" : ""}">
              <td>${esc(x.ing.name)}</td>
              <td class="num">${fmtQty(x.needed, x.ing.unit)}</td>
              <td class="num">${fmtQty(x.ing.stock_qty, x.ing.unit)}</td>
              <td class="num"><strong>${x.shortfall > 0 ? fmtQty(x.shortfall, x.ing.unit) : "—"}</strong></td>
              <td class="num">${x.shortfall > 0 ? fmtMoney(x.cost) : "—"}</td>
              <td>${esc(x.ing.supplier_name || "—")}</td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="empty-state">Set some targets above to see requirements.</td></tr>`}
        </tbody>
        ${shopping.length ? `<tfoot><tr><td colspan="4">Purchasing budget for the month</td><td class="num"><strong>${fmtMoney(shoppingBudget)}</strong></td><td></td></tr></tfoot>` : ""}
      </table>
    </div>

    <h3 class="dash-col-title">📦 Ingredient forecast — total needed over ${ps.horizon} month${ps.horizon > 1 ? "s" : ""}</h3>
    <p class="modal-hint" style="margin-top:-8px;margin-bottom:12px;">Projected from your recipes and targets, grown ${ps.growth}% per month. This is how much of each ingredient you'll need across the whole ${ps.horizon}-month period.</p>
    <div class="table-wrap" style="margin-bottom:16px;">
      <table class="ledger-table">
        <thead><tr><th>Ingredient</th><th>Avg / month</th><th>Total over ${ps.horizon} mo</th><th>In stock</th><th>To buy</th><th>Est. cost</th><th>Supplier</th></tr></thead>
        <tbody>
          ${forecast.map(x => `
            <tr class="${x.toBuy > 0 ? "row-low" : ""}">
              <td><strong>${esc(x.ing.name)}</strong></td>
              <td class="num">${fmtQty(x.avgPerMonth, x.ing.unit)}</td>
              <td class="num"><strong>${fmtQty(x.totalNeed, x.ing.unit)}</strong></td>
              <td class="num">${fmtQty(x.ing.stock_qty, x.ing.unit)}</td>
              <td class="num"><strong>${x.toBuy > 0 ? fmtQty(x.toBuy, x.ing.unit) : "—"}</strong></td>
              <td class="num">${x.toBuy > 0 ? fmtMoney(x.cost) : "—"}</td>
              <td>${esc(x.ing.supplier_name || "—")}</td>
            </tr>
          `).join("") || `<tr><td colspan="7" class="empty-state">Set targets above to forecast ingredients.</td></tr>`}
        </tbody>
        ${forecast.length ? `<tfoot><tr><td colspan="5">Total ingredient budget for ${ps.horizon} month${ps.horizon > 1 ? "s" : ""}</td><td class="num"><strong>${fmtMoney(forecastBudget)}</strong></td><td></td></tr></tfoot>` : ""}
      </table>
    </div>
    <div style="margin-bottom:20px;">
      <button class="btn btn-ghost btn-small" id="forecastXls">Export forecast (Excel)</button>
      <button class="btn btn-ghost btn-small" id="forecastPdf">Export forecast (PDF)</button>
    </div>

    ${Object.keys(bySupplier).length ? `
      <div class="dash-col" style="margin-bottom:10px;">
        <h3 class="dash-col-title">Create purchase orders</h3>
        ${Object.values(bySupplier).map(g => `
          <p style="margin:6px 0;">
            <strong>${esc(g.name)}</strong> — ${g.items.length} item${g.items.length > 1 ? "s" : ""}, ${fmtMoney(g.items.reduce((s, x) => s + x.cost, 0))}
            ${g.supplier_id
              ? `<button class="btn btn-primary btn-small" data-plan-po="${g.supplier_id}" style="margin-left:10px;">Create PO</button>`
              : `<span class="modal-hint">— set a supplier on these ingredients to enable one-click ordering</span>`}
          </p>
        `).join("")}
      </div>` : ""}
  `;

  /* ---- events ---- */
  const rerenderPlan = () => renderPlanning(root);

  document.getElementById("planMonth").addEventListener("change", (e) => {
    ps.month = e.target.value || nextMonthISO();
    const saved = store.production_plans.find(pl => pl.id === ps.month);
    if (saved) {
      ps.growth = saved.growth_pct ?? ps.growth;
      ps.workingDays = saved.working_days ?? ps.workingDays;
      store.products.forEach(p => {
        if (saved.targets && saved.targets[p.id] !== undefined) ps.targets[p.id] = saved.targets[p.id];
      });
    }
    rerenderPlan();
  });
  document.getElementById("planHorizon").addEventListener("change", (e) => { ps.horizon = Number(e.target.value); rerenderPlan(); });
  document.getElementById("planGrowth").addEventListener("change", (e) => { ps.growth = Number(e.target.value) || 0; rerenderPlan(); });
  document.getElementById("planDays").addEventListener("change", (e) => { ps.workingDays = Math.max(1, Number(e.target.value) || 26); rerenderPlan(); });
  root.querySelectorAll("[data-plan-target]").forEach(inp => {
    inp.addEventListener("change", () => { ps.targets[inp.dataset.planTarget] = Number(inp.value) || 0; rerenderPlan(); });
  });

  document.getElementById("planSave").addEventListener("click", async () => {
    await setDoc("production_plans", ps.month, {
      targets: ps.targets, growth_pct: ps.growth, working_days: ps.workingDays,
      saved_by: currentStaff.name, saved_at: new Date().toISOString()
    });
    showToast(`Plan for ${ps.month} saved.`);
  });

  document.getElementById("planXls").addEventListener("click", () => exportRowsToExcel("Production Projection", projHeaders, projExport));
  document.getElementById("planPdf").addEventListener("click", () => exportRowsToPDF("Production Projection", projHeaders, projExport));

  const fHeaders = ["Ingredient", "Avg/month", "Total over " + ps.horizon + "mo", "In stock", "To buy", "Est. cost", "Supplier"];
  const fRows = forecast.map(x => [x.ing.name, fmtQty(x.avgPerMonth, x.ing.unit), fmtQty(x.totalNeed, x.ing.unit), fmtQty(x.ing.stock_qty, x.ing.unit), x.toBuy > 0 ? fmtQty(x.toBuy, x.ing.unit) : "0", x.toBuy.toFixed(2) > 0 ? x.cost.toFixed(2) : "0", x.ing.supplier_name || ""]);
  const fx = document.getElementById("forecastXls");
  if (fx) fx.addEventListener("click", () => exportRowsToExcel(ps.horizon + "-Month Ingredient Forecast", fHeaders, fRows));
  const fp = document.getElementById("forecastPdf");
  if (fp) fp.addEventListener("click", () => exportRowsToPDF(ps.horizon + "-Month Ingredient Forecast", fHeaders, fRows));

  root.querySelectorAll("[data-plan-po]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const g = bySupplier[btn.dataset.planPo];
      if (!g) return;
      if (!confirm(`Create a purchase order to ${g.name} for ${g.items.length} item(s), about ${fmtMoney(g.items.reduce((s, x) => s + x.cost, 0))}?`)) return;
      const items = g.items.map(x => ({
        ingredient_id: x.ing.id, name: x.ing.name,
        qty: Math.ceil(x.shortfall), unit_cost: x.ing.cost_per_unit || 0,
        line_total: Math.ceil(x.shortfall) * (x.ing.cost_per_unit || 0)
      }));
      await addDoc("purchase_orders", {
        supplier_id: g.supplier_id, supplier_name: g.name,
        items, total_cost: items.reduce((s, i) => s + i.line_total, 0),
        status: "ordered", order_date: new Date().toISOString(),
        source: `Production plan ${ps.month}`
      });
      showToast(`PO created for ${g.name}. Mark it received under Purchase when it arrives.`);
    });
  });
}
