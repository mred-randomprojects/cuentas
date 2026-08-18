import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { MovementType, Person, Transaction } from "../types";
import { personName } from "../lib/people";
import { Input } from "./ui/input";
import { EmptyState } from "./EmptyState";
import { TransactionCard } from "./TransactionCard";
import { cn } from "@/lib/utils";

type Filter = "todos" | MovementType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "entrada", label: "Entradas" },
  { value: "compra", label: "Del pozo" },
  { value: "gasto_pagado", label: "Pagados" },
];

interface TransactionListProps {
  transactions: Transaction[];
  people: Person[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TransactionList({
  transactions,
  people,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const ordered = [...transactions].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
    return ordered.filter((tx) => {
      if (filter !== "todos" && tx.type !== filter) return false;
      if (!term) return true;
      const haystack = [
        tx.description,
        tx.type,
        tx.personId ? personName(people, tx.personId) : "",
        ...tx.participantIds.map((id) => personName(people, id)),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [transactions, people, search, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            autoComplete="off"
            placeholder="Buscar: huevos, papas, Elena…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-input bg-secondary/60 p-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                "h-8 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-colors",
                filter === item.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin movimientos para mostrar"
          description={
            transactions.length
              ? "Probá con otro filtro o búsqueda."
              : "Registrá una entrada, un gasto del pozo o un gasto pagado."
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((tx) => (
            <TransactionCard
              key={tx.id}
              tx={tx}
              people={people}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
