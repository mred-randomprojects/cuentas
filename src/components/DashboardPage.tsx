import { useMemo } from "react";
import { Plus, Wallet } from "lucide-react";
import type { AppData, BalanceTone } from "../types";
import { getLedger, isDebtor, statusForBalance } from "../lib/ledger";
import { formatARS } from "../lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { EmptyState } from "./EmptyState";
import { TransactionList } from "./TransactionList";
import { cn } from "@/lib/utils";

interface DashboardPageProps {
  data: AppData;
  onNewMovement: () => void;
  onEditMovement: (id: string) => void;
  onDeleteMovement: (id: string) => void;
  onOpenPerson: (id: string) => void;
}

function toneClass(tone: BalanceTone): string {
  if (tone === "positive") return "text-[hsl(var(--positive))]";
  if (tone === "negative") return "text-[hsl(var(--negative))]";
  return "text-muted-foreground";
}

export function DashboardPage({
  data,
  onNewMovement,
  onEditMovement,
  onDeleteMovement,
  onOpenPerson,
}: DashboardPageProps) {
  const ledger = useMemo(
    () => getLedger(data.people, data.transactions),
    [data.people, data.transactions],
  );
  const debtors = ledger.rows.filter((row) => isDebtor(row.balance));

  return (
    <div className="space-y-6">
      {/* Pool summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-card md:col-span-1">
          <CardContent className="flex flex-col gap-1 p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4" /> Pozo disponible
            </div>
            <strong className="font-serif text-3xl font-bold tracking-tight">
              {formatARS(ledger.pool)}
            </strong>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <Card>
            <CardContent className="flex flex-col gap-1 p-5">
              <span className="text-sm text-muted-foreground">Entradas al pozo</span>
              <strong className="font-serif text-2xl font-bold text-[hsl(var(--positive))]">
                {formatARS(ledger.totalEntries)}
              </strong>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-1 p-5">
              <span className="text-sm text-muted-foreground">Gastos</span>
              <strong className="font-serif text-2xl font-bold text-[hsl(var(--negative))]">
                {formatARS(ledger.totalPurchases)}
              </strong>
              <span className="text-xs text-muted-foreground">
                Del pozo {formatARS(ledger.totalPoolPurchases)} · Pagados por alguien{" "}
                {formatARS(ledger.totalDirectPayments)}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Balances + pending */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Saldos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Positivo es dinero a favor; negativo es deuda. Tocá una persona para
              ver su detalle.
            </p>
          </CardHeader>
          <CardContent>
            {ledger.rows.length === 0 ? (
              <EmptyState
                title="Sin saldos"
                description="Agregá personas y movimientos."
              />
            ) : (
              <div className="grid gap-2">
                {ledger.rows.map((row) => {
                  const status = statusForBalance(row.balance);
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => onOpenPerson(row.id)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ background: row.color }}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{row.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            Aportó {formatARS(row.contributions)} · Gastos{" "}
                            {formatARS(row.expenses)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn("font-bold", toneClass(status.tone))}>
                          {formatARS(row.balance)}
                        </span>
                        <Badge variant={status.tone}>{status.label}</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pendientes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Personas que deberían aportar para quedar en cero.
            </p>
          </CardHeader>
          <CardContent>
            {debtors.length === 0 ? (
              <EmptyState
                title="No hay deudas"
                description="Todos están en cero o con saldo a favor."
              />
            ) : (
              <div className="grid gap-2">
                {debtors.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => onOpenPerson(row.id)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-left transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.purchases.length} gastos asignados
                      </p>
                    </div>
                    <span className="shrink-0 font-bold text-[hsl(var(--negative))]">
                      {formatARS(Math.abs(row.balance))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movements */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Movimientos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Historial de entradas, gastos del pozo y gastos pagados.
            </p>
          </div>
          <Button onClick={onNewMovement} size="sm">
            <Plus /> Nuevo
          </Button>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={data.transactions}
            people={data.people}
            onEdit={onEditMovement}
            onDelete={onDeleteMovement}
          />
        </CardContent>
      </Card>
    </div>
  );
}
