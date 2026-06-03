export type MovementType = "entrada" | "compra";

export interface Person {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: MovementType;
  description: string;
  amount: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Person who added money — only for `entrada`. */
  personId: string;
  /** People the cost is split between — only for `compra`. */
  participantIds: string[];
  createdAt: string;
  updatedAt: string | null;
}

export interface AppData {
  people: Person[];
  transactions: Transaction[];
  /** Tombstones for deleted people and transactions (ids are globally unique). */
  deletedIds: string[];
  /** ISO timestamp of the last local mutation; used as a merge tie-breaker. */
  updatedAt: string | null;
}

export interface PurchaseShare {
  tx: Transaction;
  share: number;
  participantCount: number;
}

export interface LedgerRow extends Person {
  /** Money this person added to the pool. */
  entries: number;
  /** This person's share of all purchases they took part in. */
  expenses: number;
  /** The entradas this person made. */
  entryList: Transaction[];
  /** The purchases this person took part in, with their share. */
  purchases: PurchaseShare[];
  /** entries - expenses. Positive = credit, negative = owes. */
  balance: number;
}

export interface Ledger {
  rows: LedgerRow[];
  totalEntries: number;
  totalPurchases: number;
  pool: number;
}

export type BalanceTone = "positive" | "negative" | "neutral";

export interface BalanceStatus {
  label: string;
  tone: BalanceTone;
}
