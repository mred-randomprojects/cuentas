import type { Person } from "../types";
import { formatARS, splitMoney } from "../lib/money";
import { selectedParticipantIds } from "../lib/people";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

interface ParticipantPickerProps {
  people: Person[];
  /** Ids of the currently selected participants. */
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  label?: string;
  /** Amount to preview the split for. `null` hides the preview. */
  amount?: number | null;
}

/**
 * Chip grid to pick who a shared expense is split between, with a live preview
 * of each person's share. Used by the movement and pool adjustment dialogs.
 */
export function ParticipantPicker({
  people,
  value,
  onChange,
  label = "Participantes",
  amount = null,
}: ParticipantPickerProps) {
  const participantIds = selectedParticipantIds(people, value);
  const shares =
    amount != null && Number.isFinite(amount) && participantIds.length
      ? splitMoney(amount, participantIds)
      : null;

  function toggle(id: string) {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(new Set(people.map((person) => person.id)))}
          >
            Todos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(new Set())}
          >
            Nadie
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {people.map((person) => {
          const selected = value.has(person.id);
          return (
            <button
              key={person.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(person.id)}
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
      {shares != null && (
        <p className="text-xs text-muted-foreground">
          {shares.every((item) => item.amount === shares[0]?.amount)
            ? `Se reparte en partes iguales: ${formatARS(
                shares[0]?.amount ?? 0,
              )} por persona (${shares.length}).`
            : `Reparto exacto: entre ${formatARS(
                Math.min(...shares.map((item) => item.amount)),
              )} y ${formatARS(
                Math.max(...shares.map((item) => item.amount)),
              )} por persona (${shares.length}).`}
        </p>
      )}
    </div>
  );
}
