import { Pencil, Trash2 } from "lucide-react";
import type { Person, Transaction } from "../types";
import { formatARS, formatDate, splitMoney } from "../lib/money";
import { describeParticipants, personName } from "../lib/people";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface TransactionCardProps {
  tx: Transaction;
  people: Person[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TransactionCard({
  tx,
  people,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const isPurchase = tx.type !== "entrada";
  const isDirectPayment = tx.type === "gasto_pagado";
  const participantCount = tx.participantIds.length;
  const shares = isPurchase ? splitMoney(tx.amount, tx.participantIds) : [];
  const shareAmounts = shares.map((item) => item.amount);
  const shareLabel =
    participantCount === 0
      ? "Sin participantes"
      : Math.min(...shareAmounts) === Math.max(...shareAmounts)
        ? `${formatARS(shareAmounts[0] ?? 0)} por persona`
        : `${formatARS(Math.min(...shareAmounts))}–${formatARS(
            Math.max(...shareAmounts),
          )} por persona`;
  const meta = !isPurchase
    ? `${personName(people, tx.personId)} agregó dinero al pozo`
    : isDirectPayment
      ? `${personName(people, tx.personId)} pagó · ${describeParticipants(
          people,
          tx.participantIds,
        )} · ${shareLabel}`
      : `${describeParticipants(people, tx.participantIds)} · ${shareLabel}`;

  const badgeVariant = !isPurchase
    ? "positive"
    : isDirectPayment
      ? "warning"
      : "negative";
  const badgeLabel = !isPurchase
    ? "Entrada"
    : isDirectPayment
      ? "Pagó alguien"
      : "Gasto del pozo";

  return (
    <article
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm",
        !isPurchase
          ? "border-l-4 border-l-[hsl(var(--positive))]"
          : isDirectPayment
            ? "border-l-4 border-l-[hsl(var(--warn))]"
            : "border-l-4 border-l-[hsl(var(--negative))]",
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
          <strong className="break-words text-sm font-semibold">
            {tx.description}
          </strong>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(tx.date)} · {formatARS(tx.amount)}
        </p>
        <p className="text-sm text-muted-foreground">{meta}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onEdit(tx.id)}
          aria-label="Editar movimiento"
          className="grid size-9 place-items-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(tx.id)}
          aria-label="Borrar movimiento"
          className="grid size-9 place-items-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-[hsl(var(--negative-soft))] hover:text-[hsl(var(--negative))]"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </article>
  );
}
