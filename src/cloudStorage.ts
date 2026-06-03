import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { AppData } from "./types";
import { emptyAppData, sanitizeAppData } from "./lib/appData";
import { mergeAppData } from "./mergeAppData";

function userDocRef(uid: string) {
  return doc(db, "users", uid, "data", "appData");
}

function payloadFromAppData(data: AppData) {
  return {
    people: data.people,
    transactions: data.transactions,
    deletedIds: data.deletedIds,
    updatedAt: data.updatedAt,
    syncedAt: serverTimestamp(),
  };
}

export async function loadCloudData(uid: string): Promise<AppData | null> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  return sanitizeAppData(snap.data());
}

/**
 * Transactionally merges `data` with whatever is currently in Firestore (so a
 * concurrent edit from another device is not clobbered) and writes the result.
 * Returns the merged data that was persisted.
 */
export async function saveCloudData(uid: string, data: AppData): Promise<AppData> {
  const ref = userDocRef(uid);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const cloud = snap.exists() ? sanitizeAppData(snap.data()) : emptyAppData();
    const merged = mergeAppData(data, cloud);
    transaction.set(ref, payloadFromAppData(merged));
    return merged;
  });
}

export function subscribeCloudData(
  uid: string,
  onData: (data: AppData | null) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    userDocRef(uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(sanitizeAppData(snap.data()));
    },
    onError,
  );
}
