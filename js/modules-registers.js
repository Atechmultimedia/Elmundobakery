/* ============================================================
   Register-style modules built on the generic engine
   ============================================================ */

const renderEquity = genericModule({
  title: "Equity", collection: "equity_records",
  sub: "Capital contributions and ownership in the business.",
  addLabel: "Add contribution",
  fields: [
    { id: "date", label: "Date", type: "date", required: true },
    { id: "shareholder", label: "Shareholder / contributor", type: "text", required: true },
    { id: "type", label: "Type", type: "select", options: ["Capital Contribution", "Owner Drawing", "Loan from Owner", "Loan Repayment", "Share Allocation"] },
    { id: "amount", label: "Amount (GHS)", type: "number", required: true },
    { id: "ownership_pct", label: "Ownership % (optional)", type: "number", step: "0.01" },
    { id: "notes", label: "Notes", type: "text" }
  ],
  columns: [
    { label: "Date", num: true, render: r => fmtDate(r.date) },
    { label: "Shareholder", render: r => esc(r.shareholder) },
    { label: "Type", render: r => esc(r.type || "") },
    { label: "Amount", num: true, render: r => fmtMoney(r.amount || 0) },
    { label: "Ownership %", num: true, render: r => r.ownership_pct ? r.ownership_pct + "%" : "—" },
    { label: "Notes", render: r => esc(r.notes || "") }
  ],
  summary: rows => {
    // Money in excludes Share Allocations — they record who owns what, not cash.
    const inFlow = rows.filter(r => r.type === "Capital Contribution" || r.type === "Loan from Owner").reduce((s, r) => s + (r.amount || 0), 0);
    const outFlow = rows.filter(r => r.type === "Owner Drawing" || r.type === "Loan Repayment").reduce((s, r) => s + (r.amount || 0), 0);
    const allocated = rows.filter(r => r.type === "Share Allocation").reduce((s, r) => s + (r.amount || 0), 0);
    return `
      <div class="kpi-card"><span class="kpi-label">Money contributed</span><span class="kpi-value">${fmtMoney(inFlow)}</span></div>
      <div class="kpi-card"><span class="kpi-label">Money drawn out</span><span class="kpi-value">${fmtMoney(outFlow)}</span></div>
      <div class="kpi-card"><span class="kpi-label">Net cash in</span><span class="kpi-value">${fmtMoney(inFlow - outFlow)}</span></div>
      ${allocated ? `<div class="kpi-card"><span class="kpi-label">Share allocations (not cash)</span><span class="kpi-value">${fmtMoney(allocated)}</span></div>` : ""}`;
  }
});

const renderESG = genericModule({
  title: "ESG", collection: "esg_log",
  sub: "Environmental, social and governance actions — useful for reports, permits, and partners.",
  addLabel: "Log initiative",
  fields: [
    { id: "date", label: "Date", type: "date", required: true },
    { id: "pillar", label: "Pillar", type: "select", options: ["Environmental", "Social", "Governance"] },
    { id: "initiative", label: "Initiative", type: "text", required: true },
    { id: "metric", label: "Metric / measurement", type: "text" },
    { id: "cost", label: "Cost (GHS, if any)", type: "number" },
    { id: "notes", label: "Notes", type: "textarea" }
  ],
  columns: [
    { label: "Date", num: true, render: r => fmtDate(r.date) },
    { label: "Pillar", render: r => esc(r.pillar || "") },
    { label: "Initiative", render: r => esc(r.initiative) },
    { label: "Metric", render: r => esc(r.metric || "") },
    { label: "Cost", num: true, render: r => r.cost ? fmtMoney(r.cost) : "—" }
  ]
});

const renderQuality = genericModule({
  title: "Quality Control", collection: "quality_checks",
  sub: "Quality checks on production batches.",
  addLabel: "Log check",
  fields: [
    { id: "date", label: "Date", type: "date", required: true },
    { id: "product", label: "Product / batch", type: "text", required: true },
    { id: "check_type", label: "Check", type: "select", options: ["Appearance", "Weight", "Taste", "Texture", "Hygiene", "Packaging", "Full inspection"] },
    { id: "result", label: "Result", type: "select", options: ["Pass", "Minor issue", "Fail"] },
    { id: "inspector", label: "Inspector", type: "text" },
    { id: "notes", label: "Notes / corrective action", type: "textarea" }
  ],
  columns: [
    { label: "Date", num: true, render: r => fmtDate(r.date) },
    { label: "Product", render: r => esc(r.product) },
    { label: "Check", render: r => esc(r.check_type || "") },
    { label: "Result", render: r => `<span class="status-pill ${r.result === "Pass" ? "status-ok" : "status-low"}">${esc(r.result || "")}</span>` , text: r => r.result || ""},
    { label: "Inspector", render: r => esc(r.inspector || "") },
    { label: "Notes", render: r => esc(r.notes || "") }
  ],
  rowClass: r => r.result === "Fail" ? "row-low" : ""
});

const renderFleet = genericModule({
  title: "Fleet", collection: "fleet_vehicles",
  sub: "Vehicles, riders, and service dates — tricycles, vans, and bikes.",
  addLabel: "Add vehicle",
  fields: [
    { id: "name", label: "Vehicle", type: "text", required: true },
    { id: "plate", label: "Registration / plate", type: "text" },
    { id: "type", label: "Type", type: "select", options: ["Delivery Tricycle", "Delivery Van", "Motorbike", "Push Cart", "Car", "Other"] },
    { id: "assigned_to", label: "Assigned to", type: "text" },
    { id: "status", label: "Status", type: "select", options: ["Active", "In repair", "Retired"] },
    { id: "last_service", label: "Last service", type: "date" },
    { id: "next_service", label: "Next service due", type: "date" },
    { id: "notes", label: "Notes", type: "text" }
  ],
  columns: [
    { label: "Vehicle", render: r => esc(r.name) },
    { label: "Plate", render: r => esc(r.plate || "") },
    { label: "Type", render: r => esc(r.type || "") },
    { label: "Assigned to", render: r => esc(r.assigned_to || "") },
    { label: "Status", render: r => `<span class="status-pill ${r.status === "Active" ? "status-ok" : "status-low"}">${esc(r.status || "")}</span>`, text: r => r.status || "" },
    { label: "Last service", num: true, render: r => r.last_service ? fmtDate(r.last_service) : "—" },
    { label: "Next service", num: true, render: r => r.next_service ? fmtDate(r.next_service) : "—" }
  ],
  rowClass: r => (r.next_service && r.next_service < todayISO() && r.status !== "Retired") ? "row-low" : ""
});

const renderDocuments = genericModule({
  title: "Documents", collection: "documents",
  sub: "Registrations, certificates, contracts and other key papers — with expiry tracking.",
  addLabel: "Add document",
  fields: [
    { id: "name", label: "Document name", type: "text", required: true },
    { id: "category", label: "Category", type: "select", options: ["Business Registration", "FDA / Permit", "Contract", "Insurance", "Certificate", "Policy", "Other"] },
    { id: "issued", label: "Issued date", type: "date" },
    { id: "expires", label: "Expiry date (if any)", type: "date" },
    { id: "location", label: "Where it's kept / link", type: "text" },
    { id: "notes", label: "Notes", type: "text" }
  ],
  columns: [
    { label: "Document", render: r => esc(r.name) },
    { label: "Category", render: r => esc(r.category || "") },
    { label: "Issued", num: true, render: r => r.issued ? fmtDate(r.issued) : "—" },
    { label: "Expires", num: true, render: r => r.expires ? fmtDate(r.expires) : "—" },
    { label: "Kept at / link", render: r => /^https?:\/\//.test(r.location || "") ? `<a href="${esc(r.location)}" target="_blank" rel="noopener">Open</a>` : esc(r.location || ""), text: r => r.location || "" }
  ],
  rowClass: r => (r.expires && r.expires < todayISO()) ? "row-low" : ""
});

const renderTimesheets = genericModule({
  title: "Timesheets", collection: "timesheets",
  sub: "Hours logged against tasks and projects.",
  addLabel: "Log time",
  fields: [
    { id: "date", label: "Date", type: "date", required: true },
    { id: "staff_name", label: "Staff", type: "text", required: true },
    { id: "task", label: "Task / project", type: "text", required: true },
    { id: "hours", label: "Hours", type: "number", step: "0.25", required: true },
    { id: "notes", label: "Notes", type: "text" }
  ],
  beforeSave: (data) => { if (!data.staff_name) data.staff_name = currentStaff.name; },
  columns: [
    { label: "Date", num: true, render: r => fmtDate(r.date) },
    { label: "Staff", render: r => esc(r.staff_name) },
    { label: "Task", render: r => esc(r.task) },
    { label: "Hours", num: true, render: r => (r.hours || 0).toFixed(2) },
    { label: "Notes", render: r => esc(r.notes || "") }
  ],
  summary: rows => {
    const { start, end } = rangeFor("week");
    const wk = rows.filter(r => withinRange(r.date, start, end)).reduce((s, r) => s + (r.hours || 0), 0);
    return `<div class="kpi-card"><span class="kpi-label">Hours this week</span><span class="kpi-value">${wk.toFixed(1)}</span></div>`;
  }
});

const renderHelpdesk = genericModule({
  title: "Help Desk", collection: "tickets",
  sub: "Customer complaints and internal issues, tracked to resolution.",
  addLabel: "New ticket",
  fields: [
    { id: "date", label: "Date", type: "date", required: true },
    { id: "raised_by", label: "Raised by (customer/staff)", type: "text", required: true },
    { id: "channel", label: "Channel", type: "select", options: ["Walk-in", "Phone", "WhatsApp", "Social Media", "Internal"] },
    { id: "priority", label: "Priority", type: "select", options: ["Low", "Normal", "High", "Urgent"] },
    { id: "issue", label: "Issue", type: "textarea", required: true },
    { id: "status", label: "Status", type: "select", options: ["Open", "In progress", "Resolved", "Closed"] },
    { id: "resolution", label: "Resolution", type: "textarea" }
  ],
  columns: [
    { label: "Date", num: true, render: r => fmtDate(r.date) },
    { label: "Raised by", render: r => esc(r.raised_by) },
    { label: "Channel", render: r => esc(r.channel || "") },
    { label: "Priority", render: r => esc(r.priority || "") },
    { label: "Issue", render: r => esc((r.issue || "").slice(0, 80)) },
    { label: "Status", render: r => `<span class="status-pill ${["Resolved","Closed"].includes(r.status) ? "status-ok" : "status-low"}">${esc(r.status || "Open")}</span>`, text: r => r.status || "Open" }
  ],
  rowClass: r => (r.priority === "Urgent" && !["Resolved","Closed"].includes(r.status)) ? "row-low" : "",
  summary: rows => {
    const open = rows.filter(r => !["Resolved","Closed"].includes(r.status)).length;
    return `<div class="kpi-card ${open ? "kpi-bad" : ""}"><span class="kpi-label">Open tickets</span><span class="kpi-value">${open}</span></div>`;
  }
});

const renderApprovals = genericModule({
  title: "Approvals", collection: "approvals",
  sub: "Requests that need a manager's sign-off before money is spent or action is taken.",
  addLabel: "New request",
  fields: [
    { id: "date", label: "Date", type: "date", required: true },
    { id: "requested_by", label: "Requested by", type: "text", required: true },
    { id: "type", label: "Type", type: "select", options: ["Purchase", "Expense", "Discount", "Time Off", "Document", "Other"] },
    { id: "details", label: "Details", type: "textarea", required: true },
    { id: "amount", label: "Amount (GHS, if any)", type: "number" }
  ],
  beforeSave: (data, row) => { if (!row) data.status = "Pending"; },
  columns: [
    { label: "Date", num: true, render: r => fmtDate(r.date) },
    { label: "Requested by", render: r => esc(r.requested_by) },
    { label: "Type", render: r => esc(r.type || "") },
    { label: "Details", render: r => esc((r.details || "").slice(0, 70)) },
    { label: "Amount", num: true, render: r => r.amount ? fmtMoney(r.amount) : "—" },
    { label: "Status", render: r => `<span class="status-pill ${r.status === "Approved" ? "status-ok" : "status-low"}">${esc(r.status || "Pending")}</span>${r.decided_by ? `<br><small>${esc(r.decided_by)}</small>` : ""}`, text: r => r.status || "Pending" }
  ],
  rowActions: r => r.status === "Pending" && ["admin","manager","master"].includes(currentStaff.role)
    ? `<button class="btn btn-ghost btn-small" data-approve="${r.id}|Approved">Approve</button> <button class="btn btn-ghost btn-small" data-approve="${r.id}|Rejected">Reject</button> `
    : "",
  bindActions: (root) => {
    root.querySelectorAll("[data-approve]").forEach(btn => btn.addEventListener("click", async () => {
      const [id, status] = btn.dataset.approve.split("|");
      await updateDoc("approvals", id, { status, decided_by: currentStaff.name, decided_at: new Date().toISOString() });
      showToast(`Request ${status.toLowerCase()}.`);
    }));
  }
});

const renderTimeOff = genericModule({
  title: "Time Off", collection: "timeoff",
  sub: "Leave requests and approvals.",
  addLabel: "Request time off",
  fields: [
    { id: "staff_name", label: "Staff", type: "text", required: true },
    { id: "type", label: "Type", type: "select", options: ["Annual Leave", "Sick Leave", "Maternity/Paternity", "Compassionate", "Unpaid", "Other"] },
    { id: "from", label: "From", type: "date", required: true },
    { id: "to", label: "To", type: "date", required: true },
    { id: "reason", label: "Reason", type: "text" }
  ],
  beforeSave: (data, row) => { if (!row) data.status = "Pending"; if (!data.staff_name) data.staff_name = currentStaff.name; },
  columns: [
    { label: "Staff", render: r => esc(r.staff_name) },
    { label: "Type", render: r => esc(r.type || "") },
    { label: "From", num: true, render: r => fmtDate(r.from) },
    { label: "To", num: true, render: r => fmtDate(r.to) },
    { label: "Status", render: r => `<span class="status-pill ${r.status === "Approved" ? "status-ok" : "status-low"}">${esc(r.status || "Pending")}</span>`, text: r => r.status || "Pending" }
  ],
  rowActions: r => r.status === "Pending" && ["admin","manager","master"].includes(currentStaff.role)
    ? `<button class="btn btn-ghost btn-small" data-toff="${r.id}|Approved">Approve</button> <button class="btn btn-ghost btn-small" data-toff="${r.id}|Rejected">Reject</button> `
    : "",
  bindActions: (root) => {
    root.querySelectorAll("[data-toff]").forEach(btn => btn.addEventListener("click", async () => {
      const [id, status] = btn.dataset.toff.split("|");
      await updateDoc("timeoff", id, { status, decided_by: currentStaff.name });
      showToast(`Leave ${status.toLowerCase()}.`);
    }));
  }
});

const renderRecruitment = genericModule({
  title: "Recruitment", collection: "candidates",
  sub: "Open roles and candidates in the pipeline. Hired candidates convert into employee records with one click.",
  addLabel: "Add candidate",
  rowActions: r => (r.stage === "Hired" && !r.converted && ["master","admin","manager"].includes(currentStaff.role))
    ? `<button class="btn btn-ghost btn-small" data-cand-convert="${r.id}">Convert to employee</button> ` : (r.converted ? `<span class="status-pill status-ok">Employee ✓</span> ` : ""),
  bindActions: (root) => {
    root.querySelectorAll("[data-cand-convert]").forEach(btn =>
      btn.addEventListener("click", () => convertCandidateToEmployee(btn.dataset.candConvert)));
  },
  fields: [
    { id: "name", label: "Candidate name", type: "text", required: true },
    { id: "role", label: "Role applied for", type: "select", options: ["Baker", "Assistant Baker", "Sales Assistant", "Driver", "Cleaner", "Marketing", "Other"] },
    { id: "phone", label: "Phone", type: "text" },
    { id: "stage", label: "Stage", type: "select", options: ["Applied", "Interview", "Trial Day", "Offer", "Hired", "Rejected"] },
    { id: "notes", label: "Notes", type: "textarea" }
  ],
  columns: [
    { label: "Candidate", render: r => esc(r.name) },
    { label: "Role", render: r => esc(r.role || "") },
    { label: "Phone", render: r => esc(r.phone || "") },
    { label: "Stage", render: r => `<span class="status-pill ${r.stage === "Hired" ? "status-ok" : "status-low"}" style="${r.stage === "Rejected" ? "" : r.stage === "Hired" ? "" : "background:var(--gold-mute);color:#6B5D4C;"}">${esc(r.stage || "Applied")}</span>`, text: r => r.stage || "Applied" },
    { label: "Notes", render: r => esc((r.notes || "").slice(0, 60)) }
  ]
});

const renderAppraisals = genericModule({
  title: "Appraisals", collection: "appraisals",
  sub: "Staff performance reviews.",
  addLabel: "New appraisal",
  fields: [
    { id: "date", label: "Date", type: "date", required: true },
    { id: "staff_name", label: "Staff member", type: "text", required: true },
    { id: "reviewer", label: "Reviewer", type: "text" },
    { id: "rating", label: "Rating", type: "select", options: ["5 — Outstanding", "4 — Exceeds expectations", "3 — Meets expectations", "2 — Needs improvement", "1 — Unsatisfactory"] },
    { id: "strengths", label: "Strengths", type: "textarea" },
    { id: "improvements", label: "Areas to improve", type: "textarea" },
    { id: "goals", label: "Goals for next period", type: "textarea" }
  ],
  beforeSave: (data) => { if (!data.reviewer) data.reviewer = currentStaff.name; },
  columns: [
    { label: "Date", num: true, render: r => fmtDate(r.date) },
    { label: "Staff", render: r => esc(r.staff_name) },
    { label: "Reviewer", render: r => esc(r.reviewer || "") },
    { label: "Rating", render: r => esc(r.rating || "") },
    { label: "Goals", render: r => esc((r.goals || "").slice(0, 60)) }
  ]
});

const renderSMSMarketing = genericModule({
  title: "SMS Marketing", collection: "sms_campaigns",
  sub: "SMS blasts to customers. Compose here, send through your SMS provider or phone.",
  addLabel: "New SMS campaign",
  fields: [
    { id: "date", label: "Date", type: "date", required: true },
    { id: "name", label: "Campaign name", type: "text", required: true },
    { id: "audience", label: "Audience", type: "text" },
    { id: "message", label: "Message (keep under 160 chars)", type: "textarea", required: true },
    { id: "status", label: "Status", type: "select", options: ["Draft", "Sent"] }
  ],
  columns: [
    { label: "Date", num: true, render: r => fmtDate(r.date) },
    { label: "Campaign", render: r => esc(r.name) },
    { label: "Audience", render: r => esc(r.audience || "") },
    { label: "Message", render: r => `${esc((r.message || "").slice(0, 70))}<br><small>${(r.message || "").length} chars</small>`, text: r => r.message || "" },
    { label: "Status", render: r => `<span class="status-pill ${r.status === "Sent" ? "status-ok" : "status-low"}">${esc(r.status || "Draft")}</span>`, text: r => r.status || "Draft" }
  ],
  rowActions: r => `<a class="btn btn-ghost btn-small" href="sms:?body=${encodeURIComponent(r.message || "")}">Open in SMS</a> `
});

const renderEmailMarketing = genericModule({
  title: "Email Marketing", collection: "email_campaigns",
  sub: "Email campaigns. Compose here, send from your mail account or provider.",
  addLabel: "New email campaign",
  fields: [
    { id: "date", label: "Date", type: "date", required: true },
    { id: "name", label: "Campaign name", type: "text", required: true },
    { id: "subject", label: "Subject line", type: "text", required: true },
    { id: "audience", label: "Audience", type: "text" },
    { id: "body", label: "Email body", type: "textarea", required: true },
    { id: "status", label: "Status", type: "select", options: ["Draft", "Sent"] }
  ],
  columns: [
    { label: "Date", num: true, render: r => fmtDate(r.date) },
    { label: "Campaign", render: r => esc(r.name) },
    { label: "Subject", render: r => esc(r.subject || "") },
    { label: "Audience", render: r => esc(r.audience || "") },
    { label: "Status", render: r => `<span class="status-pill ${r.status === "Sent" ? "status-ok" : "status-low"}">${esc(r.status || "Draft")}</span>`, text: r => r.status || "Draft" }
  ],
  rowActions: r => `<a class="btn btn-ghost btn-small" href="mailto:?subject=${encodeURIComponent(r.subject || "")}&body=${encodeURIComponent(r.body || "")}">Open in Mail</a> `
});


/* expose generic-module renderers globally for app.js routing */
window.renderEquity = renderEquity;
window.renderESG = renderESG;
window.renderQuality = renderQuality;
window.renderFleet = renderFleet;
window.renderDocuments = renderDocuments;
window.renderTimesheets = renderTimesheets;
window.renderHelpdesk = renderHelpdesk;
window.renderApprovals = renderApprovals;
window.renderTimeOff = renderTimeOff;
window.renderRecruitment = renderRecruitment;
window.renderAppraisals = renderAppraisals;
window.renderSMSMarketing = renderSMSMarketing;
window.renderEmailMarketing = renderEmailMarketing;
