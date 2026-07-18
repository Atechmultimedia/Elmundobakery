/* ============================================================
   Baking method viewer — read, edit, print
   Method text comes from the built-in library (baking-library.js),
   filled with the recipe's real numbers. Editing saves to the
   recipe, and a saved method always wins over the library.
   ============================================================ */

function openBakingMethod(productId) {
  const product = productById(productId);
  if (!product) { showToast("Product not found.", true); return; }
  if (!(product.ingredients || []).length) {
    showToast("Add ingredients to this recipe first — the method uses them.", true);
    return;
  }
  renderBakingMethod(product, false);
}

function renderBakingMethod(product, editing) {
  const m = bakingMethodFor(product);
  const canEdit = ["master", "admin", "manager", "baker", "production_manager"].includes(currentStaff.role);

  openModal(`
    <div class="modal-head">
      <h3>Baking method — ${esc(product.name)}</h3>
      <button class="btn btn-ghost btn-small" onclick="closeModal()">✕</button>
    </div>

    <div class="bm-facts">
      <div><span>Style</span><strong>${esc(m.type_label)}</strong></div>
      ${m.fry_c ? `<div><span>Oil temp</span><strong>${m.fry_c}°C</strong></div>`
                : `<div><span>Oven</span><strong>${m.oven_c}°C</strong></div>`}
      <div><span>Total time</span><strong>${fmtDuration(m.total_minutes)}</strong></div>
      <div><span>Source</span><strong>${m.saved ? "Your saved method" : "Library"}</strong></div>
    </div>

    ${m.climate_note ? `<p class="bm-climate">🌡 ${esc(m.climate_note)}</p>` : ""}

    ${(m.bake_times && m.bake_times.length && !m.fry_c) ? `
      <div class="bm-times">
        <div class="bm-times-head">Bake times by size</div>
        ${m.bake_times.map(t => `<div class="bm-time-row"><span>${esc(t.name)} — ${t.weight_g} g</span><strong>${t.minutes} min</strong></div>`).join("")}
      </div>` : ""}

    ${editing ? bakingEditForm(m) : bakingReadView(m)}

    <div class="bm-actions">
      ${editing
        ? `<button class="btn btn-primary btn-small" id="bmSave">Save method</button>
           <button class="btn btn-ghost btn-small" id="bmCancel">Cancel</button>
           ${m.saved ? `<button class="btn btn-ghost btn-small" id="bmReset" style="color:var(--oven);">Reset to library</button>` : ""}`
        : `${canEdit ? `<button class="btn btn-ghost btn-small" id="bmEdit">✏️ Edit for our kitchen</button>` : ""}
           <button class="btn btn-ghost btn-small" id="bmPrint">🖨 Print for the bakers</button>`}
    </div>
  `);

  if (editing) {
    const bindStepRemovers = () => {
      document.querySelectorAll(".bm-e-remove").forEach(b => b.addEventListener("click", () => {
        const rows = document.querySelectorAll(".bm-edit-row");
        if (rows.length <= 1) { showToast("Keep at least one step.", true); return; }
        b.closest(".bm-edit-row").remove();
      }));
    };
    bindStepRemovers();

    document.getElementById("bmAddStep").addEventListener("click", () => {
      const wrap = document.getElementById("bmEditRows");
      const div = document.createElement("div");
      div.className = "bm-edit-row";
      div.innerHTML = `
        <div class="bm-edit-top">
          <input type="text" class="bm-e-title" value="" placeholder="Step name">
          <input type="number" class="bm-e-min" value="0" min="0" placeholder="min">
          <button type="button" class="btn btn-ghost btn-small bm-e-remove">✕</button>
        </div>
        <textarea class="bm-e-detail" rows="3" placeholder="What to do, and what to watch for"></textarea>`;
      wrap.appendChild(div);
      div.querySelector(".bm-e-remove").addEventListener("click", () => div.remove());
    });

    document.getElementById("bmSave").addEventListener("click", () => saveBakingMethod(product, m));
    document.getElementById("bmCancel").addEventListener("click", () => renderBakingMethod(product, false));
    const reset = document.getElementById("bmReset");
    if (reset) reset.addEventListener("click", async () => {
      if (!confirm("Discard your edits and go back to the library method?")) return;
      try {
        await setDoc("products", product.id, { baking_method: null });
        showToast("Reset to the library method.");
        closeModal();
      } catch (err) { showToast(err.message || "Could not reset.", true); }
    });
  } else {
    const editBtn = document.getElementById("bmEdit");
    if (editBtn) editBtn.addEventListener("click", () => renderBakingMethod(product, true));
    document.getElementById("bmPrint").addEventListener("click", () => printBakingMethod(product, m));
  }
}

function bakingReadView(m) {
  return `
    <ol class="bm-steps">
      ${m.steps.map(s => `
        <li class="bm-step">
          <div class="bm-step-head">
            <span class="bm-step-title">${esc(s.title)}</span>
            ${s.minutes ? `<span class="bm-step-time">${fmtDuration(s.minutes)}</span>` : ""}
          </div>
          <p class="bm-step-detail">${esc(s.detail || "")}</p>
        </li>`).join("")}
    </ol>

    ${(m.troubleshooting || []).length ? `
      <div class="bm-trouble">
        <div class="bm-trouble-head">If it goes wrong</div>
        ${m.troubleshooting.map(t => `
          <div class="bm-trouble-row">
            <div class="bm-trouble-problem">${esc(t.problem)}</div>
            <div class="bm-trouble-cause"><em>Usually:</em> ${esc(t.cause)}</div>
            <div class="bm-trouble-fix"><strong>Fix:</strong> ${esc(t.fix)}</div>
          </div>`).join("")}
      </div>` : ""}
  `;
}

function bakingEditForm(m) {
  return `
    <p class="modal-hint">Edit the steps to match how your kitchen actually works. Your version replaces the library one for this recipe.</p>
    <div id="bmEditRows">
      ${m.steps.map((s, i) => `
        <div class="bm-edit-row" data-bmi="${i}">
          <div class="bm-edit-top">
            <input type="text" class="bm-e-title" value="${esc(s.title)}" placeholder="Step name">
            <input type="number" class="bm-e-min" value="${s.minutes || 0}" min="0" placeholder="min">
            <button type="button" class="btn btn-ghost btn-small bm-e-remove">✕</button>
          </div>
          <textarea class="bm-e-detail" rows="3" placeholder="What to do, and what to watch for">${esc(s.detail || "")}</textarea>
        </div>`).join("")}
    </div>
    <button type="button" class="btn btn-ghost btn-small" id="bmAddStep">+ Add step</button>
    <div class="form-row-2" style="margin-top:12px;">
      <label>Oven temperature (°C) <input type="number" id="bmOven" value="${m.oven_c || 0}" min="0"></label>
      <label>Oil temperature (°C, frying) <input type="number" id="bmFry" value="${m.fry_c || 0}" min="0"></label>
    </div>
  `;
}

async function saveBakingMethod(product, m) {
  const steps = [...document.querySelectorAll(".bm-edit-row")].map(el => ({
    title: el.querySelector(".bm-e-title").value.trim(),
    minutes: Number(el.querySelector(".bm-e-min").value) || 0,
    detail: el.querySelector(".bm-e-detail").value.trim()
  })).filter(s => s.title);

  if (!steps.length) { showToast("Keep at least one step.", true); return; }

  const method = {
    type: m.type,
    type_label: m.type_label,
    oven_c: Number(document.getElementById("bmOven").value) || 0,
    fry_c: Number(document.getElementById("bmFry").value) || 0,
    steps,
    troubleshooting: m.troubleshooting || [],
    total_minutes: steps.reduce((s, x) => s + (x.minutes || 0), 0),
    climate_note: m.climate_note || "",
    bake_times: m.bake_times || [],
    edited_by: currentStaff.name,
    edited_at: new Date().toISOString()
  };

  try {
    await setDoc("products", product.id, { baking_method: method });
    showToast("Baking method saved for " + product.name + ".");
    closeModal();
  } catch (err) {
    console.error("Save baking method failed:", err);
    showToast(err.message || "Could not save the method — check permissions.", true);
  }
}

/* Printable sheet for the bakers — opens a clean print window. */
function printBakingMethod(product, m) {
  const d = doughEconomics(product);
  const ings = (product.ingredients || []).map(ri => {
    const ing = ingredientById(ri.ingredient_id);
    return ing ? `<tr><td>${esc(ing.name)}</td><td class="r">${fmtQty(ri.qty_required, ing.unit)}</td></tr>` : "";
  }).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8">
    <title>${esc(product.name)} — baking method</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 780px; margin: 0 auto; padding: 28px; line-height: 1.55; }
      h1 { font-size: 24px; margin: 0 0 2px; color: #08300D; }
      .sub { color: #666; font-size: 13px; margin-bottom: 18px; }
      h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .05em; color: #08300D; border-bottom: 2px solid #F5A508; padding-bottom: 4px; margin: 24px 0 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      td { padding: 4px 6px; border-bottom: 1px dotted #ccc; }
      td.r { text-align: right; font-family: monospace; white-space: nowrap; }
      ol { padding-left: 20px; margin: 0; }
      li { margin-bottom: 12px; page-break-inside: avoid; }
      .st { font-weight: bold; font-size: 14px; }
      .tm { float: right; font-family: monospace; font-size: 12px; color: #08300D; background: #F5EFE2; padding: 1px 7px; border-radius: 9px; }
      .dt { font-size: 13px; margin-top: 3px; }
      .tr { border: 1px solid #ddd; border-radius: 5px; padding: 8px 10px; margin-bottom: 7px; font-size: 12.5px; page-break-inside: avoid; }
      .tp { font-weight: bold; color: #c62828; }
      .note { background: #FFF8E7; border-left: 3px solid #F5A508; padding: 8px 11px; font-size: 12.5px; margin-bottom: 14px; }
      .meta { display: flex; gap: 20px; font-size: 13px; margin-bottom: 14px; flex-wrap: wrap; }
      .meta b { color: #08300D; }
      .foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
      @media print { body { padding: 12px; } .note { background: #f7f7f7; } }
    </style></head><body>
    <h1>${esc(product.name)}</h1>
    <div class="sub">El Mundo Bakery — ${esc(m.type_label)} method${m.saved ? " (our kitchen's version)" : ""}</div>

    <div class="meta">
      ${m.fry_c ? `<span><b>Oil:</b> ${m.fry_c}°C</span>` : `<span><b>Oven:</b> ${m.oven_c}°C</span>`}
      <span><b>Total time:</b> ${fmtDuration(m.total_minutes)}</span>
      <span><b>Batch dough:</b> ${d.rawWeightKg.toFixed(2)} kg</span>
      <span><b>Baked:</b> ${d.finishedWeightKg.toFixed(2)} kg</span>
    </div>

    ${m.climate_note ? `<div class="note">${esc(m.climate_note)}</div>` : ""}

    <h2>Ingredients — one batch</h2>
    <table>${ings}</table>

    ${(m.bake_times && m.bake_times.length && !m.fry_c) ? `
      <h2>Bake times by size</h2>
      <table>${m.bake_times.map(t => `<tr><td>${esc(t.name)} — ${t.weight_g} g</td><td class="r">${t.minutes} min</td></tr>`).join("")}</table>` : ""}

    <h2>Method</h2>
    <ol>
      ${m.steps.map(s => `<li>
        <span class="st">${esc(s.title)}</span>${s.minutes ? `<span class="tm">${fmtDuration(s.minutes)}</span>` : ""}
        <div class="dt">${esc(s.detail || "")}</div>
      </li>`).join("")}
    </ol>

    ${(m.troubleshooting || []).length ? `
      <h2>If it goes wrong</h2>
      ${m.troubleshooting.map(t => `<div class="tr">
        <div class="tp">${esc(t.problem)}</div>
        <div><em>Usually:</em> ${esc(t.cause)}</div>
        <div><b>Fix:</b> ${esc(t.fix)}</div>
      </div>`).join("")}` : ""}

    <div class="foot">Printed ${new Date().toLocaleString()} · El Mundo Bakery${m.edited_by ? ` · method edited by ${esc(m.edited_by)}` : ""}</div>
    </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { showToast("Allow pop-ups to print the method sheet.", true); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.print(); } catch (e) { /* user can print manually */ } }, 350);
}
