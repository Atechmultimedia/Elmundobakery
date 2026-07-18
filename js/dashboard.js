/* ============================================================
   Dashboard
   ============================================================ */

function renderDashboard(root) {
  root = root || document.getElementById("moduleContent");
  const { start: todayStart, end: todayEnd } = rangeFor("today");
  const { start: monthStart, end: monthEnd } = rangeFor("month");

  const todaySales = store.sales.filter(s => withinRange(s.timestamp, todayStart, todayEnd));
  const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);

  const monthSales = store.sales.filter(s => withinRange(s.timestamp, monthStart, monthEnd));
  const monthRevenue = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const monthCOGS = monthSales.reduce((sum, s) =>
    sum + (s.items || []).reduce((iSum, it) => iSum + (it.unit_cost || 0) * it.qty, 0), 0);
  const monthExpenses = store.expenses
    .filter(e => withinRange(e.date, monthStart, monthEnd))
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const monthNetProfit = monthRevenue - monthCOGS - monthExpenses;

  const lowStock = store.ingredients.filter(i => i.stock_qty <= i.reorder_level);

  // Workbook-style totals
  const totalAssets = store.assets_register.reduce((s, a) => s + (a.cost || 0), 0);
  const outstandingDebt = store.vendor_debts.reduce((s, d) => s + Math.max(0, (d.amount_owed || 0) - (d.paid || 0)), 0);
  const monthWaste = store.waste_log
    .filter(w => withinRange(w.date, monthStart, monthEnd))
    .reduce((s, w) => s + (w.estimated_loss || 0), 0);
  const gbpRate = Number(localStorage.getItem("elmundo_gbp_rate")) || 0.0633;

  const now = new Date();
  const upcomingShifts = store.shifts
    .filter(sh => new Date(`${sh.date}T${sh.start_time || "00:00"}`) >= now)
    .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))
    .slice(0, 4);

  const pendingDeliveries = store.deliveries.filter(d => d.status === "pending" || d.status === "out_for_delivery");

  const setupSteps = [
    { done: store.products.length > 0, label: "Add your recipes & products", go: "recipes", hint: "Define what you bake, with ingredients and prices." },
    { done: store.ingredients.length > 0, label: "Add ingredients to inventory", go: "inventory", hint: "So bakes deduct stock and cost automatically." },
    { done: store.employees.length > 0, label: "Add your employees", go: "employees", hint: "The team, their pay, and clock-in PINs." },
    { done: store.suppliers.length > 0, label: "Add suppliers", go: "suppliers", hint: "Link them to ingredients for one-click reorders." },
    { done: store.sales.length > 0, label: "Make your first sale", go: "sales", hint: "Ring it up at the Point of Sale." }
  ];
  const remaining = setupSteps.filter(s => !s.done);
  const setupCard = remaining.length ? `
    <div class="setup-checklist">
      <div class="setup-checklist-head">
        <h3>Getting started — ${setupSteps.length - remaining.length}/${setupSteps.length} done</h3>
        <p>Finish setting up to unlock the full picture on this dashboard.</p>
      </div>
      <div class="setup-steps">
        ${setupSteps.map(s => `
          <div class="setup-step ${s.done ? "is-done" : ""}">
            <span class="setup-check">${s.done ? "✓" : "○"}</span>
            <div>
              <button class="setup-step-btn" onclick="goTo('${s.go}')" ${s.done ? "disabled" : ""}>${s.label}</button>
              <small>${s.hint}</small>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  // ---- Proactive alerts (reuses lowStock computed above) ----
  const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const expiring = store.production_log.filter(e => e.expiry_date && e.expiry_date <= soon);
  const payables = store.vendor_debts.filter(d => d.direction === "payable" && (d.amount_owed || 0) > (d.paid || 0));
  const payableTotal = payables.reduce((s, d) => s + ((d.amount_owed || 0) - (d.paid || 0)), 0);

  const alerts = [];
  if (lowStock.length) alerts.push({ level: "warn", icon: "📦", text: `<strong>${lowStock.length}</strong> ingredient${lowStock.length > 1 ? "s" : ""} at or below reorder level: ${lowStock.slice(0, 4).map(i => esc(i.name)).join(", ")}${lowStock.length > 4 ? "…" : ""}`, go: "inventory" });
  if (expiring.length) alerts.push({ level: "bad", icon: "⏰", text: `<strong>${expiring.length}</strong> production batch${expiring.length > 1 ? "es" : ""} expired or expiring within 2 days`, go: "production" });
  const ingBatchesSoon = (typeof expiringBatches === "function") ? expiringBatches(7) : [];
  if (ingBatchesSoon.length) alerts.push({ level: "warn", icon: "🥛", text: `<strong>${ingBatchesSoon.length}</strong> ingredient batch${ingBatchesSoon.length > 1 ? "es" : ""} expiring within 7 days`, go: "inventory" });
  if (payableTotal > 0) alerts.push({ level: "warn", icon: "💳", text: `You owe suppliers <strong>${fmtMoney(payableTotal)}</strong> across ${payables.length} account${payables.length > 1 ? "s" : ""}`, go: "vendordebts" });

  // Today's sales summary (reuses todaySales + todayRevenue computed above)
  const todayUnits = todaySales.reduce((s, x) => s + (x.items || []).reduce((c, i) => c + i.qty, 0), 0);
  const prodCount = {};
  todaySales.forEach(s => (s.items || []).forEach(i => { prodCount[i.name] = (prodCount[i.name] || 0) + i.qty; }));
  const bestToday = Object.entries(prodCount).sort((a, b) => b[1] - a[1])[0];

  const alertsCard = alerts.length ? `
    <div class="alerts-card">
      ${alerts.map(a => `<div class="alert-line alert-${a.level}" onclick="goTo('${a.go}')"><span>${a.icon}</span><span>${a.text}</span><span class="alert-go">View →</span></div>`).join("")}
    </div>` : "";

  const todayCard = `
    <div class="today-card">
      <div class="today-head">Today at a glance</div>
      <div class="today-stats">
        <div><span class="today-num">${fmtMoney(todayRevenue)}</span><span class="today-lbl">sales today</span></div>
        <div><span class="today-num">${todayUnits.toLocaleString()}</span><span class="today-lbl">items sold</span></div>
        <div><span class="today-num">${todaySales.length}</span><span class="today-lbl">transactions</span></div>
        <div><span class="today-num" style="font-size:1.1rem;">${bestToday ? esc(bestToday[0]) : "—"}</span><span class="today-lbl">best seller${bestToday ? " (" + bestToday[1] + ")" : ""}</span></div>
      </div>
    </div>`;

  root.innerHTML = setupCard + alertsCard + todayCard + `
    <div class="panel-head">
      <h2>Dashboard</h2>
      <p class="panel-sub">Welcome back, ${esc(currentStaff.name)}. Here's how El Mundo is doing right now.</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Today's revenue</span>
        <span class="kpi-value">${fmtMoney(todayRevenue)}</span>
        <span class="kpi-sub">${todaySales.length} order${todaySales.length === 1 ? "" : "s"}</span>
      </div>
      <div class="kpi-card ${monthNetProfit < 0 ? "kpi-bad" : ""}">
        <span class="kpi-label">Net profit — this month</span>
        <span class="kpi-value">${fmtMoney(monthNetProfit)}</span>
        <span class="kpi-sub">${fmtMoney(monthRevenue)} revenue − ${fmtMoney(monthCOGS)} COGS − ${fmtMoney(monthExpenses)} expenses</span>
      </div>
      <div class="kpi-card ${lowStock.length ? "kpi-bad" : ""}">
        <span class="kpi-label">Low stock ingredients</span>
        <span class="kpi-value">${lowStock.length}</span>
        <span class="kpi-sub">${lowStock.length ? lowStock.map(i => esc(i.name)).join(", ") : "All good"}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Deliveries in progress</span>
        <span class="kpi-value">${pendingDeliveries.length}</span>
        <span class="kpi-sub">pending or out for delivery</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Total assets</span>
        <span class="kpi-value">${fmtMoney(totalAssets)}</span>
        <span class="kpi-sub">≈ £${(totalAssets * gbpRate).toLocaleString(undefined,{maximumFractionDigits:2})}</span>
      </div>
      <div class="kpi-card ${outstandingDebt > 0 ? "kpi-bad" : ""}">
        <span class="kpi-label">Outstanding vendor debt</span>
        <span class="kpi-value">${fmtMoney(outstandingDebt)}</span>
        <span class="kpi-sub">credit sales not yet paid</span>
      </div>
      <div class="kpi-card ${monthWaste > 0 ? "kpi-bad" : ""}">
        <span class="kpi-label">Waste loss — this month</span>
        <span class="kpi-value">${fmtMoney(monthWaste)}</span>
        <span class="kpi-sub">returns, spoilage & losses</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">GBP equivalent (net profit)</span>
        <span class="kpi-value">£${(monthNetProfit * gbpRate).toLocaleString(undefined,{maximumFractionDigits:2})}</span>
        <span class="kpi-sub">rate <input type="number" id="gbpRateInput" step="0.0001" min="0" value="${gbpRate}" style="width:76px;padding:2px 5px;border:1px solid var(--line);border-radius:4px;font-size:0.75rem;"> GBP per GHS</span>
      </div>
    </div>

    <div class="dash-columns">
      <div class="dash-col">
        <h3 class="dash-col-title">Upcoming shifts</h3>
        ${upcomingShifts.length ? `
          <ul class="simple-list">
            ${upcomingShifts.map(sh => `
              <li><strong>${esc(sh.staff_name)}</strong> — ${fmtDate(sh.date)}, ${sh.start_time}–${sh.end_time}</li>
            `).join("")}
          </ul>` : `<p class="empty-state">No shifts scheduled yet.</p>`}
      </div>
      <div class="dash-col">
        <h3 class="dash-col-title">Recent orders</h3>
        ${store.sales.length ? `
          <ul class="simple-list">
            ${[...store.sales].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0,5).map(s => `
              <li><strong>${fmtMoney(s.total)}</strong> — ${esc(s.customer_name || "Walk-in")} · ${fmtDateTime(s.timestamp)}</li>
            `).join("")}
          </ul>` : `<p class="empty-state">No sales logged yet.</p>`}
      </div>
    </div>
  `;

  const rateInput = document.getElementById("gbpRateInput");
  if (rateInput) rateInput.addEventListener("change", () => {
    localStorage.setItem("elmundo_gbp_rate", rateInput.value);
    renderDashboard(root);
  });
}
