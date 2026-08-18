import type { AppData, MovementType, Person, Transaction } from "../types";
import { colorForIndex, isSafeColor } from "./colors";
import { createId } from "./ids";
import { fromCents, toCents, todayISO } from "./money";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function defaultDescription(type: MovementType): string {
  if (type === "entrada") return "Entrada de dinero";
  if (type === "gasto_pagado") return "Gasto pagado por una persona";
  return "Gasto";
}

export function emptyAppData(): AppData {
  return { people: [], transactions: [], deletedIds: [], updatedAt: null };
}

/** Returns a copy of the data stamped with a fresh `updatedAt`. */
export function touch(data: AppData): AppData {
  return { ...data, updatedAt: new Date().toISOString() };
}

/**
 * Normalises arbitrary input (localStorage JSON, an imported file, or a
 * Firestore document) into a well-formed AppData. Invalid people/transactions
 * are dropped, and references to missing people are cleaned up.
 */
export function sanitizeAppData(input: unknown): AppData {
  if (!isObject(input)) return emptyAppData();

  const rawPeople = Array.isArray(input.people) ? input.people : [];
  const people: Person[] = [];
  rawPeople.forEach((entry, index) => {
    if (!isObject(entry)) return;
    if (entry.id == null || entry.name == null) return;
    const id = String(entry.id);
    const name = String(entry.name).trim();
    if (!id || !name) return;
    people.push({
      id,
      name,
      color: isSafeColor(entry.color) ? entry.color : colorForIndex(index),
    });
  });

  const personIds = new Set(people.map((person) => person.id));

  const rawTransactions = Array.isArray(input.transactions) ? input.transactions : [];
  const transactions: Transaction[] = [];
  rawTransactions.forEach((entry) => {
    if (!isObject(entry)) return;
    const type = entry.type;
    if (type !== "entrada" && type !== "compra" && type !== "gasto_pagado") {
      return;
    }
    const amountCents = toCents(Number(entry.amount));
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return;
    const amount = fromCents(amountCents);

    const descriptionRaw =
      typeof entry.description === "string" ? entry.description.trim() : "";
    const date =
      typeof entry.date === "string" && entry.date ? entry.date : todayISO();
    const needsPayer = type === "entrada" || type === "gasto_pagado";
    const needsParticipants = type !== "entrada";
    const personId =
      needsPayer && typeof entry.personId === "string" ? entry.personId : "";
    if (needsPayer && !personIds.has(personId)) return;

    const rawParticipantIds = needsParticipants
      ? Array.isArray(entry.participantIds)
        ? [...new Set(entry.participantIds.map(String))]
        : []
      : [];
    if (
      needsParticipants &&
      (!rawParticipantIds.length || rawParticipantIds.some((id) => !personIds.has(id)))
    ) {
      return;
    }
    const participantIds = rawParticipantIds;

    transactions.push({
      id: entry.id != null ? String(entry.id) : createId("tx"),
      type,
      description: descriptionRaw || defaultDescription(type),
      amount,
      date,
      personId,
      participantIds,
      createdAt:
        typeof entry.createdAt === "string" && entry.createdAt
          ? entry.createdAt
          : new Date().toISOString(),
      updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : null,
    });
  });

  const deletedIds = Array.isArray(input.deletedIds)
    ? [...new Set(input.deletedIds.map(String))]
    : [];

  return {
    people,
    transactions,
    deletedIds,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : null,
  };
}
