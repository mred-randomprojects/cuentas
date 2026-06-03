import type { AppData, Person, Transaction } from "./types";

function txTime(tx: Transaction): number {
  const stamp = tx.updatedAt ?? tx.createdAt;
  const time = new Date(stamp).getTime();
  return Number.isFinite(time) ? time : 0;
}

function laterDate(a: string | null, b: string | null): string | null {
  if (a == null) return b;
  if (b == null) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/**
 * Additive merge of two AppData snapshots for local + cloud sync.
 *
 * - Deletions are tracked as tombstones (`deletedIds`) and merged first, so a
 *   stale device cannot resurrect something the other side removed.
 * - People are unioned by id; on conflict the `local` side wins (renames have
 *   no timestamp to compare).
 * - Transactions are unioned by id; on conflict the most recently updated wins,
 *   with `local` winning ties.
 * - References to people that no longer exist are pruned.
 */
export function mergeAppData(local: AppData, cloud: AppData): AppData {
  const deletedIds = new Set<string>([...local.deletedIds, ...cloud.deletedIds]);

  const peopleMap = new Map<string, Person>();
  for (const person of cloud.people) peopleMap.set(person.id, person);
  for (const person of local.people) peopleMap.set(person.id, person);
  const people = [...peopleMap.values()].filter((person) => !deletedIds.has(person.id));
  const personIds = new Set(people.map((person) => person.id));

  const txMap = new Map<string, Transaction>();
  const consider = (tx: Transaction) => {
    const existing = txMap.get(tx.id);
    if (existing == null || txTime(tx) >= txTime(existing)) {
      txMap.set(tx.id, tx);
    }
  };
  cloud.transactions.forEach(consider);
  local.transactions.forEach(consider);

  const transactions = [...txMap.values()]
    .filter((tx) => !deletedIds.has(tx.id))
    .map((tx) => ({
      ...tx,
      participantIds: tx.participantIds.filter((id) => personIds.has(id)),
    }));

  return {
    people,
    transactions,
    deletedIds: [...deletedIds],
    updatedAt: laterDate(local.updatedAt, cloud.updatedAt),
  };
}

/** Structural equality of the meaningful data (ignores timestamps). */
export function sameData(a: AppData, b: AppData): boolean {
  return (
    JSON.stringify({ p: a.people, t: a.transactions, d: [...a.deletedIds].sort() }) ===
    JSON.stringify({ p: b.people, t: b.transactions, d: [...b.deletedIds].sort() })
  );
}
