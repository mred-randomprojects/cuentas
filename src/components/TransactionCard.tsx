import { Pencil, Trash2 } from "lucide-react";
import type { Person, Transaction } from "../types";
import { formatARS, formatDate } from "../lib/money";
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
  const isPurchase = tx.type === "compra";
  const participantCount = tx.participantIds.length;
  const share = isPurchase && participantCount ? tx.amount / participantCount : 0;
  const meta = isPurchase
    ? `${describeParticipants(people, tx.participantIds)} · ${formatARS(share)} por persona`
    : `${personName(people, tx.personId)} agregó dinero`;

  return (
    <article
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm",
        isPurchase
          ? "border-l-4 border-l-[hsl(var(--negative))]"
          : "border-l-4 border-l-[hsl(var(--positive))]",
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isPurchase ? "negative" : "positive"}>
            {isPurchase ? "Compra" : "Entrada"}
          </Badge>
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
