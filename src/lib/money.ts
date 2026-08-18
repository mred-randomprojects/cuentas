export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Parses loosely-typed money input the way the original cuentas app did:
 * accepts "200k", "1,5m", "20.000", "150000", "1.234,56", "$ 1.000", "ARS 200".
 * Returns NaN when the input cannot be understood.
 */
export function parseMoney(value: string | number | null | undefined): number {
  let raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return NaN;
  raw = raw.replace(/\s+/g, "").replace(/\$/g, "").replace(/ars/g, "");
  const multiplier = raw.endsWith("k") ? 1000 : raw.endsWith("m") ? 1_000_000 : 1;
  if (multiplier !== 1) raw = raw.slice(0, -1);

  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    raw = raw.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    raw = raw.replace(/\./g, "");
  }

  const amount = Number(raw);
  return Number.isFinite(amount) ? Math.round(amount * multiplier * 100) / 100 : NaN;
}

/** Converts a peso amount to integer cents for exact accounting. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Converts integer cents back to the persisted/displayed peso amount. */
export function fromCents(cents: number): number {
  return cents / 100;
}

export interface MoneyShare {
  personId: string;
  amount: number;
}

/**
 * Splits an amount into exact cent-denominated shares.
 *
 * When a cent cannot be divided evenly, the first participants in the stored
 * order receive one extra cent. This makes the allocation deterministic and
 * guarantees that the shares always add up to the original amount.
 */
export function splitMoney(amount: number, participantIds: string[]): MoneyShare[] {
  const ids = [...new Set(participantIds)];
  if (!ids.length) return [];

  const totalCents = toCents(amount);
  const baseCents = Math.floor(totalCents / ids.length);
  const remainder = totalCents % ids.length;

  return ids.map((personId, index) => ({
    personId,
    amount: fromCents(baseCents + (index < remainder ? 1 : 0)),
  }));
}

export function formatARS(value: number): string {
  const amount = Math.abs(value) < 0.005 ? 0 : value;
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return `ARS ${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount)}`;
}

/** Plain number formatting used to pre-fill the amount field when editing. */
export function formatInputAmount(amount: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(amount);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T00:00:00`);
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  // e.g. "miércoles, 03 de junio de 2026" -> "Miércoles 03 de junio de 2026"
  const cleaned = formatted.replace(",", "");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
