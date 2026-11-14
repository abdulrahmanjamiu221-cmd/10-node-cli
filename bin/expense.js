#!/usr/bin/env node

import { addExpense, listExpenses } from "../src/expenses.js";
import { parseArgs } from "../src/args.js";
import { load, save } from "../src/store.js";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

function printHelp() {
  console.log(`Expense Tracker

Usage:
  node bin/expense.js add --amount 2500 --category food --note "lunch" [--date YYYY-MM-DD]
  node bin/expense.js list [--category food] [--month YYYY-MM]
  node bin/expense.js help

Commands:
  add    Record an expense
  list   Show expenses, optionally filtered by category or month
  help   Show this help message`);
}

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validateMonth(month) {
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Month must be in YYYY-MM format.");
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === "help") {
    printHelp();
    return;
  }

  if (command === "add") {
    const expenses = await load();
    const updated = addExpense(expenses, { ...options, date: options.date ?? today() });
    await save(updated);
    console.log(`Added ${currency.format(updated[updated.length - 1].amount)} for ${updated[updated.length - 1].category}.`);
    return;
  }

  if (command === "list") {
    validateMonth(options.month);
    const expenses = listExpenses(await load(), options);
    console.table(expenses.map(({ date, category, note, amount }) => ({
      Date: date,
      Category: category,
      Note: note,
      Amount: currency.format(amount),
    })));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
