function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addExpense(list, input) {
  if (typeof input.id !== "string" || input.id.trim() === "") {
    throw new Error("Expense ID is required.");
  }

  if (list.some((expense) => expense.id === input.id)) {
    throw new Error("Expense ID must be unique.");
  }

  return [...list, validateExpense(input)];
}

function validateExpense(input) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  if (typeof input.category !== "string" || input.category.trim() === "") {
    throw new Error("Category is required.");
  }

  if (typeof input.date !== "string" || !isValidDate(input.date)) {
    throw new Error("Date must be a valid date in YYYY-MM-DD format.");
  }

  const note = input.note ?? "";
  if (typeof note !== "string") {
    throw new Error("Note must be text.");
  }

  const expense = {
    id: input.id,
    amount,
    category: input.category.trim(),
    note: note.trim(),
    date: input.date,
  };

  return expense;
}

function findExpenseIndex(list, id) {
  if (typeof id !== "string" || id.trim().length < 8) {
    throw new Error("Provide at least the first 8 characters of an expense ID.");
  }

  const normalizedId = id.trim().toLowerCase();
  const matches = [];
  list.forEach((expense, index) => {
    if (typeof expense.id === "string" && expense.id.toLowerCase().startsWith(normalizedId)) {
      matches.push(index);
    }
  });

  if (matches.length === 0) throw new Error(`No expense found with ID: ${id}`);
  if (matches.length > 1) throw new Error(`Expense ID is ambiguous: ${id}`);
  return matches[0];
}

export function deleteExpense(list, id) {
  const index = findExpenseIndex(list, id);
  return list.filter((_, expenseIndex) => expenseIndex !== index);
}

export function editExpense(list, id, updates) {
  const editableFields = ["amount", "category", "note", "date"];
  const suppliedFields = editableFields.filter((field) => updates[field] !== undefined);
  if (suppliedFields.length === 0) {
    throw new Error("Provide at least one field to edit: --amount, --category, --note, or --date.");
  }

  const index = findExpenseIndex(list, id);
  const updatedExpense = validateExpense({ ...list[index], ...updates, id: list[index].id });
  return list.map((expense, expenseIndex) => expenseIndex === index ? updatedExpense : expense);
}

export function listExpenses(list, filters = {}) {
  return list.filter((expense) => {
    if (filters.category && expense.category.toLowerCase() !== filters.category.toLowerCase()) {
      return false;
    }
    if (filters.month && !expense.date.startsWith(`${filters.month}-`)) {
      return false;
    }
    return true;
  });
}
