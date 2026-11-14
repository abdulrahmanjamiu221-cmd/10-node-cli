import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/args.js";
import { addExpense, listExpenses } from "../src/expenses.js";

test("parseArgs reads command options with separate or equals values", () => {
  assert.deepEqual(parseArgs([
    "add",
    "--amount", "2500",
    "--category=food",
    "--note", "lunch",
  ]), {
    command: "add",
    options: { amount: "2500", category: "food", note: "lunch" },
  });
});

test("addExpense validates input and returns a new list", () => {
  const original = [];
  const updated = addExpense(original, {
    amount: "2500",
    category: " food ",
    note: " lunch ",
    date: "2026-11-03",
  });

  assert.deepEqual(original, []);
  assert.deepEqual(updated, [{
    amount: 2500,
    category: "food",
    note: "lunch",
    date: "2026-11-03",
  }]);
  assert.throws(() => addExpense(original, {
    amount: 0,
    category: "food",
    date: "2026-11-03",
  }), /positive number/);
  assert.throws(() => addExpense(original, {
    amount: 1,
    category: "food",
    date: "2026-02-30",
  }), /YYYY-MM-DD/);
});

test("listExpenses filters category without case sensitivity and month", () => {
  const expenses = [
    { amount: 2500, category: "food", date: "2026-11-03" },
    { amount: 1000, category: "transport", date: "2026-11-04" },
    { amount: 500, category: "food", date: "2026-10-25" },
  ];

  assert.deepEqual(listExpenses(expenses, { category: "FOOD", month: "2026-11" }), [expenses[0]]);
});
