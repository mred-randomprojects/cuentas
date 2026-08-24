import { useMemo, useState } from "react";
import {
  FileText,
  LayoutDashboard,
  Plus,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MovementType } from "../types";
import { getLedger } from "../lib/ledger";
import * as ops from "../lib/operations";
import type { TransactionInput } from "../lib/operations";
import { useAppData } from "../useAppData";
import { useToast } from "./Toast";
import { BrandMark } from "./BrandMark";
import { SyncBadge } from "./SyncBadge";
import { Button } from "./ui/button";
import { DashboardPage } from "./DashboardPage";
import { PeoplePage } from "./PeoplePage";
import { ReportPage } from "./ReportPage";
import { MovementDialog } from "./MovementDialog";
import { AdjustPoolDialog } from "./AdjustPoolDialog";
import { PersonDetailDialog } from "./PersonDetailDialog";
import { SettingsDialog } from "./SettingsDialog";
import { cn } from "@/lib/utils";

type Tab = "resumen" | "personas" | "reporte";

const TABS: { value: Tab; label: string; icon: LucideIcon }[] = [
  { value: "resumen", label: "Resumen", icon: LayoutDashboard },
  { value: "personas", label: "Personas", icon: Users },
  { value: "reporte", label: "Reporte", icon: FileText },
];

export function AppShell() {
  const { data, status, mutate, replaceData } = useAppData();
  const { show } = useToast();

  const [tab, setTab] = useState<Tab>("resumen");
  const [movementOpen, setMovementOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newType, setNewType] = useState<MovementType>("entrada");
  const [personId, setPersonId] = useState<string | null>(null);
  const [personOpen, setPersonOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const ledger = useMemo(
    () => getLedger(data.people, data.transactions),
    [data.people, data.transactions],
  );
  const editingTx = editingId
    ? data.transactions.find((tx) => tx.id === editingId) ?? null
    : null;
  const selectedRow = personId
    ? ledger.rows.find((row) => row.id === personId) ?? null
    : null;

  function openNewMovement() {
    setEditingId(null);
    setNewType("entrada");
    setMovementOpen(true);
  }

  function openEditMovement(id: string) {
    setPersonOpen(false);
    setEditingId(id);
    setMovementOpen(true);
  }

  function submitMovement(input: TransactionInput) {
    const isEdit = Boolean(input.id);
    mutate((d) => ops.upsertTransaction(d, input));
    show(isEdit ? "Movimiento actualizado." : "Movimiento registrado.");
  }

  function submitAdjustment(input: TransactionInput) {
    mutate((d) => ops.upsertTransaction(d, input));
    show("Pozo ajustado.");
  }

  function deleteMovement(id: string) {
    const tx = data.transactions.find((item) => item.id === id);
    if (!tx) return;
    if (!confirm(`¿Borrar "${tx.description}"?`)) return;
    if (editingId === id) {
      setEditingId(null);
      setMovementOpen(false);
    }
    mutate((d) => ops.deleteTransaction(d, id));
    show("Movimiento borrado.");
  }

  function openPerson(id: string) {
    setPersonId(id);
    setPersonOpen(true);
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto w-full max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandMark className="size-11 text-xl" />
              <div>
                <h1 className="font-serif text-2xl font-bold leading-none">
                  cuentas
                </h1>
                <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                  Pozo compartido del hogar
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SyncBadge status={status} />
              <Button
                variant="outline"
                size="icon"
                aria-label="Ajustes"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <nav className="flex flex-1 gap-1 rounded-xl border border-border bg-card p-1 shadow-sm sm:flex-initial">
              {TABS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTab(item.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:flex-initial",
                      tab === item.value
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <Button onClick={openNewMovement} className="shrink-0">
              <Plus />
              <span className="hidden sm:inline">Nuevo movimiento</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        {tab === "resumen" && (
          <DashboardPage
            data={data}
            onNewMovement={openNewMovement}
            onAdjustPool={() => setAdjustOpen(true)}
            onEditMovement={openEditMovement}
            onDeleteMovement={deleteMovement}
            onOpenPerson={openPerson}
          />
        )}
        {tab === "personas" && (
          <PeoplePage
            data={data}
            onAddPerson={(name) => mutate((d) => ops.addPerson(d, name))}
            onDeletePerson={(id) => mutate((d) => ops.deletePerson(d, id))}
            onOpenPerson={openPerson}
          />
        )}
        {tab === "reporte" && <ReportPage data={data} />}
      </main>

      <MovementDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        people={data.people}
        editing={editingTx}
        defaultType={newType}
        onSubmit={submitMovement}
      />

      <AdjustPoolDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        people={data.people}
        pool={ledger.pool}
        onSubmit={submitAdjustment}
      />

      <PersonDetailDialog
        open={personOpen}
        onOpenChange={setPersonOpen}
        row={selectedRow}
        people={data.people}
        onRename={(id, name) => mutate((d) => ops.renamePerson(d, id, name))}
        onDelete={(id) => mutate((d) => ops.deletePerson(d, id))}
        onEditMovement={openEditMovement}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        data={data}
        onReplaceData={replaceData}
      />
    </div>
  );
}
