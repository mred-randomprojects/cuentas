import type { Transaction } from "../types";

export interface Period {
  /** Inclusive start (YYYY-MM-DD), or null for open-ended. */
  from: string | null;
  /** Inclusive end (YYYY-MM-DD), or null for open-ended. */
  to: string | null;
  label: string;
}

export const ALL_TIME: Period = { from: null, to: null, label: "Todo el historial" };

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Human label for a year+month, e.g. "Junio 2026". month is 1-12. */
export function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return capitalize(
    new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date),
  );
}

export function monthPeriod(year: number, month: number): Period {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
    label: monthLabel(year, month),
  };
}

export function customPeriod(from: string | null, to: string | null): Period {
  const parts: string[] = [];
  if (from) parts.push(`desde ${from}`);
  if (to) parts.push(`hasta ${to}`);
  return { from, to, label: parts.length ? parts.join(" ") : "Rango personalizado" };
}

export function filterByPeriod(
  transactions: Transaction[],
  period: Period,
): Transaction[] {
  if (period.from == null && period.to == null) return transactions;
  return transactions.filter((tx) => {
    if (period.from != null && tx.date < period.from) return false;
    if (period.to != null && tx.date > period.to) return false;
    return true;
  });
}

export interface MonthOption {
  year: number;
  month: number;
  label: string;
  key: string;
}

/** Distinct year+month values present in the data, most recent first. */
export function availableMonths(transactions: Transaction[]): MonthOption[] {
  const seen = new Map<string, MonthOption>();
  for (const tx of transactions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) continue;
    const year = Number(tx.date.slice(0, 4));
    const month = Number(tx.date.slice(5, 7));
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (!seen.has(key)) {
      seen.set(key, { year, month, key, label: monthLabel(year, month) });
    }
  }
  return [...seen.values()].sort((a, b) => b.key.localeCompare(a.key));
}
