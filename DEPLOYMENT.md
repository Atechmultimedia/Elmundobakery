# El Mundo Bakery — Deployment Guide

This covers testing on **GitHub Pages** now, and moving to **Hostinger** later.

---

## PART A — Test on GitHub Pages (free, quick)

GitHub Pages serves your site online for free. It runs everything EXCEPT PHP,
so online card payment verification and the AI recipe proxy won't work here —
but the whole app, login, database, homepage, and WhatsApp ordering will.

### Steps
1. Go to https://github.com and sign in (or create a free account).
2. Click **New repository**. Name it e.g. `elmundo-bakery`. Set it to **Public**. Create it.
3. On the new repo page, click **"uploading an existing file"**.
4. Extract the ZIP on your computer, then drag ALL the files and folders
   (home.html, index.html, the `js` folder, `assets` folder, etc.) into the upload area.
   - Note: the `.htaccess` file may be hidden on your computer — it's fine if it
     doesn't upload; GitHub Pages ignores it anyway (it's only for Hostinger).
5. Click **Commit changes**.
6. Go to **Settings** (top of repo) → **Pages** (left menu).
7. Under "Source", pick **Deploy from a branch**, choose branch **main**, folder **/(root)**, Save.
8. Wait 1–2 minutes. Your site appears at:
   `https://YOUR-GITHUB-USERNAME.github.io/elmundo-bakery/home.html`

### IMPORTANT — authorize the GitHub domain in Firebase
Before login will work on GitHub Pages, add the domain to Firebase:
1. Firebase Console → **Authentication → Settings → Authorized domains**.
2. Click **Add domain** and enter:  `YOUR-GITHUB-USERNAME.github.io`
3. Save.

Now open `.../home.html` — the public site. To reach the app, use the hidden
dot in the footer, or go straight to `.../login.html`.

---

## PART B — Go live on Hostinger (when ready)

Hostinger runs PHP, so online payments and the AI proxy work here.

### Steps
1. Log into Hostinger → **hPanel** → your website → **File Manager**.
2. Open the **public_html** folder.
3. Upload the ZIP into public_html, then **Extract** it there.
   - Make sure the files land directly in public_html (not in a subfolder).
   - Include the hidden `.htaccess` file (enable "show hidden files" in File Manager).
4. Visit your domain — `home.html` loads as the homepage (thanks to `.htaccess`).

### Firebase for your live domain
1. Firebase Console → **Authentication → Settings → Authorized domains** →
   **Add domain** → your real domain (e.g. `elmundobakery.com`). Save.

### Turn on online payments (Hostinger only)
1. Open `paystack-verify.php`, paste your Paystack **Secret key**, save.
2. In `home.html`, set your Paystack **Public key** and the verify URL:
   `const PAYSTACK_VERIFY_URL = "https://yourdomain.com/paystack-verify.php";`

---

## Before-you-launch checklist (replace placeholders)

Search these files for `YOUR-DOMAIN-HERE` and replace with your real domain:
- `robots.txt`  (the Sitemap line)
- `sitemap.xml` (both URLs)
- `home.html`   (the canonical link tag)

Other one-time setup:
- Publish your latest `firestore.rules` in Firebase (Firestore → Rules → Publish).
- Enter real costing figures, Paystack keys (if using payments), and employee PINs.
- Submit `sitemap.xml` to Google Search Console for search visibility.

---

## What works where

| Feature                         | GitHub Pages | Hostinger |
|---------------------------------|:-----------:|:---------:|
| Public homepage + SEO           |     Yes     |    Yes    |
| Management app + login (Firebase)|    Yes     |    Yes    |
| Inventory, recipes, staff, etc. |     Yes     |    Yes    |
| WhatsApp ordering               |     Yes     |    Yes    |
| Online card payment (Paystack)  |   No (PHP)  |    Yes    |
| AI recipe proxy                 |   No (PHP)  |    Yes    |
