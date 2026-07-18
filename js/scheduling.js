/* ============================================================
   Scheduling
   ============================================================ */

let scheduleWeekStart = startOfWeek(new Date());

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? 6 : day - 1);
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function renderScheduling(root) {
  root = root || document.getElementById("moduleContent");
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(scheduleWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekEnd = days[6];

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Scheduling</h2>
        <p class="panel-sub">${fmtDate(scheduleWeekStart)} – ${fmtDate(weekEnd)}</p>
      </div>
      <div>
        <button class="btn btn-ghost btn-small" id="prevWeekBtn">← Prev week</button>
        <button class="btn btn-ghost btn-small" id="nextWeekBtn">Next week →</button>
        <button class="btn btn-primary" id="addShiftBtn">Add shift</button>
      </div>
    </div>
    <div class="schedule-grid">
      ${days.map(d => {
        const iso = d.toISOString().slice(0, 10);
        const dayShifts = store.shifts.filter(s => s.date === iso).sort((a, b) => a.start_time.localeCompare(b.start_time));
        return `
          <div class="schedule-day">
            <h4>${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</h4>
            ${dayShifts.map(s => `
              <div class="shift-chip">
                <strong>${esc(s.staff_name)}</strong>
                <span>${s.start_time}–${s.end_time}</span>
                <button class="shift-remove" data-remove-shift="${s.id}" title="Remove">✕</button>
              </div>
            `).join("") || `<p class="empty-state-sm">—</p>`}
          </div>
        `;
      }).join("")}
    </div>

    ${(() => {
      const weekIsos = days.map(d => d.toISOString().slice(0, 10));
      const weekShifts = store.shifts.filter(s => weekIsos.includes(s.date));
      const byPerson = {};
      weekShifts.forEach(s => {
        if (!byPerson[s.staff_id]) byPerson[s.staff_id] = { name: s.staff_name, id: s.staff_id, shifts: [] };
        byPerson[s.staff_id].shifts.push(s);
      });
      const people = Object.values(byPerson);
      if (!people.length) return "";
      return `
        <div class="panel-head-row" style="margin-top:26px;">
          <h3 class="dash-col-title" style="margin:0;">Notify staff — this week's shifts</h3>
          <button class="btn btn-ghost btn-small" id="rotaGroupBtn">Copy full rota for group</button>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead><tr><th>Employee</th><th>Shifts this week</th><th>Phone</th><th></th></tr></thead>
            <tbody>
              ${people.map(p => {
                const emp = employeeById(p.id);
                const phone = emp ? (emp.phone || "") : "";
                const shiftList = p.shifts
                  .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
                  .map(s => `${new Date(s.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} ${s.start_time}–${s.end_time}`);
                return `
                  <tr>
                    <td><strong>${esc(p.name)}</strong></td>
                    <td style="font-size:0.85rem;">${shiftList.join("<br>")}</td>
                    <td>${esc(phone) || '<span class="modal-hint">no phone on record</span>'}</td>
                    <td>${phone ? `<button class="btn btn-ghost btn-small" data-send-shifts="${p.id}">Send via WhatsApp</button>` : ""}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
        <p class="modal-hint" style="margin-top:8px;">Sending opens WhatsApp with the message ready — you choose whether to send the whole week or just the next few days.</p>
      `;
    })()}
  `;

  document.getElementById("prevWeekBtn").addEventListener("click", () => {
    scheduleWeekStart.setDate(scheduleWeekStart.getDate() - 7);
    renderScheduling(root);
  });
  document.getElementById("nextWeekBtn").addEventListener("click", () => {
    scheduleWeekStart.setDate(scheduleWeekStart.getDate() + 7);
    renderScheduling(root);
  });
  document.getElementById("addShiftBtn").addEventListener("click", openShiftForm);
  root.querySelectorAll("[data-remove-shift]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await deleteDoc("shifts", btn.dataset.removeShift);
      showToast("Shift removed.");
    });
  });

  root.querySelectorAll("[data-send-shifts]").forEach(btn => {
    btn.addEventListener("click", () => sendShiftsToPerson(btn.dataset.sendShifts, days));
  });
  const groupBtn = document.getElementById("rotaGroupBtn");
  if (groupBtn) groupBtn.addEventListener("click", () => copyFullRota(days));
}

function shiftRangeChoice(personShifts, days) {
  // Ask whole week vs next few days
  const wantsWeek = confirm("Send the WHOLE week's shifts?\n\nOK = whole week   ·   Cancel = just the next 3 days");
  if (wantsWeek) return { shifts: personShifts, label: "this week" };
  const today = todayISO();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 3);
  const cutIso = cutoff.toISOString().slice(0, 10);
  return {
    shifts: personShifts.filter(s => s.date >= today && s.date <= cutIso),
    label: "the next few days"
  };
}

function fmtShiftLine(s) {
  return "• " + new Date(s.date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }) +
         ": " + s.start_time + "–" + s.end_time;
}

function sendShiftsToPerson(personId, days) {
  const emp = employeeById(personId);
  if (!emp || !emp.phone) { showToast("No phone number on this employee's record.", true); return; }
  const weekIsos = days.map(d => d.toISOString().slice(0, 10));
  const personShifts = store.shifts
    .filter(s => s.staff_id === personId && weekIsos.includes(s.date))
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  if (!personShifts.length) { showToast("No shifts for this person this week.", true); return; }

  const { shifts, label } = shiftRangeChoice(personShifts, days);
  if (!shifts.length) { showToast("No shifts in that range.", true); return; }

  const firstName = (emp.name || "").split(" ")[0];
  let msg = `Hi ${firstName}, here are your El Mundo Bakery shifts for ${label}:%0A%0A`;
  msg += shifts.map(s => encodeURIComponent(fmtShiftLine(s))).join("%0A");
  msg += "%0A%0A" + encodeURIComponent("Please let us know if you have any issues. Thank you!");

  const phone = emp.phone.replace(/[^0-9]/g, "").replace(/^0/, "233");
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
}

function copyFullRota(days) {
  const weekIsos = days.map(d => d.toISOString().slice(0, 10));
  const weekShifts = store.shifts.filter(s => weekIsos.includes(s.date));
  if (!weekShifts.length) { showToast("No shifts this week to share.", true); return; }

  const wantsWeek = confirm("Copy the WHOLE week's rota?\n\nOK = whole week   ·   Cancel = just the next 3 days");
  const today = todayISO();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 3);
  const cutIso = cutoff.toISOString().slice(0, 10);

  let text = "🥖 EL MUNDO BAKERY — Shift Rota\n" +
             (wantsWeek ? `Week of ${fmtDate(days[0])}` : "Next 3 days") + "\n\n";
  days.forEach(d => {
    const iso = d.toISOString().slice(0, 10);
    if (!wantsWeek && (iso < today || iso > cutIso)) return;
    const dayShifts = weekShifts.filter(s => s.date === iso).sort((a, b) => a.start_time.localeCompare(b.start_time));
    text += d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }) + ":\n";
    text += (dayShifts.length ? dayShifts.map(s => `  - ${s.staff_name}: ${s.start_time}–${s.end_time}`).join("\n") : "  (no shifts)") + "\n\n";
  });
  text += "Please check your day and time. Thank you! 🙏";

  navigator.clipboard.writeText(text).then(
    () => showToast("Full rota copied — paste it into your staff WhatsApp group."),
    () => {
      // fallback: open WhatsApp share
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  );
}

function openShiftForm() {
  const activeStaff = store.employees.filter(s => s.status !== "Terminated");
  if (!activeStaff.length) { showToast("Add employees first.", true); return; }

  openModal(`
    <h3>Add shift</h3>
    <form id="shiftForm" class="modal-form">
      <label>Staff member
        <select id="shStaff">${activeStaff.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>
      </label>
      <label>Date <input type="date" id="shDate" value="${todayISO()}" required></label>
      <div class="form-row-2">
        <label>Start time <input type="time" id="shStart" value="08:00" required></label>
        <label>End time <input type="time" id="shEnd" value="16:00" required></label>
      </div>
      <div class="modal-actions">
        <span></span>
        <div>
          <button type="button" class="btn btn-ghost" id="shiftCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary">Add</button>
        </div>
      </div>
    </form>
  `);
  document.getElementById("shiftCancelBtn").addEventListener("click", closeModal);
  document.getElementById("shiftForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const staff = employeeById(document.getElementById("shStaff").value);
    await addDoc("shifts", {
      staff_id: staff.id,
      staff_name: staff.name,
      date: document.getElementById("shDate").value,
      start_time: document.getElementById("shStart").value,
      end_time: document.getElementById("shEnd").value,
      status: "scheduled"
    });
    closeModal();
    showToast("Shift added.");
  });
}
