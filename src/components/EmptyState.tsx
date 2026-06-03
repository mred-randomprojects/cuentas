import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-center">
      {Icon != null && <Icon className="size-6 text-muted-foreground" />}
      <strong className="text-sm font-semibold">{title}</strong>
      {description != null && (
        <span className="text-sm text-muted-foreground">{description}</span>
      )}
    </div>
  );
}
