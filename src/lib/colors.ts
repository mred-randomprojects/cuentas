export const COLORS = [
  "#146c63",
  "#a43d2c",
  "#bd8624",
  "#4f6754",
  "#7a4f2b",
  "#315c7a",
  "#8a4a63",
  "#5f5a2d",
] as const;

export function isSafeColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function colorForIndex(index: number): string {
  return COLORS[index % COLORS.length];
}
