import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid place-items-center rounded-lg bg-foreground font-serif leading-none text-background shadow-[inset_0_-5px_0_hsl(var(--warn)/0.45)]",
        className,
      )}
    >
      c
    </div>
  );
}
