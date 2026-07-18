/* ============================================================
   Double-entry accounting: chart of accounts, journal entries,
   general ledger, trial balance, and balance sheet.

   Every financial event posts balanced debits and credits to
   the "journal" collection. Nothing here changes how the rest
   of the app records data — it reads existing sales, expenses,
   assets, equity, debts and DERIVES proper ledger entries, so
   you get real accountant-grade statements with no double entry
   of data by hand.
   ============================================================ */

/* ---- Chart of accounts ----
   type: asset | liability | equity | income | expense
   normal: dr (assets, expenses) or cr (liabilities, equity, income) */
const CHART_OF_ACCOUNTS = [
  { code: "1000", name: "Cash & Mobile Money", type: "asset", normal: "dr" },
  { code: "1100", name: "Bank", type: "asset", normal: "dr" },
  { code: "1200", name: "Accounts Receivable (vendor debts)", type: "asset", normal: "dr" },
  { code: "1300", name: "Inventory — ingredients", type: "asset", normal: "dr" },
  { code: "1400", name: "Finished goods", type: "asset", normal: "dr" },
  { code: "1500", name: "Fixed Assets", type: "asset", normal: "dr" },
  { code: "2000", name: "Accounts Payable", type: "liability", normal: "cr" },
  { code: "3000", name: "Owner's Equity / Capital", type: "equity", normal: "cr" },
  { code: "3100", name: "Retained Earnings", type: "equity", normal: "cr" },
  { code: "4000", name: "Sales Revenue", type: "income", normal: "cr" },
  { code: "5000", name: "Cost of Goods Sold", type: "expense", normal: "dr" },
  { code: "6000", name: "Operating Expenses", type: "expense", normal: "dr" }
];

function accountByCode(code) { return CHART_OF_ACCOUNTS.find(a => a.code === code); }

function cashAccountFor(method) {
  return (method === "Bank Transfer" || method === "Card") ? "1100" : "1000";
}

/* Derive balanced journal lines from all existing records.
   Returns an array of { date, memo, lines:[{code, dr, cr}] }. */
function deriveJournal() {
  const J = [];
  const add = (date, memo, lines) => J.push({ date: (date || "").slice(0, 10), memo, lines });

  // Sales: Dr Cash/Bank (total), Cr Sales (total); plus Dr COGS, Cr Finished goods
  store.sales.forEach(s => {
    const cashCode = cashAccountFor(s.payment_method);
    add(s.timestamp, `Sale — ${s.customer_name || "walk-in"}`, [
      { code: cashCode, dr: s.total || 0, cr: 0 },
      { code: "4000", dr: 0, cr: s.total || 0 }
    ]);
    const cogs = (s.items || []).reduce((c, i) => c + (i.unit_cost || 0) * i.qty, 0);
    if (cogs > 0) add(s.timestamp, `COGS — sale`, [
      { code: "5000", dr: cogs, cr: 0 },
      { code: "1400", dr: 0, cr: cogs }
    ]);
  });

  // Expenses: Dr Operating Expenses (or COGS-ish stays in opex), Cr Cash/Bank
  store.expenses.forEach(e => {
    const cashCode = cashAccountFor(e.payment_method);
    add(e.date, `Expense — ${e.category}${e.subcategory ? " / " + e.subcategory : ""}`, [
      { code: "6000", dr: e.amount || 0, cr: 0 },
      { code: cashCode, dr: 0, cr: e.amount || 0 }
    ]);
  });

  // Purchases received → inventory. Cash purchase credits Cash; credit purchase credits Payables.
  store.purchase_orders.filter(po => po.status === "received").forEach(po => {
    const amt = po.total_cost || 0;
    if (amt <= 0) return;
    const onCredit = po.payment_terms === "credit" && !po.paid;
    add(po.received_date || po.order_date, `Purchase — ${po.supplier_name || ""}`, [
      { code: "1300", dr: amt, cr: 0 },
      { code: onCredit ? "2000" : "1000", dr: 0, cr: amt }
    ]);
  });

  // Supplier payables settled (money paid to suppliers we owed): Dr Payables, Cr Cash
  store.vendor_debts.filter(d => d.direction === "payable" && (d.paid || 0) > 0).forEach(d => {
    add(d.last_payment || d.created_at, `Paid supplier — ${d.vendor}`, [
      { code: "2000", dr: d.paid, cr: 0 },
      { code: "1000", dr: 0, cr: d.paid }
    ]);
  });

  // Fixed assets: Dr Fixed Assets, Cr Cash — then accumulated depreciation as expense
  store.assets_register.forEach(a => {
    if ((a.cost || 0) > 0) add(a.purchase_date, `Asset — ${a.name}`, [
      { code: "1500", dr: a.cost, cr: 0 },
      { code: "1000", dr: 0, cr: a.cost }
    ]);
    // accumulated depreciation to date: Dr Operating Expenses, Cr Fixed Assets
    const dep = (typeof assetAccumulatedDepreciation === "function") ? assetAccumulatedDepreciation(a) : 0;
    if (dep > 0) add(a.purchase_date, `Depreciation — ${a.name}`, [
      { code: "6000", dr: dep, cr: 0 },
      { code: "1500", dr: 0, cr: dep }
    ]);
  });

  // Vendor debts (credit sales): Dr A/R, Cr Sales; payments: Dr Cash, Cr A/R.
  // PAYABLES ARE EXCLUDED: a payable is money WE owe a supplier — it's already
  // booked by the purchase (Cr Accounts Payable) and settled above. Without
  // this filter every credit purchase was ALSO posted as our own revenue, and
  // every payment to a supplier as cash coming IN — inflating sales and cash
  // while the trial balance still balanced, so nothing looked wrong.
  store.vendor_debts.filter(d => d.direction !== "payable").forEach(d => {
    if ((d.amount_owed || 0) > 0) add(d.created_at, `Credit sale — ${d.vendor}`, [
      { code: "1200", dr: d.amount_owed, cr: 0 },
      { code: "4000", dr: 0, cr: d.amount_owed }
    ]);
    if ((d.paid || 0) > 0) add(d.last_payment || d.created_at, `Debt payment — ${d.vendor}`, [
      { code: "1000", dr: d.paid, cr: 0 },
      { code: "1200", dr: 0, cr: d.paid }
    ]);
  });

  // Standalone wholesale invoices — revenue that never went through the POS.
  // Invoices generated FROM a sale (sale_id set, or source online_order) are
  // excluded: their revenue is already in store.sales. Unpaid = receivable;
  // paid = cash. Booked at total, matching how POS sales post to 4000.
  store.invoices
    .filter(inv => !inv.sale_id && (inv.source || "standalone") === "standalone" && (inv.total || 0) > 0)
    .forEach(inv => {
      if (inv.status === "Paid") {
        add(inv.paid_at || inv.date, `Invoice INV-${String(inv.number).padStart(4, "0")} — ${inv.customer || ""}`, [
          { code: "1000", dr: inv.total, cr: 0 },
          { code: "4000", dr: 0, cr: inv.total }
        ]);
      } else {
        add(inv.date, `Invoice INV-${String(inv.number).padStart(4, "0")} (unpaid) — ${inv.customer || ""}`, [
          { code: "1200", dr: inv.total, cr: 0 },
          { code: "4000", dr: 0, cr: inv.total }
        ]);
      }
    });

  // Equity contributions / drawings.
  // "Share Allocation" is skipped: it records who owns what, not money moving.
  // Booking it as cash-in inflated the Cash account with money that never arrived.
  store.equity_records.forEach(r => {
    const amt = r.amount || 0;
    if (amt <= 0) return;
    if (r.type === "Share Allocation") return;
    if (r.type === "Owner Drawing" || r.type === "Loan Repayment") {
      add(r.date, `${r.type} — ${r.shareholder}`, [
        { code: "3000", dr: amt, cr: 0 },
        { code: "1000", dr: 0, cr: amt }
      ]);
    } else {
      add(r.date, `${r.type} — ${r.shareholder}`, [
        { code: "1000", dr: amt, cr: 0 },
        { code: "3000", dr: 0, cr: amt }
      ]);
    }
  });

  // Money transfers received (capital injected)
  store.transfers.filter(t => t.status === "Delivered").forEach(t => {
    const amt = t.amount_ghs || 0;
    if (amt > 0) add(t.date, `Transfer received — ${t.recipient}`, [
      { code: "1000", dr: amt, cr: 0 },
      { code: "3000", dr: 0, cr: amt }
    ]);
  });

  return J;
}

function accountBalances(journal, upto) {
  const bal = {};
  CHART_OF_ACCOUNTS.forEach(a => bal[a.code] = 0);
  journal.forEach(entry => {
    if (upto && entry.date > upto) return;
    entry.lines.forEach(l => {
      const acct = accountByCode(l.code);
      if (!acct) return;
      // store as signed balance in the account's normal direction
      const delta = (l.dr || 0) - (l.cr || 0);
      bal[l.code] += acct.normal === "dr" ? delta : -delta;
    });
  });
  return bal;
}

function renderLedger(root) {
  root = root || document.getElementById("moduleContent");
  const journal = deriveJournal().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const bal = accountBalances(journal);

  // Trial balance check
  let totalDr = 0, totalCr = 0;
  journal.forEach(e => e.lines.forEach(l => { totalDr += l.dr || 0; totalCr += l.cr || 0; }));

  const headers = ["Date", "Memo", "Account", "Debit", "Credit"];
  const exportRows = [];
  journal.forEach(e => e.lines.forEach(l => {
    const acct = accountByCode(l.code);
    exportRows.push([e.date, e.memo, acct ? acct.name : l.code, (l.dr || 0).toFixed(2), (l.cr || 0).toFixed(2)]);
  }));

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div><h2>General Ledger</h2><p class="panel-sub">Every transaction as balanced double-entry, derived automatically from your records.</p></div>
      <div>
        <button class="btn btn-ghost btn-small" id="ledgerXls">Export Excel</button>
        <button class="btn btn-ghost btn-small" id="ledgerPdf">Export PDF</button>
      </div>
    </div>

    <div class="kpi-grid" style="margin-bottom:20px;">
      <div class="kpi-card"><span class="kpi-label">Total debits</span><span class="kpi-value">${fmtMoney(totalDr)}</span></div>
      <div class="kpi-card"><span class="kpi-label">Total credits</span><span class="kpi-value">${fmtMoney(totalCr)}</span></div>
      <div class="kpi-card ${Math.abs(totalDr - totalCr) < 0.01 ? "" : "kpi-bad"}"><span class="kpi-label">Balance check</span><span class="kpi-value">${Math.abs(totalDr - totalCr) < 0.01 ? "✓ Balanced" : fmtMoney(totalDr - totalCr)}</span></div>
    </div>

    <h3 class="dash-col-title">Trial balance</h3>
    <div class="table-wrap" style="margin-bottom:26px;max-width:560px;">
      <table class="ledger-table">
        <thead><tr><th>Code</th><th>Account</th><th>Balance</th></tr></thead>
        <tbody>
          ${CHART_OF_ACCOUNTS.map(a => `
            <tr><td class="num">${a.code}</td><td>${esc(a.name)}</td><td class="num">${fmtMoney(bal[a.code] || 0)}</td></tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <h3 class="dash-col-title">Journal entries (${journal.length})</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Date</th><th>Memo</th><th>Account</th><th>Debit</th><th>Credit</th></tr></thead>
        <tbody>
          ${journal.slice(0, 120).map(e => e.lines.map((l, idx) => {
            const acct = accountByCode(l.code);
            return `<tr>
              <td class="num">${idx === 0 ? fmtDate(e.date) : ""}</td>
              <td>${idx === 0 ? esc(e.memo) : ""}</td>
              <td>${acct ? esc(acct.name) : l.code}</td>
              <td class="num">${l.dr ? fmtMoney(l.dr) : ""}</td>
              <td class="num">${l.cr ? fmtMoney(l.cr) : ""}</td>
            </tr>`;
          }).join("")).join("") || `<tr><td colspan="5" class="empty-state">No transactions yet.</td></tr>`}
        </tbody>
      </table>
    </div>
    ${journal.length > 120 ? `<p class="modal-hint">Showing the 120 most recent entries. Export for the full ledger.</p>` : ""}
  `;

  document.getElementById("ledgerXls").addEventListener("click", () => exportRowsToExcel("General Ledger", headers, exportRows));
  document.getElementById("ledgerPdf").addEventListener("click", () => exportRowsToPDF("General Ledger", headers, exportRows));
}

function renderBalanceSheet(root) {
  root = root || document.getElementById("moduleContent");
  const journal = deriveJournal();
  const bal = accountBalances(journal);

  const assets = CHART_OF_ACCOUNTS.filter(a => a.type === "asset");
  const liabilities = CHART_OF_ACCOUNTS.filter(a => a.type === "liability");
  const equity = CHART_OF_ACCOUNTS.filter(a => a.type === "equity");

  const totalAssets = assets.reduce((s, a) => s + (bal[a.code] || 0), 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + (bal[a.code] || 0), 0);

  // Net income (income - expenses) flows into equity as retained earnings
  const income = CHART_OF_ACCOUNTS.filter(a => a.type === "income").reduce((s, a) => s + (bal[a.code] || 0), 0);
  const expenses = CHART_OF_ACCOUNTS.filter(a => a.type === "expense").reduce((s, a) => s + (bal[a.code] || 0), 0);
  const netIncome = income - expenses;
  const baseEquity = equity.reduce((s, a) => s + (bal[a.code] || 0), 0);
  const totalEquity = baseEquity + netIncome;

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div><h2>Balance Sheet</h2><p class="panel-sub">As of ${fmtDate(new Date())}. Assets = Liabilities + Equity.</p></div>
      <button class="btn btn-ghost btn-small" id="bsPdf">Export PDF</button>
    </div>

    <div class="dash-columns">
      <div class="dash-col">
        <div class="pl-statement">
          <div class="pl-row pl-head"><span>Assets</span><span></span></div>
          ${assets.map(a => `<div class="pl-row"><span>${esc(a.name)}</span><span>${fmtMoney(bal[a.code] || 0)}</span></div>`).join("")}
          <div class="pl-row pl-grand"><span>Total assets</span><span>${fmtMoney(totalAssets)}</span></div>
        </div>
      </div>
      <div class="dash-col">
        <div class="pl-statement">
          <div class="pl-row pl-head"><span>Liabilities</span><span></span></div>
          ${liabilities.map(a => `<div class="pl-row"><span>${esc(a.name)}</span><span>${fmtMoney(bal[a.code] || 0)}</span></div>`).join("")}
          <div class="pl-row pl-total"><span>Total liabilities</span><span>${fmtMoney(totalLiabilities)}</span></div>

          <div class="pl-row pl-head" style="margin-top:14px;"><span>Equity</span><span></span></div>
          ${equity.map(a => `<div class="pl-row"><span>${esc(a.name)}</span><span>${fmtMoney(bal[a.code] || 0)}</span></div>`).join("")}
          <div class="pl-row"><span>Retained earnings (net income)</span><span>${fmtMoney(netIncome)}</span></div>
          <div class="pl-row pl-total"><span>Total equity</span><span>${fmtMoney(totalEquity)}</span></div>

          <div class="pl-row pl-grand ${Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? "" : "pl-loss"}" style="margin-top:14px;">
            <span>Liabilities + Equity</span><span>${fmtMoney(totalLiabilities + totalEquity)}</span>
          </div>
        </div>
      </div>
    </div>
    <p class="modal-hint" style="margin-top:12px;">${Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? "✓ The books balance." : "Note: small differences can appear when opening balances or historical data weren't entered as double-entry."}</p>
  `;

  document.getElementById("bsPdf").addEventListener("click", () => {
    const rows = [
      ["ASSETS", ""], ...assets.map(a => [a.name, fmtMoney(bal[a.code] || 0)]), ["Total assets", fmtMoney(totalAssets)],
      ["", ""], ["LIABILITIES", ""], ...liabilities.map(a => [a.name, fmtMoney(bal[a.code] || 0)]), ["Total liabilities", fmtMoney(totalLiabilities)],
      ["", ""], ["EQUITY", ""], ...equity.map(a => [a.name, fmtMoney(bal[a.code] || 0)]), ["Retained earnings", fmtMoney(netIncome)], ["Total equity", fmtMoney(totalEquity)]
    ];
    exportRowsToPDF("Balance Sheet — " + todayISO(), ["Item", "Amount"], rows);
  });
}
