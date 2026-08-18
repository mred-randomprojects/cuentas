import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Trash2 } from "lucide-react";
import type { LedgerRow, Person } from "../types";
import { statusForBalance } from "../lib/ledger";
import { formatARS, formatDate } from "../lib/money";
import { describeParticipants, personName } from "../lib/people";
import { useToast } from "./Toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

interface PersonDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: LedgerRow | null;
  people: Person[];
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onEditMovement: (id: string) => void;
}

export function PersonDetailDialog({
  open,
  onOpenChange,
  row,
  people,
  onRename,
  onDelete,
  onEditMovement,
}: PersonDetailDialogProps) {
  const { show } = useToast();
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (open && row) setNameDraft(row.name);
    // Keyed on row?.id (not the object) so a background re-render does not reset
    // a rename in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.id]);

  if (!row) return null;

  const status = statusForBalance(row.balance);
  const hasMovements =
    row.entryList.length > 0 ||
    row.paymentList.length > 0 ||
    row.purchases.length > 0;
  const entradas = [...row.entryList].sort((a, b) => b.date.localeCompare(a.date));
  const pagos = [...row.paymentList].sort((a, b) => b.date.localeCompare(a.date));
  const compras = [...row.purchases].sort((a, b) =>
    b.tx.date.localeCompare(a.tx.date),
  );
  const nameChanged = nameDraft.trim() !== "" && nameDraft.trim() !== row.name;

  function handleRename() {
    if (!row) return;
    const clean = nameDraft.trim();
    if (!clean || clean === row.name) return;
    if (
      people.some(
        (p) => p.id !== row.id && p.name.toLowerCase() === clean.toLowerCase(),
      )
    ) {
      show("Ya hay otra persona con ese nombre.");
      return;
    }
    onRename(row.id, clean);
    show("Nombre actualizado.");
  }

  function handleDelete() {
    if (!row) return;
    if (hasMovements) {
      show("No se puede borrar una persona con movimientos.");
      return;
    }
    onDelete(row.id);
    show(`${row.name} borrada.`);
    onOpenChange(false);
  }

  function openMovement(id: string) {
    onEditMovement(id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full text-base font-bold text-white"
              style={{ background: row.color }}
            >
              {row.name.charAt(0).toUpperCase()}
            </span>
            <DialogTitle>{row.name}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Aportó" value={formatARS(row.contributions)} />
          <Stat label="Gastos" value={formatARS(row.expenses)} />
          <Stat
            label="Saldo"
            value={formatARS(row.balance)}
            tone={status.tone}
            badge={status.label}
          />
        </div>

        {/* Rename */}
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Renombrar
          </label>
          <div className="flex gap-2">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
              }}
            />
            <Button
              variant="outline"
              className="shrink-0"
              disabled={!nameChanged}
              onClick={handleRename}
            >
              Guardar
            </Button>
          </div>
        </div>

        {/* Movements */}
        <div className="max-h-[40dvh] space-y-4 overflow-y-auto pr-1">
          <Section
            title="Entradas al pozo"
            count={entradas.length}
            empty="No agregó dinero al pozo."
          >
            {entradas.map((tx) => (
              <MovementRow
                key={tx.id}
                onClick={() => openMovement(tx.id)}
                icon={
                  <ArrowDownLeft className="size-4 text-[hsl(var(--positive))]" />
                }
                title={tx.description}
                subtitle={formatDate(tx.date)}
                amount={formatARS(tx.amount)}
                amountClass="text-[hsl(var(--positive))]"
              />
            ))}
          </Section>

          <Section
            title="Gastos que pagó"
            count={pagos.length}
            empty="No pagó gastos directamente."
          >
            {pagos.map((tx) => (
              <MovementRow
                key={tx.id}
                onClick={() => openMovement(tx.id)}
                icon={<HandCoins className="size-4 text-[hsl(var(--warn))]" />}
                title={tx.description}
                subtitle={`${formatDate(tx.date)} · Para ${describeParticipants(
                  people,
                  tx.participantIds,
                )}`}
                amount={formatARS(tx.amount)}
                amountClass="text-[hsl(var(--warn))]"
              />
            ))}
          </Section>

          <Section
            title="Gastos asignados"
            count={compras.length}
            empty="No participó de ningún gasto."
          >
            {compras.map(({ tx, share, participantCount }) => (
              <MovementRow
                key={tx.id}
                onClick={() => openMovement(tx.id)}
                icon={
                  <ArrowUpRight className="size-4 text-[hsl(var(--negative))]" />
                }
                title={tx.description}
                subtitle={`${formatDate(tx.date)} · ${
                  tx.type === "gasto_pagado"
                    ? `Pagó ${personName(people, tx.personId)}`
                    : "Del pozo"
                } · ${formatARS(tx.amount)} entre ${participantCount}`}
                amount={formatARS(share)}
                amountClass="text-[hsl(var(--negative))]"
              />
            ))}
          </Section>
        </div>

        <Button
          variant="outline"
          disabled={hasMovements}
          onClick={handleDelete}
          className={cn(
            !hasMovements &&
              "border-destructive/30 text-[hsl(var(--negative))] hover:bg-[hsl(var(--negative-soft))]",
          )}
        >
          <Trash2 />
          {hasMovements ? "No se puede borrar (tiene movimientos)" : "Borrar persona"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  tone,
  badge,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  badge?: string;
}) {
  const valueClass =
    tone === "positive"
      ? "text-[hsl(var(--positive))]"
      : tone === "negative"
        ? "text-[hsl(var(--negative))]"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-serif text-base font-bold", valueClass)}>{value}</p>
      {badge != null && tone != null && (
        <Badge variant={tone} className="mt-1">
          {badge}
        </Badge>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-serif text-sm font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid gap-1.5">{children}</div>
      )}
    </div>
  );
}

function MovementRow({
  icon,
  title,
  subtitle,
  amount,
  amountClass,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  amount: string;
  amountClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:bg-accent"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <span className={cn("shrink-0 text-sm font-bold", amountClass)}>{amount}</span>
    </button>
  );
}
