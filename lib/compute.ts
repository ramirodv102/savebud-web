import { getDaysInMonth } from 'date-fns';
import type { Expense, MonthStats, Settings } from '../types';

// ── Month filter ──────────────────────────────────────────────────────────────

export function filterCurrentMonth(expenses: Expense[]): Expense[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  return expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

// ── Named aggregation functions (use these in screens, not raw reduce) ────────

export function getTotalSpent(expenses: Expense[]): number {
  return filterCurrentMonth(expenses).reduce((sum, e) => sum + e.amount, 0);
}

export function getSpentByCategory(expenses: Expense[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of filterCurrentMonth(expenses)) {
    result[e.categoryId] = (result[e.categoryId] ?? 0) + e.amount;
  }
  return result;
}

export function getSpentByPaymentMethod(expenses: Expense[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of filterCurrentMonth(expenses)) {
    result[e.paymentMethodId] = (result[e.paymentMethodId] ?? 0) + e.amount;
  }
  return result;
}

// ── Full stats object (used by dashboard) ────────────────────────────────────

// Computes all monthly stats from raw expenses + settings.
// Call at render time — never cache in state.
export function computeMonthStats(expenses: Expense[], settings: Settings): MonthStats {
  const totalSpent = getTotalSpent(expenses);
  const remaining = Math.max(0, settings.totalMonthlyBudget - totalSpent);
  const percentUsed =
    settings.totalMonthlyBudget > 0
      ? (totalSpent / settings.totalMonthlyBudget) * 100
      : 0;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = getDaysInMonth(now);
  const monthProgress = dayOfMonth / daysInMonth;

  // paceRatio > 1 = spending faster than the month is advancing
  const paceRatio =
    monthProgress > 0 && settings.totalMonthlyBudget > 0
      ? (percentUsed / 100) / monthProgress
      : 0;

  const dailyAverage = daysInMonth > 0 ? totalSpent / daysInMonth : 0;
  const expenseCount = filterCurrentMonth(expenses).length;

  return {
    totalSpent,
    remaining,
    percentUsed,
    paceRatio,
    dailyAverage,
    expenseCount,
    byCategory: getSpentByCategory(expenses),
    byPaymentMethod: getSpentByPaymentMethod(expenses),
  };
}

// ── Alert helpers ────────────────────────────────────────────────────────────

export type BudgetAlertLevel = 'none' | 'exceeded';
export function totalBudgetAlert(stats: MonthStats): BudgetAlertLevel {
  return stats.percentUsed > 100 ? 'exceeded' : 'none';
}

export type CategoryAlertLevel = 'none' | 'soft' | 'strong';
export function categoryAlert(spent: number, budget: number | null): CategoryAlertLevel {
  if (budget === null || budget === 0) return 'none';
  const pct = (spent / budget) * 100;
  if (pct >= 100) return 'strong';
  if (pct >= 80) return 'soft';
  return 'none';
}

// Spending pace is alarming when 20%+ faster than the month is progressing
export function isPaceAlarm(stats: MonthStats): boolean {
  return stats.paceRatio > 1.2 && stats.totalSpent > 0;
}
