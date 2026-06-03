import type { Person, Transaction } from "../types";
import { formatARS, formatDate, todayISO } from "./money";
import { getLedger, statusForBalance } from "./ledger";
import { describeParticipants, personName } from "./people";

/**
 * Builds the plain-text report (intended for pasting into WhatsApp) from a set
 * of people and an already period-filtered list of transactions.
 */
export function buildReportText(
  people: Person[],
  transactions: Transaction[],
  periodLabel: string,
): string {
  const ledger = getLedger(people, transactions);
  const lines: string[] = [];

  lines.push(`🧾 CUENTAS · Reporte ${formatDate(todayISO())}`);
  lines.push(`Período: ${periodLabel}`);
  lines.push("");
  lines.push(`Pozo disponible: ${formatARS(ledger.pool)}`);
  lines.push(`Total de entradas: ${formatARS(ledger.totalEntries)}`);
  lines.push(`Total de compras: ${formatARS(ledger.totalPurchases)}`);
  lines.push("");
  lines.push("SALDOS");

  if (!ledger.rows.length) {
    lines.push("Sin personas anotadas.");
  } else {
    for (const row of ledger.rows) {
      const status = statusForBalance(row.balance);
      lines.push(
        `${row.name}: ${status.label} ${formatARS(Math.abs(row.balance))} | puso ${formatARS(
          row.entries,
        )} | compras ${formatARS(row.expenses)}`,
      );
    }
  }

  lines.push("");
  lines.push("DETALLE POR PERSONA");
  if (!ledger.rows.length) {
    lines.push("Sin detalle.");
  } else {
    const byName = [...ledger.rows].sort((a, b) => a.name.localeCompare(b.name, "es"));
    for (const row of byName) {
      const status = statusForBalance(row.balance);
      lines.push("");
      lines.push(`${row.name}`);
      lines.push(`Puso: ${formatARS(row.entries)}`);
      lines.push(`Compras asignadas: ${formatARS(row.expenses)}`);
      lines.push(`Saldo: ${status.label} ${formatARS(Math.abs(row.balance))}`);
      if (!row.purchases.length) {
        lines.push("Compras: ninguna");
      } else {
        lines.push("Compras:");
        const purchases = [...row.purchases].sort((a, b) =>
          a.tx.date.localeCompare(b.tx.date),
        );
        for (const item of purchases) {
          lines.push(
            `- ${formatDate(item.tx.date)} · ${item.tx.description}: ${formatARS(
              item.share,
            )} de ${formatARS(item.tx.amount)} (${item.participantCount} personas)`,
          );
        }
      }
    }
  }

  lines.push("");
  lines.push("MOVIMIENTOS");
  if (!transactions.length) {
    lines.push("Sin movimientos.");
  } else {
    const movements = [...transactions].sort(
      (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
    );
    for (const tx of movements) {
      if (tx.type === "entrada") {
        lines.push(
          `- ${formatDate(tx.date)} · Entrada · ${personName(people, tx.personId)} · ${
            tx.description
          } · ${formatARS(tx.amount)}`,
        );
      } else {
        lines.push(
          `- ${formatDate(tx.date)} · Compra · ${tx.description} · ${formatARS(
            tx.amount,
          )} · ${describeParticipants(people, tx.participantIds)}`,
        );
      }
    }
  }

  return lines.join("\n");
}
