import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import type { Transaction } from "../types";
import { buildPoolAdjustment, type TransactionInput } from "../lib/operations";
import {
  formatARS,
  formatInputAmount,
  parseMoney,
  toCents,
  todayISO,
} from "../lib/money";
import { useToast } from "./Toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const DEFAULT_DESCRIPTION = "Ajuste de pozo";

interface AdjustPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pool balance the app currently reports, adjustments included. */
  pool: number;
  /** The ajuste being corrected, if any. */
  editing: Transaction | null;
  onSubmit: (input: TransactionInput) => void;
}

export function AdjustPoolDialog({
  open,
  onOpenChange,
  pool,
  editing,
  onSubmit,
}: AdjustPoolDialogProps) {
  const { show } = useToast();
  const [target, setTarget] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");

  // What the movements add up to without this ajuste. Editing one means
  // re-answering the same question, so its own amount is taken back out first.
  const baseline = pool - (editing?.amount ?? 0);

  useEffect(() => {
    if (!open) return;
    setTarget(editing ? formatInputAmount(pool) : "");
    setDate(editing?.date ?? todayISO());
    setDescription(
      editing && editing.description !== DEFAULT_DESCRIPTION
        ? editing.description
        : "",
    );
    // Re-initialised when the dialog opens or the edited ajuste changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const parsedTarget = parseMoney(target);
  const hasTarget =
    Number.isFinite(parsedTarget) && Number.isSafeInteger(toCents(parsedTarget));
  const deltaCents = hasTarget ? toCents(parsedTarget) - toCents(baseline) : null;
  const difference = deltaCents == null ? null : Math.abs(deltaCents) / 100;
  const isShortfall = deltaCents != null && deltaCents < 0;
  const canSubmit = deltaCents != null && deltaCents !== 0;

  function handleSubmit() {
    if (!hasTarget) {
      show("Ingresá el saldo real del pozo.");
      return;
    }
    const input = buildPoolAdjustment({
      id: editing?.id,
      baseline,
      target: parsedTarget,
      description: description.trim() || DEFAULT_DESCRIPTION,
      date: date || todayISO(),
    });
    if (!input) {
      show("El pozo ya coincide con ese saldo.");
      return;
    }

    onSubmit(input);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar ajuste del pozo" : "Ajustar el pozo"}
          </DialogTitle>
          <DialogDescription>
            Poné el saldo real de la cuenta. La diferencia queda anotada como un
            ajuste que no le suma ni le resta a nadie: los saldos de cada persona
            no cambian.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/35 px-3 py-2">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4" /> Pozo según la app
            </span>
            <strong className="font-serif text-lg font-bold">
              {formatARS(pool)}
            </strong>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="adjust-date">Fecha</Label>
              <Input
                id="adjust-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adjust-target">Saldo real de la cuenta</Label>
              <Input
                id="adjust-target"
                inputMode="decimal"
                autoComplete="off"
                placeholder="200k, 20.000, 150000"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>

          {target.trim() !== "" && !hasTarget && (
            <p className="rounded-lg border border-border bg-[hsl(var(--negative-soft))] px-3 py-2 text-xs font-semibold text-[hsl(var(--negative))]">
              Ingresá un monto válido.
            </p>
          )}

          {deltaCents === 0 && (
            <p className="rounded-lg border border-border bg-secondary/35 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              El pozo ya coincide con ese saldo. No hace falta ajustar nada.
            </p>
          )}

          {difference != null && deltaCents !== 0 && (
            <p className="rounded-lg border border-border bg-secondary/35 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {isShortfall ? (
                <>
                  Faltan <strong>{formatARS(difference)}</strong> en el pozo. Se
                  descuentan del pozo sin tocar los saldos.
                </>
              ) : (
                <>
                  Sobran <strong>{formatARS(difference)}</strong> en el pozo. Se
                  suman al pozo sin tocar los saldos.
                </>
              )}
            </p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="adjust-description">Descripción</Label>
            <Input
              id="adjust-description"
              autoComplete="off"
              placeholder={DEFAULT_DESCRIPTION}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {editing ? "Guardar ajuste" : "Ajustar pozo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
