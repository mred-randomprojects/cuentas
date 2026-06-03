import { useRef } from "react";
import { Download, LogOut, Sparkles, Trash2, Upload } from "lucide-react";
import type { AppData } from "../types";
import { sanitizeAppData } from "../lib/appData";
import { createDemoData } from "../lib/demo";
import { useAuth } from "../auth";
import { useToast } from "./Toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AppData;
  onReplaceData: (next: AppData) => void;
}

function hasData(data: AppData): boolean {
  return data.people.length > 0 || data.transactions.length > 0;
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function SettingsDialog({
  open,
  onOpenChange,
  data,
  onReplaceData,
}: SettingsDialogProps) {
  const { user, signOut } = useAuth();
  const { show } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  function loadDemo() {
    if (hasData(data) && !confirm("¿Reemplazar los datos actuales por el ejemplo?")) {
      return;
    }
    onReplaceData(createDemoData());
    show("Ejemplo cargado.");
    onOpenChange(false);
  }

  function exportData() {
    downloadJson("cuentas-datos.json", {
      people: data.people,
      transactions: data.transactions,
    });
    show("Datos exportados.");
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = sanitizeAppData(JSON.parse(String(reader.result)));
        if (!confirm("¿Reemplazar los datos actuales por el archivo importado?")) {
          return;
        }
        onReplaceData(parsed);
        show("Datos importados.");
        onOpenChange(false);
      } catch {
        show("No pude leer ese archivo.");
      } finally {
        if (fileInput.current) fileInput.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!hasData(data)) {
      show("No hay datos para borrar.");
      return;
    }
    if (!confirm("¿Borrar todas las personas y movimientos?")) return;
    onReplaceData({ people: [], transactions: [], deletedIds: [], updatedAt: null });
    show("Datos borrados.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustes</DialogTitle>
          <DialogDescription>Cuenta y gestión de datos.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="size-10 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
              {(user?.displayName ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {user?.displayName ?? "Cuenta"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid gap-2">
          <Button variant="outline" onClick={loadDemo} className="justify-start">
            <Sparkles /> Cargar ejemplo
          </Button>
          <Button variant="outline" onClick={exportData} className="justify-start">
            <Download /> Exportar datos (.json)
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInput.current?.click()}
            className="justify-start"
          >
            <Upload /> Importar datos
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importData(file);
            }}
          />
          <Button
            variant="outline"
            onClick={resetAll}
            className="justify-start border-destructive/30 text-[hsl(var(--negative))] hover:bg-[hsl(var(--negative-soft))]"
          >
            <Trash2 /> Limpiar todo
          </Button>
        </div>

        <Button variant="ghost" onClick={() => void signOut()}>
          <LogOut /> Cerrar sesión
        </Button>
      </DialogContent>
    </Dialog>
  );
}
