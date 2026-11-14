import { listExpenses } from "./expenses.js";

const BAR_WIDTH = 20;

export function summarizeExpenses(list, filters = {}, budget) {
  const expenses = listExpenses(list, filters);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = new Map();

  for (const expense of expenses) {
    categoryTotals.set(
      expense.category,
      (categoryTotals.get(expense.category) ?? 0) + expense.amount,
    );
  }

  const largestCategoryTotal = Math.max(0, ...categoryTotals.values());
  const categories = [...categoryTotals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      bar: largestCategoryTotal === 0
        ? ""
        : "█".repeat(Math.max(1, Math.round((amount / largestCategoryTotal) * BAR_WIDTH))),
    }))
    .sort((left, right) => right.amount - left.amount || left.category.localeCompare(right.category));

  if (budget !== undefined && (!Number.isFinite(budget) || budget <= 0)) {
    throw new Error("Budget must be a positive number.");
  }

  let budgetWarning = null;
  if (budget !== undefined && total >= budget) {
    budgetWarning = "Budget exceeded (100% or more).";
  } else if (budget !== undefined && total >= budget * 0.8) {
    budgetWarning = "Warning: spending has reached 80% of the budget.";
  }

  const biggest = expenses.reduce(
    (largest, expense) => largest === null || expense.amount > largest.amount ? expense : largest,
    null,
  );

  return { total, categories, biggest, budgetWarning };
}
