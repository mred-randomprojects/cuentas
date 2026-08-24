import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import type { Person } from "../types";
import { buildPoolAdjustment, type TransactionInput } from "../lib/operations";
import { formatARS, parseMoney, toCents, todayISO } from "../lib/money";
import { selectedParticipantIds } from "../lib/people";
import { useToast } from "./Toast";
import { ParticipantPicker } from "./ParticipantPicker";
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
import { Select } from "./ui/select";

const DEFAULT_DESCRIPTION = "Ajuste de pozo";

interface AdjustPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  /** Pool balance the app currently reports. */
  pool: number;
  onSubmit: (input: TransactionInput) => void;
}

export function AdjustPoolDialog({
  open,
  onOpenChange,
  people,
  pool,
  onSubmit,
}: AdjustPoolDialogProps) {
  const { show } = useToast();
  const [target, setTarget] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [payerId, setPayerId] = useState("");
  const [participants, setParticipants] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setTarget("");
    setDate(todayISO());
    setDescription("");
    setPayerId(people[0]?.id ?? "");
    setParticipants(new Set(people.map((person) => person.id)));
    // Re-initialised on every open; people is intentionally read as a snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const parsedTarget = parseMoney(target);
  const hasTarget =
    Number.isFinite(parsedTarget) && Number.isSafeInteger(toCents(parsedTarget));
  const deltaCents = hasTarget ? toCents(parsedTarget) - toCents(pool) : null;
  const difference = deltaCents == null ? null : Math.abs(deltaCents) / 100;
  const isSurplus = deltaCents != null && deltaCents > 0;
  const isShortfall = deltaCents != null && deltaCents < 0;
  const canSubmit = people.length > 0 && deltaCents != null && deltaCents !== 0;

  function handleSubmit() {
    if (!people.length) {
      show("Agregá al menos una persona.");
      return;
    }
    if (!hasTarget) {
      show("Ingresá el saldo real del pozo.");
      return;
    }
    if (deltaCents === 0) {
      show("El pozo ya coincide con ese saldo.");
      return;
    }
    const participantIds = selectedParticipantIds(people, participants);
    if (isSurplus && !people.some((person) => person.id === payerId)) {
      show("Elegí a quién se le acredita el dinero de más.");
      return;
    }
    if (isShortfall && !participantIds.length) {
      show("Elegí al menos una persona para repartir la diferencia.");
      return;
    }

    const input = buildPoolAdjustment({
      currentPool: pool,
      target: parsedTarget,
      description: description.trim() || DEFAULT_DESCRIPTION,
      date: date || todayISO(),
      personId: payerId,
      participantIds,
    });
    if (!input) {
      show("No hay diferencia para ajustar.");
      return;
    }

    onSubmit(input);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajustar el pozo</DialogTitle>
          <DialogDescription>
            Poné el saldo real de la cuenta y se registra el movimiento que falta
            para que la app vuelva a coincidir.
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

          {people.length === 0 && (
            <p className="rounded-lg border border-border bg-secondary/35 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Agregá al menos una persona para poder ajustar el pozo.
            </p>
          )}

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
                  registra un gasto del pozo por ese monto, repartido entre los
                  participantes.
                </>
              ) : (
                <>
                  Sobran <strong>{formatARS(difference)}</strong> en el pozo. Se
                  registra una entrada por ese monto a nombre de quien lo puso.
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

          {isSurplus && (
            <div className="grid gap-1.5">
              <Label htmlFor="adjust-person">Persona que puso ese dinero</Label>
              <Select
                id="adjust-person"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
              >
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {isShortfall && (
            <ParticipantPicker
              people={people}
              value={participants}
              onChange={setParticipants}
              amount={difference}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Ajustar pozo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
