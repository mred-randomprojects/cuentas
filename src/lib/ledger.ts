import type {
  BalanceStatus,
  Ledger,
  LedgerRow,
  Person,
  Transaction,
} from "../types";
import { fromCents, splitMoney, toCents } from "./money";

/** Threshold below which a balance is treated as exactly zero. */
const EPSILON = 0.004;

/**
 * Computes per-person balances from the list of transactions.
 * - `entrada` adds cash to the pool and credit to the contributor.
 * - `compra` removes cash from the pool and assigns the expense.
 * - `gasto_pagado` credits its payer and assigns the expense without changing
 *   the pool. It is one atomic movement rather than a linked entry + purchase.
 * - `ajuste` moves the pool by a signed amount without touching anybody's
 *   balance: it is money the household knows about but cannot attribute.
 *
 * All arithmetic is performed in integer cents. Uneven divisions distribute
 * their remainder deterministically, so the individual shares always add up
 * exactly to the transaction amount.
 */
export function getLedger(people: Person[], transactions: Transaction[]): Ledger {
  interface Accumulator {
    row: LedgerRow;
    entryCents: number;
    directPaymentCents: number;
    expenseCents: number;
  }

  const byPerson = new Map<string, Accumulator>(
    people.map((person) => [
      person.id,
      {
        row: {
          ...person,
          entries: 0,
          directPayments: 0,
          contributions: 0,
          expenses: 0,
          entryList: [],
          paymentList: [],
          purchases: [],
          balance: 0,
        },
        entryCents: 0,
        directPaymentCents: 0,
        expenseCents: 0,
      },
    ]),
  );

  let adjustmentCents = 0;
  let totalEntryCents = 0;
  let totalPurchaseCents = 0;
  let totalDirectPaymentCents = 0;
  let totalPoolPurchaseCents = 0;

  for (const tx of transactions) {
    const amountCents = toCents(tx.amount);

    // The only signed movement: it corrects the pool and stops there.
    if (tx.type === "ajuste") {
      adjustmentCents += amountCents;
      continue;
    }

    if (amountCents <= 0) continue;

    if (tx.type === "entrada") {
      const account = byPerson.get(tx.personId);
      if (!account) continue;
      totalEntryCents += amountCents;
      account.entryCents += amountCents;
      account.row.entryList.push(tx);
      continue;
    }

    const participantIds = [...new Set(tx.participantIds)];
    if (
      !participantIds.length ||
      participantIds.some((id) => !byPerson.has(id))
    ) {
      continue;
    }

    if (tx.type === "gasto_pagado") {
      const payer = byPerson.get(tx.personId);
      if (!payer) continue;
      payer.directPaymentCents += amountCents;
      payer.row.paymentList.push(tx);
      totalDirectPaymentCents += amountCents;
    } else {
      totalPoolPurchaseCents += amountCents;
    }

    totalPurchaseCents += amountCents;
    const shares = splitMoney(fromCents(amountCents), participantIds);
    for (const item of shares) {
      const account = byPerson.get(item.personId);
      if (!account) continue;
      account.expenseCents += toCents(item.amount);
      account.row.purchases.push({
        tx,
        share: item.amount,
        participantCount: participantIds.length,
      });
    }
  }

  const rows = [...byPerson.values()]
    .map(({ row, entryCents, directPaymentCents, expenseCents }) => ({
      ...row,
      entries: fromCents(entryCents),
      directPayments: fromCents(directPaymentCents),
      contributions: fromCents(entryCents + directPaymentCents),
      expenses: fromCents(expenseCents),
      balance: fromCents(entryCents + directPaymentCents - expenseCents),
    }))
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, "es"));

  return {
    rows,
    totalEntries: fromCents(totalEntryCents),
    totalPurchases: fromCents(totalPurchaseCents),
    totalDirectPayments: fromCents(totalDirectPaymentCents),
    totalPoolPurchases: fromCents(totalPoolPurchaseCents),
    adjustments: fromCents(adjustmentCents),
    pool: fromCents(totalEntryCents - totalPoolPurchaseCents + adjustmentCents),
  };
}

export function statusForBalance(balance: number): BalanceStatus {
  if (balance > EPSILON) return { label: "A favor", tone: "positive" };
  if (balance < -EPSILON) return { label: "Debe", tone: "negative" };
  return { label: "En cero", tone: "neutral" };
}

export function isDebtor(balance: number): boolean {
  return balance < -EPSILON;
}

export function isCreditor(balance: number): boolean {
  return balance > EPSILON;
}
