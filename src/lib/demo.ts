import type { AppData, MovementType, Person, Transaction } from "../types";
import { colorForIndex } from "./colors";
import { createId } from "./ids";

function demoPerson(name: string, index: number): Person {
  return { id: createId("person"), name, color: colorForIndex(index) };
}

function demoTx(
  type: MovementType,
  description: string,
  amount: number,
  date: string,
  personId: string,
  participantIds: string[] = [],
): Transaction {
  return {
    id: createId("tx"),
    type,
    description,
    amount,
    date,
    personId,
    participantIds,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
}

/** Sample household data, matching the original "Cargar ejemplo" button. */
export function createDemoData(): AppData {
  const marisol = demoPerson("Marisol", 0);
  const elena = demoPerson("Elena", 1);
  const cacha = demoPerson("Cacha", 2);
  const bety = demoPerson("Bety", 3);
  const people = [marisol, elena, cacha, bety];
  const all = people.map((person) => person.id);

  return {
    people,
    transactions: [
      demoTx("entrada", "Entrada Marisol", 200000, "2026-06-01", marisol.id),
      demoTx("entrada", "Entrada Elena", 150000, "2026-06-01", elena.id),
      demoTx("compra", "Verduras", 20000, "2026-06-01", "", all),
      demoTx("compra", "Algodón", 10000, "2026-06-02", "", [
        marisol.id,
        elena.id,
        bety.id,
      ]),
      demoTx("entrada", "Entrada Cacha", 100000, "2026-06-02", cacha.id),
      demoTx("entrada", "Entrada Bety", 80000, "2026-06-02", bety.id),
      demoTx("compra", "Comida noche X", 60000, "2026-06-02", "", all),
      demoTx(
        "gasto_pagado",
        "Farmacia",
        9000,
        "2026-06-03",
        bety.id,
        [elena.id, bety.id],
      ),
    ],
    deletedIds: [],
    updatedAt: new Date().toISOString(),
  };
}
