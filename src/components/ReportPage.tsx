import { useMemo, useState } from "react";
import { Copy, Download } from "lucide-react";
import type { AppData } from "../types";
import { getLedger, isCreditor, isDebtor } from "../lib/ledger";
import { formatARS } from "../lib/money";
import { buildReportText } from "../lib/report";
import {
  ALL_TIME,
  availableMonths,
  customPeriod,
  filterByPeriod,
  monthPeriod,
  type Period,
} from "../lib/period";
import { useToast } from "./Toast";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

type Mode = "all" | "month" | "custom";

const MODES: { value: Mode; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "month", label: "Por mes" },
  { value: "custom", label: "Personalizado" },
];

function downloadFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ReportPage({ data }: { data: AppData }) {
  const { show } = useToast();
  const months = useMemo(
    () => availableMonths(data.transactions),
    [data.transactions],
  );

  const [mode, setMode] = useState<Mode>("all");
  const [monthKey, setMonthKey] = useState<string>(() => months[0]?.key ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const period: Period = useMemo(() => {
    if (mode === "month") {
      const selected =
        months.find((m) => m.key === monthKey) ?? months[0] ?? null;
      if (selected) return monthPeriod(selected.year, selected.month);
      return ALL_TIME;
    }
    if (mode === "custom") {
      return customPeriod(from || null, to || null);
    }
    return ALL_TIME;
  }, [mode, monthKey, from, to, months]);

  const filtered = useMemo(
    () => filterByPeriod(data.transactions, period),
    [data.transactions, period],
  );
  const ledger = useMemo(
    () => getLedger(data.people, filtered),
    [data.people, filtered],
  );
  const reportText = useMemo(
    () => buildReportText(data.people, filtered, period.label),
    [data.people, filtered, period.label],
  );

  const debtors = ledger.rows.filter((row) => isDebtor(row.balance)).length;
  const creditors = ledger.rows.filter((row) => isCreditor(row.balance)).length;

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      show("Reporte copiado.");
    } catch {
      show("No se pudo copiar automáticamente. Copialo manualmente.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Período</CardTitle>
          <p className="text-sm text-muted-foreground">
            Elegí qué movimientos incluir en el reporte.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-input bg-secondary/60 p-1">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={cn(
                  "h-9 rounded-md text-sm font-semibold transition-colors",
                  mode === item.value
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === "month" &&
            (months.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay movimientos con fecha para elegir un mes.
              </p>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="report-month">Mes</Label>
                <Select
                  id="report-month"
                  value={monthKey || months[0]?.key}
                  onChange={(e) => setMonthKey(e.target.value)}
                >
                  {months.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
            ))}

          {mode === "custom" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="report-from">Desde</Label>
                <Input
                  id="report-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="report-to">Hasta</Label>
                <Input
                  id="report-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Pozo del período</span>
            <strong className="font-serif text-xl font-bold">
              {formatARS(ledger.pool)}
            </strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Deben aportar</span>
            <strong className="font-serif text-xl font-bold text-[hsl(var(--negative))]">
              {debtors}
            </strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">A favor</span>
            <strong className="font-serif text-xl font-bold text-[hsl(var(--positive))]">
              {creditors}
            </strong>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-1">
            <CardTitle>Reporte para compartir</CardTitle>
            <p className="text-sm text-muted-foreground">
              Texto listo para pegar en WhatsApp · {period.label}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyReport}>
              <Copy /> Copiar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadFile("cuentas-reporte.txt", reportText);
                show("Reporte descargado.");
              }}
            >
              <Download /> .txt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            readOnly
            value={reportText}
            aria-label="Reporte generado"
            className="min-h-[320px] font-mono text-xs"
          />
        </CardContent>
      </Card>
    </div>
  );
}
