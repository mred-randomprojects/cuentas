import type { Person, Transaction } from "../types";
import { formatARS, formatDate, formatSignedARS, todayISO } from "./money";
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
  lines.push(`Entradas al pozo: ${formatARS(ledger.totalEntries)}`);
  lines.push(`Total de gastos: ${formatARS(ledger.totalPurchases)}`);
  lines.push(`- Pagados del pozo: ${formatARS(ledger.totalPoolPurchases)}`);
  lines.push(`- Pagados por una persona: ${formatARS(ledger.totalDirectPayments)}`);
  if (ledger.adjustments !== 0) {
    lines.push(
      `Ajustes de pozo (sin asignar): ${formatSignedARS(ledger.adjustments)}`,
    );
  }
  lines.push("");
  lines.push("SALDOS");

  if (!ledger.rows.length) {
    lines.push("Sin personas anotadas.");
  } else {
    for (const row of ledger.rows) {
      const status = statusForBalance(row.balance);
      lines.push(
        `${row.name}: ${status.label} ${formatARS(Math.abs(row.balance))} | aportó ${formatARS(
          row.contributions,
        )} | gastos ${formatARS(row.expenses)}`,
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
      lines.push(`Entradas al pozo: ${formatARS(row.entries)}`);
      lines.push(`Gastos que pagó: ${formatARS(row.directPayments)}`);
      lines.push(`Aporte total: ${formatARS(row.contributions)}`);
      lines.push(`Gastos asignados: ${formatARS(row.expenses)}`);
      lines.push(`Saldo: ${status.label} ${formatARS(Math.abs(row.balance))}`);
      if (!row.purchases.length) {
        lines.push("Gastos: ninguno");
      } else {
        lines.push("Gastos:");
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
      if (tx.type === "ajuste") {
        // The default description is the label itself; don't repeat it.
        const detail =
          tx.description === "Ajuste de pozo" ? "" : ` · ${tx.description}`;
        lines.push(
          `- ${formatDate(tx.date)} · Ajuste de pozo${detail} · ${formatSignedARS(
            tx.amount,
          )}`,
        );
      } else if (tx.type === "entrada") {
        lines.push(
          `- ${formatDate(tx.date)} · Entrada · ${personName(people, tx.personId)} · ${
            tx.description
          } · ${formatARS(tx.amount)}`,
        );
      } else if (tx.type === "compra") {
        lines.push(
          `- ${formatDate(tx.date)} · Gasto del pozo · ${tx.description} · ${formatARS(
            tx.amount,
          )} · ${describeParticipants(people, tx.participantIds)}`,
        );
      } else {
        lines.push(
          `- ${formatDate(tx.date)} · Pagó ${personName(
            people,
            tx.personId,
          )} · ${tx.description} · ${formatARS(tx.amount)} · ${describeParticipants(
            people,
            tx.participantIds,
          )}`,
        );
      }
    }
  }

  return lines.join("\n");
}
