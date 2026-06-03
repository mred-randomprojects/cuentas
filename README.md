# cuentas

Small web app to track a shared household "pot" (pozo): money people put in
(_entradas_) and purchases split between them (_compras_), with live balances
and a shareable report.

- **Stack:** Vite + React + TypeScript + Tailwind, Firebase (Google auth +
  Firestore), deployed to GitHub Pages via GitHub Actions.
- **Access:** sign in with Google; only allowlisted emails get in (no
  self-registration). Each account has its own private, synced data.
- **The household "people"** added inside the app are just names the expenses
  are split between — they are **not** login accounts.

## Develop

```bash
npm install
cp .env.example .env   # fill in your Firebase values + allowed emails
npm run dev
```

- `npm run build` — type-check + production build
- `npm run lint` — ESLint
- `npm run preview` — preview the production build

## Features

- **Resumen** — pool total, entradas/compras totals, per-person balances, and
  who still owes. Click a person to open their detail.
- **Personas** — manage the household list; click a person to see their
  entradas, the compras they took part in, and their balance.
- **Reporte** — a WhatsApp-ready text report, filterable by all time, a single
  month, or a custom date range; copy or download as `.txt`.
- Add/edit movements happen in a dialog (not inline at the top of the page).
- Data is stored locally and synced to Firestore per account.

## Deploy & Firebase

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for the full Firebase + GitHub
Pages setup, including the email allowlist (kept in sync between
`VITE_ALLOWED_EMAILS` and `firestore.rules`).

Pushes to `main` build and deploy automatically to
`https://mred-randomprojects.github.io/cuentas/`.

## Legacy

The original single-file version is kept as
[`index.legacy.html`](./index.legacy.html) for reference.
