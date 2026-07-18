/* ============================================================
   Marketing
   ============================================================ */

function renderMarketing(root) {
  root = root || document.getElementById("moduleContent");

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Marketing</h2>
        <p class="panel-sub">Campaigns, promo codes, and social content planning.</p>
      </div>
      <div>
        <button class="btn btn-ghost" id="addPostBtn">Plan a post</button>
        <button class="btn btn-primary" id="addCampaignBtn">New campaign</button>
      </div>
    </div>

    <h3 class="dash-col-title">Campaigns</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Name</th><th>Channel</th><th>Promo code</th><th>Discount</th><th>Budget</th><th>Dates</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${store.campaigns.map(c => `
            <tr>
              <td>${esc(c.name)}</td>
              <td>${esc(c.channel)}</td>
              <td>${c.promo_code ? `<code>${esc(c.promo_code)}</code>` : "—"}</td>
              <td class="num">${c.discount_pct ? c.discount_pct + "%" : "—"}</td>
              <td class="num">${fmtMoney(c.budget || 0)}</td>
              <td>${fmtDate(c.start_date)} – ${fmtDate(c.end_date)}</td>
              <td><span class="status-pill ${c.status === "active" ? "status-ok" : "status-low"}">${esc(c.status)}</span></td>
              <td><button class="btn btn-ghost btn-small" data-flyer="${c.id}">Draft copy</button></td>
            </tr>
          `).join("") || `<tr><td colspan="8" class="empty-state">No campaigns yet.</td></tr>`}
        </tbody>
      </table>
    </div>

    <h3 class="dash-col-title" style="margin-top:28px;">Social post plan</h3>
    <div class="ticket-list post-plan">
      ${[...store.social_posts].sort((a,b) => new Date(a.planned_date) - new Date(b.planned_date)).map(p => `
        <div class="ticket">
          <div class="ticket-title">${esc(p.channel)} · ${fmtDate(p.planned_date)}</div>
          <p style="margin:0 0 10px;font-family:var(--font-body);font-size:0.88rem;">${esc(p.caption)}</p>
          <div class="ticket-actions">
            <button class="btn btn-ghost btn-small" data-toggle-post="${p.id}">${p.status === "posted" ? "Mark planned" : "Mark posted"}</button>
            <button class="btn btn-ghost btn-small" data-remove-post="${p.id}">Delete</button>
          </div>
        </div>
      `).join("") || `<p class="empty-state">No posts planned yet.</p>`}
    </div>

    <div id="flyerResult" class="ticket-slot" style="margin-top:20px;"></div>
  `;

  document.getElementById("addCampaignBtn").addEventListener("click", openCampaignForm);
  document.getElementById("addPostBtn").addEventListener("click", openPostForm);
  root.querySelectorAll("[data-flyer]").forEach(btn => {
    btn.addEventListener("click", () => draftCampaignCopy(btn.dataset.flyer));
  });
  root.querySelectorAll("[data-toggle-post]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const post = store.social_posts.find(p => p.id === btn.dataset.togglePost);
      await updateDoc("social_posts", post.id, { status: post.status === "posted" ? "planned" : "posted" });
    });
  });
  root.querySelectorAll("[data-remove-post]").forEach(btn => {
    btn.addEventListener("click", async () => { await deleteDoc("social_posts", btn.dataset.removePost); });
  });
}

function openCampaignForm() {
  openModal(`
    <h3>New campaign</h3>
    <form id="campForm" class="modal-form">
      <label>Name <input type="text" id="cName" required></label>
      <label>Channel
        <select id="cChannel">
          <option>Instagram</option><option>Facebook</option><option>WhatsApp</option><option>Flyer</option><option>In-store</option>
        </select>
      </label>
      <div class="form-row-2">
        <label>Start date <input type="date" id="cStart" value="${todayISO()}" required></label>
        <label>End date <input type="date" id="cEnd" required></label>
      </div>
      <div class="form-row-2">
        <label>Budget (GHS) <input type="number" step="0.01" min="0" id="cBudget" value="0"></label>
        <label>Discount % (optional) <input type="number" step="1" min="0" max="100" id="cDiscount" value="0"></label>
      </div>
      <label>Promo code (optional) <input type="text" id="cPromo" placeholder="e.g. SOURDOUGH10"></label>
      <label>Notes <input type="text" id="cNotes"></label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="campCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("campCancelBtn").addEventListener("click", closeModal);
  document.getElementById("campForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc("campaigns", {
      name: document.getElementById("cName").value.trim(),
      channel: document.getElementById("cChannel").value,
      start_date: document.getElementById("cStart").value,
      end_date: document.getElementById("cEnd").value,
      budget: Number(document.getElementById("cBudget").value || 0),
      discount_pct: Number(document.getElementById("cDiscount").value || 0),
      promo_code: document.getElementById("cPromo").value.trim().toUpperCase(),
      notes: document.getElementById("cNotes").value.trim(),
      status: "active"
    });
    closeModal();
    showToast("Campaign created.");
  });
}

function openPostForm() {
  openModal(`
    <h3>Plan a social post</h3>
    <form id="postForm" class="modal-form">
      <label>Channel
        <select id="pChannel"><option>Instagram</option><option>Facebook</option><option>WhatsApp Status</option><option>TikTok</option></select>
      </label>
      <label>Planned date <input type="date" id="pDate" value="${todayISO()}" required></label>
      <label>Caption <textarea id="pCaption" rows="4" required></textarea></label>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="postCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Add to plan</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("postCancelBtn").addEventListener("click", closeModal);
  document.getElementById("postForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc("social_posts", {
      channel: document.getElementById("pChannel").value,
      planned_date: document.getElementById("pDate").value,
      caption: document.getElementById("pCaption").value.trim(),
      status: "planned"
    });
    closeModal();
    showToast("Post added to plan.");
  });
}

function draftCampaignCopy(campaignId) {
  const c = store.campaigns.find(x => x.id === campaignId);
  if (!c) return;
  const topProduct = store.products[0];
  const lines = [
    `🥖 ${c.name} is on at El Mundo Bakery!`,
    c.discount_pct ? `Use code ${c.promo_code || "the code below"} for ${c.discount_pct}% off.` : `Come see what's new this week.`,
    topProduct ? `Try our ${topProduct.name} — ${fmtMoney(topProduct.selling_price || 0)}.` : "",
    `Valid ${fmtDate(c.start_date)} – ${fmtDate(c.end_date)}. Freshly baked daily — made with love & quality ingredients.`,
    `📞 Call/WhatsApp 0556492858 · Follow @elmundobakery on Facebook, Instagram & TikTok.`
  ].filter(Boolean);

  document.getElementById("flyerResult").innerHTML = `
    <div class="ticket">
      <div class="ticket-title">Draft copy — ${esc(c.name)}</div>
      <p style="font-family:var(--font-body);font-size:0.9rem;white-space:pre-line;">${lines.map(esc).join("\n")}</p>
      <div class="ticket-meta">Copy this into WhatsApp, Instagram, or your flyer.</div>
    </div>
  `;
}
