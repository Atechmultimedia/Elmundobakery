/* ============================================================
   App shell — grouped ERP navigation, routing, boot
   ============================================================ */

const NAV_GROUPS = [
  { label: "Overview", items: [
    { key: "dashboard",  label: "Dashboard" }
  ]},
  { label: "Sales", items: [
    { key: "sales",      label: "Point of Sale" },
    { key: "salestracker", label: "Sales Tracker" },
    { key: "ecommerce",  label: "eCommerce Orders" },
    { key: "crm",        label: "CRM" },
    { key: "customers",  label: "Customers & Loyalty" },
    { key: "invoicing",  label: "Invoicing & Receipts" },
    { key: "delivery",   label: "Delivery" }
  ]},
  { label: "Finance", items: [
    { key: "accounting", label: "Profit & Loss" },
    { key: "ledger",     label: "General Ledger" },
    { key: "balancesheet", label: "Balance Sheet" },
    { key: "breakeven",  label: "Break-even" },
    { key: "cashflow",   label: "Cash Flow" },
    { key: "finance",    label: "Expenses & Channels" },
    { key: "assets",     label: "Assets" },
    { key: "equity",     label: "Equity" },
    { key: "esg",        label: "ESG" },
    { key: "vendordebts",label: "Vendor Debts" },
    { key: "cashrecon",  label: "Cash Reconciliation" },
    { key: "transfers",  label: "Money Transfers" },
    { key: "sign",       label: "Sign" }
  ]},
  { label: "Services", items: [
    { key: "timesheets", label: "Timesheets" },
    { key: "helpdesk",   label: "Help Desk" }
  ]},
  { label: "Supply Chain", items: [
    { key: "inventory",  label: "Inventory" },
    { key: "recipes",    label: "Recipes & Costing" },
    { key: "planning",   label: "Production Planning" },
    { key: "production", label: "Manufacturing" },
    { key: "suppliers",  label: "Purchase" },
    { key: "quality",    label: "Quality" },
    { key: "maintenance",label: "Maintenance & Repair" },
    { key: "waste",      label: "Waste Tracker" }
  ]},
  { label: "HR", items: [
    { key: "employees",  label: "Employees" },
    { key: "attendance", label: "Attendance" },
    { key: "scheduling", label: "Scheduling" },
    { key: "timeoff",    label: "Time Off" },
    { key: "recruitment",label: "Recruitment" },
    { key: "appraisals", label: "Appraisals" },
    { key: "fleet",      label: "Fleet" },
    { key: "payroll",    label: "Payroll" }
  ]},
  { label: "Marketing", items: [
    { key: "marketing",  label: "Social Media Marketing" },
    { key: "smsmarketing", label: "SMS Marketing" },
    { key: "emailmarketing", label: "Email Marketing" }
  ]},
  { label: "Productivity", items: [
    { key: "documents",  label: "Documents" },
    { key: "approvals",  label: "Approvals" }
  ]},
  { label: "Admin", items: [
    { key: "staff",      label: "System Accounts" },
    { key: "settings",   label: "Settings" },
    { key: "backup",     label: "Backup & Restore" },
    { key: "adminmonitor", label: "Admin Monitor" }
  ]}
];

const RENDERERS = {
  dashboard:  () => renderDashboard(),
  sales:      () => renderSales(),
  salestracker: () => renderSalesTracker(),
  ecommerce:  () => renderEcommerce(),
  crm:        () => renderCRM(),
  invoicing:  () => renderInvoicing(),
  delivery:   () => renderDelivery(),
  finance:    () => renderFinance(),
  accounting: () => renderAccounting(),
  ledger:     () => renderLedger(),
  balancesheet: () => renderBalanceSheet(),
  breakeven:  () => renderBreakeven(),
  cashflow:   () => renderCashflow(),
  customers:  () => renderCustomers(),
  settings:   () => renderSettings(),
  backup:     () => renderBackup(),
  assets:     () => renderAssets(),
  equity:     () => renderEquity(),
  esg:        () => renderESG(),
  vendordebts:() => renderVendorDebts(),
  cashrecon:  () => renderCashRecon(),
  transfers:  () => renderTransfers(),
  sign:       () => renderSign(),
  timesheets: () => renderTimesheets(),
  helpdesk:   () => renderHelpdesk(),
  inventory:  () => renderInventory(),
  recipes:    () => renderRecipes(),
  planning:   () => renderPlanning(),
  production: () => renderProduction(),
  suppliers:  () => renderSuppliers(),
  quality:    () => renderQuality(),
  maintenance:() => renderAssets(),
  waste:      () => renderWaste(),
  staff:      () => renderStaff(),
  employees:  () => renderEmployees(),
  attendance: () => renderAttendance(),
  scheduling: () => renderScheduling(),
  timeoff:    () => renderTimeOff(),
  recruitment:() => renderRecruitment(),
  appraisals: () => renderAppraisals(),
  fleet:      () => renderFleet(),
  payroll:    () => renderPayroll(),
  marketing:  () => renderMarketing(),
  smsmarketing: () => renderSMSMarketing(),
  emailmarketing: () => renderEmailMarketing(),
  documents:  () => renderDocuments(),
  approvals:  () => renderApprovals(),
  adminmonitor: () => renderAdminMonitor()
};

let activeModule = "dashboard";

function buildNav() {
  const nav = document.getElementById("sideNav");
  let firstVisible = null;
  nav.innerHTML = NAV_GROUPS.map(group => {
    const items = group.items.filter(item => canAccess(item.key));
    if (!items.length) return "";
    if (!firstVisible) firstVisible = items[0].key;
    return `
      <div class="nav-group">
        <div class="nav-group-label">${group.label}</div>
        ${items.map(item => `
          <button class="nav-item${item.key === activeModule ? " is-active" : ""}" data-module="${item.key}">
            ${item.label}
          </button>
        `).join("")}
      </div>
    `;
  }).join("");
  nav.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => goTo(btn.dataset.module));
  });
  if (!canAccess(activeModule) && firstVisible) activeModule = firstVisible;
}

function goTo(moduleKey) {
  if (!canAccess(moduleKey)) return;
  activeModule = moduleKey;
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.module === moduleKey);
  });
  render();
}

function render() {
  const container = document.getElementById("moduleContent");
  const fn = RENDERERS[activeModule];
  if (fn) fn(container);
}

const rerender = debounce(() => render(), 150);

function initCurrency() {
  const sel = document.getElementById("currencySelect");
  if (!sel) return;
  sel.value = getCurrencySettings().current;
  sel.addEventListener("change", () => {
    const cfg = getCurrencySettings();
    if (sel.value === "__rates") {
      const usd = prompt("Rate: 1 GHS = ? USD", cfg.rates.USD);
      if (usd !== null && Number(usd) > 0) cfg.rates.USD = Number(usd);
      const gbp = prompt("Rate: 1 GHS = ? GBP", cfg.rates.GBP);
      if (gbp !== null && Number(gbp) > 0) cfg.rates.GBP = Number(gbp);
      sel.value = cfg.current;
    } else {
      cfg.current = sel.value;
    }
    setCurrencySettings(cfg);
    render();
    showToast("Showing amounts in " + cfg.current + ".");
  });
}

function initUserChrome() {
  initCurrency();
  document.getElementById("userName").textContent = currentStaff.name;
  document.getElementById("userRole").textContent = currentStaff.role === "master" ? "master admin" : currentStaff.role;
  document.getElementById("todayDate").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
}

document.addEventListener("DOMContentLoaded", () => {
  initAuth((staff) => {
    initUserChrome();
    buildNav();
    window.onStoreChange = rerender;
    startListeners(() => {
      document.getElementById("appLoading").style.display = "none";
      document.getElementById("appShell").style.display = "grid";
      render();
      migrateAccountsToEmployees(); // silent, one-time per new account
      syncClockPins();               // keep the online clock page's PIN list current
    });
  });
});
