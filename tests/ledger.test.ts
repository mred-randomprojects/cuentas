import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAppData } from "../src/lib/appData";
import { mergeAppData } from "../src/mergeAppData";
import { getLedger } from "../src/lib/ledger";
import { splitMoney, toCents } from "../src/lib/money";
import {
  buildPoolAdjustment,
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

test("participants are stored in people order, whatever order they were picked in", () => {
  const data = upsertTransaction(
    { people, transactions: [], deletedIds: [], updatedAt: null },
    {
      type: "compra",
      description: "Verduras",
      amount: 30,
      date: "2026-08-20",
      personId: "",
      participantIds: ["carla", "ana", "carla", "fantasma"],
    },
  );

  assert.deepEqual(data.transactions[0]?.participantIds, ["ana", "carla"]);
});

test("an ajuste moves the pool and deliberately leaves every balance alone", () => {
  const base = [
    tx("entrada", 100, "ana", []),
    tx("compra", 30, "", ["ana", "beto"]),
  ];
  const before = getLedger(people, base);
  const after = getLedger(people, [
    ...base,
    tx("ajuste", -25, "", [], "ajuste-negativo"),
  ]);

  assert.equal(before.pool, 70);
  assert.equal(after.pool, 45);
  assert.equal(after.adjustments, -25);

  // Same balances, same totals: only the pool moved.
  assert.deepEqual(
    after.rows.map((row) => row.balance),
    before.rows.map((row) => row.balance),
  );
  assert.equal(after.totalEntries, before.totalEntries);
  assert.equal(after.totalPurchases, before.totalPurchases);
  assert.equal(
    toCents(after.rows.reduce((sum, row) => sum + row.balance, 0)) +
      toCents(after.adjustments),
    toCents(after.pool),
  );
});

test("ajustes accumulate in both directions and ignore people entirely", () => {
  const ledger = getLedger([], [
    tx("ajuste", 500, "", [], "ajuste-mas"),
    tx("ajuste", -120.55, "", [], "ajuste-menos"),
  ]);

  assert.equal(ledger.adjustments, 379.45);
  assert.equal(ledger.pool, 379.45);
  assert.equal(ledger.rows.length, 0);
});

test("setting the pool builds the signed difference as an ajuste", () => {
  const shortfall = buildPoolAdjustment({
    baseline: 155,
    target: 120,
    description: "Ajuste de pozo",
    date: "2026-08-20",
  });
  assert.ok(shortfall);
  assert.equal(shortfall.type, "ajuste");
  assert.equal(shortfall.amount, -35);
  assert.equal(shortfall.personId, "");
  assert.deepEqual(shortfall.participantIds, []);

  const surplus = buildPoolAdjustment({
    baseline: 0.1,
    target: 0.35,
    description: "Ajuste de pozo",
    date: "2026-08-20",
  });
  assert.ok(surplus);
  assert.equal(toCents(surplus.amount), 25);

  assert.equal(
    buildPoolAdjustment({
      baseline: 70,
      target: 70,
      description: "Ajuste de pozo",
      date: "2026-08-20",
    }),
    null,
  );
});

test("an ajuste round-trips through upsert, edit, sanitization, and merge", () => {
  const initial: AppData = {
    people,
    transactions: [tx("entrada", 100, "ana", [])],
    deletedIds: [],
    updatedAt: null,
  };

  const created = upsertTransaction(
    initial,
    buildPoolAdjustment({
      baseline: 100,
      target: 80,
      description: "Ajuste de pozo",
      date: "2026-08-20",
    })!,
  );
  const saved = created.transactions.find((item) => item.type === "ajuste");
  assert.ok(saved);
  assert.equal(saved.amount, -20);
  assert.equal(getLedger(people, created.transactions).pool, 80);

  // Editing re-answers "what does the account really hold?" against the pool
  // without this ajuste, so a target of 95 has to become a -5 correction.
  const edited = upsertTransaction(
    created,
    buildPoolAdjustment({
      id: saved.id,
      baseline: 80 - saved.amount,
      target: 95,
      description: "Ajuste de pozo",
      date: saved.date,
    })!,
  );
  assert.equal(edited.transactions.length, 2);
  assert.equal(getLedger(people, edited.transactions).pool, 95);

  // Neither sanitization nor the local/cloud merge may drop it: it references
  // no people, which is exactly what those filters check for.
  const sanitized = sanitizeAppData(JSON.parse(JSON.stringify(edited)));
  assert.equal(sanitized.transactions.length, 2);
  assert.equal(getLedger(sanitized.people, sanitized.transactions).pool, 95);

  const merged = mergeAppData(edited, {
    people,
    transactions: [],
    deletedIds: [],
    updatedAt: null,
  });
  assert.equal(merged.transactions.filter((t) => t.type === "ajuste").length, 1);
});

test("only an ajuste may be signed, and never zero", () => {
  const data: AppData = {
    people,
    transactions: [],
    deletedIds: [],
    updatedAt: null,
  };
  const negativeExpense = upsertTransaction(data, {
    type: "compra",
    description: "Imposible",
    amount: -10,
    date: "2026-08-20",
    personId: "",
    participantIds: ["ana"],
  });
  assert.equal(negativeExpense.transactions.length, 0);

  const zeroAdjustment = upsertTransaction(data, {
    type: "ajuste",
    description: "Sin efecto",
    amount: 0,
    date: "2026-08-20",
    personId: "",
    participantIds: [],
  });
  assert.equal(zeroAdjustment.transactions.length, 0);

  const sanitized = sanitizeAppData({
    people,
    transactions: [
      tx("ajuste", -40, "", [], "valido"),
      tx("ajuste", 0, "", [], "cero"),
      tx("compra", -40, "", ["ana"], "gasto-negativo"),
    ],
  });
  assert.deepEqual(
    sanitized.transactions.map((item) => item.id),
    ["valido"],
  );
});
