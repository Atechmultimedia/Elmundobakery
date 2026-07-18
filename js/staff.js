/* ============================================================
   Staff
   ============================================================ */

function renderStaff(root) {
  root = root || document.getElementById("moduleContent");

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>System Accounts</h2>
        <p class="panel-sub">Login accounts and permissions only — the full staff register lives under HR → Employees.</p>
      </div>
      <button class="btn btn-primary" id="addStaffBtn">Create login</button>
    </div>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Pay</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${store.staff.map(s => {
            const photo = store.staff_documents.find(d => d.staff_id === s.id && d.doc_type === "Passport Photo");
            return `
            <tr>
              <td>
                <span class="staff-cell">
                  ${photo ? `<img src="${photo.image}" alt="" class="staff-avatar">` : `<span class="staff-avatar staff-avatar-empty">${esc((s.name || "?").charAt(0).toUpperCase())}</span>`}
                  ${esc(s.name)}
                </span>
              </td>
              <td style="text-transform:capitalize;">${esc(s.role)}</td>
              <td>${esc(s.email)}</td>
              <td class="num">${s.pay_type === "hourly" ? fmtMoney(s.hourly_rate || 0) + "/hr" : s.pay_type === "daily" ? fmtMoney(s.daily_wage || 0) + "/day" : fmtMoney(s.monthly_salary || 0) + "/mo"}</td>
              <td><span class="status-pill ${s.active === false ? "status-low" : "status-ok"}">${s.active === false ? "Inactive" : "Active"}</span></td>
              <td>
                <button class="btn btn-ghost btn-small" data-staff-docs="${s.id}">Documents</button>
                <button class="btn btn-ghost btn-small" data-toggle-active="${s.id}">${s.active === false ? "Reactivate" : "Deactivate"}</button>
              </td>
            </tr>
          `;}).join("") || `<tr><td colspan="6" class="empty-state">No staff yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("addStaffBtn").addEventListener("click", openStaffForm);
  root.querySelectorAll("[data-staff-docs]").forEach(btn => {
    btn.addEventListener("click", () => openStaffDocsModal(staffById(btn.dataset.staffDocs)));
  });
  root.querySelectorAll("[data-toggle-active]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const s = staffById(btn.dataset.toggleActive);
      await updateDoc("staff", s.id, { active: s.active === false ? true : false });
      showToast(s.active === false ? "Staff reactivated." : "Staff deactivated.");
    });
  });
}

function openStaffForm() {
  const grantFor = window._grantForEmployee || null;
  window._grantForEmployee = null;
  openModal(`
    <h3>${grantFor ? "Grant system access — " + esc(grantFor.name) : "Create login"}</h3>
    <p class="modal-hint">This creates a real login for them. Share the temporary password so they can sign in and change it.</p>
    <form id="staffForm" class="modal-form">
      <label>Full name <input type="text" id="stName" value="${grantFor ? esc(grantFor.name) : ""}" required></label>
      <label>Email <input type="email" id="stEmail" value="${grantFor ? esc(grantFor.email || "") : ""}" required></label>
      <label>Temporary password <input type="text" id="stPassword" minlength="6" required></label>
      <label>Role
        <select id="stRole">
          ${currentStaff.role === "master" ? '<option value="master">Master Admin</option>' : ""}
          <option value="admin">Admin</option>
          <option value="manager">General Manager (broad oversight)</option>
          <option value="finance_manager">Finance Manager</option>
          <option value="hr_manager">HR Manager</option>
          <option value="production_manager">Production Manager</option>
          <option value="sales_manager">Sales Manager</option>
          <option value="cashier" selected>Cashier</option>
          <option value="baker">Baker</option>
          <option value="delivery">Delivery driver</option>
          <option value="marketing">Marketing</option>
          <option value="finance">Finance</option>
        </select>
        <span id="roleDesc" class="role-desc"></span>
      </label>
      <div class="form-row-2">
        <label>Pay type
          <select id="stPayType">
            <option value="monthly" selected>Monthly salary</option>
            <option value="daily">Daily wage</option>
            <option value="hourly">Hourly rate</option>
          </select>
        </label>
        <label id="stRateLabel">Monthly salary (GHS) <input type="number" step="0.01" min="0" id="stRate" value="0"></label>
      </div>
      <label>Phone <input type="text" id="stPhone"></label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="staffCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="staffSubmitBtn">Create login</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("staffCancelBtn").addEventListener("click", closeModal);
  // Plain-language description of what each role can access
  const ROLE_DESCRIPTIONS = {
    master: "Full owner access — everything, including staff accounts, settings, audit log, and backups. Only create for a co-owner you fully trust.",
    admin: "Nearly everything, including creating staff logins. Cannot do master-only actions.",
    manager: "General Manager — runs all daily operations across every department. Cannot manage staff accounts, settings, audit log, or backups.",
    finance_manager: "Finance department only — ledger, payroll, expenses, assets, invoicing, cash, suppliers.",
    hr_manager: "People/HR only — employees, scheduling, recruitment, appraisals, attendance, time-off, payroll.",
    production_manager: "Kitchen only — inventory, recipes, production, planning, quality, waste, maintenance.",
    sales_manager: "Sales only — POS, e-commerce, customers, CRM, invoicing, delivery, marketing.",
    cashier: "Point of Sale, e-commerce orders, customers, invoicing, and cash reconciliation.",
    baker: "Inventory, recipes, production, quality, and waste tracking.",
    delivery: "Deliveries and fleet only.",
    marketing: "Campaigns, CRM, social and email marketing.",
    finance: "Finance staff — expenses, ledger, payroll, invoicing (view/enter, not manager-level control)."
  };
  const roleSel = document.getElementById("stRole");
  const roleDescEl = document.getElementById("roleDesc");
  const updateRoleDesc = () => { if (roleDescEl) roleDescEl.textContent = ROLE_DESCRIPTIONS[roleSel.value] || ""; };
  roleSel.addEventListener("change", updateRoleDesc);
  updateRoleDesc(); // show for the default selection

  document.getElementById("stPayType").addEventListener("change", (e) => {
    document.getElementById("stRateLabel").firstChild.textContent =
      e.target.value === "monthly" ? "Monthly salary (GHS) "
        : e.target.value === "daily" ? "Daily wage (GHS) "
        : "Hourly rate (GHS) ";
  });
  document.getElementById("staffForm").addEventListener("submit", (e) => createStaffLogin(e, grantFor));
}

async function createStaffLogin(e, grantFor) {
  e.preventDefault();
  const submitBtn = document.getElementById("staffSubmitBtn");
  submitBtn.disabled = true;

  const name = document.getElementById("stName").value.trim();
  const email = document.getElementById("stEmail").value.trim();
  const password = document.getElementById("stPassword").value;
  const role = document.getElementById("stRole").value;
  const pay_type = document.getElementById("stPayType").value;
  const rateVal = Number(document.getElementById("stRate").value || 0);
  const hourly_rate = pay_type === "hourly" ? rateVal : 0;
  const daily_wage = pay_type === "daily" ? rateVal : 0;
  const monthly_salary = pay_type === "monthly" ? rateVal : 0;
  const phone = document.getElementById("stPhone").value.trim();

  try {
    // Created on the secondary Firebase app instance so the
    // currently signed-in admin session is not disturbed.
    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;
    await secondaryAuth.signOut();

    await setDoc("staff", uid, { name, email, role, pay_type, hourly_rate, daily_wage, monthly_salary, phone, active: true, employee_id: grantFor ? grantFor.id : null });
    if (grantFor) await updateDoc("employees", grantFor.id, { account_id: uid, email });
    else await setDoc("employees", uid, {
      name, email, phone, job_title: role, department: role === "delivery" ? "Delivery" : role === "baker" ? "Production" : role === "cashier" ? "Sales" : "Admin",
      pay_type, hourly_rate, daily_wage, monthly_salary, status: "Active", date_hired: todayISO(), account_id: uid
    });

    closeModal();
    showToast(`${name}'s login is ready.`);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not create this login.", true);
    submitBtn.disabled = false;
  }
}


/* ============================================================
   Employee documents — ID cards, passport photo, certificates.
   Images are compressed in the browser and stored in Firestore
   (kept under ~900KB each, no separate file storage needed).
   ============================================================ */

const STAFF_DOC_TYPES = [
  "Passport Photo", "Ghana Card (Front)", "Ghana Card (Back)",
  "Guarantor's Ghana Card", "Health / Food Handler's Certificate",
  "Signed Contract", "Guarantor Form",
  "Driver's License", "SSNIT Card", "Police Clearance", "CV / Resume", "Other"
];

// Required set. The employee's own Ghana Card and SSNIT are OPTIONAL —
// but the guarantor must provide their Ghana Card.
function requiredDocsFor(staff) {
  const base = ["Passport Photo", "Health / Food Handler's Certificate",
                "Signed Contract", "Guarantor Form", "Guarantor's Ghana Card"];
  if (staff.role === "delivery") base.push("Driver's License");
  return base;
}

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a readable image."));
      img.onload = () => {
        const maxSide = 900;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          const scale = maxSide / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        let out = canvas.toDataURL("image/jpeg", 0.72);
        if (out.length > 900000) out = canvas.toDataURL("image/jpeg", 0.5);
        if (out.length > 900000) { reject(new Error("Image is too large even after compression — try a smaller photo.")); return; }
        resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openStaffDocsModal(staff) {
  if (!staff) return;
  const docs = store.staff_documents.filter(d => d.staff_id === staff.id);
  const photo = docs.find(d => d.doc_type === "Passport Photo");
  const required = requiredDocsFor(staff);
  const have = new Set(docs.map(d => d.doc_type));
  const missing = required.filter(r => !have.has(r));

  openModal(`
    <h3>Documents — ${esc(staff.name)}</h3>
    <div class="docs-head">
      ${photo
        ? `<img src="${photo.image}" alt="Passport photo of ${esc(staff.name)}" class="docs-photo">`
        : `<div class="docs-photo docs-photo-empty">No passport<br>photo yet</div>`}
      <div>
        <p style="margin:0 0 6px;text-transform:capitalize;"><strong>${esc(staff.role)}</strong> · ${esc(staff.email || "")}</p>
        <div class="docs-checklist">
          ${required.map(r => `
            <span class="status-pill ${have.has(r) ? "status-ok" : "status-low"}">${have.has(r) ? "✓" : "✗"} ${esc(r)}</span>
          `).join("")}
        </div>
        <p class="modal-hint" style="margin-top:8px;">${missing.length ? `${missing.length} required document${missing.length === 1 ? "" : "s"} missing.` : "All required documents on file. ✓"}</p>
      </div>
    </div>

    <div class="doc-grid">
      ${docs.map(d => `
        <div class="doc-card">
          <img src="${d.image}" alt="${esc(d.doc_type)}" data-doc-view="${d.id}">
          <div class="doc-card-meta">
            <strong>${esc(d.doc_type)}</strong>
            <small>${fmtDate(d.created_at)}${d.expiry ? " · expires " + fmtDate(d.expiry) : ""}</small>
          </div>
          <button type="button" class="btn btn-ghost btn-small" data-doc-del="${d.id}">Delete</button>
        </div>
      `).join("") || `<p class="empty-state">No documents uploaded yet.</p>`}
    </div>

    <form id="docUploadForm" class="modal-form" style="border-top:1px dashed var(--line);padding-top:14px;margin-top:14px;">
      <div class="form-row-2">
        <label>Document type
          <select id="docType">
            <optgroup label="Employee's documents">
              <option>Passport Photo</option>
              <option>Ghana Card (Front)</option>
              <option>Ghana Card (Back)</option>
              <option>Health / Food Handler's Certificate</option>
              <option>Signed Contract</option>
              <option>Driver's License</option>
              <option>SSNIT Card</option>
              <option>Police Clearance</option>
              <option>CV / Resume</option>
            </optgroup>
            <optgroup label="Guarantor's documents">
              <option>Guarantor Form</option>
              <option>Guarantor's Ghana Card</option>
            </optgroup>
            <optgroup label="Other">
              <option>Other</option>
            </optgroup>
          </select>
        </label>
        <label>Expiry date (optional) <input type="date" id="docExpiry"></label>
      </div>
      <label>Image (photo or scan) <input type="file" id="docFile" accept="image/*" required></label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="docCloseBtn">Close</button>
          <button type="submit" class="btn btn-primary" id="docUploadBtn">Upload</button>
        </div>
      </div>
    </form>
  `);

  document.getElementById("docCloseBtn").addEventListener("click", closeModal);

  document.querySelectorAll("[data-doc-view]").forEach(img => {
    img.addEventListener("click", () => {
      const d = store.staff_documents.find(x => x.id === img.dataset.docView);
      const w = window.open("", "_blank");
      w.document.write(`<title>${d.doc_type} — ${staff.name}</title><body style="margin:0;background:#222;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${d.image}" style="max-width:96vw;max-height:96vh;"></body>`);
      w.document.close();
    });
  });

  document.querySelectorAll("[data-doc-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this document?")) return;
      await deleteDoc("staff_documents", btn.dataset.docDel);
      closeModal();
      showToast("Document deleted.");
      setTimeout(() => openStaffDocsModal(staffById(staff.id)), 300);
    });
  });

  document.getElementById("docUploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = document.getElementById("docFile").files[0];
    if (!file) return;
    const btn = document.getElementById("docUploadBtn");
    btn.disabled = true; btn.textContent = "Compressing…";
    try {
      const image = await compressImageFile(file);
      btn.textContent = "Uploading…";
      await addDoc("staff_documents", {
        staff_id: staff.id,
        staff_name: staff.name,
        doc_type: document.getElementById("docType").value,
        expiry: document.getElementById("docExpiry").value || null,
        image,
        uploaded_by: currentStaff.name
      });
      closeModal();
      showToast("Document uploaded.");
      setTimeout(() => openStaffDocsModal(staffById(staff.id)), 300);
    } catch (err) {
      showToast(err.message || "Upload failed.", true);
      btn.disabled = false; btn.textContent = "Upload";
    }
  });
}
