# El Mundo Bakery — Management System + Website

**Public site:** `home.html` — a customer-facing homepage built from your
flyer: "Freshly Baked Daily", "Our Goodness in Everyday Bite", the
Bread / Pastries / Doughnuts & More lineup, contact 0556492858 with
click-to-call and WhatsApp links, and @elmundobakery social links
(Facebook, Instagram, TikTok). It has SEO meta tags, Open Graph, and
Schema.org Bakery JSON-LD built in. There's a discreet "Staff login"
link in its footer.

**Photos:** the homepage has image slots that look for your own photos
in the `assets/` folder — `assets/hero.jpg` (big hero shot),
`assets/bread.jpg`, `assets/pastries.jpg`, and `assets/doughnuts.jpg`.
Until you add them it falls back to showing your logo, so nothing looks
broken. Drop in your own photos (like the ones from your flyer shoot)
with those exact names and they'll appear automatically. The logo lives
at `assets/logo.png`.

**Staff system:** everything below is the internal management app —
sales/POS, inventory, recipes, production, delivery, staff scheduling,
payroll, finance (P&L), suppliers & purchasing, and marketing — all
sharing live data between staff.

Vanilla HTML/CSS/JS, no build step, no npm. Backend is Firebase
(Authentication + Firestore), so it deploys straight to Hostinger like
your other sites.

## 1. Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Once created, go to **Build → Authentication → Get started → Sign-in method** and enable **Email/Password**.
3. Go to **Build → Firestore Database → Create database** → start in **Production mode**, pick a region close to Ghana (e.g. `eur3` or `europe-west`).
4. Go to **Project settings → General → Your apps → Add app → Web (`</>`)**. Register the app (nickname doesn't matter, you don't need Firebase Hosting). Copy the `firebaseConfig` object it gives you.

## 2. Connect the app to your project

Open `js/firebase-config.js` and paste your config values in place of the
`PASTE_YOUR_...` placeholders.

## 3. Apply the security rules

In the Firebase Console, go to **Firestore Database → Rules**, and paste
in the contents of `firestore.rules` from this folder, then **Publish**.
These rules make sure only the right roles can write to sensitive
collections like Payroll, Finance, and Staff.

## 4. Create your admin account

Upload the folder to Hostinger (or open it locally), then visit
**`setup.html`** in the browser. Fill in your name, email, and a
password — this creates your admin login and, if you leave the checkbox
on, loads two sample products so the app isn't empty on day one.

**Once you've done this, delete `setup.html` from the server** (or at
least rename it) so no one else can use it to create another admin.

## 5. Sign in and add your team

Go to `login.html`, sign in with the account you just created, and use
the **Staff** module to add cashiers, bakers, delivery drivers, and
anyone else — each gets their own login and only sees the sections
relevant to their role:

| Role | Sees |
|---|---|
| admin / manager | everything |
| cashier | dashboard, sales, delivery |
| baker | dashboard, inventory, recipes, production |
| delivery | dashboard, delivery |
| finance | dashboard, suppliers, payroll, finance |
| marketing | dashboard, marketing |

## 6. Authorized domains

If you host this on your own domain (e.g. `app.elmundobakery.com`), add
that domain under **Authentication → Settings → Authorized domains** in
the Firebase Console, or sign-in will be blocked.

## How the numbers connect

- **Production** deducts raw ingredient stock and adds to a product's
  finished stock.
- **Sales** deducts finished stock and records revenue, using each
  product's ingredient cost *at the time of sale* as COGS.
- **Purchase orders**, once marked received, add ingredient stock back
  and automatically log a "Supplies" expense.
- **Payroll**, once posted, logs a "Payroll" expense for that period.
- **Finance** pulls all of the above into a live Revenue → COGS → Gross
  Profit → Expenses → Net Profit statement for any date range.

## Notes / next steps

- Currency is shown as GHS throughout — search-and-replace `"GHS "` in
  `js/utils.js` (`fmtMoney`) if you want a different display, or extend
  it into a proper multi-currency picker like your other platform.
- Paystack isn't wired in yet — Sales currently records payment method
  as a label (Cash / Mobile Money / Card) rather than taking a live
  payment. Say the word if you want real Paystack checkout added for
  online or in-store card payments.
- The Marketing module drafts promo copy from a campaign's details; it
  doesn't design flyer graphics. Your existing Flyer Designer /
  Proposal Generator platform is a natural place to plug that in later.
- Everything listens live via Firestore `onSnapshot`, so two staff
  members working at once always see the same numbers without
  refreshing.
