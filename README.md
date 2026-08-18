# Prototype Hosting (Lite)

Password-gated hosting for coded prototypes (small React/Vite apps, static
HTML, etc.) shared with external user-testing groups — built entirely on
**GitHub Pages + GitHub Actions**. No server, no AWS, no DNS. Everything is
operated by clicking buttons on the dashboard.

**Dashboard:** https://benjamincoughlin.github.io/prototype-hosting-lite/

## Important: this is soft security, not real access control

GitHub Pages only serves static files — there is no server to enforce a
password or an expiration date. The gate on every prototype is
**client-side JavaScript**: it keeps out casual and accidental visitors
(the same practical bar as a shared Figma link + password), but it does
**not** stop a technically determined person from getting in — anyone can
view page source, read `config.json`, or otherwise bypass it. Every repo
here is also **public** (required for GitHub Pages on a free account),
so build output and hashed (never plaintext) passwords are technically
visible to anyone who goes looking.

**Never put real customer data, credentials, or anything actually
sensitive into a prototype hosted here.**

## How it works

1. A GitHub Actions workflow (`.github/workflows/build-prototype.yml`)
   clones an admin-submitted repo, detects its framework (Vite / CRA /
   Next.js static export / plain static HTML — see
   `scripts/detect-and-build.js`), builds it, and commits the output under
   `docs/p/<slug>/app/`.
2. A small gate page (`docs/p/<slug>/index.html`) loads first: checks
   `config.json` for an expiration date, then a password form (SHA-256,
   salted, checked entirely in the browser) before redirecting into
   `app/`.
3. `docs/prototypes.json` is the manifest of all prototypes and their
   status, read by the admin dashboard.

## Repo layout

- `docs/` — served by GitHub Pages (Settings → Pages → source: `main`
  branch, `/docs` folder).
- `docs/index.html` — the admin dashboard.
- `docs/p/<slug>/` — generated per prototype by the build workflow; not
  hand-edited.
- `scripts/detect-and-build.js` — framework detection + build.
- `scripts/assemble-prototype.js` — assembles the gate page + built app +
  config into `docs/p/<slug>/`.
- `scripts/update-manifest.js` — updates `docs/prototypes.json`.
- `.github/workflows/build-prototype.yml` — the build pipeline.

## Using the admin dashboard

The dashboard calls GitHub's API directly from your browser using a
**fine-grained Personal Access Token** scoped to just this repo:

1. GitHub → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token.
2. Repository access: **Only select repositories** → this repo.
3. Permissions: **Contents: Read and write**, **Actions: Read and write**.
   Nothing else.
4. Paste the token into the dashboard when prompted — it's stored only in
   your browser's local storage, never sent anywhere but GitHub's API.

Once connected, the dashboard lets you:

- **Add prototype** — repo URL, slug, password, optional expiration. This
  triggers the build workflow and polls until it's live.
- **Password** — set a new password for an existing prototype (updates
  `config.json` directly, no rebuild needed).
- **Expiry** — set or clear a prototype's expiration date.
- **Take down / Reactivate** — immediately blocks/restores access (the
  gate page checks this before showing the password form).
- **Redeploy** — rebuilds from the repo's latest commit, keeping the same
  password.

## Status

Built and verified end-to-end (build pipeline, gate page — including
wrong-password rejection, correct-password unlock, expiration blocking
access even with a prior unlock, and unlock state never leaking between
different prototypes' slugs) against a real test repo. The dashboard's
list view and error handling are verified; the authenticated "connect
token" and "add prototype" flows need a live pass with a real PAT (can't
be tested by an agent without exposing a real credential) — see the steps
above.
