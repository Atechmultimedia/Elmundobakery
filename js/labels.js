/* ============================================================
   LABEL DESIGNER — printable product labels from the recipe
   ------------------------------------------------------------
   Everything on the label comes from data you already keep, so it
   can't drift out of sync: change the recipe and the label follows.

   Sizes are in real millimetres and print at true scale.

   ALLERGENS: detected from your ingredient names as a STARTING
   POINT ONLY. Mislabelled allergens can seriously harm someone.
   You must check the list yourself before printing — the designer
   makes you confirm it every time.
   ============================================================ */

const LABEL_SHAPES = {
  circle: {
    name: "Circle",
    sizes: [
      { key: "sm", label: "40 mm", w: 40, h: 40 },
      { key: "md", label: "60 mm", w: 60, h: 60 },
      { key: "lg", label: "80 mm", w: 80, h: 80 }
    ]
  },
  square: {
    name: "Square",
    sizes: [
      { key: "sm", label: "40 × 40 mm", w: 40, h: 40 },
      { key: "md", label: "60 × 60 mm", w: 60, h: 60 },
      { key: "lg", label: "80 × 80 mm", w: 80, h: 80 }
    ]
  },
  rect: {
    name: "Rectangle",
    sizes: [
      { key: "sm", label: "50 × 30 mm", w: 50, h: 30 },
      { key: "md", label: "70 × 40 mm", w: 70, h: 40 },
      { key: "lg", label: "100 × 60 mm", w: 100, h: 60 }
    ]
  }
};

/* Ingredient names that suggest a declarable allergen. Deliberately broad —
   better to raise a false flag the baker removes than miss a real one. */
const ALLERGEN_HINTS = [
  { label: "Gluten (wheat)", re: /\b(wheat|flour|semolina|gluten|bread ?crumb|barley|rye|oat)\b/i },
  { label: "Egg",            re: /\begg/i },
  { label: "Milk",           re: /\b(milk|butter|cream|cheese|yogh?urt|ghee|whey|casein|custard)\b/i },
  { label: "Soya",           re: /\b(soy|soya|soja)\b/i },
  { label: "Peanuts",        re: /\b(peanut|groundnut)\b/i },
  { label: "Tree nuts",      re: /\b(almond|cashew|walnut|hazelnut|pecan|pistachio|macadamia|brazil nut)\b/i },
  { label: "Sesame",         re: /\b(sesame|benne|tahini)\b/i },
  { label: "Fish",           re: /\b(fish|anchov|tuna|sardine)\b/i },
  { label: "Shellfish",      re: /\b(shrimp|prawn|crab|lobster|crayfish)\b/i },
  { label: "Sulphites",      re: /\b(sulphite|sulfite)\b/i }
];

/* Suggest allergens from the recipe's ingredients. A suggestion, not an answer. */
function detectAllergens(product) {
  const names = (product.ingredients || [])
    .map(ri => { const ing = ingredientById(ri.ingredient_id); return ing ? ing.name : ""; })
    .join(" ");
  return ALLERGEN_HINTS.filter(a => a.re.test(names)).map(a => a.label);
}

/* Ingredients heaviest first — the order food labelling conventions expect. */
function labelIngredients(product) {
  return (product.ingredients || []).map(ri => {
    const ing = ingredientById(ri.ingredient_id);
    if (!ing) return null;
    return { name: ing.name, kg: ingredientWeightKg(ing, ri.qty_required) };
  }).filter(Boolean).sort((a, b) => b.kg - a.kg).map(x => x.name);
}

let labelState = null;

function openLabelDesigner(productId) {
  const product = productById(productId);
  if (!product) { showToast("Product not found.", true); return; }
  if (!(product.ingredients || []).length) {
    showToast("Add ingredients to this recipe first — the label lists them.", true);
    return;
  }
  const sizes = productSizes(product);
  const s = getSettings();
  labelState = {
    productId,
    template: s.label_template || "classic",
    art: s.label_art || "loaf",
    logo: s.label_logo !== false,
    colors: { ...BRAND, ...(s.label_colors || {}) },
    shape: "circle",
    sizeKey: "md",
    variant: sizes[0].name,
    allergens: detectAllergens(product),
    allergensConfirmed: false,
    fda: s.fda_number || "",
    social: s.social_handle || "",
    show: {
      name: true, weight: true, ingredients: false, allergens: true,
      bestBefore: true, batch: true, price: false,
      business: true, address: false, phone: true, social: false, fda: false
    }
  };
  renderLabelDesigner();
}

function currentLabelSize() {
  const shape = LABEL_SHAPES[labelState.shape];
  return shape.sizes.find(z => z.key === labelState.sizeKey) || shape.sizes[1];
}

/* How many fit on an A4 sheet, given 10mm margins and 3mm gaps. */
function labelsPerSheet(size) {
  const cols = Math.max(1, Math.floor((210 - 20 + 3) / (size.w + 3)));
  const rows = Math.max(1, Math.floor((297 - 20 + 3) / (size.h + 3)));
  return { cols, rows, total: cols * rows };
}

function renderLabelDesigner() {
  const product = productById(labelState.productId);
  const sizes = productSizes(product);
  const size = currentLabelSize();
  const sheet = labelsPerSheet(size);
  const detected = detectAllergens(product);

  openModal(`
    <div class="modal-head">
      <h3>Label designer — ${esc(product.name)}</h3>
      <button class="btn btn-ghost btn-small" onclick="closeModal()">✕</button>
    </div>

    <div class="ld-wrap">
      <div class="ld-controls">
        <div class="ld-group">
          <div class="ld-group-title">Design</div>
          <div class="ld-templates">
            ${Object.entries(LABEL_TEMPLATES).map(([k, t]) => `
              <button class="ld-tpl ${labelState.template === k ? "is-active" : ""}" data-ldtpl="${k}" title="${esc(t.blurb)}">
                <span class="ld-tpl-chip tpl-chip-${k}"></span>
                <span class="ld-tpl-name">${esc(t.name)}</span>
              </button>`).join("")}
          </div>
          <div class="ld-note">${esc(LABEL_TEMPLATES[labelState.template].blurb)}</div>
        </div>

        <div class="ld-group" id="ldArtGroup" ${(LABEL_TEMPLATES[labelState.template] || {}).wantsArt ? "" : "hidden"}>
          <div class="ld-group-title">Picture</div>
          <div class="ld-art-pick">
            ${Object.entries(LABEL_ART).map(([k, a]) => `
              <button class="ld-art ${labelState.art === k ? "is-active" : ""}" data-ldart="${k}" title="${esc(a.name)}">
                <span class="ld-art-mini">${k === "none" ? "—" : a.svg(BRAND, BRAND.bg)}</span>
                <span class="ld-art-name">${esc(a.name)}</span>
              </button>`).join("")}
          </div>
          <label class="ld-check" id="ldLogoRow" ${(LABEL_TEMPLATES[labelState.template] || {}).wantsLogo ? "" : "hidden"}>
            <input type="checkbox" id="ldLogo" ${labelState.logo ? "checked" : ""}> Show my logo
          </label>
          <div class="ld-note">Drawn as vector, not a photo — sharp at any size and light on ink. The logo comes from <code>assets/logo.png</code>.</div>
        </div>

        <div class="ld-group">
          <div class="ld-group-title">Colours</div>
          <div class="ld-colors">
            <label class="ld-color"><input type="color" id="ldcPrimary" value="${labelState.colors.primary}"><span>Green</span></label>
            <label class="ld-color"><input type="color" id="ldcAccent" value="${labelState.colors.accent}"><span>Gold</span></label>
            <label class="ld-color"><input type="color" id="ldcBg" value="${labelState.colors.bg}"><span>Cream</span></label>
          </div>
          <button class="btn btn-ghost btn-small" id="ldResetColors" style="margin-top:6px;">Back to brand colours</button>
        </div>

        <div class="ld-group">
          <div class="ld-group-title">Shape</div>
          <div class="seg">
            ${Object.entries(LABEL_SHAPES).map(([k, v]) =>
              `<button class="seg-btn ${labelState.shape === k ? "is-active" : ""}" data-ldshape="${k}">${v.name}</button>`).join("")}
          </div>
        </div>

        <div class="ld-group">
          <div class="ld-group-title">Size</div>
          <div class="seg" id="ldSizeSeg">
            ${LABEL_SHAPES[labelState.shape].sizes.map(z =>
              `<button class="seg-btn ${labelState.sizeKey === z.key ? "is-active" : ""}" data-ldsize="${z.key}">${z.label}</button>`).join("")}
          </div>
          <div class="ld-note" id="ldSheetNote">${sheet.cols} × ${sheet.rows} = <strong>${sheet.total} labels</strong> per A4 sheet</div>
        </div>

        ${sizes.length > 1 ? `
        <div class="ld-group">
          <div class="ld-group-title">Which size loaf?</div>
          <select id="ldVariant">
            ${sizes.map(sz => `<option value="${esc(sz.name)}" ${labelState.variant === sz.name ? "selected" : ""}>${esc(sz.name)} — ${Math.round(sz.weight_g)} g @ ${fmtMoney(sz.price)}</option>`).join("")}
          </select>
        </div>` : ""}

        <div class="ld-group">
          <div class="ld-group-title">What goes on it</div>
          ${[
            ["name", "Product name"], ["weight", "Net weight"],
            ["ingredients", "Ingredients list"], ["allergens", "Allergen warning"],
            ["bestBefore", "Best before"], ["batch", "Batch code"],
            ["price", "Price"], ["business", "Bakery name"],
            ["address", "Address"], ["phone", "Phone"],
            ["social", "Social handle"], ["fda", "FDA number"]
          ].map(([k, lbl]) => `
            <label class="ld-check">
              <input type="checkbox" data-ldfield="${k}" ${labelState.show[k] ? "checked" : ""}> ${lbl}
            </label>`).join("")}
        </div>

        <div class="ld-group" id="ldFdaGroup" ${labelState.show.fda ? "" : "hidden"}>
          <div class="ld-group-title">FDA registration number</div>
          <input type="text" id="ldFda" value="${esc(labelState.fda)}" placeholder="e.g. FDA/FD 24/1234">
        </div>

        <div class="ld-group" id="ldSocialGroup" ${labelState.show.social ? "" : "hidden"}>
          <div class="ld-group-title">Social handle</div>
          <input type="text" id="ldSocial" value="${esc(labelState.social)}" placeholder="@elmundobakery">
        </div>

        <div class="ld-group" id="ldAllergenGroup" ${labelState.show.allergens ? "" : "hidden"}>
          <div class="ld-group-title">Allergens</div>
          <div class="ld-allergen-warn">
            <strong>⚠ Check this yourself.</strong> These are guessed from your ingredient names. Getting an allergen wrong can seriously harm someone — the guess is a starting point, not an answer. Add anything missing, remove anything wrong.
          </div>
          ${detected.length
            ? `<div class="ld-note">Detected from your ingredients: ${detected.map(a => esc(a)).join(", ")}</div>`
            : `<div class="ld-note">Nothing detected — if this recipe does contain an allergen, type it in.</div>`}
          <input type="text" id="ldAllergens" value="${esc(labelState.allergens.join(", "))}" placeholder="Gluten (wheat), Egg, Milk">
          <label class="ld-check ld-confirm">
            <input type="checkbox" id="ldAllergenOk" ${labelState.allergensConfirmed ? "checked" : ""}>
            <strong>I've checked this allergen list against the actual recipe</strong>
          </label>
        </div>
      </div>

      <div class="ld-preview-pane">
        <div class="ld-group-title">Preview — actual size</div>
        <div class="ld-stage" id="ldStage">${labelHtml(product, size, true)}</div>
        <div class="ld-note" id="ldSizeNote">${size.w} × ${size.h} mm. If text is crowding the edge, switch off a field or go up a size.</div>
        <div class="ld-actions">
          <button class="btn btn-primary btn-small" id="ldPrintSheet">🖨 Print sheet of ${sheet.total}</button>
          <button class="btn btn-ghost btn-small" id="ldPrintOne">🖨 Print one</button>
        </div>
      </div>
    </div>
  `);

  bindLabelControls(product);
}

/* Redraw ONLY the preview and the two size notes. Rebuilding the whole modal
   on every click reset the scroll position and made ticking a checkbox look
   like it did nothing. */
function refreshLabelPreview() {
  const product = productById(labelState.productId);
  const size = currentLabelSize();
  const sheet = labelsPerSheet(size);
  const stage = document.getElementById("ldStage");
  if (stage) stage.innerHTML = labelHtml(product, size, true);
  const sheetNote = document.getElementById("ldSheetNote");
  if (sheetNote) sheetNote.innerHTML = `${sheet.cols} × ${sheet.rows} = <strong>${sheet.total} labels</strong> per A4 sheet`;
  const sizeNote = document.getElementById("ldSizeNote");
  if (sizeNote) sizeNote.textContent = `${size.w} × ${size.h} mm. If text is crowding the edge, switch off a field or go up a size.`;
  const btn = document.getElementById("ldPrintSheet");
  if (btn) btn.textContent = `🖨 Print sheet of ${sheet.total}`;
}

function bindLabelControls(product) {
  // Pick a design — swap the class, keep everything else where it is.
  document.querySelectorAll("[data-ldtpl]").forEach(b => b.addEventListener("click", () => {
    labelState.template = b.dataset.ldtpl;
    document.querySelectorAll("[data-ldtpl]").forEach(x =>
      x.classList.toggle("is-active", x.dataset.ldtpl === labelState.template));
    const note = b.closest(".ld-group").querySelector(".ld-note");
    if (note) note.textContent = LABEL_TEMPLATES[labelState.template].blurb;
    // Only the designs built for a picture offer the picture controls
    const t = LABEL_TEMPLATES[labelState.template] || {};
    const artGroup = document.getElementById("ldArtGroup");
    if (artGroup) artGroup.hidden = !t.wantsArt;
    const logoRow = document.getElementById("ldLogoRow");
    if (logoRow) logoRow.hidden = !t.wantsLogo;
    saveLabelChoice();
    refreshLabelPreview();
  }));

  // Picture
  document.querySelectorAll("[data-ldart]").forEach(b => b.addEventListener("click", () => {
    labelState.art = b.dataset.ldart;
    document.querySelectorAll("[data-ldart]").forEach(x =>
      x.classList.toggle("is-active", x.dataset.ldart === labelState.art));
    saveLabelChoice();
    refreshLabelPreview();
  }));

  const logoBox = document.getElementById("ldLogo");
  if (logoBox) logoBox.addEventListener("change", () => {
    labelState.logo = logoBox.checked;
    saveLabelChoice();
    refreshLabelPreview();
  });

  // Colours — live, no re-render
  const wireColor = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      labelState.colors[key] = el.value;
      labelState.colors.text = labelState.colors.primary;
      applyLabelCss();
      refreshLabelPreview();
    });
    el.addEventListener("change", saveLabelChoice);
  };
  wireColor("ldcPrimary", "primary");
  wireColor("ldcAccent", "accent");
  wireColor("ldcBg", "bg");

  const reset = document.getElementById("ldResetColors");
  if (reset) reset.addEventListener("click", () => {
    labelState.colors = { ...BRAND };
    ["ldcPrimary:primary", "ldcAccent:accent", "ldcBg:bg"].forEach(pair => {
      const [id, k] = pair.split(":");
      const el = document.getElementById(id);
      if (el) el.value = BRAND[k];
    });
    applyLabelCss();
    refreshLabelPreview();
    saveLabelChoice();
    showToast("Back to El Mundo's colours.");
  });

  // Shape changes the available sizes, so redraw just that row of buttons.
  document.querySelectorAll("[data-ldshape]").forEach(b => b.addEventListener("click", () => {
    labelState.shape = b.dataset.ldshape;
    const sizes = LABEL_SHAPES[labelState.shape].sizes;
    if (!sizes.find(z => z.key === labelState.sizeKey)) labelState.sizeKey = sizes[1].key;
    document.querySelectorAll("[data-ldshape]").forEach(x =>
      x.classList.toggle("is-active", x.dataset.ldshape === labelState.shape));
    const seg = document.getElementById("ldSizeSeg");
    if (seg) {
      seg.innerHTML = sizes.map(z =>
        `<button class="seg-btn ${labelState.sizeKey === z.key ? "is-active" : ""}" data-ldsize="${z.key}">${z.label}</button>`).join("");
      bindSizeButtons();
    }
    refreshLabelPreview();
  }));

  bindSizeButtons();

  document.querySelectorAll("[data-ldfield]").forEach(cb => cb.addEventListener("change", () => {
    const key = cb.dataset.ldfield;
    labelState.show[key] = cb.checked;
    // Show or hide the matching settings group without touching anything else
    const group = { fda: "ldFdaGroup", social: "ldSocialGroup", allergens: "ldAllergenGroup" }[key];
    if (group) {
      const el = document.getElementById(group);
      if (el) el.hidden = !cb.checked;
    }
    refreshLabelPreview();
  }));

  const variant = document.getElementById("ldVariant");
  if (variant) variant.addEventListener("change", () => {
    labelState.variant = variant.value;
    refreshLabelPreview();
  });

  const alg = document.getElementById("ldAllergens");
  if (alg) alg.addEventListener("input", () => {
    labelState.allergens = alg.value.split(",").map(x => x.trim()).filter(Boolean);
    // Editing the list invalidates the confirmation — you must look again
    labelState.allergensConfirmed = false;
    const ok = document.getElementById("ldAllergenOk");
    if (ok) ok.checked = false;
    refreshLabelPreview();
  });

  const algOk = document.getElementById("ldAllergenOk");
  if (algOk) algOk.addEventListener("change", () => { labelState.allergensConfirmed = algOk.checked; });

  const fda = document.getElementById("ldFda");
  if (fda) fda.addEventListener("input", () => { labelState.fda = fda.value; refreshLabelPreview(); });

  const soc = document.getElementById("ldSocial");
  if (soc) soc.addEventListener("input", () => { labelState.social = soc.value; refreshLabelPreview(); });

  applyLabelCss();
  document.getElementById("ldPrintSheet").addEventListener("click", () => printLabels(product, currentLabelSize(), true));
  document.getElementById("ldPrintOne").addEventListener("click", () => printLabels(product, currentLabelSize(), false));
}

/* Remember the design and colours so you pick them once, not every time. */
function saveLabelChoice() {
  try {
    saveSettings({ ...getSettings(),
      label_template: labelState.template,
      label_art: labelState.art,
      label_logo: labelState.logo,
      label_colors: { ...labelState.colors } });
  } catch (e) { /* not worth interrupting the user over */ }
}

function bindSizeButtons() {
  document.querySelectorAll("[data-ldsize]").forEach(b => b.addEventListener("click", () => {
    labelState.sizeKey = b.dataset.ldsize;
    document.querySelectorAll("[data-ldsize]").forEach(x =>
      x.classList.toggle("is-active", x.dataset.ldsize === labelState.sizeKey));
    refreshLabelPreview();
  }));
}

/* One label's markup. Sized in mm so the preview matches the print. */
function labelHtml(product, size, isPreview) {
  const s = getSettings();
  const sz = findSize(product, labelState.variant);
  const show = labelState.show;
  const shape = labelState.shape;
  const round = shape === "circle";

  // Font scales with the label so an 80mm label isn't tiny text
  const base = Math.max(1.4, size.h / 22);

  const bb = product.shelf_life_days
    ? new Date(Date.now() + product.shelf_life_days * 86400000).toISOString().slice(0, 10)
    : null;

  const tpl = LABEL_TEMPLATES[labelState.template] || {};
  const lines = [];

  // Logo first, then the bread — a badge reads top-down.
  if (tpl.wantsLogo && labelState.logo) {
    const logoH = Math.max(3, size.h * (round ? 0.15 : 0.17));
    lines.push(`<img class="lb-logo" src="${LABEL_LOGO_SRC}" alt="" style="height:${logoH}mm;max-width:60%;">`);
  }
  if (tpl.wantsArt && labelState.art && labelState.art !== "none" && LABEL_ART[labelState.art]) {
    // Art gets a share of the height that leaves room for the words
    const artH = Math.max(4, size.h * (round ? 0.22 : 0.26) * (tpl.wantsLogo ? 0.8 : 1));
    lines.push(`<div class="lb-art" style="height:${artH}mm;width:${artH * 1.6}mm;">
      ${LABEL_ART[labelState.art].svg(labelState.colors, labelState.colors.bg)}
    </div>`);
  }

  if (show.name) lines.push(`<div class="lb-name">${esc(product.name)}</div>`);
  if (show.weight && sz.weight_g) lines.push(`<div class="lb-weight">${Math.round(sz.weight_g)} g</div>`);
  if (show.price && sz.price) lines.push(`<div class="lb-price">${fmtMoney(sz.price)}</div>`);
  if (show.ingredients) {
    const ings = labelIngredients(product);
    if (ings.length) lines.push(`<div class="lb-ing"><strong>Ingredients:</strong> ${ings.map(esc).join(", ")}</div>`);
  }
  if (show.allergens && labelState.allergens.length) {
    lines.push(`<div class="lb-allergen"><strong>Contains:</strong> ${labelState.allergens.map(esc).join(", ")}</div>`);
  }
  if (show.bestBefore) {
    lines.push(`<div class="lb-bb">Best before: ${bb ? fmtDate(bb) : "____________"}</div>`);
  }
  if (show.batch) lines.push(`<div class="lb-batch">Batch: ${esc(makeBatchCode(product))}</div>`);

  const foot = [];
  if (show.business) foot.push(esc(s.business_name));
  if (show.address) foot.push(esc(s.address));
  if (show.phone) foot.push(esc(s.phone));
  if (show.social && labelState.social) foot.push(esc(labelState.social));
  if (show.fda && labelState.fda) foot.push(esc(labelState.fda));

  return `
    <div class="lb tpl-${labelState.template} ${round ? "lb-round" : ""} ${isPreview ? "lb-preview" : ""}"
         style="width:${size.w}mm;height:${size.h}mm;font-size:${base}mm;">
      <div class="lb-inner">
        ${lines.join("")}
        ${foot.length ? `<div class="lb-foot">${foot.join(" · ")}</div>` : ""}
      </div>
    </div>`;
}

/* The preview needs the template CSS live in the page, regenerated whenever
   the colours change. One <style> tag we keep rewriting. */
function applyLabelCss() {
  let tag = document.getElementById("ldLiveCss");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "ldLiveCss";
    document.head.appendChild(tag);
  }
  tag.textContent = labelTemplateCss(labelState.colors);
}

function printLabels(product, size, asSheet) {
  if (labelState.show.allergens && !labelState.allergensConfirmed) {
    showToast("Tick the box to confirm you've checked the allergen list before printing.", true);
    return;
  }
  const sheet = labelsPerSheet(size);
  const count = asSheet ? sheet.total : 1;

  // The print window has no base URL, so relative image paths break. Pin them.
  const base = location.href.replace(/[^/]*$/, "");
  const one = labelHtml(product, size, false).replace(/src="(?!https?:|data:)/g, `src="${base}`);

  const html = `<!doctype html><html><head><meta charset="utf-8">
    <base href="${base}">
    <title>${esc(product.name)} — labels</title>
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; }
      body { margin: 0; }
      .sheet { display: flex; flex-wrap: wrap; gap: 3mm; align-content: flex-start; }
      ${labelTemplateCss(labelState.colors)}
      /* Force the browser to actually print the background colours */
      .lb { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    </style></head><body>
    <div class="sheet">${Array.from({ length: count }, () => one).join("")}</div>
    </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { showToast("Allow pop-ups to print labels.", true); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.print(); } catch (e) { /* they can print manually */ } }, 400);
}
