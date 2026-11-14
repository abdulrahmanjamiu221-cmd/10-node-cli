#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { addExpense, deleteExpense, editExpense, listExpenses } from "../src/expenses.js";
import { parseArgs } from "../src/args.js";
import { summarizeExpenses } from "../src/report.js";
import { getImportColumns, parseCsvRecord, toCsv } from "../src/csv.js";
import { readCsvRecords } from "../src/csv-stream.js";
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
  node bin/expense.js export --format csv --out expenses.csv
  node bin/expense.js import --file bank.csv
  node bin/expense.js help

Commands:
  add    Record an expense
  list   Show expenses, optionally filtered by category or month
  delete Remove an expense by its displayed 8-character ID
  edit   Update an expense by ID
  summary Show totals, category bars, the biggest expense, and budget status
  budget Set the spending budget used by summary
  export Export expenses as CSV
  import Import CSV expenses; invalid rows are reported and skipped
  --no-color Disable ANSI colors (colors are only used in a TTY)
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
  const unexpected = Object.keys(options).find((option) => (
    option !== "no-color" && !allowed.includes(option)
  ));
  if (unexpected) throw new Error(`Option --${unexpected} is not valid for this command.`);
}

function shortId(id) {
  return typeof id === "string" ? id.slice(0, 8) : "—";
}

let colorEnabled = false;

function color(text, code) {
  return colorEnabled ? `\u001b[${code}m${text}\u001b[0m` : text;
}

async function importExpenses(filePath) {
  const expenses = await load();
  const imported = [];
  const importedIds = new Set(expenses.map((expense) => expense.id).filter(Boolean));
  const skipped = [];
  let headers;

  for await (const { record, line } of readCsvRecords(filePath)) {
    if (record.trim() === "") continue;

    if (!headers) {
      try {
        headers = getImportColumns(record);
      } catch (error) {
        throw new Error(`Invalid CSV header on line ${line}: ${error.message}`);
      }
      continue;
    }

    try {
      const values = parseCsvRecord(record);
      if (values.length !== headers.length) {
        throw new Error(`Expected ${headers.length} columns, received ${values.length}.`);
      }
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
      let id;
      do {
        id = randomUUID();
      } while (importedIds.has(id));

      const expense = addExpense([], {
        ...row,
        id,
      })[0];
      importedIds.add(id);
      imported.push(expense);
    } catch (error) {
      skipped.push({ line, reason: error.message });
    }
  }

  if (!headers) throw new Error("CSV file is empty or has no header row.");
  await save([...expenses, ...imported]);

  for (const { line, reason } of skipped) {
    console.error(color(`Skipped line ${line}: ${reason}`, "33"));
  }
  console.log(color(`Imported ${imported.length} expense(s); skipped ${skipped.length} line(s).`, "32"));
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  colorEnabled = Boolean(process.stdout.isTTY && !options["no-color"]);

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
    console.log(color(`Added ${currency.format(added.amount)} for ${added.category} (ID: ${shortId(added.id)}).`, "32"));
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
      Amount: color(currency.format(amount), "36"),
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

    console.log(color(`Total spent${options.month ? ` (${options.month})` : ""}: ${currency.format(report.total)}`, "1;36"));
    console.log(color("Spending by category:", "36"));
    if (report.categories.length === 0) {
      console.log("  No expenses found.");
    } else {
      for (const { category, amount, bar } of report.categories) {
        console.log(`  ${category.padEnd(14)} ${color(bar, "34")} ${currency.format(amount)}`);
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
    if (report.budgetWarning) console.log(color(report.budgetWarning, "33"));
    return;
  }

  if (command === "budget") {
    assertOptions(options, ["set"]);
    const amount = Number(options.set);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Budget must be a positive number.");
    }
    await saveSettings({ ...(await loadSettings()), budget: amount });
    console.log(color(`Budget set to ${currency.format(amount)}.`, "32"));
    return;
  }

  if (command === "export") {
    assertOptions(options, ["format", "out"]);
    if (options.format !== "csv") throw new Error("Export format must be csv.");
    if (!options.out) throw new Error("Export requires --out <file>.");
    const expenses = await load();
    await writeFile(options.out, toCsv(expenses), "utf8");
    console.log(color(`Exported ${expenses.length} expense(s) to ${options.out}.`, "32"));
    return;
  }

  if (command === "import") {
    assertOptions(options, ["file"]);
    if (!options.file) throw new Error("Import requires --file <file>.");
    await importExpenses(options.file);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.DEBUG === "1" && error instanceof Error) {
    console.error(color(error.stack ?? message, "31"));
  } else {
    console.error(color(`Error: ${message}`, "31"));
  }
  process.exitCode = 1;
});
