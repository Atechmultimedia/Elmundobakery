/* ============================================================
   Recipe Generator (FREE built-in library + optional AI)
   ------------------------------------------------------------
   Default: instant, offline, zero-cost recipes from the built-in
   library (recipe-library.js). Auto-links ingredients to
   inventory and saves as a costable product.

   Optional: if an AI provider key is configured, an "Ask AI for
   something custom" toggle lets you generate open-ended recipes.
   Left unconfigured, the AI option simply doesn't appear and the
   generator stays 100% free.
   ============================================================ */

/* ===== OPTIONAL AI CONFIG =====
   Leave both blank to keep the generator entirely free (library only).
   To enable custom AI recipes later, set ONE of these via a small
   server proxy (never put a raw key in the browser):
     AI_PROXY_URL — URL of your PHP proxy that calls Claude or Gemini.
   The proxy should accept {prompt} and return {text}. */
const AI_PROXY_URL = ""; // e.g. "https://yourdomain.com/recipe-ai.php" — blank = library-only (free)
const AI_ENABLED = !!AI_PROXY_URL;

function openRecipeGenerator() {
  const types = libraryTypes();
  const firstType = types[0];
  openModal(`
    <h3>📖 Recipe Library <span class="gen-free-badge">FREE</span></h3>
    <p class="modal-hint">Pick a product, variety and tier — get a complete recipe instantly. It checks your inventory and shows what you have vs. what you'll need to buy.</p>

    <div class="segmented" style="margin-bottom:14px;">
      <button type="button" class="seg-btn is-active" id="modeLibrary">From library</button>
      <button type="button" class="seg-btn" id="modeInventory">Build from my stock</button>
    </div>

    <form id="genForm" class="modal-form">
      <div id="libraryControls">
        <div class="form-row-2">
          <label>Product type
            <select id="genType">
              ${types.map(t => `<option value="${t}">${t}</option>`).join("")}
            </select>
          </label>
          <label>Variety
            <select id="genVariety">
              ${libraryVarieties(firstType).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("")}
            </select>
          </label>
        </div>
        <label>Quality tier
          <select id="genTier">
            <option value="Standard">Standard — everyday, cost-effective</option>
            <option value="Premium">Premium — richer, better ingredients</option>
            <option value="Luxury">Luxury — finest ingredients, showpiece</option>
          </select>
        </label>
      </div>

      <div id="inventoryControls" style="display:none;">
        <p class="modal-hint">This finds library recipes you can make (or nearly make) with what's currently in your inventory — ranked by how much you already have.</p>
      </div>

      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="genCancel">Cancel</button>
          <button type="submit" class="btn btn-primary" id="genBtn">Get recipe</button>
        </div>
      </div>
    </form>

    <div id="genResult"></div>
  `);

  const typeSel = document.getElementById("genType");
  const varSel = document.getElementById("genVariety");
  typeSel.addEventListener("change", () => {
    varSel.innerHTML = libraryVarieties(typeSel.value).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  });

  let mode = "library";
  const mL = document.getElementById("modeLibrary");
  const mI = document.getElementById("modeInventory");
  const libC = document.getElementById("libraryControls");
  const invC = document.getElementById("inventoryControls");
  mL.addEventListener("click", () => { mode = "library"; mL.classList.add("is-active"); mI.classList.remove("is-active"); libC.style.display = "block"; invC.style.display = "none"; document.getElementById("genResult").innerHTML = ""; });
  mI.addEventListener("click", () => { mode = "inventory"; mI.classList.add("is-active"); mL.classList.remove("is-active"); libC.style.display = "none"; invC.style.display = "block"; document.getElementById("genResult").innerHTML = ""; });

  document.getElementById("genCancel").addEventListener("click", closeModal);
  document.getElementById("genForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (mode === "inventory") suggestFromInventory();
    else generateFromLibrary();
  });
}

/* ---------- FREE: instant library recipe ---------- */
function generateFromLibrary() {
  const type = document.getElementById("genType").value;
  const variety = document.getElementById("genVariety").value;
  const tier = document.getElementById("genTier").value;
  const recipe = libraryRecipe(type, variety, tier);
  if (!recipe) {
    document.getElementById("genResult").innerHTML =
      `<p class="recipe-warn" style="margin-top:14px;">No recipe found for that combination yet.</p>`;
    return;
  }
  recipe.tier = tier;
  renderGeneratedRecipe(recipe);
}

/* ---------- OPTIONAL: AI recipe via server proxy ---------- */
async function generateWithAI() {
  const type = document.getElementById("genType").value;
  const tier = document.getElementById("genTier").value;
  const detail = document.getElementById("genDetail") ? document.getElementById("genDetail").value.trim() : "";
  const btn = document.getElementById("genBtn");
  const resultEl = document.getElementById("genResult");

  btn.disabled = true; btn.textContent = "Generating…";
  resultEl.innerHTML = `<p class="calc-hint" style="margin-top:14px;">🧑‍🍳 Generating your custom ${tier.toLowerCase()} ${type.toLowerCase()}…</p>`;

  const inventoryNames = store.ingredients.map(i => i.name).join(", ") || "(none yet)";
  const prompt = `You are a professional bakery recipe developer in Ghana. Create a ${tier} quality ${type} recipe${detail ? " for: " + detail : ""}. Prefer these inventory ingredients where sensible: ${inventoryNames}. Respond with ONLY valid JSON (no markdown) in this shape: {"name":"","description":"","yield_qty":20,"yield_unit":"loaf","ingredients":[{"name":"","qty":0,"unit":"g|kg|ml|L|pcs"}],"method":["step"],"suggested_price_ghs":0,"tier":"${tier}","notes":""}. Quantities are for the FULL batch. Use metric or pcs. Keep it practical for a Ghanaian bakery.`;

  try {
    const response = await fetch(AI_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    let text = (data.text || "").trim().replace(/```json|```/g, "").trim();
    const recipe = JSON.parse(text);
    renderGeneratedRecipe(recipe);
  } catch (err) {
    resultEl.innerHTML = `<p class="recipe-warn" style="margin-top:14px;">Couldn't reach the AI provider (${esc(err.message)}). Using the free library instead is always available.</p>`;
  } finally {
    btn.disabled = false; btn.textContent = "Get recipe";
  }
}

// Scan the whole library and rank recipes by how well current stock covers them.
function suggestFromInventory() {
  const resultEl = document.getElementById("genResult");
  if (!store.ingredients.length) {
    resultEl.innerHTML = `<p class="recipe-warn" style="margin-top:14px;">Add some ingredients to Inventory first, then I can suggest what you're able to make.</p>`;
    return;
  }
  const candidates = [];
  libraryTypes().forEach(type => {
    (RECIPE_LIBRARY[type] || []).forEach(v => {
      Object.keys(v.tiers).forEach(tier => {
        const r = v.tiers[tier];
        let have = 0, total = r.ingredients.length, enough = 0;
        r.ingredients.forEach(ing => {
          const m = matchInventory(ing.name);
          if (m) { have++; if ((m.stock_qty || 0) >= ing.qty) enough++; }
        });
        candidates.push({ type, variety: v.variety, tier, recipe: r,
          coverage: have / total, canMakeNow: enough === total, haveCount: have, total });
      });
    });
  });
  // Prefer recipes you can make now, then by coverage
  candidates.sort((a, b) => (b.canMakeNow - a.canMakeNow) || (b.coverage - a.coverage));
  const top = candidates.slice(0, 8);

  resultEl.innerHTML = `
    <div class="gen-recipe">
      <h4 class="gen-sub">Recipes you can make with current stock</h4>
      <p class="modal-hint">Ranked by how much of each recipe your inventory already covers. ✓ = you have enough of everything.</p>
      <table class="recipe-ing-table calc-table">
        <thead><tr><th>Recipe</th><th>Tier</th><th>You have</th><th></th></tr></thead>
        <tbody>
          ${top.map((c, i) => `
            <tr>
              <td><strong>${esc(c.variety)}</strong> <small>(${esc(c.type)})</small></td>
              <td>${esc(c.tier)}</td>
              <td class="num">${c.haveCount}/${c.total} ${c.canMakeNow ? '<span class="status-pill status-ok">✓ can make now</span>' : `<span class="status-pill status-low">${Math.round(c.coverage*100)}%</span>`}</td>
              <td><button type="button" class="btn btn-ghost btn-small" data-pick="${i}">View</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
  top.forEach((c, i) => {
    const btn = resultEl.querySelector(`[data-pick="${i}"]`);
    if (btn) btn.addEventListener("click", () => { const r = JSON.parse(JSON.stringify(c.recipe)); r.tier = c.tier; renderGeneratedRecipe(r); });
  });
}

// Match a generated ingredient name to an existing inventory item
function matchInventory(name) {
  const n = name.toLowerCase().trim();
  let hit = store.ingredients.find(i => i.name.toLowerCase() === n);
  if (hit) return hit;
  hit = store.ingredients.find(i => i.name.toLowerCase().includes(n) || n.includes(i.name.toLowerCase()));
  return hit || null;
}

function renderGeneratedRecipe(recipe) {
  const resultEl = document.getElementById("genResult");
  window._generatedRecipe = recipe;

  const rows = recipe.ingredients.map((ing, idx) => {
    const match = matchInventory(ing.name);
    const inStock = match ? (match.stock_qty || 0) : 0;
    const enough = match && inStock >= ing.qty;
    const shortfall = match ? Math.max(0, ing.qty - inStock) : ing.qty;
    return { ...ing, match, inStock, enough, shortfall, idx };
  });
  const matchedCount = rows.filter(r => r.match).length;
  const canMakeNow = rows.every(r => r.enough);

  resultEl.innerHTML = `
    <div class="gen-recipe">
      <div class="gen-recipe-head">
        <div>
          <span class="gen-tier gen-tier-${(recipe.tier || "Standard").toLowerCase()}">${esc(recipe.tier || "Standard")}</span>
          <h3>${esc(recipe.name)}</h3>
          <p class="recipe-desc">${esc(recipe.description || "")}</p>
        </div>
      </div>

      <p class="gen-yield">Yields <strong>${recipe.yield_qty} ${esc(recipe.yield_unit)}</strong> · suggested price <strong>${fmtMoney(recipe.suggested_price_ghs || 0)}</strong></p>

      <h4 class="gen-sub">Ingredients
        <span class="gen-match-note">${canMakeNow ? '<span class="status-pill status-ok">✓ you can make this now</span>' : matchedCount + "/" + rows.length + " in inventory"}</span>
      </h4>
      <table class="recipe-ing-table calc-table">
        <thead><tr><th>Ingredient</th><th>Need</th><th>In stock</th><th>To buy</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr class="${r.shortfall > 0 ? "row-low" : ""}">
              <td>${esc(r.name)}${r.match ? "" : ` <small>(new)</small>`}</td>
              <td class="num">${fmtQty(r.qty, r.unit)}</td>
              <td class="num">${r.match ? fmtQty(r.inStock, r.match.unit || r.unit) : "—"}</td>
              <td class="num">${r.shortfall > 0
                ? `<span class="status-pill status-low">${fmtQty(r.shortfall, r.unit)}</span>`
                : `<span class="status-pill status-ok">✓</span>`}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <h4 class="gen-sub">Method</h4>
      <ol class="gen-method">
        ${(recipe.method || []).map(step => `<li>${esc(step)}</li>`).join("")}
      </ol>

      ${recipe.notes ? `<p class="modal-hint"><strong>Baker's tip:</strong> ${esc(recipe.notes)}</p>` : ""}
      ${rows.some(r => !r.match) ? `<p class="modal-hint">Ingredients not in your inventory will be created automatically (at 0 cost) — set their price in Inventory afterwards so costing is accurate.</p>` : ""}

      <div class="modal-actions" style="margin-top:16px;">
        <button type="button" class="btn btn-ghost" id="genBack">← Choose another</button>
        <div>
          <button type="button" class="btn btn-ghost" id="genEditSave">Preview &amp; edit</button>
          <button type="button" class="btn btn-primary" id="genSaveNow">Save as product</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("genBack").addEventListener("click", () => openRecipeGenerator());
  document.getElementById("genSaveNow").addEventListener("click", () => saveGeneratedRecipe(false));
  document.getElementById("genEditSave").addEventListener("click", () => saveGeneratedRecipe(true));
}

async function saveGeneratedRecipe(editFirst) {
  const recipe = window._generatedRecipe;
  if (!recipe) return;

  const ingredientLines = [];
  for (const ing of recipe.ingredients) {
    let match = matchInventory(ing.name);
    if (!match) {
      try {
        const newId = await addDoc("ingredients", {
          name: ing.name, unit: ing.unit || "g",
          cost_per_unit: 0, stock_qty: 0, reorder_level: 0,
          created_at: new Date().toISOString()
        });
        match = { id: newId, name: ing.name, unit: ing.unit || "g", cost_per_unit: 0, stock_qty: 0 };
        if (store.ingredients) store.ingredients.push(match);
      } catch (e) { continue; }
    }
    ingredientLines.push({ ingredient_id: match.id, qty_required: ing.qty });
  }

  const product = {
    name: recipe.name,
    description: recipe.description || "",
    yield_qty: recipe.yield_qty || 1,
    yield_unit: recipe.yield_unit || "unit",
    selling_price: recipe.suggested_price_ghs || 0,
    finished_stock_qty: 0,
    labour_cost_per_unit: 0, energy_cost_per_unit: 0, packaging_cost_per_unit: 0,
    method: recipe.method || [],
    tier: recipe.tier || "Standard",
    ingredients: ingredientLines
  };

  if (editFirst) {
    closeModal();
    setTimeout(() => openProductForm(product), 150);
    showToast("Recipe ready — review and save.");
  } else {
    try {
      await addDoc("products", product);
      closeModal();
      showToast(`${recipe.name} saved to your recipes.`);
    } catch (e) {
      showToast("Couldn't save — " + e.message, true);
    }
  }
}
