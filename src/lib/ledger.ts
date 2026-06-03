import type {
  BalanceStatus,
  Ledger,
  LedgerRow,
  Person,
  Transaction,
} from "../types";

/** Threshold below which a balance is treated as exactly zero. */
const EPSILON = 0.004;

/**
 * Computes per-person balances from the list of transactions.
 * - `entrada` adds to the person's `entries`.
 * - `compra` splits its amount equally between its (still-existing) participants.
 * Mirrors the original cuentas calculation, with each person's own movements
 * collected so a detail view can list them.
 */
export function getLedger(people: Person[], transactions: Transaction[]): Ledger {
  const byPerson = new Map<string, LedgerRow>(
    people.map((person) => [
      person.id,
      { ...person, entries: 0, expenses: 0, entryList: [], purchases: [], balance: 0 },
    ]),
  );

  let totalEntries = 0;
  let totalPurchases = 0;

  for (const tx of transactions) {
    if (tx.type === "entrada") {
      totalEntries += tx.amount;
      const row = byPerson.get(tx.personId);
      if (row) {
        row.entries += tx.amount;
        row.entryList.push(tx);
      }
      continue;
    }

    const participantIds = tx.participantIds.filter((id) => byPerson.has(id));
    if (!participantIds.length) continue;
    totalPurchases += tx.amount;
    const share = tx.amount / participantIds.length;
    for (const id of participantIds) {
      const row = byPerson.get(id);
      if (!row) continue;
      row.expenses += share;
      row.purchases.push({ tx, share, participantCount: participantIds.length });
    }
  }

  const rows = [...byPerson.values()]
    .map((row) => ({ ...row, balance: row.entries - row.expenses }))
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, "es"));

  return {
    rows,
    totalEntries,
    totalPurchases,
    pool: totalEntries - totalPurchases,
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
