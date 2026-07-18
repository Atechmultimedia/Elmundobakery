/* ============================================================
   Delivery / Transportation
   ============================================================ */

const DELIVERY_STATUSES = ["pending", "out_for_delivery", "delivered", "failed"];
const STATUS_LABEL = { pending: "Pending", out_for_delivery: "Out for delivery", delivered: "Delivered", failed: "Failed" };

/* Build a Google Maps link for a delivery address.
   Ghana digital addresses (GhanaPostGPS) look like "GA-235-6435" — two letters,
   then digits. For those we search GhanaPostGPS; for anything else we do a normal
   Maps search biased to Ghana so the driver lands in the right area. */
function mapUrlFor(address) {
  const addr = (address || "").trim();
  const isGhanaGPS = /^[A-Za-z]{2}[-\s]?\d{3,4}[-\s]?\d{4}$/.test(addr.replace(/\s+/g, ""));
  if (isGhanaGPS) {
    // GhanaPostGPS locator — resolves the digital address to a point on their map
    return "https://www.ghanapostgps.com/map/?q=" + encodeURIComponent(addr.toUpperCase());
  }
  // Regular address — Google Maps search, biased to Ghana
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr + ", Ghana");
}

function renderDelivery(root) {
  root = root || document.getElementById("moduleContent");
  const drivers = store.staff.filter(s => s.role === "delivery" && s.active !== false);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Delivery</h2>
        <p class="panel-sub">Fulfillment pipeline for every order marked for delivery.</p>
      </div>
      <button class="btn btn-primary" id="addDeliveryBtn">New delivery</button>
    </div>
    <div class="delivery-board">
      ${DELIVERY_STATUSES.map(status => `
        <div class="delivery-col">
          <h4>${STATUS_LABEL[status]}</h4>
          ${store.deliveries.filter(d => d.status === status).map(d => `
            <div class="delivery-card">
              <div class="delivery-card-top">
                <strong>${esc(d.customer_name)}</strong>
                <span>${fmtMoney(d.fee || 0)}</span>
              </div>
              <p class="delivery-address">${esc(d.address || "No address on file")}${d.address ? ` <a class="map-link" href="${mapUrlFor(d.address)}" target="_blank" rel="noopener" title="Open in Google Maps">📍 map</a>` : ""}</p>
              <p class="delivery-meta">${d.phone ? esc(d.phone) + " · " : ""}${d.driver_name ? "Driver: " + esc(d.driver_name) : "No driver assigned"}</p>
              <div class="delivery-actions">
                ${status === "pending" ? `<select class="driver-select" data-assign="${d.id}">
                    <option value="">Assign driver…</option>
                    ${drivers.map(dr => `<option value="${dr.id}" ${d.driver_id === dr.id ? "selected" : ""}>${esc(dr.name)}</option>`).join("")}
                  </select>` : ""}
                ${status === "pending" ? `<button class="btn btn-ghost btn-small" data-status="${d.id}|out_for_delivery">Send out</button>` : ""}
                ${status === "out_for_delivery" ? `<button class="btn btn-ghost btn-small" data-status="${d.id}|delivered">Mark delivered</button>` : ""}
                ${status === "out_for_delivery" ? `<button class="btn btn-ghost btn-small" data-status="${d.id}|failed">Mark failed</button>` : ""}
                ${status === "failed" ? `<button class="btn btn-ghost btn-small" data-status="${d.id}|pending">Retry</button>` : ""}
              </div>
            </div>
          `).join("") || `<p class="empty-state">None</p>`}
        </div>
      `).join("")}
    </div>
  `;

  document.getElementById("addDeliveryBtn").addEventListener("click", () => openDeliveryForm());
  root.querySelectorAll("[data-status]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [id, status] = btn.dataset.status.split("|");
      updateDeliveryStatus(id, status);
    });
  });
  root.querySelectorAll("[data-assign]").forEach(sel => {
    sel.addEventListener("change", async () => {
      const driver = staffById(sel.value);
      await updateDoc("deliveries", sel.dataset.assign, {
        driver_id: driver ? driver.id : null,
        driver_name: driver ? driver.name : null
      });
      showToast(driver ? `Assigned to ${driver.name}.` : "Driver unassigned.");
    });
  });
}

async function updateDeliveryStatus(id, status) {
  const payload = { status };
  if (status === "delivered") payload.delivered_time = new Date().toISOString();
  await updateDoc("deliveries", id, payload);
  showToast(`Marked ${STATUS_LABEL[status].toLowerCase()}.`);
}

function openDeliveryForm() {
  const drivers = store.staff.filter(s => s.role === "delivery" && s.active !== false);
  openModal(`
    <h3>New delivery</h3>
    <form id="delivForm" class="modal-form">
      <label>Customer name <input type="text" id="delivName" required></label>
      <label>Phone <input type="text" id="delivPhone"></label>
      <label>Address <input type="text" id="delivAddress" required></label>
      <label>Delivery fee (GHS) <input type="number" step="0.01" min="0" id="delivFee" value="0"></label>
      <label>Driver
        <select id="delivDriver">
          <option value="">Unassigned</option>
          ${drivers.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}
        </select>
      </label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="delivCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("delivCancelBtn").addEventListener("click", closeModal);
  document.getElementById("delivForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const driver = staffById(document.getElementById("delivDriver").value);
    await addDoc("deliveries", {
      customer_name: document.getElementById("delivName").value.trim(),
      phone: document.getElementById("delivPhone").value.trim(),
      address: document.getElementById("delivAddress").value.trim(),
      fee: Number(document.getElementById("delivFee").value || 0),
      driver_id: driver ? driver.id : null,
      driver_name: driver ? driver.name : null,
      status: "pending",
      scheduled_time: new Date().toISOString()
    });
    closeModal();
    showToast("Delivery created.");
  });
}
