function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addExpense(list, input) {
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
    amount,
    category: input.category.trim(),
    note: note.trim(),
    date: input.date,
  };

  return [...list, expense];
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
