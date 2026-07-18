/* ============================================================
   Vendor Debts · Waste Tracker · Cash Reconciliation · Transfers
   Mirrors the matching sheets in the management workbook.
   ============================================================ */

/* ---------------- Vendor Debts (credit sales) ---------------- */

function renderVendorDebts(root) {
  root = root || document.getElementById("moduleContent");
  const outstanding = store.vendor_debts.reduce((s, d) => s + Math.max(0, (d.amount_owed || 0) - (d.paid || 0)), 0);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Vendor Debts</h2>
        <p class="panel-sub">Credit sales and who still owes what. Outstanding: <strong>${fmtMoney(outstanding)}</strong></p>
      </div>
      <button class="btn btn-primary" id="addDebtBtn">Add credit sale</button>
    </div>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Vendor</th><th>Contact</th><th>Amount owed</th><th>Due date</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${[...store.vendor_debts].sort((a,b) => (a.due_date||"").localeCompare(b.due_date||"")).map(d => {
            const balance = Math.max(0, (d.amount_owed || 0) - (d.paid || 0));
            const overdue = balance > 0 && d.due_date && d.due_date < todayISO();
            return `
              <tr class="${overdue ? "row-low" : ""}">
                <td>${esc(d.vendor)}</td>
                <td>${esc(d.contact || "")}</td>
                <td class="num">${fmtMoney(d.amount_owed || 0)}</td>
                <td class="num">${fmtDate(d.due_date)}</td>
                <td class="num">${fmtMoney(d.paid || 0)}</td>
                <td class="num"><strong>${fmtMoney(balance)}</strong></td>
                <td>${balance <= 0
                  ? '<span class="status-pill status-ok">Settled</span>'
                  : overdue ? '<span class="status-pill status-low">Overdue</span>'
                  : '<span class="status-pill status-low" style="background:var(--gold-mute);color:var(--crust,#6B5D4C);">Open</span>'}</td>
                <td>${balance > 0 ? `<button class="btn btn-ghost btn-small" data-pay-debt="${d.id}">Record payment</button>` : ""}</td>
              </tr>
            `;
          }).join("") || `<tr><td colspan="8" class="empty-state">No credit sales recorded.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("addDebtBtn").addEventListener("click", openDebtForm);
  root.querySelectorAll("[data-pay-debt]").forEach(btn => {
    btn.addEventListener("click", () => recordDebtPayment(btn.dataset.payDebt));
  });
}

function openDebtForm() {
  openModal(`
    <h3>Add credit sale</h3>
    <form id="debtForm" class="modal-form">
      <label>Vendor / customer <input type="text" id="dbVendor" required></label>
      <label>Contact (phone) <input type="text" id="dbContact"></label>
      <div class="form-row-2">
        <label>Amount owed (GHS) <input type="number" step="0.01" min="0.01" id="dbAmount" required></label>
        <label>Due date <input type="date" id="dbDue" value="${todayISO()}"></label>
      </div>
      <label>Notes <input type="text" id="dbNotes"></label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="dbCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Add</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("dbCancelBtn").addEventListener("click", closeModal);
  document.getElementById("debtForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc("vendor_debts", {
      vendor: document.getElementById("dbVendor").value.trim(),
      contact: document.getElementById("dbContact").value.trim(),
      amount_owed: Number(document.getElementById("dbAmount").value),
      due_date: document.getElementById("dbDue").value,
      paid: 0,
      notes: document.getElementById("dbNotes").value.trim()
    });
    closeModal(); showToast("Credit sale recorded.");
  });
}

async function recordDebtPayment(id) {
  const d = store.vendor_debts.find(x => x.id === id);
  if (!d) return;
  const balance = (d.amount_owed || 0) - (d.paid || 0);
  const input = prompt(`${d.vendor} owes ${fmtMoney(balance)}. How much are they paying now (GHS)?`, balance.toFixed(2));
  if (input === null) return;
  const amount = Number(input);
  if (!amount || amount <= 0) { showToast("Enter a valid amount.", true); return; }
  // Keep a payment history, not just a running total. Cash flow needs to know
  // WHEN each payment landed — a cumulative figure attributed to the last
  // payment date counts January's money again in March.
  await updateDoc("vendor_debts", id, {
    paid: (d.paid || 0) + amount,
    last_payment: todayISO(),
    payments: [...(d.payments || []), { amount, date: todayISO(), datetime: new Date().toISOString(), by: currentStaff.name }]
  });
  showToast(`Payment of ${fmtMoney(amount)} recorded.`);
}

/* ---------------- Waste Tracker ---------------- */

function renderWaste(root) {
  root = root || document.getElementById("moduleContent");
  const { start, end } = rangeFor("month");
  const monthLoss = store.waste_log
    .filter(w => withinRange(w.date, start, end))
    .reduce((s, w) => s + (w.estimated_loss || 0), 0);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Waste Tracker</h2>
        <p class="panel-sub">Returns, spoilage and losses. This month: <strong>${fmtMoney(monthLoss)}</strong> lost.</p>
      </div>
      <button class="btn btn-primary" id="addWasteBtn">Log waste / return</button>
    </div>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Date</th><th>Product</th><th>Reason</th><th>Quantity</th><th>Estimated loss</th><th>Action taken</th></tr></thead>
        <tbody>
          ${[...store.waste_log].sort((a,b) => (b.date||"").localeCompare(a.date||"")).map(w => `
            <tr>
              <td class="num">${fmtDate(w.date)}</td>
              <td>${esc(w.product_name)}</td>
              <td>${esc(w.reason)}</td>
              <td class="num">${w.qty}</td>
              <td class="num">${fmtMoney(w.estimated_loss || 0)}</td>
              <td>${esc(w.action || "")}</td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="empty-state">No waste logged — long may it continue.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("addWasteBtn").addEventListener("click", openWasteForm);
}

function openWasteForm() {
  openModal(`
    <h3>Log waste / return</h3>
    <form id="wasteForm" class="modal-form">
      <label>Product
        ${store.products.length
          ? `<select id="wsProduct">${store.products.flatMap(p => productSizes(p).map(sz => `<option value="${p.id}|${esc(sz.name)}">${esc(p.name)}${sz.isStandard ? "" : " — " + esc(sz.name)} (${sz.stock} in stock)</option>`)).join("")}<option value="">Other</option></select>`
          : `<input type="text" id="wsProduct" required>`}
      </label>
      <div class="form-row-2">
        <label>Quantity <input type="number" step="0.01" min="0.01" id="wsQty" required></label>
        <label>Date <input type="date" id="wsDate" value="${todayISO()}" required></label>
      </div>
      <label>Reason
        <select id="wsReason">${WASTE_REASONS.map(r => `<option>${r}</option>`).join("")}</select>
      </label>
      <label>Action taken <input type="text" id="wsAction" placeholder="e.g. discarded, donated, refunded"></label>
      <label class="checkbox-label"><input type="checkbox" id="wsDeduct" checked> Deduct from finished stock</label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="wsCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Log</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("wsCancelBtn").addEventListener("click", closeModal);
  document.getElementById("wasteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const productEl = document.getElementById("wsProduct");
    const qty = Number(document.getElementById("wsQty").value);
    // The select carries "productId|sizeName" so waste hits the right size.
    const raw = productEl.value || "";
    // Split on the FIRST "|" only — a size name may legitimately contain one.
    const bar = raw.indexOf("|");
    const pid = bar < 0 ? raw : raw.slice(0, bar);
    const sizeName = bar < 0 ? "" : raw.slice(bar + 1);
    const product = productEl.tagName === "SELECT" ? productById(pid) : null;
    const size = product ? findSize(product, sizeName) : null;
    const unitCost = (product && size) ? sizeFullCost(product, size) : (product ? productUnitCost(product) : 0);
    const label = product ? product.name + (size && !size.isStandard ? " — " + size.name : "") : (raw || "Other");

    await addDoc("waste_log", {
      product_id: product ? product.id : null,
      product_name: label,
      size_name: (size && !size.isStandard) ? size.name : "",
      qty,
      date: document.getElementById("wsDate").value,
      reason: document.getElementById("wsReason").value,
      action: document.getElementById("wsAction").value.trim(),
      estimated_loss: unitCost * qty,
      logged_by: currentStaff.name
    });

    if (product && size && document.getElementById("wsDeduct").checked) {
      const patch = sizeStockPatch(product, size, Math.max(0, (size.stock || 0) - qty));
      try { await updateDoc("products", product.id, patch); }
      catch (err) { showToast("Waste logged, but stock could not be adjusted.", true); }
    }
    closeModal(); showToast("Waste logged.");
  });
}

/* ---------------- Cash Reconciliation ---------------- */

function renderCashRecon(root) {
  root = root || document.getElementById("moduleContent");

  // Expected takings for today, straight from the sales log by payment method
  const { start, end } = rangeFor("today");
  const todaySales = store.sales.filter(s => withinRange(s.timestamp, start, end));
  const expected = { "Cash": 0, "Mobile Money": 0, "Card": 0, "Bank Transfer": 0 };
  todaySales.forEach(s => { expected[s.payment_method] = (expected[s.payment_method] || 0) + (s.total || 0); });

  root.innerHTML = `
    <div class="panel-head">
      <h2>Cash Reconciliation</h2>
      <p class="panel-sub">Compare what the sales log says you took against what's physically in the drawer.</p>
    </div>

    <div class="dash-columns">
      <div class="dash-col">
        <h3 class="dash-col-title">Today's expected takings (from sales)</h3>
        <ul class="simple-list">
          <li><strong>Cash</strong><span style="float:right;">${fmtMoney(expected["Cash"])}</span></li>
          <li><strong>Mobile Money</strong><span style="float:right;">${fmtMoney(expected["Mobile Money"])}</span></li>
          <li><strong>Card / Bank</strong><span style="float:right;">${fmtMoney((expected["Card"] || 0) + (expected["Bank Transfer"] || 0))}</span></li>
        </ul>
      </div>
      <div class="dash-col">
        <h3 class="dash-col-title">Close today's drawer</h3>
        <form id="reconForm" class="modal-form">
          <label>Physical cash counted (GHS) <input type="number" step="0.01" min="0" id="rcPhysical" required></label>
          <label>Checked by <input type="text" id="rcChecked" value="${esc(currentStaff.name)}"></label>
          <button type="submit" class="btn btn-primary">Save reconciliation</button>
        </form>
      </div>
    </div>

    <h3 class="dash-col-title" style="margin-top:28px;">Past reconciliations</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Date</th><th>Cash sales</th><th>MoMo</th><th>Card/Bank</th><th>Physical cash</th><th>Difference</th><th>Checked by</th></tr></thead>
        <tbody>
          ${[...store.cash_recon].sort((a,b) => (b.date||"").localeCompare(a.date||"")).map(r => `
            <tr class="${Math.abs(r.difference || 0) > 0.009 ? "row-low" : ""}">
              <td class="num">${fmtDate(r.date)}</td>
              <td class="num">${fmtMoney(r.cash_sales || 0)}</td>
              <td class="num">${fmtMoney(r.momo || 0)}</td>
              <td class="num">${fmtMoney(r.bank || 0)}</td>
              <td class="num">${fmtMoney(r.physical_cash || 0)}</td>
              <td class="num"><strong>${(r.difference || 0) >= 0 ? "+" : ""}${fmtMoney(r.difference || 0)}</strong></td>
              <td>${esc(r.checked_by || "")}</td>
            </tr>
          `).join("") || `<tr><td colspan="7" class="empty-state">No reconciliations yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("reconForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const physical = Number(document.getElementById("rcPhysical").value);
    await addDoc("cash_recon", {
      date: todayISO(),
      cash_sales: expected["Cash"] || 0,
      momo: expected["Mobile Money"] || 0,
      bank: (expected["Card"] || 0) + (expected["Bank Transfer"] || 0),
      physical_cash: physical,
      difference: physical - (expected["Cash"] || 0),
      checked_by: document.getElementById("rcChecked").value.trim()
    });
    showToast("Reconciliation saved.");
  });
}

/* ---------------- Money Transfers (funding) ---------------- */

function renderTransfers(root) {
  root = root || document.getElementById("moduleContent");
  const totalGHS = store.transfers.reduce((s, t) => s + (t.amount_ghs || 0), 0);
  const totalGBP = store.transfers.reduce((s, t) => s + (t.amount_gbp || 0), 0);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Money Transfers</h2>
        <p class="panel-sub">Funding sent into the business. Total received: <strong>${fmtMoney(totalGHS)}</strong> (£${totalGBP.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})})</p>
      </div>
      <button class="btn btn-primary" id="addTransferBtn">Add transfer</button>
    </div>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Date</th><th>Reference</th><th>Recipient</th><th>Sent (GBP)</th><th>Received (GHS)</th><th>Fees</th><th>Method</th><th>Status</th></tr></thead>
        <tbody>
          ${[...store.transfers].sort((a,b) => (b.date||"").localeCompare(a.date||"")).map(t => `
            <tr>
              <td class="num">${fmtDate(t.date)}</td>
              <td class="num">${esc(t.reference || "")}</td>
              <td>${esc(t.recipient)}</td>
              <td class="num">£${(t.amount_gbp || 0).toFixed(2)}</td>
              <td class="num">${fmtMoney(t.amount_ghs || 0)}</td>
              <td class="num">£${(t.fees_gbp || 0).toFixed(2)}</td>
              <td>${esc(t.method || "")}</td>
              <td><span class="status-pill ${t.status === "Delivered" ? "status-ok" : "status-low"}">${esc(t.status || "Pending")}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="8" class="empty-state">No transfers recorded.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("addTransferBtn").addEventListener("click", openTransferForm);
}

function openTransferForm() {
  openModal(`
    <h3>Add money transfer</h3>
    <form id="trForm" class="modal-form">
      <label>Reference number <input type="text" id="trRef" placeholder="e.g. R31805203948"></label>
      <label>Recipient <input type="text" id="trRecipient" required></label>
      <div class="form-row-2">
        <label>Amount sent (GBP) <input type="number" step="0.01" min="0" id="trGBP" required></label>
        <label>Amount received (GHS) <input type="number" step="0.01" min="0" id="trGHS" required></label>
      </div>
      <div class="form-row-2">
        <label>Fees (GBP) <input type="number" step="0.01" min="0" id="trFees" value="0"></label>
        <label>Date <input type="date" id="trDate" value="${todayISO()}" required></label>
      </div>
      <div class="form-row-2">
        <label>Delivery method
          <select id="trMethod"><option>Bank Deposit</option><option>Mobile Money</option><option>Cash Pickup</option></select>
        </label>
        <label>Status
          <select id="trStatus"><option>Delivered</option><option>Pending</option><option>Failed</option></select>
        </label>
      </div>
      <label>Notes <input type="text" id="trNotes"></label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="trCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Add</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("trCancelBtn").addEventListener("click", closeModal);
  document.getElementById("trForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc("transfers", {
      reference: document.getElementById("trRef").value.trim(),
      recipient: document.getElementById("trRecipient").value.trim(),
      amount_gbp: Number(document.getElementById("trGBP").value),
      amount_ghs: Number(document.getElementById("trGHS").value),
      fees_gbp: Number(document.getElementById("trFees").value || 0),
      date: document.getElementById("trDate").value,
      method: document.getElementById("trMethod").value,
      status: document.getElementById("trStatus").value,
      notes: document.getElementById("trNotes").value.trim()
    });
    closeModal(); showToast("Transfer recorded.");
  });
}
