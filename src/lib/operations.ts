import type { AppData, MovementType, Person, Transaction } from "../types";
import { isValidAmountCents } from "./appData";
import { colorForIndex } from "./colors";
import { createId } from "./ids";
import { fromCents, toCents } from "./money";
import { selectedParticipantIds } from "./people";

export function addPerson(data: AppData, name: string): AppData {
  const person: Person = {
    id: createId("person"),
    name: name.trim(),
    color: colorForIndex(data.people.length),
  };
  return { ...data, people: [...data.people, person] };
}

export function renamePerson(data: AppData, id: string, name: string): AppData {
  const trimmed = name.trim();
  if (!trimmed) return data;
  return {
    ...data,
    people: data.people.map((person) =>
      person.id === id ? { ...person, name: trimmed } : person,
    ),
  };
}

export function deletePerson(data: AppData, id: string): AppData {
  const isReferenced = data.transactions.some(
    (tx) => tx.personId === id || tx.participantIds.includes(id),
  );
  if (isReferenced) return data;

  return {
    ...data,
    people: data.people.filter((person) => person.id !== id),
    deletedIds: [...data.deletedIds, id],
  };
}

export interface TransactionInput {
  id?: string;
  type: MovementType;
  description: string;
  amount: number;
  date: string;
  personId: string;
  participantIds: string[];
}

export function upsertTransaction(data: AppData, input: TransactionInput): AppData {
  const personIds = new Set(data.people.map((person) => person.id));
  const amount = fromCents(toCents(input.amount));
  const participantIds = selectedParticipantIds(data.people, input.participantIds);
  const needsPayer = input.type === "entrada" || input.type === "gasto_pagado";
  const needsParticipants = input.type === "compra" || input.type === "gasto_pagado";

  if (
    !isValidAmountCents(input.type, toCents(input.amount)) ||
    (needsPayer && !personIds.has(input.personId)) ||
    (needsParticipants && participantIds.length === 0)
  ) {
    return data;
  }

  const now = new Date().toISOString();
  const existing = input.id
    ? data.transactions.find((tx) => tx.id === input.id)
    : undefined;

  const tx: Transaction = {
    id: input.id ?? createId("tx"),
    type: input.type,
    description: input.description,
    amount,
    date: input.date,
    personId: needsPayer ? input.personId : "",
    participantIds: needsParticipants ? participantIds : [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: existing ? now : null,
  };

  const transactions = existing
    ? data.transactions.map((item) => (item.id === tx.id ? tx : item))
    : [...data.transactions, tx];

  return { ...data, transactions };
}

export function deleteTransaction(data: AppData, id: string): AppData {
  return {
    ...data,
    transactions: data.transactions.filter((tx) => tx.id !== id),
    deletedIds: [...data.deletedIds, id],
  };
}

export interface PoolAdjustment {
  /** Set when an existing ajuste is being corrected. */
  id?: string;
  /**
   * What the pool adds up to *without* the ajuste being edited — i.e. the
   * current pool for a new one, and the pool minus its own amount when
   * editing.
   */
  baseline: number;
  /** Balance the shared account really holds. */
  target: number;
  description: string;
  date: string;
}

/**
 * Turns "the pool really holds X" into an `ajuste`: a plain movement that
 * corrects the pool by the difference and deliberately leaves every balance
 * alone, because nobody knows whose money the difference is.
 *
 * Returns null when the pool already matches and there is nothing to record.
 */
export function buildPoolAdjustment(
  adjustment: PoolAdjustment,
): TransactionInput | null {
  const deltaCents = toCents(adjustment.target) - toCents(adjustment.baseline);
  if (!isValidAmountCents("ajuste", deltaCents)) return null;

  return {
    id: adjustment.id,
    type: "ajuste",
    description: adjustment.description,
    amount: fromCents(deltaCents),
    date: adjustment.date,
    personId: "",
    participantIds: [],
  };
}
