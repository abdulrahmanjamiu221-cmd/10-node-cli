import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/args.js";
import { addExpense, deleteExpense, editExpense, listExpenses } from "../src/expenses.js";
import { parseCsvRecord, toCsv } from "../src/csv.js";
import { summarizeExpenses } from "../src/report.js";

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
    id: "12345678-1234-1234-1234-123456789abc",
  });

  assert.deepEqual(original, []);
  assert.deepEqual(updated, [{
    id: "12345678-1234-1234-1234-123456789abc",
    amount: 2500,
    category: "food",
    note: "lunch",
    date: "2026-11-03",
  }]);
  assert.throws(() => addExpense(original, {
    amount: 0,
    category: "food",
    date: "2026-11-03",
    id: "12345678-1234-1234-1234-123456789abc",
  }), /positive number/);
  assert.throws(() => addExpense(original, {
    amount: 1,
    category: "food",
    date: "2026-02-30",
    id: "12345678-1234-1234-1234-123456789abc",
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

test("editExpense and deleteExpense accept the displayed ID prefix immutably", () => {
  const expenses = [{
    id: "12345678-1234-1234-1234-123456789abc",
    amount: 2500,
    category: "food",
    note: "lunch",
    date: "2026-11-03",
  }];
  const edited = editExpense(expenses, "12345678", { amount: "3000" });

  assert.equal(edited[0].amount, 3000);
  assert.equal(expenses[0].amount, 2500);
  assert.deepEqual(deleteExpense(edited, "12345678"), []);
  assert.throws(() => deleteExpense(expenses, "missing1"), /No expense found/);
  assert.throws(() => editExpense(expenses, "12345678", {}), /at least one field/);
});

test("summarizeExpenses calculates totals, category bars, biggest expense, and budget warnings", () => {
  const expenses = [
    { id: "11111111-a", amount: 5000, category: "food", date: "2026-11-03", note: "meal" },
    { id: "22222222-b", amount: 3000, category: "transport", date: "2026-11-04", note: "bus" },
    { id: "33333333-c", amount: 2000, category: "food", date: "2026-10-25", note: "snack" },
  ];

  const report = summarizeExpenses(expenses, { month: "2026-11" }, 10000);
  assert.equal(report.total, 8000);
  assert.equal(report.categories[0].amount, 5000);
  assert.equal(report.categories[0].bar.length, 20);
  assert.equal(report.biggest.id, "11111111-a");
  assert.match(report.budgetWarning, /80%/);
  assert.equal(summarizeExpenses(expenses, { month: "2026-11" }, 8000).budgetWarning, "Budget exceeded (100% or more).");
});

test("toCsv escapes commas, quotes, and newlines without mutating its input", () => {
  const expenses = [{
    id: "12345678",
    amount: 25,
    category: "food, home",
    note: 'said "hello"\nthen left',
    date: "2026-11-03",
  }];
  const csv = toCsv(expenses);

  assert.match(csv, /"food, home"/);
  assert.match(csv, /"said ""hello""\nthen left"/);
  assert.deepEqual(parseCsvRecord('"a,b","say ""hi""\ncontinued"'), [
    "a,b",
    'say "hi"\ncontinued',
  ]);
  assert.equal(expenses[0].note, 'said "hello"\nthen left');
});

test("parseArgs recognizes the no-color boolean option", () => {
  assert.deepEqual(parseArgs(["list", "--no-color"]), {
    command: "list",
    options: { "no-color": true },
  });
  assert.throws(() => parseArgs(["list", "--no-color=true"]), /does not take a value/);
});

test("parseArgs rejects unknown options and options without values", () => {
  assert.throws(() => parseArgs(["add", "--unknown", "value"]), /Unknown option/);
  assert.throws(() => parseArgs(["add", "--amount"]), /requires a value/);
});

test("addExpense rejects missing and duplicate IDs", () => {
  const valid = {
    amount: 10,
    category: "food",
    date: "2026-11-03",
    id: "12345678-1234-1234-1234-123456789abc",
  };
  const existing = addExpense([], valid);

  assert.throws(() => addExpense([], { ...valid, id: "" }), /ID is required/);
  assert.throws(() => addExpense(existing, valid), /ID must be unique/);
});

test("addExpense rejects non-positive, non-numeric, and non-finite amounts", () => {
  const valid = {
    category: "food",
    date: "2026-11-03",
    id: "12345678-1234-1234-1234-123456789abc",
  };
  for (const amount of [0, -1, "not money", Infinity]) {
    assert.throws(() => addExpense([], { ...valid, amount }), /positive number/);
  }
});

test("addExpense rejects blank categories and non-text notes", () => {
  const valid = {
    amount: 10,
    category: "food",
    date: "2026-11-03",
    id: "12345678-1234-1234-1234-123456789abc",
  };

  assert.throws(() => addExpense([], { ...valid, category: "  " }), /Category is required/);
  assert.throws(() => addExpense([], { ...valid, note: 123 }), /Note must be text/);
});

test("listExpenses filters by category alone", () => {
  const expenses = [
    { category: "food", date: "2026-11-03" },
    { category: "transport", date: "2026-11-03" },
  ];

  assert.deepEqual(listExpenses(expenses, { category: "FOOD" }), [expenses[0]]);
});

test("listExpenses filters by month alone and returns no unrelated rows", () => {
  const expenses = [
    { category: "food", date: "2026-11-03" },
    { category: "food", date: "2026-10-03" },
  ];

  assert.deepEqual(listExpenses(expenses, { month: "2026-11" }), [expenses[0]]);
  assert.deepEqual(listExpenses(expenses, { month: "2025-01" }), []);
});

test("summarizeExpenses handles an empty list without a biggest expense or warning", () => {
  assert.deepEqual(summarizeExpenses([]), {
    total: 0,
    categories: [],
    biggest: null,
    budgetWarning: null,
  });
});

test("summarizeExpenses warns when spending exceeds the budget", () => {
  const report = summarizeExpenses([
    { amount: 110, category: "food", date: "2026-11-03" },
  ], {}, 100);

  assert.equal(report.total, 110);
  assert.equal(report.budgetWarning, "Budget exceeded (100% or more).");
});

test("toCsv includes a header and handles an empty list", () => {
  assert.equal(toCsv([]), '"id","amount","category","note","date"\r\n');
});
