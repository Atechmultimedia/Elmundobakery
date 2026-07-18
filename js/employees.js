/* ============================================================
   Employees — proper HR records, separate from login accounts.
   Every worker gets a record here; only some get system access.
   ============================================================ */

const DEPARTMENTS = ["Production", "Sales", "Delivery", "Admin", "Other"];
const EMPLOYEE_STATUS = ["Active", "On leave", "Terminated"];

function employeeById(id) { return store.employees.find(e => e.id === id); }

/* One-time silent migration: every login account gets an employee
   record with the same id, so documents/shifts keep working. */
async function migrateAccountsToEmployees() {
  if (!["master", "admin", "manager", "hr_manager"].includes(currentStaff.role)) return;
  for (const acc of store.staff) {
    if (store.employees.find(e => e.id === acc.id)) continue;
    try {
      await setDoc("employees", acc.id, {
        name: acc.name, job_title: acc.role === "master" ? "Owner" : (acc.role || ""),
        department: acc.role === "delivery" ? "Delivery" : acc.role === "baker" ? "Production" : acc.role === "cashier" ? "Sales" : "Admin",
        phone: acc.phone || "", email: acc.email || "",
        pay_type: acc.pay_type || "monthly",
        hourly_rate: acc.hourly_rate || 0, monthly_salary: acc.monthly_salary || 0,
        status: acc.active === false ? "Terminated" : "Active",
        date_hired: "", account_id: acc.id, migrated: true
      });
    } catch (e) { /* non-blocking */ }
  }
}

function renderEmployees(root) {
  root = root || document.getElementById("moduleContent");
  const canEdit = ["master", "admin", "manager", "hr_manager"].includes(currentStaff.role);

  const headers = ["Name", "Job title", "Department", "Phone", "Pay", "Hired", "Status"];
  const rows = [...store.employees].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const exportRows = rows.map(e => [
    e.name, e.job_title || "", e.department || "", e.phone || "",
    e.pay_type === "hourly" ? (e.hourly_rate || 0) + "/hr" : (e.monthly_salary || 0) + "/mo",
    e.date_hired || "", e.status || "Active"
  ]);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Employees</h2>
        <p class="panel-sub">The full staff register — every worker, with or without a system login.</p>
      </div>
      <div>
        <button class="btn btn-ghost btn-small" id="empXls">Export Excel</button>
        <button class="btn btn-ghost btn-small" id="empPdf">Export PDF</button>
        ${canEdit ? `<button class="btn btn-ghost" id="syncPinsBtn" title="Push all staff PINs to the Clock/Shifts portal">Sync PINs to portal</button>
        <button class="btn btn-primary" id="addEmployeeBtn">Add employee</button>` : ""}
      </div>
    </div>

    <div class="kpi-grid" style="margin-bottom:20px;">
      <div class="kpi-card"><span class="kpi-label">Active employees</span><span class="kpi-value">${rows.filter(e => e.status !== "Terminated").length}</span></div>
      <div class="kpi-card"><span class="kpi-label">With system login</span><span class="kpi-value">${rows.filter(e => e.account_id).length}</span></div>
      <div class="kpi-card"><span class="kpi-label">On leave</span><span class="kpi-value">${rows.filter(e => e.status === "On leave").length}</span></div>
    </div>

    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Employee</th><th>Job title</th><th>Department</th><th>Phone</th><th>Pay</th><th>Hired</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${rows.map(e => {
            const photo = store.staff_documents.find(d => d.staff_id === e.id && d.doc_type === "Passport Photo");
            return `
            <tr class="${e.status === "Terminated" ? "row-low" : ""}">
              <td>
                <span class="staff-cell">
                  ${photo ? `<img src="${photo.image}" alt="" class="staff-avatar">` : `<span class="staff-avatar staff-avatar-empty">${esc((e.name || "?").charAt(0).toUpperCase())}</span>`}
                  <strong>${esc(e.name)}</strong>
                </span>
              </td>
              <td style="text-transform:capitalize;">${esc(e.job_title || "")}</td>
              <td>${esc(e.department || "")}</td>
              <td>${esc(e.phone || "")}</td>
              <td class="num">${e.pay_type === "hourly" ? fmtMoney(e.hourly_rate || 0) + "/hr" : fmtMoney(e.monthly_salary || 0) + "/mo"}</td>
              <td class="num">${e.date_hired ? fmtDate(e.date_hired) : "—"}</td>
              <td><span class="status-pill ${e.status === "Active" ? "status-ok" : "status-low"}">${esc(e.status || "Active")}</span>${e.account_id ? ' <span class="status-pill status-ok" title="Has system login">🔑</span>' : ""}${!e.pin && e.status !== "Terminated" ? ' <span class="status-pill status-low" title="No clock-in PIN set — cannot use the portal">no PIN</span>' : ""}</td>
              <td><button class="btn btn-ghost btn-small" data-emp-profile="${e.id}">Profile</button></td>
            </tr>`;
          }).join("") || `<tr><td colspan="8" class="empty-state">No employees yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("empXls").addEventListener("click", () => exportRowsToExcel("Employees", headers, exportRows));
  document.getElementById("empPdf").addEventListener("click", () => exportRowsToPDF("Employees", headers, exportRows));
  if (canEdit) {
    document.getElementById("addEmployeeBtn").addEventListener("click", () => openEmployeeForm());
    document.getElementById("syncPinsBtn").addEventListener("click", () => syncClockPins(true));
  }
  root.querySelectorAll("[data-emp-profile]").forEach(btn => {
    btn.addEventListener("click", () => openEmployeeProfile(employeeById(btn.dataset.empProfile)));
  });
}

/* ---------------- add / edit employee ---------------- */

function openEmployeeForm(emp, prefill) {
  const isEdit = !!emp;
  const v = (k, d = "") => isEdit ? esc(emp[k] ?? d) : esc((prefill && prefill[k]) || d);

  openModal(`
    <h3>${isEdit ? "Edit employee" : "Add employee"}</h3>
    <form id="empForm" class="modal-form">
      <label>Full name <input type="text" id="emName" value="${v("name")}" required></label>
      <div class="form-row-2">
        <label>Job title <input type="text" id="emJob" value="${v("job_title")}" placeholder="e.g. Baker" required></label>
        <label>Department
          <select id="emDept">${DEPARTMENTS.map(d => `<option ${isEdit && emp.department === d ? "selected" : ""}>${d}</option>`).join("")}</select>
        </label>
      </div>
      <div class="form-row-2">
        <label>Phone <input type="text" id="emPhone" value="${v("phone")}"></label>
        <label>Email (optional) <input type="email" id="emEmail" value="${v("email")}"></label>
      </div>
      <div class="form-row-2">
        <label>Date hired <input type="date" id="emHired" value="${isEdit ? (emp.date_hired || "") : todayISO()}"></label>
        <label>Status
          <select id="emStatus">${EMPLOYEE_STATUS.map(st => `<option ${isEdit && emp.status === st ? "selected" : ""}>${st}</option>`).join("")}</select>
        </label>
      </div>
      <div class="form-row-2">
        <label>Pay type
          <select id="emPayType">
            <option value="monthly" ${isEdit && emp.pay_type === "monthly" ? "selected" : ""}>Monthly salary</option>
            <option value="hourly" ${isEdit && emp.pay_type === "hourly" ? "selected" : ""}>Hourly rate</option>
          </select>
        </label>
        <label>Amount (GHS) <input type="number" step="0.01" min="0" id="emRate" value="${isEdit ? (emp.pay_type === "hourly" ? emp.hourly_rate : emp.monthly_salary) || 0 : "0"}"></label>
      </div>
      <label>Home address <input type="text" id="emAddress" value="${v("address")}"></label>

      <p class="modal-hint" style="margin-top:6px;"><strong>Next of kin / emergency contact</strong></p>
      <div class="form-row-2">
        <label>Name <input type="text" id="emKinName" value="${v("kin_name")}"></label>
        <label>Phone <input type="text" id="emKinPhone" value="${v("kin_phone")}"></label>
      </div>
      <label>Relationship <input type="text" id="emKinRel" value="${v("kin_relation")}" placeholder="e.g. spouse, mother"></label>

      <p class="modal-hint" style="margin-top:6px;"><strong>Salary payment details</strong></p>
      <div class="form-row-2">
        <label>Mobile Money number <input type="text" id="emMomo" value="${v("momo_number")}"></label>
        <label>MoMo registered name <input type="text" id="emMomoName" value="${v("momo_name")}"></label>
      </div>
      <div class="form-row-2">
        <label>Bank (optional) <input type="text" id="emBank" value="${v("bank_name")}"></label>
        <label>Account number (optional) <input type="text" id="emBankAcc" value="${v("bank_account")}"></label>
      </div>

      <p class="modal-hint" style="margin-top:6px;"><strong>IDs (all optional)</strong></p>
      <div class="form-row-2">
        <label>Ghana Card number (optional) <input type="text" id="emGhCard" value="${v("ghana_card")}"></label>
        <label>SSNIT number (optional) <input type="text" id="emSSNIT" value="${v("ssnit")}"></label>
      </div>
      <label>TIN (optional) <input type="text" id="emTIN" value="${v("tin")}"></label>

      <p class="modal-hint" style="margin-top:6px;"><strong>Guarantor</strong> — must provide their Ghana Card (upload it under Documents as "Guarantor's Ghana Card")</p>
      <div class="form-row-2">
        <label>Guarantor name <input type="text" id="emGuarName" value="${v("guarantor_name")}"></label>
        <label>Guarantor phone <input type="text" id="emGuarPhone" value="${v("guarantor_phone")}"></label>
      </div>
      <label>Guarantor address <input type="text" id="emGuarAddr" value="${v("guarantor_address")}"></label>

      <div class="form-row-2">
        <label>Clock-in PIN (4 digits — used for the portal, kiosk &amp; online clock)
          <span class="pin-field">
            <input type="text" id="emPin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" value="${isEdit ? esc(emp.pin || "") : (prefill && prefill.pin) || suggestUniquePin()}" placeholder="4 digits">
            <button type="button" class="btn btn-ghost btn-small" id="emPinGen">Generate</button>
          </span>
        </label>
        <span></span>
      </div>
      <p class="modal-hint" style="margin-top:-6px;">A PIN is auto-suggested for new staff — keep it or type your own. You can share it after saving.</p>

      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="emCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save" : "Add employee"}</button>
        </div>
      </div>
    </form>
  `);

  document.getElementById("emCancelBtn").addEventListener("click", closeModal);
  const pinGenBtn = document.getElementById("emPinGen");
  if (pinGenBtn) pinGenBtn.addEventListener("click", () => {
    document.getElementById("emPin").value = suggestUniquePin();
  });
  document.getElementById("empForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payType = document.getElementById("emPayType").value;
    const rate = Number(document.getElementById("emRate").value || 0);
    const data = {
      name: document.getElementById("emName").value.trim(),
      job_title: document.getElementById("emJob").value.trim(),
      department: document.getElementById("emDept").value,
      phone: document.getElementById("emPhone").value.trim(),
      email: document.getElementById("emEmail").value.trim(),
      date_hired: document.getElementById("emHired").value,
      status: document.getElementById("emStatus").value,
      pay_type: payType,
      hourly_rate: payType === "hourly" ? rate : 0,
      monthly_salary: payType === "monthly" ? rate : 0,
      address: document.getElementById("emAddress").value.trim(),
      kin_name: document.getElementById("emKinName").value.trim(),
      kin_phone: document.getElementById("emKinPhone").value.trim(),
      kin_relation: document.getElementById("emKinRel").value.trim(),
      momo_number: document.getElementById("emMomo").value.trim(),
      momo_name: document.getElementById("emMomoName").value.trim(),
      bank_name: document.getElementById("emBank").value.trim(),
      bank_account: document.getElementById("emBankAcc").value.trim(),
      ghana_card: document.getElementById("emGhCard").value.trim(),
      ssnit: document.getElementById("emSSNIT").value.trim(),
      tin: document.getElementById("emTIN").value.trim(),
      guarantor_name: document.getElementById("emGuarName").value.trim(),
      guarantor_phone: document.getElementById("emGuarPhone").value.trim(),
      guarantor_address: document.getElementById("emGuarAddr").value.trim(),
      pin: document.getElementById("emPin").value.trim()
    };
    let empId;
    const pinChanged = !isEdit || (emp && emp.pin !== data.pin);
    if (isEdit) { await setDoc("employees", emp.id, data); empId = emp.id; }
    else empId = await addDoc("employees", data);
    if (data.pin && data.status !== "Terminated") {
      try {
        const pin_hash = await sha256Hex(data.pin);
        await db.collection("clock_pins").doc(empId).set({ name: data.name, pin_hash }, { merge: true });
      } catch (e2) {}
    }
    closeModal();
    showToast(isEdit ? "Employee updated." : "Employee added.");
    if (data.pin && pinChanged) {
      setTimeout(() => sharePinDialog({ name: data.name, phone: data.phone, pin: data.pin }), 250);
    }
  });
}

/* ---------------- profile ---------------- */

function openEmployeeProfile(emp) {
  if (!emp) return;
  const photo = store.staff_documents.find(d => d.staff_id === emp.id && d.doc_type === "Passport Photo");
  const docs = store.staff_documents.filter(d => d.staff_id === emp.id);
  const required = requiredDocsForEmployee(emp);
  const have = new Set(docs.map(d => d.doc_type));
  const missing = required.filter(r => !have.has(r));

  const attendance = store.attendance.filter(a => a.staff_id === emp.id)
    .sort((a, b) => (b.clock_in || "").localeCompare(a.clock_in || "")).slice(0, 8);
  const leave = store.timeoff.filter(t => t.staff_name === emp.name).slice(0, 5);
  const reviews = store.appraisals.filter(a => a.staff_name === emp.name).slice(0, 3);
  const account = store.staff.find(a => a.id === emp.account_id || a.id === emp.id);
  const canEdit = ["master", "admin", "manager", "hr_manager"].includes(currentStaff.role);

  openModal(`
    <h3>${esc(emp.name)}</h3>
    <div class="docs-head">
      ${photo ? `<img src="${photo.image}" class="docs-photo" alt="">` : `<div class="docs-photo docs-photo-empty">No photo</div>`}
      <div style="font-size:0.88rem;line-height:1.7;">
        <strong style="text-transform:capitalize;">${esc(emp.job_title || "")}</strong> · ${esc(emp.department || "")}<br>
        ${esc(emp.phone || "")} ${emp.email ? "· " + esc(emp.email) : ""}<br>
        Hired ${emp.date_hired ? fmtDate(emp.date_hired) : "—"} ·
        <span class="status-pill ${emp.status === "Active" ? "status-ok" : "status-low"}">${esc(emp.status || "Active")}</span><br>
        Pay: ${emp.pay_type === "hourly" ? fmtMoney(emp.hourly_rate || 0) + "/hr" : fmtMoney(emp.monthly_salary || 0) + "/month"}<br>
        ${account ? `System login: <strong>${esc(account.email)}</strong> (${esc(account.role)})` : `<em>No system login</em>`}
      </div>
    </div>

    <div class="profile-grid">
      <div><span class="lbl">Next of kin</span>${esc(emp.kin_name || "—")} ${emp.kin_relation ? "(" + esc(emp.kin_relation) + ")" : ""} ${esc(emp.kin_phone || "")}</div>
      <div><span class="lbl">Address</span>${esc(emp.address || "—")}</div>
      <div><span class="lbl">MoMo</span>${esc(emp.momo_number || "—")} ${emp.momo_name ? "(" + esc(emp.momo_name) + ")" : ""}</div>
      <div><span class="lbl">Bank</span>${esc(emp.bank_name || "—")} ${esc(emp.bank_account || "")}</div>
      <div><span class="lbl">Ghana Card</span>${esc(emp.ghana_card || "—")}</div>
      <div><span class="lbl">SSNIT</span>${esc(emp.ssnit || "—")}${emp.tin ? " · TIN " + esc(emp.tin) : ""}</div>
      <div><span class="lbl">Guarantor</span>${esc(emp.guarantor_name || "—")} ${esc(emp.guarantor_phone || "")}</div>
      <div><span class="lbl">Documents</span>${missing.length ? `<span style="color:var(--oven);">${missing.length} required missing</span>` : `<span style="color:var(--herb);">All required on file ✓</span>`}</div>
    </div>

    <p class="modal-hint" style="margin-top:10px;"><strong>Recent attendance</strong></p>
    ${attendance.length ? `<ul class="simple-list" style="font-size:0.82rem;">${attendance.map(a => {
      const hours = a.clock_out ? ((new Date(a.clock_out) - new Date(a.clock_in)) / 3600000).toFixed(1) + "h" : "on shift";
      return `<li>${fmtDateTime(a.clock_in)} — ${hours}</li>`;
    }).join("")}</ul>` : `<p class="empty-state">No attendance yet.</p>`}

    ${leave.length ? `<p class="modal-hint"><strong>Leave</strong></p><ul class="simple-list" style="font-size:0.82rem;">${leave.map(t => `<li>${esc(t.type)} · ${fmtDate(t.from)}–${fmtDate(t.to)} · ${esc(t.status || "Pending")}</li>`).join("")}</ul>` : ""}
    ${reviews.length ? `<p class="modal-hint"><strong>Appraisals</strong></p><ul class="simple-list" style="font-size:0.82rem;">${reviews.map(a => `<li>${fmtDate(a.date)} — ${esc(a.rating || "")}</li>`).join("")}</ul>` : ""}

    <div class="modal-actions" style="margin-top:16px;">
      <div>
        ${canEdit ? `<button type="button" class="btn btn-ghost" id="empEditBtn">Edit record</button>
        <button type="button" class="btn btn-ghost" id="empDocsBtn">Documents</button>
        ${emp.pin ? `<button type="button" class="btn btn-ghost" id="empPinBtn">Share PIN</button>` : ""}` : ""}
      </div>
      <div>
        ${canEdit && !account ? `<button type="button" class="btn btn-primary" id="empGrantBtn">Grant system access</button>` : ""}
        <button type="button" class="btn btn-ghost" id="empCloseBtn">Close</button>
      </div>
    </div>
  `);

  document.getElementById("empCloseBtn").addEventListener("click", closeModal);
  const editBtn = document.getElementById("empEditBtn");
  if (editBtn) editBtn.addEventListener("click", () => { closeModal(); setTimeout(() => openEmployeeForm(emp), 200); });
  const docsBtn = document.getElementById("empDocsBtn");
  if (docsBtn) docsBtn.addEventListener("click", () => { closeModal(); setTimeout(() => openStaffDocsModal({ id: emp.id, name: emp.name, role: emp.department === "Delivery" ? "delivery" : (emp.job_title || ""), email: emp.email }), 200); });
  const pinBtn = document.getElementById("empPinBtn");
  if (pinBtn) pinBtn.addEventListener("click", () => { closeModal(); setTimeout(() => sharePinDialog({ name: emp.name, phone: emp.phone, pin: emp.pin }), 200); });
  const grantBtn = document.getElementById("empGrantBtn");
  if (grantBtn) grantBtn.addEventListener("click", () => {
    closeModal();
    window._grantForEmployee = emp;
    setTimeout(() => openStaffForm(), 200);
  });
}

function suggestUniquePin() {
  const taken = new Set(store.employees.map(e => e.pin).filter(Boolean));
  let pin, tries = 0;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000)); // 1000–9999
    tries++;
  } while (taken.has(pin) && tries < 50);
  return pin;
}

function sharePinDialog(person) {
  const first = (person.name || "").split(" ")[0];
  const message = `Hi ${first}, welcome to El Mundo Bakery! Your staff clock-in PIN is ${person.pin}. ` +
    `Use it on the Staff Portal (from our website) to clock in/out and check your shifts. Please keep it private.`;
  const waPhone = person.phone ? person.phone.replace(/[^0-9]/g, "").replace(/^0/, "233") : "";

  openModal(`
    <h3>Share PIN — ${esc(person.name)}</h3>
    <div class="pin-reveal">${esc(person.pin)}</div>
    <p class="modal-hint" style="text-align:center;">This is ${esc(first)}'s clock-in PIN. Give it to them now — you can always see or change it later on their record.</p>
    <div class="modal-actions" style="justify-content:center;gap:10px;">
      <button type="button" class="btn btn-ghost" id="pinCopyBtn">Copy message</button>
      ${waPhone ? `<button type="button" class="btn btn-primary" id="pinWaBtn">Send on WhatsApp</button>` : `<span class="modal-hint">No phone on record for WhatsApp</span>`}
      <button type="button" class="btn btn-ghost" id="pinDoneBtn">Done</button>
    </div>
  `);
  document.getElementById("pinDoneBtn").addEventListener("click", closeModal);
  document.getElementById("pinCopyBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(message).then(
      () => showToast("Message copied — paste it to the staff member."),
      () => showToast("Couldn't copy automatically.", true)
    );
  });
  const waBtn = document.getElementById("pinWaBtn");
  if (waBtn) waBtn.addEventListener("click", () => {
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, "_blank");
  });
}

function requiredDocsForEmployee(emp) {
  const base = ["Passport Photo", "Health / Food Handler's Certificate",
                "Signed Contract", "Guarantor Form", "Guarantor's Ghana Card"];
  if (emp.department === "Delivery" || /driver/i.test(emp.job_title || "")) base.push("Driver's License");
  return base;
}

/* ---------------- online clock PIN sync ----------------
   The public clock page (clock.html) can't read employee records
   (they hold salaries and IDs), so active employees' names and
   HASHED pins are mirrored into the open "clock_pins" collection. */
async function syncClockPins(verbose) {
  if (!["master", "admin", "manager", "hr_manager"].includes(currentStaff.role)) return { synced: 0, failed: 0, noPin: 0 };
  let synced = 0, failed = 0, noPin = 0, lastError = null;
  for (const emp of store.employees) {
    if (emp.status === "Terminated") continue;
    if (!emp.pin) { noPin++; continue; }
    try {
      const pin_hash = await sha256Hex(emp.pin);
      await db.collection("clock_pins").doc(emp.id).set({ name: emp.name, pin_hash }, { merge: true });
      synced++;
    } catch (e) { failed++; lastError = e; console.error("clock_pins sync failed for", emp.name, e); }
  }
  if (verbose) {
    if (failed > 0) {
      showToast(`PIN sync FAILED for ${failed} staff. Likely the Firestore rules for "clock_pins" aren't published. (${lastError ? lastError.message : ""})`, true);
    } else {
      showToast(`Synced ${synced} PIN${synced === 1 ? "" : "s"} to the portal.${noPin ? " " + noPin + " staff still have no PIN." : ""}`);
    }
  }
  return { synced, failed, noPin };
}

/* ---------------- convert hired candidate ---------------- */

function convertCandidateToEmployee(candidateId) {
  const cand = store.candidates.find(c => c.id === candidateId);
  if (!cand) return;
  openEmployeeForm(null, {
    name: cand.name, phone: cand.phone || "", job_title: cand.role || ""
  });
  updateDoc("candidates", candidateId, { converted: true }).catch(() => {});
}
