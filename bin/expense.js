#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { addExpense, deleteExpense, editExpense, listExpenses } from "../src/expenses.js";
import { parseArgs } from "../src/args.js";
import { summarizeExpenses } from "../src/report.js";
import { load, loadSettings, save, saveSettings } from "../src/store.js";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

function printHelp() {
  console.log(`Expense Tracker

Usage:
  node bin/expense.js add --amount 2500 --category food --note "lunch" [--date YYYY-MM-DD]
  node bin/expense.js list [--category food] [--month YYYY-MM]
  node bin/expense.js delete --id <id>
  node bin/expense.js edit --id <id> [--amount 2500] [--category food] [--note "lunch"] [--date YYYY-MM-DD]
  node bin/expense.js summary [--month YYYY-MM]
  node bin/expense.js budget --set 50000
  node bin/expense.js help

Commands:
  add    Record an expense
  list   Show expenses, optionally filtered by category or month
  delete Remove an expense by its displayed 8-character ID
  edit   Update an expense by ID
  summary Show totals, category bars, the biggest expense, and budget status
  budget Set the spending budget used by summary
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

function assertOptions(options, allowed) {
  const unexpected = Object.keys(options).find((option) => !allowed.includes(option));
  if (unexpected) throw new Error(`Option --${unexpected} is not valid for this command.`);
}

function shortId(id) {
  return typeof id === "string" ? id.slice(0, 8) : "—";
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === "help") {
    assertOptions(options, []);
    printHelp();
    return;
  }

  if (command === "add") {
    assertOptions(options, ["amount", "category", "note", "date"]);
    const expenses = await load();
    const updated = addExpense(expenses, {
      ...options,
      date: options.date ?? today(),
      id: randomUUID(),
    });
    await save(updated);
    const added = updated[updated.length - 1];
    console.log(`Added ${currency.format(added.amount)} for ${added.category} (ID: ${shortId(added.id)}).`);
    return;
  }

  if (command === "list") {
    assertOptions(options, ["category", "month"]);
    validateMonth(options.month);
    const expenses = listExpenses(await load(), options);
    console.table(expenses.map(({ id, date, category, note, amount }) => ({
      ID: shortId(id),
      Date: date,
      Category: category,
      Note: note,
      Amount: currency.format(amount),
    })));
    return;
  }

  if (command === "delete") {
    assertOptions(options, ["id"]);
    const updated = deleteExpense(await load(), options.id);
    await save(updated);
    console.log(`Deleted expense ${shortId(options.id)}.`);
    return;
  }

  if (command === "edit") {
    assertOptions(options, ["id", "amount", "category", "note", "date"]);
    const updated = editExpense(await load(), options.id, options);
    await save(updated);
    console.log(`Updated expense ${shortId(options.id)}.`);
    return;
  }

  if (command === "summary") {
    assertOptions(options, ["month"]);
    validateMonth(options.month);
    const settings = await loadSettings();
    const report = summarizeExpenses(await load(), options, settings.budget);

    console.log(`Total spent${options.month ? ` (${options.month})` : ""}: ${currency.format(report.total)}`);
    console.log("Spending by category:");
    if (report.categories.length === 0) {
      console.log("  No expenses found.");
    } else {
      for (const { category, amount, bar } of report.categories) {
        console.log(`  ${category.padEnd(14)} ${bar} ${currency.format(amount)}`);
      }
    }

    if (report.biggest) {
      const description = report.biggest.note ? ` — ${report.biggest.note}` : "";
      console.log(
        `Biggest expense: ${currency.format(report.biggest.amount)} for ${report.biggest.category} on ${report.biggest.date}${description}`,
      );
    } else {
      console.log("Biggest expense: none");
    }

    if (settings.budget !== undefined) {
      console.log(`Budget: ${currency.format(settings.budget)}`);
    }
    if (report.budgetWarning) console.log(report.budgetWarning);
    return;
  }

  if (command === "budget") {
    assertOptions(options, ["set"]);
    const amount = Number(options.set);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Budget must be a positive number.");
    }
    await saveSettings({ ...(await loadSettings()), budget: amount });
    console.log(`Budget set to ${currency.format(amount)}.`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
