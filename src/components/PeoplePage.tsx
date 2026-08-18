import { useMemo, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import type { AppData, BalanceTone } from "../types";
import { getLedger, statusForBalance } from "../lib/ledger";
import { formatARS } from "../lib/money";
import { useToast } from "./Toast";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

interface PeoplePageProps {
  data: AppData;
  onAddPerson: (name: string) => void;
  onDeletePerson: (id: string) => void;
  onOpenPerson: (id: string) => void;
}

function toneClass(tone: BalanceTone): string {
  if (tone === "positive") return "text-[hsl(var(--positive))]";
  if (tone === "negative") return "text-[hsl(var(--negative))]";
  return "text-muted-foreground";
}

export function PeoplePage({
  data,
  onAddPerson,
  onDeletePerson,
  onOpenPerson,
}: PeoplePageProps) {
  const { show } = useToast();
  const [name, setName] = useState("");

  const ledger = useMemo(
    () => getLedger(data.people, data.transactions),
    [data.people, data.transactions],
  );

  function handleAdd() {
    const clean = name.trim();
    if (!clean) {
      show("Escribí un nombre.");
      return;
    }
    if (data.people.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
      show("Esa persona ya está anotada.");
      return;
    }
    onAddPerson(clean);
    setName("");
    show(`${clean} agregada.`);
  }

  function handleDelete(id: string) {
    const person = data.people.find((p) => p.id === id);
    if (!person) return;
    const used = data.transactions.some(
      (tx) => tx.personId === id || tx.participantIds.includes(id),
    );
    if (used) {
      show("No se puede borrar una persona con movimientos.");
      return;
    }
    onDeletePerson(id);
    show(`${person.name} borrada.`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tu lista del hogar. No son cuentas: son las personas entre las que se
            reparten los gastos.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
          >
            <Input
              autoComplete="off"
              placeholder="Elena, Marisol…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" className="shrink-0">
              <Plus /> Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>
            {data.people.length}{" "}
            {data.people.length === 1 ? "persona" : "personas"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin personas todavía"
              description="Agregá nombres para empezar a registrar movimientos."
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {ledger.rows.map((row) => {
                const status = statusForBalance(row.balance);
                const used =
                  row.entryList.length > 0 ||
                  row.paymentList.length > 0 ||
                  row.purchases.length > 0;
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenPerson(row.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                        style={{ background: row.color }}
                      >
                        {row.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{row.name}</p>
                        <p className={cn("text-xs font-medium", toneClass(status.tone))}>
                          {status.label} · {formatARS(Math.abs(row.balance))}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      aria-label={`Borrar ${row.name}`}
                      title={
                        used
                          ? "No se puede borrar: tiene movimientos"
                          : "Borrar persona"
                      }
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg border border-input bg-card text-muted-foreground transition-colors",
                        used
                          ? "cursor-not-allowed opacity-40"
                          : "hover:border-destructive/40 hover:bg-[hsl(var(--negative-soft))] hover:text-[hsl(var(--negative))]",
                      )}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
