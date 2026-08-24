# cuentas

Small web app to track a shared household "pot" (pozo): money people put in
(_entradas_) and expenses/services split between them (_gastos_), with live balances
and a shareable report.

Expenses can be paid either from the shared pool or directly by one person. A
directly paid expense is stored atomically: it credits the payer, charges the
selected participants, and leaves the physical pool unchanged. When the pool
drifts from the real account balance, an *ajuste* re-syncs it without altering
anybody's balance.

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
- `npm test` — accounting invariant tests
- `npm run preview` — preview the production build

## Features

- **Resumen** — pool total, entradas/gastos totals, per-person balances, and
  who still owes. Click a person to open their detail.
- **Ajustar** (on the pool card) — when the pool stops matching the real bank
  balance, set the real balance and the difference is saved as an `ajuste`: a
  regular movement (listed, editable, deletable) that corrects the pool by a
  signed amount and touches nobody's balance, because the money cannot be
  attributed. It is the only movement whose amount may be negative, so
  `pool` = sum of all balances + the net of the ajustes.
- **Personas** — manage the household list; click a person to see their
  entradas, the gastos they took part in, and their balance.
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
