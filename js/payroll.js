/* ============================================================
   Payroll
   ============================================================ */

let payrollPreset = "week";
let payrollBasis = "clocked"; // "clocked" (actual attendance) or "scheduled" (shifts)

function shiftHours(shift) {
  const [sh, sm] = shift.start_time.split(":").map(Number);
  const [eh, em] = shift.end_time.split(":").map(Number);
  let hours = (eh + em / 60) - (sh + sm / 60);
  if (hours < 0) hours += 24;
  return hours;
}

function attendanceHours(entry) {
  if (!entry.clock_in || !entry.clock_out) return 0;
  return Math.max(0, (new Date(entry.clock_out) - new Date(entry.clock_in)) / 3600000);
}

function renderPayroll(root) {
  root = root || document.getElementById("moduleContent");
  const { start, end } = rangeFor(payrollPreset);

  const byStaff = {};
  if (payrollBasis === "clocked") {
    // Actual hours from completed attendance punches
    store.attendance
      .filter(a => a.clock_in && a.clock_out && withinRange(a.clock_in, start, end))
      .forEach(a => {
        const staff = employeeById(a.staff_id) || staffById(a.staff_id);
        if (!staff || staff.pay_type === "monthly") return;
        if (!byStaff[a.staff_id]) byStaff[a.staff_id] = { name: staff.name, rate: staff.hourly_rate || 0, hours: 0 };
        byStaff[a.staff_id].hours += attendanceHours(a);
      });
  } else {
    // Planned hours from the schedule
    store.shifts
      .filter(s => withinRange(`${s.date}T${s.start_time || "00:00"}`, start, end))
      .forEach(s => {
        const staff = employeeById(s.staff_id) || staffById(s.staff_id);
        if (!staff || staff.pay_type === "monthly") return;
        if (!byStaff[s.staff_id]) byStaff[s.staff_id] = { name: staff.name, rate: staff.hourly_rate || 0, hours: 0 };
        byStaff[s.staff_id].hours += shiftHours(s);
      });
  }
  const entries = Object.entries(byStaff).map(([staff_id, v]) => ({
    staff_id, name: v.name, type: "hourly", hours: v.hours, rate: v.rate, base_pay: v.hours * v.rate
  }));

  // Monthly-salaried staff are included when viewing a month
  if (payrollPreset === "month") {
    store.employees
      .filter(st => st.pay_type === "monthly" && st.status !== "Terminated" && (st.monthly_salary || 0) > 0)
      .forEach(st => entries.push({
        staff_id: st.id, name: st.name, type: "monthly",
        hours: null, rate: st.monthly_salary, base_pay: st.monthly_salary
      }));
  }

  const bonuses = renderPayroll._bonuses = renderPayroll._bonuses || {};
  const totalPay = entries.reduce((s, e) => s + e.base_pay + (Number(bonuses[e.staff_id]) || 0), 0);

  // Outstanding advance per staff = advances given − amounts already repaid via payroll
  const outstandingAdvance = (staffId) => {
    return (store.staff_advances || [])
      .filter(a => a.staff_id === staffId)
      .reduce((s, a) => s + (a.amount || 0) - (a.repaid || 0), 0);
  };
  const deductions = renderPayroll._deductions || (renderPayroll._deductions = {});
  // Default each staff's deduction to their full outstanding advance (capped at gross)
  entries.forEach(en => {
    const owed = outstandingAdvance(en.staff_id);
    const gross = en.base_pay + (Number(bonuses[en.staff_id]) || 0);
    if (deductions[en.staff_id] === undefined) deductions[en.staff_id] = Math.min(owed, gross);
  });
  const totalNet = entries.reduce((s, e) => {
    const gross = e.base_pay + (Number(bonuses[e.staff_id]) || 0);
    return s + gross - (Number(deductions[e.staff_id]) || 0);
  }, 0);

  root.innerHTML = `
    <div class="panel-head panel-head-row">
      <div>
        <h2>Payroll</h2>
        <p class="panel-sub">Hourly staff paid from ${payrollBasis === "clocked" ? "<strong>actual clocked hours</strong>" : "<strong>scheduled hours</strong>"}; monthly salaries added on the month view.</p>
      </div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
        <span class="segmented">
          <button class="seg-btn ${payrollBasis === "clocked" ? "is-active" : ""}" data-basis="clocked">Actual (clocked)</button>
          <button class="seg-btn ${payrollBasis === "scheduled" ? "is-active" : ""}" data-basis="scheduled">Scheduled</button>
        </span>
        <span class="segmented">
          <button class="seg-btn ${payrollPreset === "week" ? "is-active" : ""}" data-preset="week">This week</button>
          <button class="seg-btn ${payrollPreset === "month" ? "is-active" : ""}" data-preset="month">This month</button>
        </span>
      </div>
    </div>

    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Staff</th><th>Basis</th><th>Base pay</th><th>Bonus</th><th>Gross pay</th><th>Advance owed</th><th>Deduct now</th><th>Net pay</th></tr></thead>
        <tbody>
          ${entries.map(en => {
            const gross = en.base_pay + (Number(bonuses[en.staff_id]) || 0);
            const owed = outstandingAdvance(en.staff_id);
            const deduct = Number(deductions[en.staff_id]) || 0;
            return `
            <tr>
              <td>${esc(en.name)}</td>
              <td class="num">${en.type === "monthly" ? "Monthly salary" : en.hours.toFixed(1) + " hrs × " + fmtMoney(en.rate)}</td>
              <td class="num">${fmtMoney(en.base_pay)}</td>
              <td class="num"><input type="number" class="bonus-input" data-bonus="${en.staff_id}" step="0.01" min="0" value="${Number(bonuses[en.staff_id]) || 0}" style="width:80px;padding:5px 7px;border:1px solid var(--line);border-radius:4px;"></td>
              <td class="num">${fmtMoney(gross)}</td>
              <td class="num" style="${owed > 0 ? "color:var(--oven);" : "color:var(--char-soft);"}">${fmtMoney(owed)}</td>
              <td class="num"><input type="number" class="deduct-input" data-deduct="${en.staff_id}" step="0.01" min="0" max="${Math.min(owed, gross)}" value="${deduct}" style="width:80px;padding:5px 7px;border:1px solid ${deduct > 0 ? "var(--oven)" : "var(--line)"};border-radius:4px;" ${owed <= 0 ? "disabled" : ""}></td>
              <td class="num"><strong>${fmtMoney(gross - deduct)}</strong></td>
            </tr>`;
          }).join("") || `<tr><td colspan="8" class="empty-state">No pay due in this period.</td></tr>`}
        </tbody>
        ${entries.length ? `<tfoot><tr><td colspan="4">Total</td><td class="num">${fmtMoney(totalPay)}</td><td></td><td>Net</td><td class="num">${fmtMoney(totalNet)}</td></tr></tfoot>` : ""}
      </table>
    </div>

    ${entries.length ? `<button class="btn btn-primary" id="postPayrollBtn" style="margin-top:16px;">Post payroll — ${fmtMoney(totalNet)} net to staff</button>` : ""}

    <div class="advance-box">
      <h3 class="dash-col-title">Give a salary advance</h3>
      <p class="panel-sub">Records cash given to a staff member now. It shows as an expense and will be deducted from their next payday.</p>
      <div class="advance-form">
        <select id="advStaff">
          ${[...store.employees, ...store.staff].filter((v,i,arr) => v && v.name && arr.findIndex(x => x.id === v.id) === i).map(st => `<option value="${st.id}">${esc(st.name)}</option>`).join("")}
        </select>
        <input type="number" id="advAmount" step="0.01" min="0" placeholder="Amount (GHS)">
        <input type="date" id="advDate" value="${todayISO()}" title="Date given">
        <input type="time" id="advTime" value="${nowTime()}" title="Time given">
        <input type="text" id="advNote" placeholder="Reason (optional)">
        <button class="btn btn-ghost" id="giveAdvanceBtn">Give advance</button>
      </div>
    </div>

    ${(store.staff_advances || []).some(a => (a.amount || 0) - (a.repaid || 0) > 0) ? `
    <h3 class="dash-col-title" style="margin-top:28px;">Outstanding advances</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Staff</th><th>Given</th><th>Repaid</th><th>Still owed</th><th>Date &amp; time</th><th>Reason</th></tr></thead>
        <tbody>
          ${(store.staff_advances || []).filter(a => (a.amount || 0) - (a.repaid || 0) > 0).map(a => `
            <tr>
              <td>${esc(a.staff_name)}</td>
              <td class="num">${fmtMoney(a.amount)}</td>
              <td class="num">${fmtMoney(a.repaid || 0)}</td>
              <td class="num" style="color:var(--oven);"><strong>${fmtMoney((a.amount || 0) - (a.repaid || 0))}</strong></td>
              <td class="num">${a.datetime ? fmtDateTime(a.datetime) : (a.created_at ? fmtDateTime(a.created_at) : fmtDate(a.date))}</td>
              <td>${esc(a.note || "")}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>` : ""}

    <h3 class="dash-col-title" style="margin-top:32px;">Past payroll runs</h3>
    <div class="table-wrap">
      <table class="ledger-table">
        <thead><tr><th>Period</th><th>Total</th><th>Posted (date &amp; time)</th></tr></thead>
        <tbody>
          ${[...store.payroll_runs].sort((a,b) => new Date(b.generated_at) - new Date(a.generated_at)).map(r => `
            <tr><td>${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}</td><td class="num">${fmtMoney(r.total)}</td><td class="num">${fmtDateTime(r.generated_at)}</td></tr>
          `).join("") || `<tr><td colspan="3" class="empty-state">No payroll runs yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  root.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => { payrollPreset = btn.dataset.preset; renderPayroll(root); });
  });
  root.querySelectorAll("[data-basis]").forEach(btn => {
    btn.addEventListener("click", () => { payrollBasis = btn.dataset.basis; renderPayroll(root); });
  });

  root.querySelectorAll("[data-bonus]").forEach(input => {
    input.addEventListener("change", () => {
      renderPayroll._bonuses[input.dataset.bonus] = Number(input.value) || 0;
      renderPayroll(root);
    });
  });

  root.querySelectorAll("[data-deduct]").forEach(input => {
    input.addEventListener("change", () => {
      renderPayroll._deductions[input.dataset.deduct] = Number(input.value) || 0;
      renderPayroll(root);
    });
  });

  // Give a salary advance
  const giveBtn = document.getElementById("giveAdvanceBtn");
  if (giveBtn) giveBtn.addEventListener("click", async () => {
    const staffId = document.getElementById("advStaff").value;
    const amount = Number(document.getElementById("advAmount").value) || 0;
    const note = document.getElementById("advNote").value.trim();
    const advDate = document.getElementById("advDate").value || todayISO();
    const advDateTime = combineDateTime(advDate, document.getElementById("advTime").value);
    const staff = employeeById(staffId) || staffById(staffId);
    if (!staff) { showToast("Pick a staff member.", true); return; }
    if (amount <= 0) { showToast("Enter an advance amount.", true); return; }
    if (!confirm(`Give ${fmtMoney(amount)} advance to ${staff.name}? This records the cash out and will be deducted at their next payday.`)) return;
    try {
      await addDoc("staff_advances", {
        staff_id: staffId, staff_name: staff.name, amount, repaid: 0,
        note, date: advDate, datetime: advDateTime, given_by: currentStaff.name
      });
      // Show the cash going out as an expense (a recoverable advance, not a payroll cost)
      await addDoc("expenses", {
        category: "Salaries", subcategory: "Advance", payment_method: "Cash",
        description: `Salary advance — ${staff.name}${note ? " (" + note + ")" : ""}`,
        amount, date: advDate, datetime: advDateTime, vendor: staff.name, created_by: currentStaff.name,
        is_advance: true
      });
      showToast(`Advance of ${fmtMoney(amount)} given to ${staff.name}.`);
    } catch (err) {
      console.error("Advance failed:", err);
      showToast(err.message || "Could not record the advance — check permissions.", true);
    }
  });

  const postBtn = document.getElementById("postPayrollBtn");
  if (postBtn) postBtn.addEventListener("click", async () => {
    if (!confirm(`Post this pay run? Staff receive ${fmtMoney(totalNet)} net (after advance deductions). Do this once per pay run.`)) return;
    const entriesFull = entries.map(en => {
      const bonus = Number(bonuses[en.staff_id]) || 0;
      const deduct = Number(deductions[en.staff_id]) || 0;
      const gross = en.base_pay + bonus;
      return { ...en, bonus, gross_pay: gross, advance_deducted: deduct, net_pay: gross - deduct };
    });
    const totalGross = entriesFull.reduce((s, e) => s + e.gross_pay, 0);
    const totalDeducted = entriesFull.reduce((s, e) => s + e.advance_deducted, 0);

    try {
      await addDoc("payroll_runs", {
        period_start: start.toISOString(), period_end: end.toISOString(),
        basis: payrollBasis,
        entries: entriesFull, total: totalNet, gross_total: totalGross,
        advance_deducted: totalDeducted, generated_at: new Date().toISOString(), status: "paid"
      });

      // Apply advance repayments: mark deducted amounts as repaid on the oldest advances first
      for (const en of entriesFull) {
        let toRepay = en.advance_deducted;
        if (toRepay <= 0) continue;
        const advs = (store.staff_advances || [])
          .filter(a => a.staff_id === en.staff_id && (a.amount || 0) - (a.repaid || 0) > 0)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        for (const adv of advs) {
          if (toRepay <= 0) break;
          const remaining = (adv.amount || 0) - (adv.repaid || 0);
          const pay = Math.min(remaining, toRepay);
          await updateDoc("staff_advances", adv.id, { repaid: (adv.repaid || 0) + pay });
          toRepay -= pay;
        }
      }

      // Post the NET cash actually paid to staff as the payroll expense.
      // (The advance cash was already expensed when it was given, so we only
      //  post the net here to avoid double-counting.)
      await addDoc("expenses", {
        category: "Payroll", subcategory: "Payroll Run", payment_method: "Bank Transfer",
        description: `Payroll — ${fmtDate(start)} to ${fmtDate(end)}${totalDeducted ? ` (net of ${fmtMoney(totalDeducted)} advances)` : ""}`,
        amount: totalNet, date: todayISO(), vendor: "", created_by: currentStaff.name
      });

      renderPayroll._bonuses = {};
      renderPayroll._deductions = {};
      showToast(`Payroll posted — ${fmtMoney(totalNet)} paid to staff.`);
    } catch (err) {
      console.error("Payroll post failed:", err);
      showToast(err.message || "Could not post payroll — check permissions.", true);
    }
  });
}
