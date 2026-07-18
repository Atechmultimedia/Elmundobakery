/* ============================================================
   Generic module engine + export (Excel / PDF)
   One factory renders any register-style module from a config:
   { key, title, sub, collection, fields:[{id,label,type,options?,required?}],
     columns:[{label, render(row)}], statusField?, statusFlow?, rowActions? }
   ============================================================ */

function exportRowsToExcel(title, headers, rows) {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}_${todayISO()}.xlsx`);
}

function exportRowsToPDF(title, headers, rows) {
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;color:#221A12;margin:30px;}
      h1{font-size:18px;color:#08300D;border-bottom:3px solid #F5A508;padding-bottom:8px;}
      .meta{font-size:11px;color:#6B5D4C;margin-bottom:14px;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      th{background:#08300D;color:#F7C15C;text-align:left;padding:6px 8px;}
      td{border-bottom:1px solid #ddd;padding:6px 8px;}
      tr:nth-child(even) td{background:#faf7ef;}
    </style></head><body>
    <h1>El Mundo Bakery — ${title}</h1>
    <div class="meta">Generated ${new Date().toLocaleString()} by ${currentStaff ? currentStaff.name : ""}</div>
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${String(c ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <script>window.onload = () => window.print();</scr` + `ipt></body></html>`);
  w.document.close();
}

function fieldInputHtml(f, value) {
  const v = value ?? (f.default !== undefined ? f.default : "");
  if (f.type === "select") {
    return `<select id="gf_${f.id}" ${f.required ? "required" : ""}>${(f.options || []).map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  }
  if (f.type === "textarea") return `<textarea id="gf_${f.id}" rows="3" ${f.required ? "required" : ""}>${esc(v)}</textarea>`;
  if (f.type === "date") return `<input type="date" id="gf_${f.id}" value="${v || todayISO()}" ${f.required ? "required" : ""}>`;
  if (f.type === "number") return `<input type="number" step="${f.step || "0.01"}" id="gf_${f.id}" value="${v}" ${f.required ? "required" : ""}>`;
  return `<input type="text" id="gf_${f.id}" value="${esc(v)}" ${f.required ? "required" : ""}>`;
}

function readFieldValue(f) {
  const el = document.getElementById(`gf_${f.id}`);
  if (!el) return null;
  return f.type === "number" ? Number(el.value || 0) : el.value.trim ? el.value.trim() : el.value;
}

function genericModule(cfg) {
  return function render(root) {
    root = root || document.getElementById("moduleContent");
    const rows = [...(store[cfg.collection] || [])];
    if (cfg.sort) rows.sort(cfg.sort);
    else rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

    const headers = cfg.columns.map(c => c.label);
    const exportRows = rows.map(r => cfg.columns.map(c => c.text ? c.text(r) : stripTags(c.render(r))));

    root.innerHTML = `
      <div class="panel-head panel-head-row">
        <div>
          <h2>${cfg.title}</h2>
          <p class="panel-sub">${cfg.sub || ""}</p>
        </div>
        <div>
          <button class="btn btn-ghost btn-small" id="gExportXls">Export Excel</button>
          <button class="btn btn-ghost btn-small" id="gExportPdf">Export PDF</button>
          <button class="btn btn-primary" id="gAddBtn">${cfg.addLabel || "Add"}</button>
        </div>
      </div>
      ${cfg.summary ? `<div class="kpi-grid" style="margin-bottom:20px;">${cfg.summary(rows)}</div>` : ""}
      <div class="table-wrap">
        <table class="ledger-table">
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}${cfg.rowActions || cfg.editable !== false ? "<th></th>" : ""}</tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr class="${cfg.rowClass ? cfg.rowClass(r) : ""}">
                ${cfg.columns.map(c => `<td class="${c.num ? "num" : ""}">${c.render(r)}</td>`).join("")}
                ${cfg.rowActions || cfg.editable !== false ? `<td>${cfg.rowActions ? cfg.rowActions(r) : ""}${cfg.editable !== false ? `<button class="btn btn-ghost btn-small" data-gedit="${r.id}">Edit</button>` : ""}</td>` : ""}
              </tr>
            `).join("") || `<tr><td colspan="${headers.length + 1}" class="empty-state">${cfg.empty || "Nothing here yet."}</td></tr>`}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById("gAddBtn").addEventListener("click", () => openGenericForm(cfg));
    document.getElementById("gExportXls").addEventListener("click", () => exportRowsToExcel(cfg.title, headers, exportRows));
    document.getElementById("gExportPdf").addEventListener("click", () => exportRowsToPDF(cfg.title, headers, exportRows));
    root.querySelectorAll("[data-gedit]").forEach(btn => {
      btn.addEventListener("click", () => openGenericForm(cfg, rows.find(r => r.id === btn.dataset.gedit)));
    });
    if (cfg.bindActions) cfg.bindActions(root);
  };
}

function stripTags(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

function openGenericForm(cfg, row) {
  const isEdit = !!row;
  openModal(`
    <h3>${isEdit ? "Edit" : cfg.addLabel || "Add"} — ${cfg.title}</h3>
    <form id="genericForm" class="modal-form">
      ${cfg.fields.map(f => `<label>${f.label} ${fieldInputHtml(f, isEdit ? row[f.id] : undefined)}</label>`).join("")}
      <div class="modal-actions">
        ${isEdit ? `<button type="button" class="btn btn-ghost" id="gDeleteBtn">Delete</button>` : "<span></span>"}
        <div>
          <button type="button" class="btn btn-ghost" id="gCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save" : "Add"}</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("gCancelBtn").addEventListener("click", closeModal);
  if (isEdit) {
    document.getElementById("gDeleteBtn").addEventListener("click", async () => {
      if (!confirm("Delete this record? This can't be undone.")) return;
      await deleteDoc(cfg.collection, row.id);
      closeModal(); showToast("Deleted.");
    });
  }
  document.getElementById("genericForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    cfg.fields.forEach(f => { data[f.id] = readFieldValue(f); });
    if (cfg.beforeSave) cfg.beforeSave(data, row);
    if (isEdit) await setDoc(cfg.collection, row.id, data);
    else await addDoc(cfg.collection, data);
    closeModal(); showToast(isEdit ? "Saved." : "Added.");
  });
}
