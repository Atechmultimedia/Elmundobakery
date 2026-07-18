/* ============================================================
   Sales / POS
   ============================================================ */

let cart = []; // { product_id, name, qty, unit_price, unit_cost }

function renderSales(root) {
  root = root || document.getElementById("moduleContent");

  root.innerHTML = `
    <div class="panel-head">
      <h2>Sales / POS</h2>
      <p class="panel-sub">Ring up an order. Stock deducts automatically when you complete the sale.</p>
    </div>
    ${(() => {
      // Warn if there are duplicate product names — a common cause of "I baked stock
      // but POS shows 0": production went into one copy, POS is showing another.
      const byName = {};
      store.products.forEach(p => { const k = (p.name || "").trim().toLowerCase(); (byName[k] = byName[k] || []).push(p); });
      const dups = Object.entries(byName).filter(([, list]) => list.length > 1);
      if (!dups.length) return "";
      return `<div class="pos-dup-warn">
        ⚠ You have duplicate products with the same name. Baked stock may have gone into one copy while another shows 0 here.
        ${dups.map(([, list]) => `<div>“${esc(list[0].name)}” appears ${list.length} times — stock: ${list.map(p => productTotalStock(p)).join(", ")}</div>`).join("")}
        Go to <strong>Recipes &amp; Products</strong> and click <strong>“Merge duplicates”</strong> to fix this.
      </div>`;
    })()}
    <div class="pos-layout">
      <div class="pos-products">
        ${store.products.flatMap(p => productSizes(p).map(sz => `
          <button class="pos-product-btn ${(sz.stock <= 0) ? "pos-out" : ""}" data-add="${p.id}" data-size="${esc(sz.name)}">
            <span class="pos-product-name">${esc(p.name)}${sz.isStandard ? "" : ` <span class="pos-size-tag">${esc(sz.name)}</span>`}</span>
            <span class="pos-product-price">${fmtMoney(sz.price)}</span>
            <span class="pos-product-stock">${sz.stock < 0
              ? `⚠ oversold by ${Math.abs(sz.stock)} — record production`
              : sz.stock === 0
                ? "⚠ 0 in stock"
                : sz.stock + " left" + (sz.weight_g ? ` · ${Math.round(sz.weight_g)}g` : "")}</span>
          </button>
        `)).join("") || `<p class="empty-state">No products to sell yet — add one under Recipes &amp; Products.</p>`}
      </div>
      <div class="pos-cart">
        <h3 class="dash-col-title">Order</h3>
        <div id="cartRows" class="cart-rows"></div>
        <div class="cart-totals" id="cartTotals"></div>
        <form id="checkoutForm" class="modal-form" style="margin-top:14px;">
          <label>Promo code (optional) <input type="text" id="promoCode" placeholder="e.g. SOURDOUGH10"></label>
          <label>Payment method
            <select id="paymentMethod">
              <option>Cash</option>
              <option>Mobile Money</option>
              <option>Card</option>
            </select>
          </label>
          <label>Customer name (optional) <input type="text" id="custName"></label>
          <label>Customer phone (optional) <input type="text" id="custPhone"></label>
          <label class="checkbox-label"><input type="checkbox" id="isDelivery"> This order needs delivery</label>
          <div id="deliveryFields" style="display:none;">
            <label>Delivery address <input type="text" id="custAddress"></label>
            <label>Delivery fee (GHS) <input type="number" step="0.01" min="0" id="deliveryFee" value="0"></label>
          </div>
          <button type="submit" class="btn btn-primary" id="checkoutBtn">Complete sale</button>
        </form>
      </div>
    </div>
  `;

  // Today's sales with instant receipts
  const { start: tStart, end: tEnd } = rangeFor("today");
  const todaysSales = store.sales
    .filter(sl => withinRange(sl.timestamp, tStart, tEnd))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  root.insertAdjacentHTML("beforeend", `
    <h3 class="dash-col-title" style="margin-top:30px;">Today's sales</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Time</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th></th></tr></thead>
        <tbody>
          ${todaysSales.map(sl => `
            <tr>
              <td class="num">${new Date(sl.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</td>
              <td>${esc(sl.customer_name || "Walk-in")}</td>
              <td>${(sl.items || []).map(i => `${esc(i.name)} × ${i.qty}`).join(", ")}</td>
              <td>${esc(sl.payment_method || "")}</td>
              <td class="num">${fmtMoney(sl.total || 0)}</td>
              <td><button class="btn btn-ghost btn-small" data-receipt="${sl.id}">Generate receipt</button></td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="empty-state">No sales yet today.</td></tr>`}
        </tbody>
      </table>
    </div>
  `);
  root.querySelectorAll("[data-receipt]").forEach(btn => {
    btn.addEventListener("click", () => printReceiptForSale(store.sales.find(sl => sl.id === btn.dataset.receipt)));
  });

  root.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => addToCart(btn.dataset.add, btn.dataset.size));
  });
  document.getElementById("isDelivery").addEventListener("change", (e) => {
    document.getElementById("deliveryFields").style.display = e.target.checked ? "block" : "none";
  });
  document.getElementById("checkoutForm").addEventListener("submit", handleCheckout);
  renderCart();
}

// Cart lines are keyed by product AND size — a GHS 5 loaf and a GHS 10 loaf
// from the same recipe are separate lines with separate stock.
function cartKey(productId, sizeName) { return productId + "|" + (sizeName || ""); }

function addToCart(productId, sizeName) {
  const product = productById(productId);
  if (!product) return;
  const size = findSize(product, sizeName);
  const key = cartKey(productId, size.name);
  const inCart = cart.find(c => cartKey(c.product_id, c.size_name) === key);
  const qtyAlready = inCart ? inCart.qty : 0;
  const label = product.name + (size.isStandard ? "" : " (" + size.name + ")");

  // Warn (but allow) when going over available finished stock
  if (qtyAlready + 1 > (size.stock || 0)) {
    showToast(`Heads up: only ${size.stock || 0} of ${label} recorded in stock. Selling anyway — remember to record production.`, false);
  }
  if (inCart) inCart.qty += 1;
  else cart.push({
    product_id: product.id,
    size_name: size.isStandard ? "" : size.name,
    name: label,
    qty: 1,
    unit_price: size.price || 0,
    unit_cost: sizeFullCost(product, size)
  });
  renderCart();
}

function changeCartQty(key, delta) {
  const item = cart.find(c => cartKey(c.product_id, c.size_name) === key);
  if (!item) return;
  const product = productById(item.product_id);
  const size = product ? findSize(product, item.size_name) : null;
  const next = item.qty + delta;
  if (next <= 0) { cart = cart.filter(c => cartKey(c.product_id, c.size_name) !== key); }
  else {
    if (size && next > (size.stock || 0)) {
      showToast(`Only ${size.stock || 0} of ${item.name} in stock — selling over stock.`, false);
    }
    item.qty = next;
  }
  renderCart();
}

function currentPromo(code) {
  if (!code) return null;
  return store.campaigns.find(c => (c.promo_code || "").toUpperCase() === code.toUpperCase() && c.status !== "ended");
}

function renderCart() {
  const rowsEl = document.getElementById("cartRows");
  const totalsEl = document.getElementById("cartTotals");
  if (!rowsEl) return;

  rowsEl.innerHTML = cart.length ? cart.map(item => `
    <div class="cart-row">
      <span class="cart-row-name">${esc(item.name)}</span>
      <span class="cart-row-controls">
        <button type="button" class="btn btn-ghost btn-small" data-qty-minus="${esc(cartKey(item.product_id, item.size_name))}">−</button>
        <span>${item.qty}</span>
        <button type="button" class="btn btn-ghost btn-small" data-qty-plus="${esc(cartKey(item.product_id, item.size_name))}">+</button>
      </span>
      <span class="cart-row-total">${fmtMoney(item.qty * item.unit_price)}</span>
    </div>
  `).join("") : `<p class="empty-state">Cart is empty — tap a product to add it.</p>`;

  rowsEl.querySelectorAll("[data-qty-minus]").forEach(b => b.addEventListener("click", () => changeCartQty(b.dataset.qtyMinus, -1)));
  rowsEl.querySelectorAll("[data-qty-plus]").forEach(b => b.addEventListener("click", () => changeCartQty(b.dataset.qtyPlus, 1)));

  const subtotal = cart.reduce((sum, i) => sum + i.qty * i.unit_price, 0);
  const promoInput = document.getElementById("promoCode");
  const promo = promoInput ? currentPromo(promoInput.value.trim()) : null;
  const discountPct = promo ? (promo.discount_pct || 0) : 0;
  const discountAmt = subtotal * discountPct / 100;
  const deliveryFeeInput = document.getElementById("deliveryFee");
  const deliveryFee = (document.getElementById("isDelivery")?.checked && deliveryFeeInput) ? Number(deliveryFeeInput.value || 0) : 0;
  const total = subtotal - discountAmt + deliveryFee;

  totalsEl.innerHTML = `
    <div class="ticket-row"><span>Subtotal</span><span>${fmtMoney(subtotal)}</span></div>
    ${promo ? `<div class="ticket-row"><span>Promo ${esc(promo.promo_code)} (${discountPct}%)</span><span>−${fmtMoney(discountAmt)}</span></div>` : ""}
    ${deliveryFee ? `<div class="ticket-row"><span>Delivery fee</span><span>${fmtMoney(deliveryFee)}</span></div>` : ""}
    <div class="ticket-row total"><span>Total</span><span>${fmtMoney(total)}</span></div>
  `;
}

async function handleCheckout(e) {
  e.preventDefault();
  if (!cart.length) { showToast("Add at least one item first.", true); return; }

  const promo = currentPromo(document.getElementById("promoCode").value.trim());
  const subtotal = cart.reduce((sum, i) => sum + i.qty * i.unit_price, 0);
  const discountPct = promo ? (promo.discount_pct || 0) : 0;
  const discountAmt = subtotal * discountPct / 100;
  const isDelivery = document.getElementById("isDelivery").checked;
  const deliveryFee = isDelivery ? Number(document.getElementById("deliveryFee").value || 0) : 0;
  const total = subtotal - discountAmt + deliveryFee;

  const btn = document.getElementById("checkoutBtn");
  btn.disabled = true;

  // Resolve the customer up-front (by phone) so the sale can be linked to them.
  const custPhone = document.getElementById("custPhone").value.trim();
  const custName = document.getElementById("custName").value.trim();
  let customerId = null;
  if (custPhone) {
    const existing = store.customers.find(c => c.phone === custPhone);
    if (existing) customerId = existing.id;
    else {
      try { customerId = await addDoc("customers", { name: custName || "Customer", phone: custPhone, points: 0, created_at: new Date().toISOString() }); }
      catch (e) { customerId = null; }
    }
  }

  try {
    await runTransaction(async (tx) => {
      // Group cart lines by product — two sizes of the same recipe must not
      // each write the product doc, or one deduction would overwrite the other.
      const byProduct = {};
      cart.forEach(c => { (byProduct[c.product_id] = byProduct[c.product_id] || []).push(c); });
      const productIds = Object.keys(byProduct);
      const productRefs = productIds.map(id => db.collection("products").doc(id));
      const productSnaps = await Promise.all(productRefs.map(ref => tx.get(ref)));

      productSnaps.forEach((snap, i) => {
        if (!snap.exists) return;
        const data = snap.data();
        const lines = byProduct[productIds[i]];
        const sizes = (data.sizes || []).map(s => ({ ...s }));
        let stdStock = data.finished_stock_qty || 0;
        let touchedSizes = false, touchedStd = false;

        lines.forEach(line => {
          if (line.size_name) {
            const idx = sizes.findIndex(s =>
              (s.name || "").trim().toLowerCase() === line.size_name.trim().toLowerCase());
            if (idx >= 0) { sizes[idx].stock = (Number(sizes[idx].stock) || 0) - line.qty; touchedSizes = true; return; }
          }
          // No size, or the size has since been removed — fall back to the product total.
          stdStock -= line.qty;
          touchedStd = true;
        });

        // Warn-but-allow: stock may go negative, which flags unlogged production.
        const patch = {};
        if (touchedSizes) patch.sizes = sizes;
        if (touchedStd) patch.finished_stock_qty = stdStock;
        if (Object.keys(patch).length) tx.update(productRefs[i], patch);
      });

      const saleRef = db.collection("sales").doc();
      tx.set(saleRef, {
        items: cart.map(c => ({ product_id: c.product_id, size_name: c.size_name || "", name: c.name, qty: c.qty, unit_price: c.unit_price, unit_cost: c.unit_cost, line_total: c.qty * c.unit_price })),
        subtotal, discount_pct: discountPct, discount_amt: discountAmt,
        delivery_fee: deliveryFee, total,
        payment_method: document.getElementById("paymentMethod").value,
        customer_name: custName,
        customer_phone: custPhone,
        customer_id: customerId,
        is_delivery: isDelivery,
        cashier_name: currentStaff.name,
        cashier_id: currentStaff.id,
        timestamp: new Date().toISOString()
      });

      if (isDelivery) {
        const delivRef = db.collection("deliveries").doc();
        tx.set(delivRef, {
          sale_id: saleRef.id,
          customer_name: document.getElementById("custName").value.trim() || "Walk-in",
          phone: document.getElementById("custPhone").value.trim(),
          address: document.getElementById("custAddress").value.trim(),
          fee: deliveryFee,
          status: "pending",
          driver_id: null,
          driver_name: null,
          scheduled_time: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }
    });
  } catch (err) {
    console.error("POS sale failed:", err);
    let msg = err.message || "Could not complete this sale.";
    if (err.code === "permission-denied") msg = "Sale blocked by database permissions — publish your firestore.rules in Firebase.";
    showToast(msg, true);
    btn.disabled = false;
    return;
  }

  // Loyalty: award points to the linked customer
  try {
    const cfg = getSettings();
    if (cfg.loyalty_enabled && customerId) {
      const cust = store.customers.find(c => c.id === customerId);
      const earned = total * (cfg.loyalty_rate || 0);
      await updateDoc("customers", customerId, {
        points: ((cust ? cust.points : 0) || 0) + earned,
        last_visit: new Date().toISOString()
      });
      if (earned >= 1) showToast(`+${Math.floor(earned)} loyalty points${cust ? " for " + cust.name : ""}.`);
    }
  } catch (e) { /* loyalty is non-blocking */ }

  // Auto-create a receipt/invoice for this POS sale
  try {
    const nextNum = (store.invoices.reduce((m, iv) => Math.max(m, iv.number || 0), 0)) + 1;
    await addDoc("invoices", {
      number: nextNum,
      customer: custName || "Walk-in",
      phone: custPhone || "",
      items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.unit_price, line_total: c.qty * c.unit_price })),
      subtotal, total,
      status: "Paid",
      source: "pos",
      date: new Date().toISOString()
    });
  } catch (e) { /* invoice non-blocking */ }

  showToast(`Sale completed: ${fmtMoney(total)}.`);
  cart = [];
  document.getElementById("checkoutForm").reset();
  document.getElementById("deliveryFields").style.display = "none";
  renderCart();
  btn.disabled = false;
}
