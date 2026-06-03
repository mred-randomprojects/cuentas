import { Check, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import type { SyncStatus } from "../useAppData";
import { cn } from "@/lib/utils";

const CONFIG: Record<
  SyncStatus,
  { label: string; className: string; spin?: boolean; Icon: typeof Check }
> = {
  local: {
    label: "Solo local",
    className: "bg-muted text-muted-foreground",
    Icon: CloudOff,
  },
  syncing: {
    label: "Sincronizando",
    className: "bg-[hsl(var(--warn-soft))] text-[hsl(var(--warn))]",
    spin: true,
    Icon: Loader2,
  },
  synced: {
    label: "Sincronizado",
    className: "bg-[hsl(var(--positive-soft))] text-[hsl(var(--positive))]",
    Icon: Check,
  },
  error: {
    label: "Error de sincronización",
    className: "bg-[hsl(var(--negative-soft))] text-[hsl(var(--negative))]",
    Icon: TriangleAlert,
  },
};

export function SyncBadge({ status }: { status: SyncStatus }) {
  const { label, className, spin, Icon } = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        className,
      )}
      title={label}
    >
      <Icon className={cn("size-3.5", spin && "animate-spin")} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
