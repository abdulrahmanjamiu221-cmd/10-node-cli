# Expense Tracker CLI

A Node.js 20 expense tracker using ES modules and no npm runtime dependencies.

## Setup

```bash
npm test
```

The CLI can be run directly with Node from the project folder. Use `--no-color` to disable ANSI color output; colors are otherwise used only when stdout is a TTY.

## Usage

### `add`

Record an expense. Amount and category are required; note and date are optional. If date is omitted, the current local date is used.

```bash
node bin/expense.js add --amount 2500 --category food --note "lunch"
node bin/expense.js add --amount 900 --category transport --date 2026-11-14 --no-color
```

Each expense receives a UUID, shown as its first 8 characters.

### `list`

Show all expenses, or filter by category and/or month.

```bash
node bin/expense.js list
node bin/expense.js list --category food --month 2026-11
```

### `edit`

Edit an expense using its displayed 8-character ID (or a longer unique prefix). Supply at least one field to change.

```bash
node bin/expense.js edit --id b4d9909c --amount 3000
node bin/expense.js edit --id b4d9909c --category dining --note "team lunch"
```

Editable fields are `--amount`, `--category`, `--note`, and `--date`.

### `delete`

Remove an expense by its displayed ID.

```bash
node bin/expense.js delete --id b4d9909c
```

### `summary`

Show total spending, totals per category with scaled text bars, and the biggest expense. An optional month filters the report. If a budget is set, the report warns at 80% and 100% of the displayed total.

```bash
node bin/expense.js summary
node bin/expense.js summary --month 2026-11
```

### `budget`

Set the positive spending threshold used for summary warnings.

```bash
node bin/expense.js budget --set 50000
```

The budget is saved in `data/settings.json`.

### `export`

Export all expenses as quoted CSV with `id`, `amount`, `category`, `note`, and `date` columns.

```bash
node bin/expense.js export --format csv --out expenses.csv
```

### `import`

Import CSV rows with `amount`, `category`, and `date` headers. The `note` column is optional. CSV fields can contain commas, quotes, and embedded newlines. Invalid rows are skipped and reported with their source line numbers.

```bash
node bin/expense.js import --file sample-bank.csv
node bin/expense.js import --file bank.csv --no-color
```

Each imported expense receives a new UUID. A sample CSV is provided in [sample-bank.csv](./sample-bank.csv).

### `help`

Print the command summary.

```bash
node bin/expense.js help
```

## Install the `expense` command with `npm link`

From the project directory, run:

```bash
npm link
```

This links the package into npm's global package location and makes its `bin` command available on your `PATH`. The `bin` entry in `package.json` maps the command name `expense` to `./bin/expense.js`. The script's `#!/usr/bin/env node` shebang tells the operating system to run it with Node; npm also creates the appropriate command shim on Windows. After linking, you can run commands such as `expense list` from any folder.

To unlink it later, run `npm unlink -g 10-node-cli` from the project folder.

## Tests

Tests use Node's built-in `node:test` and `node:assert/strict`; no test packages are required. `test()` defines an individual test, while `describe()` groups related tests and `it()` is an alternate spelling for a test case. Run them with:

```bash
npm test
```

## Data files

Expenses are stored in `data/expenses.json`, and the budget is stored in `data/settings.json`. The `data/` directory is ignored by Git.
