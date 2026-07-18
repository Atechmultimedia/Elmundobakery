/* ============================================================
   Finance
   ============================================================ */

let financePreset = "month";

/* ============================================================
   Gas refill tracking — turns receipts into a real per-loaf gas cost
   ------------------------------------------------------------
   Log a cylinder refill as an expense and, next time you refill, the
   system adds up the oven-hours from every bake in between. That's
   your bake-hours per cylinder — measured, not guessed.
   ============================================================ */

/* The most recent refill already on record (excluding the one being added). */
function lastGasRefill() {
  return (store.expenses || [])
    .filter(e => e && e.is_gas_refill)
    .sort((a, b) => new Date(b.datetime || b.date) - new Date(a.datetime || a.date))[0] || null;
}

/* Oven-hours burned since a moment, read off the production log. */
function bakeHoursSince(sinceISO) {
  const since = new Date(sinceISO);
  if (isNaN(since.getTime())) return null;
  const cap = getSettings().oven_capacity || 0;
  let hours = 0, bakes = 0;
  (store.production_log || []).forEach(e => {
    const when = new Date(e.timestamp);
    if (isNaN(when.getTime()) || when <= since) return;
    const p = productById(e.product_id);
    if (!p) return;
    const split = methodTimeSplit(p);
    if (!(split.oven > 0)) return;
    // A batch too big for the oven needs more than one load, and burns gas for each
    const units = e.qty_baked || 0;
    const loads = (cap > 0 && units > 0) ? Math.max(1, Math.ceil(units / cap)) : 1;
    hours += (split.oven / 60) * loads;
    bakes++;
  });
  return { hours, bakes };
}

function renderFinance(root) {
  root = root || document.getElementById("moduleContent");
  const { start, end } = rangeFor(financePreset);

  const salesInRange = store.sales.filter(s => withinRange(s.timestamp, start, end));
  const revenue = salesInRange.reduce((sum, s) => sum + (s.total || 0), 0);
  const cogs = salesInRange.reduce((sum, s) => sum + (s.items || []).reduce((iSum, it) => iSum + (it.unit_cost || 0) * it.qty, 0), 0);
  const grossProfit = revenue - cogs;

  const expensesInRange = store.expenses.filter(e => withinRange(e.date, start, end));
  const totalExpenses = expensesInRange.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;

  const byCategory = {};
  expensesInRange.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Finance</h2>
        <p class="panel-sub">${fmtDate(start)} – ${fmtDate(end)}</p>
      </div>
      <div class="segmented">
        <button class="seg-btn ${financePreset === "today" ? "is-active" : ""}" data-preset="today">Today</button>
        <button class="seg-btn ${financePreset === "week" ? "is-active" : ""}" data-preset="week">This week</button>
        <button class="seg-btn ${financePreset === "month" ? "is-active" : ""}" data-preset="month">This month</button>
      </div>
    </div>

    <div class="pl-statement">
      <div class="pl-row"><span>Revenue</span><span>${fmtMoney(revenue)}</span></div>
      <div class="pl-row pl-sub"><span>Cost of goods sold</span><span>−${fmtMoney(cogs)}</span></div>
      <div class="pl-row pl-subtotal"><span>Gross profit</span><span>${fmtMoney(grossProfit)}</span></div>
      <div class="pl-row pl-sub"><span>Operating expenses</span><span>−${fmtMoney(totalExpenses)}</span></div>
      <div class="pl-row pl-total ${netProfit < 0 ? "pl-negative" : ""}"><span>Net profit</span><span>${fmtMoney(netProfit)}</span></div>
    </div>

    <h3 class="dash-col-title" style="margin-top:28px;">Account details — money in vs money out</h3>
    <div class="table-wrap" style="margin-bottom:26px;">
      <table class="ledger-table">
        <thead><tr><th>Account / channel</th><th>Money in (sales)</th><th>Money out (expenses)</th><th>Net — this period</th><th>Net — all time</th></tr></thead>
        <tbody>
          ${(() => {
            const channels = [
              { label: "Cash", match: (m) => m === "Cash" || m === "Petty Cash" },
              { label: "Mobile Money", match: (m) => m === "Mobile Money" },
              { label: "Bank / Card", match: (m) => m === "Bank Transfer" || m === "Card" || m === "Cheque" || m === "POS Terminal" },
              { label: "Credit / Other", match: (m) => m === "Credit / Owing" || m === "Other" || !m }
            ];
            return channels.map(ch => {
              const inP = salesInRange.filter(sl => ch.match(sl.payment_method)).reduce((s2, sl) => s2 + (sl.total || 0), 0);
              const outP = expensesInRange.filter(ex => ch.match(ex.payment_method)).reduce((s2, ex) => s2 + (ex.amount || 0), 0);
              const inAll = store.sales.filter(sl => ch.match(sl.payment_method)).reduce((s2, sl) => s2 + (sl.total || 0), 0);
              const outAll = store.expenses.filter(ex => ch.match(ex.payment_method)).reduce((s2, ex) => s2 + (ex.amount || 0), 0);
              const netP = inP - outP, netAll = inAll - outAll;
              return `<tr>
                <td><strong>${ch.label}</strong></td>
                <td class="num">${fmtMoney(inP)}</td>
                <td class="num">${fmtMoney(outP)}</td>
                <td class="num" style="color:${netP < 0 ? "var(--oven)" : "var(--herb)"};"><strong>${fmtMoney(netP)}</strong></td>
                <td class="num" style="color:${netAll < 0 ? "var(--oven)" : "var(--herb)"};">${fmtMoney(netAll)}</td>
              </tr>`;
            }).join("");
          })()}
          ${(() => {
            const inAll = store.sales.reduce((s2, sl) => s2 + (sl.total || 0), 0);
            const outAll = store.expenses.reduce((s2, ex) => s2 + (ex.amount || 0), 0);
            return `<tr style="border-top:2px solid var(--pine);">
              <td><strong>All accounts</strong></td>
              <td class="num"><strong>${fmtMoney(revenue)}</strong></td>
              <td class="num"><strong>${fmtMoney(totalExpenses)}</strong></td>
              <td class="num"><strong>${fmtMoney(revenue - totalExpenses)}</strong></td>
              <td class="num"><strong>${fmtMoney(inAll - outAll)}</strong></td>
            </tr>`;
          })()}
        </tbody>
      </table>
    </div>

    <div class="dash-columns">
      <div class="dash-col">
        <h3 class="dash-col-title">Expenses by category</h3>
        ${Object.keys(byCategory).length ? `
          <ul class="simple-list">
            ${Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => `
              <li><strong>${esc(cat)}</strong><span style="float:right;">${fmtMoney(amt)}</span></li>
            `).join("")}
          </ul>` : `<p class="empty-state">No expenses logged in this period.</p>`}
      </div>
      <div class="dash-col">
        <h3 class="dash-col-title">Log an expense</h3>
        <form id="expenseForm" class="modal-form">
          <div class="form-row-2">
            <label>Category
              <select id="expCategory">${Object.keys(EXPENSE_CATEGORY_MAP).map(c => `<option>${c}</option>`).join("")}</select>
            </label>
            <label>Subcategory
              <select id="expSubcategory">${(EXPENSE_CATEGORY_MAP[Object.keys(EXPENSE_CATEGORY_MAP)[0]] || []).map(sc => `<option>${sc}</option>`).join("")}</select>
            </label>
          </div>
          <div id="expGasBox"></div>
          <label>Description <input type="text" id="expDesc" required></label>
          <div class="form-row-2">
            <label>Amount (GHS) <input type="number" step="0.01" min="0" id="expAmount" required></label>
            <label>Date &amp; time
              <span style="display:flex;gap:6px;">
                <input type="date" id="expDate" value="${todayISO()}" required style="flex:1;">
                <input type="time" id="expTime" value="${nowTime()}" style="flex:0 0 auto;">
              </span>
            </label>
          </div>
          <div class="form-row-2">
            <label>Payment method
              <select id="expMethod">${PAYMENT_METHODS.map(m => `<option>${m}</option>`).join("")}</select>
            </label>
            <label>Supplier / vendor <input type="text" id="expVendor"></label>
          </div>
          <button type="submit" class="btn btn-primary">Add expense</button>
        </form>
      </div>
    </div>

    <h3 class="dash-col-title" style="margin-top:28px;">Recent expenses</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Date &amp; time</th><th>Category</th><th>Subcategory</th><th>Description</th><th>Supplier</th><th>Method</th><th>Amount</th></tr></thead>
        <tbody>
          ${[...store.expenses].sort((a,b) => new Date(b.datetime || b.date) - new Date(a.datetime || a.date)).slice(0, 20).map(e => `
            <tr><td class="num">${e.datetime ? fmtDateTime(e.datetime) : fmtDate(e.date)}</td><td>${esc(e.category)}</td><td>${esc(e.subcategory || "")}</td><td>${esc(e.description)}</td><td>${esc(e.vendor || "")}</td><td>${esc(e.payment_method || "")}</td><td class="num">${fmtMoney(e.amount)}</td></tr>
          `).join("") || `<tr><td colspan="7" class="empty-state">No expenses yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  root.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => { financePreset = btn.dataset.preset; renderFinance(root); });
  });

  const isGasRefill = () => {
    const cat = document.getElementById("expCategory").value;
    const sub = document.getElementById("expSubcategory").value;
    return cat === "Fuel & Energy" && /lpg|cooking gas|cylinder refill/i.test(sub || "");
  };

  const drawGasBox = () => {
    const box = document.getElementById("expGasBox");
    if (!box) return;
    if (!isGasRefill()) { box.innerHTML = ""; return; }
    const s = getSettings();
    const last = lastGasRefill();
    const since = last ? bakeHoursSince(last.datetime || last.date) : null;

    box.innerHTML = `
      <div class="gas-box">
        <div class="gas-box-head">⛽ Gas refill — this feeds your recipe costing</div>
        <label class="checkbox-label">
          <input type="checkbox" id="expGasIsRefill" checked>
          This is a cylinder refill (use it to work out my gas cost per loaf)
        </label>
        <label>Cylinder size (kg)
          <input type="number" step="0.5" min="0" id="expGasKg" value="${s.lpg_cylinder_kg || 14.5}" style="max-width:120px;">
        </label>
        ${last ? `
          <div class="gas-box-calc">
            <div>Last refill: <strong>${fmtDate(last.datetime || last.date)}</strong> — ${fmtMoney(last.amount)}${last.gas_kg ? ` for ${last.gas_kg} kg` : ""}</div>
            ${since && since.hours > 0
              ? `<div>Since then you've baked <strong>${since.bakes} batch${since.bakes !== 1 ? "es" : ""}</strong> totalling <strong>${since.hours.toFixed(1)} oven-hours</strong>.</div>
                 <div class="gas-box-answer">That cylinder gave you about <strong>${since.hours.toFixed(1)} bake-hours</strong>. Saving this refill will set that as your gas rate — no need to count it yourself.</div>`
              : `<div class="gas-box-note">No bakes logged since that refill yet, so there's nothing to measure. Log some production first and the next refill will work your rate out.</div>`}
          </div>`
        : `<div class="gas-box-note">This is your first gas refill on record. Log the next one too and the system will work out how many bake-hours a cylinder gives you — that's what turns your gas cost into a real per-loaf figure.</div>`}
      </div>`;
  };

  document.getElementById("expCategory").addEventListener("change", (e) => {
    document.getElementById("expSubcategory").innerHTML =
      (EXPENSE_CATEGORY_MAP[e.target.value] || []).map(sc => `<option>${sc}</option>`).join("");
    drawGasBox();
  });
  document.getElementById("expSubcategory").addEventListener("change", drawGasBox);
  drawGasBox();

  document.getElementById("expenseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById("expAmount").value);
    const refillBox = document.getElementById("expGasIsRefill");
    const isRefill = isGasRefill() && refillBox && refillBox.checked;
    const gasKg = isRefill ? (Number((document.getElementById("expGasKg") || {}).value) || 0) : 0;

    // Read the PREVIOUS refill before this one is saved, or we'd measure against itself.
    const prev = isRefill ? lastGasRefill() : null;
    const since = prev ? bakeHoursSince(prev.datetime || prev.date) : null;

    await addDoc("expenses", {
      category: document.getElementById("expCategory").value,
      subcategory: document.getElementById("expSubcategory").value,
      description: document.getElementById("expDesc").value.trim(),
      amount,
      date: document.getElementById("expDate").value,
      datetime: combineDateTime(document.getElementById("expDate").value, document.getElementById("expTime").value),
      payment_method: document.getElementById("expMethod").value,
      vendor: document.getElementById("expVendor").value.trim(),
      created_by: currentStaff.name,
      is_gas_refill: !!isRefill,
      gas_kg: gasKg || null
    });

    if (isRefill) {
      // Your latest receipt is the best price we'll ever have — use it.
      const patch = { ...getSettings(), lpg_refill_cost: amount };
      if (gasKg > 0) patch.lpg_cylinder_kg = gasKg;
      if (since && since.hours > 0) patch.lpg_bake_hours = Math.round(since.hours * 10) / 10;
      saveSettings(patch);
      showToast(since && since.hours > 0
        ? `Gas rate updated — that cylinder gave ${since.hours.toFixed(1)} bake-hours across ${since.bakes} bake${since.bakes !== 1 ? "s" : ""}.`
        : "Expense logged. Gas price updated — log your next refill and we'll measure how long a cylinder lasts.");
    } else {
      showToast("Expense logged.");
    }
    renderFinance(root);
  });
}
