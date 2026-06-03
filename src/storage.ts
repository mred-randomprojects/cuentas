import type { AppData } from "./types";
import { emptyAppData, sanitizeAppData } from "./lib/appData";

const STORAGE_KEY = "cuentas.v2";
/** The original single-file app stored data here in the `{people, transactions}` shape. */
const LEGACY_KEY = "cuentas.v1";

export function loadLocalData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw != null) return sanitizeAppData(JSON.parse(raw));
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy != null) return sanitizeAppData(JSON.parse(legacy));
    return emptyAppData();
  } catch {
    return emptyAppData();
  }
}

export function saveLocalData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota errors are non-fatal — the cloud copy remains the source of truth.
  }
}
