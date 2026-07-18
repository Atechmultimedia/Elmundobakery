/* ============================================================
   Break-even analysis + cash-flow view.
   Answers: how much must we sell to not make a loss, and is
   cash actually coming in faster than it's going out?
   ============================================================ */

function renderBreakeven(root) {
  root = root || document.getElementById("moduleContent");
  const cfg = getSettings();
  const fixed = Number(cfg.monthly_fixed_costs || 0);

  // Weighted average contribution margin per unit across products actually sold (last 30 days)
  const cutoff = new Date(Date.now() - 30 * 86400000);
  const sold = {};
  store.sales.forEach(sl => {
    if (new Date(sl.timestamp) < cutoff) return;
    (sl.items || []).forEach(i => {
      const key = i.product_id || i.name;
      if (!sold[key]) sold[key] = { name: i.name, qty: 0, revenue: 0, varCost: 0 };
      sold[key].qty += i.qty;
      sold[key].revenue += (i.unit_price || 0) * i.qty;
      // Variable cost must match the SIZE actually sold — a 300 g loaf does not
      // cost what a 600 g loaf costs, and using the standard unit's cost for
      // every sale can make a profitable small loaf look unbreakeven-able.
      // Overhead is deliberately excluded: it's the fixed cost we're solving for.
      const p = productById(i.product_id);
      let varUnit;
      if (p) {
        const size = findSize(p, i.size_name);
        varUnit = Math.max(0, sizeFullCost(p, size) - overheadPerUnit());
      } else {
        varUnit = i.unit_cost || 0;
      }
      sold[key].varCost += varUnit * i.qty;
    });
  });
  const products = Object.values(sold);
  const totalQty = products.reduce((s, p) => s + p.qty, 0);
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
  const totalVarCost = products.reduce((s, p) => s + p.varCost, 0);
  const avgPrice = totalQty ? totalRevenue / totalQty : 0;
  const avgVarCost = totalQty ? totalVarCost / totalQty : 0;
  const contributionPerUnit = avgPrice - avgVarCost;
  const contributionMarginPct = avgPrice ? (contributionPerUnit / avgPrice * 100) : 0;

  const breakevenUnits = contributionPerUnit > 0 ? Math.ceil(fixed / contributionPerUnit) : null;
  const breakevenRevenue = breakevenUnits !== null ? breakevenUnits * avgPrice : null;
  const breakevenPerDay = breakevenUnits !== null ? Math.ceil(breakevenUnits / 26) : null;

  // How are we doing this month vs break-even?
  const { start, end } = rangeFor("month");
  const monthSales = store.sales.filter(s => withinRange(s.timestamp, start, end));
  const monthUnits = monthSales.reduce((s, sl) => s + (sl.items || []).reduce((c, i) => c + i.qty, 0), 0);
  const monthRevenue = monthSales.reduce((s, sl) => s + (sl.total || 0), 0);
  const pctToBreakeven = breakevenUnits ? Math.min(100, (monthUnits / breakevenUnits * 100)) : 0;

  root.innerHTML = `
    <div class="panel-head"><h2>Break-even Analysis</h2><p class="panel-sub">How much you must sell each month to cover all fixed costs and avoid a loss.</p></div>

    ${fixed <= 0 ? `<div class="expiry-banner" style="background:var(--gold-mute);color:var(--crust,#6B5D4C);border-color:var(--gold);">Set your <strong>monthly fixed costs</strong> in Settings to calculate break-even.</div>` : ""}

    <div class="kpi-grid" style="margin-bottom:24px;">
      <div class="kpi-card"><span class="kpi-label">Break-even — units / month</span><span class="kpi-value">${breakevenUnits !== null ? breakevenUnits.toLocaleString() : "—"}</span><span class="kpi-sub">${breakevenPerDay !== null ? "≈ " + breakevenPerDay + " / day (26 days)" : "need positive margin"}</span></div>
      <div class="kpi-card"><span class="kpi-label">Break-even — revenue / month</span><span class="kpi-value">${breakevenRevenue !== null ? fmtMoney(breakevenRevenue) : "—"}</span></div>
      <div class="kpi-card"><span class="kpi-label">Contribution / unit</span><span class="kpi-value">${fmtMoney(contributionPerUnit)}</span><span class="kpi-sub">${contributionMarginPct.toFixed(0)}% of price</span></div>
      <div class="kpi-card ${monthUnits >= (breakevenUnits || Infinity) ? "" : "kpi-bad"}"><span class="kpi-label">This month so far</span><span class="kpi-value">${monthUnits.toLocaleString()} units</span><span class="kpi-sub">${fmtMoney(monthRevenue)}</span></div>
    </div>

    ${breakevenUnits !== null ? `
    <div class="dash-col" style="margin-bottom:24px;">
      <h3 class="dash-col-title">Progress to break-even this month</h3>
      <div class="breakeven-bar">
        <div class="breakeven-fill ${monthUnits >= breakevenUnits ? "past" : ""}" style="width:${pctToBreakeven.toFixed(1)}%;"></div>
        <div class="breakeven-label">${pctToBreakeven.toFixed(0)}% — ${monthUnits.toLocaleString()} of ${breakevenUnits.toLocaleString()} units</div>
      </div>
      <p class="modal-hint" style="margin-top:8px;">
        ${monthUnits >= breakevenUnits
          ? `✓ You've passed break-even — every further sale adds ${fmtMoney(contributionPerUnit)} profit.`
          : `${(breakevenUnits - monthUnits).toLocaleString()} more units to cover this month's costs.`}
      </p>
    </div>` : ""}

    <h3 class="dash-col-title">How it's calculated</h3>
    <div class="table-wrap" style="max-width:520px;">
      <table class="ledger-table">
        <tbody>
          <tr><td>Average selling price / unit</td><td class="num">${fmtMoney(avgPrice)}</td></tr>
          <tr><td>Average variable cost / unit</td><td class="num">${fmtMoney(avgVarCost)}</td></tr>
          <tr><td><strong>Contribution / unit</strong></td><td class="num"><strong>${fmtMoney(contributionPerUnit)}</strong></td></tr>
          <tr><td>Monthly fixed costs</td><td class="num">${fmtMoney(fixed)}</td></tr>
          <tr style="border-top:2px solid var(--pine);"><td><strong>Break-even = fixed ÷ contribution</strong></td><td class="num"><strong>${breakevenUnits !== null ? breakevenUnits.toLocaleString() + " units" : "—"}</strong></td></tr>
        </tbody>
      </table>
    </div>
    <p class="modal-hint">Variable cost = ingredients + labour + energy + packaging. Overhead is part of your fixed costs, so it's not double-counted here.</p>
  `;
}

function renderCashflow(root) {
  root = root || document.getElementById("moduleContent");

  // Last 6 months of cash in vs cash out
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const salesIn = store.sales.filter(s => withinRange(s.timestamp, mStart, mEnd)).reduce((s, x) => s + (x.total || 0), 0);
    // Sum the payments that actually landed this month. Older debts have no
    // payment history, so fall back to their total — correct for a debt settled
    // in one go, which is what the old records almost always are.
    const debtIn = store.vendor_debts.reduce((s, v) => {
      if (Array.isArray(v.payments) && v.payments.length) {
        return s + v.payments.filter(p => withinRange(p.datetime || p.date, mStart, mEnd))
                             .reduce((a, p) => a + (p.amount || 0), 0);
      }
      return s + ((v.last_payment && withinRange(v.last_payment, mStart, mEnd)) ? (v.paid || 0) : 0);
    }, 0);
    const transferIn = store.transfers.filter(t => t.status === "Delivered" && withinRange(t.date, mStart, mEnd)).reduce((s, t) => s + (t.amount_ghs || 0), 0);
    const equityIn = store.equity_records.filter(e => (e.type === "Capital Contribution" || e.type === "Loan from Owner") && withinRange(e.date, mStart, mEnd)).reduce((s, e) => s + (e.amount || 0), 0);
    // Paid standalone invoices: wholesale money that never passed the POS.
    // Invoices tied to a sale are excluded — that cash is already in salesIn.
    const invoiceIn = store.invoices
      .filter(inv => inv.status === "Paid" && !inv.sale_id && (inv.source || "standalone") === "standalone")
      .filter(inv => withinRange(inv.paid_at || inv.date, mStart, mEnd))
      .reduce((s, inv) => s + (inv.total || 0), 0);
    const cashIn = salesIn + debtIn + transferIn + equityIn + invoiceIn;

    const expOut = store.expenses.filter(e => withinRange(e.date, mStart, mEnd)).reduce((s, e) => s + (e.amount || 0), 0);
    const poOut = store.purchase_orders.filter(p => p.status === "received" && withinRange(p.received_date || p.order_date, mStart, mEnd)).reduce((s, p) => s + (p.total_cost || 0), 0);
    const assetOut = store.assets_register.filter(a => withinRange(a.purchase_date, mStart, mEnd)).reduce((s, a) => s + (a.cost || 0), 0);
    // Payroll is NOT added separately: posting a pay run already writes an
    // expense (category "Payroll"), so it's inside expOut. Adding payroll_runs
    // on top counted every wage bill twice.
    const cashOut = expOut + poOut + assetOut;

    months.push({ label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }), cashIn, cashOut, net: cashIn - cashOut });
  }
  const maxVal = Math.max(1, ...months.map(m => Math.max(m.cashIn, m.cashOut)));
  const runningNet = months.reduce((s, m) => s + m.net, 0);
  const thisMonth = months[months.length - 1];

  root.innerHTML = `
    <div class="panel-head"><h2>Cash Flow</h2><p class="panel-sub">Money actually coming in vs going out — because profit on paper isn't the same as cash in hand.</p></div>

    <div class="kpi-grid" style="margin-bottom:24px;">
      <div class="kpi-card ${thisMonth.net < 0 ? "kpi-bad" : ""}"><span class="kpi-label">This month — net cash</span><span class="kpi-value">${fmtMoney(thisMonth.net)}</span><span class="kpi-sub">${fmtMoney(thisMonth.cashIn)} in · ${fmtMoney(thisMonth.cashOut)} out</span></div>
      <div class="kpi-card ${runningNet < 0 ? "kpi-bad" : ""}"><span class="kpi-label">Net cash — last 6 months</span><span class="kpi-value">${fmtMoney(runningNet)}</span></div>
      <div class="kpi-card"><span class="kpi-label">Avg monthly cash in</span><span class="kpi-value">${fmtMoney(months.reduce((s, m) => s + m.cashIn, 0) / 6)}</span></div>
    </div>

    <h3 class="dash-col-title">Cash in vs out — last 6 months</h3>
    <div class="cashflow-chart">
      ${months.map(m => `
        <div class="cf-month">
          <div class="cf-bars">
            <div class="cf-bar cf-in" style="height:${(m.cashIn / maxVal * 100).toFixed(1)}%;" title="In: ${fmtMoney(m.cashIn)}"></div>
            <div class="cf-bar cf-out" style="height:${(m.cashOut / maxVal * 100).toFixed(1)}%;" title="Out: ${fmtMoney(m.cashOut)}"></div>
          </div>
          <div class="cf-net ${m.net < 0 ? "neg" : ""}">${m.net >= 0 ? "+" : ""}${(m.net / 1000).toFixed(1)}k</div>
          <div class="cf-label">${m.label}</div>
        </div>
      `).join("")}
    </div>
    <div class="cf-legend"><span class="cf-key cf-in"></span> Cash in <span class="cf-key cf-out"></span> Cash out</div>

    <div class="table-wrap" style="margin-top:24px;">
      <table class="ledger-table">
        <thead><tr><th>Month</th><th>Cash in</th><th>Cash out</th><th>Net</th></tr></thead>
        <tbody>
          ${months.map(m => `
            <tr class="${m.net < 0 ? "row-low" : ""}">
              <td>${m.label}</td>
              <td class="num">${fmtMoney(m.cashIn)}</td>
              <td class="num">${fmtMoney(m.cashOut)}</td>
              <td class="num" style="color:${m.net < 0 ? "var(--oven)" : "var(--herb)"};"><strong>${fmtMoney(m.net)}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <p class="modal-hint">Cash in: sales, debt payments, transfers received, capital. Cash out: expenses, received purchase orders, asset purchases, payroll.</p>
  `;
}
