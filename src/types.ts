export type MovementType = "entrada" | "compra" | "gasto_pagado" | "ajuste";

export interface Person {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: MovementType;
  description: string;
  /**
   * Always positive, except for `ajuste`, where it is the signed correction
   * applied to the pool (positive adds cash, negative removes it).
   */
  amount: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Person who contributed the money — for `entrada` and `gasto_pagado`. Empty for `ajuste`. */
  personId: string;
  /** People the cost is split between — for `compra` and `gasto_pagado`. Empty for `ajuste`. */
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
  /** Money this person added to the shared pool. */
  entries: number;
  /** Expenses this person paid directly instead of using the shared pool. */
  directPayments: number;
  /** Total value contributed: pool entries + directly paid expenses. */
  contributions: number;
  /** This person's share of all purchases they took part in. */
  expenses: number;
  /** The entradas this person made. */
  entryList: Transaction[];
  /** The shared expenses this person paid directly. */
  paymentList: Transaction[];
  /** The purchases this person took part in, with their share. */
  purchases: PurchaseShare[];
  /** contributions - expenses. Positive = credit, negative = owes. */
  balance: number;
}

export interface Ledger {
  rows: LedgerRow[];
  /** Cash added to the shared pool. */
  totalEntries: number;
  /** All shared expenses, whether paid from the pool or by a person. */
  totalPurchases: number;
  /** Shared expenses paid directly by a person. */
  totalDirectPayments: number;
  /** Shared expenses paid from the pool. */
  totalPoolPurchases: number;
  /**
   * Net of the manual pool corrections. This money belongs to nobody in
   * particular, so `pool` = sum of all balances + `adjustments`.
   */
  adjustments: number;
  /** Physical cash currently available in the shared pool. */
  pool: number;
}

export type BalanceTone = "positive" | "negative" | "neutral";

export interface BalanceStatus {
  label: string;
  tone: BalanceTone;
}
