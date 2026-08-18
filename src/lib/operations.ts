import type { AppData, MovementType, Person, Transaction } from "../types";
import { colorForIndex } from "./colors";
import { createId } from "./ids";
import { fromCents, toCents } from "./money";

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
  const participantIds = [...new Set(input.participantIds)].filter((id) =>
    personIds.has(id),
  );
  const needsPayer = input.type === "entrada" || input.type === "gasto_pagado";
  const needsParticipants = input.type !== "entrada";

  if (
    !Number.isSafeInteger(toCents(input.amount)) ||
    amount <= 0 ||
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
