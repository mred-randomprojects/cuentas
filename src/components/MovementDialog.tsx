import { useEffect, useState, type ReactNode } from "react";
import type { MovementType, Person, Transaction } from "../types";
import type { TransactionInput } from "../lib/operations";
import {
  formatARS,
  formatInputAmount,
  parseMoney,
  splitMoney,
  toCents,
  todayISO,
} from "../lib/money";
import { useToast } from "./Toast";
import { cn } from "@/lib/utils";
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

interface MovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  editing: Transaction | null;
  defaultType: MovementType;
  onSubmit: (input: TransactionInput) => void;
}

export function MovementDialog({
  open,
  onOpenChange,
  people,
  editing,
  defaultType,
  onSubmit,
}: MovementDialogProps) {
  const { show } = useToast();
  const [type, setType] = useState<MovementType>("entrada");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [payerId, setPayerId] = useState("");
  const [participants, setParticipants] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setDate(editing.date);
      setAmount(formatInputAmount(editing.amount));
      setDescription(editing.description);
      setPayerId(
        editing.type !== "compra" ? editing.personId : people[0]?.id ?? "",
      );
      setParticipants(
        new Set(
          editing.type !== "entrada"
            ? editing.participantIds
            : people.map((person) => person.id),
        ),
      );
    } else {
      setType(defaultType);
      setDate(todayISO());
      setAmount("");
      setDescription("");
      setPayerId(people[0]?.id ?? "");
      setParticipants(new Set(people.map((person) => person.id)));
    }
    // Only re-initialise when the dialog opens or the edited movement changes.
    // Keyed on editing?.id (not the object) so a background re-render does not
    // wipe what the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, defaultType]);

  const parsedAmount = parseMoney(amount);
  const participantCount = [...participants].filter((id) =>
    people.some((person) => person.id === id),
  ).length;
  const sharePreview =
    type !== "entrada" && Number.isFinite(parsedAmount) && participantCount > 0
      ? splitMoney(
          parsedAmount,
          [...participants].filter((id) => people.some((person) => person.id === id)),
        )
      : null;

  function toggleParticipant(id: string) {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (!people.length) {
      show("Agregá al menos una persona.");
      return;
    }
    if (
      !Number.isFinite(parsedAmount) ||
      !Number.isSafeInteger(toCents(parsedAmount)) ||
      parsedAmount <= 0
    ) {
      show("Ingresá un monto válido.");
      return;
    }

    const needsPayer = type !== "compra";
    const needsParticipants = type !== "entrada";
    if (needsPayer && !people.some((person) => person.id === payerId)) {
      show(type === "entrada" ? "Elegí quién agrega dinero." : "Elegí quién pagó.");
      return;
    }
    const participantIds = [...participants].filter((id) =>
      people.some((person) => person.id === id),
    );
    if (needsParticipants && !participantIds.length) {
      show("Elegí al menos una persona para repartir el gasto.");
      return;
    }

    const fallbackDescription =
      type === "entrada"
        ? "Entrada de dinero"
        : type === "gasto_pagado"
          ? "Gasto pagado por una persona"
          : "Gasto";
    onSubmit({
      id: editing?.id,
      type,
      description: description.trim() || fallbackDescription,
      amount: parsedAmount,
      date: date || todayISO(),
      personId: needsPayer ? payerId : "",
      participantIds: needsParticipants ? participantIds : [],
    });

    onOpenChange(false);
  }

  const submitLabel = editing
    ? "Guardar cambios"
    : type === "entrada"
      ? "Registrar entrada"
      : type === "gasto_pagado"
        ? "Registrar pago"
        : "Registrar gasto";

  const typeHelp =
    type === "entrada"
      ? "Suma dinero al pozo y deja ese monto a favor de quien lo aporta."
      : type === "compra"
        ? "Descuenta dinero del pozo y reparte el gasto entre los participantes."
        : "No toca el pozo: acredita a quien pagó y reparte el mismo gasto.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar movimiento" : "Nuevo movimiento"}
          </DialogTitle>
          <DialogDescription>
            Registrá el movimiento según cómo se pagó realmente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-input bg-secondary/60 p-1">
            <SegmentButton
              active={type === "entrada"}
              tone="positive"
              onClick={() => setType("entrada")}
            >
              Entrada
            </SegmentButton>
            <SegmentButton
              active={type === "compra"}
              tone="negative"
              onClick={() => setType("compra")}
            >
              Del pozo
            </SegmentButton>
            <SegmentButton
              active={type === "gasto_pagado"}
              tone="warning"
              onClick={() => setType("gasto_pagado")}
            >
              Pagó alguien
            </SegmentButton>
          </div>

          <p className="rounded-lg border border-border bg-secondary/35 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {typeHelp}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="movement-date">Fecha</Label>
              <Input
                id="movement-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="movement-amount">Monto</Label>
              <Input
                id="movement-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="200k, 20.000, 150000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="movement-description">Descripción</Label>
            <Input
              id="movement-description"
              autoComplete="off"
              placeholder="Verduras, cena día 22, entrada Marisol…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {type !== "compra" && (
            <div className="grid gap-1.5">
              <Label htmlFor="entry-person">
                {type === "entrada" ? "Persona que agrega dinero" : "Persona que pagó"}
              </Label>
              <Select
                id="entry-person"
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

          {type !== "entrada" && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Participantes</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setParticipants(new Set(people.map((p) => p.id)))
                    }
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setParticipants(new Set())}
                  >
                    Nadie
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {people.map((person) => {
                  const selected = participants.has(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleParticipant(person.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "border-primary/40 bg-[hsl(var(--positive-soft))] font-semibold text-[hsl(var(--positive))]"
                          : "border-input bg-card hover:bg-accent",
                      )}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: person.color }}
                      />
                      <span className="truncate">{person.name}</span>
                    </button>
                  );
                })}
              </div>
              {sharePreview != null && (
                <p className="text-xs text-muted-foreground">
                  {sharePreview.every((item) => item.amount === sharePreview[0]?.amount)
                    ? `Se reparte en partes iguales: ${formatARS(sharePreview[0]?.amount ?? 0)} por persona (${participantCount}).`
                    : `Reparto exacto: entre ${formatARS(
                        Math.min(...sharePreview.map((item) => item.amount)),
                      )} y ${formatARS(
                        Math.max(...sharePreview.map((item) => item.amount)),
                      )} por persona (${participantCount}).`}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SegmentButton({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "positive" | "negative" | "warning";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-md text-sm font-bold transition-colors",
        active
          ? tone === "positive"
            ? "bg-[hsl(var(--positive))] text-primary-foreground shadow-sm"
            : tone === "negative"
              ? "bg-[hsl(var(--negative))] text-destructive-foreground shadow-sm"
              : "bg-[hsl(var(--warn))] text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
