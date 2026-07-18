/* ============================================================
   Shared helpers
   ============================================================ */

/* Currency display. All amounts are STORED in GHS; this only changes
   how they're shown. Rates = how much 1 GHS is worth in that currency. */
function getCurrencySettings() {
  let cfg;
  try { cfg = JSON.parse(localStorage.getItem("elmundo_currency") || "{}"); } catch (e) { cfg = {}; }
  return {
    current: cfg.current || "GHS",
    rates: { USD: (cfg.rates && cfg.rates.USD) || 0.065, GBP: (cfg.rates && cfg.rates.GBP) || 0.0633 }
  };
}

function setCurrencySettings(cfg) {
  localStorage.setItem("elmundo_currency", JSON.stringify(cfg));
}

function fmtMoney(n) {
  n = Number(n) || 0;
  const { current, rates } = getCurrencySettings();
  if (current === "USD") n = n * rates.USD;
  else if (current === "GBP") n = n * rates.GBP;
  const sym = current === "USD" ? "$" : current === "GBP" ? "£" : "GHS ";
  return sym + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function fmtQty(qty, unit) {
  qty = Number(qty) || 0;
  return qty.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " " + unit;
}

function fmtDate(d) {
  if (!d) return "—";
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(d) {
  if (!d) return "—";
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date)) return "—";
  return date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Current local time as HH:MM, for prefilling <input type="time">
function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

// Combine a date string (YYYY-MM-DD) and optional time (HH:MM) into an ISO timestamp
function combineDateTime(dateStr, timeStr) {
  if (!dateStr) return new Date().toISOString();
  const t = timeStr && /^\d{2}:\d{2}/.test(timeStr) ? timeStr : "12:00";
  const d = new Date(dateStr + "T" + t);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function newId() {
  return db.collection("_").doc().id;
}

function esc(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

function showToast(message, isBad) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("is-bad", !!isBad);
  el.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("is-visible"), 3400);
}

function openModal(html) {
  const wrap = document.getElementById("modalWrap");
  wrap.innerHTML = `<div class="modal-backdrop"><div class="modal">${html}</div></div>`;
  wrap.classList.add("is-open");
  wrap.querySelector(".modal-backdrop").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeModal();
  });
}

function closeModal() {
  const wrap = document.getElementById("modalWrap");
  wrap.classList.remove("is-open");
  wrap.innerHTML = "";
}

// date-range helper used by Finance / Payroll / Dashboard
function rangeFor(preset) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (preset === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (preset === "week") {
    const day = start.getDay();
    const diff = (day === 0 ? 6 : day - 1); // Monday start
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  } else if (preset === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

function withinRange(dateVal, start, end) {
  const d = new Date(dateVal);
  return d >= start && d <= end;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}


/* Guided empty-state block: icon, message, and an action button that
   jumps to another module. Use in any renderer when a list is empty. */
function guidedEmptyState(opts) {
  // opts: { icon, title, message, actionLabel, goTo }
  return `
    <div class="guided-empty">
      <div class="guided-empty-icon">${opts.icon || "🥐"}</div>
      <h3>${esc(opts.title || "Nothing here yet")}</h3>
      <p>${esc(opts.message || "")}</p>
      ${opts.actionLabel && opts.goTo ? `<button class="btn btn-primary" onclick="goTo('${opts.goTo}')">${esc(opts.actionLabel)}</button>` : ""}
    </div>
  `;
}
