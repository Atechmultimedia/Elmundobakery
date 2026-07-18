/* ============================================================
   Auth + roles
   ============================================================ */

const ROLES = ["master", "admin", "manager", "finance_manager", "hr_manager", "production_manager", "sales_manager", "cashier", "baker", "delivery", "marketing", "finance"];
// "manager" = General Manager (broad oversight). The *_manager roles are department
// managers: same authority as a manager but limited to their own department's modules.

// Which nav modules each role can see. admin & manager see everything.
const MODULE_ACCESS = {
  dashboard:  ["admin", "manager", "cashier", "baker", "delivery", "marketing", "finance"],
  sales:      ["admin", "manager", "cashier"],
  inventory:  ["admin", "manager", "baker"],
  recipes:    ["admin", "manager", "baker"],
  production: ["admin", "manager", "baker"],
  suppliers:  ["admin", "manager", "finance"],
  staff:      ["admin"],
  employees:  ["admin", "manager"],
  scheduling: ["admin", "manager"],
  payroll:    ["admin", "manager", "finance"],
  finance:    ["admin", "manager", "finance"],
  delivery:   ["admin", "manager", "delivery", "cashier"],
  marketing:  ["admin", "manager", "marketing"],
  assets:     ["admin", "manager", "finance"],
  vendordebts:["admin", "manager", "finance", "cashier"],
  waste:      ["admin", "manager", "baker", "cashier"],
  cashrecon:  ["admin", "manager", "finance", "cashier"],
  transfers:  ["admin", "manager", "finance"],
  ecommerce:  ["admin", "manager", "cashier"],
  salestracker: ["admin", "manager", "finance", "cashier"],
  crm:        ["admin", "manager", "marketing", "cashier"],
  invoicing:  ["admin", "manager", "finance", "cashier"],
  equity:     ["admin", "manager", "finance"],
  esg:        ["admin", "manager", "finance", "marketing"],
  sign:       ["admin", "manager", "cashier", "baker", "delivery", "marketing", "finance"],
  timesheets: ["admin", "manager", "cashier", "baker", "delivery", "marketing", "finance"],
  helpdesk:   ["admin", "manager", "cashier", "baker", "delivery", "marketing", "finance"],
  quality:    ["admin", "manager", "baker"],
  planning:   ["admin", "manager", "baker", "finance"],
  maintenance:["admin", "manager", "finance", "baker"],
  attendance: ["admin", "manager", "cashier", "baker", "delivery", "marketing", "finance"],
  timeoff:    ["admin", "manager", "cashier", "baker", "delivery", "marketing", "finance"],
  recruitment:["admin", "manager"],
  appraisals: ["admin", "manager"],
  fleet:      ["admin", "manager", "delivery", "finance"],
  smsmarketing: ["admin", "manager", "marketing"],
  emailmarketing: ["admin", "manager", "marketing"],
  documents:  ["admin", "manager", "finance"],
  approvals:  ["admin", "manager", "cashier", "baker", "delivery", "marketing", "finance"],
  adminmonitor: ["admin"],
  accounting: ["admin", "manager", "finance"],
  ledger:     ["admin", "manager", "finance"],
  balancesheet: ["admin", "manager", "finance"],
  breakeven:  ["admin", "manager", "finance"],
  cashflow:   ["admin", "manager", "finance"],
  customers:  ["admin", "manager", "cashier", "marketing"],
  settings:   ["admin"],
  backup:     ["admin"]
};

// ---- Department manager access ----
// Each department manager sees only their department's modules (plus the shared
// dashboard and common staff tools). This grants scoped authority without full access.
const DEPARTMENT_MANAGER_MODULES = {
  finance_manager: ["dashboard", "finance", "accounting", "ledger", "balancesheet",
    "breakeven", "cashflow", "payroll", "expenses", "assets", "vendordebts",
    "cashrecon", "transfers", "equity", "invoicing", "suppliers", "salestracker",
    "documents", "sign", "helpdesk", "approvals", "attendance"],
  hr_manager: ["dashboard", "employees", "staff", "scheduling", "recruitment",
    "appraisals", "attendance", "timeoff", "timesheets", "payroll", "documents",
    "sign", "helpdesk", "approvals"],
  production_manager: ["dashboard", "inventory", "recipes", "production", "planning",
    "quality", "waste", "maintenance", "suppliers", "sign", "helpdesk", "approvals",
    "attendance", "timesheets"],
  sales_manager: ["dashboard", "sales", "salestracker", "ecommerce", "customers",
    "crm", "invoicing", "delivery", "marketing", "sign", "helpdesk", "approvals",
    "attendance", "timesheets"]
};
// Inject department managers into the access map for their allowed modules.
Object.keys(DEPARTMENT_MANAGER_MODULES).forEach(mgrRole => {
  DEPARTMENT_MANAGER_MODULES[mgrRole].forEach(mod => {
    if (MODULE_ACCESS[mod] && !MODULE_ACCESS[mod].includes(mgrRole)) {
      MODULE_ACCESS[mod].push(mgrRole);
    }
  });
});

let currentUser = null;   // firebase auth user
let currentStaff = null;  // matching Firestore staff doc {id, name, role, ...}

function canAccess(moduleKey) {
  if (!currentStaff) return false;
  if (currentStaff.role === "master") return true; // master admin sees everything
  const allowed = MODULE_ACCESS[moduleKey] || [];
  return allowed.includes(currentStaff.role);
}

function initAuth(onReady) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      currentUser = null;
      currentStaff = null;
      window.location.href = "login.html";
      return;
    }
    currentUser = user;
    try {
      const doc = await db.collection("staff").doc(user.uid).get();
      if (!doc.exists) {
        showLoginError("Your account isn't linked to a staff profile yet. Ask an admin to add you under Staff.");
        await auth.signOut();
        return;
      }
      currentStaff = { id: doc.id, ...doc.data() };
      if (currentStaff.active === false) {
        showLoginError("This staff account has been deactivated.");
        await auth.signOut();
        return;
      }
      onReady(currentStaff);
    } catch (err) {
      console.error(err);
      showLoginError("Could not load your staff profile. Check your connection and try again.");
    }
  });
}

function showLoginError(msg) {
  const el = document.getElementById("loginError");
  if (el) { el.textContent = msg; el.style.display = "block"; }
  else alert(msg);
}

function handleLogout() {
  auth.signOut();
}
