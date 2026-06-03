import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData } from "./types";
import { loadLocalData, saveLocalData } from "./storage";
import { loadCloudData, saveCloudData, subscribeCloudData } from "./cloudStorage";
import { mergeAppData, sameData } from "./mergeAppData";
import { touch } from "./lib/appData";
import { useAuth } from "./auth";

export type SyncStatus = "local" | "syncing" | "synced" | "error";

export interface UseAppData {
  data: AppData;
  status: SyncStatus;
  /** Apply an incremental change (add/edit/delete). */
  mutate: (updater: (current: AppData) => AppData) => void;
  /** Replace all data, tombstoning everything currently present (reset/import/demo). */
  replaceData: (next: AppData) => void;
}

const SAVE_DEBOUNCE_MS = 700;

export function useAppData(): UseAppData {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(() => loadLocalData());
  const [status, setStatus] = useState<SyncStatus>("local");

  const dataRef = useRef<AppData>(data);
  const userRef = useRef(user);
  userRef.current = user;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
    saveLocalData(next);
  }, []);

  const doCloudSave = useCallback(
    async (uid: string) => {
      try {
        const merged = await saveCloudData(uid, dataRef.current);
        if (!sameData(merged, dataRef.current)) {
          apply(merged);
        } else {
          dataRef.current = merged;
        }
        setStatus("synced");
      } catch {
        setStatus("error");
      }
    },
    [apply],
  );

  const scheduleCloudSave = useCallback(
    (uid: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setStatus("syncing");
      saveTimer.current = setTimeout(() => {
        void doCloudSave(uid);
      }, SAVE_DEBOUNCE_MS);
    },
    [doCloudSave],
  );

  const mutate = useCallback(
    (updater: (current: AppData) => AppData) => {
      const next = touch(updater(dataRef.current));
      apply(next);
      const uid = userRef.current?.uid;
      if (uid) scheduleCloudSave(uid);
    },
    [apply, scheduleCloudSave],
  );

  const replaceData = useCallback(
    (next: AppData) => {
      const current = dataRef.current;
      const tombstones = new Set<string>([...current.deletedIds, ...next.deletedIds]);
      current.people.forEach((person) => tombstones.add(person.id));
      current.transactions.forEach((tx) => tombstones.add(tx.id));
      // Keep anything that exists in the replacement set alive.
      next.people.forEach((person) => tombstones.delete(person.id));
      next.transactions.forEach((tx) => tombstones.delete(tx.id));
      mutate(() => ({ ...next, deletedIds: [...tombstones] }));
    },
    [mutate],
  );

  // Load local data and sync with the cloud whenever the signed-in user changes.
  useEffect(() => {
    const local = loadLocalData();
    apply(local);

    const uid = user?.uid ?? null;
    if (uid == null) {
      setStatus("local");
      return;
    }

    let cancelled = false;
    setStatus("syncing");

    (async () => {
      try {
        const cloud = await loadCloudData(uid);
        const merged = cloud ? mergeAppData(dataRef.current, cloud) : dataRef.current;
        if (cancelled) return;
        apply(merged);
        const saved = await saveCloudData(uid, merged);
        if (cancelled) return;
        apply(saved);
        setStatus("synced");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    const unsubscribe = subscribeCloudData(
      uid,
      (cloud) => {
        if (cloud == null) return;
        const merged = mergeAppData(dataRef.current, cloud);
        if (!sameData(merged, dataRef.current)) apply(merged);
      },
      () => setStatus("error"),
    );

    return () => {
      cancelled = true;
      unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return { data, status, mutate, replaceData };
}
