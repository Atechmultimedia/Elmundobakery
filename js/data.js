/* ============================================================
   Central data layer
   All collections are mirrored live into `store`. Every module
   reads from `store` and calls render() after writes trigger
   a snapshot update — no manual refresh needed anywhere.
   ============================================================ */

const store = {
  ingredients: [],
  products: [],
  production_log: [],
  sales: [],
  expenses: [],
  staff: [],
  shifts: [],
  payroll_runs: [],
  staff_advances: [],
  deliveries: [],
  suppliers: [],
  purchase_orders: [],
  campaigns: [],
  social_posts: [],
  assets_register: [],
  maintenance_log: [],
  vendor_debts: [],
  waste_log: [],
  cash_recon: [],
  transfers: [],
  crm_leads: [],
  invoices: [],
  equity_records: [],
  esg_log: [],
  signatures: [],
  timesheets: [],
  tickets: [],
  quality_checks: [],
  fleet_vehicles: [],
  attendance: [],
  timeoff: [],
  candidates: [],
  appraisals: [],
  approvals: [],
  documents: [],
  sms_campaigns: [],
  email_campaigns: [],
  online_orders: [],
  employees: [],
  staff_documents: [],
  stock_movements: [],
  ingredient_batches: [],
  stock_takes: [],
  clock_events: [],
  production_plans: [],
  customers: [],
  audit_log: [],
  app_settings: []   // one doc, "config" — shared so every device costs a loaf the same way
};

const COLLECTIONS = Object.keys(store);

let listenersStarted = false;

function startListeners(onFirstLoad) {
  if (listenersStarted) return;
  listenersStarted = true;

  let pending = COLLECTIONS.length;
  const markLoaded = () => { if (pending > 0) { pending--; if (pending === 0) onFirstLoad(); } };

  COLLECTIONS.forEach(name => {
    db.collection(name).onSnapshot(
      (snap) => {
        store[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        markLoaded();
        if (typeof window.onStoreChange === "function") window.onStoreChange(name);
      },
      (err) => {
        console.error("Listener error on", name, err);
        markLoaded();
      }
    );
  });
}

/* ---------------- generic CRUD (with audit trail) ---------------- */

function logAudit(action, collection, docId) {
  if (collection === "audit_log" || !currentStaff) return;
  db.collection("audit_log").add({
    action, collection, doc_id: docId || "",
    user: currentStaff.name, role: currentStaff.role,
    at: new Date().toISOString()
  }).catch(() => {});
}

async function addDoc(collection, data) {
  try {
    const ref = await db.collection(collection).add({ ...data, created_at: new Date().toISOString() });
    logAudit("create", collection, ref.id);
    return ref.id;
  } catch (err) { reportWriteError(err, collection); throw err; }
}

async function setDoc(collection, id, data) {
  try {
    await db.collection(collection).doc(id).set(data, { merge: true });
    logAudit("update", collection, id);
  } catch (err) { reportWriteError(err, collection); throw err; }
}

async function updateDoc(collection, id, data) {
  try {
    await db.collection(collection).doc(id).update(data);
    logAudit("update", collection, id);
  } catch (err) { reportWriteError(err, collection); throw err; }
}

async function deleteDoc(collection, id) {
  try {
    await db.collection(collection).doc(id).delete();
    logAudit("delete", collection, id);
  } catch (err) { reportWriteError(err, collection); throw err; }
}

// Central place to surface a save/delete failure so nothing fails completely silently.
function reportWriteError(err, collection) {
  console.error("Write failed on", collection, err);
  const msg = (err && err.code === "permission-denied")
    ? "You don't have permission for that action (or the database rules need publishing)."
    : "Couldn't save — check your connection and try again.";
  if (typeof showToast === "function") showToast(msg, true);
}

async function runTransaction(fn) {
  return db.runTransaction(fn);
}

/* ---------------- lookups ---------------- */

function ingredientById(id) { return store.ingredients.find(i => i.id === id); }
function productById(id) { return store.products.find(p => p.id === id); }
function staffById(id) { return store.staff.find(s => s.id === id); }
function supplierById(id) { return store.suppliers.find(s => s.id === id); }

// cost, per single sellable unit, computed from current ingredient prices
// Ingredient-only cost per unit (kept for COGS on sales — the direct material cost)
function productUnitCost(product) {
  if (!product || !product.ingredients || !product.yield_qty) return 0;
  const batchCost = product.ingredients.reduce((sum, ri) => {
    const ing = ingredientById(ri.ingredient_id);
    return sum + (ing ? ri.qty_required * ing.cost_per_unit : 0);
  }, 0);
  return batchCost / product.yield_qty;
}

// FULLY-LOADED cost per unit: ingredients + labour + energy + packaging
// (direct costs set on the recipe) + an allocated share of overhead.
function productFullCost(product, opts) {
  opts = opts || {};
  if (!product || !product.yield_qty) return productUnitCost(product);
  const ingredient = productUnitCost(product);
  const labour = effectiveLabourPerUnit(product);
  const energy = effectiveEnergyPerUnit(product);
  const packaging = (product.packaging_cost_per_unit || 0);
  const direct = ingredient + labour + energy + packaging;
  // Overhead allocation: monthly overhead / expected monthly units, spread per unit
  const overhead = opts.skipOverhead ? 0 : overheadPerUnit();
  return direct + overhead;
}

function productCostBreakdown(product) {
  const ingredient = productUnitCost(product);
  const labour = effectiveLabourPerUnit(product);
  const energy = effectiveEnergyPerUnit(product);
  const packaging = product.packaging_cost_per_unit || 0;
  const overhead = overheadPerUnit();
  return { ingredient, labour, energy, packaging, overhead,
    direct: ingredient + labour + energy + packaging,
    full: ingredient + labour + energy + packaging + overhead };
}

/* ---------- Dough economics ----------
   Works out, for one batch of a recipe:
   - raw dough weight (kg) from the ingredient quantities
   - raw dough cost and price per kg
   - finished baked weight after typical baking loss
   - finished price per kg
   Ingredients in g/kg count by weight exactly; ml counts ~1g per ml;
   pieces use a rough standard weight (egg ~50g) as an estimate. */
const APPROX_PIECE_WEIGHT_G = { egg: 50, eggs: 50 }; // grams per piece (extendable)
const DEFAULT_PIECE_WEIGHT_G = 30; // fallback for other "pcs" items

// Typical baking weight loss by product type (water evaporating during bake).
const BAKING_LOSS_BY_TYPE = {
  bread: 0.12, cake: 0.08, pastry: 0.15, doughnut: 0.10,
  cookie: 0.18, muffin: 0.12, biscuit: 0.16
};
const DEFAULT_BAKING_LOSS = 0.12;

function ingredientWeightKg(ing, qty) {
  if (!ing) return 0;
  const u = ing.unit;
  if (u === "kg") return qty;
  if (u === "g") return qty / 1000;
  if (u === "L") return qty;         // ~1 kg per litre for water-like liquids
  if (u === "ml") return qty / 1000; // ~1 g per ml
  if (u === "pcs") {
    const name = (ing.name || "").toLowerCase();
    let g = DEFAULT_PIECE_WEIGHT_G;
    for (const key in APPROX_PIECE_WEIGHT_G) { if (name.includes(key)) { g = APPROX_PIECE_WEIGHT_G[key]; break; } }
    return (qty * g) / 1000;
  }
  return 0;
}

function bakingLossFor(product) {
  if (product.baking_loss_pct != null && product.baking_loss_pct !== "") {
    return Math.max(0, Math.min(0.6, Number(product.baking_loss_pct) / 100));
  }
  // Infer from the recipe type/name
  const hay = ((product.type || "") + " " + (product.name || "")).toLowerCase();
  for (const key in BAKING_LOSS_BY_TYPE) { if (hay.includes(key)) return BAKING_LOSS_BY_TYPE[key]; }
  return DEFAULT_BAKING_LOSS;
}

function doughEconomics(product) {
  let rawWeightKg = 0, estimated = false, totalCost = 0;
  (product.ingredients || []).forEach(ri => {
    const ing = ingredientById(ri.ingredient_id);
    if (!ing) return;
    const w = ingredientWeightKg(ing, ri.qty_required || 0);
    rawWeightKg += w;
    if (ing.unit === "pcs") estimated = true; // piece weights are approximate
    totalCost += (ri.qty_required || 0) * (ing.cost_per_unit || 0);
  });
  const lossPct = bakingLossFor(product);
  const finishedWeightKg = rawWeightKg * (1 - lossPct);
  return {
    rawWeightKg,
    rawCostPerKg: rawWeightKg > 0 ? totalCost / rawWeightKg : 0,
    totalDoughCost: totalCost,
    lossPct,
    finishedWeightKg,
    finishedCostPerKg: finishedWeightKg > 0 ? totalCost / finishedWeightKg : 0,
    estimated
  };
}

/* ============================================================
   SIZE SYSTEM — one recipe, many priced sizes
   ------------------------------------------------------------
   A size is: { name, price, weight_g, stock }
   WEIGHT is the source of truth: a 300 g loaf eats 300 g of the
   batch's baked dough. Everything else (how many you can make,
   what it costs, what to deduct) falls out of that.

   Backward compatible: products with old {name, dough_factor}
   sizes, or with no sizes at all, still work — we fill the gaps.
   ============================================================ */

// The weight of one "standard" unit of this product, in grams.
function standardUnitWeightG(product) {
  const d = doughEconomics(product);
  if (!product.yield_qty || d.finishedWeightKg <= 0) return 0;
  return (d.finishedWeightKg / product.yield_qty) * 1000;
}

/* Return this product's sizes with every field filled in.
   A product with no sizes gets one implicit "standard" size, so the
   POS, production and sales all work the same way either side. */
function productSizes(product) {
  const stdWeight = standardUnitWeightG(product);
  const list = (product.sizes || []).filter(sz => sz && sz.name);

  if (!list.length) {
    return [{
      name: product.yield_unit || "unit",
      price: product.selling_price || 0,
      weight_g: stdWeight,
      stock: product.finished_stock_qty || 0,
      isStandard: true,
      index: -1
    }];
  }

  return list.map((sz, i) => {
    // Old sizes only had dough_factor — derive price and weight from it.
    const factor = sz.dough_factor || 1;
    return {
      name: sz.name,
      price: sz.price != null ? Number(sz.price) : (product.selling_price || 0) * factor,
      weight_g: sz.weight_g != null ? Number(sz.weight_g) : stdWeight * factor,
      stock: Number(sz.stock) || 0,
      isStandard: false,
      index: i
    };
  });
}

// How many of this size one batch of dough yields.
function sizeUnitsPerBatch(product, size) {
  const d = doughEconomics(product);
  const w = (size.weight_g || 0) / 1000;
  return w > 0 ? d.finishedWeightKg / w : 0;
}

/* What one unit of this size costs to make.
   Ingredients scale with weight; labour/energy/packaging are per unit; and the
   monthly overhead allocation is per unit too. This MUST line up with
   productFullCost() — if it doesn't, the POS and the recipe card would quote
   different profits for the same loaf. */
function sizeFullCost(product, size) {
  const d = doughEconomics(product);
  const ingCost = ((size.weight_g || 0) / 1000) * d.finishedCostPerKg;
  const perUnit = effectiveLabourPerUnit(product)
    + effectiveEnergyPerUnit(product)
    + (product.packaging_cost_per_unit || 0)
    + overheadPerUnit();
  return ingCost + perUnit;
}

// Profit per unit of this size.
function sizeProfit(product, size) {
  return (size.price || 0) - sizeFullCost(product, size);
}

// Total finished stock across every size — for dashboards and low-stock checks.
function productTotalStock(product) {
  return productSizes(product).reduce((s, sz) => s + (sz.stock || 0), 0);
}

/* Write a new stock figure back to the right place: either the size's
   own stock, or the product's finished_stock_qty for standard products. */
function sizeStockPatch(product, size, newStock) {
  if (size.isStandard || size.index < 0) {
    return { finished_stock_qty: newStock };
  }
  const sizes = (product.sizes || []).map((sz, i) =>
    i === size.index ? { ...sz, stock: newStock } : sz);
  return { sizes };
}

// Find a size on a product by name (case-insensitive). Falls back to the first.
function findSize(product, sizeName) {
  const all = productSizes(product);
  if (!sizeName) return all[0];
  return all.find(s => (s.name || "").trim().toLowerCase() === String(sizeName).trim().toLowerCase()) || all[0];
}

/* ============================================================
   AUTO-COSTING — work labour and gas out instead of guessing
   ------------------------------------------------------------
   Labour comes from your payroll rates × the hands-on minutes the
   baking method says the recipe needs.
   Energy comes from your real cylinder cost × the minutes the oven
   is actually lit.

   Both are ALLOCATIONS, not marginal costs: if your bakers are on a
   monthly salary you pay them whether or not you bake. This divides
   that cost fairly between recipes by how much work each demands —
   which is what you need to price them. See the warning in Settings
   about not also putting salaries in monthly fixed costs.
   ============================================================ */

// What one baker-hour costs, averaged across your bakers.
function bakerHourlyRate() {
  const s = getSettings();
  const hoursPerDay = s.work_hours_per_day || 8;
  const daysPerMonth = s.work_days_per_month || 26;
  const people = [...(store.employees || []), ...(store.staff || [])]
    .filter(p => p && p.name && /baker|production/i.test(p.role || ""))
    .filter(p => (p.status || "Active") !== "Terminated");
  // De-duplicate: a person can exist as both an employee and a login
  const seen = new Set();
  const rates = [];
  people.forEach(p => {
    const key = (p.name || "").trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    let hourly = 0;
    if (p.pay_type === "hourly") hourly = p.hourly_rate || 0;
    else if (p.pay_type === "daily") hourly = (p.daily_wage || 0) / hoursPerDay;
    else hourly = (p.monthly_salary || 0) / (daysPerMonth * hoursPerDay);
    if (hourly > 0) rates.push(hourly);
  });
  if (!rates.length) return 0;
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

// What an hour of oven time costs in gas.
function gasCostPerHour() {
  const s = getSettings();
  if (!(s.lpg_refill_cost > 0) || !(s.lpg_bake_hours > 0)) return 0;
  return s.lpg_refill_cost / s.lpg_bake_hours;
}

// Price per kg of your LPG — for reference and sanity-checking.
function lpgPricePerKg() {
  const s = getSettings();
  if (!(s.lpg_refill_cost > 0) || !(s.lpg_cylinder_kg > 0)) return 0;
  return s.lpg_refill_cost / s.lpg_cylinder_kg;
}

/* Labour per unit, from the method's hands-on time. Returns null when it
   can't be worked out, so callers fall back to the typed-in figure. */
function autoLabourPerUnit(product) {
  const s = getSettings();
  if (!s.auto_costing) return null;
  const rate = bakerHourlyRate();
  const units = product.yield_qty || 0;
  if (!(rate > 0) || !(units > 0)) return null;
  const split = methodTimeSplit(product);
  if (!(split.active > 0)) return null;
  const bakers = s.bakers_per_batch || 1;
  return (split.active / 60) * rate * bakers / units;
}

/* Energy per unit, from the minutes the oven is lit. Accounts for the oven
   needing more than one load if the batch doesn't fit in one go. */
function autoEnergyPerUnit(product) {
  const s = getSettings();
  if (!s.auto_costing) return null;
  const perHour = gasCostPerHour();
  const units = product.yield_qty || 0;
  if (!(perHour > 0) || !(units > 0)) return null;
  const split = methodTimeSplit(product);
  if (!(split.oven > 0)) return null;
  const capacity = s.oven_capacity > 0 ? s.oven_capacity : units;
  const loads = Math.max(1, Math.ceil(units / capacity));
  return (split.oven / 60) * perHour * loads / units;
}

/* The figures every cost calculation should use: automatic when it can be
   worked out, otherwise whatever was typed on the recipe. */
function effectiveLabourPerUnit(product) {
  const auto = autoLabourPerUnit(product);
  return auto != null ? auto : (product.labour_cost_per_unit || 0);
}
function effectiveEnergyPerUnit(product) {
  const auto = autoEnergyPerUnit(product);
  return auto != null ? auto : (product.energy_cost_per_unit || 0);
}

// Overhead per unit = (monthly overhead + delivery pool) / expected monthly units sold.
// Reads the Settings overhead figure and recent sales volume.
function overheadPerUnit() {
  const cfg = (typeof getSettings === "function") ? getSettings() : {};
  const monthlyOverhead = Number(cfg.monthly_overhead || 0);
  if (monthlyOverhead <= 0) return 0;
  // expected units = units sold in the last 30 days (fallback to 1 to avoid div/0)
  const cutoff = new Date(Date.now() - 30 * 86400000);
  let units = 0;
  store.sales.forEach(sl => {
    if (new Date(sl.timestamp) < cutoff) return;
    (sl.items || []).forEach(i => units += i.qty);
  });
  return units > 0 ? monthlyOverhead / units : 0;
}

function productBatchCost(product) {
  if (!product || !product.ingredients) return 0;
  return product.ingredients.reduce((sum, ri) => {
    const ing = ingredientById(ri.ingredient_id);
    return sum + (ing ? ri.qty_required * ing.cost_per_unit : 0);
  }, 0);
}
