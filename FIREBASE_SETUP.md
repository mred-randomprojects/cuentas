# Firebase Setup

`cuentas` uses the same Firebase pattern as `nutriapp`, `dineros`, and
`candito-tool`:

- Google authentication for sign-in (no in-app registration — you decide who
  gets in via the allowlist).
- Cloud Firestore document per user at `users/{uid}/data/appData`.
- Local-first persistence: `localStorage` is the immediate local copy, and the
  first sign-in merges localStorage + Firestore and writes the merged data back.

Access is controlled in **two places that must stay in sync**:

1. `VITE_ALLOWED_EMAILS` — client-side gate (shows a "no access" screen for
   anyone not listed).
2. `firestore.rules` `allowedEmails()` — the real server-side gate.

## 1. Create Or Select The Firebase Project

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (or reuse an existing one).
3. Analytics is optional.

## 2. Register The Web App

1. In the project overview, click the Web app icon (`</>`).
2. App nickname: `cuentas`.
3. Do **not** enable Firebase Hosting (we deploy via GitHub Pages).
4. Click **Register app**.
5. Copy the config values into a local `.env` file (use `.env.example` as the
   template):

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ALLOWED_EMAILS=you@gmail.com,otra.persona@gmail.com
```

These Firebase values are **safe to expose** — security comes from the
Firestore rules, the authorized domains, and the email allowlist.

## 3. Enable Google Authentication

1. Go to **Build > Authentication > Get started**.
2. Open **Sign-in method**.
3. Enable **Google**, pick a support email, and **Save**.

> There is intentionally no "create account" flow in the app. To give someone
> access you add their Google email to the allowlist (steps 6 and 7). They sign
> in with their own Google account; nobody can self-register.

## 4. Add Authorized Domains

In **Authentication > Settings > Authorized domains**, make sure these exist:

- `localhost`
- `127.0.0.1`
- `mred-randomprojects.github.io`

Add only the hostname, not the full URL. The production app URL is expected to
be:

```text
https://mred-randomprojects.github.io/cuentas/
```

## 5. Create Firestore

1. Go to **Build > Firestore Database > Create database**.
2. Choose **Production mode**.
3. Pick the closest region (you usually cannot change this later).

## 6. Publish Security Rules

1. In **Firestore Database > Rules**, paste the contents of
   [`firestore.rules`](./firestore.rules).
2. Edit the `allowedEmails()` list so it contains exactly the Google accounts
   that should have access.
3. Click **Publish**.

The key rule:

```js
match /users/{userId}/{document=**} {
  allow read, write: if isAllowedUser() && request.auth.uid == userId;
}
```

Each allowlisted user can read and write **only their own** data.

## 7. Add GitHub Actions Secrets

Because the app builds in CI, the Vite env vars must exist in GitHub Actions.

1. Open the GitHub repo > **Settings > Secrets and variables > Actions**.
2. Add these repository secrets (same values as your local `.env`):

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ALLOWED_EMAILS
```

The deploy workflow already passes these into `npm run build`.

## 8. Enable GitHub Pages

1. Repo > **Settings > Pages**.
2. **Build and deployment > Source: GitHub Actions**.
3. Push to `main` (or run the workflow manually) and the site deploys to
   `https://mred-randomprojects.github.io/cuentas/`.

> The repo must be named `cuentas` for the Vite `base: "/cuentas/"` path to
> match. If you use a different repo name, update `base` in `vite.config.ts`.

## 9. Adding Or Removing People Later

To grant access to a new person:

1. Add their Google email to `allowedEmails()` in `firestore.rules` and
   **Publish**.
2. Add the same email to the `VITE_ALLOWED_EMAILS` GitHub secret.
3. Re-run the deploy workflow.

To revoke access, remove the email from both places and re-deploy / re-publish.

> Reminder: the "people" you add **inside** the app (your household list) are
> not accounts — they are just names the expenses get split between.
