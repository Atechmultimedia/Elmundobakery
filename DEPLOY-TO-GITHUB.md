# Deploying El Mundo Bakery to GitHub Pages

No command line needed. This uses GitHub Desktop (the app), which is the
easiest route when you're not comfortable in a terminal.

Your files are already set up correctly:
- `index.html` sends visitors to your storefront (`home.html`)
- `app.html` is the management system (staff log in to reach it)
- All paths are relative, so it works from a GitHub subpage
- `.nojekyll` is included so GitHub doesn't strip anything

---

## STEP 1 — Make a GitHub account and repository

1. Go to https://github.com and sign up (free) if you don't have an account.
2. Click the **+** top-right -> **New repository**.
3. Name it something like `elmundo-bakery`.
4. Set it to **Public** (GitHub Pages is free only for public repos on the free plan).
5. Do NOT tick "Add a README". Leave it empty.
6. Click **Create repository**.

## STEP 2 — Install GitHub Desktop

1. Download from https://desktop.github.com and install it.
2. Open it and sign in with your GitHub account.

## STEP 3 — Put your files in the repository

1. In GitHub Desktop: **File -> Clone repository -> ** pick `elmundo-bakery` -> **Clone**.
   Remember the folder it saves to (e.g. Documents\GitHub\elmundo-bakery).
2. Unzip `elmundo-bakery.zip`.
3. Copy EVERYTHING from inside the unzipped folder into the cloned folder —
   `index.html`, `app.html`, `home.html`, the `js` folder, the `assets` folder,
   `.nojekyll`, all of it.
4. Back in GitHub Desktop you'll see all the files listed as changes.
5. Bottom-left: type a summary like "First upload" and click **Commit to main**.
6. Top: click **Push origin**.

## STEP 4 — Turn on GitHub Pages

1. On github.com, open your repository -> **Settings** -> **Pages** (left menu).
2. Under "Build and deployment", Source: **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)**. Click **Save**.
4. Wait 1-2 minutes. The page will show your live address:
   `https://YOUR-USERNAME.github.io/elmundo-bakery/`

That address is your storefront. The management app is at:
   `https://YOUR-USERNAME.github.io/elmundo-bakery/app.html`

---

## STEP 5 — CRITICAL: two Firebase settings, or you'll be locked out

Your app talks to Firebase. Firebase must be told to trust the new address,
and your database rules must be published, or nothing will save.

### 5a. Authorise the GitHub domain (or login fails)
1. Go to https://console.firebase.google.com -> your project **el-mundo-e976f**.
2. **Build -> Authentication -> Settings -> Authorized domains**.
3. Click **Add domain** and add:  `YOUR-USERNAME.github.io`
   (just the domain, no https://, no path)
4. Save.

### 5b. Publish your database rules (or saving fails)
1. Firebase Console -> **Build -> Firestore Database -> Rules** tab.
2. Open the file `firestore.rules` from your project, copy ALL of it.
3. Paste it over what's there, replacing everything.
4. Click **Publish**. Wait for "Rules published".

This is the step that's been outstanding — it also switches on shared
settings, staff advances, and stock-movement deletes.

---

## STEP 6 — Before you let real staff in

- In `home.html`, `robots.txt` and `sitemap.xml`, replace any
  `YOUR-DOMAIN-HERE` with your real github.io address.
- Log in as master admin, download a backup, then **clear all test data**.
- Set real ingredient costs and real staff PINs.
- Fix Premium Sugar Bread's yield unit; check the water pack size.

## Updating the site later

Any time you change files: copy the new files into the cloned folder,
then in GitHub Desktop **Commit** -> **Push origin**. The live site updates
in about a minute. Tell staff to hard-refresh (Ctrl+Shift+R).

## A note on your API key
Your Firebase apiKey sits in `js/firebase-config.js` and will be visible in
the public repo. That's normal and expected for Firebase web apps — the key
only identifies your project. Your real protection is the Firestore rules
(who can read/write) and Authentication (who can log in), which is why
publishing the rules in Step 5b matters.
