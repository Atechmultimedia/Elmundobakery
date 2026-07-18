/* ============================================================
   Custom modules: CRM · Invoicing · Attendance · Sign ·
   eCommerce orders · Admin Monitor
   ============================================================ */

/* ---------------- CRM ---------------- */
const CRM_STAGES = ["New Lead", "Contacted", "Negotiating", "Won", "Lost"];

function renderCRM(root) {
  root = root || document.getElementById("moduleContent");
  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>CRM</h2>
        <p class="panel-sub">Leads and customers — vendors, shops, event orders, wholesale buyers.</p>
      </div>
      <button class="btn btn-primary" id="addLeadBtn">Add lead</button>
    </div>
    <div class="delivery-board" style="grid-template-columns:repeat(5,1fr);">
      ${CRM_STAGES.map(stage => `
        <div class="delivery-col">
          <h4>${stage}</h4>
          ${store.crm_leads.filter(l => (l.stage || "New Lead") === stage).map(l => `
            <div class="delivery-card">
              <div class="delivery-card-top"><strong>${esc(l.name)}</strong>${l.value ? `<span>${fmtMoney(l.value)}</span>` : ""}</div>
              <p class="delivery-meta">${esc(l.phone || "")}${l.interest ? " · " + esc(l.interest) : ""}</p>
              <div class="delivery-actions">
                <select class="driver-select" data-lead-stage="${l.id}">
                  ${CRM_STAGES.map(st => `<option ${st === (l.stage || "New Lead") ? "selected" : ""}>${st}</option>`).join("")}
                </select>
                <button class="btn btn-ghost btn-small" data-edit-lead="${l.id}">Edit</button>
              </div>
            </div>
          `).join("") || `<p class="empty-state-sm">—</p>`}
        </div>
      `).join("")}
    </div>

    ${(() => {
      // Recent buyers — real customers pulled from sales, so CRM reflects who's actually bought.
      const buyers = {};
      store.sales.forEach(sl => {
        const key = sl.customer_phone || sl.customer_name || "walk-in";
        if (!buyers[key]) buyers[key] = { name: sl.customer_name || "Walk-in", phone: sl.customer_phone || "", spend: 0, orders: 0, last: sl.timestamp };
        buyers[key].spend += sl.total || 0;
        buyers[key].orders += 1;
        if (new Date(sl.timestamp) > new Date(buyers[key].last)) buyers[key].last = sl.timestamp;
      });
      const list = Object.values(buyers).filter(b => b.name !== "Walk-in" || b.phone).sort((a, b) => b.spend - a.spend).slice(0, 20);
      if (!list.length) return "";
      return `
        <h3 style="margin-top:28px;">Recent buyers</h3>
        <p class="panel-sub" style="margin-bottom:10px;">Customers pulled automatically from completed sales.</p>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Total spent</th><th>Last purchase</th></tr></thead>
            <tbody>
              ${list.map(b => `<tr>
                <td><strong>${esc(b.name)}</strong></td>
                <td>${esc(b.phone || "—")}</td>
                <td class="num">${b.orders}</td>
                <td class="num">${fmtMoney(b.spend)}</td>
                <td class="num">${fmtDate(b.last)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    })()}
  `;
  document.getElementById("addLeadBtn").addEventListener("click", () => openLeadForm());
  root.querySelectorAll("[data-lead-stage]").forEach(sel => sel.addEventListener("change", async () => {
    await updateDoc("crm_leads", sel.dataset.leadStage, { stage: sel.value });
  }));
  root.querySelectorAll("[data-edit-lead]").forEach(btn => btn.addEventListener("click", () =>
    openLeadForm(store.crm_leads.find(l => l.id === btn.dataset.editLead))));
}

function openLeadForm(lead) {
  const isEdit = !!lead;
  openModal(`
    <h3>${isEdit ? "Edit" : "Add"} lead</h3>
    <form id="leadForm" class="modal-form">
      <label>Name / business <input type="text" id="ldName" value="${isEdit ? esc(lead.name) : ""}" required></label>
      <label>Phone <input type="text" id="ldPhone" value="${isEdit ? esc(lead.phone || "") : ""}"></label>
      <label>Interested in <input type="text" id="ldInterest" value="${isEdit ? esc(lead.interest || "") : ""}" placeholder="e.g. weekly bread supply"></label>
      <label>Potential value (GHS/month) <input type="number" step="0.01" min="0" id="ldValue" value="${isEdit ? (lead.value || "") : ""}"></label>
      <label>Notes <textarea id="ldNotes" rows="3">${isEdit ? esc(lead.notes || "") : ""}</textarea></label>
      <div class="modal-actions">
        ${isEdit ? `<button type="button" class="btn btn-ghost" id="ldDeleteBtn">Delete</button>` : "<span></span>"}
        <div>
          <button type="button" class="btn btn-ghost" id="ldCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save" : "Add"}</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("ldCancelBtn").addEventListener("click", closeModal);
  if (isEdit) document.getElementById("ldDeleteBtn").addEventListener("click", async () => {
    if (!confirm("Delete this lead?")) return;
    await deleteDoc("crm_leads", lead.id); closeModal(); showToast("Lead deleted.");
  });
  document.getElementById("leadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("ldName").value.trim(),
      phone: document.getElementById("ldPhone").value.trim(),
      interest: document.getElementById("ldInterest").value.trim(),
      value: Number(document.getElementById("ldValue").value || 0),
      notes: document.getElementById("ldNotes").value.trim()
    };
    if (isEdit) await setDoc("crm_leads", lead.id, data);
    else await addDoc("crm_leads", { ...data, stage: "New Lead" });
    closeModal(); showToast(isEdit ? "Lead updated." : "Lead added.");
  });
}

/* ---------------- Invoicing & Receipts ---------------- */

function renderInvoicing(root) {
  root = root || document.getElementById("moduleContent");
  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Invoicing &amp; Receipts</h2>
        <p class="panel-sub">Create invoices for wholesale/vendor orders, print or save as PDF, and mark them paid.</p>
      </div>
      <button class="btn btn-primary" id="newInvoiceBtn">New invoice</button>
    </div>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${[...store.invoices].sort((a,b) => (b.number||0) - (a.number||0)).map(inv => `
            <tr>
              <td class="num">INV-${String(inv.number).padStart(4, "0")}</td>
              <td class="num">${fmtDate(inv.date)}</td>
              <td>${esc(inv.customer)}</td>
              <td>${(inv.items || []).map(i => esc(i.name)).join(", ")}</td>
              <td class="num">${fmtMoney(inv.total || 0)}</td>
              <td><span class="status-pill ${inv.status === "Paid" ? "status-ok" : "status-low"}">${esc(inv.status)}</span></td>
              <td>
                <button class="btn btn-ghost btn-small" data-print-inv="${inv.id}">${inv.status === "Paid" ? "Print receipt" : "Print invoice"}</button>
                ${inv.status !== "Paid" ? `<button class="btn btn-ghost btn-small" data-pay-inv="${inv.id}">Mark paid</button>` : ""}
              </td>
            </tr>
          `).join("") || `<tr><td colspan="7" class="empty-state">No invoices yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById("newInvoiceBtn").addEventListener("click", openInvoiceForm);
  root.querySelectorAll("[data-print-inv]").forEach(btn => btn.addEventListener("click", () =>
    printInvoice(store.invoices.find(i => i.id === btn.dataset.printInv))));
  root.querySelectorAll("[data-pay-inv]").forEach(btn => btn.addEventListener("click", async () => {
    await updateDoc("invoices", btn.dataset.payInv, { status: "Paid", paid_at: new Date().toISOString() });
    showToast("Invoice marked paid.");
  }));
}

function openInvoiceForm() {
  let lines = [{ name: store.products[0] ? store.products[0].name : "", qty: 1, price: store.products[0] ? store.products[0].selling_price || 0 : 0 }];

  // Recent customer orders (POS sales + online orders) that an invoice/receipt can be generated from
  const sourceSales = [...store.sales].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 25);
  const sourceOnline = [...store.online_orders].sort((a,b) => (b.created_at||"").localeCompare(a.created_at||"")).slice(0, 25);
  const renderLines = () => lines.map((l, i) => `
    <div class="ing-row" data-idx="${i}">
      <input type="text" class="inv-name" value="${esc(l.name)}" placeholder="Item" list="prodList">
      <input type="number" class="inv-qty" step="0.01" min="0" value="${l.qty}" placeholder="Qty">
      <input type="number" class="inv-price" step="0.01" min="0" value="${l.price}" placeholder="Unit price">
      <button type="button" class="btn btn-ghost btn-small inv-remove">✕</button>
    </div>`).join("");

  openModal(`
    <h3>New invoice</h3>
    <datalist id="prodList">${store.products.map(p => `<option value="${esc(p.name)}">`).join("")}</datalist>
    <form id="invForm" class="modal-form">
      <label>Create from customer order (optional)
        <select id="invFromOrder">
          <option value="">— Start blank —</option>
          <optgroup label="POS sales">
            ${sourceSales.map(sl => `<option value="sale|${sl.id}">${esc(sl.customer_name || "Walk-in")} — ${fmtMoney(sl.total)} · ${fmtDateTime(sl.timestamp)}</option>`).join("")}
          </optgroup>
          <optgroup label="Online orders">
            ${sourceOnline.map(oo => `<option value="online|${oo.id}">${esc(oo.name || "Online")} — ${oo.estimated_total ? fmtMoney(oo.estimated_total) : "no total"} · ${fmtDateTime(oo.created_at)}</option>`).join("")}
          </optgroup>
        </select>
      </label>
      <label>Customer / vendor <input type="text" id="invCustomer" required></label>
      <div class="form-row-2">
        <label>Date <input type="date" id="invDate" value="${todayISO()}" required></label>
        <label>Due date <input type="date" id="invDue"></label>
      </div>
      <div class="ing-editor">
        <div class="ing-editor-head"><span>Line items</span>
          <button type="button" class="btn btn-ghost btn-small" id="invAddLine">+ Add line</button></div>
        <div id="invLines">${renderLines()}</div>
      </div>
      <label>Notes <input type="text" id="invNotes"></label>
      <div class="modal-actions"><span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="invCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Create invoice</button>
        </div>
      </div>
    </form>
  `);
  const bind = () => document.querySelectorAll(".inv-remove").forEach(btn => btn.addEventListener("click", () => {
    lines.splice(Number(btn.closest(".ing-row").dataset.idx), 1);
    document.getElementById("invLines").innerHTML = renderLines(); bind();
  }));
  bind();
  document.getElementById("invAddLine").addEventListener("click", () => {
    lines = readLines(); lines.push({ name: "", qty: 1, price: 0 });
    document.getElementById("invLines").innerHTML = renderLines(); bind();
  });
  const readLines = () => [...document.querySelectorAll("#invLines .ing-row")].map(rowEl => ({
    name: rowEl.querySelector(".inv-name").value.trim(),
    qty: Number(rowEl.querySelector(".inv-qty").value) || 0,
    price: Number(rowEl.querySelector(".inv-price").value) || 0
  }));
  // Track where this invoice came from. An invoice built FROM a sale must say
  // so, or the ledger can't tell real wholesale revenue from a re-printed sale
  // — and would either double-count or (worse) count neither.
  let invSource = null;

  document.getElementById("invFromOrder").addEventListener("change", (e) => {
    const val = e.target.value;
    if (!val) { invSource = null; return; }
    const [kind, id] = val.split("|");
    invSource = { kind, id };
    if (kind === "sale") {
      const sl = store.sales.find(x => x.id === id);
      if (!sl) return;
      document.getElementById("invCustomer").value = sl.customer_name || "Walk-in customer";
      lines = (sl.items || []).map(i => ({ name: i.name, qty: i.qty, price: i.unit_price }));
    } else {
      const oo = store.online_orders.find(x => x.id === id);
      if (!oo) return;
      document.getElementById("invCustomer").value = oo.name || "Online customer";
      lines = (oo.items || []).map(i => ({ name: i.name + (i.variant ? " (" + i.variant + ")" : ""), qty: i.qty, price: i.price || 0 }));
    }
    document.getElementById("invLines").innerHTML = renderLines();
    bind();
  });

  document.getElementById("invCancelBtn").addEventListener("click", closeModal);
  document.getElementById("invForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const items = readLines().filter(l => l.name && l.qty > 0).map(l => ({ ...l, line_total: l.qty * l.price }));
    if (!items.length) { showToast("Add at least one line item.", true); return; }
    const number = Math.max(0, ...store.invoices.map(i => i.number || 0)) + 1;
    const subtotal = items.reduce((s, l) => s + l.line_total, 0);
    const tax = computeGraTax(subtotal);
    await addDoc("invoices", {
      number, customer: document.getElementById("invCustomer").value.trim(),
      date: document.getElementById("invDate").value,
      due_date: document.getElementById("invDue").value || null,
      items, subtotal, tax_total: tax.total - tax.base, tax_breakdown: tax.breakdown,
      total: tax.total,
      notes: document.getElementById("invNotes").value.trim(),
      status: "Unpaid", created_by: currentStaff.name,
      sale_id: invSource && invSource.kind === "sale" ? invSource.id : null,
      source: invSource ? (invSource.kind === "sale" ? "pos_sale" : "online_order") : "standalone"
    });
    closeModal(); showToast(`Invoice INV-${String(number).padStart(4, "0")} created.`);
  });
}

function docHTML(o) {
  // o: { kind: "INVOICE"|"RECEIPT", number, date, due_date, customer, phone,
  //      items:[{name,qty,price,line_total}], subtotal, discount, delivery_fee,
  //      total, paid_at, payment_method, served_by, notes }
  const isReceipt = o.kind === "RECEIPT";
  const logoURL = new URL("assets/logo.png", location.href).href;
  const rows = (o.items || []).map((l, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${l.name}</td>
      <td class="r">${l.qty}</td>
      <td class="r">${fmtMoney(l.price)}</td>
      <td class="r">${fmtMoney(l.line_total)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html><head><title>${o.kind} ${o.number}</title>
  <style>
    @page { margin: 18mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #221A12; margin: 0; padding: 34px; max-width: 760px; }
    .band { background: #08300D; color: #EADBC8; border-radius: 10px; padding: 22px 26px; display: flex; justify-content: space-between; align-items: center; }
    .band img { width: 64px; height: 64px; object-fit: contain; }
    .brand-block { display: flex; align-items: center; gap: 14px; }
    .brand-block h1 { margin: 0; font-size: 20px; color: #fff; letter-spacing: 0.02em; }
    .brand-block small { display: block; color: #F7C15C; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 3px; }
    .doc-badge { text-align: right; }
    .doc-badge .kind { font-size: 26px; font-weight: 800; letter-spacing: 0.14em; color: ${isReceipt ? "#7BC96F" : "#F5A508"}; }
    .doc-badge .num { font-size: 12px; color: #EADBC8; margin-top: 4px; }
    .paid-stamp { display: inline-block; margin-top: 6px; border: 2.5px solid #7BC96F; color: #7BC96F; font-weight: 800; font-size: 13px; letter-spacing: 0.2em; padding: 3px 12px; border-radius: 5px; transform: rotate(-4deg); }
    .meta-grid { display: flex; justify-content: space-between; gap: 20px; margin: 22px 4px; font-size: 12.5px; line-height: 1.8; }
    .meta-grid .lbl { color: #6B5D4C; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; }
    table.items { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    table.items th { background: #08300D; color: #F7C15C; text-align: left; padding: 9px 12px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; }
    table.items th.r, table.items td.r { text-align: right; }
    table.items th.c, table.items td.c { text-align: center; width: 34px; }
    table.items td { border-bottom: 1px solid #E1D5BB; padding: 9px 12px; }
    table.items tbody tr:nth-child(even) td { background: #FBF8F2; }
    .totals { width: 300px; margin: 14px 0 0 auto; font-size: 13px; }
    .totals .row { display: flex; justify-content: space-between; padding: 5px 12px; }
    .totals .grand { background: #08300D; color: #F7C15C; border-radius: 6px; font-weight: 800; font-size: 15px; padding: 10px 12px; margin-top: 6px; }
    .notes { margin-top: 22px; font-size: 12px; background: #F3ECDE; border-left: 3px solid #F5A508; padding: 10px 14px; border-radius: 0 6px 6px 0; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 44px; font-size: 11px; color: #6B5D4C; }
    .sig-row .line { border-top: 1px solid #221A12; width: 210px; padding-top: 5px; text-align: center; }
    .foot { margin-top: 34px; text-align: center; font-size: 10.5px; color: #6B5D4C; border-top: 2px solid #F5A508; padding-top: 12px; line-height: 1.7; }
    .foot .tagline { font-style: italic; color: #08300D; font-size: 12px; }
  </style></head><body>
    <div class="band">
      <div class="brand-block">
        <img src="${logoURL}" alt="El Mundo Bakery">
        <div><h1>El Mundo Bakery</h1><small>Est. 2026 · Our goodness in everyday bite</small></div>
      </div>
      <div class="doc-badge">
        <div class="kind">${o.kind}</div>
        <div class="num">${o.number}</div>
        ${isReceipt ? '<div class="paid-stamp">PAID</div>' : ""}
      </div>
    </div>
    <div class="meta-grid">
      <div>
        <div class="lbl">${isReceipt ? "Received from" : "Billed to"}</div>
        <strong>${o.customer || "Walk-in customer"}</strong>
        ${o.phone ? `<br>${o.phone}` : ""}
      </div>
      <div>
        <div class="lbl">Details</div>
        Date: <strong>${fmtDate(o.date)}</strong><br>
        ${!isReceipt && o.due_date ? `Due: <strong>${fmtDate(o.due_date)}</strong><br>` : ""}
        ${isReceipt && o.paid_at ? `Paid: <strong>${fmtDateTime(o.paid_at)}</strong><br>` : ""}
        ${o.payment_method ? `Payment: <strong>${o.payment_method}</strong><br>` : ""}
        ${o.served_by ? `Served by: <strong>${o.served_by}</strong>` : ""}
      </div>
      <div>
        <div class="lbl">From</div>
        El Mundo Bakery<br>
        Powerland, Madina — Accra<br>
        0556492858 · @elmundobakery
      </div>
    </div>
    <table class="items">
      <thead><tr><th class="c">#</th><th>Item</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${fmtMoney(o.subtotal ?? o.total)}</span></div>
      ${o.discount ? `<div class="row"><span>Discount</span><span>−${fmtMoney(o.discount)}</span></div>` : ""}
      ${(o.tax_breakdown || []).map(t => `<div class="row"><span>${t.label}</span><span>${fmtMoney(t.amount)}</span></div>`).join("")}
      ${o.delivery_fee ? `<div class="row"><span>Delivery fee</span><span>${fmtMoney(o.delivery_fee)}</span></div>` : ""}
      <div class="row grand"><span>${isReceipt ? "Total paid" : "Total due"}</span><span>${fmtMoney(o.total)}</span></div>
    </div>
    ${o.notes ? `<div class="notes"><strong>Notes:</strong> ${o.notes}</div>` : ""}
    ${!isReceipt ? `<div class="sig-row"><div class="line">Authorised signature</div><div class="line">Customer signature</div></div>` : ""}
    <div class="foot">
      <span class="tagline">"Baked with passion, shared with joy."</span><br>
      Thank you for your business · Freshly baked daily, made with love &amp; quality ingredients<br>
      El Mundo Bakery · Powerland, Madina, Accra · Call/WhatsApp 0556492858 · Facebook · Instagram · TikTok @elmundobakery
    </div>
    <script>window.onload = () => window.print();</scr` + `ipt>
  </body></html>`;
}

function openPrintWindow(html) {
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

function printInvoice(inv) {
  if (!inv) return;
  const isReceipt = inv.status === "Paid";
  openPrintWindow(docHTML({
    kind: isReceipt ? "RECEIPT" : "INVOICE",
    number: "INV-" + String(inv.number).padStart(4, "0"),
    date: inv.date, due_date: inv.due_date, paid_at: inv.paid_at,
    customer: inv.customer, items: inv.items,
    subtotal: inv.subtotal ?? inv.total, tax_breakdown: inv.tax_breakdown || [], total: inv.total,
    notes: inv.notes, served_by: inv.created_by
  }));
}

function printReceiptForSale(sale) {
  if (!sale) return;
  openPrintWindow(docHTML({
    kind: "RECEIPT",
    number: "RCT-" + (sale.id || "").slice(0, 6).toUpperCase(),
    date: sale.timestamp, paid_at: sale.timestamp,
    customer: sale.customer_name, phone: sale.customer_phone,
    items: (sale.items || []).map(i => ({ name: i.name, qty: i.qty, price: i.unit_price, line_total: i.line_total })),
    subtotal: sale.subtotal, discount: sale.discount_amt, delivery_fee: sale.delivery_fee,
    total: sale.total, payment_method: sale.payment_method, served_by: sale.cashier_name
  }));
}

/* ---------------- Attendance ---------------- */

async function mergeClockEvents() {
  // Pair online punches from clock.html into attendance entries:
  // first punch of an open pair = clock in, next punch = clock out.
  const events = [...store.clock_events].sort((a, b) => (a.punched_at || "").localeCompare(b.punched_at || ""));
  for (const ev of events) {
    try {
      const open = store.attendance.find(a => a.staff_id === ev.employee_id && !a.clock_out);
      if (open) {
        await updateDoc("attendance", open.id, { clock_out: ev.punched_at });
        open.clock_out = ev.punched_at; // keep local pairing correct within this loop
      } else {
        const newEntry = {
          staff_id: ev.employee_id, staff_name: ev.employee_name,
          clock_in: ev.punched_at, clock_out: null, method: "online"
        };
        const id = await addDoc("attendance", newEntry);
        store.attendance.push({ id, ...newEntry });
      }
      await deleteDoc("clock_events", ev.id);
    } catch (e) { /* leave the event for the next pass */ }
  }
}

function renderAttendance(root) {
  root = root || document.getElementById("moduleContent");
  if (store.clock_events.length) {
    mergeClockEvents(); // live listeners re-render once merged
  }
  const myEmp = employeeById(currentStaff.id) || { id: currentStaff.id, name: currentStaff.name };
  const myOpen = store.attendance.find(a => a.staff_id === myEmp.id && !a.clock_out);
  const isManager = ["master", "admin", "manager", "hr_manager"].includes(currentStaff.role);
  const activeEmps = store.employees.filter(e => e.status !== "Terminated");

  root.innerHTML = `
    <div class="panel-head">
      <h2>Attendance</h2>
      <p class="panel-sub">Four ways to clock in: yourself below, the shared-device kiosk, a manager marking someone in, or the online Staff Clock page (clock.html) from any phone.</p>
      ${store.clock_events.length ? `<p class="modal-hint" style="color:var(--gold);">Merging ${store.clock_events.length} online punch${store.clock_events.length === 1 ? "" : "es"}…</p>` : ""}
    </div>

    <div class="dash-columns" style="margin-bottom:26px;">
      <div class="dash-col">
        <h3 class="dash-col-title">My attendance — ${esc(currentStaff.name)}</h3>
        ${myOpen
          ? `<p>Clocked in at <strong>${fmtDateTime(myOpen.clock_in)}</strong></p>
             <button class="btn btn-primary" id="clockBtn" data-mode="out">Clock out</button>`
          : `<p>Not clocked in.</p>
             <button class="btn btn-primary" id="clockBtn" data-mode="in">Clock in</button>`}
      </div>

      <div class="dash-col">
        <h3 class="dash-col-title">Kiosk — clock in with PIN</h3>
        <p class="modal-hint">For workers without logins: pick your name, enter your 4-digit PIN.</p>
        <form id="kioskForm" class="modal-form">
          <label>Employee
            <select id="kioskEmp">${activeEmps.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join("")}</select>
          </label>
          <label>PIN <input type="password" id="kioskPin" inputmode="numeric" maxlength="4" required></label>
          <button type="submit" class="btn btn-primary">Clock in / out</button>
        </form>
      </div>
    </div>

    ${isManager ? `
    <div class="dash-col" style="max-width:520px;margin-bottom:26px;">
      <h3 class="dash-col-title">Manager: mark attendance</h3>
      <form id="managerAttForm" class="modal-form">
        <label>Employee
          <select id="mgrEmp">${activeEmps.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join("")}</select>
        </label>
        <button type="submit" class="btn btn-primary">Clock in / out for them</button>
      </form>
    </div>` : ""}

    <h3 class="dash-col-title">Recent attendance</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Employee</th><th>Clock in</th><th>Clock out</th><th>Hours</th><th>Method</th></tr></thead>
        <tbody>
          ${[...store.attendance].sort((a,b) => (b.clock_in||"").localeCompare(a.clock_in||"")).slice(0, 40).map(a => {
            const hours = a.clock_out ? ((new Date(a.clock_out) - new Date(a.clock_in)) / 3600000) : null;
            return `<tr>
              <td>${esc(a.staff_name)}</td>
              <td class="num">${fmtDateTime(a.clock_in)}</td>
              <td class="num">${a.clock_out ? fmtDateTime(a.clock_out) : '<span class="status-pill status-low">On shift</span>'}</td>
              <td class="num">${hours !== null ? hours.toFixed(2) : "—"}</td>
              <td>${esc(a.method || "self")}</td>
            </tr>`;
          }).join("") || `<tr><td colspan="5" class="empty-state">No attendance yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  async function toggleClock(emp, method) {
    const open = store.attendance.find(a => a.staff_id === emp.id && !a.clock_out);
    if (open) {
      await updateDoc("attendance", open.id, { clock_out: new Date().toISOString() });
      showToast(`${emp.name} clocked out.`);
    } else {
      await addDoc("attendance", {
        staff_id: emp.id, staff_name: emp.name,
        clock_in: new Date().toISOString(), clock_out: null, method
      });
      showToast(`${emp.name} clocked in.`);
    }
  }

  document.getElementById("clockBtn").addEventListener("click", () => toggleClock(myEmp, "self"));

  document.getElementById("kioskForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const emp = employeeById(document.getElementById("kioskEmp").value);
    const pin = document.getElementById("kioskPin").value.trim();
    if (!emp) return;
    if (!emp.pin) { showToast(`${emp.name} has no PIN set — a manager can add one on their employee record.`, true); return; }
    if (emp.pin !== pin) { showToast("Wrong PIN.", true); return; }
    await toggleClock(emp, "kiosk");
    document.getElementById("kioskPin").value = "";
  });

  const mgrForm = document.getElementById("managerAttForm");
  if (mgrForm) mgrForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emp = employeeById(document.getElementById("mgrEmp").value);
    if (emp) await toggleClock(emp, "manager (" + currentStaff.name + ")");
  });
}

/* ---------------- Sign (e-signatures) ---------------- */

function renderSign(root) {
  root = root || document.getElementById("moduleContent");
  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Sign</h2>
        <p class="panel-sub">Capture signed acknowledgements — deliveries, agreements, handovers.</p>
      </div>
      <button class="btn btn-primary" id="newSignBtn">New signature</button>
    </div>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Date</th><th>Document / purpose</th><th>Signed by</th><th>Signature</th></tr></thead>
        <tbody>
          ${[...store.signatures].sort((a,b) => (b.created_at||"").localeCompare(a.created_at||"")).map(sg => `
            <tr>
              <td class="num">${fmtDateTime(sg.created_at)}</td>
              <td>${esc(sg.purpose)}</td>
              <td>${esc(sg.signer)}</td>
              <td>${sg.image ? `<img src="${sg.image}" alt="signature" style="height:36px;background:#fff;border:1px solid var(--line);border-radius:4px;">` : "—"}</td>
            </tr>
          `).join("") || `<tr><td colspan="4" class="empty-state">No signatures captured yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById("newSignBtn").addEventListener("click", openSignForm);
}

function openSignForm() {
  openModal(`
    <h3>Capture signature</h3>
    <form id="signForm" class="modal-form">
      <label>Document / purpose <input type="text" id="sgPurpose" required placeholder="e.g. Delivery received — INV-0007"></label>
      <label>Signer's name <input type="text" id="sgSigner" required></label>
      <label>Sign below
        <canvas id="sigPad" width="440" height="140" style="border:1px dashed var(--line);border-radius:6px;background:#fff;touch-action:none;width:100%;"></canvas>
      </label>
      <button type="button" class="btn btn-ghost btn-small" id="sgClear" style="align-self:flex-start;">Clear</button>
      <div class="modal-actions"><span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="sgCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Save signature</button>
        </div>
      </div>
    </form>
  `);
  const canvas = document.getElementById("sigPad");
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = "#08300D";
  let drawing = false, drawn = false;
  const pos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: (p.clientX - rect.left) * (canvas.width / rect.width), y: (p.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = (e) => { drawing = true; drawn = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
  const move = (e) => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); };
  const end = () => { drawing = false; };
  canvas.addEventListener("mousedown", start); canvas.addEventListener("mousemove", move); window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false }); canvas.addEventListener("touchmove", move, { passive: false }); canvas.addEventListener("touchend", end);

  document.getElementById("sgClear").addEventListener("click", () => { ctx.clearRect(0, 0, canvas.width, canvas.height); drawn = false; });
  document.getElementById("sgCancelBtn").addEventListener("click", closeModal);
  document.getElementById("signForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!drawn) { showToast("Please sign in the box first.", true); return; }
    await addDoc("signatures", {
      purpose: document.getElementById("sgPurpose").value.trim(),
      signer: document.getElementById("sgSigner").value.trim(),
      image: canvas.toDataURL("image/png"),
      captured_by: currentStaff.name
    });
    closeModal(); showToast("Signature saved.");
  });
}

/* ---------------- eCommerce (online orders) ---------------- */

function renderEcommerce(root) {
  root = root || document.getElementById("moduleContent");
  const canRecord = ["master", "admin", "manager", "cashier", "sales_manager"].includes(currentStaff.role);
  const unrecorded = store.online_orders.filter(o => !o.sale_id).length;
  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>eCommerce — Online Orders</h2>
        <p class="panel-sub">Orders placed through the website's Order Center land here automatically, alongside the WhatsApp message.</p>
      </div>
      ${canRecord && store.online_orders.length > 0 ? `<button class="btn btn-primary" id="recordAllOrdersBtn">Record ${unrecorded} order${unrecorded !== 1 ? "s" : ""} as sales</button>` : ""}
    </div>
    <p class="panel-sub" style="background:rgba(8,48,13,0.04);padding:8px 12px;border-radius:8px;">
      Diagnostic: ${store.online_orders.length} online order${store.online_orders.length !== 1 ? "s" : ""} loaded ·
      ${store.online_orders.filter(o => o.sale_id).length} already recorded as sales ·
      ${store.sales.length} total sale${store.sales.length !== 1 ? "s" : ""} in system.
    </p>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Received</th><th>Customer</th><th>Phone</th><th>Items</th><th>Est. total</th><th>Payment</th><th>Type</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${[...store.online_orders].sort((a,b) => (b.created_at||"").localeCompare(a.created_at||"")).map(o => `
            <tr class="${o.status === "new" ? "row-low" : ""}">
              <td class="num">${fmtDateTime(o.created_at)}</td>
              <td>${esc(o.name || "—")}</td>
              <td>${esc(o.phone || "—")}</td>
              <td>${(o.items || []).map(i => `${esc(i.name)}${i.variant ? " (" + esc(i.variant) + ")" : ""} × ${i.qty}`).join(", ")}</td>
              <td class="num">${o.estimated_total ? fmtMoney(o.estimated_total) : "—"}</td>
              <td>${o.payment_status === "paid"
                ? '<span class="status-pill status-ok">Paid ✓</span>'
                : (o.payment_status || "").startsWith("paid")
                ? '<span class="status-pill status-ok" title="Paid via Paystack but not server-verified">Paid*</span>'
                : '<span class="status-pill status-low">Unpaid</span>'}${o.payment_ref ? `<br><small>${esc(o.payment_ref)}</small>` : ""}</td>
              <td>${esc(o.type || "")}${o.address ? " — " + esc(o.address) + ` <a class="map-link" href="${mapUrlFor(o.address)}" target="_blank" rel="noopener" title="Open in map">📍 map</a>` : ""}</td>
              <td><span class="status-pill ${o.status === "completed" ? "status-ok" : "status-low"}">${esc(o.status || "new")}</span></td>
              <td>
                ${(o.payment_status === "paid" || (o.payment_status || "").startsWith("paid"))
                  ? `<button class="btn btn-ghost btn-small" data-order-unpaid="${o.id}">Mark unpaid</button>`
                  : `<button class="btn btn-ghost btn-small" data-order-paid="${o.id}" style="color:var(--herb,#2e7d32);">Mark paid</button>`}
                ${o.status !== "completed" ? `<button class="btn btn-ghost btn-small" data-order-done="${o.id}">Mark completed</button>` : ""}
                ${o.type === "Delivery" && o.status === "new" ? `<button class="btn btn-ghost btn-small" data-order-deliver="${o.id}">Send to Delivery</button>` : ""}
              </td>
            </tr>
          `).join("") || `<tr><td colspan="9" class="empty-state">No online orders yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  const recordAllBtn = document.getElementById("recordAllOrdersBtn");
  if (recordAllBtn) recordAllBtn.addEventListener("click", async () => {
    const pending = store.online_orders.filter(o => !o.sale_id);
    if (!pending.length) { showToast("All orders are already recorded as sales.", false); return; }
    if (!confirm(`Record ${pending.length} online order${pending.length > 1 ? "s" : ""} as sales? This adds them to your Sales Tracker, dashboard and reports.`)) return;
    let done = 0; const errors = [];
    for (const order of pending) {
      try {
        await completeOrderAsSale({ ...order, payment_status: order.payment_status || "paid" });
        done++;
      } catch (err) {
        console.error("Order", order.id, order.name, "failed:", err);
        errors.push((order.name || "order") + ": " + (err.message || err.code || "unknown error"));
      }
    }
    if (done > 0) showToast(`Recorded ${done} order${done !== 1 ? "s" : ""} as sales. Check the Sales Tracker.`, false);
    if (errors.length) {
      console.warn("Failed orders:", errors);
      showToast(`${errors.length} couldn't be recorded: ${errors[0]}`, true);
    }
  });
  root.querySelectorAll("[data-order-paid]").forEach(btn => btn.addEventListener("click", async () => {
    const order = store.online_orders.find(x => x.id === btn.dataset.orderPaid);
    if (!order) return;
    try {
      // Mark paid AND record it as a sale (if not already recorded) so it flows
      // into the Sales Tracker, dashboard, profit and all reports.
      await updateDoc("online_orders", order.id, { payment_status: "paid", paid_marked_by: currentStaff.name, paid_marked_at: new Date().toISOString() });
      if (!order.sale_id) {
        await completeOrderAsSale({ ...order, payment_status: "paid" });
        showToast("Marked paid and recorded as a sale.");
      } else {
        showToast("Order marked as paid.");
      }
    } catch (err) {
      console.error("Mark paid failed:", err);
      showToast(err.message || "Could not mark paid — check products match and try again.", true);
    }
  }));
  root.querySelectorAll("[data-order-unpaid]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Mark this order as unpaid?")) return;
    await updateDoc("online_orders", btn.dataset.orderUnpaid, { payment_status: "unpaid" });
    showToast("Order marked as unpaid.");
  }));
  root.querySelectorAll("[data-order-done]").forEach(btn => btn.addEventListener("click", async () => {
    const order = store.online_orders.find(x => x.id === btn.dataset.orderDone);
    if (!order) return;
    if (order.sale_id) {
      await updateDoc("online_orders", btn.dataset.orderDone, { status: "completed" });
      showToast("Order marked completed.");
      return;
    }
    if (!confirm("Mark this order completed and record it as a sale? This adds the revenue to your Sales Tracker, dashboard and reports, and deducts stock.")) return;
    try {
      await completeOrderAsSale(order);
      showToast("Order completed and recorded as a sale.");
    } catch (err) {
      console.error("Order completion failed:", err);
      showToast(err.message || "Could not record the sale — check stock and try again.", true);
    }
  }));
  root.querySelectorAll("[data-order-deliver]").forEach(btn => btn.addEventListener("click", async () => {
    const o = store.online_orders.find(x => x.id === btn.dataset.orderDeliver);
    await addDoc("deliveries", {
      customer_name: o.name || "Online order", phone: o.phone || "", address: o.address || "",
      fee: 0, status: "pending", driver_id: null, driver_name: null,
      scheduled_time: new Date().toISOString(), notes: (o.items || []).map(i => `${i.name}${i.variant ? " (" + i.variant + ")" : ""} × ${i.qty}`).join(", ")
    });
    await updateDoc("online_orders", o.id, { status: "processing" });
    showToast("Sent to the Delivery board.");
  }));
}

/* Map a homepage order variant back to one of the product's sizes.
   The order center labels sizes like "GHS 5 loaf (300 g)" — strip the weight
   before matching. Falls back to the first size. */
function sizeFromVariant(product, variantLabel) {
  const all = productSizes(product);
  if (!variantLabel) return all[0];
  const clean = String(variantLabel).replace(/\s*\(\s*\d+\s*g\s*\)\s*$/i, "").trim();
  return findSize(product, clean);
}

/* Convert a completed online order into a proper sale so the revenue flows
   into the Sales Tracker, dashboard, profit, breakeven and accounting.
   Matches each order item to a product by name, computes cost/price,
   deducts finished stock, and links the sale back to the order. */
async function completeOrderAsSale(order) {
  const saleItems = [];
  let subtotal = 0;

  (order.items || []).forEach(it => {
    const qty = Number(it.qty) || 0;
    if (qty <= 0) return;
    // Match to a product by name (case-insensitive) — used for cost + stock deduction.
    const prod = store.products.find(p => (p.name || "").trim().toLowerCase() === (it.name || "").trim().toLowerCase());
    // The chosen variant maps to one of the product's sizes.
    const size = prod ? sizeFromVariant(prod, it.variant) : null;
    // Price: use the order's own stated price first (what the customer saw/agreed),
    // then the size's price, then the product's selling price.
    let unitPrice = (it.price != null && it.price !== "") ? Number(it.price)
      : (size ? size.price : (prod ? (prod.selling_price || 0) : 0));
    const unitCost = (prod && size) ? sizeFullCost(prod, size) : (prod ? productFullCost(prod) : 0);
    subtotal += unitPrice * qty;
    saleItems.push({
      product_id: prod ? prod.id : null,
      size_name: (size && !size.isStandard) ? size.name : "",
      name: it.name + (it.variant ? " (" + it.variant + ")" : ""),
      qty, unit_price: unitPrice, unit_cost: unitCost,
      line_total: unitPrice * qty
    });
  });

  if (!saleItems.length) throw new Error("This order has no items to record.");

  const total = (order.estimated_total != null && order.estimated_total > 0) ? order.estimated_total : subtotal;

  // Find or create the customer so online buyers appear in Customers & Loyalty
  let customerId = null;
  if (order.phone) {
    const existing = store.customers.find(c => c.phone === order.phone);
    if (existing) customerId = existing.id;
    else {
      try { customerId = await addDoc("customers", { name: order.name || "Online customer", phone: order.phone, points: 0, source: "online", created_at: new Date().toISOString() }); }
      catch (e) { customerId = null; }
    }
  }

  // Build the sale record (same shape as a POS sale)
  const saleData = {
    items: saleItems,
    subtotal, discount_pct: 0, discount_amt: 0,
    delivery_fee: 0, total,
    payment_method: (order.payment_status || "").startsWith("paid") ? "Paystack (online)" : "Online order",
    customer_name: order.name || "Online customer",
    customer_phone: order.phone || "",
    customer_id: customerId,
    is_delivery: order.type === "Delivery",
    cashier_name: currentStaff.name,
    cashier_id: currentStaff.id,
    source: "online_order",
    online_order_id: order.id,
    timestamp: order.created_at || new Date().toISOString()
  };

  const saleId = await addDoc("sales", saleData);

  // Deduct finished stock per size (best-effort, don't block the sale).
  // Group by product so two sizes of one recipe don't overwrite each other.
  const byProduct = {};
  saleItems.forEach(si => {
    if (!si.product_id) return;
    (byProduct[si.product_id] = byProduct[si.product_id] || []).push(si);
  });
  for (const pid of Object.keys(byProduct)) {
    const prod = store.products.find(p => p.id === pid);
    if (!prod) continue;
    const sizes = (prod.sizes || []).map(s => ({ ...s }));
    let stdStock = prod.finished_stock_qty || 0;
    let touchedSizes = false, touchedStd = false;
    byProduct[pid].forEach(si => {
      if (si.size_name) {
        const idx = sizes.findIndex(s =>
          (s.name || "").trim().toLowerCase() === si.size_name.trim().toLowerCase());
        if (idx >= 0) { sizes[idx].stock = Math.max(0, (Number(sizes[idx].stock) || 0) - si.qty); touchedSizes = true; return; }
      }
      stdStock = Math.max(0, stdStock - si.qty);
      touchedStd = true;
    });
    const patch = {};
    if (touchedSizes) patch.sizes = sizes;
    if (touchedStd) patch.finished_stock_qty = stdStock;
    if (Object.keys(patch).length) {
      try { await updateDoc("products", pid, patch); } catch (e) { /* non-fatal */ }
    }
  }

  // Award loyalty points to the linked customer
  try {
    const cfg = (typeof getSettings === "function") ? getSettings() : {};
    if (cfg.loyalty_enabled && customerId) {
      const cust = store.customers.find(c => c.id === customerId);
      const earned = total * (cfg.loyalty_rate || 0);
      await updateDoc("customers", customerId, { points: (((cust && cust.points) || 0) + earned), last_visit: saleData.timestamp });
    }
  } catch (e) { /* loyalty non-blocking */ }

  // Auto-create a receipt/invoice for this sale
  try {
    const nextNum = (store.invoices.reduce((m, iv) => Math.max(m, iv.number || 0), 0)) + 1;
    await addDoc("invoices", {
      number: nextNum,
      customer: order.name || "Online customer",
      phone: order.phone || "",
      items: saleItems.map(si => ({ name: si.name, qty: si.qty, price: si.unit_price, line_total: si.line_total })),
      subtotal, total,
      status: (order.payment_status || "").startsWith("paid") ? "Paid" : "Unpaid",
      sale_id: saleId,
      source: "online_order",
      date: saleData.timestamp
    });
  } catch (e) { /* invoice non-blocking */ }

  // Create a delivery record if this is a delivery order (linked to the sale)
  if (order.type === "Delivery") {
    try {
      const already = store.deliveries.find(d => d.sale_id === saleId);
      if (!already) {
        await addDoc("deliveries", {
          sale_id: saleId,
          customer_name: order.name || "Online order",
          phone: order.phone || "",
          address: order.address || "",
          fee: 0, status: "pending", driver_id: null, driver_name: null,
          scheduled_time: saleData.timestamp,
          notes: saleItems.map(si => `${si.name} × ${si.qty}`).join(", ")
        });
      }
    } catch (e) { /* delivery non-blocking */ }
  }

  // Mark the order completed and link it to the sale
  await updateDoc("online_orders", order.id, { status: "completed", sale_id: saleId });
}



let monitorFilter = { who: "", role: "", action: "" };

function renderAdminMonitor(root) {
  root = root || document.getElementById("moduleContent");
  const today = todayISO();
  const isMaster = currentStaff && currentStaff.role === "master";

  // Apply filters
  let rows = [...store.audit_log];
  if (monitorFilter.role) rows = rows.filter(a => a.role === monitorFilter.role);
  if (monitorFilter.who) rows = rows.filter(a => (a.user || "") === monitorFilter.who);
  if (monitorFilter.action) rows = rows.filter(a => a.action === monitorFilter.action);
  rows.sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  const todayActions = store.audit_log.filter(a => (a.at || "").slice(0, 10) === today);
  const managerActions = store.audit_log.filter(a => a.role === "manager");
  const activeStaff = store.staff.filter(s => s.active !== false).length;
  const people = [...new Set(store.audit_log.map(a => a.user).filter(Boolean))].sort();
  const roles = [...new Set(store.audit_log.map(a => a.role).filter(Boolean))].sort();

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Admin Monitor</h2>
        <p class="panel-sub">A live audit trail of who did what across the whole system. Visible to admins and the master admin only.</p>
      </div>
      <div>
        <button class="btn btn-ghost" id="exportLogBtn">Export to Excel</button>
        ${isMaster ? `
        <button class="btn btn-ghost" id="clearOldLogsBtn">Clear older than 30 days</button>
        <button class="btn btn-ghost" id="clearAllLogsBtn" style="color:var(--oven);">Clear entire log</button>` : ""}
      </div>
    </div>
    <div class="kpi-grid" style="margin-bottom:22px;">
      <div class="kpi-card"><span class="kpi-label">Actions today</span><span class="kpi-value">${todayActions.length}</span></div>
      <div class="kpi-card"><span class="kpi-label">Manager actions (all)</span><span class="kpi-value">${managerActions.length}</span></div>
      <div class="kpi-card"><span class="kpi-label">Active staff accounts</span><span class="kpi-value">${activeStaff}</span></div>
      <div class="kpi-card"><span class="kpi-label">Total records tracked</span><span class="kpi-value">${store.audit_log.length}</span></div>
    </div>

    <div class="ledger-form" style="margin-bottom:16px;align-items:end;">
      <label>Filter by person
        <select id="monWho">
          <option value="">Everyone</option>
          ${people.map(p => `<option value="${esc(p)}" ${monitorFilter.who === p ? "selected" : ""}>${esc(p)}</option>`).join("")}
        </select>
      </label>
      <label>Filter by role
        <select id="monRole">
          <option value="">All roles</option>
          ${roles.map(r => `<option value="${esc(r)}" ${monitorFilter.role === r ? "selected" : ""}>${esc(r)}</option>`).join("")}
        </select>
      </label>
      <label>Filter by action
        <select id="monAction">
          <option value="">All actions</option>
          ${["create", "update", "delete"].map(ac => `<option value="${ac}" ${monitorFilter.action === ac ? "selected" : ""}>${ac}</option>`).join("")}
        </select>
      </label>
      <button class="btn btn-ghost btn-small" id="monClearFilter">Reset filters</button>
    </div>

    <p class="panel-sub" style="margin-bottom:8px;">Showing ${Math.min(rows.length, 300)} of ${rows.length} matching ${rows.length === 1 ? "entry" : "entries"}.</p>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Module</th><th>Record</th></tr></thead>
        <tbody>
          ${rows.slice(0, 300).map(a => `
            <tr>
              <td class="num">${fmtDateTime(a.at)}</td>
              <td>${esc(a.user || "")} <small>(${esc(a.role || "")})</small></td>
              <td><span class="status-pill ${a.action === "delete" ? "status-low" : "status-ok"}">${esc(a.action)}</span></td>
              <td>${esc(a.collection)}</td>
              <td class="num">${esc((a.doc_id || "").slice(0, 8))}</td>
            </tr>
          `).join("") || `<tr><td colspan="5" class="empty-state">No activity matches these filters.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  // Filter handlers
  const wire = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => { monitorFilter[key] = el.value; renderAdminMonitor(root); });
  };
  wire("monWho", "who"); wire("monRole", "role"); wire("monAction", "action");
  const rf = document.getElementById("monClearFilter");
  if (rf) rf.addEventListener("click", () => { monitorFilter = { who: "", role: "", action: "" }; renderAdminMonitor(root); });

  // Export handler — exports whatever is currently filtered/visible
  const exportBtn = document.getElementById("exportLogBtn");
  if (exportBtn) exportBtn.addEventListener("click", () => {
    if (!rows.length) { showToast("Nothing to export with these filters."); return; }
    const headers = ["When", "Who", "Role", "Action", "Module", "Record ID"];
    const data = rows.map(a => [
      fmtDateTime(a.at), a.user || "", a.role || "", a.action || "", a.collection || "", a.doc_id || ""
    ]);
    const label = monitorFilter.role ? `Activity_${monitorFilter.role}` : "Activity_log";
    exportRowsToExcel(label, headers, data);
  });

  // Master-only clear handlers
  if (isMaster) {
    const clearOld = document.getElementById("clearOldLogsBtn");
    if (clearOld) clearOld.addEventListener("click", () => clearAuditLog("old"));
    const clearAll = document.getElementById("clearAllLogsBtn");
    if (clearAll) clearAll.addEventListener("click", () => clearAuditLog("all"));
  }
}

async function clearAuditLog(mode) {
  if (!currentStaff || currentStaff.role !== "master") {
    showToast("Only the master admin can clear the log.", true);
    return;
  }
  let toDelete;
  if (mode === "old") {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    toDelete = store.audit_log.filter(a => (a.at || "") < cutoff);
    if (!toDelete.length) { showToast("No entries older than 30 days."); return; }
    if (!confirm(`Clear ${toDelete.length} log entries older than 30 days? This cannot be undone.`)) return;
  } else {
    toDelete = [...store.audit_log];
    if (!toDelete.length) { showToast("The log is already empty."); return; }
    if (!confirm(`Clear ALL ${toDelete.length} log entries? This permanently erases the whole audit trail and cannot be undone.`)) return;
  }
  try {
    // Delete in batches to stay within Firestore limits
    let done = 0;
    for (let i = 0; i < toDelete.length; i += 400) {
      const batch = db.batch();
      toDelete.slice(i, i + 400).forEach(a => { if (a.id) batch.delete(db.collection("audit_log").doc(a.id)); });
      await batch.commit();
      done += Math.min(400, toDelete.length - i);
    }
    showToast(`Cleared ${done} log ${done === 1 ? "entry" : "entries"}.`);
  } catch (err) {
    console.error(err);
    showToast("Could not clear the log — check your permissions and try again.", true);
  }
}


/* ---------------- Sales Tracker ---------------- */

let trackerPreset = "month";
let trackerView = "sales"; // "sales" or "products"

function renderSalesTracker(root) {
  root = root || document.getElementById("moduleContent");
  if (trackerView === "products") return renderProfitByProduct(root);
  return renderSalesList(root);
}

function renderSalesList(root) {
  root = root || document.getElementById("moduleContent");
  const presets = { today: "Today", week: "This week", month: "This month", all: "All time" };

  // Start with recorded sales, PLUS any online orders not yet converted to sales,
  // so online orders always reflect here even before they're formally recorded.
  const syntheticFromOrders = store.online_orders
    .filter(o => !o.sale_id && (o.items || []).length)
    .map(o => {
      const items = (o.items || []).map(it => {
        const prod = store.products.find(p => (p.name || "").trim().toLowerCase() === (it.name || "").trim().toLowerCase());
        const size = prod ? sizeFromVariant(prod, it.variant) : null;
        const unitPrice = (it.price != null && it.price !== "") ? Number(it.price)
          : (size ? size.price : (prod ? prod.selling_price || 0 : 0));
        const unitCost = (prod && size) ? sizeFullCost(prod, size) : (prod ? productFullCost(prod) : 0);
        return { name: it.name + (it.variant ? " (" + it.variant + ")" : ""), qty: Number(it.qty) || 0, unit_price: unitPrice, unit_cost: unitCost, line_total: unitPrice * (Number(it.qty) || 0) };
      });
      const total = (o.estimated_total != null && o.estimated_total > 0) ? o.estimated_total : items.reduce((s, i) => s + i.line_total, 0);
      return {
        id: "order-" + o.id, items, total,
        payment_method: (o.payment_status || "").startsWith("paid") ? "Online (paid)" : "Online (unpaid)",
        customer_name: (o.name || "Online customer") + " ⓘ",
        timestamp: o.created_at || new Date().toISOString(),
        cashier_name: "Online order", _pending: true
      };
    });

  let salesRows = [...store.sales, ...syntheticFromOrders];
  let label = presets[trackerPreset];
  if (trackerPreset !== "all") {
    const { start, end } = rangeFor(trackerPreset);
    salesRows = salesRows.filter(sl => withinRange(sl.timestamp, start, end));
  }
  salesRows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const enriched = salesRows.map(sl => {
    const cogs = (sl.items || []).reduce((s, i) => s + (i.unit_cost || 0) * i.qty, 0);
    const profit = (sl.total || 0) - cogs;
    return { ...sl, cogs, profit, margin: sl.total ? (profit / sl.total * 100) : 0 };
  });

  const revenue = enriched.reduce((s, r) => s + (r.total || 0), 0);
  const cogs = enriched.reduce((s, r) => s + r.cogs, 0);
  const profit = revenue - cogs;
  const avg = enriched.length ? revenue / enriched.length : 0;

  const headers = ["Date", "Customer", "Items", "Payment", "Revenue", "COGS", "Profit", "Margin %", "Cashier"];
  const exportRows = enriched.map(r => [
    fmtDateTime(r.timestamp), r.customer_name || "Walk-in",
    (r.items || []).map(i => `${i.name} × ${i.qty}`).join("; "),
    r.payment_method || "", (r.total || 0).toFixed(2), r.cogs.toFixed(2), r.profit.toFixed(2),
    r.margin.toFixed(1), r.cashier_name || ""
  ]);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Sales Tracker</h2>
        <p class="panel-sub">Every sale with cost and profit calculated automatically. ${label}.${syntheticFromOrders.length ? ` Includes ${syntheticFromOrders.length} online order${syntheticFromOrders.length !== 1 ? "s" : ""} (marked ⓘ). If you don't see older orders, switch to "All time".` : ""}</p>
      </div>
      <div>
        <span class="segmented">
          <button class="seg-btn is-active" data-tview="sales">By sale</button>
          <button class="seg-btn" data-tview="products">By product</button>
        </span>
        <span class="segmented">
          ${Object.entries(presets).map(([k, v]) => `<button class="seg-btn ${trackerPreset === k ? "is-active" : ""}" data-tpreset="${k}">${v}</button>`).join("")}
        </span>
        <button class="btn btn-ghost btn-small" id="trkXls">Export Excel</button>
        <button class="btn btn-ghost btn-small" id="trkPdf">Export PDF</button>
      </div>
    </div>

    <div class="kpi-grid" style="margin-bottom:22px;">
      <div class="kpi-card"><span class="kpi-label">Revenue</span><span class="kpi-value">${fmtMoney(revenue)}</span><span class="kpi-sub">${enriched.length} sale${enriched.length === 1 ? "" : "s"}</span></div>
      <div class="kpi-card"><span class="kpi-label">Cost of goods</span><span class="kpi-value">${fmtMoney(cogs)}</span></div>
      <div class="kpi-card ${profit < 0 ? "kpi-bad" : ""}"><span class="kpi-label">Profit</span><span class="kpi-value">${fmtMoney(profit)}</span><span class="kpi-sub">${revenue ? (profit / revenue * 100).toFixed(1) : 0}% margin</span></div>
      <div class="kpi-card"><span class="kpi-label">Average order</span><span class="kpi-value">${fmtMoney(avg)}</span></div>
    </div>

    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Revenue</th><th>COGS</th><th>Profit</th><th>Margin</th><th></th></tr></thead>
        <tbody>
          ${enriched.map(r => `
            <tr class="${r.profit < 0 ? "row-low" : ""}">
              <td class="num">${fmtDateTime(r.timestamp)}</td>
              <td>${esc(r.customer_name || "Walk-in")}</td>
              <td>${(r.items || []).map(i => `${esc(i.name)} × ${i.qty}`).join(", ")}</td>
              <td>${esc(r.payment_method || "")}</td>
              <td class="num">${fmtMoney(r.total || 0)}</td>
              <td class="num">${fmtMoney(r.cogs)}</td>
              <td class="num"><strong>${fmtMoney(r.profit)}</strong></td>
              <td class="num">${r.margin.toFixed(0)}%</td>
              <td><button class="btn btn-ghost btn-small" data-trk-receipt="${r.id}">Receipt</button></td>
            </tr>
          `).join("") || `<tr><td colspan="9" class="empty-state">No sales in this period.</td></tr>`}
        </tbody>
        ${enriched.length ? `<tfoot><tr><td colspan="4">Totals</td><td class="num">${fmtMoney(revenue)}</td><td class="num">${fmtMoney(cogs)}</td><td class="num">${fmtMoney(profit)}</td><td colspan="2"></td></tr></tfoot>` : ""}
      </table>
    </div>
  `;

  root.querySelectorAll("[data-tpreset]").forEach(btn => btn.addEventListener("click", () => {
    trackerPreset = btn.dataset.tpreset; renderSalesTracker(root);
  }));
  root.querySelectorAll("[data-tview]").forEach(btn => btn.addEventListener("click", () => {
    trackerView = btn.dataset.tview; renderSalesTracker(root);
  }));
  root.querySelectorAll("[data-trk-receipt]").forEach(btn => btn.addEventListener("click", () =>
    printReceiptForSale(store.sales.find(sl => sl.id === btn.dataset.trkReceipt))));
  document.getElementById("trkXls").addEventListener("click", () => exportRowsToExcel("Sales Tracker", headers, exportRows));
  document.getElementById("trkPdf").addEventListener("click", () => exportRowsToPDF("Sales Tracker — " + label, headers, exportRows));
}


/* ---------------- Profit by Product ---------------- */

function renderProfitByProduct(root) {
  root = root || document.getElementById("moduleContent");
  const presets = { today: "Today", week: "This week", month: "This month", all: "All time" };
  let salesRows = [...store.sales];
  let label = presets[trackerPreset];
  if (trackerPreset !== "all") {
    const { start, end } = rangeFor(trackerPreset);
    salesRows = salesRows.filter(sl => withinRange(sl.timestamp, start, end));
  }

  // Aggregate per product
  const agg = {};
  salesRows.forEach(sl => {
    (sl.items || []).forEach(i => {
      const key = i.product_id || i.name;
      if (!agg[key]) agg[key] = { name: i.name, qty: 0, revenue: 0, cost: 0, fullCost: 0 };
      agg[key].qty += i.qty;
      agg[key].revenue += (i.unit_price || 0) * i.qty;
      agg[key].cost += (i.unit_cost || 0) * i.qty;
      // Fully-loaded cost for TRUE profit — priced at the SIZE that was sold,
      // not the standard unit, or small loaves look far less profitable than they are.
      const p = productById(i.product_id);
      const full = p ? sizeFullCost(p, findSize(p, i.size_name)) : (i.unit_cost || 0);
      agg[key].fullCost += full * i.qty;
    });
  });

  let rows = Object.values(agg).map(p => {
    const profit = p.revenue - p.fullCost; // TRUE profit after all costs
    return {
      ...p, profit, cost: p.fullCost,
      margin: p.revenue ? (profit / p.revenue * 100) : 0,
      unitProfit: p.qty ? profit / p.qty : 0,
      unitPrice: p.qty ? p.revenue / p.qty : 0,
      unitCost: p.qty ? p.fullCost / p.qty : 0
    };
  }).sort((a, b) => b.profit - a.profit);

  const totRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totCost = rows.reduce((s, r) => s + r.cost, 0);
  const totProfit = totRevenue - totCost;
  const totQty = rows.reduce((s, r) => s + r.qty, 0);
  const best = rows[0];
  const worst = rows.length > 1 ? rows[rows.length - 1] : null;

  const headers = ["Product", "Qty sold", "Revenue", "Cost", "Profit", "Margin %", "Profit/unit", "% of total profit"];
  const exportRows = rows.map(r => [
    r.name, r.qty, r.revenue.toFixed(2), r.cost.toFixed(2), r.profit.toFixed(2),
    r.margin.toFixed(1), r.unitProfit.toFixed(2), totProfit ? (r.profit / totProfit * 100).toFixed(1) : "0"
  ]);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Sales Tracker</h2>
        <p class="panel-sub">Profit by product — actuals and percentages. ${label}.</p>
      </div>
      <div>
        <span class="segmented">
          <button class="seg-btn" data-tview="sales">By sale</button>
          <button class="seg-btn is-active" data-tview="products">By product</button>
        </span>
        <span class="segmented">
          ${Object.entries(presets).map(([k, v]) => `<button class="seg-btn ${trackerPreset === k ? "is-active" : ""}" data-tpreset="${k}">${v}</button>`).join("")}
        </span>
        <button class="btn btn-ghost btn-small" id="ppXls">Export Excel</button>
        <button class="btn btn-ghost btn-small" id="ppPdf">Export PDF</button>
      </div>
    </div>

    <div class="kpi-grid" style="margin-bottom:20px;">
      <div class="kpi-card"><span class="kpi-label">Total profit</span><span class="kpi-value">${fmtMoney(totProfit)}</span><span class="kpi-sub">${totRevenue ? (totProfit/totRevenue*100).toFixed(1) : 0}% overall margin</span></div>
      <div class="kpi-card"><span class="kpi-label">Units sold</span><span class="kpi-value">${totQty.toLocaleString()}</span></div>
      <div class="kpi-card"><span class="kpi-label">Best earner</span><span class="kpi-value" style="font-size:1.1rem;">${best ? esc(best.name) : "—"}</span><span class="kpi-sub">${best ? fmtMoney(best.profit) + " profit" : ""}</span></div>
      <div class="kpi-card ${worst && worst.margin < 10 ? "kpi-bad" : ""}"><span class="kpi-label">Lowest margin</span><span class="kpi-value" style="font-size:1.1rem;">${worst ? esc(worst.name) : "—"}</span><span class="kpi-sub">${worst ? worst.margin.toFixed(0) + "% margin" : ""}</span></div>
    </div>

    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Product</th><th>Qty sold</th><th>Revenue</th><th>Full cost</th><th>True profit</th><th>Margin</th><th>Profit / unit</th><th>Share of profit</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr class="${r.margin < 0 ? "row-low" : ""}">
              <td><strong>${esc(r.name)}</strong></td>
              <td class="num">${r.qty.toLocaleString()}</td>
              <td class="num">${fmtMoney(r.revenue)}</td>
              <td class="num">${fmtMoney(r.cost)}</td>
              <td class="num"><strong>${fmtMoney(r.profit)}</strong></td>
              <td class="num">${r.margin.toFixed(0)}%</td>
              <td class="num">${fmtMoney(r.unitProfit)}</td>
              <td class="num">
                <div class="profit-bar-wrap" title="${totProfit ? (r.profit/totProfit*100).toFixed(1) : 0}% of total profit">
                  <div class="profit-bar" style="width:${totProfit > 0 ? Math.max(0, Math.min(100, r.profit/totProfit*100)) : 0}%;"></div>
                  <span>${totProfit ? (r.profit/totProfit*100).toFixed(0) : 0}%</span>
                </div>
              </td>
            </tr>
          `).join("") || `<tr><td colspan="8" class="empty-state">No sales in this period.</td></tr>`}
        </tbody>
        ${rows.length ? `<tfoot><tr><td>Totals</td><td class="num">${totQty.toLocaleString()}</td><td class="num">${fmtMoney(totRevenue)}</td><td class="num">${fmtMoney(totCost)}</td><td class="num">${fmtMoney(totProfit)}</td><td class="num">${totRevenue ? (totProfit/totRevenue*100).toFixed(0) : 0}%</td><td colspan="2"></td></tr></tfoot>` : ""}
      </table>
    </div>
  `;

  root.querySelectorAll("[data-tpreset]").forEach(btn => btn.addEventListener("click", () => { trackerPreset = btn.dataset.tpreset; renderSalesTracker(root); }));
  root.querySelectorAll("[data-tview]").forEach(btn => btn.addEventListener("click", () => { trackerView = btn.dataset.tview; renderSalesTracker(root); }));
  document.getElementById("ppXls").addEventListener("click", () => exportRowsToExcel("Profit by Product", headers, exportRows));
  document.getElementById("ppPdf").addEventListener("click", () => exportRowsToPDF("Profit by Product — " + label, headers, exportRows));
}
