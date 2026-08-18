import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAppData } from "../src/lib/appData";
import { getLedger } from "../src/lib/ledger";
import { splitMoney, toCents } from "../src/lib/money";
import {
  deletePerson,
  deleteTransaction,
  upsertTransaction,
} from "../src/lib/operations";
import type { AppData, Person, Transaction } from "../src/types";

const people: Person[] = [
  { id: "ana", name: "Ana", color: "#111111" },
  { id: "beto", name: "Beto", color: "#222222" },
  { id: "carla", name: "Carla", color: "#333333" },
];

function tx(
  type: Transaction["type"],
  amount: number,
  personId: string,
  participantIds: string[],
  id = `${type}-${amount}`,
): Transaction {
  return {
    id,
    type,
    description: id,
    amount,
    date: "2026-08-17",
    personId,
    participantIds,
    createdAt: "2026-08-17T12:00:00.000Z",
    updatedAt: null,
  };
}

function rowById(ledger: ReturnType<typeof getLedger>, id: string) {
  const row = ledger.rows.find((item) => item.id === id);
  assert.ok(row, `Missing ledger row for ${id}`);
  return row;
}

test("a directly paid expense credits its payer and leaves the pool unchanged", () => {
  const ledger = getLedger(people, [
    tx("gasto_pagado", 100, "ana", ["ana", "beto", "carla"]),
  ]);

  assert.equal(ledger.pool, 0);
  assert.equal(ledger.totalEntries, 0);
  assert.equal(ledger.totalPurchases, 100);
  assert.equal(ledger.totalDirectPayments, 100);
  assert.equal(ledger.totalPoolPurchases, 0);

  assert.equal(rowById(ledger, "ana").contributions, 100);
  assert.equal(rowById(ledger, "ana").expenses, 33.34);
  assert.equal(rowById(ledger, "ana").balance, 66.66);
  assert.equal(rowById(ledger, "beto").balance, -33.33);
  assert.equal(rowById(ledger, "carla").balance, -33.33);

  assert.equal(
    toCents(ledger.rows.reduce((sum, row) => sum + row.balance, 0)),
    toCents(ledger.pool),
  );
});

test("the payer does not need to be one of the participants", () => {
  const ledger = getLedger(people, [
    tx("gasto_pagado", 90, "ana", ["beto", "carla"]),
  ]);

  assert.equal(rowById(ledger, "ana").balance, 90);
  assert.equal(rowById(ledger, "beto").balance, -45);
  assert.equal(rowById(ledger, "carla").balance, -45);
  assert.equal(ledger.pool, 0);
});

test("pool movements and direct payments preserve the global balance invariant", () => {
  const ledger = getLedger(people.slice(0, 2), [
    tx("entrada", 100, "ana", []),
    tx("compra", 30, "", ["ana", "beto"]),
    tx("gasto_pagado", 20, "beto", ["ana", "beto"]),
  ]);

  assert.equal(ledger.pool, 70);
  assert.equal(ledger.totalEntries, 100);
  assert.equal(ledger.totalPoolPurchases, 30);
  assert.equal(ledger.totalDirectPayments, 20);
  assert.equal(ledger.totalPurchases, 50);
  assert.equal(rowById(ledger, "ana").balance, 75);
  assert.equal(rowById(ledger, "beto").balance, -5);
  assert.equal(
    toCents(ledger.rows.reduce((sum, row) => sum + row.balance, 0)),
    toCents(ledger.pool),
  );
});

test("money splitting is deterministic, unique, and exact to the cent", () => {
  const shares = splitMoney(0.1, ["ana", "beto", "carla", "ana"]);

  assert.deepEqual(shares, [
    { personId: "ana", amount: 0.04 },
    { personId: "beto", amount: 0.03 },
    { personId: "carla", amount: 0.03 },
  ]);
  assert.equal(
    shares.reduce((sum, share) => sum + toCents(share.amount), 0),
    10,
  );
});

test("every cent allocation remains exact across common group sizes", () => {
  const ids = people.map((person) => person.id);
  for (let cents = 1; cents <= 1_000; cents += 1) {
    for (let count = 1; count <= ids.length; count += 1) {
      const shares = splitMoney(cents / 100, ids.slice(0, count));
      assert.equal(
        shares.reduce((sum, share) => sum + toCents(share.amount), 0),
        cents,
      );
    }
  }
});

test("create, edit, and delete keep a paid expense as one atomic transaction", () => {
  const initial: AppData = {
    people,
    transactions: [],
    deletedIds: [],
    updatedAt: null,
  };
  const created = upsertTransaction(initial, {
    type: "gasto_pagado",
    description: "Cena",
    amount: 60,
    date: "2026-08-17",
    personId: "ana",
    participantIds: ["ana", "beto", "carla"],
  });

  assert.equal(created.transactions.length, 1);
  const saved = created.transactions[0];
  assert.ok(saved);
  assert.equal(saved.type, "gasto_pagado");
  assert.equal(saved.personId, "ana");
  assert.deepEqual(saved.participantIds, ["ana", "beto", "carla"]);

  const edited = upsertTransaction(created, {
    id: saved.id,
    type: "gasto_pagado",
    description: "Cena corregida",
    amount: 75,
    date: saved.date,
    personId: "beto",
    participantIds: ["ana", "carla"],
  });
  assert.equal(edited.transactions.length, 1);
  assert.equal(edited.transactions[0]?.id, saved.id);
  assert.equal(edited.transactions[0]?.personId, "beto");
  assert.deepEqual(edited.transactions[0]?.participantIds, ["ana", "carla"]);

  assert.equal(deletePerson(edited, "beto"), edited);
  const deleted = deleteTransaction(edited, saved.id);
  assert.equal(deleted.transactions.length, 0);
  assert.ok(deleted.deletedIds.includes(saved.id));
});

test("sanitization accepts valid direct payments and rejects broken references", () => {
  const valid = tx("gasto_pagado", 12.345, "ana", ["ana", "beto"]);
  const missingPayer = tx(
    "gasto_pagado",
    20,
    "missing",
    ["ana", "beto"],
    "missing-payer",
  );
  const missingParticipant = tx(
    "gasto_pagado",
    30,
    "ana",
    ["ana", "missing"],
    "missing-participant",
  );

  const sanitized = sanitizeAppData({
    people,
    transactions: [valid, missingPayer, missingParticipant],
  });

  assert.equal(sanitized.transactions.length, 1);
  assert.equal(sanitized.transactions[0]?.id, valid.id);
  assert.equal(sanitized.transactions[0]?.amount, 12.35);
});
